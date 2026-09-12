# Migração do catálogo legado

## Decisão

O catálogo de `catlg/` foi migrado para NestJS/Next.js antes da aposentadoria dos PHPs. Diferentemente de um módulo descontinuado, a capacidade foi preservada porque participa do fluxo de atendimento.

A remoção foi executada somente depois que gestão, verificação, visualização e resolução contextual passaram a existir no módulo nativo e deixaram de depender dos entry points PHP.

## Estado atual

O inventário inicial encontrou os cinco PHPs esperados e nenhuma referência de runtime fora de `catlg/`. A API nativa agora cobre leitura e as mutações existentes no legado: criação e edição, com validação de cliente/categoria e autorização de gestão por setor.

As permissões legadas de `m8_04` ficam concentradas no tradutor de sessão e são convertidas para permissões semânticas de leitura/gestão por setor (TI e DevOps). O valor numérico legado não deve ser consultado pelo módulo de catálogo.

A interface Next.js nativa agora está disponível em `/catalog`, cobrindo listagem, filtros, visualização segura do conteúdo, criação e edição. A UI usa as permissões semânticas `read`/`manage` por setor e consome somente a API NestJS.

A verificação de cobertura antes oferecida por `check_catlg.php` está disponível em `/catalog/check`, com matriz cliente × categoria e filtro por setor permitido.

A integração contextual do detalhe de atendimento também é nativa: o usuário escolhe uma categoria de catálogo, a UI resolve os registros pelo cliente com `catalog/resolve` e carrega o conteúdo por `catalog/:id`. Nenhum fluxo nativo depende de `catlg/*.php`.

`catlg/` foi removido após o cutover. O legado não possuía fluxo de exclusão de catálogo, portanto a API e as interfaces novas também não introduzem exclusão destrutiva sem requisito funcional.

## Superfície legada aposentada

A pasta removida continha cinco entry points PHP conhecidos:

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

A implementação nativa usa permissões explícitas seguindo o padrão de `AppPermission`, separando leitura e gerenciamento. A compatibilidade com `m8_04` permanece concentrada no tradutor de permissões legado enquanto sessões antigas ainda existirem. Restrições de TI/DevOps são representadas por permissões de setor, sem testes de números mágicos no módulo de catálogo.

## Sequência de migração

1. ~~Inventariar referências externas para os cinco PHPs e registrar os consumidores atuais.~~ Concluído; nenhuma referência externa encontrada.
2. ~~Implementar API nativa de leitura: lista, detalhe e resolução contextual usada por atendimentos.~~ Concluído nesta etapa.
3. ~~Adicionar operações nativas de escrita para criar e editar catálogos usando permissões `manage`.~~ Concluído nesta etapa; o legado não possui exclusão.
4. ~~Implementar a interface Next.js nativa para listar, visualizar, criar e editar catálogos.~~ Concluído nesta etapa em `/catalog`.
5. ~~Trocar a integração contextual de tickets para a API nativa de catálogo.~~ Concluído nesta etapa no detalhe nativo do atendimento.
6. ~~Migrar a verificação de cobertura de `check_catlg.php`.~~ Concluído em `/catalog/check`.
7. ~~Executar a auditoria em modo estrito e remover qualquer referência restante a `catlg/*.php`.~~ Concluído na aposentadoria.
8. ~~Excluir `catlg/`, registrar os endpoints na auditoria geral de legado e executar typecheck/build.~~ Concluído na aposentadoria.

## Auditoria

O gate específico do catálogo agora é estrito por padrão:

```bash
pnpm legacy:catalog:audit
```

Para validar toda a aposentadoria, incluindo a auditoria geral, typecheck e build, use:

```bash
pnpm legacy:catalog:verify
```

`legacy:catalog:audit` falha se qualquer arquivo voltar a aparecer em `catlg/` ou se algum runtime voltar a apontar para os cinco endpoints PHP aposentados. A auditoria central também registra `catlg/` como diretório aposentado.

## Critério para aposentadoria

Critério atendido: API e UIs nativas cobrem gestão, visualização, verificação e resolução contextual; a integração de atendimentos usa o fluxo nativo; `catlg/` está removido; e `pnpm legacy:catalog:verify` é o gate final contra regressões.
