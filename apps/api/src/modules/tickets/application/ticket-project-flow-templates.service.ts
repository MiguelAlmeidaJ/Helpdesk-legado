import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  type OnModuleInit,
} from '@nestjs/common';
import type {
  TicketProjectFlowTemplate,
  TicketProjectFlowTemplateApplyResponse,
  TicketProjectFlowTemplateStep,
  TicketProjectFlowTemplateWriteRequest,
} from '@helpdesk/contracts';
import type { Nivel3DatabaseClient } from '@helpdesk/database';
import { NIVEL3_DATABASE } from '../../../core/database/database.constants';
import type { AuthenticatedUser } from '../../access/domain/authenticated-user';
import { ListTicketProjects } from './list-ticket-projects';

const CREATE_TEMPLATES_TABLE = `
CREATE TABLE IF NOT EXISTS devops_flow_templates (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(160) NOT NULL,
  description TEXT NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_by INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_devops_flow_templates_active_name (is_active, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;

const CREATE_STEPS_TABLE = `
CREATE TABLE IF NOT EXISTS devops_flow_template_steps (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  template_id INT UNSIGNED NOT NULL,
  step_key VARCHAR(64) NOT NULL,
  name VARCHAR(160) NOT NULL,
  description TEXT NOT NULL,
  duration_days SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  depends_on_key VARCHAR(64) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_devops_flow_template_step_key (template_id, step_key),
  KEY idx_devops_flow_template_steps_order (template_id, sort_order, id),
  CONSTRAINT fk_devops_flow_template_steps_template
    FOREIGN KEY (template_id) REFERENCES devops_flow_templates(id)
    ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;

const CREATE_APPLICATIONS_TABLE = `
CREATE TABLE IF NOT EXISTS devops_flow_template_applications (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  project_id INT NOT NULL,
  template_id INT UNSIGNED NOT NULL,
  applied_by INT NOT NULL,
  applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_devops_flow_template_application (project_id, template_id),
  KEY idx_devops_flow_template_applications (template_id, applied_at),
  CONSTRAINT fk_devops_flow_template_applications_template
    FOREIGN KEY (template_id) REFERENCES devops_flow_templates(id)
    ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;

interface TemplateRow {
  id: number | bigint;
  name: string;
  description: string;
  created_by: number | bigint;
  created_by_name: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

interface StepRow {
  template_id: number | bigint;
  step_key: string;
  name: string;
  description: string;
  duration_days: number | bigint;
  depends_on_key: string | null;
  sort_order: number | bigint;
}

interface ProjectRow {
  id: number;
  status: number | null;
  cliente: number | null;
  pessoa: number | null;
  local: number | null;
  tipo: number | null;
  categoria: number | null;
  subcategoria: number | null;
  item: number | null;
  nivel: number | null;
  forma: number | null;
  tecnico: number | null;
}

interface IdRow {
  id: number | bigint;
}

type QueryClient = Pick<
  Nivel3DatabaseClient,
  '$executeRawUnsafe' | '$queryRawUnsafe'
>;

function isoDate(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
}

function orderedSteps(
  steps: TicketProjectFlowTemplateStep[],
): TicketProjectFlowTemplateStep[] {
  const byKey = new Map(steps.map((step) => [step.key, step]));
  const resolved = new Set<string>();
  const visiting = new Set<string>();
  const result: TicketProjectFlowTemplateStep[] = [];

  function visit(step: TicketProjectFlowTemplateStep) {
    if (resolved.has(step.key)) return;
    if (visiting.has(step.key)) {
      throw new ConflictException('O template possui um ciclo entre etapas.');
    }
    visiting.add(step.key);
    if (step.dependsOnKey) {
      const dependency = byKey.get(step.dependsOnKey);
      if (!dependency) {
        throw new BadRequestException(
          `A dependência da etapa “${step.name}” não existe no template.`,
        );
      }
      visit(dependency);
    }
    visiting.delete(step.key);
    resolved.add(step.key);
    result.push(step);
  }

  [...steps]
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .forEach(visit);
  return result;
}

@Injectable()
export class TicketProjectFlowTemplatesService implements OnModuleInit {
  private schemaPromise: Promise<void> | null = null;

  constructor(
    @Inject(NIVEL3_DATABASE)
    private readonly database: Nivel3DatabaseClient,
    private readonly projects: ListTicketProjects,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.ensureSchema();
  }

  async list(): Promise<TicketProjectFlowTemplate[]> {
    await this.ensureSchema();
    const [templates, steps] = await Promise.all([
      this.database.$queryRawUnsafe<TemplateRow[]>(
        `SELECT
           t.id, t.name, t.description, t.created_by, t.created_at, t.updated_at,
           u.user_nome AS created_by_name
         FROM devops_flow_templates t
         LEFT JOIN usuarios u ON u.user_id = t.created_by
         WHERE t.is_active = 1
         ORDER BY t.name ASC, t.id ASC`,
      ),
      this.database.$queryRawUnsafe<StepRow[]>(
        `SELECT
           s.template_id, s.step_key, s.name, s.description,
           s.duration_days, s.depends_on_key, s.sort_order
         FROM devops_flow_template_steps s
         INNER JOIN devops_flow_templates t ON t.id = s.template_id
         WHERE t.is_active = 1
         ORDER BY s.template_id ASC, s.sort_order ASC, s.id ASC`,
      ),
    ]);

    const stepsByTemplate = new Map<number, TicketProjectFlowTemplateStep[]>();
    for (const step of steps) {
      const templateId = Number(step.template_id);
      const values = stepsByTemplate.get(templateId) ?? [];
      values.push({
        key: step.step_key,
        name: step.name,
        description: step.description,
        durationDays: Number(step.duration_days),
        dependsOnKey: step.depends_on_key,
        sortOrder: Number(step.sort_order),
      });
      stepsByTemplate.set(templateId, values);
    }

    return templates.map((template) => ({
      id: Number(template.id),
      name: template.name,
      description: template.description,
      createdBy: {
        id: Number(template.created_by) || null,
        name: template.created_by_name,
      },
      createdAt: isoDate(template.created_at),
      updatedAt: isoDate(template.updated_at),
      steps: stepsByTemplate.get(Number(template.id)) ?? [],
    }));
  }

  async create(
    user: AuthenticatedUser,
    input: TicketProjectFlowTemplateWriteRequest,
  ): Promise<TicketProjectFlowTemplate> {
    await this.ensureSchema();
    const id = await this.database.$transaction(async (transaction) => {
      await transaction.$executeRawUnsafe(
        `INSERT INTO devops_flow_templates
           (name, description, is_active, created_by, created_at, updated_at)
         VALUES (?, ?, 1, ?, NOW(), NOW())`,
        input.name,
        input.description,
        user.id,
      );
      const templateId = await this.lastInsertId(transaction);
      await this.writeSteps(transaction, templateId, input.steps);
      return templateId;
    });
    return this.find(id);
  }

  async update(
    templateId: number,
    input: TicketProjectFlowTemplateWriteRequest,
  ): Promise<TicketProjectFlowTemplate> {
    await this.ensureSchema();
    await this.database.$transaction(async (transaction) => {
      const changed = await transaction.$executeRawUnsafe(
        `UPDATE devops_flow_templates
         SET name = ?, description = ?, updated_at = NOW()
         WHERE id = ? AND is_active = 1`,
        input.name,
        input.description,
        templateId,
      );
      if (Number(changed) === 0) {
        throw new NotFoundException('Template de fluxo não encontrado.');
      }
      await transaction.$executeRawUnsafe(
        'DELETE FROM devops_flow_template_steps WHERE template_id = ?',
        templateId,
      );
      await this.writeSteps(transaction, templateId, input.steps);
    });
    return this.find(templateId);
  }

  async remove(templateId: number): Promise<void> {
    await this.ensureSchema();
    const changed = await this.database.$executeRawUnsafe(
      `UPDATE devops_flow_templates
       SET is_active = 0, updated_at = NOW()
       WHERE id = ? AND is_active = 1`,
      templateId,
    );
    if (Number(changed) === 0) {
      throw new NotFoundException('Template de fluxo não encontrado.');
    }
  }

  async apply(
    user: AuthenticatedUser,
    projectId: number,
    templateId: number,
  ): Promise<TicketProjectFlowTemplateApplyResponse> {
    await this.ensureSchema();
    const visible = await this.projects.projects({
      user,
      page: 1,
      limit: 1,
      filters: {
        statuses: [0, 1, 2, 3, 4],
        id: projectId,
        sort: 'id',
        direction: 'asc',
      },
    });
    if (!visible.data[0]) {
      throw new NotFoundException('Projeto não encontrado ou fora do seu escopo.');
    }

    const template = await this.find(templateId);
    if (template.steps.length === 0) {
      throw new BadRequestException('O template não possui etapas para aplicar.');
    }
    const steps = orderedSteps(template.steps);

    const createdTaskIds = await this.database.$transaction(
      async (transaction) => {
        const projectRows = await transaction.$queryRawUnsafe<ProjectRow[]>(
          `SELECT
             id, status, cliente, pessoa, \`local\`, tipo, categoria,
             subcategoria, item, nivel, forma, tecnico
           FROM projetos
           WHERE id = ?
           LIMIT 1
           FOR UPDATE`,
          projectId,
        );
        const project = projectRows[0];
        if (!project) throw new NotFoundException('Projeto não encontrado.');
        if (Number(project.status) === 4) {
          throw new ConflictException('Não é possível aplicar um fluxo a um projeto concluído.');
        }

        try {
          await transaction.$executeRawUnsafe(
            `INSERT INTO devops_flow_template_applications
               (project_id, template_id, applied_by, applied_at)
             VALUES (?, ?, ?, NOW())`,
            projectId,
            templateId,
            user.id,
          );
        } catch (reason) {
          if (reason instanceof Error && /duplicate|unique/i.test(reason.message)) {
            throw new ConflictException('Este template já foi aplicado ao projeto.');
          }
          throw reason;
        }

        const taskByStep = new Map<string, number>();
        const taskIds: number[] = [];
        for (const step of steps) {
          const dependencyTaskId = step.dependsOnKey
            ? taskByStep.get(step.dependsOnKey) ?? 0
            : 0;
          await transaction.$executeRawUnsafe(
            `INSERT INTO tarefas (
               id_projeto, tarefas_relacionadas, nome_tarefa, area, cliente,
               pessoa, \`local\`, tipo, categoria, subcategoria, item, nivel,
               forma, desc_abertura, abertura, tecnico, reincidente, dias,
               status, porcentagem
             ) VALUES (
               ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, 0, ?, 1, 0
             )`,
            projectId,
            dependencyTaskId,
            step.name,
            project.cliente ?? 0,
            project.pessoa ?? 0,
            project.local ?? 0,
            project.tipo ?? 0,
            project.categoria ?? 0,
            project.subcategoria ?? 0,
            project.item ?? 0,
            project.nivel ?? 1,
            project.forma ?? 1,
            step.description || `Etapa “${step.name}” criada pelo template “${template.name}”.`,
            project.tecnico ?? 0,
            step.durationDays,
          );
          const taskId = await this.lastInsertId(transaction);
          taskByStep.set(step.key, taskId);
          taskIds.push(taskId);
          await transaction.$executeRawUnsafe(
            `INSERT INTO inter_tarefa
               (inter_tipo, inter_tarefa, inter_user, inter_data, inter_desc)
             VALUES (1, ?, ?, NOW(), ?)`,
            taskId,
            user.id,
            `Tarefa criada pelo template de fluxo “${template.name}”.`,
          );
        }

        await transaction.$executeRawUnsafe(
          `INSERT INTO inter_projeto
             (inter_tipo, inter_projeto, inter_user, inter_data, inter_desc)
           VALUES (9, ?, ?, NOW(), ?)`,
          projectId,
          user.id,
          `Aplicou o template de fluxo “${template.name}” e criou ${taskIds.length} tarefa(s).`,
        );
        return taskIds;
      },
      { timeout: 30_000 },
    );

    return { templateId, projectId, createdTaskIds };
  }

  private async find(templateId: number): Promise<TicketProjectFlowTemplate> {
    const template = (await this.list()).find((item) => item.id === templateId);
    if (!template) throw new NotFoundException('Template de fluxo não encontrado.');
    return template;
  }

  private async writeSteps(
    transaction: QueryClient,
    templateId: number,
    steps: TicketProjectFlowTemplateWriteRequest['steps'],
  ): Promise<void> {
    orderedSteps(
      steps.map((step, index) => ({ ...step, sortOrder: index })),
    );
    for (const [index, step] of steps.entries()) {
      await transaction.$executeRawUnsafe(
        `INSERT INTO devops_flow_template_steps (
           template_id, step_key, name, description, duration_days,
           depends_on_key, sort_order
         ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        templateId,
        step.key,
        step.name,
        step.description,
        step.durationDays,
        step.dependsOnKey,
        index,
      );
    }
  }

  private async lastInsertId(client: QueryClient): Promise<number> {
    const rows = await client.$queryRawUnsafe<IdRow[]>(
      'SELECT LAST_INSERT_ID() AS id',
    );
    const id = Number(rows[0]?.id ?? 0);
    if (!Number.isSafeInteger(id) || id <= 0) {
      throw new Error('Não foi possível identificar o registro criado.');
    }
    return id;
  }

  private ensureSchema(): Promise<void> {
    if (!this.schemaPromise) {
      this.schemaPromise = (async () => {
        await this.database.$executeRawUnsafe(CREATE_TEMPLATES_TABLE);
        await this.database.$executeRawUnsafe(CREATE_STEPS_TABLE);
        await this.database.$executeRawUnsafe(CREATE_APPLICATIONS_TABLE);
      })().catch((reason: unknown) => {
        this.schemaPromise = null;
        throw reason;
      });
    }
    return this.schemaPromise;
  }
}
