# Relatórios gerados

A página organiza a geração em dois blocos: período e seleção de clientes. Os campos de data ficam alinhados no topo; a lista tem busca, checkboxes na mesma linha dos nomes, seleção de até 50 clientes e indicação do limite. No celular, o botão de geração aparece após os clientes e o cabeçalho ocupa duas linhas para preservar o título.

O arquivo de relatórios apresenta quantidade de PDFs, tamanho total, prazo de disponibilidade, seleção de arquivos e ações de download ou exclusão em lote. A seleção parcial é indicada no checkbox do cabeçalho. Há feedback de carregamento, geração, falhas parciais e ausência de arquivos. Os nomes longos quebram linha; a tabela tem rolagem horizontal dentro do cartão em telas estreitas.

Validação em 28/10/2026: build completo e 13 testes de relatórios aprovados. O teste de navegador cobriu busca e preservação da seleção de clientes, limite de 50, geração, download individual, ZIP, exclusão com confirmação, falha parcial e tela de 390 px. As operações usaram arquivos simulados e nenhuma exceção JavaScript foi registrada.

Executar: `pnpm build`, `pnpm test:reports` e `pnpm test:reports:archive:ui`.

Capturas com dados simulados: [desktop](report-archive-desktop.png) e [celular](report-archive-mobile.png).
