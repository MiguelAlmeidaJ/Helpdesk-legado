# Modular architecture

The target API is a modular monolith. The purpose is not to reproduce PHP folders in TypeScript; it is to group behavior by business capability and keep boundaries explicit.

## API layers

```text
apps/api/src/
  core/
    database/
    health/
    core.module.ts

  modules/
    modules.module.ts
    tickets/
      tickets.module.ts
```

`core` contains cross-cutting technical capabilities. It must not contain ticket, finance, asset, customer or other business rules.

`modules` contains business capabilities. Each capability starts small and grows vertically.

## Feature shape

Use these folders only when the module needs them:

```text
modules/tickets/
  domain/
    entities/
    value-objects/
    policies/

  application/
    use-cases/
    ports/

  infrastructure/
    persistence/
    integrations/

  presentation/
    http/
      controllers/
      dto/

  tickets.module.ts
```

Responsibilities:

- `domain`: business concepts and rules with no NestJS/Prisma dependency.
- `application`: use cases and ports. Coordinates domain behavior.
- `infrastructure`: Prisma repositories and external service adapters.
- `presentation`: HTTP-specific controllers, DTO parsing and response mapping.

For CRUD-like legacy reads, do not invent domain entities unnecessarily. Start with a use case + repository port + Prisma adapter and introduce richer domain objects only when rules justify them.

## Dependency direction

Inside a feature:

```text
presentation -> application -> domain
                     ^
                     |
              infrastructure
```

Infrastructure implements application ports. Domain never imports Prisma or NestJS.

Across features:

- do not import another feature's Prisma repository;
- do not join modules by reaching into internal folders;
- expose an application service from the owning Nest module when synchronous collaboration is required;
- use contracts/events when loose coupling is preferable.

## Database boundary

Prisma is persistence infrastructure, not the domain language.

Legacy names such as `atendimentos.cliente`, `usuarios.user_modulo_04` or other historical column conventions stay inside persistence mapping where possible. New HTTP/domain contracts should use explicit names.

The `nivel3` and `n3rd` clients remain in `packages/database`. Business modules consume them only through infrastructure adapters inside `apps/api`.

## Contracts package

`packages/contracts` is intentionally framework-free. It may contain:

- API request/response types;
- stable enums exposed to both API and Web;
- pagination/error contracts.

It must not contain:

- Prisma models;
- NestJS decorators;
- React components;
- database configuration;
- service/repository implementations.

## Web organization

The frontend mirrors business capabilities:

```text
apps/web/src/
  app/                 Next.js routing
  modules/
    tickets/
      components/
      hooks/
      services/
      types/
  shared/
    api/
    components/
```

`app/` should stay thin: route composition, layouts and page entry points. Feature behavior belongs in `modules/`.

The shared HTTP client lives in `shared/api`; a feature service wraps it with business-specific operations.

## Naming

Target modules use business names rather than legacy folder names.

Examples:

- `atd`, `atd_facility`, `atd_projeto`, `atd_3andar` -> `tickets`;
- `ativos` -> `assets`;
- `cont`, `cads_cont` -> `finance`;
- `docs`, `documentos` -> `documents`.

Do not create a new target module only because the PHP project has a folder.

## Definition of module boundary

Before implementing a module, record:

1. legacy entry points;
2. tables/views used;
3. session/permission dependencies;
4. external integrations;
5. read operations;
6. write/workflow operations;
7. shared data owned by another module;
8. cutover strategy.

Use `docs/MODULE-CHECKLIST.md` for each migration.
