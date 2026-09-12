# 0044c9 — módulo DevOps

## Objetivo

Este corte transforma DevOps no segundo tipo com boundary Nest próprio dentro da
arquitetura modular criada no 0044c7.

O objetivo é de composição e ownership. Nenhuma tabela, rota pública, contrato
HTTP ou regra funcional é alterada neste subcorte.

## Modelo do tipo

DevOps preserva os dados que hoje pertencem a `atd_projeto`:

- `tarefas` são os tickets DevOps;
- `projetos` são agrupadores de tickets DevOps;
- `inter_tarefa` é o histórico dos tickets;
- `espera_tarefas` registra esperas dos tickets;
- `imagens_tarefa` armazena as imagens associadas às tarefas;
- `inter_projeto` e `espera_projeto` continuam pertencendo ao agrupador.

Não existe migration de banco neste corte e não é criada tabela central
`tickets`.

## Boundary Nest

O módulo:

```text
apps/api/src/modules/tickets/types/devops/devops-tickets.module.ts
```

passa a registrar os casos de uso, controllers, ports e implementações Prisma
que trabalham com `tarefas` e `projetos`.

Isso inclui:

- listagem de projetos e tarefas;
- criação/edição estrutural de projetos e tarefas;
- workflow operacional de projetos;
- workflow operacional de tarefas;
- dependências entre tarefas;
- progresso;
- imagens de tarefas;
- ativação automática de projetos/tarefas agendados.

O runner `TicketProjectScheduleActivationRunner` fica dentro do módulo DevOps
porque seu efeito persistente é exclusivo de `projetos` e `tarefas`.

## Projeto é agrupador

Os nomes `TicketProject*` continuam temporariamente no código e as rotas
existentes continuam sob `/tickets/projects` para preservar compatibilidade.

Arquiteturalmente, entretanto:

```text
DevOps ticket = tarefas
DevOps group  = projetos
```

Um projeto não é um quarto tipo de ticket. O rename de contratos/URLs pode ser
feito somente quando houver consumidores nativos preparados para o cutover.

## Rotas preservadas

Este corte não muda as rotas já migradas, incluindo:

```text
GET   /tickets/projects
GET   /tickets/projects/tasks
GET   /tickets/projects/:projectId/tasks
POST  /tickets/projects
PATCH /tickets/projects/:projectId
POST  /tickets/projects/:projectId/tasks
PATCH /tickets/projects/tasks/:taskId
PATCH /tickets/projects/tasks/:taskId/dependency
POST  /tickets/projects/:projectId/interactions
PATCH /tickets/projects/:projectId/assignment
POST  /tickets/projects/:projectId/hold
POST  /tickets/projects/:projectId/resume
POST  /tickets/projects/:projectId/reject
POST  /tickets/projects/:projectId/finalize
POST  /tickets/projects/tasks/:taskId/interactions
PATCH /tickets/projects/tasks/:taskId/assignment
POST  /tickets/projects/tasks/:taskId/hold
POST  /tickets/projects/tasks/:taskId/resume
POST  /tickets/projects/tasks/:taskId/reject
POST  /tickets/projects/tasks/:taskId/finalize
PATCH /tickets/projects/tasks/:taskId/progress
GET   /tickets/projects/tasks/:taskId/images
GET   /tickets/projects/tasks/:taskId/images/:imageId/content
POST  /tickets/projects/tasks/:taskId/images
PUT   /tickets/projects/tasks/:taskId/images/:imageId
DELETE /tickets/projects/tasks/:taskId/images/:imageId
```

## SLA

DevOps continua sem SLA.

Nenhum provider de disponibilidade/SLA é registrado no `DevOpsTicketsModule`.
Esses providers pertencem ao `AtendimentoTicketsModule`, estabelecido no 0044c8.

## TicketsModule raiz

Depois deste corte o módulo raiz fica responsável apenas por:

- `TicketTypeRegistry`;
- `GET /tickets/types`;
- composição do `AtendimentoTicketsModule`;
- composição do `DevOpsTicketsModule`.

Marketing ainda será encapsulado no corte seguinte.

## Segurança

As rotas mantêm os guards e grants já existentes. Este corte não antecipa a
migração para permissões específicas por tipo descrita no roadmap modular.

O registry já descreve DevOps como restrito ao setor DevOps, mas os endpoints
legados de projects/tasks continuam com a autorização existente até um cutover
específico de permissões e consumidores.

## Fora deste subcorte

Ainda ficam pendentes:

1. renomear conceitualmente contratos/classes `Project/Task` para `DevOps/Group`
   sem quebrar consumidores;
2. introduzir permissões específicas do tipo DevOps;
3. portar o tipo Marketing baseado em `tarefas_terc_andar`;
4. construir o criador Next usando o registry modular;
5. fazer redirects/tombstones e remover os PHPs de `atd_projeto` após parity.

## Invariantes

1. não cria ou altera tabela;
2. não cria datasource;
3. não altera os campos de `tarefas` ou `projetos`;
4. não muda URLs públicas;
5. não adiciona dependência a `legacy/bridge/`;
6. não adiciona PHP;
7. DevOps não recebe SLA;
8. `projetos` é tratado como agrupador, não como tipo de ticket.

## Validação

```bash
git apply --check 0044c9-ticket-devops-module.patch
git apply 0044c9-ticket-devops-module.patch

git diff --check
pnpm typecheck
pnpm build

bash scripts/audit-ticket-family-legacy.sh --check
```
