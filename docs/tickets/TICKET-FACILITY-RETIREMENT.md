# 0044c12 — aposentadoria do Facility

## Objetivo

Facility não é mais um tipo oficial de ticket do Helpdesk. Este corte remove a
implementação nativa temporária criada durante a migração e transforma o PHP
restante de `atd_facility/` em compatibilidade de aposentadoria, sem sessão,
`legacy/bridge/` ou acesso a banco.

Os tipos oficiais continuam sendo:

- Atendimento;
- DevOps;
- Marketing.

## API nativa Facility removida

A implementação criada anteriormente para `/tickets/facilities` já havia sido
desregistrada do `TicketsModule`. Este corte remove fisicamente os contratos,
casos de uso, port, repository Prisma e controller que ficaram mortos no
repositório.

Não existe endpoint Facility ativo na API depois deste corte.

## PHP de atendimento Facility

As páginas de atendimento não executam mais regras de negócio:

```text
atd_facility/home.php
atd_facility/atd.php
atd_facility/dash_pro.php
```

Elas são tombstones de compatibilidade e respondem com redirect HTTP 303 para:

```text
/tickets
```

Os antigos endpoints auxiliares:

```text
atd_facility/busca_itens.php
atd_facility/busca_locais.php
atd_facility/busca_solicitantes.php
atd_facility/busca_subcategorias.php
```

respondem HTTP 410 (`Gone`) em JSON. Eles não carregam sessão PHP, bridge,
permissões ou conexão de banco.

## Agenda de veículos pertence a Logistics

`atd_facility/agenda.php` não é um ticket Facility. A funcionalidade manipula a
agenda de veículos e já possui implementação nativa no domínio Logistics.

O tombstone redireciona com HTTP 303 para:

```text
/logistics/vehicles/agenda
```

A API nativa correspondente permanece sob:

```text
/logistics/vehicles/agenda
```

Portanto, não existe port da agenda para o módulo Tickets.

## Banco de dados

Este corte não remove tabelas históricas. Dados existentes de Facility podem
continuar no `nivel3` para consulta histórica ou descarte posterior controlado.

Em particular, este corte não executa `DROP TABLE` e não cria migration para:

- `facility`;
- `inter_facility`;
- registros históricos de espera relacionados ao Facility.

A regra é apenas: não criar novos writes Facility em Nest ou PHP.

## Auditoria do inventário

Os oito PHPs continuam fisicamente no repositório enquanto servem como
compatibilidade/tombstone. Por isso o inventário gerado precisa ser atualizado
após a aplicação do patch para recalcular os fingerprints dos arquivos:

```bash
bash scripts/audit-ticket-family-legacy.sh --write
bash scripts/audit-ticket-family-legacy.sh --check
```

As classificações passam a ser:

- `REDIRECT` para `agenda.php`, `home.php`, `atd.php` e `dash_pro.php`;
- `DEAD` para os quatro endpoints auxiliares que retornam HTTP 410.

## Remoção física futura do PHP

Os tombstones podem ser apagados quando não houver mais bookmarks, links,
includes, AJAX ou outros callers apontando para `atd_facility/`.

A remoção física deve acontecer em um corte posterior e deve atualizar o
inventário pelo audit em vez de desabilitar ou relaxar a auditoria.

## Invariantes

1. Facility não é registrado no criador modular de tickets;
2. não existe controller `/tickets/facilities` ativo;
3. não existe write Facility na API;
4. os tombstones PHP não carregam `legacy/bridge/`;
5. os tombstones PHP não abrem sessão nem banco;
6. a agenda de veículos pertence somente a Logistics;
7. não existe datasource novo;
8. nenhuma tabela é criada, alterada ou removida neste corte.
