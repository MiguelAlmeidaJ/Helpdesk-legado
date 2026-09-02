# Browser write protection

Cookie-authenticated writes are protected by a global NestJS guard.

For POST, PUT, PATCH and DELETE:

- same-origin requests are accepted, preserving Swagger usage;
- requests from configured `WEB_ORIGIN` require `X-Helpdesk-Request: browser`;
- requests without Origin/Referer require the same custom header;
- unconfigured origins are rejected;
- Fetch Metadata (`Sec-Fetch-Site`) is checked for cross-site writes.

The Next.js `apiRequest` helper adds the marker automatically to every unsafe
method. A normal cross-site HTML form cannot create that custom header, and a
cross-site JavaScript request still needs CORS plus an allowed Origin.

The existing native session cookie remains `HttpOnly` and `SameSite=Lax`.
