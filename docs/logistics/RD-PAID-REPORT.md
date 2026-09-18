# RD paid report — 0042a / 0042b

`0042a` introduced the native paid-expense report. `0042b` completed the
administrative edit flow and the Next.js cutover.

## Native routes

API:

```text
GET   /api/logistics/expenses/admin/report
GET   /api/logistics/expenses/admin/report/:id/edit
PATCH /api/logistics/expenses/admin/report/:id
```

Web:

```text
/logistics/expenses/admin/report
```

The report API accepts `startDate`, `endDate`, `userId`, `clientName` and
repeated `categoryId` query parameters. The default period is the current
database month.

## Access model

The report requires `logistics.expenses.admin.read`. `system.admin` is treated
as `all`. An `all` grant may filter any collaborator; any narrower scope is
normalized to `own` because RD does not have a reliable sector dimension.

Administrative editing is deliberately separate and requires
`logistics.expenses.admin.manage`. The legacy permission adapter grants it when
`m9_02 >= 2`, while RBAC can use `logistica.rd.admin.gerenciar`.

The native policy replaced the hard-coded user ID allowlist from the historical
implementation with explicit permissions.

## Report semantics

For parity with the historical report:

- only `running_balance.status = 4` and `aj = 1` are returned;
- the period still filters `date_created`;
- the displayed payment timestamp is `date_updated` (with `date_created` as a
  defensive fallback);
- category names use the historical catalog before `2025-10-01` and
  `categorias_subgrupo` on/after that cutoff.

The difference between filtering by creation date and displaying payment date is
historical behavior. Changing the business meaning of the report should be a
separate decision, not an incidental migration change.

## Administrative edit rules

The edit endpoint loads and locks only active paid RDs. The write is rejected if
the record is no longer `status = 4` or `aj = 1`.

Editable fields are:

- amount;
- category;
- client;
- PIX type/key;
- remarks.

The payment status, payer and payment timestamp are not changed. In particular,
the update intentionally does **not** write `date_updated`, because that field is
currently used as the payment timestamp in the report.

Category validation follows the record's original catalog epoch: records before
`2025-10-01` keep using `category`, while newer records use
`categorias_subgrupo`. This avoids assigning a current category ID to a legacy
record and then rendering it through the wrong catalog.

## Web behavior

The Next.js screen provides native filters, pagination, CSV export, browser
print/Save as PDF and an edit action for users with
`logistics.expenses.admin.manage`.

Historical query names (`date_start`, `date_end`, `user_id`, `cliente_nome` and
`category_id`) are accepted by the Next page so existing bookmarks can keep
their initial filters.

## Final cutover

The native report and API are authoritative. Browser print/Save as PDF replaces
the historical server-side PDF entry point, and administrative editing uses only
the protected native endpoints.

The old PHP report, editor handlers, redirects and tombstones were physically
removed with the legacy logistics tree.
