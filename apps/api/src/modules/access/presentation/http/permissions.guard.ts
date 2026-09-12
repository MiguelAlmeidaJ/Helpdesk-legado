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
  type PermissionGrant,
} from '@helpdesk/contracts';
import type { AuthenticatedRequest } from './authenticated-request';
import { REQUIRED_PERMISSIONS_KEY } from './require-permissions.decorator';

function grantsPermission(
  grants: readonly PermissionGrant[],
  permission: AppPermission,
): boolean {
  return grants.some(
    (grant) =>
      grant.permission === AppPermission.SystemAdmin ||
      grant.permission === permission,
  );
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required =
      this.reflector.getAllAndOverride<AppPermission[]>(
        REQUIRED_PERMISSIONS_KEY,
        [context.getHandler(), context.getClass()],
      ) ?? [];

    if (required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('Usuário não autenticado.');
    }

    const missing = required.filter(
      (permission) => !grantsPermission(user.grants, permission),
    );

    if (missing.length > 0) {
      throw new ForbiddenException('Permissão insuficiente.');
    }

    return true;
  }
}
