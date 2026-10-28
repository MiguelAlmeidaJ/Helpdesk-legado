# Filtro Setor nos relatórios

Opções: Todos (`all`, padrão), TI (`ti`) e DevOps (`devops`). A classificação usa a função atual do técnico responsável pelo registro, vinculando `usuarios.user_funcao` a `cargos_n3.cargo_id`. Não usa IDs fixos de funções nem o setor da categoria.

| Setor | Funções |
| --- | --- |
| TI | Gestor TI, Analista TI, Tecnico TI |
| DevOps | Gestor DevOps, Analista DevOps, Tecnico DevOps |

Os nomes ignoram maiúsculas, espaços nas extremidades e o acento em Técnico. Funções com outros nomes não são classificadas automaticamente. Na conferência do banco local em 28/10/2026 existiam nomes antigos como Técnico, Gerente DevOps e Supervisor DevOps; nenhum cadastro foi renomeado ou alterado. Gestor TI, Tecnico TI e Gestor DevOps ainda não existiam.

O filtro alcança totais por cliente, categoria e técnico; agrupamentos diários e por solicitante; análise, tempo, tarefas, melhorias, relatório unificado; tempo de aceite e conclusão; carga dos técnicos e PDFs arquivados. Os gráficos, tabelas e exportações usam as consultas filtradas. O setor aplicado aparece no relatório e no PDF analítico.

Todos mantém registros sem técnico ou com funções diferentes nas consultas de atendimentos, tarefas e melhorias. TI e DevOps retornam somente registros cujo responsável corresponda às funções acima, inclusive registros históricos de usuários hoje inativos. O seletor e o quadro de carga mostram técnicos ativos das seis funções. Mudar de setor limpa a seleção de técnicos para evitar combinação incompatível. Os filtros de cliente e as permissões continuam aplicados em conjunto.

As APIs aceitam `sector=all|ti|devops`; a geração do arquivo PDF aceita `sector` no corpo JSON. Ausência do parâmetro equivale a Todos. Valores desconhecidos são rejeitados. O filtro usa parâmetros SQL vinculados, sem migração de esquema ou alteração de dados.

Validação: `pnpm build`, `pnpm test:reports`, `pnpm test:reports:clients`, `pnpm test:reports:sectors`, `pnpm test:reports:sectors:ui`, `pnpm test:reports:archive:ui`. Os testes de setor usam CTEs com dados simulados no SQL Server e páginas com APIs interceptadas, sem alterações em registros reais.

Validação concluída em 28/10/2026: build aprovado, 24 testes de backend/SQL Server aprovados, dez páginas de relatórios verificadas nos três setores e fluxo do arquivo de PDFs aprovado no navegador. A consulta de conferência, somente leitura, encontrou quatro técnicos ativos classificados como TI e cinco como DevOps. Foi corrigida também a agregação da carga dos técnicos para usar `SUM(CASE WHEN ...)`, compatível com SQL Server; essa consulta é executada pelos testes de setor.
