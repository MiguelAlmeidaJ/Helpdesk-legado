# RD administrative cutover — 0042d

## Final state

`0042d` completes the administrative RD cutover. The native application is now
authoritative for the complete RD lifecycle:

- personal RD CRUD;
- approval and rejection;
- payment and payment rejection;
- administrative dashboard and expandable summaries;
- paid-expense report and CSV/print output;
- secure administrative correction of paid RDs;
- comparative analysis.

The native administrative shell is `/logistics/expenses/admin`.

## Legacy entry points

The remaining PHP entry points are compatibility surfaces only:

| Legacy path | Native destination / behavior |
| --- | --- |
| `gestaoRD.php` | `302` to `/logistics/expenses/admin` |
| `aprovarRD.php` | `302` to `/logistics/expenses/admin/approvals` |
| `pagarRD.php` | `302` to `/logistics/expenses/admin/payments` |
| `detalharRD.php` | `302` to `/logistics/expenses/admin/report` |
| `gerarPDF.php` | `302` to `/logistics/expenses/admin/report` |
| `analiseRD.php` | `302` to `/logistics/expenses/admin/analysis` |
| `buscarRD.php` | `410 Gone` |
| `editarRDAdm.php` | `410 Gone` |
| `buscar_detalhesRD.php` | `410 Gone` |

`gestaoRD.php` forwards its query string. The Next.js dashboard accepts both
native filter names and the historical `data_inicio`, `data_fim` and `status`
parameters so old bookmarks keep their initial period/status selection.

## Security authority

The PHP compatibility layer does not execute RD reads or writes. Authorization
is enforced by the native API with `LegacySessionGuard`, `PermissionsGuard` and
the relevant `AppPermission`.

Administrative read/report/analysis behavior uses
`LogisticsExpensesAdminRead`; approval uses `LogisticsExpensesApprove`;
payment uses `LogisticsExpensesPay`; administrative corrections use the
dedicated administrative-management permission introduced by `0042b`.

Personal attachment access remains owner-scoped. Administrative attachment
access is exposed only through its dedicated protected administrative endpoint.

## Retired AJAX

`buscar_detalhesRD.php` previously duplicated the dashboard detail query and did
not load the project security/permission bootstrap. It is retired with `410`
because the native dashboard already uses the protected
`GET /api/logistics/expenses/admin/details` endpoint.

The older administrative lookup/update endpoints are also tombstoned, so stale
clients cannot bypass the native status, scope and concurrency checks.

## Mechanical cleanup — 0044a

The first logistics cleanup pass removes unreachable historical bodies from the
smallest compatibility surfaces without changing their observable behavior:

- `buscarRD.php` remains `410 Gone`;
- `buscar_detalhesRD.php` remains `410 Gone`;
- `editarRDAdm.php` remains `410 Gone`;
- `gerarPDF.php` remains a `302` bridge to the native administrative report.

This establishes the rule for the remaining RD cleanup: a PHP file may only be
reduced to a bridge/tombstone when an unconditional redirect/`410` followed by
`exit` already makes the legacy body unreachable.

The following files are **not** covered by this mechanical cleanup because they
still execute legacy PHP and database access and therefore require a separate
parity/retirement proof:

- `pagarRD2.php`;
- `pagarRD3.php`;
- `gestaoDadosRD.php`;
- `rdAjuste.php`;
- `detalharRD_subir.php`.

The larger compatibility entry points (`gestaoRD.php`, `aprovarRD.php`,
`pagarRD.php`, `detalharRD.php` and `analiseRD.php`) already redirect before
their historical bodies. They can be reduced in a follow-up mechanical patch
after this smaller slice is validated.
