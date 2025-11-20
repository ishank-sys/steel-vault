# Worker Process

- **Location**: `src/worker.js`
- **Purpose**: A simple DB-poller worker that claims jobs from the `Job` table and dispatches them to job handlers.
- **Poll interval**: Controlled by `JOB_POLL_INTERVAL_MS` env var (default `2000` ms).
- **Claiming**: The worker finds the oldest `queued` job, then atomically updates it to `running` using `updateMany` (so only one worker claims it). It increments `attempts` when claiming.
- **Dispatch**: Based on `job.type`, the worker calls one of the handlers:

  - `publish-job` -> `src/lib/jobs/projectDrawingsJob.js` (`handlePublishJob`)
  - `parse-excel` -> `src/lib/jobs/parseExcelJob.js` (`handleParseExcel`)
  - `validate-conflicts` -> `src/lib/jobs/validateConflictsJob.js` (`handleValidateConflicts`)
  - `generate-zip` -> `src/lib/jobs/generateZipJob.js` (`handleGenerateZip`)

- **On success**: job record is updated to `succeeded`, `result` filled, `progress: 100`.
- **On error**: the worker logs the error, increments `attempts`, and either re-queues (`queued`) or marks the job `failed` when `attempts >= maxAttempts` (default 5). The error message is saved on the job row.

## Prisma Job model (relevant fields)

`id, type, status, payload, result, progress, attempts, maxAttempts, error, createdAt, updatedAt`

---

## Job Handlers

1. parse-excel (`src/lib/jobs/parseExcelJob.js`)

**Input (job.payload)**

- `fileBase64` (string) — required: Excel file encoded as base64
- optional: `projectId`, `clientId`, `originalName`, `uploaderId`

**Behavior**

- Decodes base64, reads the first sheet using `xlsx`, locates the header row (searches for a header containing `dr no`), extracts rows as arrays and maps columns to fields (`drgNo`, `description/item`, `rev`, `rev remarks`, `mod by`, `dr by`, `ch by`, `category`). Returns normalized rows as `result.rows`.

**Output (job.result)**

```json
{ "rows": [ { "id": ..., "slno": ..., "drgNo": ..., "item": ..., "rev": ..., "modeler": ..., "detailer": ..., "checker": ..., "status": ..., "category": ..., "view": ..., "attachedPdfs": ..., "conflict": ..., "attachConflict": ... } ] }
```

**Errors**

- Throws if `fileBase64` is missing or parsing fails; the worker will mark the job failed or requeue per attempts.

2. validate-conflicts (`src/lib/jobs/validateConflictsJob.js`)

**Input (job.payload)**

- `projectId` (number) — required for DB lookups
- `packageId` (optional)
- `drawingKeys` (optional array) — specific drgNos to check
- `fetchAll` (boolean) — when true returns previous revisions map + rows for the project/package

**Behavior**

- If `fetchAll` is true: queries `ProjectDrawing` rows for the project (and package if provided), normalizes drawing tokens and categories, and builds a map keyed by `normDr::normCat`, `normDr`, and `file::<lowercased filename>` to previous revision values. Returns `{ prevRevMap, rows }`.
- If `drawingKeys` is provided: queries matching `ProjectDrawing` rows and returns `{ conflicts: [ { drgNo, prev } ] }` where `prev` contains revision/fileName.

**Usage**

- This handler is used by the client (`PublishDrawing.jsx`) to prefetch previous revision state and detect conflicts / enforce revision progression.

3. publish-job (`src/lib/jobs/projectDrawingsJob.js`)

**Input (job.payload)**

- Expected shape:
  ```json
  {
    "clientId": ..., "projectId": ..., "packageId": ...,
    "drawings": [ { "drawingNumber": ..., "category": ..., "revision": ..., "fileNames": [...], "issueDate": ... } ]
  }
  ```

**Behavior**

- Transforms the payload into a normalized `entries` array and calls `batchUpsertDrawings(entries)`.
- `batchUpsertDrawings` performs a transaction per-project and uses `pg_advisory_xact_lock(projectId)` to serialize updates for a project.
- For each entry it finds an existing active `ProjectDrawing` (matching `projectId`, `packageId` if provided, `drgNo` and `superseded_by IS NULL`) FOR UPDATE, marks the previous row as superseded (updates `superseded_by` to `-1` temporarily then later sets to the new id), inserts a new row with `fileName` and `meta` (JSON with `fileNames` and `issueDate`), and then updates the previous row's `superseded_by` to the new id.

**Output**

- `{ created, superseded, total }` indicating counts.

**Notes**

- The function contains raw SQL (`$queryRawUnsafe`) and manual parameter binding to implement complex upsert logic and locking. It expects `projectId` to be present on entries.

4. generate-zip (`src/lib/jobs/generateZipJob.js`)

**Input (job.payload)**

- `objectPaths` (array) — required: GCS object paths (e.g., `gs://bucket/path/to/file.pdf`) or object keys relative to configured bucket
- `zipName` (optional) — desired zip filename
- `destinationPath` (optional) — destination path inside bucket
- `projectId`, `clientId`, `logType` optionally used for `DocumentLog` creation

