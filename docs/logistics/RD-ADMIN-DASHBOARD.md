# Painel administrativo nativo de RD

O `0039a` introduziu o read model administrativo do RD em NestJS. Os workflows
financeiros e a interface administrativa foram migrados nos cortes seguintes,
e a árvore PHP de logística foi posteriormente removida.

## API

```text
GET /api/logistics/expenses/admin/summary
GET /api/logistics/expenses/admin/details
```

O resumo aceita `startDate`, `endDate` e `status`. Os status preservados do
painel histórico são:

- `1`: aguardando aprovação;
- `2`: aprovadas aguardando pagamento;
- `4`: pagas.

Sem período informado, o mês corrente é usado. O endpoint de detalhes aceita
os mesmos filtros e `group=category|client|collaborator` mais a chave do
agrupamento.

## Permissionamento

A leitura administrativa usa a permissão de aplicação
`logistics.expenses.admin.read` com escopo `All`.

Na sessão legada ela é concedida quando `m9_02 >= 2`, preservando a regra
histórica de acesso. No adapter RBAC o slug explícito é
`logistica.rd.admin.visualizar`, com fallback para `m9_02` enquanto a
compatibilidade de permissões legadas for necessária.

Isso separa a leitura global do painel das permissões pessoais
`logistics.expenses.read/manage`, que permanecem com escopo `Own`.

## Regras preservadas

- somente linhas com `running_balance.aj = 1` entram nos cálculos;
- os cards globais de aguardando aprovação e aprovadas não usam o filtro de
  período, como no painel histórico;
- os totais do período usam `date_created`;
- o resumo por categoria mantém o corte histórico em `2025-10-01`:
  `category` antes da data e `categorias_subgrupo` a partir dela;
- no catálogo novo entram categorias com `aplicavel IN ('Ambos', 'RD')`;
- os agrupamentos por cliente e colaborador seguem `running_balance.cliente`
  e `running_balance.user_id`.

O detalhamento por categoria mantém a resolução das duas tabelas usada pelo
fluxo histórico para preservar a paridade dos dados.

## Hardening

O endpoint PHP histórico de detalhes não repetia a checagem de permissão do
painel administrativo. Os dois endpoints nativos exigem explicitamente
`LogisticsExpensesAdminRead`, evitando que o detalhamento seja usado como
bypass da autorização administrativa.

## Web

O painel administrativo está disponível em:

```text
/logistics/expenses/admin
```

A tela consome exclusivamente os endpoints nativos e oferece:

- filtro por período;
- alternância entre status `1`, `2` e `4`;
- cards de aguardando aprovação, aprovadas e pagas;
- resumos por categoria, cliente e colaborador;
- expansão sob demanda dos detalhes de cada agrupamento.

O item `Gestão RDs` fica disponível na navegação nativa. A página faz uma
checagem inicial de `LogisticsExpensesAdminRead` (ou `SystemAdmin`) e a API
continua sendo a autoridade de autorização para todas as leituras.

Aprovação, pagamento, relatórios, análise comparativa e ajustes administrativos
também possuem fluxos nativos. Não há entry point PHP mantido para o painel.
