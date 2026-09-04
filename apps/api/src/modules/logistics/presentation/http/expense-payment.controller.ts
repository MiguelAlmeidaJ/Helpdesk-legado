import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import {
  AppPermission,
  type LogisticsExpenseBatchPaymentRequest,
  type LogisticsExpensePaymentRequest,
} from '@helpdesk/contracts';
import { LEGACY_SESSION_SECURITY } from '../../../../core/openapi/openapi.constants';
import type { AuthenticatedUser } from '../../../access/domain/authenticated-user';
import { CurrentUser } from '../../../access/presentation/http/current-user.decorator';
import { LegacySessionGuard } from '../../../access/presentation/http/legacy-session.guard';
import { PermissionsGuard } from '../../../access/presentation/http/permissions.guard';
import { RequirePermissions } from '../../../access/presentation/http/require-permissions.decorator';
import { ExpensePaymentService } from '../../application/expense-payment.service';

function remarks(value: unknown): string {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string') {
    throw new BadRequestException('remarks é inválido.');
  }
  const normalized = value.trim();
  if (normalized.length > 255) {
    throw new BadRequestException('remarks deve ter no máximo 255 caracteres.');
  }
  return normalized;
}

function paymentBody(value: unknown): LogisticsExpensePaymentRequest {
  if (value === undefined || value === null) return {};
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new BadRequestException('Corpo da requisição inválido.');
  }
  const body = value as Record<string, unknown>;
  return { remarks: remarks(body.remarks) };
}

function batchBody(value: unknown): LogisticsExpenseBatchPaymentRequest {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new BadRequestException('Corpo da requisição inválido.');
  }
  const body = value as Record<string, unknown>;
  if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 100) {
    throw new BadRequestException('items deve conter de 1 a 100 despesas.');
  }

  const ids = new Set<number>();
  const items = body.items.map((entry, index) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new BadRequestException(`items[${index}] é inválido.`);
    }
    const record = entry as Record<string, unknown>;
    const id = Number(record.id);
    if (!Number.isSafeInteger(id) || id < 1) {
      throw new BadRequestException(`items[${index}].id é inválido.`);
    }
    if (ids.has(id)) {
      throw new BadRequestException(`Despesa ${id} foi informada mais de uma vez.`);
    }
    ids.add(id);
    return { id, remarks: remarks(record.remarks) };
  });

  return { items };
}

@ApiTags('logistics-expenses')
@Controller('logistics/expenses/admin/payments')
@UseGuards(LegacySessionGuard, PermissionsGuard)
@ApiSecurity(LEGACY_SESSION_SECURITY)
@RequirePermissions(AppPermission.LogisticsExpensesPay)
export class ExpensePaymentController {
  constructor(private readonly payments: ExpensePaymentService) {}

  @Get()
  @ApiOperation({ summary: 'Listar RDs aprovadas aguardando pagamento' })
  queue(@CurrentUser() user: AuthenticatedUser | undefined) {
    if (!user) throw new UnauthorizedException('Usuário não autenticado.');
    return this.payments.queue();
  }

  @Post('batch/pay')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Registrar pagamento de um lote de RDs aprovadas' })
  payBatch(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() rawBody: unknown,
  ) {
    if (!user) throw new UnauthorizedException('Usuário não autenticado.');
    const body = batchBody(rawBody);
    return this.payments.payBatch(
      user.id,
      body.items.map((item) => ({ id: item.id, remarks: item.remarks ?? '' })),
    );
  }

  @Post(':id/pay')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Registrar pagamento de uma RD aprovada' })
  pay(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseIntPipe) expenseId: number,
    @Body() rawBody?: unknown,
  ) {
    if (!user) throw new UnauthorizedException('Usuário não autenticado.');
    const body = paymentBody(rawBody);
    return this.payments.pay(user.id, expenseId, body.remarks ?? '');
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Recusar pagamento de uma RD aprovada' })
  reject(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseIntPipe) expenseId: number,
    @Body() rawBody?: unknown,
  ) {
    if (!user) throw new UnauthorizedException('Usuário não autenticado.');
    const body = paymentBody(rawBody);
    return this.payments.reject(user.id, expenseId, body.remarks ?? '');
  }
}
