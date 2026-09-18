import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  AppPermission,
  PermissionScope,
  Sector,
  type PermissionGrant,
} from '@helpdesk/contracts';
import type { AuthenticatedRequest } from '../../../access/presentation/http/authenticated-request';
import { REQUIRED_PERMISSIONS_KEY } from '../../../access/presentation/http/require-permissions.decorator';
import { TicketTypeAccessRepository } from '../../application/ports/ticket-type-access.repository';

function permissionLevel(moduleValue: string | undefined, index: number): number {
  const value = moduleValue?.[index];
  return value && /^\d$/.test(value) ? Number(value) : 0;
}

function isSystemAdmin(grants: readonly PermissionGrant[]): boolean {
  return grants.some(
    (grant) => grant.permission === AppPermission.SystemAdmin,
  );
}

const DEVOPS_TICKET_PERMISSIONS = new Set<AppPermission>([
  AppPermission.TicketsRead,
  AppPermission.TicketsCreate,
  AppPermission.TicketsEdit,
  AppPermission.TicketsClassify,
  AppPermission.TicketsExecute,
  AppPermission.TicketsClose,
  AppPermission.TicketsHold,
  AppPermission.TicketsReject,
]);

function devOpsGrant(
  permission: AppPermission,
  moduleValue: string | undefined,
): PermissionGrant | null {
  const canManageOthers = permissionLevel(moduleValue, 5) >= 2;
  const operationalScope = canManageOthers
    ? PermissionScope.All
    : PermissionScope.Own;

  const access = permissionLevel(moduleValue, 0) >= 1;
  if (!access) return null;

  switch (permission) {
    case AppPermission.TicketsRead:
      return { permission, scope: PermissionScope.All };
    case AppPermission.TicketsCreate:
      return permissionLevel(moduleValue, 1) >= 2
        ? { permission, scope: PermissionScope.All }
        : null;
    case AppPermission.TicketsEdit:
    case AppPermission.TicketsClassify:
      return permissionLevel(moduleValue, 1) >= 3 || canManageOthers
        ? { permission, scope: operationalScope }
        : null;
    case AppPermission.TicketsExecute:
    case AppPermission.TicketsClose:
      return permissionLevel(moduleValue, 2) >= 2 || canManageOthers
        ? { permission, scope: operationalScope }
        : null;
    case AppPermission.TicketsHold:
      return permissionLevel(moduleValue, 3) >= 2 &&
        (permissionLevel(moduleValue, 2) >= 2 || canManageOthers)
        ? { permission, scope: operationalScope }
        : null;
    case AppPermission.TicketsReject:
      return permissionLevel(moduleValue, 4) >= 2 || canManageOthers
        ? { permission, scope: operationalScope }
        : null;
    default:
      return null;
  }
}

@Injectable()
export class DevOpsPermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly access: TicketTypeAccessRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required =
      this.reflector.getAllAndOverride<AppPermission[]>(
        REQUIRED_PERMISSIONS_KEY,
        [context.getHandler(), context.getClass()],
      ) ?? [];

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('Usuário não autenticado.');
    }

    if (isSystemAdmin(user.grants)) {
      return true;
    }

    const snapshot = await this.access.findByUserId(user.id);
    const moduleValue = snapshot.modules[Sector.DevOps];

    if (permissionLevel(moduleValue, 0) < 1) {
      throw new ForbiddenException(
        'Este tipo de ticket é restrito ao setor DevOps.',
      );
    }

    const synthetic: PermissionGrant[] = [];
    const missing: AppPermission[] = [];

    for (const permission of required) {
      if (!DEVOPS_TICKET_PERMISSIONS.has(permission)) {
        const granted = user.grants.some(
          (grant) => grant.permission === permission,
        );
        if (!granted) missing.push(permission);
        continue;
      }

      const grant = devOpsGrant(permission, moduleValue);
      if (!grant) {
        missing.push(permission);
      } else {
        synthetic.push(grant);
      }
    }

    if (missing.length > 0) {
      throw new ForbiddenException('Permissão insuficiente para DevOps.');
    }

    // The existing Project/Task application services still consume the generic
    // Tickets grants. Prepending request-local DevOps grants keeps those
    // services unchanged while making m5, not m3, authoritative for this type.
    request.user = {
      ...user,
      grants: [...synthetic, ...user.grants],
    };

    return true;
  }
}
