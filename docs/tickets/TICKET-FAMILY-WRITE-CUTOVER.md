# 0044c — comandos nativos do workflow de tarefas de projeto

O `0044c` inicia a migração das escritas restantes da família Tickets sem
adicionar novos consumidores de `legacy/bridge/` e sem alterar o comportamento
dos PHPs legados.

Este corte cobre somente o workflow operacional de `atd_projeto/tarefa.php`.
Criação e edição estrutural continuam explicitamente pendentes antes do cutover
da UI.

## Comandos cobertos

| Ação legada | API nativa |
| --- | --- |
| `tarefa_new_inter` | `POST /tickets/projects/tasks/:taskId/interactions` |
| `tarefa_aceitar` | `PATCH /tickets/projects/tasks/:taskId/assignment` |
| `tarefa_espera` | `POST /tickets/projects/tasks/:taskId/hold` |
| `tarefa_retomar` | `POST /tickets/projects/tasks/:taskId/resume` |
| `tarefa_recusar` | `POST /tickets/projects/tasks/:taskId/reject` |
| `tarefa_finalizar` | `POST /tickets/projects/tasks/:taskId/finalize` |
| `tarefa_porcentagem` | `PATCH /tickets/projects/tasks/:taskId/progress` |

As operações usam o banco `nivel3` e as tabelas existentes `tarefas`,
`inter_tarefa`, `espera_tarefas`, `projetos` e `inter_projeto`.

## Autoridade e concorrência

As regras de autorização não ficam na futura UI Next. Cada comando passa pelos
grants nativos de Tickets e volta a conferir escopo no repositório antes da
escrita.

As transições usam transação e `SELECT ... FOR UPDATE` sobre a tarefa para que
o estado seja validado no mesmo boundary da alteração.

Regras relevantes deste corte:

- iniciar/direcionar exige tarefa em status `1`;
- uma dependência em `tarefas_relacionadas` precisa estar finalizada;
- espera exige status `2` e não aceita uma espera ativa duplicada;
- retomada exige status `3` e fecha a espera ativa;
- recusa/redirecionamento exige status `2`;
- finalização por escopo próprio exige status `2`;
- usuários com escopo operacional amplo podem finalizar status `2` ou `3`;
- finalizar uma tarefa em espera fecha o registro de espera ativo;
- finalizar grava `porcentagem = 100`;
- ao finalizar a última tarefa aberta, o projeto é encerrado com a mesma
  intenção do legado (`Todas as tarefas finalizadas`);
- percentual manual aceita `0..100` e não altera tarefa já finalizada.

A visibilidade por cliente para usuários parceiros e a restrição histórica do
usuário `134` seguem o mesmo boundary usado pelo read model nativo.

## Escritas deliberadamente fora deste corte

Ainda **não** são consideradas migradas:

- `tarefa_adc` — criação de tarefa de projeto;
- `tarefa_edt` — edição/classificação;
- alteração de `tarefas_relacionadas`;
- writes de anexos/imagens em `atd_projeto`;
- comandos próprios de `projetos`;
- ativação automática de tarefas agendadas que ainda ocorre em páginas PHP;
- demais writes encontrados em `atd_facility`, `atd_mkt` e `melhorias`.

Esses itens permanecem no estágio `0044c` e precisam de cortes adicionais antes
do `0044d`.

## Invariantes

1. Nenhum endpoint deste patch chama PHP.
2. Nenhum código novo depende de `legacy/bridge/`.
3. Nenhum datasource `mkt` é criado.
4. Toda escrita deste patch acontece via API Nest no `nivel3`.
5. A UI Next não será tratada como boundary de autorização.
6. Os PHPs permanecem executáveis até parity/cutover; este patch não os apaga.

## Validação

```bash
git apply --check 0044c-ticket-project-task-workflow-commands.patch
git apply 0044c-ticket-project-task-workflow-commands.patch

git diff --check
pnpm typecheck
pnpm build

bash scripts/audit-ticket-family-legacy.sh --check
```

Depois dos gates, o commit pode ser feito manualmente.
