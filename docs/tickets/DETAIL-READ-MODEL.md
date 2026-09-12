# Ticket detail

The migrated detail routes start with:

```text
GET /api/tickets/:id
POST /api/tickets/:id/interactions
/tickets/:id
```

## Scope

The first detail slice contains:

- ticket status and timestamps;
- opening/closing descriptions;
- type, level, priority and service form;
- client;
- requester;
- location;
- category, subcategory and item;
- assigned technician;
- legacy interaction timeline.

The web renders legacy interaction descriptions as text. It does not inject
legacy HTML into the page.

## Authorization

The endpoint requires `tickets.read`.

The application use case applies the effective `own` or `all` scope before the
repository query.

Legacy external users (`tipo_usuario = 2`) are restricted through
`clientes_usuarios`, matching the list read model.

A hidden/out-of-scope ticket returns 404 so the endpoint does not confirm the
existence of records outside the user's visibility.

## New interaction

The first migrated write operation is a plain-text interaction. It preserves
the legacy `inter_tipo = 7` behavior and records the authenticated user and
server timestamp. The endpoint applies the same ticket visibility rules as the
detail route before inserting the interaction.

## Intentionally not migrated yet

This slice does not implement:

- accepting/direction;
- waiting/resume;
- reject;
- conclude/finalize;
- attachment upload/delete;
- ticket classification editing;
- e-mail side effects.

Those operations currently coexist inside `atd/atd_detalhe.php` and must move
to explicit application commands instead of being copied into a single NestJS
controller.

The PHP detail page remains required until those workflows reach parity and
the Next detail route becomes the cutover destination.
