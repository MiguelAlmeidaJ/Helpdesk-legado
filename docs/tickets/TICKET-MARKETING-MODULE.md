# 0044c10 — módulo Marketing

## Objetivo

Este corte cria o terceiro tipo funcional da arquitetura modular de Tickets.
Marketing deixa de depender exclusivamente de `atd_3andar` para leitura e
escrita operacional e passa a ter um boundary Nest próprio.

Os dados continuam no `nivel3`; não existe datasource `mkt` e não existe
migration de tabela neste corte.

## Storage preservado

O módulo usa diretamente as estruturas atuais:

- `tarefas_terc_andar` — tickets Marketing;
- `inter_terc_andar` — timeline/interações;
- `espera_terc_andar` — períodos em espera;
- `tipos_terc_andar` — tipos;
- `categorias_terc_andar` — categorias;
- `subcategorias_terc_andar` — subcategorias;
- `niveis_terc_andar` — níveis;
- `itens` — item opcional compartilhado.

Marketing não tem SLA e não tem projetos/grupos.

## Campos preservados

A criação nativa mantém os campos efetivamente usados pela tela atual:

- nome da tarefa;
- cliente;
- solicitante;
- local;
- tipo;
- categoria;
- subcategoria;
- item opcional;
- nível;
- forma;
- descrição de abertura;
- abertura/agendamento;
- técnico.

`area`, `dias` e outros campos históricos que não são preenchidos pelo criador
atual não são inventados pela API.

## Rotas nativas

```text
GET    /tickets/marketing
GET    /tickets/marketing/:ticketId
GET    /tickets/marketing/create/catalogs
GET    /tickets/marketing/create/requesters?clientId=...
GET    /tickets/marketing/create/locations?clientId=...
POST   /tickets/marketing
PATCH  /tickets/marketing/:ticketId/classification
POST   /tickets/marketing/:ticketId/interactions
PATCH  /tickets/marketing/:ticketId/assignment
POST   /tickets/marketing/:ticketId/hold
POST   /tickets/marketing/:ticketId/resume
POST   /tickets/marketing/:ticketId/reject
POST   /tickets/marketing/:ticketId/finalize
```

## Acesso modular

Os grants `Tickets*` atuais ainda são derivados do módulo legado de Atendimento
(`user_modulo_03`). Por isso este corte não reutiliza esses grants como boundary
de autorização do Marketing. Fazer isso bloquearia usuários que possuem somente
o módulo Marketing.

`TicketTypeAccessRepository` lê no `nivel3` os módulos posicionais ainda
existentes em `usuarios` e os transforma em metadata transitória de tipo:

- `user_modulo_03` -> Atendimento/TI;
- `user_modulo_05` -> DevOps;
- `user_modulo_08` -> Marketing.

Isso não chama PHP e não amplia `legacy/bridge/`. É uma etapa de compatibilidade
até existirem permissions/grants específicos por tipo.

Marketing usa diretamente a semântica documentada de `m8` no boundary nativo:

- `m8_00 >= 1`: leitura e interação;
- `m8_01 >= 2`: criação;
- `m8_01 >= 3`: edição/classificação da própria tarefa e aceite;
- `m8_02 >= 2`: execução/início/finalização;
- `m8_03 >= 2`: colocar/retomar espera;
- `m8_04 >= 2`: recusar/redirecionar;
- `m8_05 >= 2`: gerenciar tarefas de terceiros.

Sem `m8_05`, comandos estruturais/operacionais ficam limitados à tarefa
atribuída ao próprio usuário. O aceite pode também capturar uma tarefa ainda sem
técnico (`tecnico = 0`), sem abrir acesso a tarefas atribuídas a terceiros.

`SystemAdmin` mantém bypass. Usuários parceiros `tipo_usuario = 2` continuam
limitados por `clientes_usuarios`.

A restrição histórica do usuário 134 para `NET DO BRASIL` é preservada na
listagem. A restrição histórica do usuário 145 ao cliente 93 é preservada no
criador.

O mesmo resolver também corrige o catálogo `GET /tickets/types`: DevOps e
Marketing passam a ser descobertos pelos módulos 05 e 08 atuais, pois os
`roleAssignments` do pipeline de autenticação ainda não materializam setores.

## Catálogos

Tipos, categorias, subcategorias e níveis vêm dos catálogos `*_terc_andar` com
`ativo = 1`. Os quatro valores de forma permanecem os mesmos do PHP.

Durante a transição, a lista de técnicos preserva os mesmos critérios de
`user_modulo_08` usados pelo criador PHP. A autorização da operação em si não confia apenas na lista do formulário: o
boundary revalida o módulo 8 do ator e o técnico informado antes da escrita.

## Workflow

O módulo preserva os tipos históricos de interação:

- `1` abertura/ativação automática;
- `2` início;
- `3` recusa;
- `4` direcionamento;
- `5` espera;
- `6` retomada;
- `7` interação;
- `8` finalização;
- `9` edição de classificação.

As transições fazem lock da linha de `tarefas_terc_andar` com `FOR UPDATE`.
A espera ativa também é bloqueada antes de retomada/finalização.

## Agendamentos

Abertura futura cria `status = 0`. O runner nativo executa no startup e em
intervalo periódico, promovendo registros com `abertura < NOW()` para
`status = 1`.

Variável opcional:

```text
TICKET_MARKETING_SCHEDULE_ACTIVATION_INTERVAL_MS
```

`0` desabilita o runner. O padrão é 60000 ms.

O PHP histórico de `atd_3andar/home.php` tenta registrar a ativação automática
em `inter_tarefa_terc_andar`, enquanto o detalhe e as ações atuais usam
`inter_terc_andar`. O módulo nativo usa `inter_terc_andar`, que é a timeline
canônica consumida pela tela atual. Essa é uma correção intencional da
inconsistência legada.

## Fora deste corte

- cutover da UI PHP para Next;
- redirects/tombstones de `atd_3andar`;
- remoção dos PHPs após parity;
- remoção do código Facility já desativado;
- rename futuro das permissões genéricas para permissões específicas por tipo.

## Invariantes

1. nenhum PHP novo;
2. nenhuma dependência nova de `legacy/bridge/`;
3. nenhuma escrita fora do Nest para os novos endpoints;
4. nenhum datasource novo;
5. nenhum SLA para Marketing;
6. nenhum projeto/grupo para Marketing;
7. os campos atuais permanecem a fonte do contrato.
