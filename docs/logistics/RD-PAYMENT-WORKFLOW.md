# Pagamento nativo de RD

O `0041a` migra para NestJS a API do workflow de pagamento que existia em
`logistica/pagarRD.php`. O `0041b` adiciona a interface Next.js e direciona o
entry point PHP para o fluxo nativo.

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
regra de acesso de `pagarRD.php`. No adapter RBAC o slug explícito é
`logistica.rd.pagar`, com fallback temporário para o nível legado.

A permissão de pagamento é separada de `logistics.expenses.approve`, pois no
legado usuários com nível `2` podem aprovar, enquanto apenas nível `3` pode
registrar pagamento.

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
pagamento, nenhuma RD do lote é atualizada. Isso corrige o comportamento do PHP,
que executa atualizações independentes dentro do loop. A interface limita cada
operação em lote a `100` RDs, igual ao contrato da API.

## Dados de aprovação

A fila expõe diretamente `running_balance.remark_aprov`, que é o campo usado
pelo fluxo legado de pagamento e também passa a ser a fonte canônica do fluxo
nativo de aprovação. O aprovador fica registrado em `running_balance.aprovador_id`.

O schema atual de `nivel3` não possui a tabela `approvement`; por isso a API não
faz consultas nem gravações dependentes dessa tabela.

## Interface e PIX (`0041b`)

A tela nativa está em:

```text
/logistics/expenses/admin/payments
```

Ela preserva a operação principal de `pagarRD.php`:

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

## Cutover

`logistica/pagarRD.php` passa a responder com `302` para
`/logistics/expenses/admin/payments`, usando `all/app_url.php` para respeitar a
URL configurada da aplicação web. A autorização continua sendo aplicada pela
sessão nativa e pela permissão `logistics.expenses.pay`.

O código PHP antigo permanece abaixo do `exit` por enquanto para facilitar
comparação e rollback durante a janela de paridade. Os helpers/CSS legados de
PIX também não são removidos neste corte.

O dashboard `/logistics/expenses/admin` mostra o atalho `Pagar despesas` apenas
para usuários que possuam a permissão de pagamento.

## Fora deste corte

Relatório de RDs e ajustes administrativos continuam legados e serão tratados
nos próximos cortes da migração.
