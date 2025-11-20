# Local Development

This document explains how to set up and run the project locally from scratch.

## Prerequisites

- Node.js (recommended 18+ or matching your local toolchain)
- npm (bundled with Node.js) or a compatible package manager
- PostgreSQL accessible locally or remotely

## Steps

### 1. Clone the repo

```bash
git clone <repo-url>
cd steel-vault
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create environment variables

Copy the provided template and fill in real values. The project includes `.env.template` with all supported keys.

```bash
cp .env.template .env
# then edit .env to add real values
```

### 4. Prisma setup (migrations + client)

```bash
npx prisma generate
npx prisma migrate dev --name init
```

### 5. Start local services with Docker Compose

This project includes a `dev.docker-compose.yaml` that can run a development PostgreSQL database and a pgAdmin instance for convenience.

```bash
docker compose -f dev.docker-compose.yaml up -d
```

Notes:

- The compose file starts two services: `db` (Postgres) and `pgadmin` (pgAdmin).
- Postgres is exposed on host port `5433` (container port `5432`).
- pgAdmin is exposed on host port `8080` (container port `80`).
- Default Postgres credentials (from `dev.docker-compose.yaml`):
  - User: `postgres`
  - Password: `postgres`
  - Database: `steelvault_dev`
- Default pgAdmin credentials (from `dev.docker-compose.yaml`):
  - Email: `pgadmin@example.com`
  - Password: `pgadmin`

You can stop the services with:

```bash
docker compose -f dev.docker-compose.yaml down
```

### 6. (Optional) Seed the database

```bash
npm run seed
```

### 7. Start the development server

```bash
npm run dev
```

### 8. Worker (background job poller)

To run the background worker alongside the app (in a separate terminal):

```bash
npm run dev:worker
```

### 9. Accessing pgAdmin and registering the database server

1. Open the pgAdmin web UI in your browser at `http://localhost:8080`.
2. Log in with the default pgAdmin credentials: `pgadmin@example.com` / `pgadmin`.
3. Register a new server to connect to the Postgres database:

   - Click the `Servers` item in the left sidebar, then right-click and choose `Create` → `Server...`.
   - In the **General** tab set `Name` to something like `steelvault_local`.
   - In the **Connection** tab set the following:
     - `Host name/address`: `db` (if using the bundled `pgadmin` container) or `localhost` (if you run pgAdmin locally on your machine)
     - `Port`: `5432` (use `5433` if connecting from a host pgAdmin to the host-mapped Postgres port)
     - `Maintenance database`: `steelvault_dev`
     - `Username`: `postgres`
     - `Password`: `postgres`
   - Click `Save`.

4. Manage tables and data via the pgAdmin UI:
   - Expand `Servers` → your server name → `Databases` → `steelvault_dev` → `Schemas` → `public` → `Tables`.
   - Right-click a table to `View/Edit Data` → `All Rows` or open the `Query Tool` from the toolbar to run SQL queries.
