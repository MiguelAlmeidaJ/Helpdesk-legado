const { test } = require('node:test');
const assert = require('node:assert/strict');
require('../apps/api/node_modules/reflect-metadata');

const {
  AppPermission,
  PermissionScope,
  TicketStatus,
} = require('../packages/contracts/dist');
const {
  NotificationCenterService,
} = require('../apps/api/dist/modules/notifications/application/notification-center.service');

function ticket(technicianId, remainingSeconds = -60) {
  const breached = remainingSeconds < 0;

  return {
    id: 123,
    status: TicketStatus.InProgress,
    openedAt: '2026-10-08T10:00:00.000Z',
    client: { id: 1, name: 'Cliente' },
    technician: { id: technicianId, name: `Técnico ${technicianId}` },
    sla: {
      quality: {
        remainingSeconds,
        breached,
      },
      clerio: {
        remainingSeconds: 3_600,
        breached: false,
      },
      lastActivityAt: '2026-10-08T10:30:00.000Z',
      latestWait: { scheduledResumeAt: null },
    },
  };
}

function user(id) {
  return {
    id,
    grants: [
      {
        permission: AppPermission.TicketsRead,
        scope: PermissionScope.All,
      },
    ],
  };
}

function serviceWith(ticketItem) {
  let requestedFilters;
  const listTickets = {
    async execute(input) {
      requestedFilters = input.filters;
      return { data: [ticketItem] };
    },
  };
  const database = {
    async $executeRawUnsafe() {},
    async $queryRawUnsafe() {
      return [];
    },
  };

  return {
    service: new NotificationCenterService(listTickets, database),
    requestedFilters: () => requestedFilters,
  };
}

test('SLA notifications are requested and emitted only for the responsible technician', async () => {
  const assigned = serviceWith(ticket(7));
  const assignedResult = await assigned.service.list(user(7));

  assert.deepEqual(assigned.requestedFilters().technicianIds, [7]);
  assert.equal(
    assignedResult.items.some((item) => item.key.includes(':sla:critical:')),
    true,
  );

  const other = serviceWith(ticket(8));
  const otherResult = await other.service.list(user(7));

  assert.equal(
    otherResult.items.some((item) => item.key.includes(':sla:')),
    false,
  );
});

test('SLA warning is not emitted for another technician', async () => {
  const other = serviceWith(ticket(8, 10 * 60));
  const result = await other.service.list(user(7));

  assert.equal(result.items.some((item) => item.key.endsWith(':sla:warning')), false);
});
