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
import {
  AppPermission,
  type TicketClientTotalsLevel,
  type TicketClientTotalsReportResponse,
} from '@helpdesk/contracts';
import { LEGACY_SESSION_SECURITY } from '../../../../core/openapi/openapi.constants';
import type { AuthenticatedUser } from '../../../access/domain/authenticated-user';
import { CurrentUser } from '../../../access/presentation/http/current-user.decorator';
import { LegacySessionGuard } from '../../../access/presentation/http/legacy-session.guard';
import { PermissionsGuard } from '../../../access/presentation/http/permissions.guard';
import { RequirePermissions } from '../../../access/presentation/http/require-permissions.decorator';
import { GetTicketClientTotalsReport } from '../../application/get-ticket-client-totals-report';

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

function todayInSaoPaulo(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function levelQuery(value: string | undefined): TicketClientTotalsLevel {
  if (value === undefined || value === '') {
    return 0;
  }

  const parsed = Number(value);

  if (![0, 1, 2, 3].includes(parsed)) {
    throw new BadRequestException('level deve ser 0, 1, 2 ou 3.');
  }

  return parsed as TicketClientTotalsLevel;
}

@ApiTags('reports')
@Controller('reports')
@UseGuards(LegacySessionGuard, PermissionsGuard)
@RequirePermissions(AppPermission.TicketsAudit)
@ApiSecurity(LEGACY_SESSION_SECURITY)
export class ReportsController {
  constructor(
    private readonly getTicketClientTotalsReport: GetTicketClientTotalsReport,
  ) {}

  @Get('tickets/client-totals')
  @ApiOperation({
    summary: 'Total de atendimentos por cliente',
    description:
      'Migração nativa de rel/atd_total_por_cliente.php, com período, nível e escopo de clientes do usuário.',
  })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({
    name: 'level',
    required: false,
    enum: [0, 1, 2, 3],
    description: '0 considera níveis 1, 2 e 3.',
  })
  getTicketClientTotals(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('level') level?: string,
  ): Promise<TicketClientTotalsReportResponse> {
    if (!user) {
      throw new UnauthorizedException('Usuário não autenticado.');
    }

    const today = todayInSaoPaulo();
    const effectiveStartDate =
      dateQuery(startDate, 'startDate') ?? `${today.slice(0, 7)}-01`;
    const effectiveEndDate = dateQuery(endDate, 'endDate') ?? today;

    if (effectiveStartDate > effectiveEndDate) {
      throw new BadRequestException(
        'startDate deve ser anterior ou igual a endDate.',
      );
    }

    return this.getTicketClientTotalsReport.execute({
      userId: user.id,
      startDate: effectiveStartDate,
      endDate: effectiveEndDate,
      level: levelQuery(level),
    });
  }
}
