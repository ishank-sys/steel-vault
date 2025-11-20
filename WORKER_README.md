Worker (DB-poller) README

Purpose
- The DB-poller worker processes long-running background jobs persisted to the database (Excel parsing, conflict validation, DB upserts, ZIP generation).

Prerequisites
- Node.js installed
- Postgres database accessible via `DATABASE_URL`
- Prisma CLI available (`npx prisma ...`)
- Google Cloud Storage credentials accessible via environment variables (see below) and a bucket available

Environment Variables
- `DATABASE_URL`: Postgres connection string used by Prisma
- `GCS_BUCKET`: (optional) the default GCS bucket name to write generated ZIPs
- `GOOGLE_APPLICATION_CREDENTIALS_JSON`: JSON string of service account credentials (alternative to ADC file)
- `JOB_POLL_INTERVAL_MS`: (optional) poll interval in milliseconds (default 2000)
- `NODE_ENV`: optional, set to `production` or `development`

Install
- From project root:
  - npm install

Apply Prisma Migrations
- Ensure `prisma/schema.prisma` contains the `Job` model added by the code changes
- Run migrations (development):
  - npx prisma migrate dev --name add_jobs_table
- In production, use:
  - npx prisma migrate deploy

Run Worker (development)
- Example (use env inline or a .env file):
  - export DATABASE_URL="postgresql://user:pass@host:5432/dbname"
  - export GCS_BUCKET="my-bucket"
  - export GOOGLE_APPLICATION_CREDENTIALS_JSON='{"type":"service_account", ... }'
  - node src/workers/dbWorker.js

Run Worker (system/service)
- Consider running the worker as a systemd service or a container. Example systemd unit (adjust paths and user):
  - [Unit]
    Description=Structures Online DB Worker
    After=network.target

    [Service]
    Type=simple
    WorkingDirectory=/home/youruser/workspace/structures-online/steel-vault
    ExecStart=/usr/bin/node src/workers/dbWorker.js
    Restart=on-failure
    Environment=DATABASE_URL=postgresql://user:pass@host:5432/dbname
    Environment=GCS_BUCKET=my-bucket
    Environment=GOOGLE_APPLICATION_CREDENTIALS_JSON='{"type":"service_account",...}'

    [Install]
    WantedBy=multi-user.target

Observability
- Worker writes job status and result to the `Job` table. Monitor the table for stuck/failed jobs.
- The worker logs to stdout/stderr; redirect logs to a file or use a process supervisor (pm2, systemd).

Notes
- The worker expects client code to upload attachments to GCS and pass `objectPaths` (gs://bucket/path) to `generate-zip` jobs. The worker will stream remote objects into a ZIP and write the ZIP back to GCS.
- Ensure the service account used by the worker has read access to constituent objects and write access to the destination bucket.

If you want, I can add a `package.json` npm script to run the worker and update docs accordingly.