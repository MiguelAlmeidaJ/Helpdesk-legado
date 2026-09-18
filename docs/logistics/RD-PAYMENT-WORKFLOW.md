# Pagamento nativo de RD

O `0041a` introduziu no NestJS a API do workflow de pagamento. O `0041b`
adicionou a interface Next.js; após a retirada da árvore PHP de logística, esse
é o único fluxo mantido.

## API

```text
GET  /api/logistics/expenses/admin/payments
POST /api/logistics/expenses/admin/payments/:id/pay
POST /api/logistics/expenses/admin/payments/:id/reject
POST /api/logistics/expenses/admin/payments/batch/pay
```

A fila contém somente RDs com `running_balance.status = 2` e `aj = 1`.

Os itens são agrupados como no legado pelo colaborador e pela chave PIX
normalizada. Para tipos PIX `1`, `2` e `4`, caracteres não numéricos são
removidos antes do agrupamento.

## Permissionamento

O workflow usa `logistics.expenses.pay` com escopo `All`.

Na sessão legada ele é concedido somente quando `m9_02 >= 3`, preservando a
regra histórica de acesso. No adapter RBAC o slug explícito é
`logistica.rd.pagar`, com fallback para o nível legado enquanto esse modelo de
permissão permanecer em uso.

A permissão de pagamento é separada de `logistics.expenses.approve`, pois no
modelo legado usuários com nível `2` podem aprovar, enquanto apenas nível `3`
pode registrar pagamento.

## Transições de estado

Somente uma RD em status `2` pode ser alterada:

- pagamento: `2 -> 4`;
- recusa de pagamento: `2 -> 3`.

Nos dois casos são gravados `pagador_id`, `remark_pagador` e `date_updated`.
Quando não há observação explícita, os defaults preservados são
`Pagamento Efetuado` e `Pagamento Recusado`.

## Transação e concorrência

Pagamento individual, recusa e lote usam transação e `SELECT ... FOR UPDATE`.
Se uma RD já deixou o status `2`, a API responde conflito em vez de sobrescrever
o estado atual.

O lote é atômico: se qualquer ID não existir ou não estiver mais aguardando
pagamento, nenhuma RD do lote é atualizada. Isso corrige o comportamento
histórico de atualizações independentes dentro do loop. A interface limita cada
operação em lote a `100` RDs, igual ao contrato da API.

## Dados de aprovação

A fila expõe diretamente `running_balance.remark_aprov`, fonte canônica do
fluxo nativo de aprovação. O aprovador fica registrado em
`running_balance.aprovador_id`.

O schema atual de `nivel3` não possui a tabela `approvement`; por isso a API não
faz consultas nem gravações dependentes dessa tabela.

## Interface e PIX

A tela nativa está em:

```text
/logistics/expenses/admin/payments
```

Ela preserva a operação principal do fluxo histórico:

- agrupamento por colaborador + chave PIX;
- seleção por grupo e por lançamento;
- pagamento individual;
- recusa individual;
- pagamento das RDs selecionadas;
- observação de pagamento por RD, limitada a `255` caracteres;
- paginação de `8` grupos por página;
- visualização da descrição do usuário e da observação do aprovador.

O botão `Pagar PIX` monta o BR Code no próprio navegador com a chave e o total
do grupo e renderiza o QR Code localmente. O payload também é exibido como
`PIX copia e cola`. Nenhum serviço externo recebe chave, valor ou beneficiário
para produzir o QR Code.

O QR Code não efetua pagamento por si só. O pagamento continua acontecendo no
aplicativo bancário e a ação `Compensar como pago` só deve ser usada depois da
confirmação bancária. A compensação reutiliza o endpoint transacional de lote.
Grupos com mais de `100` RDs não oferecem a compensação PIX em uma única
operação, evitando registrar apenas parte de um pagamento de grupo.

## Estado atual

A autorização é aplicada pela sessão nativa e por
`logistics.expenses.pay`. O dashboard `/logistics/expenses/admin` mostra o
atalho `Pagar despesas` apenas para usuários com essa permissão.

Relatório, ajustes administrativos e aprovação também estão no stack nativo.
Não há bridge PHP, helper de PIX legado ou entry point alternativo mantido.
