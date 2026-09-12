import { Inject, Injectable } from '@nestjs/common';
import { Sector } from '@helpdesk/contracts';
import type { Nivel3DatabaseClient } from '@helpdesk/database';
import { NIVEL3_DATABASE } from '../../../../core/database/database.constants';
import {
  TicketTypeAccessRepository,
  type TicketTypeAccessSnapshot,
} from '../../application/ports/ticket-type-access.repository';

interface AccessRow {
  user_modulo_03: string | null;
  user_modulo_05: string | null;
  user_modulo_08: string | null;
}

function normalized(value: string | null): string {
  return value?.trim() || '0000000000';
}

function enabled(value: string): boolean {
  const first = value[0];
  return first !== undefined && /^\d$/.test(first) && Number(first) >= 1;
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
    const rows = await this.database.$queryRawUnsafe<AccessRow[]>(
      `SELECT user_modulo_03, user_modulo_05, user_modulo_08
       FROM usuarios
       WHERE user_id = ? AND user_sts = 1
       LIMIT 1`,
      userId,
    );
    const row = rows[0];
    if (!row) return { sectors: [], modules: {} };

    const atendimento = normalized(row.user_modulo_03);
    const devops = normalized(row.user_modulo_05);
    const marketing = normalized(row.user_modulo_08);
    const sectors: Sector[] = [];
    if (enabled(atendimento)) sectors.push(Sector.IT);
    if (enabled(devops)) sectors.push(Sector.DevOps);
    if (enabled(marketing)) sectors.push(Sector.Marketing);

    return {
      sectors,
      modules: {
        [Sector.IT]: atendimento,
        [Sector.DevOps]: devops,
        [Sector.Marketing]: marketing,
      },
    };
  }
}
