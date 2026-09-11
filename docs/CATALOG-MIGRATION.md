# Migração do catálogo legado

## Decisão

O catálogo em `catlg/` será migrado para NestJS/Next.js antes da aposentadoria dos PHPs. Diferentemente de um módulo sem uso, o catálogo participa do fluxo de atendimento e ainda possui comportamento que precisa existir de forma nativa antes do cutover.

A pasta não deve ser removida enquanto houver consumidores externos ou enquanto a resolução contextual de catálogo usada pelos atendimentos não estiver coberta pelo novo módulo.

## Superfície legada

A pasta contém cinco entry points PHP conhecidos:

- `catlg/catalogo.php`: listagem, filtros e manutenção do catálogo;
- `catlg/catalogo_visualizar.php`: visualização do conteúdo de um catálogo;
- `catlg/catalogo_editar.php`: edição dos registros;
- `catlg/check_catlg.php`: apoio à descoberta/verificação de catálogos;
- `catlg/localizar_catalogo.php`: resolução de catálogo a partir do contexto do atendimento.

`localizar_catalogo.php` é a dependência mais importante para o cutover: o comportamento legado recebe contexto como cliente, categoria e atendimento e decide entre abrir um catálogo, apresentar múltiplas opções ou continuar o fluxo sem catálogo.

## Dados

O catálogo usa o datasource já existente de `nivel3`. Não criar um novo banco ou cliente Prisma para esta migração.

O schema Prisma atual já contém os modelos necessários para iniciar o módulo:

- `catalogos`: `id`, `setor`, `catalogo_categoria`, `cliente_id`, `titulo`, `conteudo`, datas e `usuario_id`;
- `catalogos_categoria`: categorias próprias do catálogo;
- `categorias`: categorias operacionais usadas no contexto de atendimentos;
- `clientes`: cadastro de clientes associado aos catálogos.

A modelagem nativa deve encapsular esses detalhes no módulo de catálogo em vez de espalhar consultas diretas pelo módulo de tickets.

## Permissões e setor

O PHP usa o valor legado `m8_04` para decidir acesso por setor e ações de gerenciamento. Esse valor é uma regra de compatibilidade e não deve aparecer no domínio novo.

A migração deve criar permissões explícitas seguindo o padrão de `AppPermission`, separando ao menos leitura e gerenciamento. A compatibilidade com `m8_04`, enquanto necessária, deve ficar concentrada no tradutor de permissões legado. Restrições de TI/DevOps devem ser representadas por escopo/setor nativo, não por testes de números mágicos espalhados pela aplicação.

## Sequência de migração

1. Inventariar referências externas para os cinco PHPs e registrar os consumidores atuais.
2. Implementar API nativa de leitura: lista, detalhe e resolução contextual usada por atendimentos.
3. Adicionar permissões nativas e operações de escrita necessárias para criar, editar e excluir catálogos.
4. Implementar a interface Next.js e trocar a integração de tickets para a API nativa.
5. Executar a auditoria em modo estrito e remover qualquer referência restante a `catlg/*.php`.
6. Excluir `catlg/`, registrar os endpoints na auditoria geral de legado e executar typecheck/build.

## Auditoria

O comando desta etapa é:

```bash
pnpm legacy:catalog:audit
```

Durante a fase `inventory`, referências externas são listadas como dependências a migrar e não causam falha. Isso permite usar a saída como checklist para os próximos patches.

O mesmo script possui um modo estrito para o futuro cutover:

```bash
node scripts/audit-catalog-legacy.mjs --strict
```

Nesse modo, a auditoria falha enquanto existir qualquer arquivo em `catlg/` ou runtime externo apontando para os endpoints conhecidos.

## Critério para aposentadoria

`catlg/` só pode entrar na lista de diretórios aposentados quando a API/UI nativas cobrirem o comportamento necessário, a integração de atendimentos estiver apontando para o fluxo nativo e a auditoria estrita retornar sem arquivos ou referências legadas.
