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

const PREFIX: Record<TicketSector, string> = {
  [Sector.IT]: 'atendimentos',
  [Sector.DevOps]: 'devops.atendimentos',
  [Sector.Marketing]: 'marketing.atendimentos',
};

function has(
  slugs: ReadonlySet<string>,
  sector: TicketSector,
  action: string,
): boolean {
  return slugs.has(`${PREFIX[sector]}.${action}`);
}

function permissionsFor(
  slugs: ReadonlySet<string>,
  sector: TicketSector,
): TicketTypePermissions {
  return {
    read: has(slugs, sector, 'visualizar'),
    create: has(slugs, sector, 'criar'),
    edit: has(slugs, sector, 'editar'),
    execute: has(slugs, sector, 'executar'),
    hold: has(slugs, sector, 'colocar_espera'),
    reject: has(slugs, sector, 'recusar'),
    manageOthers: has(slugs, sector, 'editar_terceiros'),
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
