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
  StreamableFile,
  UnauthorizedException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import {
  AppPermission,
  type MaintenanceBackupJobInput,
  type MaintenanceBackupRunRequest,
  type MaintenanceBackupRunResponse,
  type MaintenanceDatabaseKey,
  type MaintenanceDatabaseTable,
  type MaintenanceDumpApplyRequest,
  type MaintenanceDumpApplyResponse,
  type MaintenanceDumpStageResponse,
  type MaintenanceRepairRequest,
  type MaintenanceRepairResponse,
  type MaintenanceSystemStatusResponse,
} from '@helpdesk/contracts';
import { createReadStream } from 'node:fs';
import { tmpdir } from 'node:os';
import { LEGACY_SESSION_SECURITY } from '../../../core/openapi/openapi.constants';
import type { AuthenticatedUser } from '../../access/domain/authenticated-user';
import { CurrentUser } from '../../access/presentation/http/current-user.decorator';
import { LegacySessionGuard } from '../../access/presentation/http/legacy-session.guard';
import { PermissionsGuard } from '../../access/presentation/http/permissions.guard';
import { RequirePermissions } from '../../access/presentation/http/require-permissions.decorator';
import { MaintenanceService } from '../../maintenance/application/maintenance.service';

function recordBody(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new BadRequestException('Corpo da requisição inválido.');
  }
  return body as Record<string, unknown>;
}

function database(value: unknown): MaintenanceDatabaseKey {
  if (value === 'nivel3' || value === 'n3rd') return value;
  throw new BadRequestException('Banco alvo inválido.');
}

function target(value: unknown): 'nivel3' | 'n3rd' | 'all' {
  if (value === 'nivel3' || value === 'n3rd' || value === 'all') return value;
  throw new BadRequestException('Alvo de backup inválido.');
}

function jobInput(body: unknown): MaintenanceBackupJobInput {
  const input = recordBody(body);
  const frequency =
    input.frequency === 'weekly'
      ? 'weekly'
      : input.frequency === 'daily'
        ? 'daily'
        : null;
  if (!frequency) throw new BadRequestException('Frequência inválida.');
  if (typeof input.time !== 'string') {
    throw new BadRequestException('Horário é obrigatório.');
  }
  if (typeof input.retentionDays !== 'number') {
    throw new BadRequestException('Retenção é obrigatória.');
  }
  if (typeof input.enabled !== 'boolean') {
    throw new BadRequestException('enabled deve ser booleano.');
  }
  return {
    target: target(input.target),
    frequency,
    time: input.time,
    weekday:
      frequency === 'weekly' && typeof input.weekday === 'number'
        ? input.weekday
        : null,
    retentionDays: input.retentionDays,
    enabled: input.enabled,
  };
}

function actor(user: AuthenticatedUser | undefined): AuthenticatedUser {
  if (!user) throw new UnauthorizedException('Usuário não autenticado.');
  return user;
}

function maxDumpBytes(): number {
  const mb = Number(process.env.MAINTENANCE_DUMP_MAX_MB ?? 1024);
  const safeMb = Number.isFinite(mb) ? Math.max(1, Math.min(4096, mb)) : 1024;
  return Math.floor(safeMb * 1024 * 1024);
}

@ApiTags('maintenance')
@Controller('maintenance')
@UseGuards(LegacySessionGuard, PermissionsGuard)
@RequirePermissions(AppPermission.SystemAdmin)
@ApiSecurity(LEGACY_SESSION_SECURITY)
export class MaintenanceController {
  constructor(private readonly maintenance: MaintenanceService) {}

  @Get('status')
  @ApiOperation({ summary: 'Obter status de manutenção do sistema e bancos' })
  status(): Promise<MaintenanceSystemStatusResponse> {
    return this.maintenance.status();
  }

  @Get('databases/:database/tables')
  @ApiOperation({ summary: 'Listar tabelas e tamanhos do banco' })
  tables(
    @Param('database') databaseName: string,
  ): Promise<MaintenanceDatabaseTable[]> {
    return this.maintenance.databaseTables(database(databaseName));
  }

  @Post('backups')
  @ApiOperation({ summary: 'Executar backup manual' })
  backup(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() body: unknown,
  ): Promise<MaintenanceBackupRunResponse> {
    const input = recordBody(body) as unknown as MaintenanceBackupRunRequest;
    return this.maintenance.runManualBackup(
      target(input.target),
      actor(user).id,
    );
  }

  @Get('backups/:name')
  @ApiOperation({ summary: 'Baixar arquivo de backup' })
  async downloadBackup(@Param('name') name: string): Promise<StreamableFile> {
    const file = await this.maintenance.backupFile(name);
    return new StreamableFile(createReadStream(file), {
      type: 'application/sql; charset=utf-8',
      disposition: 'attachment; filename="' + name.replace(/"/g, '') + '"',
    });
  }

  @Delete('backups/:name')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Excluir arquivo de backup' })
  async deleteBackup(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('name') name: string,
  ): Promise<void> {
    await this.maintenance.removeBackup(name, actor(user).id);
  }

  @Post('backup-jobs')
  @ApiOperation({ summary: 'Criar job de backup' })
  createJob(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() body: unknown,
  ) {
    return this.maintenance.createJob(jobInput(body), actor(user).id);
  }

  @Patch('backup-jobs/:id')
  @ApiOperation({ summary: 'Atualizar job de backup' })
  updateJob(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
  ) {
    if (id < 1) throw new BadRequestException('id inválido.');
    return this.maintenance.updateJob(id, jobInput(body));
  }

  @Delete('backup-jobs/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Excluir job de backup' })
  async deleteJob(@Param('id', ParseIntPipe) id: number): Promise<void> {
    if (id < 1) throw new BadRequestException('id inválido.');
    await this.maintenance.removeJob(id);
  }

  @Post('dumps/stage')
  @UseInterceptors(
    FileInterceptor('file', {
      dest: tmpdir(),
      limits: { fileSize: maxDumpBytes(), files: 1 },
    }),
  )
  @ApiOperation({ summary: 'Validar e preparar dump para importação' })
  stageDump(
    @UploadedFile()
    file:
      | {
          path: string;
          originalname: string;
          size: number;
          mimetype?: string;
        }
      | undefined,
    @Body('target') targetValue: string,
  ): Promise<MaintenanceDumpStageResponse> {
    if (!file) throw new BadRequestException('Arquivo .sql é obrigatório.');
    return this.maintenance.stageDump(database(targetValue), file);
  }

  @Post('dumps/:token/apply')
  @ApiOperation({ summary: 'Aplicar dump validado com backup de segurança' })
  applyDump(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('token') token: string,
    @Body() body: unknown,
  ): Promise<MaintenanceDumpApplyResponse> {
    const input = recordBody(body) as unknown as MaintenanceDumpApplyRequest;
    if (typeof input.confirmation !== 'string') {
      throw new BadRequestException('Confirmação é obrigatória.');
    }
    return this.maintenance.applyDump(
      token,
      input.confirmation,
      actor(user).id,
    );
  }

  @Post('repair')
  @ApiOperation({ summary: 'Executar adequações nativas após restauração' })
  repair(@Body() body: unknown): Promise<MaintenanceRepairResponse> {
    const input = recordBody(body) as unknown as MaintenanceRepairRequest;
    return this.maintenance.repair(database(input.target));
  }
}
