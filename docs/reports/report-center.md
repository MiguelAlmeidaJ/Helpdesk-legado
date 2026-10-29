# Central de relatórios

A navegação de Relatórios contém quatro entradas:

| Grupo | Endereço |
| --- | --- |
| Relatórios Atendimentos | `/relatorios/atendimentos` |
| Relatórios Tarefas/Projetos | `/relatorios/tarefas-projetos` |
| Tempo de Atendimento (aceite e conclusão) | `/relatorios/atendimentos/tempo-aceite-conclusao` |
| Gerar PDF | `/relatorios/arquivos` |

As duas primeiras centrais compartilham filtros por período, cliente, setor, técnico, categoria e situação, além de local e área da categoria nos filtros adicionais. Atendimentos oferece também nível; Tarefas/Projetos permite selecionar o projeto e alternar entre tarefas e projetos. As consultas usam a API de relatórios existente, respeitando o escopo de clientes e o limite de 20 mil registros, sem resultados parciais silenciosos.

Na mesma página, o usuário alterna entre cliente, técnico, categoria, solicitante, diário por cliente, diário por técnico e situação. Em Tarefas/Projetos existe também agrupamento por projeto. A troca de visualização é local: utiliza os mesmos registros e mantém filtros, totais e busca. Cada registro conta uma vez por agrupamento. Níveis fora de 1, 2 e 3 são apresentados em Outros níveis. Gráficos com muitos grupos reúnem os 20 maiores e os demais; resumo e CSV preservam todos os grupos.

Em Atendimentos há seis botões explícitos: Atd. total por cliente, Atd. diário por cliente, Atd. total por solicitante, Atd. total por técnico, Atd. diário por técnico e Atd. total por categoria. O título, gráfico e resumo acompanham a opção escolhida sem recarregar os registros. O painel Técnicos ativos reconhecidos lista nomes, funções e setores do catálogo. Administradores globais entram em DevOps; a função antiga Técnico continua distinta de Tecnico TI.

Os registros detalhados incluem títulos, projetos, cliente, local, técnico e função, solicitante, classificação, datas, situação, descrições e tempo decorrido. As tabelas usam páginas de 50 registros para navegação. CSV inclui todo o resultado filtrado; imprimir renderiza todas as páginas e abre as descrições temporariamente, restaurando a visualização depois. O PDF analítico usa os filtros aplicados no servidor. Seu botão fica desabilitado com busca textual ou filtro de menção ativos, para evitar gerar um PDF diferente da seleção local; nesse caso continuam disponíveis CSV e impressão do resultado exibido.

Tempo de Atendimento reúne aceite/conclusão, tempo decorrido e carga atual em três visões no mesmo endereço. O arquivo de PDFs preserva geração, visualização, download, seleção em lote e retenção existentes. Links antigos continuam funcionando, mas as páginas antigas saem do menu principal.

## Zabbix e chamados sem técnico

Não se presume que todo chamado sem técnico venha do Zabbix. Na consulta somente leitura de 01 a 28/10/2026, havia 185 registros sem usuário técnico correspondente; 47 mencionavam Zabbix na descrição de abertura. A presença desse texto não prova a origem dos demais registros. Os números variam conforme novos chamados entram.

A central mostra a quantidade de registros com menção ao Zabbix e permite filtrar com ou sem menção no texto de abertura/fechamento. A classificação aparece como menção textual, sem alterar registros nem reclassificar técnicos ou setores. A divisão TI, DevOps, outras funções e sem técnico acompanha o resultado efetivamente exibido.

## API e segurança

`source=projects` foi adicionado à análise, consultando `projetos`. `source=tasks` inclui nome da tarefa, ID e nome do projeto. O filtro opcional `projectId` é permitido somente nessas duas fontes, com parâmetro vinculado. A lista de projetos é carregada com `GET /api/reports/tickets/catalog?projects=1`, também restrita ao cliente/escopo do usuário. Nomes de projetos associados a uma tarefa só são retornados quando o cliente do projeto corresponde ao cliente da tarefa, para evitar exposição por vínculos legados inconsistentes.

As permissões continuam `reports.read` para consulta e `reports.pdf` para a API de PDFs e o arquivo. O menu e os links de grupo respeitam essas permissões. Nenhuma migração, renomeação de função ou alteração de dados é necessária.

Validação: `pnpm build`, `pnpm test:navigation`, `pnpm test:reports:center`, `pnpm test:reports:center:ui`, `pnpm test:reports:daily`, `pnpm test:reports:sectors` e `pnpm test:reports`. Os testes SQL usam CTEs simuladas, sem escrever em registros reais. O teste de navegador verifica a navegação, agrupamentos sem requisições extras, preservação de totais, exportação/impressão completa, menção ao Zabbix, projetos, visões de tempo, permissões e celular.

Capturas com dados simulados: [desktop](report-center-desktop.png) e [celular](report-center-mobile.png).

Validação concluída em 28/10/2026: build completo aprovado, 34 testes de navegação, agrupamento, SQL Server, escopo, projetos e relatórios aprovados. Os testes de navegador da central e do arquivo de PDFs passaram, incluindo impressão de todas as páginas/descrições e permissões. A conferência somente leitura no banco real executou consultas de atendimentos, tarefas e projetos e carregou 44 projetos no catálogo do usuário interno de conferência. Nenhum registro real foi modificado e nenhum PDF real foi gerado pelos testes.

Em 29/10/2026, a separação de Atendimentos foi explicitada nos seis botões e no título da visualização. O painel de técnicos reconhecidos mostra a função e o setor de cada usuário ativo. O teste de navegador valida os seis botões, a preservação dos totais sem novas consultas e a presença de administradores globais na lista DevOps. Os 27 testes de relatórios, SQL Server, agrupamentos e projetos passaram após a alteração.
