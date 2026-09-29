# Browser write protection

Cookie-authenticated writes are protected by a global NestJS guard.

For POST, PUT, PATCH and DELETE:

- same-origin requests are accepted, preserving Swagger usage;
- requests from the comma-separated allowlist in `WEB_ORIGIN` require `X-Helpdesk-Request: browser`;
- requests without Origin/Referer require the same custom header;
- unconfigured origins are rejected;
- Fetch Metadata (`Sec-Fetch-Site`) is checked for cross-site writes.

The Next.js `apiRequest` helper adds the marker automatically to every unsafe
method. A normal cross-site HTML form cannot create that custom header, and a
cross-site JavaScript request still needs CORS plus an allowed Origin.

The existing native session cookie remains `HttpOnly` and `SameSite=Lax`.


## CORS allowlist de produção

A API e o guard de escrita usam a mesma lista normalizada de origens. O padrão do projeto aceita somente:

- `http://localhost:4204`;
- `http://192.168.199.234`;
- `http://192.168.199.234:4204`;
- `https://helpdesk.nivel3ti.com.br`.

A entrada sem porta para o IP cobre acesso por proxy/porta HTTP padrão; a entrada `:4204` cobre acesso direto ao Next.js no servidor. O domínio público deve usar HTTPS.

Para substituir a lista, configure `WEB_ORIGIN` com origens completas separadas por vírgula. A mesma configuração é aplicada ao CORS do NestJS e ao `BrowserWriteGuard`.
