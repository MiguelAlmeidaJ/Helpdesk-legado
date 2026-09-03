# Autosserviço nativo de RD

O `0038` migra o fluxo pessoal de `logistica/rd.php` para NestJS/Next.

## Interface

```text
/logistics/expenses
/logistics/expenses/manage
```

O painel de resumo continua em `/logistics/expenses`. O CRUD fica em
`/logistics/expenses/manage`.

## API

```text
GET    /api/logistics/expenses
POST   /api/logistics/expenses
PATCH  /api/logistics/expenses/:id
DELETE /api/logistics/expenses/:id

POST   /api/logistics/expenses/:id/attachments
DELETE /api/logistics/expenses/:id/attachments/:key
GET    /api/logistics/expenses/:id/attachments/:key/content
```

## Regras preservadas

- criação sempre inicia com `status = 1`;
- período padrão é o mês corrente;
- categorias vêm de `categorias_subgrupo` com `aplicavel IN ('Ambos', 'RD')`;
- clientes vêm de `clientes`;
- tipos de chave vêm de `type_keys`;
- PIX padrão vem de `usuarios.chavepix`;
- descrição remove o `<p>...</p>` externo usado por dados antigos;
- edição e exclusão deixam de existir assim que a despesa sai do status 1;
- duplicar reaproveita os campos da despesa e cria um novo registro no status 1;
- categoria 43 continua exibindo alerta visual quando não há comprovante.

Os anexos antigos em `running_balance.anexos` continuam legíveis. Novos
comprovantes são PDFs armazenados sob `uploads_rd/native/`, com no máximo
25 MB e validação tanto do MIME quanto da assinatura `%PDF-`.

`RD_UPLOAD_DIR` pode sobrescrever o diretório físico. Sem configuração, a API
usa `<repo>/uploads_rd`, compatível com o diretório legado.

## Hardening intencional

Os PHPs antigos confiavam no `id` recebido pelo formulário em operações de
edição/exclusão. A implementação nativa exige simultaneamente:

- usuário autenticado igual ao `running_balance.user_id`;
- `status = 1`.

Isso corrige acesso horizontal por ID sem alterar a regra funcional da tela.

## Retirada do autosserviço PHP

O corte `0038b` aposenta o runtime de autosserviço depois do smoke nativo.
Os deep links passam a ser bridges mínimos:

- `logistica/rdPainel.php` -> `/logistics/expenses`;
- `logistica/rd.php` -> `/logistics/expenses/manage`;
- `logistica/rd3.php` -> `/logistics/expenses/manage`;
- `logistica/rd_subistituido.php` -> `/logistics/expenses/manage`.

Foram removidos os writers/upload exclusivos do autosserviço:

- `logistica/addDespesa.php`;
- `logistica/editarRD.php`;
- `logistica/excluirRD.php`;
- `logistica/recebe_upload.php`.

Os CSS `logistica/css/rd_modern.css` e
`logistica/css/rd_painel_modern.css` também foram removidos por não terem
mais consumidores. O menu PHP de Logística aponta diretamente para o painel
Next.

Os fluxos administrativos de RD continuam no legado nesta etapa, incluindo
`gestaoRD.php`, `aprovarRD.php`, `pagarRD.php`, `analiseRD.php`,
`detalharRD.php` e o fluxo gerencial de ajustes.

O mesmo corte endurece a leitura de comprovantes nativos: o download agora
exige que `running_balance.user_id` seja o usuário autenticado, preservando
o escopo `Own` da permissão de RD.
