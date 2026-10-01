import { Inject, Injectable } from '@nestjs/common';
import { Sector } from '@helpdesk/contracts';
import type { Nivel3DatabaseClient } from '@helpdesk/database';
import { NIVEL3_DATABASE } from '../../../../core/database/database.constants';
import {
  TicketTypeAccessRepository,
  type TicketTypeAccessSnapshot,
  type TicketTypePermissions,
} from '../../application/ports/ticket-type-access.repository';

type PermissionRow = {
  slug: string;
  effect: 'allow' | 'deny';
};

type TicketSector = Sector.IT | Sector.DevOps | Sector.Marketing;

function permissionsFor(
  slugs: ReadonlySet<string>,
  sector: TicketSector,
): TicketTypePermissions {
  if (sector === Sector.IT) {
    return {
      read: slugs.has('atendimentos.visualizar'),
      create: slugs.has('atendimentos.criar'),
      edit: slugs.has('atendimentos.editar'),
      execute: slugs.has('atendimentos.finalizar'),
      hold: slugs.has('atendimentos.colocar_espera'),
      reject: false,
      manageOthers: slugs.has('atendimentos.editar'),
    };
  }

  if (sector === Sector.DevOps) {
    const projectRead =
      slugs.has('devops.projetos.visualizar') ||
      slugs.has('devops.projetos.criar') ||
      slugs.has('devops.projetos.editar');
    const taskRead =
      slugs.has('devops.tarefas.visualizar') ||
      slugs.has('devops.tarefas.criar') ||
      slugs.has('devops.tarefas.editar');
    const edit =
      slugs.has('devops.projetos.editar') ||
      slugs.has('devops.tarefas.editar');

    return {
      read: projectRead || taskRead,
      create:
        slugs.has('devops.projetos.criar') ||
        slugs.has('devops.tarefas.criar'),
      edit,
      execute: slugs.has('devops.tarefas.editar'),
      hold: slugs.has('devops.tarefas.editar'),
      reject: false,
      manageOthers: edit,
    };
  }

  const read =
    slugs.has('marketing.tarefas.visualizar') ||
    slugs.has('marketing.tarefas.criar') ||
    slugs.has('marketing.tarefas.editar') ||
    slugs.has('marketing.tarefas.colocar_espera') ||
    slugs.has('marketing.tarefas.finalizar');

  return {
    read,
    create: slugs.has('marketing.tarefas.criar'),
    edit: slugs.has('marketing.tarefas.editar'),
    execute: slugs.has('marketing.tarefas.finalizar'),
    hold: slugs.has('marketing.tarefas.colocar_espera'),
    reject: false,
    manageOthers: slugs.has('marketing.tarefas.editar'),
  };
}

@Injectable()
export class PrismaTicketTypeAccessRepository extends TicketTypeAccessRepository {
  constructor(
    @Inject(NIVEL3_DATABASE)
    private readonly database: Nivel3DatabaseClient,
  ) {
    super();
  }

  async findByUserId(userId: number): Promise<TicketTypeAccessSnapshot> {
    const rows = await this.database.$queryRawUnsafe<PermissionRow[]>(
      `SELECT p.slug, 'allow' AS effect
       FROM user_roles ur
       INNER JOIN role_permissions rp ON rp.role_id = ur.role_id
       INNER JOIN permissions p ON p.id = rp.permission_id
       WHERE ur.user_id = ?
       UNION ALL
       SELECT p.slug, up.effect
       FROM user_permissions up
       INNER JOIN permissions p ON p.id = up.permission_id
       WHERE up.user_id = ?`,
      userId,
      userId,
    );

    const slugs = new Set<string>();
    const denied = new Set<string>();

    for (const row of rows) {
      if (row.effect === 'deny') {
        denied.add(row.slug);
        slugs.delete(row.slug);
      } else if (!denied.has(row.slug)) {
        slugs.add(row.slug);
      }
    }

    const permissions = {
      [Sector.IT]: permissionsFor(slugs, Sector.IT),
      [Sector.DevOps]: permissionsFor(slugs, Sector.DevOps),
      [Sector.Marketing]: permissionsFor(slugs, Sector.Marketing),
    };

    const sectors = (Object.entries(permissions) as Array<
      [Sector, TicketTypePermissions]
    >)
      .filter(([, value]) => value.read)
      .map(([sector]) => sector);

    return { sectors, permissions };
  }
}
