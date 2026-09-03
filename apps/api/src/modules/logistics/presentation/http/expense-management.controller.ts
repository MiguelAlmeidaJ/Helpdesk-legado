import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  StreamableFile,
  UnauthorizedException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import {
  AppPermission,
  type CreateLogisticsExpenseRequest,
  type UpdateLogisticsExpenseRequest,
} from '@helpdesk/contracts';
import { LEGACY_SESSION_SECURITY } from '../../../../core/openapi/openapi.constants';
import type { AuthenticatedUser } from '../../../access/domain/authenticated-user';
import { CurrentUser } from '../../../access/presentation/http/current-user.decorator';
import { LegacySessionGuard } from '../../../access/presentation/http/legacy-session.guard';
import { PermissionsGuard } from '../../../access/presentation/http/permissions.guard';
import { RequirePermissions } from '../../../access/presentation/http/require-permissions.decorator';
import { ExpenseManagementService } from '../../application/expense-management.service';

interface UploadedFileLike {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function date(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  if (!DATE_PATTERN.test(value)) {
    throw new BadRequestException('Data deve usar o formato YYYY-MM-DD.');
  }

  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  const parsed = new Date(Date.UTC(year, month - 1, day));

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() + 1 !== month ||
    parsed.getUTCDate() !== day
  ) {
    throw new BadRequestException('Data inválida.');
  }
  return value;
}

function currentMonth(): { startDate: string; endDate: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const last = new Date(year, month, 0).getDate();
  const endDate =
    `${year}-${String(month).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
  return { startDate, endDate };
}

function integer(value: unknown, field: string): number {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value)
        : Number.NaN;
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new BadRequestException(`${field} é inválido.`);
  }
  return parsed;
}

function text(
  value: unknown,
  field: string,
  maximum: number,
  required = false,
): string {
  if (value === undefined || value === null) {
    if (required) throw new BadRequestException(`${field} é obrigatório.`);
    return '';
  }
  if (typeof value !== 'string') {
    throw new BadRequestException(`${field} é inválido.`);
  }

  const normalized = value.trim();
  if ((required && !normalized) || normalized.length > maximum) {
    throw new BadRequestException(`${field} é inválido.`);
  }
  return normalized;
}

function requestBody(value: unknown): CreateLogisticsExpenseRequest {
  if (!value || typeof value !== 'object') {
    throw new BadRequestException('Corpo da requisição inválido.');
  }

  const body = value as Record<string, unknown>;
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 999999999.99) {
    throw new BadRequestException('amount é inválido.');
  }

  return {
    amount,
    categoryId: integer(body.categoryId, 'categoryId'),
    clientId: integer(body.clientId, 'clientId'),
    pixTypeId: integer(body.pixTypeId, 'pixTypeId'),
    pix: text(body.pix, 'pix', 255),
    remarks: text(body.remarks, 'remarks', 5000),
  };
}

function attachmentKey(value: string): string {
  const decoded = decodeURIComponent(value);
  if (
    !/^(?:legacy-\d+|[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i.test(
      decoded,
    )
  ) {
    throw new BadRequestException('Identificador de anexo inválido.');
  }
  return decoded;
}

@ApiTags('logistics')
@Controller('logistics/expenses')
@UseGuards(LegacySessionGuard, PermissionsGuard)
@ApiSecurity(LEGACY_SESSION_SECURITY)
export class ExpenseManagementController {
  constructor(private readonly expenses: ExpenseManagementService) {}

  @Get()
  @RequirePermissions(AppPermission.LogisticsExpensesRead)
  @ApiOperation({ summary: 'Listar despesas do usuário autenticado' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  get(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query('startDate') startDateValue?: string,
    @Query('endDate') endDateValue?: string,
  ) {
    if (!user) throw new UnauthorizedException('Usuário não autenticado.');

    const fallback = currentMonth();
    const startDate = date(startDateValue, fallback.startDate);
    const endDate = date(endDateValue, fallback.endDate);
    if (startDate > endDate) {
      throw new BadRequestException(
        'startDate deve ser anterior ou igual a endDate.',
      );
    }
    return this.expenses.get(user.id, startDate, endDate);
  }

  @Post()
  @RequirePermissions(AppPermission.LogisticsExpensesManage)
  @ApiOperation({ summary: 'Cadastrar despesa pessoal' })
  create(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() body: unknown,
  ) {
    if (!user) throw new UnauthorizedException('Usuário não autenticado.');
    return this.expenses.create(user.id, requestBody(body));
  }

  @Patch(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(AppPermission.LogisticsExpensesManage)
  @ApiOperation({ summary: 'Editar despesa pessoal ainda aguardando aprovação' })
  update(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
  ): Promise<void> {
    if (!user) throw new UnauthorizedException('Usuário não autenticado.');
    return this.expenses.update(
      user.id,
      id,
      requestBody(body) as UpdateLogisticsExpenseRequest,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(AppPermission.LogisticsExpensesManage)
  @ApiOperation({ summary: 'Excluir despesa pessoal ainda aguardando aprovação' })
  remove(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    if (!user) throw new UnauthorizedException('Usuário não autenticado.');
    return this.expenses.delete(user.id, id);
  }

  @Post(':id/attachments')
  @RequirePermissions(AppPermission.LogisticsExpensesManage)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 25 * 1024 * 1024,
        files: 1,
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Adicionar comprovante PDF à despesa' })
  upload(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseIntPipe) expenseId: number,
    @UploadedFile() file: UploadedFileLike | undefined,
  ) {
    if (!user) throw new UnauthorizedException('Usuário não autenticado.');
    if (!file?.buffer || file.size < 5) {
      throw new BadRequestException('Arquivo não informado ou vazio.');
    }
    if (
      file.mimetype !== 'application/pdf' ||
      file.buffer.subarray(0, 5).toString('ascii') !== '%PDF-'
    ) {
      throw new BadRequestException('Apenas arquivos PDF válidos são aceitos.');
    }

    return this.expenses.uploadAttachment({
      userId: user.id,
      userName: user.name,
      expenseId,
      originalName: file.originalname,
      mimeType: 'application/pdf',
      data: file.buffer,
    });
  }

  @Delete(':id/attachments/:key')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(AppPermission.LogisticsExpensesManage)
  @ApiOperation({ summary: 'Remover comprovante de despesa editável' })
  removeAttachment(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseIntPipe) expenseId: number,
    @Param('key') rawKey: string,
  ): Promise<void> {
    if (!user) throw new UnauthorizedException('Usuário não autenticado.');
    return this.expenses.deleteAttachment(
      user.id,
      expenseId,
      attachmentKey(rawKey),
    );
  }

  @Get(':id/attachments/:key/content')
  @RequirePermissions(AppPermission.LogisticsExpensesRead)
  @ApiOperation({ summary: 'Abrir comprovante PDF de RD' })
  async attachmentContent(
    @Param('id', ParseIntPipe) expenseId: number,
    @Param('key') rawKey: string,
  ): Promise<StreamableFile> {
    const content = await this.expenses.attachmentContent(
      expenseId,
      attachmentKey(rawKey),
    );

    return new StreamableFile(content.data, {
      type: content.mimeType,
      disposition:
        `inline; filename*=UTF-8''${encodeURIComponent(content.name)}`,
    });
  }
}
