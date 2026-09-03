import {
  AppPermission,
  PermissionScope,
  type PermissionGrant,
} from '@helpdesk/contracts';
import type { AuthenticatedUser } from '../domain/authenticated-user';
import type { LegacyUserSession } from '../domain/legacy-user-session';
import type { RbacAccessSnapshot } from '../domain/rbac-access-snapshot';

const TICKET_PERMISSION = {
  read: 'atendimentos.visualizar',
  create: 'atendimentos.criar',
  edit: 'atendimentos.editar',
  execute: 'atendimentos.executar',
  hold: 'atendimentos.colocar_espera',
  reject: 'atendimentos.recusar',
  manageOthers: 'atendimentos.editar_terceiros',
  audit: 'atendimentos.auditar',
} as const;

const LOGISTICS_PERMISSION = {
  vehicleAgendaRead: 'logistica.agenda.visualizar',
  vehicleAgendaManage: 'logistica.agenda.gerenciar',
  expensesRead: 'logistica.rd.visualizar',
  expensesManage: 'logistica.rd.gerenciar',
  expensesAdminRead: 'logistica.rd.admin.visualizar',
  expensesApprove: 'logistica.rd.aprovar',
} as const;

const USER_PERMISSION = {
  read: 'usuarios.visualizar',
  create: 'usuarios.criar',
  edit: 'usuarios.editar',
  manageAccess: 'usuarios.editar_acesso',
} as const;

function permissionLevel(moduleValue: string, index: number): number {
  const value = moduleValue[index];
  return value && /^\d$/.test(value) ? Number(value) : 0;
}

function addGrant(
  grants: PermissionGrant[],
  permission: AppPermission,
  enabled: boolean,
  scope: PermissionScope,
) {
  if (enabled) {
    grants.push({ permission, scope });
  }
}

export function translateRbacAccess(
  session: LegacyUserSession,
  snapshot: RbacAccessSnapshot,
): AuthenticatedUser {
  const permissions = snapshot.permissionSlugs;
  const grants: PermissionGrant[] = [];

  addGrant(grants, AppPermission.UsersRead, permissions.has(USER_PERMISSION.read), PermissionScope.All);
  addGrant(grants, AppPermission.UsersCreate, permissions.has(USER_PERMISSION.create), PermissionScope.All);
  addGrant(grants, AppPermission.UsersEdit, permissions.has(USER_PERMISSION.edit), PermissionScope.All);
  addGrant(grants, AppPermission.UsersManageAccess, permissions.has(USER_PERMISSION.manageAccess), PermissionScope.All);

  const operationalScope = permissions.has(TICKET_PERMISSION.manageOthers)
    ? PermissionScope.All
    : PermissionScope.Own;

  addGrant(
    grants,
    AppPermission.TicketsRead,
    permissions.has(TICKET_PERMISSION.read),
    PermissionScope.All,
  );
  addGrant(
    grants,
    AppPermission.TicketsCreate,
    permissions.has(TICKET_PERMISSION.create),
    PermissionScope.All,
  );
  addGrant(
    grants,
    AppPermission.TicketsEdit,
    permissions.has(TICKET_PERMISSION.edit),
    operationalScope,
  );
  addGrant(
    grants,
    AppPermission.TicketsClassify,
    permissions.has(TICKET_PERMISSION.edit),
    operationalScope,
  );
  addGrant(
    grants,
    AppPermission.TicketsExecute,
    permissions.has(TICKET_PERMISSION.execute),
    operationalScope,
  );
  addGrant(
    grants,
    AppPermission.TicketsClose,
    permissions.has(TICKET_PERMISSION.execute),
    operationalScope,
  );
  addGrant(
    grants,
    AppPermission.TicketsHold,
    permissions.has(TICKET_PERMISSION.hold),
    operationalScope,
  );
  addGrant(
    grants,
    AppPermission.TicketsReject,
    permissions.has(TICKET_PERMISSION.reject),
    operationalScope,
  );

  addGrant(
    grants,
    AppPermission.TicketsAudit,
    permissions.has(TICKET_PERMISSION.audit) ||
      permissions.has(TICKET_PERMISSION.manageOthers),
    PermissionScope.All,
  );

  const legacyLogistics = session.modules[9];
  const canReadVehicleAgenda =
    permissions.has(LOGISTICS_PERMISSION.vehicleAgendaRead) ||
    permissions.has(LOGISTICS_PERMISSION.vehicleAgendaManage) ||
    permissionLevel(legacyLogistics, 1) >= 1;
  const canManageVehicleAgenda =
    permissions.has(LOGISTICS_PERMISSION.vehicleAgendaManage) ||
    permissionLevel(legacyLogistics, 1) >= 2;

  addGrant(
    grants,
    AppPermission.LogisticsVehicleAgendaRead,
    canReadVehicleAgenda,
    PermissionScope.All,
  );
  addGrant(
    grants,
    AppPermission.LogisticsVehicleAgendaManage,
    canManageVehicleAgenda,
    PermissionScope.All,
  );
  addGrant(
    grants,
    AppPermission.LogisticsExpensesRead,
    permissions.has(LOGISTICS_PERMISSION.expensesRead) ||
      permissionLevel(legacyLogistics, 0) >= 1,
    PermissionScope.Own,
  );
  addGrant(
    grants,
    AppPermission.LogisticsExpensesManage,
    permissions.has(LOGISTICS_PERMISSION.expensesManage) ||
      permissionLevel(legacyLogistics, 0) >= 1,
    PermissionScope.Own,
  );
  addGrant(
    grants,
    AppPermission.LogisticsExpensesAdminRead,
    permissions.has(LOGISTICS_PERMISSION.expensesAdminRead) ||
      permissionLevel(legacyLogistics, 2) >= 2,
    PermissionScope.All,
  );

  addGrant(
    grants,
    AppPermission.LogisticsExpensesApprove,
    permissions.has(LOGISTICS_PERMISSION.expensesApprove) ||
      permissionLevel(legacyLogistics, 2) >= 2,
    PermissionScope.All,
  );

  return {
    id: session.id,
    name: session.name,
    login: session.login,
    functionId: session.functionId,
    accessSource: 'rbac',
    roleAssignments: [],
    grants,
  };
}
