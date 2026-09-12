# 0044d3 — detalhe operacional DevOps e Marketing no Next

## Objetivo

Conectar as telas de detalhe introduzidas no 0044d2 aos comandos NestJS já migrados, sem reintroduzir escrita PHP e sem criar outro workflow paralelo no frontend.

## DevOps

A tela `/tickets/devops/:id` passa a consumir os comandos existentes em `/tickets/projects/tasks/:taskId/*`:

- interação;
- iniciar/direcionar;
- espera e retomada;
- recusa/redirecionamento;
- finalização;
- atualização de progresso;
- listagem, inclusão, substituição e exclusão de imagens JPEG.

Tarefas avulsas e tarefas agrupadas em projeto usam o mesmo workflow porque ambas permanecem armazenadas em `tarefas`.

A tela `/tickets/devops/projects/:id` também passa a expor o workflow já existente de projetos: interação, assignment, espera/retomada, recusa/redirecionamento e finalização.

## Marketing

A tela `/tickets/marketing/:id` passa a consumir o workflow nativo já implementado em `/tickets/marketing/:ticketId/*`:

- interação;
- iniciar/direcionar;
- espera e retomada;
- recusa/redirecionamento;
- finalização.

Após cada comando o detalhe é recarregado, incluindo o histórico de `inter_terc_andar` já retornado pela API.

## Autorização

O Next não replica as regras `m5`/`m8`. Ele apresenta ações compatíveis com o estado atual e envia a intenção para a API. O Nest continua sendo a autoridade para:

- permissão por tipo;
- escopo próprio/terceiros;
- estados válidos;
- dependências DevOps;
- técnico válido;
- espera ativa;
- finalização.

Respostas 403/409/400 são apresentadas ao usuário com a mensagem devolvida pela API.

## Técnicos

Para DevOps, a UI tenta primeiro o catálogo do criador. Usuários com leitura/operação mas sem permissão de criação usam como fallback as opções da listagem DevOps. O usuário autenticado é sempre incluído localmente como opção para a ação "Iniciar comigo"; a API continua validando se a operação é permitida.

Marketing reutiliza o catálogo nativo de Marketing, que já exige apenas acesso de leitura ao tipo.

## Imagens DevOps

O painel usa os endpoints já migrados de `imagens_tarefa` e preserva a regra existente de aceitar somente JPEG. Não existe upload PHP nem novo storage.

## Fora deste corte

- edição/classificação estrutural por tipo;
- timeline detalhada nativa de DevOps (o detalhe continua exibindo `lastActivityAt` enquanto Marketing já possui timeline completa);
- alteração da navegação lateral global;
- novos endpoints de negócio;
- nova tabela central de tickets.
