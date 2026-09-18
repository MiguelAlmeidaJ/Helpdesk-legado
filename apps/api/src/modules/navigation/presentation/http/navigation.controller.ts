import {
  Controller,
  Get,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import type { AppNavigationResponse } from '@helpdesk/contracts';
import { LEGACY_SESSION_SECURITY } from '../../../../core/openapi/openapi.constants';
import type { AuthenticatedUser } from '../../../access/domain/authenticated-user';
import { CurrentUser } from '../../../access/presentation/http/current-user.decorator';
import { LegacySessionGuard } from '../../../access/presentation/http/legacy-session.guard';
import { NavigationService } from '../../application/navigation.service';

@ApiTags('navigation')
@Controller('navigation')
@UseGuards(LegacySessionGuard)
@ApiSecurity(LEGACY_SESSION_SECURITY)
export class NavigationController {
  constructor(private readonly navigation: NavigationService) {}

  @Get()
  @ApiOperation({ summary: 'Retorna o menu visível para o usuário autenticado' })
  getNavigation(
    @CurrentUser() user: AuthenticatedUser | undefined,
  ): Promise<AppNavigationResponse> {
    if (!user) {
      throw new UnauthorizedException('Usuário não autenticado.');
    }

    return this.navigation.forUser(user);
  }
}