**Behavior**

- Uses `getGCSStorage()` (GCS client) to read files from the bucket, composes a ZIP using `archiver`, and writes the ZIP to `gs://<bucket>/<destPath>` by creating a write stream to the destination file.
- On success it attempts to create a `DocumentLog` record (via Prisma) with `storagePath: gs://...`, `fileName`, `size`, `clientId`, `projectId`, and `logType` (defaults to `TRANSMITTAL_ZIP`). Returns `{ storagePath, fileName, record }`.

**Error handling**

- If files fail to add to the archive, there are warnings per-file but the job proceeds; fatal errors reject and cause the job to fail.

---

## API integration

- **Enqueue job**: `POST /api/jobs/enqueue` (`src/app/api/jobs/enqueue/route.js`)

  - **Body**: `{ type: 'parse-excel'|'validate-conflicts'|'publish-job'|'generate-zip', payload: {...} }`
  - **Response**: `{ jobId }` on success

- **Job status / control**: `/api/jobs/[id]` (`src/app/api/jobs/[id]/route.js`)
  - `GET /api/jobs/:id` returns `{ job }` with full job row (status, result, error, attempts)
  - `POST /api/jobs/:id` retries a job by setting `status='queued'` and clearing `error`
  - `DELETE /api/jobs/:id` cancels a job by setting `status='failed'` and `error='cancelled'` (only allowed for non-finished jobs)

## Frontend usage examples

### Publish flow (client-side `TransmittalForm.jsx`)

1. Build `entriesToUpsert` from selected drawings with `drawingNumber`, `category`, `revision`, `fileNames`, `issueDate`.
2. Enqueue `publish-job` by POST `/api/jobs/enqueue` with payload `{ clientId, projectId, packageId, drawings: entriesToUpsert }`. The worker will upsert to the `ProjectDrawing` table.
3. Upload attached drawing files to GCS (client uploads directly via `uploadToGCSDirect` helper which itself writes a `DocumentLog` entry on success). Client collects `uploadedObjectPaths`.
4. Enqueue `generate-zip` with `objectPaths: uploadedObjectPaths` and optional `zipName`. The worker will read objects server-side and produce a central ZIP plus a `DocumentLog` record.

### Excel parsing flow (client-side `PublishDrawing.jsx`)

1. When the user selects an Excel file, the client encodes it to base64 and enqueues a `parse-excel` payload: `{ fileBase64, projectId, clientId, originalName }`.
2. The client polls `/api/jobs/:id` until `status === 'succeeded'` and then reads `job.result.rows` to populate the drawings table.

### Validate conflicts flow (client-side `PublishDrawing.jsx`)

1. On project/package selection the client enqueues `validate-conflicts` with `{ projectId, packageId, fetchAll: true }` to fetch `prevRevMap` and `rows` used to detect revision progression and attach conflicts.

## Storage integration

- **GCS** is used for file uploads and final ZIP storage.
- `generate-zip` accepts `objectPaths` that can be `gs://...` references or object paths relative to the `GCS_BUCKET` env var. The job determines the bucket by the `GCS_BUCKET` env var or by parsing the first `gs://` path.

## Concurrency and Safety

- **Atomic claiming**: the worker uses `findFirst` and `updateMany` with `where: { id, status: 'queued' }` to avoid double-claim. This is a lightweight optimistic claim.
- **Project-level upserts**: use Postgres advisory locks (`pg_advisory_xact_lock(projectId)`) inside a transaction to serialize operations per project and avoid race conditions when multiple publish jobs run for the same project.

## Error, retry, and monitoring

- Job `attempts` increments on claim and on failure. The worker enforces `maxAttempts` (default 5) to stop retrying and mark a job as `failed`.
- Job rows store `error` messages to help debugging. Client-side code polls job status and surfaces failure messages to users.

## Examples

### Enqueue parse-excel (client)

```http
POST /api/jobs/enqueue
Content-Type: application/json

{
  "type": "parse-excel",
  "payload": { "fileBase64": "<base64>", "projectId": 42, "clientId": 3, "originalName": "drgs.xlsx" }
}
```

### Enqueue publish-job (client)

```http
POST /api/jobs/enqueue
Content-Type: application/json

{
  "type": "publish-job",
  "payload": { "clientId": 3, "projectId": 42, "packageId": 7, "drawings": [ { "drawingNumber": "A-101", "category": "A", "revision": "A", "fileNames": ["A-101-A.pdf"], "issueDate": "2025-11-20" } ] }
}
```

### Enqueue generate-zip (client)

```http
POST /api/jobs/enqueue
Content-Type: application/json

{
  "type": "generate-zip",
  "payload": { "objectPaths": ["gs://my-bucket/uploads/A-101-A.pdf", "gs://my-bucket/uploads/A-102-A.pdf"], "zipName": "transmittal-42.zip", "projectId": 42, "clientId": 3 }
}
```
