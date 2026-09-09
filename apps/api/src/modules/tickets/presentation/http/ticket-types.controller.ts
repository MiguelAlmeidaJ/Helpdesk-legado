import {
  Controller,
  Get,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import {
  AppPermission,
  type TicketTypesResponse,
} from '@helpdesk/contracts';
import { LEGACY_SESSION_SECURITY } from '../../../../core/openapi/openapi.constants';
import type { AuthenticatedUser } from '../../../access/domain/authenticated-user';
import { CurrentUser } from '../../../access/presentation/http/current-user.decorator';
import { LegacySessionGuard } from '../../../access/presentation/http/legacy-session.guard';
import { PermissionsGuard } from '../../../access/presentation/http/permissions.guard';
import { RequirePermissions } from '../../../access/presentation/http/require-permissions.decorator';
import { TicketTypeRegistry } from '../../application/ticket-type-registry';

@ApiTags('ticket-types')
@Controller('tickets/types')
@UseGuards(LegacySessionGuard, PermissionsGuard)
@RequirePermissions(AppPermission.TicketsRead)
@ApiSecurity(LEGACY_SESSION_SECURITY)
export class TicketTypesController {
  constructor(private readonly registry: TicketTypeRegistry) {}

  @Get()
  @ApiOperation({
    summary: 'Listar tipos modulares de ticket',
    description:
      'Retorna os tipos habilitados para o usuário, suas capabilities e os campos preservados do formulário legado.',
  })
  @ApiResponse({
    status: 200,
    description: 'Tipos de ticket disponíveis para o usuário autenticado.',
  })
  list(
    @CurrentUser() user: AuthenticatedUser | undefined,
  ): TicketTypesResponse {
    if (!user) {
      throw new UnauthorizedException('Usuário não autenticado.');
    }

    return this.registry.listForUser(user);
  }
}
