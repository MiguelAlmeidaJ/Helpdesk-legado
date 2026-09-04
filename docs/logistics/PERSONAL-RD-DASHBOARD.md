# Painel pessoal de RD

O primeiro corte de RD migra o painel `logistica/rdPainel.php` para NestJS e
Next sem alterar ainda o fluxo de cadastro, edição, anexos, aprovação ou
pagamento de despesas.

## Rotas

```text
GET /api/logistics/expenses/dashboard
GET /api/logistics/expenses/dashboard?startDate=2026-09-01&endDate=2026-09-30
```

A interface Next fica em `/logistics/expenses`.

## Paridade

O painel preserva as consultas legadas:

- `status = 1`: soma total aguardando aprovação, sem filtro de período;
- `status = 2`: soma total aprovado para pagamento, sem filtro de período;
- `status = 4`: soma recebida dentro do período;
- últimos recebimentos: até 10 registros `status = 4`, `aj = 1`, do usuário
  autenticado e dentro do período.

O período padrão continua sendo o mês corrente.

## Permissão

`LogisticsExpensesRead` usa o módulo legado 9, posição 0, nível 1 ou superior,
igual ao gate de `rdPainel.php`.

No RBAC, o slug nativo é `logistica.rd.visualizar`. Durante a transição o
tradutor mantém fallback para o módulo 9 legado.

## Próximos cortes

`logistica/rd.php`, `addDespesa.php`, `editarRD.php`, `excluirRD.php` e
`recebe_upload.php` continuam ativos. Eles serão migrados como uma única fatia
de autosserviço de despesas, incluindo anexos PDF e regras de edição por
status.

Por isso `rdPainel.php` ainda não é removido neste patch. O retirement físico
acontece depois que a tela nativa também conseguir cadastrar e manter despesas.
