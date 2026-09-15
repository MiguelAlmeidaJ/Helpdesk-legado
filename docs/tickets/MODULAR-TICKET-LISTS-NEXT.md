# 0044d2 — listas e navegação modular de tickets no Next

## Objetivo

Dar continuidade ao criador modular do 0044d com navegação e leitura nativas por tipo de ticket, sem reintroduzir os nomes de diretórios PHP como modelo de produto.

## Rotas Next

- `/tickets`: Atendimento já existente, com SLA.
- `/tickets/devops`: lista de tickets DevOps, incluindo tarefas avulsas e tarefas agrupadas em projeto.
- `/tickets/devops/:id`: detalhe de leitura do ticket DevOps.
- `/tickets/devops/projects`: lista dos grupos/projetos DevOps.
- `/tickets/devops/projects/:id`: detalhe do projeto e tickets pertencentes ao grupo.
- `/tickets/marketing`: lista de tickets de Marketing.
- `/tickets/marketing/:id`: detalhe de Marketing com histórico.
- `/tickets/new`: criador modular do 0044d.

Um dock de navegação em `app/tickets/layout.tsx` usa `GET /tickets/types`, portanto só apresenta os tipos visíveis para o usuário atual. Facility continua ausente.

O menu lateral global não é promovido neste corte: ele é estático e não conhece o acesso por tipo. O dock é a navegação modular oficial do d2 justamente por reutilizar o registry permission-aware, evitando exibir DevOps ou Marketing para quem não pode vê-los.

## APIs reutilizadas

DevOps:

- `GET /tickets/projects`
- `GET /tickets/projects/tasks`
- `GET /tickets/projects/:projectId/tasks`
- filtros de leitura já existentes, inclusive `id` e `status=all` para os detalhes.

Marketing:

- `GET /tickets/marketing`
- `GET /tickets/marketing/:ticketId`

Atendimento mantém as rotas e componentes existentes neste corte.

## Limites do corte

- Nenhuma nova escrita.
- Nenhuma tabela ou migration.
- Nenhum consumidor novo de `legacy/bridge/`.
- Nenhum PHP novo.
- Nenhum datasource de Marketing separado de `nivel3`.
- Ações operacionais de DevOps/Marketing permanecem fora do 0044d2; este corte fecha listagem, detalhe de leitura e navegação.
