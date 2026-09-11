# RD comparative analysis — 0042c

## Scope

`0042c` introduced the native administrative comparative analysis.

Native routes:

- Web: `/logistics/expenses/admin/analysis`
- API: `GET /api/logistics/expenses/admin/analysis`

The endpoint requires `AppPermission.LogisticsExpensesAdminRead` and keeps the
same `PermissionScope` behavior used by the administrative paid report.
`SystemAdmin` receives `All`; a restricted native grant remains limited to
`Own`.

## Comparison semantics

The API compares only active paid expenses (`running_balance.status = 4` and
`aj = 1`) using `date_created`, matching the historical report period basis.

Defaults are the previous calendar month as Period 1 and the current calendar
month as Period 2. When the submitted periods are reversed, the API orders them
chronologically, preserving the historical behavior.

Variation follows the historical rule:

- previous amount greater than zero: `(current - previous) / previous * 100`;
- previous amount zero and current amount greater than zero: `100%`;
- both zero: `0%`.

Categories use the project-wide catalog cutoff of `2025-10-01`: rows before the
cutoff resolve through `category`, and rows from the cutoff onward resolve
through `categorias_subgrupo`.

The native comparison intentionally includes expenses without a client under
`Sem cliente`. This fixes a historical inconsistency where the headline total
was calculated from the client breakdown and could omit paid expenses with an
empty client.

## Web behavior

The page exposes:

- two editable date periods;
- the same alert thresholds used by the historical screen;
- total for each period;
- general percentage variation and absolute difference;
- comparison by category;
- comparison by client.

Highlighting remains compatible with the historical UI: only positive variation
at or above the selected threshold is highlighted.

## Final cutover

The native page is the only supported entry point. It still accepts the
historical query names (`date_start_1`, `date_end_1`, `date_start_2`,
`date_end_2`, `percent_alert`) where bookmark compatibility is useful.

The legacy PHP implementation and its redirect bridge were physically removed.
