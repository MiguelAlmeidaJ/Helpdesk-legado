const { test } = require('node:test');
const assert = require('node:assert/strict');

require('../apps/api/node_modules/reflect-metadata');

const base = '../apps/api/dist/modules/logistics/application/';
const { ExpenseManagementService } = require(base + 'expense-management.service');
const { ExpenseApprovalService } = require(base + 'expense-approval.service');
const { ExpensePaymentService } = require(base + 'expense-payment.service');
const { VehicleAgendaService } = require(base + 'vehicle-agenda.service');

async function rejectsStatus(action, status, message) {
  await assert.rejects(
    action,
    error =>
      error?.getStatus?.() === status &&
      (!message || String(error.message).includes(message)),
  );
}

function expenseRequest() {
  return {
    amount: 125.5,
    categoryId: 3,
    clientId: 7,
    pixTypeId: 1,
    pix: 'pix@example.com',
    remarks: 'Almoço',
  };
}

function scheduleRequest(overrides = {}) {
  return {
    vehicleId: 4,
    clientId: 10,
    date: '2026-09-11',
    time: '09:30',
    destination: '  cliente centro  ',
    notes: '  levar equipamento  ',
    initialKm: undefined,
    finalKm: undefined,
    private: false,
    ...overrides,
  };
}

test('gestão de despesas rejeita criação quando o catálogo é inválido', async () => {
  const service = new ExpenseManagementService({
    create: async () => null,
  });

  await rejectsStatus(
    () => service.create(15, expenseRequest()),
    400,
    'Categoria, cliente, tipo de PIX ou usuário inválido.',
  );
});

test('gestão de despesas bloqueia alteração e exclusão após processamento', async () => {
  const service = new ExpenseManagementService({
    update: async () => 'locked',
    delete: async () => 'locked',
  });

  await rejectsStatus(
    () => service.update(15, 99, expenseRequest()),
    409,
    'já foi processada',
  );
  await rejectsStatus(
    () => service.delete(15, 99),
    409,
    'já foi processada',
  );
});

test('aprovação retorna ids aprovados e envia notificação', async () => {
  const notified = [];
  const service = new ExpenseApprovalService(
    {
      approve: async () => ({
        kind: 'approved',
        ids: [21],
        items: [{ id: 21 }],
      }),
    },
    {
      sendApproved: async items => {
        notified.push(...items);
      },
    },
  );

  const result = await service.approve(5, 21, 'Aprovado');

  assert.deepEqual(result, { ids: [21] });
  assert.deepEqual(notified.map(item => item.id), [21]);
});

test('aprovação rejeita despesa que deixou de estar pendente', async () => {
  const service = new ExpenseApprovalService(
    {
      approve: async () => ({
        kind: 'not-pending',
        ids: [21],
        items: [],
      }),
    },
    { sendApproved: async () => undefined },
  );

  await rejectsStatus(
    () => service.approve(5, 21, ''),
    409,
    'não está mais aguardando aprovação',
  );
});

test('pagamento retorna ids pagos', async () => {
  const service = new ExpensePaymentService({
    pay: async () => ({ kind: 'paid', ids: [31] }),
  });

  assert.deepEqual(await service.pay(8, 31, 'Pago'), { ids: [31] });
});

test('pagamento rejeita despesa que não está mais aprovada', async () => {
  const service = new ExpensePaymentService({
    pay: async () => ({ kind: 'not-approved', ids: [31] }),
  });

  await rejectsStatus(
    () => service.pay(8, 31, ''),
    409,
    'não está mais aguardando pagamento',
  );
});

test('agenda impede dois agendamentos do mesmo veículo no mesmo horário', async () => {
  let created = false;
  const service = new VehicleAgendaService({
    hasScheduleConflict: async () => true,
    createSchedule: async () => {
      created = true;
    },
  });

  await rejectsStatus(
    () => service.createSchedule({ id: 12 }, scheduleRequest()),
    409,
    'Já existe um agendamento',
  );
  assert.equal(created, false);
});

