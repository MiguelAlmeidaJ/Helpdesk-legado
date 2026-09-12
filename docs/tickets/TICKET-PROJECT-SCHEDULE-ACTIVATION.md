# 0044c5 — ativação nativa de projetos e tarefas agendados

O legado não possui um scheduler real para `atd_projeto`. A ativação de registros
agendados ocorre como efeito colateral ao abrir as páginas de listagem:

- `atd_projeto/home.php` procura `projetos.status = 0` e, quando `agora > abertura`,
  altera o projeto para status `1` e registra `inter_projeto.inter_tipo = 1`;
- `atd_projeto/hometarefas.php` faz a mesma operação para `tarefas`, registrando
  `inter_tarefa.inter_tipo = 1`.

Isso significa que um agendamento pode permanecer em status `0` indefinidamente
se ninguém abrir a tela PHP correspondente.

## Boundary nativo

O `0044c5` move esse comportamento para o processo NestJS. Não existe endpoint
HTTP para disparar a operação e não existe nova permissão de usuário.

`TicketProjectScheduleActivationRunner`:

1. executa uma ativação assim que o módulo Tickets inicia;
2. repete o processo a cada 60 segundos por padrão;
3. impede sobreposição de execuções dentro da mesma instância;
4. registra falhas no logger e tenta novamente no próximo ciclo.

O intervalo pode ser configurado por:

```text
TICKET_PROJECT_SCHEDULE_ACTIVATION_INTERVAL_MS=60000
```

O valor `0` desabilita o runner. Valores menores que 5000ms ou inválidos voltam
para o padrão de 60000ms.

## Semântica preservada

A condição SQL é `abertura < NOW()`, equivalente ao `agora > abertura` usado
pelo PHP.

Para cada registro ativado:

- status `0` passa para `1`;
- a interação usa `inter_tipo = 1`;
- o ator continua sendo o usuário de sistema histórico `1`;
- a descrição legada é preservada, inclusive a palavra `atendimento` na
  interação automática de tarefa.

Não há alteração de técnico, classificação, data de abertura ou projeto pai.
Uma tarefa vencida é ativada independentemente do status do projeto, porque esse
é o comportamento atual do legado.

## Concorrência e idempotência

Projetos e tarefas são processados em transações separadas para não introduzir
ordem de locks cruzada com os workflows já migrados.

Cada batch:

1. seleciona somente registros ainda em status `0` e vencidos;
2. bloqueia os IDs selecionados com `FOR UPDATE`;
3. atualiza apenas os mesmos IDs ainda elegíveis;
4. grava as interações dentro da mesma transação.

Assim, duas instâncias da API podem executar o runner sem criar duas interações
para a mesma transição.

O serviço processa batches de 200 registros, até 20 batches por ciclo para cada
tipo. Se o limite for atingido, o restante fica para o próximo ciclo.

## Cutover

Depois deste patch, a ativação agendada de `projetos` e `tarefas` passa a ter
owner nativo. Os blocos equivalentes em `atd_projeto/home.php` e
`atd_projeto/hometarefas.php` ainda não são apagados neste subcorte; a remoção
fica para parity/cutover/tombstones, quando a UI PHP deixar de ser autoridade.

Ainda permanecem no estágio `0044c` os writes das demais famílias de Tickets
(`atd_facility`, `atd_mkt`, `melhorias` e outros itens classificados como
`MIGRATE_WRITE` no inventário 0044a).

## Invariantes

1. Nenhum consumidor novo de `legacy/bridge/`.
2. Nenhum PHP novo ou nova escrita PHP.
3. Nenhum datasource `mkt`.
4. Toda ativação nova ocorre no `nivel3` via NestJS.
5. O runner não depende de sessão PHP nem de uma página ser acessada.
6. O comando é idempotente em relação ao status `0 -> 1`.

## Validação

```bash
git apply --check 0044c5-ticket-project-schedule-activation.patch
git apply 0044c5-ticket-project-schedule-activation.patch

git diff --check
pnpm typecheck
pnpm build

bash scripts/audit-ticket-family-legacy.sh --check
```

Depois dos gates, o commit é manual.
