# Ticket interactions

The first migrated ticket write endpoint is:

```text
POST /api/tickets/:id/interactions
```

Body:

```json
{
  "description": "Solicitante confirmou que o acesso voltou ao normal."
}
```

The description is plain text, trimmed by the API and limited to 10,000
characters.

## Legacy parity

The PHP action `atd_new_inter` inserts:

```text
inter_tipo = 7
inter_atd = ticket id
inter_user = authenticated user
inter_data = current server time
inter_desc = submitted description
```

The NestJS command preserves those persistence semantics.

It intentionally does not:

- change ticket status;
- change technician assignment;
- send e-mail;
- create an attachment;
- update SLA state.

## Authorization

The legacy action is available to users that can visualize the ticket.
Therefore the transitional API keeps `tickets.read` as the capability for this
specific interaction write.

Resource scope is still enforced by the application layer:

- `own` restricts to tickets assigned to the current technician;
- `all` can access any otherwise-visible ticket;
- `sector` fails closed until ticket-to-sector mapping exists;
- external users remain restricted by `clientes_usuarios`.

This permission can be split into a dedicated interaction capability later if
the RBAC catalog evolves.
