# 0044d5 — Estrutura DevOps no Next

## Objetivo

Fechar no Next.js os fluxos estruturais que ainda faltavam para DevOps sem transformar Projeto em um novo tipo de ticket.

- `tarefas` continuam sendo tickets DevOps.
- `projetos` continuam sendo agrupadores opcionais.
- tarefa avulsa continua válida e não possui dependência de projeto.
- não há tabela central de tickets.

## Novas superfícies

### Criar projeto

`GET /tickets/devops/projects/new` é uma página Next que usa os endpoints Nest existentes:

- `GET /tickets/devops/create/catalogs`
- `GET /tickets/devops/create/requesters`
- `GET /tickets/devops/create/locations`
- `GET /tickets/devops/create/subcategories`
- `GET /tickets/devops/create/items`
- `POST /tickets/projects`

O formulário preserva os campos do projeto atual: nome, cliente, solicitante, local, tipo, categoria, subcategoria, item, nível, forma, descrição de abertura, abertura e técnico inicial.

### Criar tarefa já dentro de um projeto

O detalhe do projeto oferece “Nova tarefa neste projeto”, apontando para:

`/tickets/new?type=devops&projectId=<id>`

O criador modular do 0044d aceita `projectId` inicial, carrega o cliente herdado e as tarefas candidatas a dependência. Nenhum segundo formulário de tarefa foi criado.

Projetos concluídos não exibem esse atalho; a API continua sendo a autoridade final de estado.

### Dependência entre tarefas

O detalhe do ticket DevOps passa a expor um editor específico de dependência quando a tarefa pertence a um projeto.

A leitura de `tarefas` inclui `tarefas_relacionadas` como `dependencyTaskId`. A alteração usa o endpoint já existente:

`PATCH /tickets/projects/tasks/:taskId/dependency`

O Next não implementa regras de ciclo, pertencimento ao projeto ou auto-dependência. Essas validações continuam no application/repository Nest já migrados.

## Alterações de leitura

`TicketProjectTaskListItem` ganha:

```ts
dependencyTaskId: number;
```

`PrismaTicketProjectReadRepository` apenas seleciona e mapeia `tarefas.tarefas_relacionadas`, usando `0` quando não há dependência.

Não há write SQL novo neste patch.

## Invariantes

1. Projeto não é um quarto tipo de ticket.
2. Projeto permanece opcional para DevOps.
3. Tarefa avulsa continua sem dependência.
4. Cliente de tarefa agrupada continua herdado do projeto.
5. Validação de dependência continua no Nest.
6. Nenhuma rota PHP é adicionada.
7. Nenhum datasource é adicionado.
8. Nenhuma migration ou tabela é criada.
9. Nenhum SLA é introduzido em DevOps.

## Próximo corte

Com criador, listas, operação, classificação e estrutura cobertos no Next, o próximo passo deve ser o cutover visual dos PHPs de `atd_projeto` e `atd_3andar`, com redirects/tombstones apoiados pelo inventário 0044a.
