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
import type { CurrentUserResponse } from '@helpdesk/contracts';
import { LEGACY_SESSION_SECURITY } from '../../../../core/openapi/openapi.constants';
import type { AuthenticatedUser } from '../../domain/authenticated-user';
import { CurrentUser } from './current-user.decorator';
import { LegacySessionGuard } from './legacy-session.guard';

@ApiTags('auth')
@Controller('auth')
export class AccessController {
  @Get('me')
  @UseGuards(LegacySessionGuard)
  @ApiSecurity(LEGACY_SESSION_SECURITY)
  @ApiOperation({
    summary: 'Obter usuário autenticado',
    description:
      'Resolve a sessão PHP atual e retorna o usuário normalizado com grants efetivos.',
  })
  @ApiResponse({
    status: 200,
    description: 'Usuário autenticado e suas permissões efetivas.',
  })
  @ApiResponse({
    status: 401,
    description: 'Sessão ausente, inválida, expirada ou usuário inativo.',
  })
  me(@CurrentUser() user: AuthenticatedUser | undefined): CurrentUserResponse {
    if (!user) {
      throw new UnauthorizedException('Usuário não autenticado.');
    }

    return {
      id: user.id,
      name: user.name,
      login: user.login,
      functionId: user.functionId,
      accessSource: user.accessSource,
      roleAssignments: [...user.roleAssignments],
      grants: [...user.grants],
    };
  }
}
