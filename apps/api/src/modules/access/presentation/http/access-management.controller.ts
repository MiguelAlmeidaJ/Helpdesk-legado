import { BadRequestException, Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AppPermission, type AccessManagementSnapshot } from '@helpdesk/contracts';
import { LEGACY_SESSION_SECURITY } from '../../../../core/openapi/openapi.constants';
import type { AuthenticatedUser } from '../../domain/authenticated-user';
import { CurrentUser } from './current-user.decorator';
import { AccessManagement } from '../../application/access-management';
import { LegacySessionGuard } from './legacy-session.guard';
import { PermissionsGuard } from './permissions.guard';
import { RequirePermissions } from './require-permissions.decorator';

@ApiTags('access-management')
@Controller('access-management')
@UseGuards(LegacySessionGuard, PermissionsGuard)
@ApiSecurity(LEGACY_SESSION_SECURITY)
export class AccessManagementController {
  constructor(private readonly access: AccessManagement) {}

  @Get()
  @RequirePermissions(AppPermission.SystemAdmin)
  @ApiOperation({ summary: 'Consultar catálogo de permissões do sistema' })
  snapshot(
    @CurrentUser() actor: AuthenticatedUser | undefined,
  ): Promise<AccessManagementSnapshot> {
    if (!actor) throw new BadRequestException('Usuário não autenticado.');
    return this.access.snapshot(true);
  }
}
