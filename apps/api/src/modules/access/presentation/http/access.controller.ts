import {
  Controller,
  Get,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { CurrentUserResponse } from '@helpdesk/contracts';
import type { AuthenticatedUser } from '../../domain/authenticated-user';
import { CurrentUser } from './current-user.decorator';
import { LegacySessionGuard } from './legacy-session.guard';

@Controller('auth')
export class AccessController {
  @Get('me')
  @UseGuards(LegacySessionGuard)
  me(@CurrentUser() user: AuthenticatedUser | undefined): CurrentUserResponse {
    if (!user) {
      throw new UnauthorizedException('Usuário não autenticado.');
    }

    return {
      id: user.id,
      name: user.name,
      login: user.login,
      functionId: user.functionId,
      roleAssignments: [...user.roleAssignments],
      grants: [...user.grants],
    };
  }
}
