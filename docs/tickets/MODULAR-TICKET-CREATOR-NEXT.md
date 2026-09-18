# 0044d — criador modular de tickets no Next

Este corte transforma `/tickets/new` na entrada única para criação dos tipos de
ticket oficiais do Helpdesk, sem alterar as tabelas existentes.

## Tipos disponíveis

A tela consulta `GET /tickets/types` e mostra apenas os tipos com `canCreate`:

- **Atendimento** — reaproveita o formulário Next já existente e grava em
  `atendimentos`; mantém SLA, prioridade e recorrência.
- **DevOps** — usa os campos de `atd_projeto/tarefa.php` e grava em `tarefas`;
  não possui SLA. Projeto é opcional.
- **Marketing** — usa os campos e catálogos atuais de `atd_3andar` e grava em
  `tarefas_terc_andar`; não possui SLA.

Facility não aparece no criador.

## DevOps: tarefa avulsa ou agrupada

O legado já permite criar uma tarefa diretamente em `tarefas` sem
`id_projeto`. O criador nativo preserva esse comportamento:

- `POST /tickets/devops` cria uma tarefa DevOps avulsa;
- `POST /tickets/projects/:projectId/tasks` continua criando uma tarefa dentro
  de um projeto existente;
- ao selecionar um projeto no formulário, o cliente é herdado do projeto e os
  campos de dias/dependência ficam disponíveis;
- sem projeto, o usuário escolhe o cliente diretamente e o insert não grava
  `id_projeto`.

`projetos` continua sendo um agrupador opcional, não um quarto tipo de ticket.

### Catálogos DevOps

Para não depender das permissões de Atendimento (`m3`), o módulo DevOps passa
a expor catálogos protegidos pelo acesso `m5`:

```text
GET /tickets/devops/create/catalogs
GET /tickets/devops/create/requesters?clientId=...
GET /tickets/devops/create/locations?clientId=...
GET /tickets/devops/create/subcategories?categoryId=...
GET /tickets/devops/create/items?subcategoryId=...
```

O cadastro avulso mantém os tipos 0..6, categorias `cat_setor=1`, níveis 0..6,
formas 1..4 e técnicos ativos das funções DevOps 8..14, conforme o fluxo legado
`atd_projeto/tarefa.php`.

## Marketing

O criador usa os endpoints nativos do módulo Marketing:

```text
GET  /tickets/marketing/create/catalogs
GET  /tickets/marketing/create/requesters?clientId=...
GET  /tickets/marketing/create/locations?clientId=...
POST /tickets/marketing
```

O formulário mantém Cliente, Solicitante, Local, Tipo, Categoria, Subcategoria,
Nível, Nome da Tarefa, Descrição, Técnico, Forma e Abertura. O cadastro legado
atual do terceiro andar não apresenta Item no formulário; por isso o contrato
continua enviando `itemId=0` nesse fluxo.

## Atendimento

`?type=atendimento` continua renderizando `TicketCreateScreen`. Este corte não
reescreve esse formulário para evitar regressão no fluxo já nativo e validado.

## Fora deste corte

- listas e telas de detalhe específicas de DevOps e Marketing no Next;
- criação/edição de Projetos DevOps no mesmo wizard;
- redirecionamento/tombstone das telas PHP de `atd_projeto` e `atd_3andar`;
- mudança de schema ou consolidação das três tabelas de ticket.
