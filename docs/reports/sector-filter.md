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

## Reconciliação e relatórios diários

Os erros 500 nos agrupamentos diários eram causados por selecionar a data formatada e agrupar por uma expressão diferente. O SQL Server exige que a expressão selecionada esteja no agrupamento. Cliente diário e técnico diário agora agrupam pela mesma data formatada usada no resultado.

O resumo mostra a divisão do conjunto filtrado: TI, DevOps, outras funções e sem técnico localizado. As quatro parcelas somam o total. Registros sem usuário correspondente ao técnico são apresentados no último grupo; usuários existentes com funções não mapeadas entram em outras funções. A classificação não foi alterada para distribuir artificialmente esses registros entre TI e DevOps.

Conferência somente leitura para 01 a 28/10/2026, níveis 1 a 3, todos os clientes e status maior que zero:

| Classificação atual | Chamados |
| --- | ---: |
| Analista TI | 84 |
| Analista DevOps | 28 |
| Função antiga Técnico | 100 |
| Atendente Qualidade | 8 |
| Administrador global | 7 |
| Sem técnico localizado | 184 |
| Total | 411 |

Assim, outras funções soma 115 e, com os 184 sem técnico localizado, explica os 299 chamados fora de TI e DevOps.

O detalhamento dos totais e agrupamentos envia `levels=1,2,3` quando o filtro de nível é Todos, para usar o mesmo conjunto do gráfico. A análise independente continua aceitando os níveis 1 a 5. O parâmetro `levels` é validado e usa valores vinculados na consulta SQL.

`pnpm test:reports:daily` executa os três modos de agrupamento no SQL Server com CTEs de teste, incluindo horários distintos no mesmo dia, limite de data final, escopo de cliente, níveis e totais por setor. O teste compara cada agrupamento com o detalhamento e verifica a soma das quatro parcelas, sem alterar dados reais.

Após a correção: build aprovado, 23 testes (`reports`, `reports:sectors`, `reports:daily`) aprovados e dez páginas verificadas no navegador, incluindo o resumo de classificação. A consulta real dos três modos confirmou 411 em Todos, 84 em TI e 28 em DevOps, com detalhamento de 411 = 84 + 28 + 115 + 184. Nenhum registro foi alterado.
