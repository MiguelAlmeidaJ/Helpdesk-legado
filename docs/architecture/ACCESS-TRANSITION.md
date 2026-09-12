# Access transition

Authentication and authorization are being migrated independently from the PHP UI.

## Current bridge

The legacy PHP application stores session files under:

```text
storage/sessions/sess_<PHPSESSID>
```

and places the authenticated user plus nine positional permission strings in the PHP session.

The NestJS `access` module can read the same session file. This allows a browser already authenticated in the legacy application to call migrated API routes without a second login.

The bridge is transitional. Business modules must not depend on PHP session keys or `m3_XX` variables directly.

## Semantic permissions

Legacy permission positions are translated at the access boundary.

Example:

```text
legacy m3_02 >= 2
        |
        v
tickets.execute
```

Controllers and use cases use semantic permission names such as:

- `tickets.access`
- `tickets.create`
- `tickets.edit-classification`
- `tickets.execute`
- `tickets.hold`
- `tickets.reject`
- `tickets.manage-others`
- `tickets.radio`

When authorization later moves to `roles`, `permissions`, `user_roles`, `user_permissions` and/or `api_sessions`, feature modules should not need to change.

## Route usage

A protected route should use both authentication and authorization:

```ts
@UseGuards(LegacySessionGuard, PermissionsGuard)
@RequirePermissions(AppPermission.TicketsAccess)
```

The access module exports the guards. Feature modules import `AccessModule` when they start exposing protected routes.

## Current-user probe

During the transition:

```text
GET /api/auth/me
```

reads the PHP session cookie and returns the normalized user plus semantic permissions.

No raw legacy module strings are returned to the frontend.

## Configuration

```dotenv
LEGACY_SESSION_COOKIE=PHPSESSID
LEGACY_SESSION_PATH=./storage/sessions
```

If PHP runs from a different checkout or session directory, point `LEGACY_SESSION_PATH` to that directory.

## Security constraints

- The session id is validated before it is used as a filename.
- The bridge reads only the known scalar identity/permission fields.
- There is no development authentication bypass.
- HTTP permission checks use semantic permissions, not raw module positions.
- The frontend sends cookies with API requests using `credentials: include`.

## Future cutover

Before replacing the bridge, inventory the existing RBAC/session tables and data:

- `api_sessions`
- `permissions`
- `roles`
- `role_permissions`
- `user_roles`
- `user_permissions`

The future authentication implementation may change, but `AuthenticatedUser`, `AppPermission` and feature-level authorization should remain stable.
