# Gerenciamento de navegação

## Objetivo

A navegação do Helpdesk passa a ter uma fonte persistente para que administradores possam organizar o sidebar sem alterar código a cada nova página migrada.

O gerenciamento do menu é apenas uma camada de apresentação. Ocultar um item nunca substitui as verificações de autorização das rotas e APIs.

## Fundação de acesso

A role nativa `system-admin` é traduzida para `AppPermission.SystemAdmin`. Ela é concedida explicitamente pelo comando abaixo; não existe regra especial por ID de usuário:

```bash
pnpm access:grant-system-admin -- 157
```

A role histórica `administrador` não é convertida automaticamente em acesso global. Isso evita elevar usuários existentes sem uma decisão explícita.

## Navegação persistente

As tabelas `navigation_sections` e `navigation_items` armazenam grupos e itens do sidebar. Elas controlam nome, sigla, URL, ordem, status `available`/`planned`, estado ativo e condição de visibilidade.

O bootstrap cria as tabelas e importa o menu inicial de forma idempotente:

```bash
pnpm navigation:bootstrap
```

O bootstrap usa `INSERT IGNORE`: itens já existentes não são sobrescritos. Isso é importante porque, a partir da tela administrativa, a configuração persistida passa a ser a fonte de verdade.

## API e sidebar dinâmico

`GET /api/navigation` retorna somente as seções e itens ativos que o usuário autenticado pode visualizar, respeitando `sort_order`.

O sidebar consulta essa API no navegador. Se a API estiver indisponível, mantém a configuração estática compilada como fallback para não bloquear a navegação durante uma falha transitória.

O bootstrap também corrige páginas nativas que já existiam mas ainda estavam marcadas como migração no menu, incluindo rotas de DevOps, Marketing e administração de RDs.

## Condições de visibilidade

`visibility_condition` usa apenas JSON declarativo. Não há execução de JavaScript, SQL ou expressões arbitrárias.

Exemplo com qualquer uma das permissões:

```json
{
  "anyPermissions": ["catalog.ti.read", "catalog.devops.read"]
}
```

Também são aceitos:

```json
{
  "allPermissions": ["tickets.read", "tickets.audit"],
  "anyRoles": ["quality", "sector_manager"]
}
```

As regras são combinadas com `AND`: quando mais de um grupo é informado, todos os grupos precisam ser satisfeitos. Dentro de `anyPermissions` e `anyRoles`, basta uma correspondência. `allPermissions` exige todas.

Condição nula significa visível para qualquer usuário autenticado. JSON inválido ou com chaves desconhecidas é tratado como não visível. `AppPermission.SystemAdmin` ignora as condições de menu e visualiza todos os itens ativos.

## Páginas migradas importadas nesta fase

Além dos itens que já estavam disponíveis, o seed passa a expor as rotas nativas existentes para projetos e tarefas DevOps, tarefas de Marketing, análise e relatório de RDs, manutenção de RD, aprovação de RDs e pagamento de RDs. A visibilidade segue permissões semânticas quando elas já existem no núcleo de acesso.

## Próxima fase

A próxima fase adicionará `/admin/navigation`, restrita a `system.admin`, para criar, editar, ativar, desativar e reorganizar seções e itens sem editar o banco manualmente.
