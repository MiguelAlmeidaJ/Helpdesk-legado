# Aprovação nativa de RD

O `0040a` migra para NestJS o workflow de aprovação e recusa que hoje existe
em `logistica/aprovarRD.php`. A interface Next será conectada em um corte
seguinte; este patch entrega primeiro a API transacional e o permissionamento.

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
porta de entrada atual de `aprovarRD.php`. No adapter RBAC o slug é
`logistica.rd.aprovar`, com fallback temporário para o nível legado.

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
3. é criada uma linha em `approvement` com o usuário aprovador, data, PIX e
   tipo de PIX copiados da própria RD e a observação da aprovação.

A recusa preserva o comportamento legado e move o status de `1` para `3`. O
PHP atual não grava uma linha em `approvement` para recusas, então este corte
não introduz essa alteração de esquema/semântica.

## Categoria e comprovante

A fila padroniza a troca de catálogo na mesma data do painel administrativo:
`2025-10-01`. Antes disso usa `category`; a partir da data usa
`categorias_subgrupo` com `aplicavel IN ('Ambos', 'RD')`.

A categoria `43` continua sinalizando `receiptRequiredMissing` quando não há
anexo. A fila também expõe os metadados dos anexos para a UI nativa que será
ligada no próximo corte.

## E-mail

Após o commit da aprovação, a API pode enviar o aviso de despesas aprovadas
usando a infraestrutura SMTP já existente no monorepo. O envio não participa
da transação: uma falha de SMTP é registrada no log, mas não desfaz uma
aprovação já confirmada no banco.

O envio fica desligado por padrão. Para habilitar:

```dotenv
RD_APPROVAL_EMAIL_ENABLED=true
RD_APPROVAL_EMAIL_RECIPIENTS=destinatario1@empresa.com,destinatario2@empresa.com
```

Sem `RD_APPROVAL_EMAIL_RECIPIENTS`, o adapter mantém temporariamente os mesmos
destinatários existentes no PHP legado. `SMTP_HOST`, `SMTP_FROM` e demais
variáveis SMTP continuam sendo compartilhadas com as notificações do Helpdesk.

## Fora do corte

Ainda permanecem no legado nesta etapa:

- tela de aprovação (`aprovarRD.php`) como entrada principal;
- visualização administrativa de anexos na fila nativa;
- pagamento (`pagarRD.php`);
- relatório/PDF;
- ajustes administrativos.

O próximo corte deve conectar a UI Next ao workflow acima e somente depois
fazer o cutover da tela PHP de aprovação.
