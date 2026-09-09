# 0044a — Inventário da família Tickets no PHP legado

## Objetivo

O 0044a muda o trabalho de remoção do PHP para uma unidade funcional: Tickets.
Ele não migra comportamento. Ele cria um inventário reproduzível do legado que
continua vivo e transforma drift desse inventário em gate explícito.

Escopo primário:

- `atd_3andar/`;
- `atd_facility/`;
- `atd_projeto/`;
- `atd_mkt/`;
- `melhorias/`;
- PHPs em `rel/` cujo próprio conteúdo demonstre dependência de atendimento.

`legacy/bridge/` é infraestrutura em contagem regressiva. O 0044a pode observar
consumidores existentes, mas não cria funcionalidade, autorização ou escrita
nova no bridge.

## Taxonomia

Cada PHP recebe uma classe automática conservadora:

| Classe | Significado |
| --- | --- |
| `MIGRATE_READ` | leitura legada que precisa de contrato/API nativa antes do corte |
| `MIGRATE_WRITE` | comando/escrita que precisa migrar para a API Nest antes do corte |
| `MIGRATE_UI` | superfície HTML/PHP que precisa de UI Next e contratos nativos |
| `REPORT` | relatório que deve pertencer ao domínio nativo correspondente |
| `BRIDGE_ONLY` | arquivo sem comportamento detectado além da dependência legada |
| `UNKNOWN` | comportamento insuficientemente classificado; exige triagem humana |

`DEAD` e `REDIRECT` são decisões manuais. O auditor não pode concluir ausência
de reachability apenas por grep. Decisões manuais ficam em
`docs/tickets/LEGACY-TICKET-FAMILY-OVERRIDES.tsv`, para não serem perdidas ao
regenerar o snapshot.

O arquivo de overrides também pode incluir explicitamente um PHP de `rel/` que
a heurística conservadora não tenha detectado. Um override obsoleto ou apontando
para arquivo inexistente faz o audit falhar.

## Campos observados

O snapshot registra, por arquivo:

- candidato a superfície HTTP e métodos inferidos;
- presença de `SELECT` e de escrita SQL;
- dependência de sessão PHP;
- funções `Connection*()` utilizadas;
- tabelas SQL detectadas;
- referências a outros PHPs;
- callers rastreáveis no Git;
- classificação, owner nativo e pré-requisito de aposentadoria;
- hash curto do arquivo para detectar drift.

## Regra de marketing

`ConnectionMkt()` não define um novo datasource na arquitetura nativa.
Qualquer dado sobrevivente dessa variante continua pertencendo ao banco
`nivel3` e deve ser exposto por contratos do domínio correto.

## Workflow

Depois de aplicar o patch:

```bash
bash scripts/audit-ticket-family-legacy.sh --write
bash scripts/audit-ticket-family-legacy.sh --check

git diff --check
pnpm typecheck
pnpm build
```

O primeiro comando materializa o snapshot contra o checkout real. O segundo
falha quando qualquer PHP entra, sai ou muda sem atualização do inventário, e
também falha enquanto houver arquivos `UNKNOWN`.

Quando a heurística não for suficiente, registre a decisão em
`docs/tickets/LEGACY-TICKET-FAMILY-OVERRIDES.tsv` e regenere. Isso é obrigatório
para decisões como `DEAD` e `REDIRECT`, que precisam de evidência humana de
reachability/cutover.

Antes de remover qualquer PHP, a classificação automática deve ser revisada.
Reachability por URL, equivalência nativa e segurança da aposentadoria continuam
exigindo evidência funcional.

<!-- BEGIN GENERATED 0044A -->

## Snapshot gerado

Fingerprint do inventario: `c5e043f4bd80d220ec549d03768d091adbf9115fcbb8a6efaeab9cef83ba7752`.

| Metrica | Quantidade |
| --- | ---: |
| PHP no escopo | 53 |
| MIGRATE_READ | 8 |
| MIGRATE_WRITE | 7 |
| MIGRATE_UI | 5 |
| REPORT | 15 |
| BRIDGE_ONLY | 2 |
| REDIRECT | 12 |
| DEAD | 4 |
| UNKNOWN | 0 |
| classificacoes com override manual | 16 |
| arquivos com dependencia de bridge/conexao legada | 37 |
| arquivos com `ConnectionMkt()` | 5 |

