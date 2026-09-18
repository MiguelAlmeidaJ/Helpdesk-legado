# Tickets read model

The migrated ticket list endpoint is:

```text
GET /api/tickets
```

It is a JSON read model. It intentionally does not render legacy HTML.

## Authorization

The endpoint requires:

```text
tickets.read
```

Authentication still uses the PHP session bridge. Authorization uses the
hybrid RBAC access layer.

Current RBAC translation gives `tickets.read / all` to users with
`atendimentos.visualizar`.

The application layer also understands `own`. A future `sector` grant is denied
until the ticket-to-sector mapping is explicitly modeled, preventing accidental
cross-sector visibility.

## Legacy parity covered

The read model preserves:

- default page size of 50;
- default statuses 1, 2, 3 and 5;
- default SLA ordering;
- SLA remaining time and bell/order values;
- accumulated completed waiting time;
- latest waiting record and SLA activity timestamp;
- status-card totals;
- client/requester/technician filter options;
- client filter;
- requester filter;
- ticket id lookup;
- description text search;
- ticket type filter, defaulting to 0 through 6;
- technician filter;
- opening date range;
- client visibility restriction for legacy `tipo_usuario = 2`;
- the existing user 134 `NET DO BRASIL` restriction;
- joins for client, requester, location, category, subcategory, item and
  technician.

The HTTP contract deliberately renames legacy `f_*` parameters.

## Query parameters

```text
page=1
limit=50
status=1,2,3,5
clientId=10
requesterId=20
id=1234
search=palavra
type=0,1,2
technicianId=4,5
openedFrom=2026-08-01
openedTo=2026-09-01
sort=sla
direction=asc
```

Allowed sort values:

```text
sla
id
client
openedAt
level
priority
technician
status
```

## Status cards

The response includes the legacy status groups:

```text
Aguardando   -> 1
Em execução  -> 2
Em espera    -> 3
Concluído    -> 5
Finalizado   -> 4
Agendados    -> 0
Todos        -> 0,1,2,3,4
```

Like the PHP implementation, card totals preserve the active non-status filters
while evaluating the full status set.

## Filter options

The response also includes:

```text
options.clients
options.requesters
options.technicians
```

Client options respect the legacy external-client visibility rule.
Requester options are loaded only when a client is selected.
Technicians use the same active/function filter as the PHP home.

## Automatic jobs are not GET behavior

The legacy refresh endpoint mutates data while loading the page:

- activates scheduled tickets whose opening time has arrived;
- resumes waiting tickets;
- creates recurring tickets.

The Nest `GET /api/tickets` deliberately does not copy this behavior.
Those mutations must move to an explicit scheduled/background worker before
`atd/lib/home_jobs.php` can be retired.

## Still pending before PHP list retirement

- Next.js ticket list screen;
- explicit replacement for the automatic ticket jobs;
- parity validation with representative production-like records;
- removal of legacy HTML rendering/navigation consumers.

`atd/api/home_list.php` remains until the Next.js screen is cut over.
