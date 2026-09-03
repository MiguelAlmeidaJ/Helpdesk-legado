# Dashboard operacional

O `/dashboard` Next substitui o ranking que ainda era renderizado por `home.php`.

## Endpoint

```text
GET /api/dashboard
GET /api/dashboard?startDate=2026-09-01&endDate=2026-09-30
```

A API exige uma sessão autenticada. O ranking é retornado somente quando
`usuarios.tipo_usuario = 1`, preservando o comportamento do dashboard PHP.

## Ranking do período

A migração preserva as consultas legadas:

- TI: atendimentos finalizados/concluídos, técnicos das funções 1, 2, 4, 5 e 6;
- DevOps: soma atendimentos e tarefas finalizados/concluídos, funções 9 a 14;
- MKT: tarefas de `tarefas_terc_andar` finalizadas/concluídas;
- QA: interações de abertura (`inter_tipo = 1`) em `interatividade` e
  `inter_tarefa`.

No DevOps, atendimentos usam a data de abertura e tarefas usam a data de
fechamento, como no PHP.

## Pódio trimestral

O pódio continua fixado no trimestre corrente e retorna os três primeiros de
TI, DevOps, MKT e QA. As diferenças de função do SQL trimestral legado são
mantidas para evitar alterar o ranking durante o corte.

## Transição PHP

`home.php` deixa de executar o dashboard PHP e passa a ser apenas um redirect
para `/dashboard`. O sidebar PHP também aponta diretamente para a rota Next.

Os arquivos em `home/partials/dashboard/` ficam temporariamente preservados
para rollback até o smoke test do novo painel. Depois do teste, podem ser
apagados junto dos estilos exclusivos em `home/css/`.