test('agenda normaliza destino, observações e quilometragem ao criar', async () => {
  let received;
  const service = new VehicleAgendaService({
    hasScheduleConflict: async () => false,
    createSchedule: async input => {
      received = input;
    },
  });

  await service.createSchedule({ id: 12 }, scheduleRequest());

  assert.equal(received.userId, 12);
  assert.equal(received.destination, 'CLIENTE CENTRO');
  assert.equal(received.notes, 'levar equipamento');
  assert.equal(received.initialKm, null);
  assert.equal(received.finalKm, null);
});

test('agenda exige quilometragem completa antes de arquivar', async () => {
  let updated = false;
  const service = new VehicleAgendaService({
    scheduleById: async () => ({ id: 44, arquivado: 0 }),
    hasScheduleConflict: async () => false,
    updateSchedule: async () => {
      updated = true;
    },
  });

  await rejectsStatus(
    () =>
      service.updateSchedule(
        { id: 12 },
        44,
        scheduleRequest({ archived: true, initialKm: 100, finalKm: null }),
      ),
    400,
    'Preencha o KM Inicial e o KM Final',
  );
  assert.equal(updated, false);
});

test('agenda restringe clientes externos e libera eventos privados apenas para funções autorizadas', async () => {
  const calls = {};
  const service = new VehicleAgendaService({
    userType: async () => 2,
    companyIds: async userId => {
      calls.companyUserId = userId;
      return [7, 9];
    },
    vehicles: async activeOnly => (activeOnly ? [{ id: 1 }] : [{ id: 2 }]),
    clients: async companyIds => {
      calls.companyIds = companyIds;
      return [{ id: 7 }];
    },
    drivers: async () => [{ id: 3 }],
    schedules: async (month, year, canSeePrivate) => {
      calls.scheduleArgs = [month, year, canSeePrivate];
      return [{ id: 4 }];
    },
    canUndo: async userId => {
      calls.undoUserId = userId;
      return true;
    },
  });

  const result = await service.get(
    { id: 55, functionId: 9 },
    9,
    2026,
    true,
  );

  assert.deepEqual(calls.companyIds, [7, 9]);
  assert.equal(calls.companyUserId, 55);
  assert.deepEqual(calls.scheduleArgs, [9, 2026, true]);
  assert.equal(calls.undoUserId, 55);
  assert.equal(result.canUndo, true);
});

test('agenda não permite excluir agendamento arquivado', async () => {
  let deleted = false;
  const service = new VehicleAgendaService({
    scheduleById: async () => ({ id: 70, arquivado: 1 }),
    deleteSchedule: async () => {
      deleted = true;
    },
  });

  await rejectsStatus(
    () => service.deleteSchedule(70),
    400,
    'Agendamentos arquivados não podem ser excluídos.',
  );
  assert.equal(deleted, false);
});

test('aprovação em lote informa todas as despesas não encontradas', async () => {
  const service = new ExpenseApprovalService(
    {
      approveBatch: async () => ({
        kind: 'not-found',
        ids: [41, 42],
      }),
    },
    { sendApproved: async () => undefined },
  );

  await rejectsStatus(
    () =>
      service.approveBatch(5, [
        { id: 41, remarks: '' },
        { id: 42, remarks: '' },
      ]),
    404,
    'Despesas não encontradas: 41, 42.',
  );
});

test('pagamento em lote informa todas as despesas que deixaram de estar aprovadas', async () => {
  const service = new ExpensePaymentService({
    payBatch: async () => ({
      kind: 'not-approved',
      ids: [51, 52],
    }),
  });

  await rejectsStatus(
    () =>
      service.payBatch(8, [
        { id: 51, remarks: '' },
        { id: 52, remarks: '' },
      ]),
    409,
    'Despesas não estão mais aguardando pagamento: 51, 52.',
  );
});

test('recusa na aprovação preserva resposta com id alterado', async () => {
  const service = new ExpenseApprovalService(
    {
      reject: async () => ({
        kind: 'rejected',
        ids: [61],
      }),
    },
    { sendApproved: async () => undefined },
  );

  assert.deepEqual(await service.reject(61), { ids: [61] });
});

test('recusa no pagamento preserva resposta com id alterado', async () => {
  const service = new ExpensePaymentService({
    reject: async () => ({
      kind: 'rejected',
      ids: [71],
    }),
  });

  assert.deepEqual(await service.reject(8, 71, 'Recusado'), { ids: [71] });
});
