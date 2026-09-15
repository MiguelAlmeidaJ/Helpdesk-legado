# Retirada do shell PHP

O dashboard e o domínio `atd/` já foram aposentados, mas o shell PHP ainda é
necessário enquanto módulos legados continuam ativos.

## Por que o shell ainda existe

As páginas PHP passam por `all/seguranca.php`. Quando o usuário entrou pelo
Next/Nest, `all/native_api_session.php` valida o cookie de `api_sessions` e
hidrata as variáveis `$_SESSION` esperadas pelos módulos legados.

`logout.php` também permanece enquanto houver páginas PHP: ele revoga a sessão
nativa, destrói a sessão PHP e redireciona para `/login`.

Remover esses arquivos antes do último domínio PHP quebraria a estratégia
strangler.

## Auditoria

Execute:

```bash
pnpm legacy:shell-audit
```

A auditoria lista consumidores de:

- `home.php`, `index.php` e `logout.php`;
- `all/sidebar.php`;
- `all/seguranca.php`, `all/native_api_session.php` e `all/session.php`;
- `all/permissoes.php`;
- `all/conect.php`;
- `all/app_url.php`.

No final, os consumidores são agrupados pelo primeiro diretório do repositório.
Esse ranking serve para escolher o próximo domínio de migração pelo maior
impacto na retirada do shell.

## Gate final

A ponte de autenticação só pode ser removida quando a auditoria mostrar
`READY-AUTH`. `home.php`, `index.php` e `logout.php` saem depois que nenhum
módulo PHP restante depender dessas URLs.
