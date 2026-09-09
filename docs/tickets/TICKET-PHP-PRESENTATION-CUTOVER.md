# 0044e — Cutover das superfícies PHP de DevOps e Marketing

## Objetivo

O 0044e encerra o uso das telas PHP de `atd_projeto/` e `atd_3andar/` depois da
paridade construída na API Nest e na UI Next. O corte é de apresentação e
reachability: não remove tabelas, não altera schema e não cria escrita PHP.

Os tipos de produto permanecem:

- Atendimento — `atendimentos`, com SLA;
- DevOps — `tarefas`, com `projetos` apenas como agrupador opcional;
- Marketing — `tarefas_terc_andar`, sem SLA.

Facility continua desativado e fora desta etapa.

## Entradas que passam a redirecionar

| PHP legado | Destino Next |
| --- | --- |
| `atd_projeto/home.php` | `/tickets/devops/projects` |
| `atd_projeto/hometarefas.php` | `/tickets/devops` |
| `atd_projeto/dash_pro.php` | `/tickets/devops/projects` |
| `atd_projeto/projeto.php?projeto=<id>` | `/tickets/devops/projects/<id>` |
| `atd_projeto/projeto.php` | `/tickets/devops/projects/new` |
| `atd_projeto/tarefa.php?tarefa=<id>` | `/tickets/devops/<id>` |
| `atd_projeto/tarefa.php` | `/tickets/new?type=devops` |
| `atd_3andar/home.php` | `/tickets/marketing` |
| `atd_3andar/dash_pro.php` | `/tickets/marketing` |
| `atd_3andar/tarefa.php?tarefa=<id>` | `/tickets/marketing/<id>` |
| `atd_3andar/tarefa.php` | `/tickets/new?type=marketing` |

Todos os redirects usam HTTP 303. Isso também impede que um POST antigo seja
reexecutado no PHP: a escrita já pertence exclusivamente à API Nest.

O `legacy/bridge/sidebar.php` deixa de publicar links para essas telas e passa a
apontar diretamente para as rotas Next.

## Superfícies tombstonadas

APIs PHP de listagem, lookups `busca_*`, endpoints antigos de imagens e os
includes `lib/`/`views/` exclusivos dessas telas respondem `410 Gone`. Nenhum
deles mantém sessão, `legacy/bridge/`, conexão SQL ou comando PHP depois deste
corte.

A classificação `DEAD` no inventário significa que a superfície pode ser
removida fisicamente em um corte posterior; o 0044e mantém os arquivos como
tombstones para bookmarks e chamadas antigas falharem de forma explícita.

## Exceção: relatórios

Estes arquivos **não** são aposentados pelo 0044e:

- `atd_projeto/rel_analitico_tarefas.php`;
- `atd_3andar/rel_analitico_tarefas.php`.

Eles permanecem classificados como `REPORT` até existir contrato/API/Next de
reporting equivalente. O cutover operacional não é evidência suficiente para
remover relatórios.

## Invariantes

1. nenhuma tabela é criada, alterada ou removida;
2. nenhuma escrita SQL nova é adicionada;
3. nenhum datasource novo é criado;
4. `ConnectionMkt()` não é introduzido;
5. nenhum fluxo passa a depender de `legacy/bridge/`;
6. os tombstones PHP não iniciam sessão e não acessam banco;
7. autorização e transições de estado continuam na API Nest;
8. `projetos` continua sendo agrupador DevOps, não um tipo de ticket;
9. Marketing continua usando `tarefas_terc_andar` e catálogos próprios;
10. relatórios permanecem fora do cutover até paridade específica.

## Inventário

Como o auditor registra fingerprint de cada PHP, após aplicar este patch o
snapshot precisa ser regenerado antes do gate final:

```bash
bash scripts/audit-ticket-family-legacy.sh --write
bash scripts/audit-ticket-family-legacy.sh --check
```

O arquivo `docs/tickets/LEGACY-TICKET-FAMILY-INVENTORY.md` gerado pelo `--write`
deve entrar no mesmo commit do 0044e.
