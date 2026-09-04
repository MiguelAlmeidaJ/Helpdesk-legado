# RD paid report — 0042a

`0042a` introduces a native paid-expense report without cutting over the legacy
administrative edit flow yet.

## Native routes

API:

```text
GET /api/logistics/expenses/admin/report
```

Web:

```text
/logistics/expenses/admin/report
```

The API accepts `startDate`, `endDate`, `userId`, `clientName` and repeated
`categoryId` query parameters. The default period is the current database month.

## Access model

The endpoint requires `logistics.expenses.admin.read`. `system.admin` is treated
as `all`. An `all` grant may filter any collaborator; any narrower scope is
normalized to `own` because RD does not have a reliable sector dimension.

This intentionally replaces the hard-coded user IDs found in `detalharRD.php`
with permission scope. No user ID allowlist is ported.

## Report semantics

For parity with the current PHP report:

- only `running_balance.status = 4` and `aj = 1` are returned;
- the period still filters `date_created`;
- the displayed payment timestamp is `date_updated` (with `date_created` as a
  defensive fallback);
- category names use the historical catalog before `2025-10-01` and
  `categorias_subgrupo` on/after that cutoff.

The difference between filtering by creation date and displaying payment date is
legacy behavior. Changing the business meaning of the report should be a
separate decision, not an incidental migration change.

## Web behavior

The Next.js screen provides native filters, pagination, CSV export and browser
print/Save as PDF. It does not depend on DataTables, JSZip, FPDF or the external
DataTables CDN stack used by the PHP page.

Legacy query names (`date_start`, `date_end`, `user_id`, `cliente_nome` and
`category_id`) are accepted by the Next page so the final bridge can preserve old
bookmarks.

## Not cut over in 0042a

`detalharRD.php`, `editarRDAdm.php`, `buscarRD.php` and `gerarPDF.php` remain in
place during parity testing. The next cut, `0042b`, migrates administrative
adjustments and only then redirects the legacy report entry point.
