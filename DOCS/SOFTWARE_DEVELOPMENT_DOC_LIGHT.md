**SOFTWARE DEVELOPMENT DOC – LIGHT VERSION (7.5/10)**

**1. PROJECT OVERVIEW (README)**

- **Project Name:** `steel-vault`
- **Project Name:** `steel-vault`
- **Repository:** `https://github.com/ishank-sys/steel-vault.git` (owner: `ishank-sys`, branch: `main`)
- **Purpose:** this project is made for structures online, so the employee can directly share the drawing files of a project with the client through an online portal.
- **Short Description:** A Next.js application for project document/drawing management, allowing employees to upload, manage, and share drawings with clients via signed URLs and role-based access.
- **Stakeholders:** Admin, Project Manager / Employee, Client, Developer, QA
- **Tech Stack:**
  - Frontend: `Next.js` (app router), `React` 19, `Tailwind CSS` (v4)
  - Backend: `Node.js` (Next.js API routes), `NextAuth` for auth, server-side JS
  - DB / ORM: `PostgreSQL` via `Prisma` (schema present)
  - Storage: Google Cloud Storage (primary; also AWS SDK is included for S3 interactions)
  - Email: SendGrid / Nodemailer
  - Hosting: Not specified in repo (common choices: Vercel, Netlify, self-hosted Node server)

Architecture (Simple)

- The Next.js frontend and API routes run in a single app. User actions (upload/share) call API routes which:
  1. validate/auth user using `next-auth` and tokens;
  2. interact with the `Prisma` client to read/write `Postgres` data (projects, clients, drawings);
  3. issue signed URLs (GCS or S3) for direct client upload/download and log the document via `DocumentLog`/`ProjectDrawing` models.

Key Features

- Upload and manage project drawing files with revisions and categories
- Generate signed upload/download URLs (GCS / S3) for clients
- Role-based access (admin / client / employee)
- Document logs and project drawing index (fast UI listing of latest revision)
- Notifications/email sending for submittals and actions

Folder Structure (High Level)

- `src/` – application sources
- `src/app` – Next.js app router (pages + API routes under `src/app/api`)
- `src/app/api` – API routes (see API doc below)
- `src/app/components` – UI components
- `src/lib` – helper libraries (Prisma client, GCS helpers, auth wrappers)
- `prisma/` – Prisma schema, migrations, seed

Run Locally (Minimum Required)

- Requirements:
  - Node.js 18+ (tested with Node 18/20; modern Next 15 requires a recent Node)
  - PostgreSQL (or a compatible DB) accessible via `DATABASE_URL`
  - `pnpm`/`npm` (repo uses npm scripts)
- Install: `npm install`
- Start (dev): `npm run dev`
- Useful scripts (from `package.json`):
  - `dev`: runs Next dev
  - `build`: `prisma generate && next build`
  - `start`: `next start`
  - `postinstall`: runs `prisma generate`
  - `seed`: `prisma db seed`

Environments (Only URLs + Branch)

- Dev: (local) — branch: `main` (repo current branch)
- Staging: Not configured in repo — add URL when available
- Prod: Not configured in repo — add URL when available

Coding Standards (Short)

- Follow lint rules (`npm run lint`)
- Keep functions small and single-responsibility
- Use descriptive names and consistent casing
- Require code review / PR approvals before merging

**2. API DOCUMENTATION (SCALED-DOWN)**
API Overview:

- Base URL: `/api` (Next.js app route APIs live under `src/app/api`)
- Auth Method: `next-auth` sessions + JWTs/tokens in some routes; many routes validate session/server token.

Common Endpoint Format (examples observed in repo):

- `GET  /api/projects` — List projects
  - Description: Returns projects visible to the current user.
  - Response example: `{ "success": true, "data": [ { "id": 1, "name": "Proj" } ] }`
- `POST /api/project-drawings` — Upsert or publish a project drawing
  - Description: Adds/updates `ProjectDrawing` entries and may attach a `DocumentLog`.
- `POST /api/gcs/sign` or `/api/gcs/signed-url` — Create signed URLs for uploads/downloads
  - Description: Returns a signed URL clients can use to upload or download directly to cloud storage.
- `POST /api/upload` — Server-managed upload entry point (used for small files or proxies)
- `GET  /api/files/[id]/url` — Get a file's public/signed URL
- `POST /api/send-email` — Send notification emails (SendGrid/Nodemailer wrapper)

Request Example: POST /api/projects with JSON body { "name": "New Project", "clientId": 3 }

Response Example: { "success": true, "project": { "id": 123, "name": "New Project" } }

API Checklist:

- Inputs / Outputs: routes generally accept JSON bodies or query params and return `{ success: boolean, ... }` objects.
- Errors: API returns HTTP error codes and JSON error messages; ensure handlers catch Prisma errors and return sanitized messages.
- Dependencies: Prisma DB, GCS / S3 credentials, SendGrid / SMTP creds, and `NEXTAUTH` secrets.

**3. GITHUB ACTIONS DOC (SIMPLE)**
Workflows Used:

- Repo contains no `.github/workflows` directory (no CI workflows detected).

Typical Workflow (recommended):

- `checkout` → `install` → `prisma generate` → `lint` → `test` → `build` → `deploy`

Secrets List (recommend adding):

- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `GOOGLE_APPLICATION_CREDENTIALS` (or base64 GCP key)
- `SENDGRID_API_KEY`
- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` (if using S3)

Deploy Notes (Short)

- Who deploys: Project maintainer / release manager
- Branch: `main` (or `release`/`prod` branch depending on workflow)
- Rollback steps: Re-deploy previous working build from the CI artifact or revert commit and re-deploy.

**4. CHANGELOG (Short Format)**

- v1.0 – Initial
- v1.1 – Improvements (upload / GCS integration improvements)
- v1.1.1 – Fixes (minor bugfixes and migrations)

**5. CONTRIBUTION RULES (LIGHT)**

- Branch from `dev` (or branch from `main` if `dev` doesn't exist)
- Keep commits small and focused
- Use descriptive PR titles and link related issue IDs
- Add tests for new features and run linters

**6. PROJECT FLOW**
Backlog → Sprint → Code → Review → QA → Release

**7. DOC CHECKLIST**

- README done: This file (`DOCS/SOFTWARE_DEVELOPMENT_DOC_LIGHT.md`) provides the lightweight doc
- API docs added: Basic API overview included
- Setup included: Local run steps and important scripts included
- Actions included: No workflows detected; recommended workflow described
- Changelog done: Short changelog included

---

Notes and quick repo sanity checks

- Prisma datasource: `postgresql` (see `prisma/schema.prisma`) — DB URL required via `DATABASE_URL`.
- Key API route folders observed: `projects`, `project-drawings`, `clients`, `users`, `files`, `gcs` (signed URLs), `upload`, `send-email`, `notify-submittal`.
- Scripts: `dev`, `build`, `start`, `lint`, `seed` are defined in `package.json`.
- No GitHub Actions workflows found in repository root (`.github/workflows` missing).

Recommended next steps (low-effort):

- Add an `.env.example` file listing required env vars.
- Add a short `README.md` at repo root pointing to this doc and including one-line setup.
- Add CI workflow to run `lint` and `prisma generate` and tests on PRs.
