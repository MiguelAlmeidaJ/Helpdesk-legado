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
3. `aprovador_id` recebe o usuário autenticado;
4. `remark_aprov` recebe a observação da aprovação (máximo de 255 caracteres).

A persistência usa os campos administrativos já existentes em `running_balance`.
A tabela `approvement` referenciada por uma versão do PHP legado não existe no
schema atual de `nivel3`, portanto o fluxo nativo não depende dela.

A recusa preserva o comportamento legado e move o status de `1` para `3`, sem
inventar um registro de auditoria separado que não existe no banco atual.

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


## Web e cutover (`0040b`)

A fila de aprovação passa a ter a rota nativa:

```text
/logistics/expenses/admin/approvals
```

A tela permite aprovação individual, recusa e aprovação em lote de até 100
RDs por operação. O lote usa a transação atômica entregue no `0040a`.

Os comprovantes são abertos por um proxy Next e por um endpoint administrativo
protegido por `LogisticsExpensesApprove`. O endpoint pessoal de anexos continua
com escopo `Own`; ele não foi relaxado para atender o fluxo administrativo.

`logistica/aprovarRD.php` passa a redirecionar para a rota Next. A implementação
PHP antiga fica temporariamente abaixo do `exit` durante o smoke/cutover e pode
ser removida em um corte de aposentadoria depois da paridade operacional.

Pagamento (`pagarRD.php`) continua legado e será tratado no `0041`.
