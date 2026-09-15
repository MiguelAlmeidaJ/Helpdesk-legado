# 0044c11 — acesso específico do tipo DevOps

## Objetivo

Este corte torna `user_modulo_05` (m5) a autoridade transitória de autorização
para as rotas nativas de DevOps enquanto os nomes/contratos `Project/Task`
continuam preservados para compatibilidade.

Antes deste corte os controllers de `/tickets/projects/**` ainda usavam o
`PermissionsGuard` genérico, cujos grants históricos vêm do módulo de
Atendimento (`m3`). Isso podia bloquear um usuário com acesso DevOps válido e
sem acesso ao Atendimento, ou aplicar ao DevOps o escopo operacional de m3.

## Regra nativa

`DevOpsPermissionsGuard` lê o snapshot já fornecido por
`TicketTypeAccessRepository` e traduz `user_modulo_05` somente durante a
requisição DevOps:

| operação nativa | regra m5 |
| --- | --- |
| leitura/interação | `m5_00 >= 1` |
| criação | `m5_01 >= 2` |
| edição/classificação | `m5_01 >= 3` |
| executar/finalizar/progresso/imagens | `m5_02 >= 2` |
| espera/retomada | `m5_03 >= 2` + execução própria ou `m5_05` |
| recusa/redirecionamento | `m5_04 >= 2` |
| atuar em registros de terceiros | `m5_05 >= 2` |

`SystemAdmin` continua com bypass.

Sem `m5_05`, grants operacionais são sintetizados com `PermissionScope.Own`.
Com `m5_05`, o escopo é `All`. Leitura e criação permanecem `All`; restrições de
clientes parceiros continuam sendo aplicadas pelos repositories existentes.

Os grants sintéticos são anexados somente ao `AuthenticatedRequest` corrente e
colocados antes dos grants genéricos. Nenhuma sessão, usuário ou tabela de RBAC é
alterada.

## Compatibilidade

Os application services e repositories de Projects/Tasks não são reescritos
neste corte. Eles continuam consumindo `resolveTicketReadAccess` e
`resolveTicketOperationAccess`; o guard fornece a eles a visão de grants baseada
em m5 para a requisição DevOps.

Isso mantém intactos:

- URLs `/tickets/projects/**`;
- tabelas `projetos`, `tarefas`, `inter_projeto`, `inter_tarefa` e esperas;
- regras de concorrência e `FOR UPDATE` já migradas;
- dependências, progresso e imagens;
- runner de ativação agendada.

## Facility

Facility continua fora do registry e sem providers/controllers registrados no
`TicketsModule`. A remoção física dos arquivos nativos do antigo 0044c6 e o
cutover/tombstone dos PHPs Facility ficam para o próximo corte, para não misturar
uma mudança de autorização com deleções de legado.

## Invariantes

1. não altera schema ou dados;
2. não cria datasource;
3. não adiciona PHP ou `legacy/bridge`;
4. m3 continua sendo a autoridade de Atendimento;
5. m5 passa a ser a autoridade das rotas DevOps;
6. m8 continua sendo a autoridade do módulo Marketing;
7. não altera URLs públicas.

## Validação

```bash
git apply --check 0044c11-devops-type-access.patch
git apply 0044c11-devops-type-access.patch

git diff --check
pnpm typecheck
pnpm build

bash scripts/audit-ticket-family-legacy.sh --check
```
