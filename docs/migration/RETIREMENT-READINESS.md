# Retirement readiness — PHP -> Nest/Next

Baseline deste corte: `7a55e59`.

## O que este estágio resolve

Este corte estabiliza capacidades já migradas antes de continuar apagando PHP:

- abertura de atendimento volta a usar os mesmos catálogos operacionais do PHP;
- `datetime-local` deixa de sofrer conversão implícita para UTC;
- notificações de tickets passam por `api_outbox_events`;
- o worker ganha processamento assíncrono e heartbeat da outbox;
- um auditor mostra referências PHP pendentes e candidatos realmente órfãos.

## Paridade da abertura

`/tickets/new` passa a usar um catálogo próprio de criação:

- tipos: 2, 3, 4 e 6;
- categorias: ativas com `cat_setor = 1`;
- níveis: 0..6, incluindo `6 = Tarefa`;
- prioridades: 1..4;
- formas: 1..4;
- técnicos: somente usuários ativos da allowlist legada;
- usuários externos (`tipo_usuario = 2`) continuam limitados às empresas de
  `clientes_usuarios` e não recebem pré-direcionamento de técnico;
- solicitante/local `0` é aceito quando o cliente não possui cadastro;
- reincidência continua usando cliente + categoria + subcategoria nos últimos
  30 dias.

Subcategoria e item usados pela tela de criação agora têm endpoints próprios
protegidos por `TicketsCreate`, sem depender de `TicketsRead`.

## Datas e timezone

Campos `datetime-local` trafegam como wall-clock:

```text
YYYY-MM-DDTHH:mm
```

A API valida a data sem aplicar timezone. O MariaDB/MySQL converte para
`DATETIME`, e `Agendado x Aguardando execução` usa `NOW()` do próprio banco.

Para recorrência mensal por dia da semana (`rule = 7`), a API deriva `semana`
da primeira recorrência:

- dias 1..7 -> 1;
- 8..14 -> 2;
- 15..21 -> 3;
- 22..28 -> 4;
- após dia 28 -> 0, interpretado pelo worker como última ocorrência.

## Outbox de notificações

As seguintes mutações gravam evento na mesma transação do atendimento:

- abertura manual;
- abertura gerada por recorrência;
- colocar em espera;
- retomada manual;
- retomada automática;
- concluir;
- finalizar.

Destinatários são resolvidos no processamento a partir de:

- `clientes.clt_mail`;
- `pessoas.pessoa_mail`;
- `usuarios.user_mail` do técnico.

O envio é `at-least-once`. O `Message-ID` é estável por evento da outbox, mas
SMTP não participa da transação do banco.

### Ativação

Comece com:

```env
TICKET_NOTIFICATION_EMAIL_ENABLED=false
```

Faça operações de teste e confira a fila:

```sql
SELECT id, aggregate_id, event_type, attempts, processed_at, last_error
FROM api_outbox_events
WHERE aggregate_type = 'ticket'
ORDER BY created_at DESC
LIMIT 20;
```

Depois configure SMTP, altere:

```env
TICKET_NOTIFICATION_EMAIL_ENABLED=true
```

e reinicie:

```bash
pnpm pm2:restart
pm2 logs helpdesk-ticket-worker
```

## Auditoria do PHP

Execute:

```bash
pnpm legacy:audit
```

O script:

1. falha se runtime ainda apontar para endpoints PHP já removidos;
2. classifica `atd/busca_*` e `atd/recorrente*` como `KEEP`, `ORPHAN` ou
   `REMOVED`;
3. mostra a quantidade de PHP restante por pasta.

`ORPHAN` é candidato para o próximo retirement commit. O auditor
deliberadamente não apaga arquivos.

## Gate do próximo corte

Antes de remover mais PHP:

```bash
pnpm legacy:audit
pnpm typecheck
pnpm build
pnpm pm2:restart
pm2 status
```

Smoke test mínimo:

```text
login/logout
recuperação/troca de senha
CRUD de usuários
lista/detalhe de atendimento
nova interação
aceitar/direcionar
recusar/devolver
espera/retomada
concluir/finalizar
classificação
anexos
abertura imediata
abertura agendada
recorrência
```

Só depois disso um arquivo `ORPHAN` deve ser apagado junto com includes,
links, AJAX e CSS/JS mortos da mesma capacidade.
