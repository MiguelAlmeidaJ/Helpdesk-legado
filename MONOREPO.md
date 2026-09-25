# Helpdesk monorepo

The legacy PHP Helpdesk is being migrated incrementally to a modular TypeScript monorepo.

## Runtime

```text
Browser
  |
  v
apps/web (Next.js :4204)
  |
  | HTTP
  v
apps/api (NestJS :4004)
  |
  +--> packages/database --> nivel3
  |
```

Locally, Docker is used only for MariaDB on `127.0.0.1:3307`. API and Web run on the host and are managed by PM2. On the server, PM2 remains responsible for API/Web and the database URLs point to the MySQL/MariaDB instance used by XAMPP.

## Workspace

- `apps/api`: NestJS modular monolith.
- `apps/web`: Next.js frontend organized by feature.
- `packages/contracts`: framework-free HTTP/domain contracts shared by API and Web.
- `packages/database`: Prisma client for the active `nivel3` database.
- `packages/typescript-config`: shared TypeScript compiler settings.
- Legacy PHP directories remain available until their equivalent module reaches cutover.

Marketing does not have a separate Prisma datasource. Data currently related to `terc_andar` stays in the main `nivel3` database until that domain is migrated.

## Modular architecture

The API is split into:

```text
apps/api/src/
  core/       cross-cutting infrastructure
  modules/    business capabilities
```

`core` owns configuration, database lifecycle, health checks and future platform concerns such as logging. Business rules must not be placed in `core`.

Feature modules use a vertical structure when they grow:

```text
modules/<feature>/
  domain/
  application/
  infrastructure/
  presentation/
  <feature>.module.ts
```

Do not create folders before they have code. A small module may start with only its Nest module and expand as behavior is migrated.

See:

- `docs/architecture/MODULARITY.md`
- `docs/MIGRATION-MAP.md`
- `docs/MODULE-CHECKLIST.md`

## Dependency rules

```text
apps/web --------------------> packages/contracts
   |
   +---- HTTP ----> apps/api ---> packages/contracts
                       |
                       +--------> packages/database
```

Rules:

1. `apps/web` never imports `packages/database`.
2. `packages/contracts` never imports NestJS, Next.js, React or Prisma.
3. Only API infrastructure talks to Prisma.
4. One business module must not reach directly into another module's infrastructure.
5. Shared business behavior is exposed through an exported application service or a stable contract, not by importing another module's repository.
6. The legacy PHP database schema is treated as an external persistence model; Prisma models are not domain models.

## Local setup

For a first installation with an empty database volume, place the SQL dump at
`Dump_Helpdesk_RD.sql` in the repository root and initialize MariaDB before running
the setup commands below:

```bash
docker compose -f compose.yaml -f compose.seed.yaml up -d --wait database
```

The dump is imported only when the database volume is empty. Normal startup with
`pnpm docker:up` reuses the existing data and does not require the dump file.
Without a dump or existing data, normal startup creates an empty `nivel3`
databases; the application still needs the legacy schema and data to work.

```bash
cp .env.example .env
corepack enable
pnpm install
pnpm docker:up
pnpm db:generate
pnpm access:bootstrap
pnpm build
pnpm navigation:bootstrap
pnpm pm2:start
```

Endpoints:

```text
web       http://localhost:4204
api       http://localhost:4004/api
health    http://localhost:4004/api/health
database  127.0.0.1:3307
```

Under PM2, the web process waits up to two minutes for `/api/health` to confirm
that the API and both databases are available before starting Next.js. This avoids
session fetch errors when the API starts more slowly than the web process.
If startup times out, check `helpdesk-api` logs and database connectivity; PM2
retries the web process after five seconds.

When upgrading an existing PM2 registration that still points directly to the
Next.js binary, run `pm2 delete helpdesk-web` followed by `pnpm pm2:start` once.
PM2 keeps the old script path on a regular restart. Subsequent restarts can use
`pnpm pm2:restart` normally.

Useful commands:

```bash
pnpm pm2:status
pnpm pm2:logs
pnpm pm2:restart
pnpm docker:down
```

If the local dump changes and a fresh database is intentional:

```bash
pnpm docker:reset
docker compose -f compose.yaml -f compose.seed.yaml up -d --wait database
```

`docker:reset` deletes the local Docker database volume.
Make sure `Dump_Helpdesk_RD.sql` exists before resetting. Do not reset the volume
to fix a missing dump mount: run `pnpm docker:up` to preserve and reuse existing data.

## Server

The same code runs under PM2. Only environment variables change:

```dotenv
NIVEL3_DATABASE_URL=mysql://user:password@127.0.0.1:3306/nivel3
```

Never commit server credentials.

Typical deployment:

```bash
git pull
pnpm install --frozen-lockfile
pnpm db:generate
pnpm access:bootstrap
pnpm build
pnpm navigation:bootstrap
pm2 restart ecosystem.config.cjs --env production --update-env
pm2 save
```

## Database safety

The existing databases were introspected with Prisma. During the migration, do not run `prisma migrate dev`, `prisma migrate deploy`, or `prisma db push` against production unless a migration/baseline strategy has been explicitly reviewed.

Use `pnpm db:pull` only when intentionally refreshing Prisma from the legacy database, review the schema diff, then run `pnpm db:generate`.
