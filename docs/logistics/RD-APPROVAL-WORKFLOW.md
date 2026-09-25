# Aprovação nativa de RD

O `0040a` introduziu no NestJS o workflow transacional de aprovação e recusa.
O `0040b` conectou a interface Next, e o fluxo nativo passou a ser a única
implementação mantida após a retirada da árvore PHP de logística.

## API

```text
GET  /api/logistics/expenses/admin/approvals
POST /api/logistics/expenses/admin/approvals/:id/approve
POST /api/logistics/expenses/admin/approvals/:id/reject
POST /api/logistics/expenses/admin/approvals/batch/approve
```

A fila retorna somente `running_balance.status = 1` e `aj = 1`, em ordem da
despesa mais antiga para a mais nova.

## Permissionamento

O workflow usa `logistics.expenses.approve` com escopo `All`.

Na sessão legada, a permissão é concedida quando `m9_02 >= 2`, preservando a
regra histórica de aprovação. No adapter RBAC o slug é
`logistica.rd.aprovar`, com fallback para o nível legado enquanto esse modelo
de permissão permanecer em uso.

## Transação e concorrência

A aprovação individual e em lote usa transação e `SELECT ... FOR UPDATE`.
Somente uma despesa ainda em status `1` pode ser alterada. Se outro processo já
a aprovou, recusou ou pagou, a API devolve conflito em vez de sobrescrever o
estado atual.

A aprovação em lote é atômica: se qualquer ID não existir ou já não estiver
pendente, nenhuma das despesas do lote é aprovada.

Ao aprovar:

1. `running_balance.status` passa de `1` para `2`;
2. `date_updated` recebe `NOW()`;
3. `aprovador_id` recebe o usuário autenticado;
4. `remark_aprov` recebe a observação da aprovação (máximo de 255 caracteres).

A persistência usa os campos administrativos já existentes em `running_balance`.
A tabela `approvement` referenciada por uma versão histórica do fluxo não existe
no schema atual de `nivel3`, portanto o fluxo nativo não depende dela.

A recusa preserva o comportamento histórico e move o status de `1` para `3`,
sem inventar um registro de auditoria separado que não existe no banco atual.

## Categoria e comprovante

A fila padroniza a troca de catálogo na mesma data do painel administrativo:
`2025-10-01`. Antes disso usa `category`; a partir da data usa
`categorias_subgrupo` com `aplicavel IN ('Ambos', 'RD')`.

A categoria `43` continua sinalizando `receiptRequiredMissing` quando não há
anexo. A fila expõe os metadados dos anexos para a UI nativa.

## E-mail

Após o commit da aprovação, a API pode enviar o aviso de despesas aprovadas
usando a infraestrutura SMTP do monorepo. O envio não participa da transação:
uma falha de SMTP é registrada no log, mas não desfaz uma aprovação já
confirmada no banco.

O envio fica desligado por padrão. Para habilitar:

```dotenv
RD_APPROVAL_EMAIL_ENABLED=true
RD_APPROVAL_EMAIL_RECIPIENTS=destinatario1@empresa.com,destinatario2@empresa.com
```

Sem `RD_APPROVAL_EMAIL_RECIPIENTS`, o adapter mantém os destinatários
históricos configurados na implementação migrada. `SMTP_HOST`, `SMTP_FROM` e
demais variáveis SMTP continuam sendo compartilhadas com as notificações do
Helpdesk.

## Web e estado atual

A fila de aprovação está em:

```text
/logistics/expenses/admin/approvals
```

A tela permite aprovação individual, recusa e aprovação em lote de até 100
RDs por operação. O lote usa a transação atômica entregue no `0040a`.

Os comprovantes são abertos por um proxy Next e por um endpoint administrativo
protegido por `LogisticsExpensesApprove`. O endpoint pessoal de anexos continua
com escopo `Own`; ele não foi relaxado para atender o fluxo administrativo.

Pagamento, relatório e ajustes administrativos também estão no stack nativo.
Não existe bridge PHP para o workflow de aprovação.
