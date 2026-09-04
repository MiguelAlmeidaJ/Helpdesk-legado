# Migration map

This file is the migration control board. Update it in the same pull request that changes a module's migration phase.

## Phases

- `planned`: mapped at a high level only.
- `inventory`: legacy routes, tables, permissions and integrations are being catalogued.
- `api-read`: read paths available in NestJS.
- `api-write`: write/workflow paths available in NestJS.
- `web`: Next.js UI available.
- `parity`: comparing new behavior with PHP.
- `cutover`: users are directed to the new module.
- `retired`: equivalent PHP entry points can be removed.

## Module map

| Target module | Legacy source | Primary DB | Phase | Notes |
| --- | --- | --- | --- | --- |
| platform | `all`, root bootstrap/config | `nivel3` | inventory | Auth/session/permissions, configuration and technical foundations. |
| tickets | `atd`, `atd_facility`, `atd_projeto`, `atd_3andar`, parts of `atd_mkt` | `nivel3` | web | Read API and first Next.js list UI available; legacy remains authoritative until jobs/detail/workflows reach parity and cutover. |
| assets | `ativos` | `nivel3` | planned | Inventory/assets and related assignments. |
| catalog | `catlg` | `nivel3` | planned | Catalog/service information; ownership must be confirmed during inventory. |
| master-data | `cads` | `nivel3` | planned | Clients, people, locations and generic registrations should later be split only if rules justify it. |
| finance | `cont`, `cads_cont` | `nivel3` | planned | Accounting/receivables/payables grouping to validate during inventory. |
| documents | `docs`, `docs_mkt`, `documentos` | `nivel3` | planned | Consolidate document handling rather than preserving folder variants. |
| logistics | `logistica` | `nivel3` | web | Vehicle agenda, personal RD and the administrative dashboard are native; approval, payment, paid-report and administrative RD editing are in native cutover. Comparative analysis remains legacy. |
| rd | legacy RD flows | `nivel3` | cutover | Personal RD, approval/recusal and payment are native; `0042a` adds the paid report and `0042b` adds secure administrative editing plus cutover of `detalharRD.php`/`gerarPDF.php`. Comparative analysis remains legacy. |
| marketing | legacy marketing/`terc_andar` flows | `nivel3` | planned | No separate `mkt` database. Reassess boundary after ticket/third-floor inventory. |

## Current migration order

The default order is:

1. platform identity/authentication and permission adapter;
2. tickets read model/list/filter;
3. tickets detail and workflow actions;
4. tickets web UI;
5. next module chosen from operational priority and coupling discovered during inventory.

This order may change, but the map must be updated when it does.

## Important legacy convergence

The target architecture intentionally reduces duplicated legacy areas.

For example, multiple atendimento folders represent variants of ticket behavior, queues or areas. Their differences should become filters, policies, permissions or configuration inside the `tickets` context unless inventory proves they are genuinely separate business capabilities.

Likewise, the absence of a separate `mkt` datasource is deliberate: current marketing/third-floor data lives in `nivel3`.
