# Tickets read model

The first migrated ticket endpoint is:

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

The first read slice preserves:

- default page size of 50;
- default statuses 1, 2, 3 and 5;
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
sort=openedAt
direction=desc
```

Allowed sort values:

```text
id
client
openedAt
level
priority
technician
status
```

## Not migrated yet

The legacy home endpoint also performs or returns:

- automatic refresh jobs;
- SLA ordering/calculation;
- waiting/activity hydration;
- status cards;
- filter-option lists;
- rendered HTML.

Those concerns are intentionally left for the next parity slices. They do not
belong in the first JSON repository/controller implementation.

`atd/api/home_list.php` must remain until the Next.js ticket screen has replaced
the legacy page and the remaining read-model behavior required by that screen
has reached parity.
