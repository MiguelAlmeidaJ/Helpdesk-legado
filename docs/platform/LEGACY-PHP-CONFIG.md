# Legacy PHP platform/config inventory — 0043a/0043b/0043c

## Goal

The `all/` directory is transitional infrastructure. It must disappear, but it
cannot be deleted safely while non-migrated PHP modules still include its
session, permission, navigation and compatibility helpers.

`0043a` starts that retirement by removing hardcoded database configuration from
`all/conect.php`. Residual PHP now consumes the same root `.env` database URLs
used by Prisma/Nest:

- `NIVEL3_DATABASE_URL`;
- `N3RD_DATABASE_URL`.

`ConnectionMkt()` is retained only as a deprecated compatibility entry point.
The native architecture has no separate `mkt` database. `MKT_DATABASE_URL` is
therefore intentionally optional and must not be introduced for native code.

## Current `all/` surface

| File | Current responsibility | Retirement direction |
| --- | --- | --- |
| `app_url.php` | URL and root `.env` compatibility helpers | Keep temporarily for PHP redirect bridges; remove after the last bridge is gone. |
| `conect.php` | PDO compatibility for legacy PHP | `0043a`: shared `.env` URLs; remove after the last direct PHP database consumer. |
| `email_smtp.php` | Legacy SMTP client | Move remaining mail callers to native mail/application services, then delete. |
| `loading.php` | Legacy loading UI | Delete with the PHP page consumers. |
| `loading_home.php` | Legacy home loading UI | Delete with the PHP page consumers. |
| `native_api_session.php` | Compatibility shim to `legacy/bridge/session.php` | Delete after direct legacy includes are removed. |
| `permissoes.php` | Expands legacy module strings into `$mX_YY` globals | Replace remaining authorization with native grants before deletion. |
| `seguranca.php` | Compatibility shim that calls `n3_legacy_require_authenticated()` | Delete after direct legacy includes are removed. |
| `session.php` | Compatibility shim to `legacy/bridge/session.php` | Delete after direct legacy includes are removed. |
| `sidebar.php` | Legacy navigation/UI | Delete as the remaining PHP shells are cut over. |
| `token.php` | Legacy token helper | Audit callers and move required behavior to native auth/security. |
| `update_pass.php` | Legacy password-change UI/action | Cut over to native account/security flow. |
| `update_senha.php` | Legacy password update action | Cut over/tombstone with password flow. |
| `update_senha_antiga.php` | Older password update action | Tombstone/delete after caller audit. |

## Database compatibility contract

`all/conect.php` keeps the existing function names so unrelated legacy PHP does
not need to change in this cut:

```php
ConnectionN3();
ConnectionN3rd();
ConnectionMkt();
```

The first two read the shared monorepo variables. URLs are parsed into PDO MySQL
DSNs at runtime. URL-encoded usernames/passwords are supported, and an optional
`?charset=...` query parameter can override the compatibility default `utf8`.

Connection failures are written to the PHP error log and return `null`; database
exception details are no longer rendered into the HTTP response.

For local backward compatibility only, missing variables fall back to the old
local targets:

- `mysql://root@localhost/nivel3`;
- `mysql://root@localhost/n3rd`;
- `mysql://root@localhost/mkt` for deprecated `ConnectionMkt()`.

Production and shared development environments should always define the root
`.env` URLs explicitly.

## Session/auth compatibility after 0043b

The implementation previously split across `all/session.php`,
`all/native_api_session.php` and `all/seguranca.php` now lives in one temporary
compatibility module: `legacy/bridge/session.php`.

The three `all/` files remain only as thin include shims so still-legacy pages
do not need a mass path rewrite in this cut.

The bridge:

- configures the legacy PHP session;
- hydrates it from the native `API_SESSION_COOKIE` when necessary;
- preserves the historical `allterusN3*` session variables for old PHP;
- performs the authenticated-page redirect to the native `/login`;
- respects `LEGACY_SESSION_COOKIE` and `LEGACY_SESSION_PATH`;
- reuses `allterus_app_url()` instead of maintaining a second URL resolver.

No native Nest/Next code depends on this PHP bridge.

## Shim-only state after 0043c

`0043c` moves the remaining implementation files from `all/` to
`legacy/bridge/`. The historical files are deliberately left in place for one
cut as tiny delegating shims, so modules that have not yet had their include
paths rewritten continue to behave exactly as before.

After this cut:

- every `all/*.php` file is a compatibility shim;
- `legacy/bridge/session.php` depends only on bridge-local `app_url.php` and
  `conect.php`, not back on `all/`;
- legacy permission and form-token helpers start the configured transitional session
  through `legacy/bridge/session.php`;
- the SMTP bridge resolves `config/email_smtp.php` from the repository root;
- password UI/update behavior is preserved unchanged in the bridge; this cut
  relocates it but does not make PHP the authority for native authentication.

The old implementation text intentionally remains unreachable below each shim
until `0043d`; that keeps this patch small and reversible. `0043d` removes the
whole directory after rewriting consumers to `legacy/bridge/`.

## Planned sequence

- `0043a`: shared database configuration + inventory.
- `0043b`: session/auth logic consolidated in `legacy/bridge/session.php`; the
  three historical `all/` files are shims only.
- `0043c`: relocate URL/DB/SMTP/permission/UI/form-token/password compatibility to
  `legacy/bridge/`; every `all/` file becomes shim-only.
- `0043d`: verify zero `require/include` references to `all/` and delete the
  directory.

Before `0043d`, run a repository-wide reference scan. Deleting `all/` is allowed
only when no executable PHP path still requires it.
