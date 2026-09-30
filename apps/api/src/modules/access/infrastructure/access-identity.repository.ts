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
}

interface RecoveryIdentityRow {
  user_id: number;
  user_mail: string;
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
         user_pass
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
         user_pass
       FROM usuarios
       WHERE user_id = ?
         AND user_sts = 1
       LIMIT 1`,
      userId,
    );

    return this.toCredential(rows[0]);
  }

  async findActiveByEmail(
    email: string,
  ): Promise<{ id: number; email: string } | null> {
    const rows = await this.database.$queryRawUnsafe<RecoveryIdentityRow[]>(
      `SELECT user_id, user_mail
       FROM usuarios
       WHERE LOWER(user_mail) = LOWER(?)
         AND user_sts = 1
       LIMIT 1`,
      email,
    );
    const row = rows[0];

    return row ? { id: row.user_id, email: row.user_mail } : null;
  }

  async updatePassword(userId: number, passwordHash: string): Promise<void> {
    await this.database.$executeRawUnsafe(
      `UPDATE usuarios SET user_pass = ? WHERE user_id = ? AND user_sts = 1`,
      passwordHash,
      userId,
    );
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
      },
    };
  }
}
