# Desativação do módulo legado de ativos

## Decisão

O módulo PHP em `ativos/` está inativo e não será migrado 1:1 para NestJS/Next.js neste ciclo de modernização.

A decisão é remover o runtime legado de forma controlada. Não serão criados redirects PHP porque esses endpoints não estão em produção e não existe cutover de usuários a preservar.

## O que está sendo aposentado

A pasta mistura responsabilidades que, em uma eventual reconstrução, não devem necessariamente permanecer no mesmo domínio:

- inventário automático de computadores e dados de hardware;
- programas instalados e processos coletados;
- comandos enviados ao agente de inventário;
- pesquisa e exportação de inventário;
- downloads do agente;
- cadastro de patrimônio físico, imagens, localização, responsável e garantia.

Também existem arquivos históricos ou deslocados de contexto, como `ativos_antiga.php` e `home.php`, que não devem ser usados como base arquitetural para uma solução nova.

## Dados

A retirada do código não autoriza apagar bancos, tabelas ou histórico.

Os dados usados pelo legado estão principalmente em:

- `plugins_app`: inventário técnico, programas, processos e comandos;
- `patrimonios`: patrimônio físico e imagens.

Essas bases devem permanecer fora do escopo da limpeza até existir uma decisão explícita de retenção, arquivamento ou migração de dados.

Não adicionar `plugins_app` ou `patrimonios` ao Prisma apenas para suportar a retirada do PHP. Sem consumidor nativo, isso criaria integração sem necessidade operacional.

## Estado da retirada

A auditoria anterior à remoção confirmou que nenhum runtime fora de `ativos/` aponta para os 19 endpoints PHP conhecidos do módulo.

Nesta etapa, os 19 PHPs de `ativos/` são retirados do repositório. Os bancos `plugins_app` e `patrimonios` continuam preservados e não fazem parte da exclusão.

Depois da retirada do runtime, permanecem duas verificações de limpeza:

1. procurar CSS, imagens, includes e outras dependências que tenham ficado órfãs;
2. executar auditoria geral de legado, typecheck e build do monorepo.

O comando de proteção desta etapa é:

```bash
pnpm legacy:assets:audit
```

Após esta etapa, o comando falha em duas situações: se qualquer arquivo voltar a existir em `ativos/` ou se algum runtime externo apontar para um dos endpoints PHP aposentados.

## Possível evolução futura

Se inventário de ativos voltar a ter prioridade operacional, ele deve ser projetado como funcionalidade nativa com requisitos atuais, e não como tradução direta dos PHPs removidos.

Uma separação inicial a reavaliar seria:

- inventário técnico de dispositivos;
- software/processos e estado da coleta;
- monitoramento/alertas do endpoint;
- patrimônio físico como contexto separado quando suas regras justificarem isso.

A existência dos bancos legados pode servir como referência de dados, mas não define a arquitetura futura.
