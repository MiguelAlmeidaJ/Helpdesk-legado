# Helpdesk monorepo migration

This repository is being migrated incrementally from the legacy PHP application to a TypeScript monorepo.

## Structure

- `apps/api`: NestJS API. New business logic and database access belong here.
- `apps/web`: Next.js frontend. It must consume the API instead of accessing the database directly.
- `packages/database`: isolated Prisma configuration for the existing `nivel3` and `n3rd` databases.
- `packages/typescript-config`: shared TypeScript compiler defaults.
- Existing PHP directories remain untouched during the migration.
- Marketing data is part of the main database today (tables related to `terc_andar`); there is no separate `mkt` Prisma datasource.

## Local environment with Docker

The repository expects a local dump named `Dump_Helpdesk_RD.sql` at the project root. The dump is intentionally ignored by Git because it may contain production data.

Docker runs the database on host port `3307`, leaving `3306` free for XAMPP/MySQL.

```bash
cp .env.example .env
corepack enable
pnpm install

docker compose up --build
```

Or:

```bash
pnpm docker:up
```

Services:

```text
web       http://localhost:3000
api       http://localhost:3001/api
database  127.0.0.1:3307
```

Health check:

```text
GET http://localhost:3001/api/health
```

The SQL dump is executed only when the Docker database volume is initialized for the first time. If the dump changes and you intentionally want a fresh local database:

```bash
pnpm docker:reset
pnpm docker:up
```

`docker:reset` removes the local Docker database volume. Never use that command against production.

## Database URLs

For local commands executed on the host:

```dotenv
NIVEL3_DATABASE_URL=mysql://root:helpdesk@127.0.0.1:3307/nivel3
N3RD_DATABASE_URL=mysql://root:helpdesk@127.0.0.1:3307/n3rd
```

Inside Docker, Compose overrides the host in those URLs to `database:3306`.

On the server, Docker is not required. Keep the same variable names and point them to the MySQL/MariaDB instance used by XAMPP, for example:

```dotenv
NIVEL3_DATABASE_URL=mysql://root@127.0.0.1:3306/nivel3
N3RD_DATABASE_URL=mysql://root@127.0.0.1:3306/n3rd
```

Use the actual server credentials instead of committing passwords to Git.

## Prisma introspection

The first database operation is introspection, not migration:

```bash
pnpm db:pull
pnpm db:generate
```

Do not run `prisma migrate dev`, `prisma migrate deploy`, or `prisma db push` against production until the existing databases have been introspected, reviewed, and baselined.

## Migration rule

New TypeScript code follows this dependency direction:

```text
apps/web -> HTTP -> apps/api -> packages/database -> MySQL
```

`apps/web` must not import Prisma clients directly.

## First vertical slice

The first planned domain migration is Atendimento (`atd`): list/filter endpoints first, followed by details and workflow actions. The PHP implementation remains available while equivalent Nest/Next routes are introduced.
