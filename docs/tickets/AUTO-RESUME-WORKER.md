# Ticket automation worker cutover

The automatic ticket jobs are now owned by the NestJS worker:

```text
helpdesk-ticket-worker
apps/api/dist/worker.js
```

The legacy `atd/home.php` no longer executes `atd_home_run_jobs($pdo)`.
`atd/jobs/run_home_jobs.php` remains only as a compatibility no-op so an
unknown server cron does not execute the old database mutations after cutover.

The old implementations under `atd/lib/home_jobs.php` remain temporarily as
rollback reference and can be removed after the server cron configuration is
audited.

## Jobs migrated

### Scheduled ticket activation

Legacy parity:

```text
atendimentos.status = 0
atendimentos.abertura <= current time
status 0 -> 1
interatividade.inter_tipo = 1
interatividade.inter_user = 1
description = Status do atendimento alterado automaticamente para Aguardando Execucao.
```

The NestJS worker uses database time (`NOW()`) and rechecks the ticket under
`FOR UPDATE` before updating it.

### Automatic wait resume

Legacy parity:

```text
latest wait forecast <= current time
ticket status 3 -> 2
espera.espera_end = current time
interatividade.inter_tipo = 6
interatividade.inter_user = 1
description = Status do atendimento alterado automaticamente para Em Execucao.
```

The migrated path intentionally also requires the latest wait to still be open
(`espera_end IS NULL`). The legacy automatic path did not send e-mail, so the
worker does not send e-mail either.

### Recurring ticket generation

Parents are eligible when:

```text
recorrente = 2
data_recorrencia IS NOT NULL
vezes > 0
data_recorrencia <= NOW()
```

Supported legacy recurrence rules remain:

```text
1 = daily
6 = weekly
2 = monthly
3 = every 3 months
4 = every 6 months
5 = yearly
7 = same weekday occurrence in the next month
```

Rule 7 preserves the legacy `semana` behavior, including `Ultima`.

Each parent is processed transactionally. The worker locks the current parent
row, verifies that `data_recorrencia` still matches the candidate, advances the
parent date, decrements `vezes`, creates the scheduled child, and creates the
type-1 system interaction.

The old PHP code used a MariaDB named lock around the recurrence batch. The
NestJS implementation instead protects every recurrence with a row lock plus a
compare-on-current-`data_recorrencia` update. This avoids duplicate children
even if two worker processes accidentally select the same parent.

## Configuration

The PM2 ecosystem enables all three jobs by default after this cutover:

```dotenv
TICKET_HOLD_AUTO_RESUME_ENABLED=true
TICKET_HOLD_AUTO_RESUME_INTERVAL_MS=60000
TICKET_HOLD_AUTO_RESUME_BATCH_SIZE=100

TICKET_SCHEDULED_ACTIVATION_ENABLED=true
TICKET_SCHEDULED_ACTIVATION_INTERVAL_MS=60000
TICKET_SCHEDULED_ACTIVATION_BATCH_SIZE=100

TICKET_RECURRENCE_ENABLED=true
TICKET_RECURRENCE_INTERVAL_MS=60000
TICKET_RECURRENCE_BATCH_SIZE=100
```

An explicit value in the server `.env` overrides the PM2 default. After
changing any value, run the normal PM2 restart with updated environment.

## Operational validation

After deployment:

```text
helpdesk-api            online
helpdesk-ticket-worker  online
helpdesk-web            online
```

Check the worker log and validate:

- one due scheduled ticket changes from 0 to 1 and receives interaction type 1;
- one overdue active wait changes from 3 to 2, closes `espera_end`, and receives
  interaction type 6;
- one controlled recurrence advances the parent and creates exactly one
  scheduled child.

If the server still has a cron calling `atd/jobs/run_home_jobs.php`, it can be
removed after confirming the worker is healthy. The compatibility runner is a
no-op and will not mutate the database.
