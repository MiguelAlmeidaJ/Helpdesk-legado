# 0044c8 — módulo Atendimento

## Objetivo

Este corte transforma Atendimento no primeiro tipo com boundary Nest próprio dentro
da arquitetura modular criada no 0044c7.

Não há mudança de banco, contrato HTTP ou regra funcional. O objetivo é retirar do
`TicketsModule` raiz o wiring que pertence exclusivamente ao atendimento
tradicional e colocá-lo em `AtendimentoTicketsModule`.

A fonte de verdade continua sendo:

- `atendimentos`;
- `interatividade`;
- `espera`;
- tabelas de anexos já utilizadas pelo atendimento.

## Boundary

O módulo fica em:

```text
apps/api/src/modules/tickets/types/atendimento/atendimento-tickets.module.ts
```

Ele passa a registrar os controllers atuais de Atendimento:

- `TicketsController`;
- `TicketWorkflowController`;
- `TicketClassificationController`;
- `TicketAttachmentsController`;
- `TicketCreateController`;
- `TicketAvailabilityController`;
- `TicketTimelineController`.

As URLs permanecem inalteradas neste corte. Isso evita quebra de consumidores
enquanto a UI Next e os tipos DevOps/Marketing ainda estão sendo modularizados.

## Casos de uso de Atendimento

O boundary passa a ser dono do wiring de:

- lista e detalhe;
- criação;
- classificação;
- interação;
- atribuição/início;
- espera e retomada;
- recusa;
- conclusão/finalização;
- anexos;
- timeline;
- disponibilidade/SLA.

Os nomes de classes ainda são os nomes genéricos históricos (`ListTickets`,
`CreateTicket`, `TicketAvailabilityRepository`, etc.). Eles não são renomeados
neste patch para evitar churn sem ganho funcional. A propriedade arquitetural
agora é definida pelo módulo que os registra.

## SLA

SLA é capability exclusiva de Atendimento.

`GetTicketAvailability`, `TicketAvailabilityController` e
`PrismaTicketAvailabilityRepository` ficam registrados somente em
`AtendimentoTicketsModule`.

DevOps e Marketing não devem importar esses providers para reutilizar cálculo de
SLA. Caso precisem de calendário/disponibilidade no futuro, isso deve nascer como
capability própria e não como dependência acidental do Atendimento.

A lista atual de Atendimento também continua podendo calcular/expor dados de SLA;
o fato de o read model ter essa informação não transforma SLA em parte do core de
Tickets.

## TicketsModule raiz

Depois deste corte o módulo raiz fica responsável por:

- registry dos tipos (`TicketTypeRegistry`);
- endpoint `GET /tickets/types`;
- wiring ainda existente de DevOps (`tarefas` + `projetos`);
- composição dos submódulos de tipo.

O root deixa de registrar diretamente providers/repositories/controllers que
operam `atendimentos`.

## Próximos passos

1. encapsular DevOps em `types/devops`, preservando `tarefas` e `projetos`;
2. portar Marketing para `types/marketing`, preservando `tarefas_terc_andar` e
   seus catálogos;
3. somente depois avaliar aliases/URLs explicitamente tipadas para o criador;
4. remover definitivamente os arquivos nativos de Facility que ficaram
   desregistrados após a mudança de direção.

## Invariantes

1. nenhuma migration de banco;
2. nenhuma mudança de schema;
3. nenhuma URL existente muda;
4. nenhuma regra de autorização é afrouxada;
5. SLA continua somente em Atendimento;
6. nenhum código novo depende de PHP ou `legacy/bridge/`;
7. nenhum datasource novo;
8. DevOps e Marketing não passam a depender de repositories de Atendimento.
