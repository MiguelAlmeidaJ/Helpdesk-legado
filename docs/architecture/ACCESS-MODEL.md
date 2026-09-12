# Access model

Authorization is modeled independently from legacy numeric user types.

## Dimensions

```text
user
  |
  +--> role assignment
  |      +--> role
  |      +--> sector(s)
  |
  +--> effective permission grants
         +--> permission
         +--> scope
         +--> sector(s), when applicable
```

## Roles

Initial roles:

- `system_administrator`: Administrador do sistema
- `administration`: Administração
- `sector_manager`: Gerente de setor
- `quality`: Qualidade
- `technician`: Técnico
- `intern`: Estagiário

Roles are not a rigid hierarchy. Feature code must authorize by permission grant rather than role name.

A user may eventually hold multiple role assignments, for example:

```text
Gerente de setor -> TI
Técnico          -> Cyber
```

## Sectors

Initial sectors:

- `it`: TI
- `devops`: DevOps
- `marketing`: Marketing
- `commercial`: Comercial
- `cyber`: Cyber

Roles and sectors are independent.

`Administração` is a role, not a sector. HR and Accounting are administrative responsibility domains initially. If they later require operational sector semantics, sectors can be added without creating new roles.

## Scopes

Permission grants use one of three scopes:

- `own`: resources owned by or assigned to the current user;
- `sector`: resources belonging to explicitly assigned sectors;
- `all`: resources across every sector.

Examples:

```text
tickets.execute / own
tickets.read    / sector(TI, DevOps)
tickets.audit   / all
```

## Role intent

The exact permission matrix is refined per module.

Typical intent:

- Administrador do sistema: `system.admin / all`.
- Administração: explicit administrative permissions such as users, finance and commercial administration.
- Gerente de setor: operational permissions scoped to assigned sectors.
- Qualidade: broad read/audit permissions without automatic operational mutation.
- Técnico: sector visibility with operational actions normally scoped to own work.
- Estagiário: smallest explicit operational surface.

## Business-code rule

Bad:

```ts
if (user.role === UserRole.SectorManager) {
  // allow
}
```

Good:

```ts
authorize(user, {
  permission: AppPermission.TicketsExecute,
  ownerId: ticket.technicianId,
  sector: ticket.sector,
});
```

Roles provide/manage default grants. Modules consume grants.

## Legacy transition

The PHP session currently exposes identity plus `user_modulo_01` through `user_modulo_09`.

The transitional adapter converts those positional flags into semantic grants. It deliberately does not guess new roles or sectors from:

- `tipo_usuario`
- `user_funcao`
- module strings

Therefore users authenticated through the PHP bridge initially return an empty `roleAssignments` array while retaining permissions translated from the legacy flags.

For Atendimento, the old `m3_05` manager capability is represented by widening relevant grants from `own` to `all`.

The legacy format remains an authentication/authorization input, never the language used by business modules.

## Database evolution

The current database already contains the RBAC foundation:

```text
roles
permissions
role_permissions
user_roles
user_permissions
```

Before changing schema, inventory the actual data and existing usage.

The later target should support:

```text
sectors
user sector membership
role assignments with sector context
permission grants with own/sector/all scope
user allow/deny overrides
```

Do not run a production Prisma migration for this model until the existing RBAC data has been audited and the migration/baseline plan reviewed.
