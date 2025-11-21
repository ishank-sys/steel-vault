# Worker Service

**Location:** `src/worker.js`

**Purpose:** A long-running poller that claims and processes background jobs recorded in the database `Job` table.

**Run:** The file is executable as a Node script (`#!/usr/bin/env node`). When invoked directly it starts the `pollLoop()` which repeatedly attempts to claim jobs.

## Job Claiming Flow (high level)

- The worker polls the database every `POLL_INTERVAL_MS` (defaults to `2000` ms).
- It queries for the oldest `Job` row with `status = 'queued'`.
- To claim the job it issues an atomic update (`updateMany` where `id` and `status = 'queued'`) to set `status: 'running'` and increment `attempts`.
- After claiming, it fetches the job row and dispatches to a handler based on `job.type`.
- On success the worker writes `status: 'succeeded'`, `result`, and `progress: 100`.
- On failure it increments `attempts`, writes `error`, and either re-queues (`status: 'queued'`) or marks `failed` when `attempts >= maxAttempts`.

## Job Model (Prisma)

See `prisma/schema.prisma` model `Job`.

Important fields:

- `id` (Int)
- `type` (String) — worker routing key
- `status` (String) — `queued | running | succeeded | failed`
- `payload` (Json) — handler-specific data
- `result` (Json?) — written by worker on success
- `attempts`, `maxAttempts` — retry control
- `error` — last error message

## Handlers (implementations)

Handlers live under `src/lib/jobs/` and are imported by `src/worker.js`:

- `parseExcelJob.js` — `handleParseExcel(job, prisma)`
  - Accepts `payload.fileBase64` (base64-encoded workbook) and parses the first sheet with `xlsx`.
  - Tries to detect a header row (contains `dr no`) and returns an array of parsed rows shaped for the client UI.

- `validateConflictsJob.js` — `handleValidateConflicts(job, prisma)`
  - Accepts `payload.projectId`, `packageId`, `drawingKeys`, and `fetchAll`.
  - When `fetchAll` is true it reads active `ProjectDrawing` rows and builds a `prevRevMap` keyed by normalized drawing number and category.
  - When `drawingKeys` are provided it returns conflict information for the requested keys.

- `projectDrawingsJob.js` — `handlePublishJob(job, prisma)`
  - Normalizes incoming drawing entries and delegates to `batchUpsertDrawings(entries)`.
  - `batchUpsertDrawings` implements upsert logic with a transaction and project-level advisory lock; it attempts to update existing active rows in-place when the incoming filename matches, or insert a new row and mark the previous row `superseded_by`.
  - Revision bump helper `nextRevision` and `normalizeDrgNo` are implemented here.

- `generateZipJob.js` — `handleGenerateZip(job, prisma)`
  - Accepts `payload.objectPaths` (array of storage object paths, can be `gs://bucket/path` or `path`), `zipName`, `destinationPath`, `clientId`, `projectId`, `logType`.
  - Streams files from GCS using the configured Storage client, builds a ZIP using `archiver`, uploads the zip to GCS and creates a `DocumentLog` entry.

- `uploadJob.js` — `handleUploadJob(job, prisma)`
  - Accepts `payload.fileBase64`, `fileName`, `contentType`, `clientId`, `projectId`, `packageId`, `subFolder`, `fileType`, and `logType`.
  - Streams the decoded base64 to GCS with a destination path based on client and project metadata.
  - Creates `DocumentLog` (and optional `Upload`) records and attempts a `projectDrawing.upsert` for design drawings.

Read the individual files for implementation details and edge-case handling (parsing, filename heuristics, DB fallbacks).

## Enqueue API and Job control

- **Enqueue:** POST `/api/jobs/enqueue` (see `src/app/api/jobs/enqueue/route.js`)
  - Request body: `{ type: string, payload?: object }`
  - Response: `{ jobId }` on success.

- **Job status:** GET `/api/jobs/[id]` (see `src/app/api/jobs/[id]/route.js`)
  - Returns the job record. Client code accepts either `{ job }` or the job top-level JSON shape.

- **Retry:** POST `/api/jobs/[id]` — sets `status` back to `queued` and clears `error` (used for manual retry).

