# Gerenciamento de navegação

## Objetivo

A navegação do Helpdesk ainda é definida estaticamente no frontend. Esta migração introduz uma fonte persistente para que administradores possam organizar o sidebar sem alterar código a cada nova página migrada.

O gerenciamento do menu é apenas uma camada de apresentação. Ocultar um item nunca substitui as verificações de autorização das rotas e APIs.

## Fase 1: fundação

Este patch cria a base para as próximas etapas:

- role nativa `system-admin` para administração global;
- tradução da role `system-admin` para `AppPermission.SystemAdmin`;
- comando idempotente para conceder a role a um usuário existente;
- tabelas `navigation_sections` e `navigation_items`;
- campo `visibility_condition` reservado para condições estruturadas de acesso;
- comandos de bootstrap sem alteração imediata do sidebar atual.

A role existente `administrador` não é convertida automaticamente em acesso global. Isso evita elevar usuários existentes sem uma decisão explícita.

## Provisionamento

Com as variáveis de banco configuradas no `.env` da raiz:

```bash
pnpm navigation:bootstrap
pnpm access:grant-system-admin -- 157
```

Os dois comandos são idempotentes e podem ser executados novamente.

`access:grant-system-admin` não contém regra especial para o usuário 157. O ID é um argumento do comando e pode ser usado para provisionar outro administrador global no futuro.

## Modelo de navegação

`navigation_sections` representa os grupos principais do sidebar. Cada seção possui slug, nome, sigla opcional, ordem e estado ativo.

`navigation_items` representa as páginas dentro de uma seção. Cada item possui slug, nome, URL opcional, status, ordem, estado ativo e uma condição de visibilidade opcional.

Nesta fase `visibility_condition` é armazenada como texto JSON, mas ainda não é executada pelo frontend. A API da próxima fase validará apenas formatos declarativos conhecidos; não haverá execução de JavaScript, SQL ou expressões arbitrárias.

Formato planejado para condições:

```json
{
  "anyPermissions": ["catalog.ti.read", "catalog.devops.read"]
}
```

Também serão suportadas combinações controladas como `allPermissions` e `anyRoles`. Condição nula significa item disponível para qualquer usuário autenticado, sujeito às proteções da rota de destino.

## Próximas fases

A fase seguinte fará a leitura da configuração pela API, importará o menu estático atual e conectará o sidebar à fonte persistente com fallback seguro. Depois será adicionada a tela administrativa para criar, editar, ativar, desativar e reorganizar seções e itens.
