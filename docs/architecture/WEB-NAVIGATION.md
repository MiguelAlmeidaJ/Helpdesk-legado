# Web navigation

The Next.js application has one central navigation manifest:

```text
apps/web/src/shared/navigation/navigation.ts
```

The sidebar and the migration overview dashboard read from this same manifest.
Do not duplicate menu labels directly inside feature screens.

## Status

Each menu item is one of:

- `available`: the target Next.js route exists and is considered usable for the
  current migration phase;
- `planned`: the capability is mapped but no new route should be advertised as
  functional yet.

Planned items remain visible with an `Em migração` badge instead of linking to
missing pages.

## Current available navigation

```text
Dashboard
Atendimentos
  Lista de Atendimentos
```

The ticket detail route is reached from the ticket list and is intentionally
not a separate navigation item.

## Adding a migrated page

When a capability becomes usable:

1. create the real route under `apps/web/src/app`;
2. update the corresponding item in `navigation.ts` with its `href`;
3. change its status to `available`;
4. protect the route with the appropriate authentication/authorization layer;
5. update the migration map when the module phase changes.

This keeps navigation status aligned with actual implementation.

## Architecture boundary

Navigation is a Web concern. The manifest must not import Prisma, database
models or NestJS classes.

Visibility by permission can be added later from `CurrentUserResponse`, but it
must use shared authorization vocabulary from `@helpdesk/contracts`, never
database role rows directly.
