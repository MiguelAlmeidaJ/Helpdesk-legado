# Ticket rejection workflow

The migrated endpoints are:

```text
GET  /api/tickets/rejection/technicians
POST /api/tickets/:id/rejection
```

## Return to the queue

With:

```json
{
  "technicianId": 0,
  "reason": "Necessário devolver para a fila."
}
```

the command writes:

```text
atendimentos.tecnico = 0
atendimentos.status = 1
interatividade.inter_tipo = 3
```

## Reject and direct

With another active user ID:

```json
{
  "technicianId": 15,
  "reason": "Necessário atendimento por outro especialista."
}
```

the command writes:

```text
atendimentos.tecnico = selected technician
atendimentos.status = 1
interatividade.inter_tipo = 4
```

The legacy action stores HTML `<br>` in the interaction text. The migrated
command stores line breaks because the Next timeline renders descriptions as
plain text.

## Authorization

The API requires:

```text
tickets.read
tickets.reject
```

Resource scope:

- `own`: the source ticket must be assigned to the authenticated user;
- `all`: any otherwise-visible ticket can be rejected;
- `sector`: fails closed until ticket-to-sector mapping exists.

## State transition

The new command accepts only status `2` (in progress) and transitions to status
`1` (waiting execution).

This is deliberately stricter than the old PHP handler. It prevents a stale
request from reopening a held, completed or finalized ticket.

## Consistency

The repository locks the ticket row with `FOR UPDATE`.

Ticket status/technician and the interaction record are committed in the same
transaction. Concurrent state changes return HTTP `409 Conflict`.
