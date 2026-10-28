# Relatórios gerados

A página organiza a geração em dois blocos: período e seleção de clientes. Os campos de data ficam alinhados no topo; a lista tem busca, checkboxes na mesma linha dos nomes, seleção de até 50 clientes e indicação do limite. No celular, o botão de geração aparece após os clientes e o cabeçalho ocupa duas linhas para preservar o título.

O catálogo desta página (`GET /api/reports/archive/catalog`) lista apenas clientes ativos com TI (`clt_ti = 1`) ou DevOps (`clt_adm = 1`) habilitado. Clientes exclusivamente de Marketing não aparecem; clientes que combinam Marketing com TI ou DevOps continuam elegíveis. A mesma condição é verificada novamente em `POST /api/reports/archive/generate`, antes de gerar qualquer arquivo, respeitando também o escopo de clientes do usuário. Testar essa regra com `pnpm test:reports:clients` (fixtures de consulta no SQL Server, sem alterações de dados).

A validação do filtro passou em 16 testes de relatórios e no navegador. A consulta de conferência no banco local retornou 95 clientes ativos elegíveis, sem gerar ou alterar arquivos reais.

O arquivo de relatórios apresenta quantidade de PDFs, tamanho total, prazo de disponibilidade, seleção de arquivos e ações de download ou exclusão em lote. A seleção parcial é indicada no checkbox do cabeçalho. Há feedback de carregamento, geração, falhas parciais e ausência de arquivos. Os nomes longos quebram linha; a tabela tem rolagem horizontal dentro do cartão em telas estreitas.

Validação em 28/10/2026: build completo e 13 testes de relatórios aprovados. O teste de navegador cobriu busca e preservação da seleção de clientes, limite de 50, geração, download individual, ZIP, exclusão com confirmação, falha parcial e tela de 390 px. As operações usaram arquivos simulados e nenhuma exceção JavaScript foi registrada.

Executar: `pnpm build`, `pnpm test:reports` e `pnpm test:reports:archive:ui`.

Novos PDFs seguem `Relatorio_nomecliente_nivel3ti.pdf`, com acentos removidos e caracteres especiais substituídos por sublinhado. Gerações repetidas recebem `_2`, `_3` etc.; a criação exclusiva protege inclusive contra sobrescrita em gerações simultâneas. PDFs antigos mantêm seus nomes e continuam disponíveis.

A coluna Ações contém ícones de visualização e download, com descrição acessível. A visualização abre um diálogo na página, carrega o PDF com a sessão autenticada e libera a URL temporária ao fechar. `GET /api/reports/archive/:name/preview` exige as mesmas permissões e validações de caminho do download, usa disposição `inline` e não permite cache. O catálogo continua restrito a clientes ativos de TI ou DevOps; atualizar os dados também remove seleções que deixaram de ser elegíveis.

Os testes adicionais verificam nomes seguros, gerações concorrentes sem sobrescrita, autorização da visualização e envio do nome do cliente ao armazenamento. O teste de navegador cobre abertura e fechamento da visualização e botões por ícone, com PDF simulado válido.

Capturas com dados simulados: [desktop](report-archive-desktop.png) e [celular](report-archive-mobile.png).
