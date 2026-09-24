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

function pushCatalogGrants(
  grants: PermissionGrant[],
  legacyLevel: number,
) {
  const tiRead = [1, 2, 5, 6].includes(legacyLevel);
  const tiEdit = [2, 6].includes(legacyLevel);
  const devOpsRead = [3, 4, 5, 6].includes(legacyLevel);
  const devOpsEdit = [4, 6].includes(legacyLevel);

  pushGrant(
    grants,
    AppPermission.CatalogTiRead,
    tiRead ? 1 : 0,
    1,
    PermissionScope.All,
  );
  pushGrant(
    grants,
    AppPermission.CatalogTiEdit,
    tiEdit ? 1 : 0,
    1,
    PermissionScope.All,
  );
  pushGrant(
    grants,
    AppPermission.CatalogDevOpsRead,
    devOpsRead ? 1 : 0,
    1,
    PermissionScope.All,
  );
  pushGrant(
    grants,
    AppPermission.CatalogDevOpsEdit,
    devOpsEdit ? 1 : 0,
    1,
    PermissionScope.All,
  );
}

export function translateLegacySession(
  session: LegacyUserSession,
): AuthenticatedUser {
  const grants: PermissionGrant[] = [];
  const users = session.modules[1];
  const registrations = session.modules[2];
  const tickets = session.modules[3];
  const financeRegistrations = session.modules[7];
  const legacyModule8 = session.modules[8];
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

  pushGrant(grants, AppPermission.RegistrationsClientsRead, permissionLevel(registrations, 1), 1, PermissionScope.All);
  pushGrant(grants, AppPermission.RegistrationsClientsCreate, permissionLevel(registrations, 1), 2, PermissionScope.All);
  pushGrant(grants, AppPermission.RegistrationsClientsEdit, permissionLevel(registrations, 1), 3, PermissionScope.All);
  pushGrant(grants, AppPermission.RegistrationsClientContactsCreate, permissionLevel(registrations, 2), 2, PermissionScope.All);
  pushGrant(grants, AppPermission.RegistrationsClientContactsEdit, permissionLevel(registrations, 2), 3, PermissionScope.All);
  pushGrant(grants, AppPermission.RegistrationsClientLocationsCreate, permissionLevel(registrations, 3), 3, PermissionScope.All);
  pushGrant(grants, AppPermission.RegistrationsClientLocationsEdit, permissionLevel(registrations, 3), 3, PermissionScope.All);
  pushGrant(grants, AppPermission.RegistrationsCategoriesRead, permissionLevel(registrations, 4), 1, PermissionScope.All);
  pushGrant(grants, AppPermission.RegistrationsCategoriesCreate, permissionLevel(registrations, 4), 2, PermissionScope.All);
  pushGrant(grants, AppPermission.RegistrationsCategoriesEdit, permissionLevel(registrations, 4), 3, PermissionScope.All);
  pushGrant(grants, AppPermission.RegistrationsSubcategoriesCreate, permissionLevel(registrations, 5), 2, PermissionScope.All);
  pushGrant(grants, AppPermission.RegistrationsSubcategoriesEdit, permissionLevel(registrations, 5), 3, PermissionScope.All);
  pushGrant(grants, AppPermission.RegistrationsItemsCreate, permissionLevel(registrations, 6), 2, PermissionScope.All);
  pushGrant(grants, AppPermission.RegistrationsItemsEdit, permissionLevel(registrations, 6), 3, PermissionScope.All);
  pushGrant(grants, AppPermission.RegistrationsFinanceRead, permissionLevel(financeRegistrations, 0), 1, PermissionScope.All);
  pushGrant(grants, AppPermission.RegistrationsFinanceManage, permissionLevel(financeRegistrations, 0), 1, PermissionScope.All);

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
    permissionLevel(legacyModule8, 0),
    1,
    PermissionScope.All,
  );

  pushCatalogGrants(grants, permissionLevel(legacyModule8, 4));

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
  pushGrant(
    grants,
    AppPermission.LogisticsExpensesRead,
    permissionLevel(logistics, 0),
    1,
    PermissionScope.Own,
  );
  pushGrant(
    grants,
    AppPermission.LogisticsExpensesManage,
    permissionLevel(logistics, 0),
    1,
    PermissionScope.Own,
  );
  pushGrant(
    grants,
    AppPermission.LogisticsExpensesAdminRead,
    permissionLevel(logistics, 2),
    2,
    PermissionScope.All,
  );

  pushGrant(
    grants,
    AppPermission.LogisticsExpensesAdminManage,
    permissionLevel(logistics, 2),
    2,
    PermissionScope.All,
  );

  pushGrant(
    grants,
    AppPermission.LogisticsExpensesApprove,
    permissionLevel(logistics, 2),
    2,
    PermissionScope.All,
  );

  pushGrant(
    grants,
    AppPermission.LogisticsExpensesPay,
    permissionLevel(logistics, 2),
    3,
    PermissionScope.All,
  );

  pushGrant(
    grants,
    AppPermission.LogisticsStatementsRead,
    permissionLevel(logistics, 9),
    1,
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