### Inventario por arquivo

| Caminho | superficie HTTP? | metodos | SELECT | escrita SQL | sessao | conexoes | tabelas detectadas | referencias PHP | callers conhecidos | classificacao / owner / pre-requisito | decisao | hash |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `atd_3andar/dash_pro.php` | yes | - | no | no | no | - | - | - | legacy/bridge/sidebar.php | REDIRECT / tickets/marketing / Next modular + API Nest com paridade operacional | override: 303 para /tickets/marketing; sem sessao bridge ou SQL | `734125762009` |
| `atd_3andar/home.php` | yes | - | no | no | no | - | - | - | .env.example, CHAGELOG.txt, atd_mkt/analisePeriodoMkt.php, atd_mkt/disponibilidadeTecMkt.php, atd_mkt/home.php, atd_mkt/srhomemkt.php, config/home.php, home_old.php | REDIRECT / tickets/marketing / Next modular + API Nest com paridade operacional | override: 303 para /tickets/marketing; sem sessao bridge ou SQL | `734125762009` |
| `atd_3andar/rel_analitico_tarefas.php` | yes | POST | yes | no | yes | ConnectionN3 | clientes, usuarios, tarefas_terc_andar, locais, pessoas, tipos_terc_andar, categorias_terc_andar, subcategorias_terc_andar, niveis_terc_andar, itens | ../legacy/bridge/seguranca.php, ../legacy/bridge/conect.php, ../legacy/bridge/permissoes.php, ../legacy/bridge/token.php, ../legacy/bridge/update_senha.php, ../legacy/bridge/sidebar.php, ../legacy/bridge/update_pass.php | - | REPORT / tickets / domain report ownership + parity + cutover | auto: - | `bac14102eda8` |
| `atd_3andar/tarefa.php` | yes | GET, POST | no | no | no | - | - | - | atd_mkt/hometarefas.php, atd_mkt/projeto.php, packages/contracts/src/tickets/ticket-project.ts | REDIRECT / tickets/marketing / Next modular + API Nest com paridade operacional | override: 303 para /tickets/marketing/<id> ou /tickets/new?type=marketing; sem sessao bridge ou SQL | `9c19b7757422` |
| `atd_facility/agenda.php` | yes | - | no | no | no | - | - | - | - | REDIRECT / logistics / rota Next /logistics/vehicles/agenda disponivel | override: compatibilidade redireciona agenda de veiculos para Logistics | `fbdee641a9c0` |
| `atd_facility/atd.php` | yes | - | no | no | no | - | - | - | ativos/home.php, legacy/bridge/sidebar.php, melhorias/home.php, melhorias/srhome.php | REDIRECT / tickets / Facility desativado; remover bookmarks/callers | override: tombstone redireciona para /tickets sem bridge ou SQL | `9e262d8e5c98` |
| `atd_facility/busca_itens.php` | yes | - | no | no | no | - | - | - | atd_mkt/projeto.php, atd_mkt/tarefa.php, melhorias/atd.php | DEAD / tickets / 0 callers apos tombstone Facility | override: endpoint auxiliar responde HTTP 410 sem bridge ou SQL | `a5ad6496dfd3` |
| `atd_facility/busca_locais.php` | yes | - | no | no | no | - | - | - | atd_3andar/js/tarefa-create.js, atd_mkt/projeto.php, atd_mkt/tarefa.php, melhorias/atd.php, rel/rel_Unificado.php, rel/rel_Unificado_Id.php, rel/rel_ti.php | DEAD / tickets / 0 callers apos tombstone Facility | override: endpoint auxiliar responde HTTP 410 sem bridge ou SQL | `a5ad6496dfd3` |
| `atd_facility/busca_solicitantes.php` | yes | - | no | no | no | - | - | - | atd_3andar/js/tarefa-create.js, atd_mkt/projeto.php, atd_mkt/tarefa.php, melhorias/atd.php | DEAD / tickets / 0 callers apos tombstone Facility | override: endpoint auxiliar responde HTTP 410 sem bridge ou SQL | `a5ad6496dfd3` |
| `atd_facility/busca_subcategorias.php` | yes | - | no | no | no | - | - | - | atd_mkt/projeto.php, atd_mkt/tarefa.php, melhorias/atd.php | DEAD / tickets / 0 callers apos tombstone Facility | override: endpoint auxiliar responde HTTP 410 sem bridge ou SQL | `a5ad6496dfd3` |
| `atd_facility/dash_pro.php` | yes | - | no | no | no | - | - | - | legacy/bridge/sidebar.php | REDIRECT / tickets / Facility desativado; remover bookmarks/callers | override: tombstone redireciona para /tickets sem bridge ou SQL | `9e262d8e5c98` |
| `atd_facility/home.php` | yes | - | no | no | no | - | - | - | .env.example, CHAGELOG.txt, atd_mkt/analisePeriodoMkt.php, atd_mkt/disponibilidadeTecMkt.php, atd_mkt/home.php, atd_mkt/srhomemkt.php, config/home.php, home_old.php | REDIRECT / tickets / Facility desativado; remover bookmarks/callers | override: tombstone redireciona para /tickets sem bridge ou SQL | `9e262d8e5c98` |
| `atd_mkt/analisePeriodoMkt.php` | yes | POST | yes | no | yes | ConnectionMkt | tblstaff, tblfiles, tbltasks, tbltask_assigned, tblcustomfieldsvalues | ../legacy/bridge/seguranca.php, ../legacy/bridge/conect.php, ../legacy/bridge/permissoes.php, ../home.php, ../legacy/bridge/sidebar.php | - | MIGRATE_UI / tickets (nivel3) / read/API parity + Next UI + cutover | auto: - | `014cb1f26805` |
| `atd_mkt/busca_itens.php` | no | - | yes | no | yes | ConnectionN3 | itens | ../legacy/bridge/seguranca.php, ../legacy/bridge/conect.php | atd_mkt/projeto.php, atd_mkt/tarefa.php, melhorias/atd.php | MIGRATE_READ / tickets (nivel3) / native read contract + caller cutover | auto: - | `b28408a1bc5d` |
| `atd_mkt/busca_locais.php` | no | - | yes | no | yes | ConnectionN3 | locais | ../legacy/bridge/seguranca.php, ../legacy/bridge/conect.php | atd_3andar/js/tarefa-create.js, atd_mkt/projeto.php, atd_mkt/tarefa.php, melhorias/atd.php, rel/rel_Unificado.php, rel/rel_Unificado_Id.php, rel/rel_ti.php | MIGRATE_READ / tickets (nivel3) / native read contract + caller cutover | auto: - | `2343442e3cb0` |
| `atd_mkt/busca_solicitantes.php` | no | - | yes | no | yes | ConnectionN3 | pessoas | ../legacy/bridge/seguranca.php, ../legacy/bridge/conect.php | atd_3andar/js/tarefa-create.js, atd_mkt/projeto.php, atd_mkt/tarefa.php, melhorias/atd.php | MIGRATE_READ / tickets (nivel3) / native read contract + caller cutover | auto: - | `226337552ef5` |
| `atd_mkt/busca_subcategorias.php` | no | - | yes | no | yes | ConnectionN3 | subcategorias | ../legacy/bridge/seguranca.php, ../legacy/bridge/conect.php | atd_mkt/projeto.php, atd_mkt/tarefa.php, melhorias/atd.php | MIGRATE_READ / tickets (nivel3) / native read contract + caller cutover | auto: - | `365b8023123a` |
| `atd_mkt/dash_pro.php` | yes | POST | yes | no | yes | ConnectionN3 | projetos, clientes, usuarios | ../legacy/bridge/seguranca.php, ../legacy/bridge/conect.php, ../legacy/bridge/permissoes.php, ..all/update_senha.php, ../legacy/bridge/loading_home.php, ../legacy/bridge/sidebar.php, ../legacy/bridge/update_pass.php | legacy/bridge/sidebar.php | MIGRATE_UI / tickets (nivel3) / read/API parity + Next UI + cutover | auto: - | `f5284eba09d8` |
| `atd_mkt/disponibilidadeTecMkt.php` | yes | - | yes | no | yes | ConnectionMkt | tbltasks, tbltask_assigned, tblclients, tblstaff, tblcustomfieldsvalues, tbltaggables, tbltags | ../legacy/bridge/seguranca.php, ../legacy/bridge/conect.php, ../legacy/bridge/permissoes.php, ../home.php, ../legacy/bridge/sidebar.php, mkt_atd.php | - | MIGRATE_UI / tickets (nivel3) / read/API parity + Next UI + cutover | auto: - | `cffb0d3bf0d4` |
| `atd_mkt/home.php` | yes | POST | yes | no | yes | ConnectionMkt | tbltasks, tbltask_assigned, tbltask_statuses, tblcustomfieldsvalues, tblstaff, tblclients, AS | ../legacy/bridge/seguranca.php, ../legacy/bridge/conect.php, ../legacy/bridge/permissoes.php, ../home.php, mkt_atd.php, ../legacy/bridge/sidebar.php, ./srhomeMKT.php | .env.example, CHAGELOG.txt, atd_mkt/analisePeriodoMkt.php, atd_mkt/disponibilidadeTecMkt.php, atd_mkt/srhomemkt.php, config/home.php, home_old.php, legacy/bridge/permissoes.php | MIGRATE_UI / tickets (nivel3) / read/API parity + Next UI + cutover | auto: - | `57e7b2c1b71d` |
| `atd_mkt/hometarefas.php` | yes | POST | yes | yes | yes | ConnectionN3 | configuracao, tarefas, inter_tarefa, clientes, pessoas, usuarios, projetos, CLIENTES, locais, categorias, subcategorias, itens, espera_tarefas | ../legacy/bridge/seguranca.php, ../legacy/bridge/conect.php, ../legacy/bridge/permissoes.php, ../index.php, ../legacy/bridge/update_senha.php, ../legacy/bridge/loading.php, ../legacy/bridge/sidebar.php, tarefa.php, ../legacy/bridge/update_pass.php | - | MIGRATE_WRITE / tickets (nivel3) / native command + read parity + Next UI + cutover | auto: - | `64cfa36899bf` |
| `atd_mkt/mkt_atd.php` | yes | POST | yes | yes | yes | ConnectionMkt | tbltasks, tbltask_comments, tbltask_statuses, tblactivity_log_interacao, tbltaskstimers, tbltask_assigned, tblstaff, tblcustomfieldsvalues, tblclients | ../legacy/bridge/seguranca.php, ../legacy/bridge/conect.php, ../legacy/bridge/permissoes.php, ../legacy/bridge/token.php, ../index.php, ../legacy/bridge/sidebar.php | atd_mkt/disponibilidadeTecMkt.php, atd_mkt/home.php, atd_mkt/srhomemkt.php | MIGRATE_WRITE / tickets (nivel3) / native command + read parity + Next UI + cutover | auto: - | `d2aed3780c5e` |
| `atd_mkt/projeto.php` | yes | POST, FILES | yes | yes | yes | ConnectionN3 | proj_mkt, inter_proj_mkt, usuarios, categorias, subcategorias | ../legacy/bridge/seguranca.php, ../legacy/bridge/conect.php, ../legacy/bridge/permissoes.php, ../legacy/bridge/token.php, ../index.php, ../legacy/bridge/loading.php, ../legacy/bridge/sidebar.php, ../legacy/bridge/update_senha.php, tarefa.php, ../legacy/bridge/update_pass.php | - | MIGRATE_WRITE / tickets (nivel3) / native command + read parity + Next UI + cutover | auto: - | `dd9fe8b74df7` |
| `atd_mkt/srhomemkt.php` | yes | POST | yes | no | yes | ConnectionMkt | AS, tbltasks, tbltask_assigned, tbltask_statuses, tblcustomfieldsvalues, tblstaff, tblclients | ../legacy/bridge/seguranca.php, ../legacy/bridge/conect.php, ../legacy/bridge/permissoes.php, ../home.php, ../legacy/bridge/sidebar.php, ./home.php, mkt_atd.php | - | MIGRATE_UI / tickets (nivel3) / read/API parity + Next UI + cutover | auto: - | `4fd2cb1e1dc5` |
| `atd_mkt/tarefa.php` | yes | POST, FILES | yes | yes | yes | ConnectionN3 | tarefas_mkt, inter_tarefa_mkt, usuarios, categorias, subcategorias | ../legacy/bridge/seguranca.php, ../legacy/bridge/conect.php, ../legacy/bridge/permissoes.php, ../legacy/bridge/token.php, ../index.php, ../legacy/bridge/loading.php, ../legacy/bridge/sidebar.php, ../legacy/bridge/update_senha.php, ../legacy/bridge/update_pass.php, busca_solicitantes.php, busca_locais.php | atd_mkt/hometarefas.php, atd_mkt/projeto.php, packages/contracts/src/tickets/ticket-project.ts | MIGRATE_WRITE / tickets (nivel3) / native command + read parity + Next UI + cutover | auto: - | `e6b9a0f50b7a` |
| `atd_projeto/dash_pro.php` | yes | - | no | no | no | - | - | - | legacy/bridge/sidebar.php | REDIRECT / tickets/devops / Next modular + API Nest com paridade operacional | override: 303 para /tickets/devops/projects; sem sessao bridge ou SQL | `c3abca5d937c` |
| `atd_projeto/home.php` | yes | - | no | no | no | - | - | - | .env.example, CHAGELOG.txt, atd_mkt/analisePeriodoMkt.php, atd_mkt/disponibilidadeTecMkt.php, atd_mkt/home.php, atd_mkt/srhomemkt.php, config/home.php, home_old.php | REDIRECT / tickets/devops / Next modular + API Nest com paridade operacional | override: 303 para /tickets/devops/projects; sem sessao bridge ou SQL | `c3abca5d937c` |
| `atd_projeto/hometarefas.php` | yes | - | no | no | no | - | - | - | - | REDIRECT / tickets/devops / Next modular + API Nest com paridade operacional | override: 303 para /tickets/devops; sem sessao bridge ou SQL | `3cdd76246fb2` |
| `atd_projeto/projeto.php` | yes | GET, POST | no | no | no | - | - | - | - | REDIRECT / tickets/devops / Next modular + API Nest com paridade operacional | override: 303 para /tickets/devops/projects[/<id>] ou /tickets/devops/projects/new; sem sessao bridge ou SQL | `3ae876c5fec6` |
| `atd_projeto/rel_analitico_tarefas.php` | yes | POST | yes | no | yes | ConnectionN3 | clientes, usuarios, tarefas, locais, pessoas, categorias, subcategorias, itens | ../legacy/bridge/seguranca.php, ../legacy/bridge/conect.php, ../legacy/bridge/permissoes.php, ../legacy/bridge/token.php, ../legacy/bridge/update_senha.php, ../legacy/bridge/sidebar.php, ../legacy/bridge/update_pass.php | - | REPORT / tickets / domain report ownership + parity + cutover | auto: - | `09c7a500badd` |
| `atd_projeto/tarefa.php` | yes | GET, POST | no | no | no | - | - | - | atd_mkt/hometarefas.php, atd_mkt/projeto.php, packages/contracts/src/tickets/ticket-project.ts | REDIRECT / tickets/devops / Next modular + API Nest com paridade operacional | override: 303 para /tickets/devops/<id> ou /tickets/new?type=devops; sem sessao bridge ou SQL | `f74f47d7d0df` |
| `melhorias/atd.php` | yes | POST | yes | yes | yes | ConnectionN3 | melhorias, interatividade_melhorias, usuarios, categorias, subcategorias, itens | ../legacy/bridge/seguranca.php, ../legacy/bridge/conect.php, ../legacy/bridge/permissoes.php, ../legacy/bridge/token.php, ../index.php, ../legacy/bridge/loading.php, ../legacy/bridge/sidebar.php, ../legacy/bridge/update_senha.php, ../legacy/bridge/update_pass.php, busca_solicitantes.php, busca_locais.php | ativos/home.php, legacy/bridge/sidebar.php, melhorias/home.php, melhorias/srhome.php | MIGRATE_WRITE / tickets / native command + read parity + Next UI + cutover | auto: - | `e103813fccc0` |
| `melhorias/busca_itens.php` | no | - | yes | no | yes | ConnectionN3 | itens | ../legacy/bridge/seguranca.php, ../legacy/bridge/conect.php | atd_mkt/projeto.php, atd_mkt/tarefa.php, melhorias/atd.php | MIGRATE_READ / tickets / native read contract + caller cutover | auto: - | `b28408a1bc5d` |
| `melhorias/busca_locais.php` | no | - | yes | no | yes | ConnectionN3 | locais | ../legacy/bridge/seguranca.php, ../legacy/bridge/conect.php | atd_3andar/js/tarefa-create.js, atd_mkt/projeto.php, atd_mkt/tarefa.php, melhorias/atd.php, rel/rel_Unificado.php, rel/rel_Unificado_Id.php, rel/rel_ti.php | MIGRATE_READ / tickets / native read contract + caller cutover | auto: - | `fe0b5921f371` |
| `melhorias/busca_solicitantes.php` | no | - | yes | no | yes | ConnectionN3 | pessoas | ../legacy/bridge/seguranca.php, ../legacy/bridge/conect.php | atd_3andar/js/tarefa-create.js, atd_mkt/projeto.php, atd_mkt/tarefa.php, melhorias/atd.php | MIGRATE_READ / tickets / native read contract + caller cutover | auto: - | `20f4122ae9ee` |
| `melhorias/busca_subcategorias.php` | no | - | yes | no | yes | ConnectionN3 | subcategorias | ../legacy/bridge/seguranca.php, ../legacy/bridge/conect.php | atd_mkt/projeto.php, atd_mkt/tarefa.php, melhorias/atd.php | MIGRATE_READ / tickets / native read contract + caller cutover | auto: - | `365b8023123a` |
| `melhorias/home.php` | yes | POST | yes | yes | yes | ConnectionN3 | configuracao, melhorias, interatividade_melhorias, clientes, pessoas, usuarios, locais, categorias, subcategorias, itens, espera | ../legacy/bridge/seguranca.php, ../legacy/bridge/conect.php, ../legacy/bridge/permissoes.php, ../index.php, ../legacy/bridge/update_senha.php, ../legacy/bridge/loading.php, ../legacy/bridge/sidebar.php, atd.php, ../legacy/bridge/update_pass.php | .env.example, CHAGELOG.txt, atd_mkt/analisePeriodoMkt.php, atd_mkt/disponibilidadeTecMkt.php, atd_mkt/home.php, atd_mkt/srhomemkt.php, config/home.php, home_old.php | MIGRATE_WRITE / tickets / native command + read parity + Next UI + cutover | auto: - | `1b4bd1ef3c91` |
| `melhorias/recorrente.php` | no | - | no | no | yes | - | - | ../legacy/bridge/seguranca.php, ../legacy/bridge/conect.php | melhorias/atd.php | BRIDGE_ONLY / tickets / zero consumers, then remove bridge dependency | auto: - | `2dc72f06a26e` |
| `melhorias/recorrente_data.php` | no | - | no | no | yes | - | - | ../legacy/bridge/seguranca.php, ../legacy/bridge/conect.php | melhorias/atd.php | BRIDGE_ONLY / tickets / zero consumers, then remove bridge dependency | auto: - | `7eaf6dac8634` |
| `melhorias/srhome.php` | yes | POST | yes | yes | yes | ConnectionN3 | configuracao, melhorias, interatividade_melhorias, clientes, pessoas, usuarios, locais, categorias, subcategorias, itens, espera | ../legacy/bridge/seguranca.php, ../legacy/bridge/conect.php, ../legacy/bridge/permissoes.php, ../index.php, ../legacy/bridge/update_senha.php, ../legacy/bridge/loading.php, ../legacy/bridge/sidebar.php, ./home.php, atd.php, ../legacy/bridge/update_pass.php | ativos/home.php | MIGRATE_WRITE / tickets / native command + read parity + Next UI + cutover | auto: - | `386c6709d02f` |
| `rel/atd_abertos_por_tecnico.php` | yes | POST | yes | no | yes | ConnectionN3 | usuarios, atendimentos, espera | ../legacy/bridge/seguranca.php, ../legacy/bridge/conect.php, ../legacy/bridge/permissoes.php, ../legacy/bridge/token.php, ../legacy/bridge/update_senha.php, ../legacy/bridge/sidebar.php, ../home.php, ../legacy/bridge/update_pass.php | legacy/bridge/sidebar.php, rel/gerar_relatorio_pdf.php, rel/js/relatorios_modern.js | REPORT / tickets/reporting / domain report ownership + parity + cutover | auto: - | `61b95503428a` |
| `rel/atd_analitico_por_cliente.php` | yes | GET, POST | yes | no | yes | ConnectionN3 | locais, clientes, atendimentos, pessoas, categorias, subcategorias, itens, usuarios | ../legacy/bridge/seguranca.php, ../legacy/bridge/conect.php, ../legacy/bridge/permissoes.php, ../legacy/bridge/token.php, ../legacy/bridge/update_senha.php, ../legacy/bridge/sidebar.php, ../legacy/bridge/update_pass.php | legacy/bridge/sidebar.php, rel/gerar_relatorio_pdf.php, rel/js/relatorios_modern.js | REPORT / tickets/reporting / domain report ownership + parity + cutover | auto: - | `e13b2b04e36a` |
| `rel/atd_analitico_por_melhoria.php` | yes | POST | yes | no | yes | ConnectionN3 | clientes, locais, melhorias, pessoas, categorias, subcategorias, itens, usuarios | ../legacy/bridge/seguranca.php, ../legacy/bridge/conect.php, ../legacy/bridge/permissoes.php, ../legacy/bridge/token.php, ../legacy/bridge/update_senha.php, ../legacy/bridge/sidebar.php, ../legacy/bridge/update_pass.php | rel/gerar_relatorio_pdf.php, rel/js/relatorios_modern.js | REPORT / tickets/reporting / domain report ownership + parity + cutover | auto: - | `6749ee652ee5` |
| `rel/atd_analitico_por_tarefa.php` | yes | GET, POST | yes | no | yes | ConnectionN3 | clientes, locais, tarefas, pessoas, categorias, subcategorias, itens, usuarios | ../legacy/bridge/seguranca.php, ../legacy/bridge/conect.php, ../legacy/bridge/permissoes.php, ../legacy/bridge/token.php, ../legacy/bridge/update_senha.php, ../legacy/bridge/sidebar.php, ../legacy/bridge/update_pass.php | legacy/bridge/sidebar.php, rel/gerar_relatorio_pdf.php, rel/js/relatorios_modern.js | REPORT / tickets/reporting / domain report ownership + parity + cutover | auto: - | `49825dd807cb` |
| `rel/atd_tempo_por_tecnico.php` | yes | POST | yes | no | yes | ConnectionN3 | usuarios, atendimentos, espera | ../legacy/bridge/seguranca.php, ../legacy/bridge/conect.php, ../legacy/bridge/permissoes.php, ../legacy/bridge/token.php, ../legacy/bridge/update_senha.php, ../legacy/bridge/sidebar.php, ../legacy/bridge/update_pass.php | legacy/bridge/sidebar.php, rel/gerar_relatorio_pdf.php, rel/js/relatorios_modern.js | REPORT / tickets/reporting / domain report ownership + parity + cutover | auto: - | `4dfa06e1b527` |
| `rel/atd_total_por_categoria.php` | yes | GET, POST | yes | no | yes | ConnectionN3 | atendimentos, categorias | ../legacy/bridge/seguranca.php, ../legacy/bridge/conect.php, ../legacy/bridge/permissoes.php, ../legacy/bridge/token.php, ../legacy/bridge/update_senha.php, ../legacy/bridge/sidebar.php, ../legacy/bridge/update_pass.php | legacy/bridge/sidebar.php, rel/gerar_relatorio_pdf.php, rel/js/relatorios_modern.js | REPORT / tickets/reporting / domain report ownership + parity + cutover | auto: - | `4195a15a0099` |
| `rel/atd_total_por_cliente.php` | yes | GET, POST | yes | no | yes | ConnectionN3 | atendimentos, clientes | ../legacy/bridge/seguranca.php, ../legacy/bridge/conect.php, ../legacy/bridge/permissoes.php, ../legacy/bridge/token.php, ../legacy/bridge/update_senha.php, ../legacy/bridge/sidebar.php, ../legacy/bridge/update_pass.php | legacy/bridge/sidebar.php, rel/gerar_relatorio_pdf.php, rel/js/relatorios_modern.js | REPORT / tickets/reporting / domain report ownership + parity + cutover | auto: - | `185870e2c3e0` |
| `rel/atd_total_por_tecnico.php` | yes | GET, POST | yes | no | yes | ConnectionN3 | atendimentos, usuarios | ../legacy/bridge/seguranca.php, ../legacy/bridge/conect.php, ../legacy/bridge/permissoes.php, ../legacy/bridge/token.php, ../legacy/bridge/update_senha.php, ../legacy/bridge/sidebar.php, ../legacy/bridge/update_pass.php | legacy/bridge/sidebar.php, rel/gerar_relatorio_pdf.php, rel/js/relatorios_modern.js | REPORT / tickets/reporting / domain report ownership + parity + cutover | auto: - | `95cccf422973` |
| `rel/gerar_relatorio_pdf.php` | yes | GET | no | no | yes | - | - | ../legacy/bridge/seguranca.php, ../legacy/bridge/permissoes.php, atd_abertos_por_tecnico.php, atd_total_por_cliente.php, atd_total_por_tecnico.php, atd_total_por_categoria.php, atd_tempo_por_tecnico.php, atd_analitico_por_cliente.php, atd_analitico_por_tarefa.php, atd_analitico_por_melhoria.php, rel_Unificado.php, rel_Unificado_Id.php | rel/js/relatorios_modern.js | REPORT / tickets/reporting / domain report ownership + parity + cutover | auto: - | `c621908476f1` |
| `rel/rel_Unificado.php` | yes | GET, POST | yes | no | yes | ConnectionN3 | clientes, atendimentos, locais, pessoas, categorias, subcategorias, itens, usuarios, tarefas | ../legacy/bridge/seguranca.php, ../legacy/bridge/conect.php, ../legacy/bridge/permissoes.php, ../legacy/bridge/token.php, ../legacy/bridge/update_senha.php, ../legacy/bridge/sidebar.php, ../legacy/bridge/update_pass.php, busca_locais.php | legacy/bridge/sidebar.php, rel/gerar_pdf.php, rel/gerar_relatorio_pdf.php, rel/js/relatorios_modern.js | REPORT / tickets/reporting / domain report ownership + parity + cutover | auto: - | `91f6763168db` |
| `rel/rel_Unificado_Id.php` | yes | GET, POST | yes | no | yes | ConnectionN3 | clientes, atendimentos, locais, pessoas, categorias, subcategorias, itens, usuarios, tarefas | ../legacy/bridge/seguranca.php, ../legacy/bridge/conect.php, ../legacy/bridge/permissoes.php, ../legacy/bridge/token.php, ../legacy/bridge/update_senha.php, ../legacy/bridge/sidebar.php, ../legacy/bridge/update_pass.php, busca_locais.php | rel/auxPDF.php, rel/gerador_PDF.py, rel/gerar_relatorio_pdf.php, rel/js/relatorios_modern.js | REPORT / tickets/reporting / domain report ownership + parity + cutover | auto: - | `fce5c39c333c` |
| `rel/rel_tempo_atd.php` | yes | GET | yes | no | yes | ConnectionN3 | usuarios | ../legacy/bridge/seguranca.php, ../legacy/bridge/conect.php, ../legacy/bridge/permissoes.php, ../legacy/bridge/app_url.php, ../legacy/bridge/sidebar.php | legacy/bridge/sidebar.php, rel/gerar_relatorio_pdf.php, rel/js/relatorios_modern.js | REPORT / tickets/reporting / domain report ownership + parity + cutover | auto: - | `4cad72aece75` |
| `rel/rel_ti.php` | yes | GET, POST | yes | no | yes | ConnectionN3 | clientes, atendimentos, locais, pessoas, categorias, subcategorias, itens, usuarios, tarefas | ../legacy/bridge/seguranca.php, ../legacy/bridge/conect.php, ../legacy/bridge/permissoes.php, ../legacy/bridge/token.php, ../legacy/bridge/update_senha.php, ../legacy/bridge/sidebar.php, ../legacy/bridge/update_pass.php, gerar_pdf.php, busca_locais.php | legacy/bridge/sidebar.php, rel/gerar_relatorio_pdf.php, rel/js/relatorios_modern.js | REPORT / tickets/reporting / domain report ownership + parity + cutover | auto: - | `d6d221542246` |

### Invariantes observaveis

- `ConnectionMkt()` e apenas um sinal de legado; nao autoriza criar datasource ou banco `mkt` no nativo.
- Arquivos em `rel/` entram neste snapshot apenas quando o conteudo demonstra acoplamento com Tickets/atendimento.
- `DEAD` e `REDIRECT` nunca sao inferidos automaticamente. Essas classes exigem prova de reachability/callers e decisao humana.
- `UNKNOWN` e gate de triagem: nenhum arquivo nessa classe pode ser removido sem classificacao manual.
- Este auditor nao altera PHP, nao cria regra no bridge e nao adiciona escrita legada.

<!-- END GENERATED 0044A -->
