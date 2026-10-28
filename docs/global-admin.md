# Administrador global

A função protegida **Administrador global** corresponde ao perfil interno `system-admin` e concede acesso administrativo global. Usuários com `usuarios.criar` também podem cadastrar, editar e desativar contas comuns; `usuarios.permissoes_extras` autoriza a definição de permissões extras. A consulta continua disponível com `usuarios.visualizar`. Somente administradores globais podem atribuir a função global ou alterar seus integrantes. A troca da própria senha segue o fluxo de autenticação existente.

## Implantação

1. Compilar com `pnpm build`.
2. Executar explicitamente `pnpm access:provision-global-admin` antes de reiniciar a API nova.
3. Executar `pnpm test:global-admin`, `pnpm test:user-functions`, `pnpm test:access` e `pnpm test:user-functions:ui`.
4. Reiniciar API e frontend com a configuração PM2 do ambiente.

O provisionamento é transacional e idempotente. Adiciona `cargos_n3.is_global_admin` com valor padrão falso e índice único filtrado, cria a função reservada e vincula exclusivamente os usuários que já possuem `system-admin`. A função anterior desses administradores é substituída; as outras funções e contas são preservadas. Nenhum usuário comum recebe acesso global. Sem administrador ativo ou em caso de conflito com um nome existente, a transação é revertida. O comando retorna contagens e ID da função, sem credenciais.

Para conceder acesso global, um administrador global edita o usuário e seleciona **Administrador global** no campo Função. Ao escolher outra função, o vínculo `system-admin` é removido na mesma transação. Alterações administrativas são serializadas pelo registro do perfil, a autorização do ator é conferida novamente no banco (incluindo permissões da função, permissões individuais e negações explícitas) e a remoção/desativação do último administrador ativo é bloqueada. Cada requisição recalcula o acesso no banco, sem confiar nas permissões antigas do navegador.

A função reservada não pode ser renomeada, desativada, excluída nem ter suas permissões editadas. Não é possível conceder acesso global apenas criando uma função com nome parecido ou enviando campos adicionais ao cadastro comum de funções.

O comando existente `pnpm access:grant-system-admin -- <id>` continua disponível como recuperação operacional e sincroniza a função visível quando provisionada. Seu uso concede acesso global explicitamente ao usuário informado; não faz parte de rotinas automáticas.

Os testes SQL utilizam exclusivamente tabelas temporárias com nomes únicos e transações revertidas. O teste de navegador intercepta todas as chamadas à API e não altera contas reais.

## Validação local — 28/10/2026

- Build completo concluído sem erros.
- Testes de acesso, segurança, funções e administração global aprovados (16 testes).
- Teste de concorrência confirmou que duas desativações simultâneas deixam um administrador ativo.
- Navegador validou função protegida, criação/edição com permissões delegadas e consulta sem edição para quem não tem permissão. O aviso aparece apenas quando a permissão da ação está ausente. Nenhuma exceção JavaScript.
- Função provisionada com ID 20, preservando os três administradores globais ativos existentes. Reexecução confirmou idempotência, sem novas reatribuições.
