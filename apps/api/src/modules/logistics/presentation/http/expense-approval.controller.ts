import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  StreamableFile,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import {
  AppPermission,
  type LogisticsExpenseApprovalRequest,
  type LogisticsExpenseBatchApprovalRequest,
} from '@helpdesk/contracts';
import { LEGACY_SESSION_SECURITY } from '../../../../core/openapi/openapi.constants';
import type { AuthenticatedUser } from '../../../access/domain/authenticated-user';
import { CurrentUser } from '../../../access/presentation/http/current-user.decorator';
import { LegacySessionGuard } from '../../../access/presentation/http/legacy-session.guard';
import { PermissionsGuard } from '../../../access/presentation/http/permissions.guard';
import { RequirePermissions } from '../../../access/presentation/http/require-permissions.decorator';
import { ExpenseApprovalService } from '../../application/expense-approval.service';

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

function approvalBody(value: unknown): LogisticsExpenseApprovalRequest {
  if (value === undefined || value === null) return {};
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new BadRequestException('Corpo da requisição inválido.');
  }
  const body = value as Record<string, unknown>;
  return { remarks: remarks(body.remarks) };
}

function batchBody(value: unknown): LogisticsExpenseBatchApprovalRequest {
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

function attachmentKey(value: string): string {
  let decoded: string;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    throw new BadRequestException('Identificador de anexo inválido.');
  }
  if (
    !/^(?:legacy-\d+|[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i.test(
      decoded,
    )
  ) {
    throw new BadRequestException('Identificador de anexo inválido.');
  }
  return decoded;
}

function safeFileName(value: string): string {
  return value.replace(/[\r\n"\\]/g, '_').slice(0, 180) || 'comprovante.pdf';
}

@ApiTags('logistics-expenses')
@Controller('logistics/expenses/admin/approvals')
@UseGuards(LegacySessionGuard, PermissionsGuard)
@ApiSecurity(LEGACY_SESSION_SECURITY)
@RequirePermissions(AppPermission.LogisticsExpensesApprove)
export class ExpenseApprovalController {
  constructor(private readonly approvals: ExpenseApprovalService) {}

  @Get()
  @ApiOperation({ summary: 'Listar RDs aguardando aprovação' })
  queue(@CurrentUser() user: AuthenticatedUser | undefined) {
    if (!user) throw new UnauthorizedException('Usuário não autenticado.');
    return this.approvals.queue();
  }


  @Get(':id/attachments/:key/content')
  @ApiOperation({ summary: 'Abrir comprovante de uma RD aguardando aprovação' })
  async attachmentContent(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseIntPipe) expenseId: number,
    @Param('key') rawKey: string,
  ): Promise<StreamableFile> {
    if (!user) throw new UnauthorizedException('Usuário não autenticado.');

    const content = await this.approvals.attachmentContent(
      expenseId,
      attachmentKey(rawKey),
    );
    if (!content) {
      throw new NotFoundException('Comprovante não encontrado.');
    }

    return new StreamableFile(content.data, {
      type: content.mimeType,
      disposition: `inline; filename="${safeFileName(content.name)}"`,
    });
  }

  @Post('batch/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Aprovar um lote de RDs pendentes' })
  approveBatch(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() rawBody: unknown,
  ) {
    if (!user) throw new UnauthorizedException('Usuário não autenticado.');
    const body = batchBody(rawBody);
    return this.approvals.approveBatch(
      user.id,
      body.items.map((item) => ({ id: item.id, remarks: item.remarks ?? '' })),
    );
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Aprovar uma RD pendente' })
  approve(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseIntPipe) expenseId: number,
    @Body() rawBody?: unknown,
  ) {
    if (!user) throw new UnauthorizedException('Usuário não autenticado.');
    const body = approvalBody(rawBody);
    return this.approvals.approve(user.id, expenseId, body.remarks ?? '');
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Recusar uma RD pendente' })
  reject(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseIntPipe) expenseId: number,
  ) {
    if (!user) throw new UnauthorizedException('Usuário não autenticado.');
    return this.approvals.reject(expenseId);
  }
}
