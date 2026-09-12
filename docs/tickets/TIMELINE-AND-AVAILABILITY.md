# Timeline e Disponibilidade Técnica

## Timeline

O legado `atd/timeline.php` é um feed global de auditoria e não o histórico de
um único atendimento. A migração preserva a janela de 24 horas:

```text
GET /api/tickets/audit/timeline?limit=200
GET /tickets/timeline
```

O limite padrão é 200 e a API aceita até 500 eventos.

A permissão vem de `módulo 8, posição 0` (`m8_00 >= 1`) e é traduzida para
`TicketsAudit`. Para RBAC, `atendimentos.auditar` é aceito quando existir; por
compatibilidade, `atendimentos.editar_terceiros` também concede auditoria.

## Disponibilidade Técnica

```text
GET /api/tickets/availability/dashboard
GET /tickets/availability
```

O painel preserva as capacidades operacionais relevantes do PHP:

- técnicos ativos das funções 5, 6, 10, 12 e 14;
- técnicos ocupados por atendimento `status = 2`;
- aguardando execução (`status = 1`);
- agendados (`status = 0`);
- em espera (`status = 3`) agrupados pela última causa;
- quantidade histórica de entradas em espera;
- finalizados/concluídos hoje, seguindo o mesmo critério de `fechamento`;
- navegação para cada atendimento.

A presença online deixa de inspecionar arquivos `sess_*`. A fonte passa a ser
`api_sessions`, considerando sessão não revogada, não expirada e usada nos
últimos 10 minutos.

## Relatório de esperas

O FPDF legado é substituído por:

```text
GET /api/tickets/availability/waiting-report.pdf
GET /tickets/availability/waiting-report
```

A rota Next faz proxy autenticado para a API. O PDF usa fontes base do próprio
formato, portanto não adiciona uma biblioteca de PDF ao monorepo.

## Bridges PHP

Durante o smoke test, `atd/timeline.php`,
`atd/disponibilidade/index.php` e
`atd/disponibilidade/relatorio_espera_pdf.php` são transformados em bridges de
navegação no topo do arquivo. `__halt_compiler()` impede o PHP de compilar o
código legado restante.

Depois de validar as três rotas novas em produção/homologação, esses arquivos
podem ser removidos fisicamente junto dos assets exclusivos da pasta.
