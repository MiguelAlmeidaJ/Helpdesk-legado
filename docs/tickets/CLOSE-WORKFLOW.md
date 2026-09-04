# Ticket conclude/finalize workflow

New endpoints:

```text
POST /api/tickets/:id/workflow/conclude
POST /api/tickets/:id/workflow/finalize
```

Both require `tickets.read` + `tickets.close`.

Conclude accepts status 2 and writes status 5, a `concluido` row and interaction
type 10. The current PHP form posts the forecast under the wrong field name, so
the effective production `concluido_prev` is normally null; the Nest command
preserves that effective behavior.

Finalize writes `desc_fechamento`, `fechamento = NOW()`, status 4 and
interaction type 8. Own scope can finalize its in-progress ticket. All scope
also supports status 3 and 5, matching the manager UI. When finalizing directly
from wait/completed, the corresponding active auxiliary row is closed to avoid
leaving stale state.

Legacy e-mail side effects are not migrated in this slice.
