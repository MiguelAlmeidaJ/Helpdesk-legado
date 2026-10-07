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
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import {
  AppPermission,
  type TicketProjectFlowTemplate,
  type TicketProjectFlowTemplateApplyResponse,
  type TicketProjectFlowTemplatesResponse,
  type TicketProjectFlowTemplateWriteRequest,
} from '@helpdesk/contracts';
import { LEGACY_SESSION_SECURITY } from '../../../../core/openapi/openapi.constants';
import type { AuthenticatedUser } from '../../../access/domain/authenticated-user';
import { CurrentUser } from '../../../access/presentation/http/current-user.decorator';
import { LegacySessionGuard } from '../../../access/presentation/http/legacy-session.guard';
import { RequirePermissions } from '../../../access/presentation/http/require-permissions.decorator';
import { TicketProjectFlowTemplatesService } from '../../application/ticket-project-flow-templates.service';
import { DevOpsPermissionsGuard } from '../../types/devops/devops-permissions.guard';

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new BadRequestException('Corpo da requisição inválido.');
  }
  return value as Record<string, unknown>;
}

function text(value: unknown, field: string, min: number, max: number): string {
  if (typeof value !== 'string') {
    throw new BadRequestException(`${field} é obrigatório.`);
  }
  const normalized = value.trim();
  if (normalized.length < min || normalized.length > max) {
    throw new BadRequestException(`${field} deve ter entre ${min} e ${max} caracteres.`);
  }
  return normalized;
}

function writeRequest(body: unknown): TicketProjectFlowTemplateWriteRequest {
  const value = record(body);
  if (!Array.isArray(value.steps) || value.steps.length < 1 || value.steps.length > 100) {
    throw new BadRequestException('O template deve possuir entre 1 e 100 etapas.');
  }

  const keys = new Set<string>();
  const steps = value.steps.map((rawStep, index) => {
    const step = record(rawStep);
    const key = text(step.key, `steps[${index}].key`, 1, 64);
    if (!/^[A-Za-z0-9_-]+$/.test(key) || keys.has(key)) {
      throw new BadRequestException(`A chave da etapa ${index + 1} é inválida ou duplicada.`);
    }
    keys.add(key);
    const durationDays = Number(step.durationDays);
    if (!Number.isSafeInteger(durationDays) || durationDays < 0 || durationDays > 3650) {
      throw new BadRequestException(`A duração da etapa ${index + 1} deve estar entre 0 e 3650 dias.`);
    }
    const dependsOnKey = step.dependsOnKey === null || step.dependsOnKey === ''
      ? null
      : text(step.dependsOnKey, `steps[${index}].dependsOnKey`, 1, 64);
    if (dependsOnKey === key) {
      throw new BadRequestException(`A etapa ${index + 1} não pode depender dela mesma.`);
    }
    return {
      key,
      name: text(step.name, `steps[${index}].name`, 1, 160),
      description: text(step.description ?? '', `steps[${index}].description`, 0, 10_000),
      durationDays,
      dependsOnKey,
    };
  });

  for (const step of steps) {
    if (step.dependsOnKey && !keys.has(step.dependsOnKey)) {
      throw new BadRequestException(`A dependência da etapa “${step.name}” não existe.`);
    }
  }

  return {
    name: text(value.name, 'name', 2, 160),
    description: text(value.description ?? '', 'description', 0, 5_000),
    steps,
  };
}

@ApiTags('ticket-project-flow-templates')
@Controller('tickets')
@UseGuards(LegacySessionGuard, DevOpsPermissionsGuard)
@ApiSecurity(LEGACY_SESSION_SECURITY)
export class TicketProjectFlowTemplatesController {
  constructor(private readonly templates: TicketProjectFlowTemplatesService) {}

  @Get('project-flow-templates')
  @RequirePermissions(AppPermission.DevOpsProjectsRead)
  @ApiOperation({ summary: 'Listar templates de fluxos de projetos DevOps' })
  async list(): Promise<TicketProjectFlowTemplatesResponse> {
    return { data: await this.templates.list() };
  }

  @Post('project-flow-templates')
  @RequirePermissions(AppPermission.DevOpsProjectsEdit)
  @ApiOperation({ summary: 'Criar template de fluxo de projeto DevOps' })
  create(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() body: unknown,
  ): Promise<TicketProjectFlowTemplate> {
    if (!user) throw new UnauthorizedException('Usuário não autenticado.');
    return this.templates.create(user, writeRequest(body));
  }

  @Patch('project-flow-templates/:templateId')
  @RequirePermissions(AppPermission.DevOpsProjectsEdit)
  @ApiOperation({ summary: 'Atualizar template de fluxo de projeto DevOps' })
  update(
    @Param('templateId', ParseIntPipe) templateId: number,
    @Body() body: unknown,
  ): Promise<TicketProjectFlowTemplate> {
    return this.templates.update(templateId, writeRequest(body));
  }

  @Delete('project-flow-templates/:templateId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(AppPermission.DevOpsProjectsEdit)
  @ApiOperation({ summary: 'Arquivar template de fluxo de projeto DevOps' })
  remove(@Param('templateId', ParseIntPipe) templateId: number): Promise<void> {
    return this.templates.remove(templateId);
  }

  @Post('projects/:projectId/flow-templates/:templateId/apply')
  @RequirePermissions(AppPermission.DevOpsProjectsEdit)
  @ApiOperation({ summary: 'Aplicar template e criar tarefas no projeto DevOps' })
  apply(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('templateId', ParseIntPipe) templateId: number,
  ): Promise<TicketProjectFlowTemplateApplyResponse> {
    if (!user) throw new UnauthorizedException('Usuário não autenticado.');
    return this.templates.apply(user, projectId, templateId);
  }
}
