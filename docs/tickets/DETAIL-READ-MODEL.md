# Ticket detail read model

The migrated read-only detail routes are:

```text
GET /api/tickets/:id
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

## Intentionally not migrated yet

This slice does not implement:

- new interaction writes;
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
