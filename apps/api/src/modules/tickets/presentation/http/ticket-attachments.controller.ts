import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
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
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import {
  AppPermission,
  type TicketAttachmentKind,
} from '@helpdesk/contracts';
import { LEGACY_SESSION_SECURITY } from '../../../../core/openapi/openapi.constants';
import type { AuthenticatedUser } from '../../../access/domain/authenticated-user';
import { CurrentUser } from '../../../access/presentation/http/current-user.decorator';
import { LegacySessionGuard } from '../../../access/presentation/http/legacy-session.guard';
import { PermissionsGuard } from '../../../access/presentation/http/permissions.guard';
import { RequirePermissions } from '../../../access/presentation/http/require-permissions.decorator';
import { TicketAttachments } from '../../application/ticket-attachments';

interface UploadedFileLike {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

interface HeaderResponse {
  setHeader(name: string, value: string): void;
}

function kind(value: string): TicketAttachmentKind {
  if (value !== 'document' && value !== 'image') {
    throw new BadRequestException('Tipo de anexo inválido.');
  }
  return value;
}

@ApiTags('tickets')
@Controller('tickets')
@UseGuards(LegacySessionGuard, PermissionsGuard)
@ApiSecurity(LEGACY_SESSION_SECURITY)
export class TicketAttachmentsController {
  constructor(private readonly attachments: TicketAttachments) {}

  @Get(':id/attachments')
  @RequirePermissions(AppPermission.TicketsRead)
  @ApiOperation({ summary: 'Listar anexos do atendimento' })
  list(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseIntPipe) ticketId: number,
  ) {
    if (!user) throw new UnauthorizedException('Usuário não autenticado.');
    return this.attachments.list(user, ticketId);
  }

  @Get(':id/attachments/:kind/:attachmentId/content')
  @RequirePermissions(AppPermission.TicketsRead)
  @ApiOperation({ summary: 'Abrir conteúdo de um anexo' })
  async content(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseIntPipe) ticketId: number,
    @Param('kind') rawKind: string,
    @Param('attachmentId', ParseIntPipe) attachmentId: number,
  ): Promise<StreamableFile> {
    if (!user) throw new UnauthorizedException('Usuário não autenticado.');
    const content = await this.attachments.content(
      user,
      ticketId,
      kind(rawKind),
      attachmentId,
    );
    return new StreamableFile(content.data, {
      type: content.mimeType,
      disposition: `inline; filename*=UTF-8''${encodeURIComponent(content.name)}`,
    });
  }

  @Post(':id/attachments')
  @RequirePermissions(
    AppPermission.TicketsRead,
    AppPermission.TicketsExecute,
  )
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 25 * 1024 * 1024,
        files: 1,
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Adicionar anexo ao atendimento' })
  async upload(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseIntPipe) ticketId: number,
    @UploadedFile() file: UploadedFileLike | undefined,
  ) {
    if (!user) throw new UnauthorizedException('Usuário não autenticado.');
    if (!file?.buffer || file.size < 1) {
      throw new BadRequestException('Arquivo não informado ou vazio.');
    }
    return this.attachments.add(user, ticketId, {
      originalName: file.originalname,
      mimeType: file.mimetype || 'application/octet-stream',
      data: file.buffer,
    });
  }

  @Delete(':id/attachments/:kind/:attachmentId')
  @RequirePermissions(
    AppPermission.TicketsRead,
    AppPermission.TicketsExecute,
  )
  @ApiOperation({ summary: 'Excluir anexo do atendimento' })
  async remove(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseIntPipe) ticketId: number,
    @Param('kind') rawKind: string,
    @Param('attachmentId', ParseIntPipe) attachmentId: number,
  ): Promise<void> {
    if (!user) throw new UnauthorizedException('Usuário não autenticado.');
    await this.attachments.delete(
      user,
      ticketId,
      kind(rawKind),
      attachmentId,
    );
  }
}
