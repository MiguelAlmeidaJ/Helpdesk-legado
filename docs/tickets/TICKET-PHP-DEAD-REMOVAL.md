# 0044f — remoção física de PHP DEAD em DevOps e Marketing

## Objetivo

O 0044e cortou a apresentação legada de DevOps e Marketing: entrypoints públicos
passaram a redirecionar para o Next e as superfícies internas sem caller restante
passaram a responder `410 Gone`.

O 0044f remove fisicamente esses tombstones `DEAD`. Não remove redirects de
compatibilidade, não remove relatórios sem paridade nativa e não altera dados.

## Escopo removido

São removidos 35 PHPs classificados como `DEAD` no 0044e:

- 23 em `atd_3andar/` (Marketing);
- 12 em `atd_projeto/` (DevOps).

Incluem APIs internas de listagem, lookups auxiliares, includes de UI/workflow e
os antigos endpoints PHP de imagens de tarefa DevOps.

## O que permanece

DevOps mantém apenas os entrypoints PHP de compatibilidade:

- `atd_projeto/home.php`;
- `atd_projeto/hometarefas.php`;
- `atd_projeto/dash_pro.php`;
- `atd_projeto/projeto.php`;
- `atd_projeto/tarefa.php`.

Marketing mantém:

- `atd_3andar/home.php`;
- `atd_3andar/dash_pro.php`;
- `atd_3andar/tarefa.php`.

Esses arquivos continuam sendo redirects `303` para o Next. Também permanecem,
fora deste corte, os relatórios:

- `atd_projeto/rel_analitico_tarefas.php`;
- `atd_3andar/rel_analitico_tarefas.php`.

Eles só podem ser aposentados depois de paridade de reporting.

## Manifesto de aposentadoria

`docs/tickets/LEGACY-TICKET-FAMILY-RETIRED.tsv` registra os 35 paths removidos.
O audit valida que cada path do manifesto termina em `.php`, não aparece nos
overrides ativos e continua ausente do checkout. Reintroduzir um desses arquivos
faz `scripts/audit-ticket-family-legacy.sh --check` falhar.

## Dados e runtime

O corte não contém migration, `DROP TABLE` ou nova escrita. As tabelas históricas
continuam sob responsabilidade da API Nest e os fluxos ativos continuam em Next.
Nenhuma regra é movida para `legacy/bridge/`.

## Gate

Após aplicar:

```bash
bash scripts/audit-ticket-family-legacy.sh --write

git diff --check
pnpm typecheck
pnpm build

bash scripts/audit-ticket-family-legacy.sh --check
```

O `--write` deve reduzir o número de PHPs ativos no snapshot em 35 e atualizar o
fingerprint do inventário.
