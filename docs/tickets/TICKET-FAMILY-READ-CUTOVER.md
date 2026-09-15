# 0044b — leituras nativas da família Tickets

O `0044b` substitui dependências de leitura ainda usadas pela família PHP de
atendimento sem criar novas escritas e sem adicionar consumidores de
`legacy/bridge/`.

## Escopo deste corte

Este patch adiciona contratos e endpoints nativos para as leituras de
`atd_projeto` que ainda devolviam HTML renderizado por PHP:

| Legado | API nativa |
| --- | --- |
| `atd_projeto/api/projetos_list.php` | `GET /tickets/projects` |
| `atd_projeto/api/tarefas_list.php` | `GET /tickets/projects/tasks` |
| `atd_projeto/api/projeto_tarefas_list.php` | `GET /tickets/projects/:projectId/tasks` |

As respostas nativas são JSON tipado. Nenhum HTML legado é transportado para a
API.

## Lookups já cobertos

Os seguintes endpoints PHP duplicados em `atd_facility/`, `atd_projeto/`,
`atd_mkt/` e `melhorias/` não ganham uma segunda implementação. O módulo
`tickets` já oferece os contratos nativos usados na abertura:

| Leitura legada | API nativa existente |
| --- | --- |
| `busca_solicitantes.php` | `GET /tickets/create/requesters?clientId=...` |
| `busca_locais.php` | `GET /tickets/create/locations?clientId=...` |
| `busca_subcategorias.php` | `GET /tickets/create/subcategories?categoryId=...` |
| `busca_itens.php` | `GET /tickets/create/items?subcategoryId=...` |

O `0044d` deve consumir esses endpoints diretamente na UI Next; não deve criar
wrappers PHP nem aliases novos em `legacy/bridge/`.

## Semântica preservada

- fonte: `NIVEL3_DATABASE`;
- status padrão de projetos/tarefas: `1,2,3`;
- `status=all` inclui `0..4`;
- paginação nativa por `page` e `limit`, com `limit <= 100`;
- filtros por cliente, solicitante, técnico e id;
- busca textual e intervalo de abertura;
- ordenação por colunas explicitamente permitidas;
- tarefas de um projeto podem ser consultadas por
  `GET /tickets/projects/:projectId/tasks`;
- usuário parceiro (`tipo_usuario = 2`) continua restrito aos clientes de
  `clientes_usuarios`;
- escopo RBAC `Own` continua restringindo a leituras do próprio técnico;
- a compatibilidade histórica do usuário `134` em tarefas mantém a busca
  `NET DO BRASIL` quando nenhuma busca é informada.

## Regra de Marketing

Este patch não cria `MKT_DATABASE`, datasource `mkt` nem uma cópia das tabelas
de marketing. Qualquer leitura sobrevivente de `atd_mkt` deve continuar sendo
modelada pelo domínio nativo e, quando os dados forem `nivel3`, usar
`NIVEL3_DATABASE`.

## Fora do escopo

- nenhuma escrita em `projetos`, `tarefas`, `inter_*` ou `espera_*`;
- nenhuma alteração ou remoção de PHP;
- nenhum redirect/tombstone;
- nenhuma UI Next;
- nenhum relatório;
- nenhuma ampliação de autorização legada.

Esses passos pertencem a `0044c` em diante.

## Validação

```bash
bash scripts/audit-ticket-family-legacy.sh --check
git diff --check
pnpm typecheck
pnpm build
```

Critério de sucesso do `0044b`: as leituras listadas acima possuem contratos
Nest tipados, não dependem de PHP/`legacy/bridge/` e preservam o escopo de
visibilidade necessário para o cutover posterior.
