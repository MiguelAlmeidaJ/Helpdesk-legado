# Automatic resume worker

The legacy ticket home currently calls `atd_home_run_jobs($pdo)` on every
request. The same job set can also be executed from
`atd/jobs/run_home_jobs.php`.

The legacy automatic wait-resume behavior is:

```text
latest wait forecast <= current time
ticket status 3 -> 2
espera.espera_end = current time
interatividade.inter_tipo = 6
interatividade.inter_user = 1
description = Status do atendimento alterado automaticamente para Em Execucao.
```

Unlike the manual resume path, this automatic legacy path does not send an
e-mail.

## New worker

The NestJS migration introduces a dedicated process:

```text
helpdesk-ticket-worker
apps/api/dist/worker.js
```

It is intentionally separate from the HTTP API so increasing API instances in
the future does not multiply the scheduler.

The worker is managed by the existing PM2 ecosystem and is kept alive even
when automatic resume is disabled.

## Feature flag

Automatic resume is disabled by default:

```dotenv
TICKET_HOLD_AUTO_RESUME_ENABLED=false
TICKET_HOLD_AUTO_RESUME_INTERVAL_MS=60000
TICKET_HOLD_AUTO_RESUME_BATCH_SIZE=100
```

Do not enable `TICKET_HOLD_AUTO_RESUME_ENABLED` in a shared or production
environment while the legacy PHP waiting job is still active.

Changing the flag requires a PM2 restart with updated environment variables.

## Processing rules

The worker uses database time (`NOW()`) and only selects tickets where:

```text
atendimentos.status = 3
latest espera.espera_end IS NULL
latest espera.espera_prev IS NOT NULL
latest espera.espera_prev <= NOW()
```

For every candidate it starts a transaction and locks the ticket and wait rows
with `FOR UPDATE`. It then rechecks the state before writing.

A successful automatic resume performs atomically:

```text
atendimentos.status = 2
espera.espera_end = NOW()
interatividade.inter_tipo = 6
interatividade.inter_user = 1
```

This preserves the legacy system-user convention.

If two worker processes accidentally observe the same candidate, the second
process waits for the row lock and then skips the ticket after seeing that it
is no longer in status 3.

## Intentional hardening

The PHP implementation chooses the latest wait row but does not require
`espera_end IS NULL`.

The NestJS worker requires the latest wait row to still be open. A ticket in
status 3 with no active wait is treated as inconsistent and is not silently
resumed.

## Deployment stage

This patch installs the worker but does not perform the production cutover.

The safe sequence is:

1. deploy and build this patch with the feature flag still `false`;
2. verify `helpdesk-ticket-worker` is online and logging that auto-resume is
   disabled;
3. retire only the legacy PHP waiting-resume execution while keeping the other
   legacy jobs active;
4. set `TICKET_HOLD_AUTO_RESUME_ENABLED=true`;
5. restart PM2 with updated environment;
6. validate one controlled overdue wait and its interaction type 6.

Scheduled-ticket activation and recurring-ticket generation remain legacy
responsibilities for now.
