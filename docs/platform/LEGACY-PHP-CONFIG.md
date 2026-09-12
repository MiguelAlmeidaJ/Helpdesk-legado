# Legacy PHP platform/config retirement — 0043a–0043f

## Final state

The historical `all/` directory is retired in `0043f`.

Legacy PHP that has not yet been migrated to Nest/Next may still need temporary
compatibility helpers, but those helpers now live only under `legacy/bridge/`.
No runtime path should include or link to `all/*.php` anymore.

The native application remains authoritative for authentication, authorization
and migrated business workflows. `legacy/bridge/` exists only to keep
still-legacy PHP modules operational while their own migrations are completed.

## Sequence completed

- `0043a` removed hardcoded database credentials from the residual PHP
  connection helper and aligned it with the monorepo `.env` database URLs.
- `0043b` consolidated PHP session/native-session hydration and authenticated
  page compatibility in `legacy/bridge/session.php`.
- `0043c` moved the remaining URL, database, SMTP, permissions, sidebar/loading,
  form-token and password compatibility implementations into `legacy/bridge/`,
  leaving `all/` as shim-only.
- `0043d` completed the canonical bridge aliases and introduced the deterministic
  `legacy:all-audit` gate.
- `0043e` rewrote all executable consumers from `all/*.php` to their canonical
  `legacy/bridge/*.php` equivalents.
- `0043f` removes the 14 historical shims and makes the absence of `all/` part of
  the strict audit contract.

## Canonical bridge surface

The compatibility surface currently contains these historical helpers:

- `app_url.php`;
- `conect.php`;
- `email_smtp.php`;
- `loading.php`;
- `loading_home.php`;
- `native_api_session.php`;
- `permissoes.php`;
- `seguranca.php`;
- `session.php`;
- `sidebar.php`;
- `token.php`;
- `update_pass.php`;
- `update_senha.php`;
- `update_senha_antiga.php`.

These are compatibility files, not a new application layer. As each remaining
PHP module is migrated, its dependency on `legacy/bridge/` should disappear.
Do not introduce new native Nest/Next dependencies on these files.

## Database compatibility

Residual PHP reads the same root environment variables used by the monorepo:

- `NIVEL3_DATABASE_URL`;
- `N3RD_DATABASE_URL`.

`ConnectionMkt()` remains deprecated compatibility only. The native
architecture has no separate `mkt` datasource, so `MKT_DATABASE_URL` must not be
introduced into native code.

Connection failures are logged server-side and return `null`; database exception
details are not rendered into HTTP responses.

## Session/auth compatibility

`legacy/bridge/session.php`:

- configures the transitional PHP session;
- hydrates historical `allterusN3*` values from the native API session when
  necessary;
- redirects unauthenticated legacy pages to the native `/login`;
- respects `LEGACY_SESSION_COOKIE` and `LEGACY_SESSION_PATH`.

The bridge does not replace native authorization. New permissions and migrated
workflows belong in NestJS RBAC/guards.

## Permanent retirement gate

Run:

```bash
pnpm legacy:all-audit -- --strict
```

The command fails when any of these conditions is true:

- the `all/` directory exists;
- a runtime file resolves to one of the historical `all/*.php` paths;
- a canonical `legacy/bridge/*.php` implementation is missing.

A green strict audit is the invariant that prevents `all/` from being
reintroduced after `0043f`.
