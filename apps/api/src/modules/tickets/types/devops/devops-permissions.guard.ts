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
  access: NonNullable<
    Awaited<ReturnType<TicketTypeAccessRepository['findByUserId']>>['permissions'][Sector.DevOps]
  >,
): PermissionGrant | null {
  const operationalScope = access.manageOthers
    ? PermissionScope.All
    : PermissionScope.Own;

  if (!access.read) return null;

  switch (permission) {
    case AppPermission.TicketsRead:
      return { permission, scope: PermissionScope.All };
    case AppPermission.TicketsCreate:
      return access.create ? { permission, scope: PermissionScope.All } : null;
    case AppPermission.TicketsEdit:
    case AppPermission.TicketsClassify:
      return access.edit || access.manageOthers
        ? { permission, scope: operationalScope }
        : null;
    case AppPermission.TicketsExecute:
    case AppPermission.TicketsClose:
      return access.execute || access.manageOthers
        ? { permission, scope: operationalScope }
        : null;
    case AppPermission.TicketsHold:
      return access.hold && (access.execute || access.manageOthers)
        ? { permission, scope: operationalScope }
        : null;
    case AppPermission.TicketsReject:
      return access.reject || access.manageOthers
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

    const devOpsOnCall = user.grants.some(
      (grant) => grant.permission === AppPermission.OnCallDevOps,
    );

    if (devOpsOnCall) {
      const missing = required.filter(
        (permission) =>
          !user.grants.some((grant) => grant.permission === permission),
      );
      if (missing.length > 0) {
        throw new ForbiddenException(
          'O perfil Plantonista não possui as permissões necessárias para esta ação DevOps.',
        );
      }
      return true;
    }

    const snapshot = await this.access.findByUserId(user.id);
    const devOpsAccess = snapshot.permissions[Sector.DevOps];

    if (!devOpsAccess?.read) {
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

      const grant = devOpsGrant(permission, devOpsAccess);
      if (!grant) {
        missing.push(permission);
      } else {
        synthetic.push(grant);
      }
    }

    if (missing.length > 0) {
      throw new ForbiddenException('Permissão insuficiente para DevOps.');
    }

    // Project/Task application services still consume the generic Tickets
    // grants. Request-local grants adapt the DevOps-specific RBAC permissions
    // without reading positional legacy permission strings.
    request.user = {
      ...user,
      grants: [...synthetic, ...user.grants],
    };

    return true;
  }
}
