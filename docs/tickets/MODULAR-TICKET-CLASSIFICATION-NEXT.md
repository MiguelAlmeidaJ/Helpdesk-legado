# 0044d4 — classificação e edição modular no Next

Este corte completa a edição estrutural dos tipos especializados já navegáveis no Next.

## Escopo

- DevOps: editar classificação e descrição de tickets, inclusive tarefas avulsas.
- DevOps: editar classificação e descrição de projetos usados como agrupadores.
- Marketing: editar classificação e descrição de abertura.
- Atendimento permanece no fluxo já existente e não é refatorado neste corte.

## DevOps

O editor usa os mesmos catálogos nativos do criador DevOps e grava pelos endpoints já existentes:

- `PATCH /tickets/projects/tasks/:taskId`
- `PATCH /tickets/projects/:projectId`

Campos editáveis:

- tipo;
- categoria;
- subcategoria;
- item;
- nível;
- forma;
- descrição de abertura.

Cliente, solicitante, local, nome, abertura, técnico, dias e projeto não são alterados por estes PATCHes e permanecem fora do formulário.

A leitura de projetos/tarefas passa a expor `typeId` porque o PATCH exige esse valor completo. Isso apenas amplia o payload de leitura; não altera storage nem cria nova escrita.

Os endpoints de catálogos DevOps passam a exigir `TicketsRead`, enquanto somente `POST /tickets/devops` continua exigindo `TicketsCreate`. Isso permite que usuários com permissão de edição/gestão consultem catálogos sem receber autorização de criação indevida.

## Marketing

O editor usa:

- `GET /tickets/marketing/create/catalogs`
- `PATCH /tickets/marketing/:ticketId/classification`

Campos editáveis:

- tipo;
- categoria;
- subcategoria;
- nível;
- forma;
- descrição de abertura.

`itemId` não é inventado na UI: o formulário atual de Marketing não possui seletor de item. O editor preserva o item já armazenado no ticket ao enviar o DTO completo.

Cliente, solicitante, local, nome, abertura e técnico permanecem inalterados.

## Autorização

O Next não replica `m5` ou `m8`. Ele envia os DTOs específicos e exibe a mensagem da API. O Nest continua sendo autoridade para escopo, permissão e validação das referências.

## Invariantes

1. Nenhuma migration ou alteração de schema.
2. Nenhuma nova tabela ou datasource.
3. Nenhuma escrita PHP ou `legacy/bridge` nova.
4. Nenhum DTO gigante compartilhado entre tipos.
5. Atendimento não é alterado.
6. DevOps continua em `tarefas`/`projetos`.
7. Marketing continua em `tarefas_terc_andar`.
8. Facility permanece aposentado.
