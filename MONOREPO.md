# Helpdesk monorepo migration

This repository is being migrated incrementally from the legacy PHP application to a TypeScript monorepo.

## Structure

- `apps/api`: NestJS API. New business logic and database access belong here.
- `apps/web`: Next.js frontend. It must consume the API instead of accessing the database directly.
- `packages/database`: isolated Prisma configuration for the existing `nivel3`, `mkt`, and `n3rd` MySQL databases.
- `packages/typescript-config`: shared TypeScript compiler defaults.
- Existing PHP directories remain untouched during the migration.

## Local setup

```bash
cp .env.example .env
corepack enable
pnpm install
pnpm dev
```

The web app runs on port `3000` and the Nest API defaults to port `3001`.

Health check:

```text
GET http://localhost:3001/api/health
```

## Existing databases

Set the three existing MySQL URLs in `.env`:

```dotenv
NIVEL3_DATABASE_URL=mysql://user:password@host:3306/nivel3
MKT_DATABASE_URL=mysql://user:password@host:3306/mkt
N3RD_DATABASE_URL=mysql://user:password@host:3306/n3rd
```

The first database operation should be introspection, not migration:

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
