# Agenda de Veículos

A Agenda de Veículos é atendida pelo stack nativo NestJS/Next.

## Rotas

```text
GET    /api/logistics/vehicles/agenda?month=9&year=2026
POST   /api/logistics/vehicles/agenda/schedules
PATCH  /api/logistics/vehicles/agenda/schedules/:id
DELETE /api/logistics/vehicles/agenda/schedules/:id
POST   /api/logistics/vehicles/agenda/schedules/:id/move
POST   /api/logistics/vehicles/agenda/schedules/:id/duplicate
POST   /api/logistics/vehicles/agenda/undo

POST   /api/logistics/vehicles/agenda/vehicles
PATCH  /api/logistics/vehicles/agenda/vehicles/:id
DELETE /api/logistics/vehicles/agenda/vehicles/:id
```

A interface Next fica em `/logistics/vehicles/agenda`.

## Paridade legada

O módulo 9, posição 1, continua sendo a origem de compatibilidade:

- nível 1: leitura da agenda;
- nível 2 ou superior: criação, edição, exclusão, movimentação, duplicação,
  desfazer e gestão de veículos.

A tradução RBAC reconhece os slugs `logistica.agenda.visualizar` e
`logistica.agenda.gerenciar`, mantendo fallback para o valor legado enquanto
esse modelo de permissão permanecer em uso.

A visibilidade privada preserva as funções administrativas históricas
`1, 2, 3, 9, 10, 18`. Usuários externos continuam limitados aos clientes
vinculados em `clientes_usuarios`.

## Fluxos preservados

- conflito por veículo + data + horário;
- movimentação por arrastar e soltar;
- copiar/colar agendamento;
- histórico da última movimentação e desfazer por usuário;
- arquivamento exige KM inicial/final e bloqueia nova edição;
- veículos ativos compõem a grade e o catálogo administrativo lista também
  inativos;
- impressão usa a mesma grade Next via `window.print()`.

## Estado atual

A lógica e os entry points PHP da agenda e do relatório foram removidos.
A rota `/logistics/vehicles/agenda` é a única interface mantida, e a impressão
é executada pela própria tela Next depois do carregamento dos dados.

Não há bridge PHP ou stylesheet específico da implementação antiga.
