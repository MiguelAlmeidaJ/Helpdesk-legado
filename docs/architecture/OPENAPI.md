# OpenAPI / Swagger

The NestJS API exposes interactive OpenAPI documentation.

## Routes

When enabled:

```text
GET /api/docs
GET /api/docs-json
```

`/api/docs` serves Swagger UI and `/api/docs-json` serves the raw OpenAPI
document.

## Configuration

```dotenv
SWAGGER_ENABLED=true
```

Set it to `false` when documentation must not be exposed in an environment.

The PM2 ecosystem forwards this variable to the API process.

## Authentication

During the migration, protected routes document the same cookie used by the
legacy PHP login:

```text
PHPSESSID
```

The OpenAPI security scheme is named:

```text
legacy-session
```

This is deliberately not documented as Bearer/JWT authentication because that
is not the current runtime behavior.

## Controller conventions

New controllers should add:

```ts
@ApiTags('module-name')
```

Protected controllers/routes should also add:

```ts
@ApiSecurity(LEGACY_SESSION_SECURITY)
```

Each public operation should document at minimum:

- summary;
- successful status;
- expected authentication/authorization errors;
- non-obvious query/path parameters.

Do not expose Prisma-generated models directly as OpenAPI response contracts.
As response DTOs mature, Swagger schemas should be generated from API DTO
classes that map to `packages/contracts`.
