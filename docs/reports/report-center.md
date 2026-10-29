# Central de relatórios

A navegação de Relatórios contém quatro entradas:

| Grupo | Endereço |
| --- | --- |
| Relatórios Atendimentos | `/relatorios/atendimentos` |
| Relatórios Tarefas/Projetos | `/relatorios/tarefas-projetos` |
| Tempo de Atendimento (aceite e conclusão) | `/relatorios/atendimentos/tempo-aceite-conclusao` |
| Gerar PDF | `/relatorios/arquivos` |

Atendimentos apresenta apenas os filtros correspondentes à visualização selecionada, nesta ordem:

| Relatório | Filtros |
| --- | --- |
| Total por cliente | Período, nível, cliente, setor |
| Diário por cliente | Período, cliente |
| Por solicitante | Período, cliente, nível, situação |
| Total por técnico | Período, setor, técnico, nível |
| Diário por técnico | Período, setor, técnico, nível |
| Por categoria | Período, cliente, categoria, setor, técnico, nível |

Ao trocar de relatório, os filtros comuns são preservados. Campos que deixam de existir voltam ao padrão, tanto no formulário quanto na consulta aplicada; se necessário, os resultados são carregados novamente. Alterações ainda não aplicadas nos campos comuns continuam pendentes até clicar em Aplicar filtros. Atendimentos consulta chamados; Tarefas/Projetos mantém a seleção entre tarefas e projetos e seus filtros completos, incluindo local e área da categoria. As consultas respeitam o escopo de clientes e o limite de 20 mil registros, sem resultados parciais silenciosos.

Na mesma página, o usuário alterna entre os seis relatórios de atendimentos. Tarefas/Projetos oferece também agrupamentos por projeto e situação. A troca utiliza os mesmos registros quando não há filtros incompatíveis aplicados. Cada registro conta uma vez por agrupamento. Níveis fora de 1, 2 e 3 são apresentados em Outros níveis. Gráficos com muitos grupos reúnem os 20 maiores e os demais; resumo e CSV preservam todos os grupos.

Em Atendimentos há seis botões antes dos filtros: Atd. total por cliente, Atd. diário por cliente, Atd. total por solicitante, Atd. total por técnico, Atd. diário por técnico e Atd. total por categoria. O título, gráfico e resumo acompanham a opção escolhida. Administradores globais entram em DevOps; a função antiga Técnico continua distinta de Tecnico TI.

Os registros detalhados incluem títulos, projetos, cliente, local, técnico e função, solicitante, classificação, datas, situação, descrições e tempo decorrido. As tabelas usam páginas de 50 registros para navegação. CSV inclui todo o resultado filtrado; imprimir renderiza todas as páginas e abre as descrições temporariamente, restaurando a visualização depois. O PDF analítico usa os filtros aplicados no servidor. Seu botão fica desabilitado com busca textual ou filtro de menção ativos, para evitar gerar um PDF diferente da seleção local; nesse caso continuam disponíveis CSV e impressão do resultado exibido.

Tempo de Atendimento reúne aceite/conclusão, tempo decorrido e carga atual em três visões no mesmo endereço. O arquivo de PDFs preserva geração, visualização, download, seleção em lote e retenção existentes. Links antigos continuam funcionando, mas as páginas antigas saem do menu principal.

## Zabbix e chamados sem técnico

Não se presume que todo chamado sem técnico venha do Zabbix. Na consulta somente leitura de 01 a 28/10/2026, havia 185 registros sem usuário técnico correspondente; 47 mencionavam Zabbix na descrição de abertura. A presença desse texto não prova a origem dos demais registros. Os números variam conforme novos chamados entram.

A central mostra a quantidade de registros com menção ao Zabbix e permite filtrar com ou sem menção no texto de abertura/fechamento. A classificação aparece como menção textual, sem alterar registros nem reclassificar técnicos ou setores.

## API e segurança

`source=projects` foi adicionado à análise, consultando `projetos`. `source=tasks` inclui nome da tarefa, ID e nome do projeto. O filtro opcional `projectId` é permitido somente nessas duas fontes, com parâmetro vinculado. A lista de projetos é carregada com `GET /api/reports/tickets/catalog?projects=1`, também restrita ao cliente/escopo do usuário. Nomes de projetos associados a uma tarefa só são retornados quando o cliente do projeto corresponde ao cliente da tarefa, para evitar exposição por vínculos legados inconsistentes.

As permissões continuam `reports.read` para consulta e `reports.pdf` para a API de PDFs e o arquivo. O menu e os links de grupo respeitam essas permissões. Nenhuma migração, renomeação de função ou alteração de dados é necessária.

Validação: `pnpm build`, `pnpm test:navigation`, `pnpm test:reports:center`, `pnpm test:reports:center:ui`, `pnpm test:reports:daily`, `pnpm test:reports:sectors` e `pnpm test:reports`. Os testes SQL usam CTEs simuladas, sem escrever em registros reais. O teste de navegador verifica a navegação, agrupamentos sem requisições extras, preservação de totais, exportação/impressão completa, menção ao Zabbix, projetos, visões de tempo, permissões e celular.

Capturas com dados simulados: [desktop](report-center-desktop.png) e [celular](report-center-mobile.png).

Validação concluída em 28/10/2026: build completo aprovado, 34 testes de navegação, agrupamento, SQL Server, escopo, projetos e relatórios aprovados. Os testes de navegador da central e do arquivo de PDFs passaram, incluindo impressão de todas as páginas/descrições e permissões. A conferência somente leitura no banco real executou consultas de atendimentos, tarefas e projetos e carregou 44 projetos no catálogo do usuário interno de conferência. Nenhum registro real foi modificado e nenhum PDF real foi gerado pelos testes.

Em 29/10/2026, os seis botões de Atendimentos foram posicionados acima dos filtros. O bloco de diagnóstico de setores, a lista de técnicos reconhecidos e a explicação sobre Zabbix foram removidos da área de resultados. O teste de navegador verifica a posição dos botões no computador e no celular, a ausência do bloco removido e a preservação dos totais sem novas consultas.

A validação dos filtros por relatório verifica os campos e sua ordem nas seis opções, a limpeza de setor e nível ao abrir Diário por cliente e a atualização dos resultados sem restrições ocultas. Build e teste de navegador aprovados.
