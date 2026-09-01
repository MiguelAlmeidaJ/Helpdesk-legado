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
} as const;

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
