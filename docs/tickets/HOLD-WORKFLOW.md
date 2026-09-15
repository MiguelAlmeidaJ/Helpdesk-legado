# Ticket hold workflow

The migrated endpoints are:

```text
POST /api/tickets/:id/hold
POST /api/tickets/:id/resume
```

## Put on hold

Request:

```json
{
  "forecastAt": "2026-09-02T18:00:00.000Z",
  "cause": "Cliente",
  "description": "Aguardando retorno do solicitante."
}
```

Supported causes mirror the current legacy form:

```text
Terceiro
Nivel3
Cliente
Aguardando compra
Orçamento
Melhoria
```

The command accepts ticket statuses `1` (waiting execution) and `2` (in
progress), then:

```text
atendimentos.status = 3

espera.espera_atd = ticket id
espera.espera_user = authenticated user
espera.espera_start = NOW()
espera.espera_prev = forecastAt
espera.espera_causa = cause
espera.espera_desc = description
espera.espera_end = NULL

interatividade.inter_tipo = 5
```

The API requires a future forecast and prevents a second active hold record.

## Manual resume

The resume command only accepts status `3` and requires an active `espera`
record.

It writes:

```text
atendimentos.status = 2
espera.espera_end = NOW()
interatividade.inter_tipo = 6
```

## Authorization

Both commands require:

```text
tickets.read
tickets.hold
```

Resource scope is enforced through the same operation access resolver used by
the other ticket workflows:

- `own`: ticket must be assigned to the authenticated technician;
- `all`: any otherwise-visible ticket can be changed;
- `sector`: fails closed until ticket-to-sector mapping exists.

External-client restrictions and the exceptional user 134 visibility rule are
also preserved.

## Consistency

The ticket row and active wait row are locked with `FOR UPDATE`.

Ticket state, `espera` state and timeline interaction are committed in the
same transaction.

## E-mail

The PHP workflow currently sends e-mail when a ticket enters and leaves wait.
This patch does not reproduce that side effect yet because outbound mail has
not been extracted into the NestJS infrastructure layer.

The PHP detail page must therefore remain available during the migration.

## Automatic resume

This patch implements manual resume only.

Automatic resume when `espera_prev` becomes due will be migrated as a
dedicated NestJS scheduler/worker. Only one scheduler must be authoritative at
cutover; the legacy automatic job and the NestJS worker must not process the
same wait rows concurrently.

The new commands intentionally persist the existing `espera` schema so the
automatic-resume migration can be introduced without a data conversion.
