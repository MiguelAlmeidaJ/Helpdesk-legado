# 0044c — comandos nativos da família projeto/tarefa

O `0044c` migra as escritas restantes da família Tickets em subcortes, sem
adicionar novos consumidores de `legacy/bridge/` e sem alterar os PHPs ainda
necessários para parity/cutover.

## 0044c — workflow operacional da tarefa

| Ação legada | API nativa |
| --- | --- |
| `tarefa_new_inter` | `POST /tickets/projects/tasks/:taskId/interactions` |
| `tarefa_aceitar` | `PATCH /tickets/projects/tasks/:taskId/assignment` |
| `tarefa_espera` | `POST /tickets/projects/tasks/:taskId/hold` |
| `tarefa_retomar` | `POST /tickets/projects/tasks/:taskId/resume` |
| `tarefa_recusar` | `POST /tickets/projects/tasks/:taskId/reject` |
| `tarefa_finalizar` | `POST /tickets/projects/tasks/:taskId/finalize` |
| `tarefa_porcentagem` | `PATCH /tickets/projects/tasks/:taskId/progress` |

As transições usam transação e `SELECT ... FOR UPDATE` sobre a tarefa. A API é
a autoridade de autorização e de estado; a futura UI Next apenas reflete essas
regras.

Regras relevantes:

- iniciar/direcionar exige tarefa em status `1`;
- dependência em `tarefas_relacionadas` precisa estar finalizada antes do início;
- espera exige status `2` e não aceita espera ativa duplicada;
- retomada exige status `3` e fecha a espera ativa;
- recusa/redirecionamento exige status `2`;
- finalização grava `porcentagem = 100`;
- finalizar a última tarefa aberta encerra o projeto com a intenção legada
  `Todas as tarefas finalizadas`.

## 0044c2 — criação e estrutura de projetos/tarefas

Este subcorte substitui as escritas estruturais que estavam embutidas em
`atd_projeto/projeto.php` e `atd_projeto/tarefa.php`.

| Ação legada | API nativa |
| --- | --- |
| `projeto_adc` | `POST /tickets/projects` |
| `projeto_edt` | `PATCH /tickets/projects/:projectId` |
| `new_tarefa` | `POST /tickets/projects/:projectId/tasks` |
| `tarefa_edt` | `PATCH /tickets/projects/tasks/:taskId` |
| `relacionar_tar` | `PATCH /tickets/projects/tasks/:taskId/dependency` |

### Criação

A API preserva os comportamentos funcionais necessários do legado:

- abertura futura cria projeto/tarefa com status `0` (agendado);
- abertura atual ou passada cria com status `1` (aguardando);
- reincidência continua sendo calculada pela existência de registro com mesmo
  cliente/categoria/subcategoria nos 30 dias anteriores;
- a abertura é registrada em `inter_projeto`/`inter_tarefa` com `inter_tipo=1`;
- direcionamento inicial para outro técnico registra `inter_tipo=4`;
- tarefas criadas dentro de um projeto herdam o cliente do projeto em vez de
  confiar em um `cliente` arbitrário enviado pela UI;
- solicitante/local/classificação/técnico são validados contra registros ativos
  e contra as relações de cliente/categoria/subcategoria.

Um projeto finalizado não aceita novas tarefas.

### Edição estrutural

Projeto e tarefa são atualizados atomicamente em uma única transação. O patch
não replica a sequência PHP de vários `UPDATE`s independentes; ele grava o
estado estrutural em um único comando e registra um `inter_tipo=9` resumindo as
alterações.

Campos cobertos:

- tipo;
- categoria;
- subcategoria;
- item;
- nível;
- forma;
- descrição de abertura.

Nome, prazo em dias, datas, técnico e status não entram silenciosamente na
edição estrutural. Esses valores só mudam por comandos explícitos.

### Dependências

`dependencyTaskId=0` representa ausência de dependência. Uma dependência maior
que zero precisa:

- existir;
- pertencer ao mesmo projeto;
- não apontar para a própria tarefa;
- não criar ciclo na cadeia de `tarefas_relacionadas`.

A validação da cadeia ocorre dentro da transação e bloqueia os registros
percorridos com `FOR UPDATE`.

## 0044c3 — workflow operacional do projeto

Este subcorte substitui as mutações de estado ainda embutidas em
`atd_projeto/projeto.php`.

| Ação legada | API nativa |
| --- | --- |
| `projeto_new_inter` | `POST /tickets/projects/:projectId/interactions` |
| `projeto_aceitar` | `PATCH /tickets/projects/:projectId/assignment` |
| `projeto_espera` | `POST /tickets/projects/:projectId/hold` |
| `projeto_retomar` | `POST /tickets/projects/:projectId/resume` |
| `projeto_recusar` | `POST /tickets/projects/:projectId/reject` |
| `projeto_finalizar` | `POST /tickets/projects/:projectId/finalize` |

As transições usam o mesmo boundary nativo das tarefas: autorização por grants,
escopo de cliente, escopo `Own`, transação e `SELECT ... FOR UPDATE` sobre o
projeto.

Regras deste subcorte:

- iniciar/direcionar exige projeto em status `1`;
- iniciar para o próprio usuário muda para status `2`;
- direcionar para outro técnico mantém status `1`;
- espera exige status `2` e rejeita espera ativa duplicada;
- retomada exige status `3` e fecha a espera ativa em `espera_projeto`;
- recusa/redirecionamento exige status `2`;
- finalização por escopo próprio exige status `2`;
- usuários com escopo operacional amplo podem finalizar status `2` ou `3`;
- finalizar um projeto em espera fecha o registro ativo antes do encerramento;
- interações continuam usando `inter_tipo=7`, atribuição `2/4`, espera `5`,
  retomada `6`, recusa `3/4` e finalização `8`.

O PHP legado de retomada consulta a tabela `espera` embora a entrada seja criada
em `espera_projeto`. A API implementa a intenção do domínio e encerra a espera
na tabela correta, evitando perpetuar esse defeito de persistência.

## Escopo e concorrência

As mutações reaplicam no repositório:

- escopo de cliente para usuário parceiro;
- escopo `Own` dos grants nativos para edição;
- restrição histórica do usuário `134` nas mutações de tarefa existentes;
- locks antes de validar e alterar projeto/tarefa/dependência.

A criação de projeto valida o cliente diretamente. A criação de tarefa bloqueia
o projeto e deriva dele o cliente usado na nova tarefa.

## Escritas ainda deliberadamente pendentes

Ainda **não** são consideradas migradas:

- writes de anexos/imagens em `atd_projeto`;
- ativação automática de projetos/tarefas agendados que ainda ocorre em páginas
  PHP;
- demais writes encontrados em `atd_facility`, `atd_mkt` e `melhorias`.

Esses itens permanecem no estágio `0044c` antes do `0044d`.

## Invariantes

1. Nenhum endpoint destes subcortes chama PHP.
2. Nenhum código novo depende de `legacy/bridge/`.
3. Nenhum datasource `mkt` é criado.
4. Toda escrita nova acontece via API Nest no `nivel3`.
5. A UI Next não é boundary de autorização.
6. Os PHPs continuam executáveis até parity/cutover; estes patches não os
   apagam.

## Validação do 0044c3

```bash
git apply --check 0044c3-ticket-project-workflow-commands.patch
git apply 0044c3-ticket-project-workflow-commands.patch

git diff --check
pnpm typecheck
pnpm build

bash scripts/audit-ticket-family-legacy.sh --check
```

Depois dos gates, o commit é manual.
