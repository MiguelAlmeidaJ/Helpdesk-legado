# Tickets web list

The first Next.js operational screen is:

```text
/tickets
```

It consumes only:

```text
GET /api/tickets
```

The browser performs the request client-side so the transitional PHP session
cookie can be sent directly to the NestJS API with `credentials: include`.

## Included in the first screen

- status cards;
- text search;
- client filter;
- requester filter;
- technician filter;
- opening date range;
- SLA-first ordering from the API;
- ticket table;
- previous/next pagination;
- loading, empty and API error states.

No Prisma/database type is imported by the web application. The screen uses
`@helpdesk/contracts`.

## Transitional authentication

The screen still depends on an authenticated legacy PHP browser session.
During local development, use the same hostname for PHP, Web and API, for
example `localhost`, so the PHP session cookie is available to API requests.

## Cutover status

This screen does not retire the legacy PHP list yet.

Before cutover:

- validate representative result counts and filters against the PHP screen;
- migrate or replace automatic ticket jobs currently triggered by PHP refresh;
- decide the navigation entry point for users;
- ensure required detail/workflow links have a new destination.

After those conditions are met, obsolete list-rendering PHP endpoints and
includes can be removed in the same cutover change.
