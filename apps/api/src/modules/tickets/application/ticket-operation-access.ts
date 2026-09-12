import { ForbiddenException } from '@nestjs/common';
import {
  AppPermission,
  PermissionScope,
} from '@helpdesk/contracts';
import type { AuthenticatedUser } from '../../access/domain/authenticated-user';
import { resolveTicketReadAccess } from './ticket-read-access';

export interface TicketOperationAccess {
  ownerTechnicianId?: number;
}

export function resolveTicketOperationAccess(
  user: AuthenticatedUser,
  permission: AppPermission,
): TicketOperationAccess {
  const readAccess = resolveTicketReadAccess(user);
  const systemAdmin = user.grants.find(
    (grant) => grant.permission === AppPermission.SystemAdmin,
  );

  if (systemAdmin) {
    return readAccess;
  }

  const operationGrant = user.grants.find(
    (grant) => grant.permission === permission,
  );

  if (!operationGrant) {
    throw new ForbiddenException('Permissão insuficiente.');
  }

  if (operationGrant.scope === PermissionScope.Sector) {
    throw new ForbiddenException(
      'O escopo de setor ainda não foi configurado para Atendimentos.',
    );
  }

  if (
    readAccess.ownerTechnicianId !== undefined ||
    operationGrant.scope === PermissionScope.Own
  ) {
    return {
      ownerTechnicianId: user.id,
    };
  }

  return {};
}
