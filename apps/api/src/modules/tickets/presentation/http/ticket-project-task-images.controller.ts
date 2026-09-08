import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  StreamableFile,
  UnauthorizedException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { AppPermission } from '@helpdesk/contracts';
import { LEGACY_SESSION_SECURITY } from '../../../../core/openapi/openapi.constants';
import type { AuthenticatedUser } from '../../../access/domain/authenticated-user';
import { CurrentUser } from '../../../access/presentation/http/current-user.decorator';
import { LegacySessionGuard } from '../../../access/presentation/http/legacy-session.guard';
import { PermissionsGuard } from '../../../access/presentation/http/permissions.guard';
import { RequirePermissions } from '../../../access/presentation/http/require-permissions.decorator';
import { TicketProjectTaskImages } from '../../application/ticket-project-task-images';

interface UploadedFileLike {
  size: number;
  buffer: Buffer;
}

function jpeg(file: UploadedFileLike | undefined): Buffer {
  if (!file?.buffer || file.size < 3) {
    throw new BadRequestException('Imagem não informada ou vazia.');
  }

  const data = file.buffer;
  const isJpeg =
    data.length >= 3 &&
    data[0] === 0xff &&
    data[1] === 0xd8 &&
    data[2] === 0xff;

  if (!isJpeg) {
    throw new BadRequestException(
      'Somente imagens JPEG são aceitas para tarefas de projeto.',
    );
  }

  return data;
}

const imageUpload = FileInterceptor('file', {
  limits: {
    fileSize: 25 * 1024 * 1024,
    files: 1,
  },
});

const imageBody: Parameters<typeof ApiBody>[0] = {
  schema: {
    type: 'object',
    required: ['file'],
    properties: {
      file: {
        type: 'string',
        format: 'binary',
      },
    },
  },
};

@ApiTags('ticket-project-task-images')
@Controller('tickets/projects/tasks')
@UseGuards(LegacySessionGuard, PermissionsGuard)
@RequirePermissions(AppPermission.TicketsRead)
@ApiSecurity(LEGACY_SESSION_SECURITY)
export class TicketProjectTaskImagesController {
  constructor(private readonly images: TicketProjectTaskImages) {}

  @Get(':taskId/images')
  @ApiOperation({ summary: 'Listar imagens da tarefa de projeto' })
  list(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('taskId', ParseIntPipe) taskId: number,
  ) {
    if (!user) {
      throw new UnauthorizedException('Usuário não autenticado.');
    }

    return this.images.list(user, taskId);
  }

  @Get(':taskId/images/:imageId/content')
  @ApiOperation({ summary: 'Abrir imagem da tarefa de projeto' })
  async content(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('taskId', ParseIntPipe) taskId: number,
    @Param('imageId', ParseIntPipe) imageId: number,
  ): Promise<StreamableFile> {
    if (!user) {
      throw new UnauthorizedException('Usuário não autenticado.');
    }

    const content = await this.images.content(user, taskId, imageId);
    return new StreamableFile(content.data, {
      type: content.mimeType,
      disposition: `inline; filename*=UTF-8''${encodeURIComponent(content.name)}`,
    });
  }

  @Post(':taskId/images')
  @RequirePermissions(
    AppPermission.TicketsRead,
    AppPermission.TicketsExecute,
  )
  @UseInterceptors(imageUpload)
  @ApiConsumes('multipart/form-data')
  @ApiBody(imageBody)
  @ApiOperation({ summary: 'Adicionar imagem à tarefa de projeto' })
  async add(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('taskId', ParseIntPipe) taskId: number,
    @UploadedFile() file: UploadedFileLike | undefined,
  ) {
    if (!user) {
      throw new UnauthorizedException('Usuário não autenticado.');
    }

    return this.images.add(user, taskId, jpeg(file));
  }

  @Put(':taskId/images/:imageId')
  @RequirePermissions(
    AppPermission.TicketsRead,
    AppPermission.TicketsExecute,
  )
  @UseInterceptors(imageUpload)
  @ApiConsumes('multipart/form-data')
  @ApiBody(imageBody)
  @ApiOperation({ summary: 'Substituir imagem da tarefa de projeto' })
  async replace(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('taskId', ParseIntPipe) taskId: number,
    @Param('imageId', ParseIntPipe) imageId: number,
    @UploadedFile() file: UploadedFileLike | undefined,
  ) {
    if (!user) {
      throw new UnauthorizedException('Usuário não autenticado.');
    }

    return this.images.replace(user, taskId, imageId, jpeg(file));
  }

  @Delete(':taskId/images/:imageId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(
    AppPermission.TicketsRead,
    AppPermission.TicketsExecute,
  )
  @ApiOperation({ summary: 'Excluir imagem da tarefa de projeto' })
  @ApiResponse({ status: 204, description: 'Imagem excluída.' })
  async remove(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('taskId', ParseIntPipe) taskId: number,
    @Param('imageId', ParseIntPipe) imageId: number,
  ): Promise<void> {
    if (!user) {
      throw new UnauthorizedException('Usuário não autenticado.');
    }

    await this.images.remove(user, taskId, imageId);
  }
}
