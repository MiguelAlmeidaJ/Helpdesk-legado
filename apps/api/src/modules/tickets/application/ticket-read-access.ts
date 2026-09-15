import { ForbiddenException } from '@nestjs/common';
import {
  AppPermission,
  PermissionScope,
} from '@helpdesk/contracts';
import type { AuthenticatedUser } from '../../access/domain/authenticated-user';

export interface TicketReadAccess {
  ownerTechnicianId?: number;
}

export function resolveTicketReadAccess(
  user: AuthenticatedUser,
): TicketReadAccess {
  const systemAdmin = user.grants.find(
    (grant) => grant.permission === AppPermission.SystemAdmin,
  );
  const readGrant =
    systemAdmin ??
    user.grants.find(
      (grant) => grant.permission === AppPermission.TicketsRead,
    );

  if (!readGrant) {
    throw new ForbiddenException('Permissão insuficiente.');
  }

  if (readGrant.scope === PermissionScope.Sector) {
    throw new ForbiddenException(
      'O escopo de setor ainda não foi configurado para Atendimentos.',
    );
  }

  return {
    ownerTechnicianId:
      readGrant.scope === PermissionScope.Own ? user.id : undefined,
  };
}
