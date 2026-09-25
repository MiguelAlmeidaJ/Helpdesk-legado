# 0044g — Reporting DevOps e Marketing no Next

## Objetivo

Substituir as duas telas PHP remanescentes de relatório analítico de tarefas por
superfícies Next baseadas nas APIs nativas já existentes.

O corte não cria datasource, SQL ou endpoint novo. A leitura continua passando
pelos contratos de lista de cada tipo e, portanto, pelas mesmas regras de acesso
já usadas nas telas operacionais.

## Rotas nativas

- `/tickets/devops/reports/tasks`
- `/tickets/marketing/reports/tasks`

As duas telas preservam os filtros centrais do legado:

- cliente;
- técnico;
- data inicial de abertura;
- data final de abertura.

O resultado mantém cliente, solicitante, local, classificação, técnico, abertura
e fechamento, com navegação para o ticket nativo.

## SLA

Os PHPs chamavam de `SLA` um `TIMESTAMPDIFF` simples entre abertura e fechamento.
Isso não representa o SLA do produto. DevOps e Marketing continuam oficialmente
sem SLA.

A UI nativa expõe esse valor apenas como **duração entre abertura e fechamento**
por registro. Nenhuma meta, violação ou relógio de SLA é criado para esses tipos.

## Cutover PHP

Os entrypoints abaixo passam a responder `303` antes de iniciar sessão, carregar
bridge ou executar SQL:

- `atd_projeto/rel_analitico_tarefas.php` → `/tickets/devops/reports/tasks`;
- `atd_3andar/rel_analitico_tarefas.php` → `/tickets/marketing/reports/tasks`.

O corpo histórico permanece temporariamente no arquivo apenas para tornar o
0044g reversível. Como o `exit` ocorre antes de `session_start`, ele fica
inalcançável em runtime e pode ser removido fisicamente no próximo corte.

## Invariantes

- nenhuma escrita PHP nova;
- nenhum consumidor novo de `legacy/bridge/`;
- nenhum datasource `mkt`;
- Marketing continua em `nivel3` / `tarefas_terc_andar`;
- DevOps continua em `nivel3` / `tarefas`;
- Projeto continua agrupador opcional, não tipo de ticket;
- DevOps e Marketing continuam sem SLA.