- **Cancel:** DELETE `/api/jobs/[id]` — marks job as `failed` with `error='cancelled'` (won't be picked by worker).

## Client Integration Patterns

General pattern:

1. Client sends a POST to `/api/jobs/enqueue` with `{ type, payload }`.
2. Server creates a `Job` row and returns `jobId`.
3. Client polls `/api/jobs/{jobId}` until `job.status` becomes `succeeded` or `failed`.

parse-excel (client offloads CPU work to worker):

- Usage at `src/app/components/ProjectComponent/PublishDrawing.jsx`:
  - Files are read client-side to `ArrayBuffer`, then `Buffer.from(arrayBuffer).toString('base64')` and sent as `payload.fileBase64`.
  - Example enqueue body:

```json
{ "type": "parse-excel", "payload": { "projectId": "...", "clientId": "...", "originalName": "...", "uploaderId": "...", "fileBase64": "..." } }
```

- Client polls the job record, then consumes `job.result.rows` to display parsed rows and allow attaching PDFs.

validate-conflicts:

- Used to fetch an authoritative map of previous revisions for a project/package.
- Example enqueue body:

```json
{ "type": "validate-conflicts", "payload": { "projectId": "...", "packageId": "...", "fetchAll": true } }
```

The worker returns `{ prevRevMap, rows }` when complete.

publish-job (batch upsert drawings):

- Fire-and-forget pattern in UI: when PDFs are attached to parsed rows, UI enqueues a `publish-job` with an array of drawing entries:

```json
[ { "drgNo": "...", "category": "...", "revision": "...", "fileNames": ["..."], "issueDate": "..." } ]
```

- Server-side worker performs upsert and returns counts `{ created, superseded }` in `result`.

upload-file (server-side upload via worker):

- If the client side cannot directly stream large binary to GCS, it can encode the file as base64 and enqueue an `upload-file` job with `fileBase64`, `fileName`, `contentType`, `clientId`, `projectId`, `subFolder`, etc.
- Worker writes file to GCS and creates `DocumentLog` and optional `Upload` records.

generate-zip (server-side ZIP of GCS objects):

- Client first uploads attachment PDFs to GCS (many flows in the app show client-side uploads to GCS via signed URLs — see `src/app/api/upload-url` or `src/lib/gcs.js` for helpers) and then enqueues a `generate-zip` job with `objectPaths` set to the uploaded object paths (e.g., `gs://bucket/path/to/file.pdf`).
- Worker streams those objects from GCS, composes a ZIP and writes the zip back to the bucket; it returns the `storagePath` and `DocumentLog` record.

## Polling and UX considerations

- Jobs are intended to be short-lived sync-like operations from the UI (parse-excel, validate-conflicts) or longer fire-and-forget operations (publish-job, generate-zip, upload-file).
- Client polling loops in the UI typically retry every ~1s and time out after a fixed window (e.g., 60s in `PublishDrawing.jsx`). Adjust timeouts for slower environments.
- The client tolerates both response shapes when fetching job status: either `{ job }` (wrapped) or the job object directly.

## Environment and operational notes

- `GCS_BUCKET` environment variable is required for GCS-based jobs (`generate-zip`, `upload-file`).
- `JOB_POLL_INTERVAL_MS` may be set to control the worker poll frequency (default `2000` ms).
- The worker uses Prisma to access the same Postgres DB as the application; ensure `DATABASE_URL` is configured for CLI runs where the worker will execute.

## Deployment and running

Two common models:

1. Run the worker as a separate process (systemd, Docker service, or separate container) using:

```bash
node ./src/worker.js
```

2. Run inside the same process as a background process (not recommended for serverless / short-lived platforms) — prefer a dedicated long-running worker.

Example (development):

```bash
NODE_ENV=production JOB_POLL_INTERVAL_MS=1000 node ./src/worker.js
```

## Troubleshooting

- If jobs are not processed:
  - Confirm worker process is running and logs show `"[WORKER] starting worker poll loop..."`.
  - Inspect the `job` table directly to see `status`, `attempts`, and `error` fields.
  - Ensure DB connectivity and Prisma client generation are up-to-date: `npx prisma generate`.

- If GCS uploads fail:
  - Check `GCS_BUCKET` and service account credentials (environment or ADC) available to the worker process.
  - Validate the worker has permission to read/write the configured bucket.

- If uploads are large and time out, prefer signed-url direct uploads from client then enqueue `generate-zip` with existing object paths instead of base64-encoded `upload-file`.

## Developer notes and things to watch

- The code contains heuristics for normalizing drawing numbers, category inference, and revision bump logic in `projectDrawingsJob.js`. Keep these functions consistent if you rework parsing or matching logic.
- `batchUpsertDrawings` uses `pg_advisory_xact_lock(projectId)` inside a Prisma transaction to coordinate concurrent upserts — be careful when refactoring transaction boundaries.
- When adding new job types:
  1. Add a handler under `src/lib/jobs` exporting a function `(job, prisma)` returning serializable JSON.
  2. Import and wire it in `src/worker.js` and add the type string to `prisma/schema.prisma` comment for clarity.
  3. Ensure the handler gracefully throws on invalid payloads and serializes any bigint values before returning.

## Files referenced

- `src/worker.js` — poller and dispatcher
- `src/lib/jobs/parseExcelJob.js`
- `src/lib/jobs/validateConflictsJob.js`
- `src/lib/jobs/projectDrawingsJob.js`
- `src/lib/jobs/generateZipJob.js`
- `src/lib/jobs/uploadJob.js`
- `src/app/api/jobs/enqueue/route.js`
- `src/app/api/jobs/[id]/route.js`
- `prisma/schema.prisma` — `Job` model and related schema

## Quick checklist when modifying worker or jobs

- Update `docs/worker.md` with new job descriptions and payload examples.
- Write unit/integration tests for new job logic when possible.
- Keep payloads small for base64 uploads; prefer signed URL flows for large binaries.
