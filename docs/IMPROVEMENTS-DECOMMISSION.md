# Desativação do módulo legado de melhorias

## Decisão

O módulo operacional PHP em `melhorias/` não possui uso atual e não será migrado 1:1 para NestJS/Next.js.

A retirada é somente de código. Não há migration de banco, redirect PHP, API operacional nova ou alteração de status dos registros históricos.

## Auditoria de dados

A verificação realizada em 14/09/2026 no banco `nivel3` encontrou:

- 186 registros em `melhorias`;
- primeira abertura em 06/10/2023 10:01:00;
- última abertura em 09/09/2025 11:15:00;
- último fechamento em 06/10/2025 11:00:37;
- status preservados: 8 no status 1, 28 no status 2, 148 no status 4 e 2 no status 5;
- 1.131 registros em `interatividade_melhorias`, entre 06/10/2023 10:02:27 e 06/10/2025 11:00:37;
- nenhuma interação órfã em relação a `melhorias`;
- nenhuma referência órfã de cliente ou técnico nos registros auditados.

Os 36 registros que permanecem nos status 1 ou 2 são mantidos exatamente como estão. A desativação do runtime não deve concluir, reclassificar ou excluir dados automaticamente.

## Dados preservados

As tabelas abaixo permanecem fora do escopo desta limpeza:

- `melhorias`;
- `interatividade_melhorias`.

Também não deve ser feita limpeza da tabela compartilhada `espera` com base apenas em IDs do antigo módulo. Qualquer retenção, arquivamento ou exclusão de dados exige uma decisão separada.

## Consumidor moderno mantido

O relatório analítico nativo continua aceitando `source=improvements` e consulta diretamente a tabela `melhorias` por meio do módulo de relatórios NestJS. Portanto, `melhorias` continua sendo dado histórico ativo para leitura, mesmo sem existir um módulo operacional de melhorias.

A navegação Next mantém apenas esse acesso de relatório em `/reports/tickets/analytics?source=improvements`. Não deve ser recriada uma lista operacional apenas para substituir os PHPs removidos.

## O que foi aposentado

São removidos os nove PHPs da pasta `melhorias/`:

- `atd.php`;
- `home.php`;
- `srhome.php`;
- `busca_itens.php`;
- `busca_locais.php`;
- `busca_solicitantes.php`;
- `busca_subcategorias.php`;
- `recorrente.php`;
- `recorrente_data.php`.

A auditoria do repositório não encontrou rota moderna apontando para esses entry points. O antigo relatório PHP específico já não existe na branch de modernização; o consumidor mantido é o relatório Nest/Next.

## Distinção importante

O nome "Melhorias" também aparece como tipo de atendimento em partes do domínio geral de tickets. Esse uso não deve ser removido automaticamente: ele pertence ao fluxo de `atendimentos` e é diferente do módulo histórico independente baseado na tabela `melhorias`.

## Critério de encerramento

A capacidade independente de melhorias passa a ser considerada `decommissioned`:

- não existe runtime PHP em `melhorias/`;
- não existe substituição operacional Nest/Next 1:1;
- `melhorias` e `interatividade_melhorias` continuam preservadas;
- o relatório histórico nativo continua permitido;
- qualquer retomada futura deve partir de requisitos atuais, e não da tradução direta do PHP removido.
