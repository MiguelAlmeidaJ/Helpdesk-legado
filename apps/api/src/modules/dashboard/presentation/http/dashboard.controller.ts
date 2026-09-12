import {
  BadRequestException,
  Controller,
  Get,
  Query,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiQuery,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import type { OperationalDashboardResponse } from '@helpdesk/contracts';
import { LEGACY_SESSION_SECURITY } from '../../../../core/openapi/openapi.constants';
import type { AuthenticatedUser } from '../../../access/domain/authenticated-user';
import { CurrentUser } from '../../../access/presentation/http/current-user.decorator';
import { LegacySessionGuard } from '../../../access/presentation/http/legacy-session.guard';
import { GetDashboard } from '../../application/get-dashboard';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function dateQuery(value: string | undefined, field: string): string | undefined {
  if (value === undefined || value === '') {
    return undefined;
  }

  if (!DATE_PATTERN.test(value)) {
    throw new BadRequestException(`${field} deve usar o formato YYYY-MM-DD.`);
  }

  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) {
    throw new BadRequestException(`${field} deve ser uma data válida.`);
  }

  return value;
}

@ApiTags('dashboard')
@Controller('dashboard')
@UseGuards(LegacySessionGuard)
@ApiSecurity(LEGACY_SESSION_SECURITY)
export class DashboardController {
  constructor(private readonly dashboard: GetDashboard) {}

  @Get()
  @ApiOperation({ summary: 'Dashboard operacional e rankings do Helpdesk' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  get(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<OperationalDashboardResponse> {
    if (!user) {
      throw new UnauthorizedException('Usuário não autenticado.');
    }

    return this.dashboard.execute({
      userId: user.id,
      startDate: dateQuery(startDate, 'startDate'),
      endDate: dateQuery(endDate, 'endDate'),
    });
  }
}
