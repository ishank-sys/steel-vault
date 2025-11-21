# Tickets

## TICKET 01: Worker service and job support

> Add a dedicated worker process and implement background jobs to handle long-running tasks such as file uploads, Excel parsing, bulk upserts, conflict validation, and ZIP generation.

### Acceptance Criteria

- Worker process starts with `node src/worker.js` and runs a main poll loop.
- Uploads create job records and return immediately; heavy processing is executed by worker jobs.
- Jobs implemented: `uploadJob`, `parseExcelJob`, `projectDrawingsJob` (bulk upsert), `validateConflictsJob`, `generateZipJob`.

### Child Issues

1. `Upload job`: Accept uploads quickly and process them in the background with retry behavior for transient failures.
2. `Excel parsing job`: Parse and normalize spreadsheet inputs in the background for downstream processing.
3. `Project drawings upsert`: Perform bulk updates without blocking the API and compute revisions reliably.
4. `Conflict validation`: Detect duplicate/revision conflicts and store a conflict report for users.
5. `ZIP generation`: Create downloadable packages asynchronously and provide links when ready.

## TICKET 02: Optimize revision computation and bulk upserts

> Improve performance of project drawing revision computations and make bulk upserts more efficient.

### Acceptance Criteria

- Revision algorithm runs faster in bulk upsert benchmarks and does not block the worker loop.

### Child Issues

1. `Refactor revision algorithm`: Reduce CPU time used by revision computation.
2. `Bulk update reliability`: Ensure bulk updates complete reliably and fail gracefully.

## TICKET 03: Prisma schema parity and DB changes

> Align Prisma schema and migrations with previous Supabase column attributes and types; update seed and generate client.

### Acceptance Criteria

- `prisma/schema.prisma` updated to reflect column attributes needed for compatibility.
- Migrations included under `prisma/migrations` and `prisma/seed.js` works against local Postgres.
- `npx prisma generate` runs successfully after schema changes.

### Child Issues

1. `Apply schema changes`: Deploy and verify DB schema changes via migrations.
2. `Document migrations`: Ensure migration steps are documented for developers.

## TICKET 04: Local dev DB migration and tooling

> Replace external Supabase dev workflow with a local Postgres + pgAdmin docker-compose setup to reduce latency and improve parity with production.

### Acceptance Criteria

- `dev.docker-compose.yaml` starts Postgres and pgAdmin locally.
- Developers can run migrations and seed locally: `npx prisma generate`, `npx prisma migrate dev --name add_project_drawing`, `node prisma/seed.js`.
- `docs/local-setup.md` documents the steps.

### Child Issues

1. `Provide local DB`: Ensure a one-command local DB + management UI for developers.
2. `Onboarding docs`: Provide clear setup steps for running migrations and seeding locally.

## TICKET 05: Frontend UX improvements for upload and jobs

> Surface background job statuses and progress in relevant frontend components to improve responsiveness and feedback during uploads.

### Acceptance Criteria

- Components updated to show job status/progress for uploads and transmittals.
- Optimistic updates applied where appropriate and endpoints added to poll job status.
- Sample data and simulation scripts available for testing (`sample.json`, `scripts/simulate-upload.js`).

### Child Issues

1. `Progress indicators`: Add visible progress and final status for uploads and jobs.
2. `Conflict summaries`: Surface conflict summaries and guidance to users when validation finds issues.
