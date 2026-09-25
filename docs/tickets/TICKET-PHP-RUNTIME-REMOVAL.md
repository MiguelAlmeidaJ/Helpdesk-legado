# 0044h — remoção das superfícies PHP fora do runtime

## Decisão

A aplicação em produção não executa PHP. Portanto redirects e tombstones PHP não são uma camada de compatibilidade real: esses arquivos não recebem requisições e apenas preservam código morto no repositório.

A partir deste corte, para famílias cuja paridade já está no Nest + Next, o padrão é remoção física em vez de wrappers `303`/`410`.

## Escopo

Este corte remove os PHPs restantes das famílias já concluídas:

- DevOps (`atd_projeto`): listas, projeto, tarefa e relatório;
- Marketing (`atd_3andar`): lista, tarefa e relatório;
- Facility (`atd_facility`): módulo desativado e antiga agenda já convergida para Logistics.

Os dados históricos permanecem nas tabelas de `nivel3`. Nenhuma tabela, coluna ou registro é removido por este corte.

## Runtime nativo

DevOps permanece atendido por:

- `/tickets/devops`;
- `/tickets/devops/:id`;
- `/tickets/devops/projects`;
- `/tickets/devops/projects/:id`;
- `/tickets/devops/projects/new`;
- `/tickets/devops/reports/tasks`;
- APIs Nest em `/tickets/projects...` e `/tickets/devops...`.

Marketing permanece atendido por:

- `/tickets/marketing`;
- `/tickets/marketing/:id`;
- `/tickets/marketing/reports/tasks`;
- APIs Nest em `/tickets/marketing...`.

A agenda de veículos permanece em `/logistics/vehicles/agenda`.

## Gate de não regressão

Os paths removidos entram em `LEGACY-TICKET-FAMILY-RETIRED.tsv`. O audit deve falhar caso qualquer um deles reapareça no checkout.

Não adicionar redirects PHP novos. Compatibilidade de URLs, quando realmente necessária, deve ser implementada na camada HTTP que efetivamente recebe tráfego, não em um runtime PHP inexistente.
