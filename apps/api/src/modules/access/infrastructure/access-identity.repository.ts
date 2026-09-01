import { Inject, Injectable } from '@nestjs/common';
import type { Nivel3DatabaseClient } from '@helpdesk/database';
import { NIVEL3_DATABASE } from '../../../core/database/database.constants';
import type { LegacyUserSession } from '../domain/legacy-user-session';

interface IdentityRow {
  user_id: number;
  user_sts: number | null;
  user_nome: string | null;
  user_login: string | null;
  user_funcao: number | null;
  user_pass: string | null;
  user_modulo_01: string;
  user_modulo_02: string;
  user_modulo_03: string;
  user_modulo_04: string;
  user_modulo_05: string;
  user_modulo_06: string;
  user_modulo_07: string;
  user_modulo_08: string;
  user_modulo_09: string;
}

export interface AccessCredential {
  session: LegacyUserSession;
  passwordHash: string;
}

@Injectable()
export class AccessIdentityRepository {
  constructor(
    @Inject(NIVEL3_DATABASE)
    private readonly database: Nivel3DatabaseClient,
  ) {}

  async findActiveByLogin(login: string): Promise<AccessCredential | null> {
    const rows = await this.database.$queryRawUnsafe<IdentityRow[]>(
      `SELECT
         user_id,
         user_sts,
         user_nome,
         user_login,
         user_funcao,
         user_pass,
         user_modulo_01,
         user_modulo_02,
         user_modulo_03,
         user_modulo_04,
         user_modulo_05,
         user_modulo_06,
         user_modulo_07,
         user_modulo_08,
         user_modulo_09
       FROM usuarios
       WHERE user_login = ?
         AND user_sts = 1
       LIMIT 1`,
      login,
    );

    return this.toCredential(rows[0]);
  }

  async findActiveById(userId: number): Promise<AccessCredential | null> {
    const rows = await this.database.$queryRawUnsafe<IdentityRow[]>(
      `SELECT
         user_id,
         user_sts,
         user_nome,
         user_login,
         user_funcao,
         user_pass,
         user_modulo_01,
         user_modulo_02,
         user_modulo_03,
         user_modulo_04,
         user_modulo_05,
         user_modulo_06,
         user_modulo_07,
         user_modulo_08,
         user_modulo_09
       FROM usuarios
       WHERE user_id = ?
         AND user_sts = 1
       LIMIT 1`,
      userId,
    );

    return this.toCredential(rows[0]);
  }

  async recordLogin(userId: number): Promise<void> {
    await this.database.$executeRawUnsafe(
      `INSERT INTO log_uso (log_area, log_user, log_time, log_action)
       VALUES ('1', ?, NOW(), 'Logou via API.')`,
      userId,
    );
  }

  private toCredential(row: IdentityRow | undefined): AccessCredential | null {
    if (
      !row ||
      row.user_sts !== 1 ||
      !row.user_nome ||
      !row.user_login ||
      !row.user_pass
    ) {
      return null;
    }

    return {
      passwordHash: row.user_pass,
      session: {
        id: row.user_id,
        name: row.user_nome,
        login: row.user_login,
        functionId: row.user_funcao,
        modules: {
          1: row.user_modulo_01,
          2: row.user_modulo_02,
          3: row.user_modulo_03,
          4: row.user_modulo_04,
          5: row.user_modulo_05,
          6: row.user_modulo_06,
          7: row.user_modulo_07,
          8: row.user_modulo_08,
          9: row.user_modulo_09,
        },
      },
    };
  }
}
