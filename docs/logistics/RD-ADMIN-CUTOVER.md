# RD administrative cutover — 0042d

## Final state

`0042d` completed the administrative RD cutover. The native application is
authoritative for the complete RD lifecycle:

- personal RD CRUD;
- approval and rejection;
- payment and payment rejection;
- administrative dashboard and expandable summaries;
- paid-expense report and CSV/print output;
- secure administrative correction of paid RDs;
- comparative analysis.

The native administrative shell is `/logistics/expenses/admin`.

## Native entry points

The supported administrative routes are:

| Flow | Native route |
| --- | --- |
| Dashboard | `/logistics/expenses/admin` |
| Approvals | `/logistics/expenses/admin/approvals` |
| Payments | `/logistics/expenses/admin/payments` |
| Paid report | `/logistics/expenses/admin/report` |
| Comparative analysis | `/logistics/expenses/admin/analysis` |

The Next.js dashboard still accepts the historical `data_inicio`, `data_fim`
and `status` query names where compatibility with old bookmarks is useful.
There is no PHP redirect or tombstone layer.

## Security authority

Authorization is enforced by the native API with `LegacySessionGuard`,
`PermissionsGuard` and the relevant `AppPermission`.

Administrative read/report/analysis behavior uses
`LogisticsExpensesAdminRead`; approval uses `LogisticsExpensesApprove`;
payment uses `LogisticsExpensesPay`; administrative corrections use the
dedicated administrative-management permission introduced by `0042b`.

Personal attachment access remains owner-scoped. Administrative attachment
access is exposed only through its dedicated protected administrative endpoint.

## Legacy retirement

The legacy logistics PHP tree was physically removed after the native expense
and vehicle flows reached parity. Old administrative AJAX handlers, redirect
bridges and tombstones are no longer part of the runtime or repository.

Status, scope and concurrency checks now have a single authority: the native
NestJS application.
