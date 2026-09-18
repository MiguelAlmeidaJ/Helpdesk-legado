# Authentication transition

The application now accepts two browser authentication mechanisms.

## Native API session

`POST /api/auth/login` validates the same active `usuarios` record used by the
legacy PHP login.

Current PHP password creation uses:

```php
password_hash($password, PASSWORD_DEFAULT)
```

The current stored bcrypt format is verified by the API and a cryptographically
random opaque token is created.

Only the SHA-256 hash of that token is stored in the existing `api_sessions`
table.

Browser cookie:

```text
HELPDESK_SESSION
```

The cookie is HttpOnly, SameSite=Lax and can be marked Secure through
`SESSION_COOKIE_SECURE=true`.

## Legacy fallback

Existing `PHPSESSID` sessions remain accepted while PHP modules still exist.

Authentication resolution order:

```text
HELPDESK_SESSION
  -> api_sessions
  -> usuarios + RBAC

otherwise

PHPSESSID
  -> legacy session file
  -> usuarios + RBAC / legacy permission fallback
```

The native session always has priority when both cookies exist.

## Web route protection

The Next.js `/tickets` page performs a server-side call to `/api/auth/me`
before rendering.

An unauthenticated request is redirected to:

```text
/login?next=/tickets
```

This means the route itself is protected; it no longer renders the operational
screen and waits for the client-side data request to fail.

## Logout

`POST /api/auth/logout` revokes the native session when present and clears both
the native and legacy browser cookies.

The legacy session file may remain on disk until PHP's own cleanup runs, but it
can no longer be referenced by that browser after the cookie is removed.

## Next steps

Before retiring the PHP login completely:

- validate active password hashes against the native login;
- migrate password recovery;
- migrate password-change flow;
- remove the PHP-session fallback only after all remaining PHP modules are
  retired or use the new identity mechanism.
