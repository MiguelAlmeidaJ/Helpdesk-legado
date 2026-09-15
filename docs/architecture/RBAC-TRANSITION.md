# RBAC transition

The existing RBAC is active and must be evolved rather than replaced.

## Audit result

The local production-like dump showed:

```text
usuarios             109
active users          59
active with roles     58
active without role    1
user_roles           338
roles                 25
permissions           70
user_permissions       0
api_sessions          47
```

The PHP login accepts only `usuarios.user_sts = 1`, so the access layer also rejects users whose current database status is not active.

The existing roles are capability bundles such as:

```text
atendimento-operador
atendimento-gestor
cadastros-gestao
logistica-operador
```

They are not the same concept as the new organizational profiles
(System Administrator, Administration, Sector Manager, Quality, Technician,
Intern). Do not overwrite or rename them to force the new model.

## Transition authority

While the PHP login is still in use:

```text
PHPSESSID
   |
   v
PHP session identity
   |
   v
current usuarios.user_sts
   |
   +-- RBAC assignment exists --> roles + permissions + user overrides
   |
   +-- no RBAC assignment -----> legacy user_modulo_XX fallback
```

RBAC is authoritative whenever a user has at least one `user_roles` or
`user_permissions` assignment.

A direct `user_permissions.deny` removes a permission inherited from roles.
A direct `allow` adds it.

## Atendimento mapping

Current database slugs:

```text
atendimentos.visualizar
atendimentos.criar
atendimentos.editar
atendimentos.executar
atendimentos.colocar_espera
atendimentos.recusar
atendimentos.editar_terceiros
```

Target mapping:

```text
visualizar        -> tickets.read / all
criar             -> tickets.create / all
editar            -> tickets.edit + tickets.classify
executar          -> tickets.execute + tickets.close
colocar_espera    -> tickets.hold
recusar           -> tickets.reject
editar_terceiros  -> widens operational scope from own to all
```

`editar_terceiros` is a scope modifier, not a standalone business action.

The old radio flag currently has no RBAC permission slug. It remains a narrowly
documented legacy compatibility grant until an explicit permission is created.

## Organizational roles and sectors

`roleAssignments` remains empty during this stage because capability roles
cannot safely be converted into the new organizational roles or sectors.

The future organizational model is added separately and must not destroy
the existing capability RBAC.

## Session future

`api_sessions` already supports hashed refresh tokens, expiry and revocation.
It should be evaluated as the future Nest authentication session mechanism
before creating any replacement session table.
