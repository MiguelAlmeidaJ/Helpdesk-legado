# Funções de usuários — consulta de usuários ativos

A página passa a separar consulta e edição. A entrada mostra funções em cards com situação, quantidade de permissões e prévia dos usuários ativos. Selecionar uma função abre os nomes e logins dos usuários, com busca e paginação de 30 registros. O resumo mostra funções cadastradas, usuários ativos, ativos com função e ativos sem função; o último card abre a lista para revisão.

O formulário não é renderizado na entrada. **Nova função** e **Editar função** abrem uma janela com foco no nome, navegação por teclado, fechamento com Escape e retorno do foco ao botão. As permissões ficam agrupadas em módulos expansíveis. A exclusão fica disponível nos detalhes e na edição quando não há usuários ativos. Cadastros inativos vinculados são preservados e ficam sem função; a confirmação explica esse efeito. Com usuários ativos, a interface bloqueia o botão e a API responde com conflito.

`GET /api/user-functions/active-users` retorna somente ID, nome, login e ID da função para usuários com `user_sts = 1`. A consulta inclui funções inativas ainda cadastradas como vínculos válidos. Funções vazias, zeradas ou inexistentes entram em **sem função**. Os totais derivam da mesma consulta que retorna os usuários. O endpoint exige sessão e `system.admin`, e usa `Cache-Control: private, no-store`.

Validação:

- Build completo do monorepo aprovado.
- `pnpm test:user-functions`: SQL Server com fixtures CTE somente de leitura, cobrindo usuários inativos, função inativa e vínculos nulos, zero ou inexistentes; HTTP 401/403/200 com o guard real de permissões.
- `pnpm test:user-functions:ui`: navegador Edge com API totalmente simulada; formulário fechado na entrada, listas de usuários, busca, paginação, criação/edição/exclusão, foco, Escape e largura mobile. Nenhuma exceção JavaScript.
- Consulta somente de leitura no banco da instalação: 19 funções, 55 usuários ativos, 55 com função e zero sem função. Os totais por função coincidiram com o resumo anterior. Esses números são uma conferência desta entrega; a tela sempre consulta os valores atuais.
- Nenhuma alteração de esquema permanente ou escrita em cadastros reais. Operações de teste usam a API simulada do navegador e tabelas temporárias com rollback no SQL Server.

## Exclusão sem usuários ativos

A API verifica os usuários e remove a função na mesma transação. Antes da exclusão, limpa somente a atribuição da função nos cadastros não ativos, sem excluir esses usuários ou alterar suas situações. O papel de permissões da função é removido como no fluxo anterior. Bloqueios transacionais protegem a conferência e o cadastro; a criação/edição de usuários confere a existência da função dentro da própria transação, evitando que um formulário antigo atribua uma função já excluída.

`pnpm test:user-functions` também testa exclusão sem vínculos, preservação de inativos, bloqueio por ativos, função inexistente, rollback após falha e recusa de atribuição a função excluída. Essas operações usam exclusivamente tabelas temporárias do SQL Server em uma transação revertida; nenhum cadastro real é removido. O teste de navegador inclui exclusão com dois vínculos inativos simulados e o aviso de preservação.

## Prévia com dados sintéticos

![Resumo e funções cadastradas](reports/user-functions-overview.png)

![Usuários ativos da função selecionada](reports/user-functions-members.png)

![Formulário aberto por solicitação](reports/user-functions-editor.png)
