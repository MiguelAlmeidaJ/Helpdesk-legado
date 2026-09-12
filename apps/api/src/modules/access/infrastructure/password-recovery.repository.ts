import { Inject, Injectable } from '@nestjs/common';
import type { Nivel3DatabaseClient } from '@helpdesk/database';
import { NIVEL3_DATABASE } from '../../../core/database/database.constants';

interface PasswordTokenRow {
  id: number;
  email: string | null;
  expire: string | null;
}

@Injectable()
export class PasswordRecoveryRepository {
  constructor(
    @Inject(NIVEL3_DATABASE)
    private readonly database: Nivel3DatabaseClient,
  ) {}

  async replace(email: string, tokenHash: string, expiresAt: Date): Promise<void> {
    await this.database.$transaction(async (transaction) => {
      await transaction.$executeRawUnsafe(
        'DELETE FROM token_senha WHERE LOWER(email) = LOWER(?)',
        email,
      );
      await transaction.$executeRawUnsafe(
        `INSERT INTO token_senha (token, expire, email)
         VALUES (?, ?, ?)`,
        tokenHash,
        expiresAt.toISOString(),
        email,
      );
    });
  }

  async findValid(tokenHash: string): Promise<PasswordTokenRow | null> {
    const rows = await this.database.$queryRawUnsafe<PasswordTokenRow[]>(
      `SELECT id, email, expire
       FROM token_senha
       WHERE token = ?
       LIMIT 1`,
      tokenHash,
    );
    const row = rows[0];

    if (!row?.email || !row.expire) {
      return null;
    }

    const expiration = new Date(row.expire);

    if (Number.isNaN(expiration.getTime()) || expiration.getTime() <= Date.now()) {
      await this.consume(row.id);
      return null;
    }

    return row;
  }

  async consume(id: number): Promise<void> {
    await this.database.$executeRawUnsafe(
      'DELETE FROM token_senha WHERE id = ?',
      id,
    );
  }
}
