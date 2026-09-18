# 0044c7 — foundation modular de tipos de ticket

## Decisão

A família Tickets passa a ter três tipos oficiais habilitados:

| Tipo | Fonte de campos/storage atual | SLA | Setor operacional | Projeto |
| --- | --- | --- | --- | --- |
| Atendimento | `atendimentos` | sim | TI + DevOps | não |
| DevOps | `tarefas` de `atd_projeto` | não | DevOps | sim, via `projetos` |
| Marketing | `tarefas_terc_andar` de `atd_3andar` | não | Marketing | não |

Facility não faz parte do registry modular. O código nativo criado no 0044c6 fica
temporariamente no repositório, mas seu controller e providers deixam de ser
registrados no `TicketsModule`; logo, Facility fica desativado em runtime.

`atd_facility/agenda.php` não pertence a este modelo e deve continuar convergindo
para `logistics.vehicle-agenda`.

## Regra central

O foundation modulariza comportamento sem redesenhar os campos atuais e sem
criar uma tabela central `tickets`.

Os storages existentes continuam como fonte de verdade durante a migração:

- Atendimento: `atendimentos`, `interatividade`, `espera`;
- DevOps: `tarefas`, `inter_tarefa`, `espera_tarefas`, `imagens_tarefa`;
- grupo DevOps: `projetos`, `inter_projeto`, `espera_projeto`;
- Marketing: `tarefas_terc_andar`, `inter_terc_andar`,
  `espera_terc_andar`.

Nenhuma migration de banco faz parte do 0044c7.

## Registry

`TicketTypeRegistry` é o catálogo único dos tipos oficiais.

O registry descreve:

- key e nome apresentados na UI;
- setores que atendem o tipo;
- capabilities;
- campos obrigatórios e opcionais do criador;
- metadata interna do storage legado a ser encapsulado pelos módulos seguintes.

Metadata física de tabela fica somente no backend. O contrato HTTP não expõe
nomes de tabela.

## Criador de tickets

O endpoint:

```text
GET /tickets/types
```

retorna os tipos disponíveis ao usuário autenticado.

O contrato inclui `canCreate`, permitindo que a UI apresente o catálogo mesmo
quando o usuário só possui leitura.

### Atendimento

Preserva o contrato atual do atendimento tradicional.

Campos obrigatórios do criador:

- `clientId`;
- `typeId`;
- `categoryId`;
- `levelId`;
- `priorityId`;
- `formId`;
- `openingDescription`;
- `openingAt`.

Campos opcionais/zero-compatible:

- `requesterId`;
- `locationId`;
- `subcategoryId`;
- `itemId`;
- `technicianId`;
- `recurrence`.

Capabilities:

- SLA;
- agendamento;
- recorrência;
- prioridade.

### DevOps

O ticket DevOps é a atual `tarefa` de `atd_projeto`.

Campos base preservados:

- `name`;
- `clientId`;
- `requesterId`;
- `locationId`;
- `typeId`;
- `categoryId`;
- `subcategoryId`;
- `itemId`;
- `levelId`;
- `formId`;
- `openingDescription`;
- `openingAt`;
- `technicianId`.

Campos associados ao agrupamento/projeto permanecem disponíveis como
capabilities do tipo:

- `projectId`;
- `days`;
- `dependencyTaskId`.

`projetos` deixa de ser interpretado arquiteturalmente como outro tipo de ticket:
é o agrupador de tickets DevOps. Os endpoints já migrados de projects/tasks não
são removidos neste foundation; serão renomeados/encapsulados em corte posterior.

Capabilities:

- projeto/grupo;
- dependência entre tickets;
- progresso;
- imagens da tarefa;
- agendamento;
- sem SLA.

### Marketing

O ticket Marketing é a atual `tarefa_terc_andar`.

O criador preserva os mesmos campos usados hoje:

- `name`;
- `clientId`;
- `requesterId`;
- `locationId`;
- `typeId`;
- `categoryId`;
- `subcategoryId`;
- `itemId`;
- `levelId`;
- `formId`;
- `openingDescription`;
- `openingAt`;
- `technicianId`.

Os catálogos específicos de `tipos_terc_andar`, `categorias_terc_andar`,
`subcategorias_terc_andar` e `niveis_terc_andar` continuam pertencendo ao módulo
Marketing e serão portados no corte correspondente.

Capabilities:

- agendamento;
- sem SLA;
- sem projeto.

## Acesso do registry

Este patch não substitui ainda os grants operacionais existentes.

O endpoint exige `TicketsRead` e usa a associação de setor já presente no usuário
autenticado para filtrar o catálogo:

- Atendimento: visível a quem já possui acesso de Tickets; o atendimento pode ser
  operado por TI e DevOps;
- DevOps: visível para usuários associados ao setor DevOps;
- Marketing: visível para usuários associados ao setor Marketing;
- `SystemAdmin`: vê todos os tipos.

`canCreate` exige também `TicketsCreate`.

Essas regras governam o novo criador modular. Os endpoints antigos permanecem
com sua autorização atual até serem encaminhados aos módulos específicos nos
próximos cortes.

## Próximos cortes

1. consolidar `atendimentos` sob o módulo Atendimento e limitar SLA a ele;
2. encapsular `tarefas` + `projetos` como DevOps + grupos;
3. portar `tarefas_terc_andar` e seus catálogos para Marketing;
4. remover definitivamente o código Facility e separar a agenda de veículos;
5. construir a UI Next do criador usando `GET /tickets/types`.

## Invariantes

1. não cria datasource novo;
2. não cria tabela central `tickets`;
3. não altera os campos persistidos dos três tipos;
4. não adiciona dependência a `legacy/bridge/`;
5. não adiciona PHP;
6. Facility fica fora do registry e sem controller registrado;
7. nomes de tabelas legadas não atravessam o contrato HTTP.
