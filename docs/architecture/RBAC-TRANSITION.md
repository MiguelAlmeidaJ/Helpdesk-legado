# RBAC authority

RBAC is the only authorization source for the native Helpdesk.

## Source of truth

Runtime authorization is derived exclusively from:

```text
roles
permissions
role_permissions
user_roles
user_permissions
```

The positional columns `usuarios.user_modulo_01` through
`usuarios.user_modulo_09` are no longer consulted to grant access.

The PHP session may still be accepted temporarily as an authentication/identity
source, but values carried in that session do not grant permissions.

## One-time migration

`pnpm access:bootstrap` seeds the canonical permission catalog and performs a
single compatibility migration from the old positional values to explicit RBAC
`user_permissions` grants.

The migration is recorded in `access_migrations` with key
`rbac-only-permissions-v1`. Once recorded, later changes to
`user_modulo_XX` never recreate or change RBAC permissions.

Direct `user_permissions.deny` entries keep precedence over inherited role
permissions and over migrated allows.

## Canonical permissions

The database keeps business-facing permission slugs in Portuguese, including:

```text
usuarios.*
atendimentos.*
devops.atendimentos.*
marketing.atendimentos.*
cadastros.*
catalogos.*
logistica.*
qualidade.*
```

The API translates these canonical slugs to `AppPermission` values consumed by
guards and application services.

DevOps and Marketing have their own RBAC permissions. They no longer derive
authorization from `user_modulo_05` or `user_modulo_08`.

## System administrator and plantão

The protected `system-admin` role still grants the implicit
`AppPermission.SystemAdmin` bypass.

Plantão remains a dynamic RBAC extension based on the active on-call schedule.
It does not restore positional legacy permissions.

## Operational rule

After the cutover:

1. permission changes must be made in RBAC;
2. editing `user_modulo_XX` has no authorization effect;
3. menu visibility and API guards must be driven by the same RBAC grants;
4. new modules must add explicit permission slugs instead of positional flags.
