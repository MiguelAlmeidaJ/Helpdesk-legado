# Auditoria da navegação — 21/09/2026

Conferência das páginas Next.js, componentes e APIs NestJS em relação aos 56 itens
do menu padrão: **35 disponíveis e 21 pendentes**. Disponível significa que existe
um fluxo nativo implementado; não declara paridade integral com todas as regras do legado.

## Itens corrigidos

| Item que aparecia em migração | Destino disponível | Evidência |
| --- | --- | --- |
| Recorrências | `/atendimentos/recorrencias` | `ticket-recurrences-screen.tsx`, `TicketRecurrencesController` e `ManageTicketRecurrences`: consulta, criação, edição, ativação e modelos |
| DevOps: Nova Tarefa | `/atendimentos/novo?type=devops` | `ModularTicketCreateScreen`, `DevOpsTicketCreateController`: criação independente ou vinculada a projeto |
| Marketing: Criar Nova Tarefa | `/atendimentos/novo?type=marketing` | `ModularTicketCreateScreen` e API de criação de Marketing |

## Disponíveis por seção

| Seção | Itens implementados |
| --- | --- |
| Principal (1) | Painel operacional |
| Atendimentos (5) | Lista, recorrências, disponibilidade técnica, linha do tempo e novo atendimento |
| DevOps (4) | Lista de projetos, lista de tarefas, novo projeto e nova tarefa |
| Marketing (2) | Lista de tarefas e criação de tarefa |
| Logística (8) | Agenda de veículos; RD pessoal, gestão, análise comparativa, relatório, cadastro de despesas, aprovação e pagamento |
| Relatórios (11) | Totais por cliente, técnico e categoria; tempo médio; analíticos por cliente e tarefa; unificado; somente TI; histórico de melhorias; tempo de atendimento; arquivos/PDF |
| Cadastros (3) | Usuários, catálogos e verificação de catálogos |
| Administração (1) | Gestão da navegação |

Detalhes e relatórios de tarefas DevOps/Marketing também têm páginas nativas,
acessíveis a partir das respectivas listas. Não são itens adicionais do menu padrão.

## Ainda pendentes no menu

| Seção | Itens sem fluxo nativo correspondente |
| --- | --- |
| Marketing (1) | Disponibilidade técnica específica de Marketing |
| Financeiro em Logística (6) | Contas a receber por competência; contas a receber por fluxo; contas a pagar; lançamentos; recorrentes financeiros; contabilidade |
| Relatórios (3) | Atendimento diário por cliente; por solicitante; diário por técnico |
| Cadastros (9) | Clientes; categorias; centros de custo; classificação contábil; índices de reajuste; formas de pagamento; tipos de despesa; tipos de serviço; tipos de taxas |
| Outros (2) | Rádio e extratos |

Os filtros de data dos relatórios de totais não implementam o agrupamento diário
dos relatórios pendentes. Seletores de clientes/categorias/tipos existentes nos
formulários também não equivalem aos respectivos cadastros completos.
Recorrências de **atendimentos** estão disponíveis; recorrentes **financeiros**
continuam pendentes. A disponibilidade técnica existente atende o fluxo de TI,
não a fila específica de Marketing.

## Correção e atualização

O erro HTTP 500 em Navegação vinha de IDs `INT UNSIGNED` retornados como `bigint`
pelo driver MariaDB. As respostas administrativas agora convertem os IDs para
números, inclusive na criação de seções e itens. Esses IDs de 32 bits cabem com
precisão em `number`.

As regras de visibilidade aceitam listas opcionais vazias produzidas pelo próprio
editor, mantendo a restrição efetiva de permissões/papéis. Regras inválidas
continuam ocultando o item para usuários sem administração global.

`packages/contracts/src/navigation/default-navigation.ts` reúne os padrões usados
pelo banco e pelo menu de reserva. `web-routes.ts` relaciona os endereços antigos
aos novos; os antigos redirecionam preservando IDs e parâmetros. APIs e permissões
mantêm seus identificadores internos.

Depois de atualizar e compilar o código, executar:

```sh
pnpm navigation:bootstrap
pnpm test:navigation
```

O bootstrap cria estruturas ausentes, inclui padrões faltantes e sincroniza links
em uma transação. Preserva ordem, seção, nomes personalizados, itens ocultos e
regras de acesso existentes. Só promove os três itens auditados quando ainda
estão planejados e sem destino; destinos personalizados são preservados. Repetir
a sincronização não modifica novamente os itens já atualizados.
