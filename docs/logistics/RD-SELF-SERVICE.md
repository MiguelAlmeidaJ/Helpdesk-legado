# Autosserviço nativo de RD

O `0038` migrou o fluxo pessoal de RD para NestJS/Next. O autosserviço nativo
é hoje a implementação mantida.

## Interface

```text
/logistics/expenses
/logistics/expenses/manage
```

O painel de resumo fica em `/logistics/expenses`. O CRUD fica em
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
usa `<repo>/uploads_rd`.

## Hardening intencional

A implementação histórica confiava no `id` recebido pelo formulário em
operações de edição/exclusão. A implementação nativa exige simultaneamente:

- usuário autenticado igual ao `running_balance.user_id`;
- `status = 1`.

Isso corrige acesso horizontal por ID sem alterar a regra funcional da tela.

## Estado atual

O runtime PHP de autosserviço e seus antigos writers, uploads, bridges e CSS
foram removidos. O painel e o CRUD são atendidos diretamente pelas rotas Next e
pela API nativa, sem camada de redirecionamento.

A leitura de comprovantes nativos exige que `running_balance.user_id` seja o
usuário autenticado, preservando o escopo `Own` da permissão de RD.

Os fluxos administrativos de aprovação, pagamento, relatório, análise e
ajustes também estão no stack nativo.
