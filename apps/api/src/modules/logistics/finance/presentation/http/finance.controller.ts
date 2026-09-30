import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import type {
  FinanceCatalogsResponse,
  FinanceListResponse,
  FinancePaymentInput,
  FinancePayableWriteInput,
  FinanceReceiptInput,
  FinanceReceivableWriteInput,
  FinanceRecurringWriteInput,
} from '@helpdesk/contracts';
import { LEGACY_SESSION_SECURITY } from '../../../../../core/openapi/openapi.constants';
import type { AuthenticatedUser } from '../../../../access/domain/authenticated-user';
import { CurrentUser } from '../../../../access/presentation/http/current-user.decorator';
import { LegacySessionGuard } from '../../../../access/presentation/http/legacy-session.guard';
import { FinanceService } from '../../application/finance.service';

function authenticated(user: AuthenticatedUser | undefined): AuthenticatedUser {
  if (!user) throw new UnauthorizedException('Usuário não autenticado.');
  return user;
}

function dateOrDefault(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new BadRequestException('Data deve usar YYYY-MM-DD.');
  }
  return value;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function firstDayOfMonth(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
}

function positiveId(value: string): number {
  if (!/^\d+$/.test(value)) throw new BadRequestException('id é inválido.');
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new BadRequestException('id é inválido.');
  }
  return parsed;
}

@ApiTags('logistics-finance')
@Controller('logistics/finance')
@UseGuards(LegacySessionGuard)
@ApiSecurity(LEGACY_SESSION_SECURITY)
export class FinanceController {
  constructor(private readonly finance: FinanceService) {}

  @Get('catalogs')
  @ApiOperation({ summary: 'Catálogos para lançamentos financeiros' })
  catalogs(
    @CurrentUser() user: AuthenticatedUser | undefined,
  ): Promise<FinanceCatalogsResponse> {
    return this.finance.catalogs(authenticated(user));
  }


  @Get('master-data/all')
  @ApiOperation({ summary: 'Lista cadastros de dados financeiros' })
  masterData(
    @CurrentUser() user: AuthenticatedUser | undefined,
  ): Promise<FinanceMasterDataResponse> {
    return this.finance.masterData(authenticated(user));
  }

  @Post('master-data/:resource')
  createMasterData(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('resource') resource: FinanceMasterDataKey,
    @Body() body: FinanceMasterDataWriteInput,
  ): Promise<{ id: number }> {
    return this.finance.createMasterData(authenticated(user), resource, body);
  }

  @Patch('master-data/:resource/:id')
  async updateMasterData(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('resource') resource: FinanceMasterDataKey,
    @Param('id') id: string,
    @Body() body: FinanceMasterDataWriteInput,
  ): Promise<void> {
    await this.finance.updateMasterData(authenticated(user), resource, positiveId(id), body);
  }

  @Patch('master-data/:resource/:id/status')
  async setMasterDataStatus(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('resource') resource: FinanceMasterDataKey,
    @Param('id') id: string,
    @Body() body: { active: boolean },
  ): Promise<void> {
    await this.finance.setMasterDataStatus(
      authenticated(user),
      resource,
      positiveId(id),
      body.active === true,
    );
  }

  @Delete('master-data/:resource/:id')
  async deleteMasterData(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('resource') resource: FinanceMasterDataKey,
    @Param('id') id: string,
  ): Promise<void> {
    await this.finance.deleteMasterData(authenticated(user), resource, positiveId(id));
  }

  @Get(':view')
  @ApiOperation({ summary: 'Lista uma visão financeira' })
  list(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('view') view: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('search') search?: string,
  ): Promise<FinanceListResponse> {
    const start = dateOrDefault(startDate, firstDayOfMonth());
    const end = dateOrDefault(endDate, today());
    if (start > end) {
      throw new BadRequestException('Data inicial não pode ser maior que a final.');
    }
    return this.finance.list(
      authenticated(user),
      view,
      start,
      end,
      search ?? '',
    );
  }

  @Post('receivables')
  createReceivable(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() body: FinanceReceivableWriteInput,
  ): Promise<{ id: number }> {
    return this.finance.createReceivable(authenticated(user), body);
  }

  @Patch('receivables/:id')
  async updateReceivable(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id') id: string,
    @Body() body: FinanceReceivableWriteInput,
  ): Promise<void> {
    await this.finance.updateReceivable(authenticated(user), positiveId(id), body);
  }

  @Post('receivables/:id/receipts')
  async receive(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id') id: string,
    @Body() body: FinanceReceiptInput,
  ): Promise<void> {
    await this.finance.receive(authenticated(user), positiveId(id), body);
  }

  @Post('payables')
  createPayable(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() body: FinancePayableWriteInput,
  ): Promise<{ id: number }> {
    return this.finance.createPayable(authenticated(user), body);
  }

  @Patch('payables/:id')
  async updatePayable(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id') id: string,
    @Body() body: FinancePayableWriteInput,
  ): Promise<void> {
    await this.finance.updatePayable(authenticated(user), positiveId(id), body);
  }

  @Post('payables/:id/pay')
  async pay(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id') id: string,
    @Body() body: FinancePaymentInput,
  ): Promise<void> {
    await this.finance.pay(authenticated(user), positiveId(id), body);
  }

  @Post('recurring')
  createRecurring(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() body: FinanceRecurringWriteInput,
  ): Promise<{ id: number }> {
    return this.finance.createRecurring(authenticated(user), body);
  }

  @Patch('recurring/:id')
  async updateRecurring(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id') id: string,
    @Body() body: FinanceRecurringWriteInput,
  ): Promise<void> {
    await this.finance.updateRecurring(authenticated(user), positiveId(id), body);
  }
}
