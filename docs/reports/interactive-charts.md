# Gráficos interativos dos relatórios

Os componentes compartilhados de barras, pizza e rosca permitem explorar cada item pelo mouse, foco do teclado ou toque. A legenda de pizza e rosca destaca a fatia correspondente. Clicar fixa o item; clicar novamente, usar Escape ou Limpar destaque desfaz a seleção. O painel mostra nome completo, total, participação percentual e quantidades dos níveis 1, 2 e 3.

O destaque é visual: não altera os filtros, os dados da tabela nem a exportação CSV. Pizza e rosca preservam o agrupamento dos nove maiores itens e Outros quando existem mais de dez itens. Na impressão e no PDF do navegador, todos os itens aparecem com opacidade integral e o painel de interação fica oculto. Arquivos PDF gerados pelo servidor continuam estáticos.

Não há dependência de serviços externos ou bibliotecas adicionais. Animações respeitam a preferência de movimento reduzido; legenda e barras usam botões acessíveis, e as fatias aceitam Tab, Enter e Espaço. URLs, permissões e consultas permanecem nas rotas existentes.

Validar com `pnpm build` e `pnpm test:reports:charts:ui`. O teste abre a página por cliente com dados simulados, sem modificar o banco. Cobre barras, pizza, rosca, destaque ao passar o mouse, seleção persistente, teclado, celular, impressão, agrupamento, uma única fatia e ausência de dados.

Validação em 28/10/2026: build completo aprovado e teste no Edge aprovado, incluindo eventos de toque no celular e estilos de impressão, sem exceções JavaScript. [Captura do destaque com dados simulados](interactive-charts.png).
