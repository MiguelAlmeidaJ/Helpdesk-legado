# Painel administrativo nativo de RD

O `0039a` abre o read model administrativo do RD em NestJS sem mover ainda os
workflows financeiros do PHP.

## API

```text
GET /api/logistics/expenses/admin/summary
GET /api/logistics/expenses/admin/details
```

O resumo aceita `startDate`, `endDate` e `status`. Os status preservados do
painel legado são:

- `1`: aguardando aprovação;
- `2`: aprovadas aguardando pagamento;
- `4`: pagas.

Sem período informado, o mês corrente é usado. O endpoint de detalhes aceita
os mesmos filtros e `group=category|client|collaborator` mais a chave do
agrupamento.

## Permissionamento

A leitura administrativa usa a permissão de aplicação
`logistics.expenses.admin.read` com escopo `All`.

Na sessão legada ela é concedida quando `m9_02 >= 2`, exatamente como a porta
de entrada de `logistica/gestaoRD.php`. No adapter RBAC o slug explícito é
`logistica.rd.admin.visualizar`, mantendo o fallback para `m9_02` durante a
transição.

Isso separa a leitura global do painel das permissões pessoais
`logistics.expenses.read/manage`, que permanecem com escopo `Own`.

## Regras preservadas

- somente linhas com `running_balance.aj = 1` entram nos cálculos;
- os cards globais de aguardando aprovação e aprovadas não usam o filtro de
  período, como no painel PHP;
- os totais do período usam `date_created`;
- o resumo por categoria mantém o corte histórico em `2025-10-01`:
  `category` antes da data e `categorias_subgrupo` a partir dela;
- no catálogo novo entram categorias com `aplicavel IN ('Ambos', 'RD')`;
- os agrupamentos por cliente e colaborador seguem `running_balance.cliente`
  e `running_balance.user_id`.

O detalhamento por categoria mantém a resolução das duas tabelas usada pelo
AJAX legado para permitir comparação de paridade durante este corte.

## Hardening

`logistica/buscar_detalhesRD.php` não repetia a checagem de permissão de
`gestaoRD.php`. Os dois endpoints nativos exigem explicitamente
`LogisticsExpensesAdminRead`, evitando que o endpoint de detalhes seja usado
como bypass da tela administrativa.

## Fora do corte

Continuam no legado nesta etapa:

- aprovação e recusa (`aprovarRD.php`);
- pagamento (`pagarRD.php`);
- relatório/PDF (`detalharRD.php`, `gerarPDF.php`);
- edição administrativa e demais ajustes gerenciais.

Não há cutover de `gestaoRD.php` no `0039a`. O próximo corte pode construir a
UI nativa sobre este read model antes de migrar os workflows de escrita.

## Web (`0039b`)

O painel administrativo passa a ter a rota nativa:

```text
/logistics/expenses/admin
```

A tela consome exclusivamente os endpoints do `0039a` e preserva a leitura do
painel legado com:

- filtro por período;
- alternância entre status `1`, `2` e `4`;
- cards de aguardando aprovação, aprovadas e pagas;
- resumos por categoria, cliente e colaborador;
- expansão sob demanda dos detalhes de cada agrupamento.

O item `Gestão RDs` fica disponível na navegação nativa. A página faz uma
checagem inicial de `LogisticsExpensesAdminRead` (ou `SystemAdmin`) e a API
continua sendo a autoridade de autorização para todas as leituras.

O `0039b` ainda não redireciona `gestaoRD.php`: aprovação, pagamento,
relatórios e ajustes administrativos permanecem no PHP até os próximos cortes.
