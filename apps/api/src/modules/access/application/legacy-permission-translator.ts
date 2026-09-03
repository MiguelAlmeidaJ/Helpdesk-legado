import {
  AppPermission,
  PermissionScope,
  type PermissionGrant,
} from '@helpdesk/contracts';
import type { AuthenticatedUser } from '../domain/authenticated-user';
import type { LegacyUserSession } from '../domain/legacy-user-session';

function permissionLevel(moduleValue: string, index: number): number {
  const value = moduleValue[index];

  if (!value || !/^\d$/.test(value)) {
    return 0;
  }

  return Number(value);
}

function pushGrant(
  grants: PermissionGrant[],
  permission: AppPermission,
  currentLevel: number,
  minimumLevel: number,
  scope: PermissionScope,
) {
  if (currentLevel < minimumLevel) {
    return;
  }

  const existing = grants.find((grant) => grant.permission === permission);

  if (!existing) {
    grants.push({ permission, scope });
    return;
  }

  if (scope === PermissionScope.All) {
    existing.scope = PermissionScope.All;
  }
}

export function translateLegacySession(
  session: LegacyUserSession,
): AuthenticatedUser {
  const grants: PermissionGrant[] = [];
  const users = session.modules[1];
  const tickets = session.modules[3];
  const ticketAudit = session.modules[8];
  const logistics = session.modules[9];

  pushGrant(
    grants,
    AppPermission.UsersRead,
    permissionLevel(users, 1),
    1,
    PermissionScope.All,
  );
  pushGrant(
    grants,
    AppPermission.UsersCreate,
    permissionLevel(users, 2),
    1,
    PermissionScope.All,
  );
  pushGrant(
    grants,
    AppPermission.UsersEdit,
    permissionLevel(users, 3),
    1,
    PermissionScope.All,
  );
  pushGrant(
    grants,
    AppPermission.UsersManageAccess,
    permissionLevel(users, 4),
    1,
    PermissionScope.All,
  );

  const canManageOthers = permissionLevel(tickets, 5) >= 2;
  const operationalScope = canManageOthers
    ? PermissionScope.All
    : PermissionScope.Own;

  pushGrant(
    grants,
    AppPermission.TicketsRead,
    permissionLevel(tickets, 0),
    1,
    PermissionScope.All,
  );
  pushGrant(
    grants,
    AppPermission.TicketsCreate,
    permissionLevel(tickets, 1),
    2,
    PermissionScope.All,
  );
  pushGrant(
    grants,
    AppPermission.TicketsEdit,
    permissionLevel(tickets, 1),
    3,
    operationalScope,
  );
  pushGrant(
    grants,
    AppPermission.TicketsClassify,
    permissionLevel(tickets, 1),
    3,
    operationalScope,
  );
  pushGrant(
    grants,
    AppPermission.TicketsExecute,
    permissionLevel(tickets, 2),
    2,
    operationalScope,
  );
  pushGrant(
    grants,
    AppPermission.TicketsClose,
    permissionLevel(tickets, 2),
    2,
    operationalScope,
  );
  pushGrant(
    grants,
    AppPermission.TicketsHold,
    permissionLevel(tickets, 3),
    2,
    operationalScope,
  );
  pushGrant(
    grants,
    AppPermission.TicketsReject,
    permissionLevel(tickets, 4),
    2,
    operationalScope,
  );
  pushGrant(
    grants,
    AppPermission.TicketsRadio,
    permissionLevel(tickets, 6),
    1,
    PermissionScope.All,
  );

  pushGrant(
    grants,
    AppPermission.TicketsAudit,
    permissionLevel(ticketAudit, 0),
    1,
    PermissionScope.All,
  );

  pushGrant(
    grants,
    AppPermission.LogisticsVehicleAgendaRead,
    permissionLevel(logistics, 1),
    1,
    PermissionScope.All,
  );
  pushGrant(
    grants,
    AppPermission.LogisticsVehicleAgendaManage,
    permissionLevel(logistics, 1),
    2,
    PermissionScope.All,
  );

  return {
    id: session.id,
    name: session.name,
    login: session.login,
    functionId: session.functionId,
    accessSource: 'legacy',
    roleAssignments: [],
    grants,
  };
}
