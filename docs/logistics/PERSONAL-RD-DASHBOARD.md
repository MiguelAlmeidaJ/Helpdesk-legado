# Painel pessoal de RD

O painel pessoal de RD está no stack nativo NestJS/Next. O autosserviço,
os anexos e os workflows administrativos também foram migrados; a antiga
árvore PHP de logística foi removida do repositório.

## Rotas

```text
GET /api/logistics/expenses/dashboard
GET /api/logistics/expenses/dashboard?startDate=2026-09-01&endDate=2026-09-30
```

A interface Next fica em `/logistics/expenses`.

## Paridade

O painel preserva as consultas históricas:

- `status = 1`: soma total aguardando aprovação, sem filtro de período;
- `status = 2`: soma total aprovado para pagamento, sem filtro de período;
- `status = 4`: soma recebida dentro do período;
- últimos recebimentos: até 10 registros `status = 4`, `aj = 1`, do usuário
  autenticado e dentro do período.

O período padrão continua sendo o mês corrente.

## Permissão

`LogisticsExpensesRead` preserva a compatibilidade com o módulo legado 9,
posição 0, nível 1 ou superior.

No RBAC, o slug nativo é `logistica.rd.visualizar`; o tradutor mantém o
fallback para o módulo 9 legado enquanto esse modelo de permissão existir.

## Estado atual

Cadastro, edição, exclusão, duplicação e anexos são atendidos pela interface
`/logistics/expenses/manage` e pelos endpoints nativos de despesas. Não há
bridge PHP ou entry point de logística mantido para esse fluxo.
