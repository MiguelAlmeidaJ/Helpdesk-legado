import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Nivel3DatabaseClient } from '@helpdesk/database';
import { NIVEL3_DATABASE } from '../../../core/database/database.constants';

interface ActiveSessionRow {
  user_id: number;
}

function tokenHash(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

function sessionTtlDays(config: ConfigService): number {
  const raw = Number(config.get<string>('API_SESSION_TTL_DAYS') ?? 30);

  if (!Number.isFinite(raw)) {
    return 30;
  }

  return Math.min(365, Math.max(1, Math.trunc(raw)));
}

@Injectable()
export class ApiSessionRepository {
  constructor(
    @Inject(NIVEL3_DATABASE)
    private readonly database: Nivel3DatabaseClient,
    private readonly config: ConfigService,
  ) {}

  async create(userId: number): Promise<{
    token: string;
    expiresAt: Date;
  }> {
    const token = randomBytes(48).toString('base64url');
    const id = randomUUID();
    const familyId = randomUUID();
    const ttlDays = sessionTtlDays(this.config);
    const expiresAt = new Date(Date.now() + ttlDays * 86_400_000);

    await this.database.$executeRawUnsafe(
      `INSERT INTO api_sessions (
         id,
         family_id,
         user_id,
         refresh_token_hash,
         device_name,
         created_at,
         expires_at
       )
       VALUES (?, ?, ?, ?, 'helpdesk-web', NOW(6), ?)`,
      id,
      familyId,
      userId,
      tokenHash(token),
      expiresAt,
    );

    return {
      token,
      expiresAt,
    };
  }

  async findActiveUserId(token: string): Promise<number | null> {
    if (token.length < 32 || token.length > 256) {
      return null;
    }

    const rows = await this.database.$queryRawUnsafe<ActiveSessionRow[]>(
      `SELECT s.user_id
       FROM api_sessions s
       INNER JOIN usuarios u ON u.user_id = s.user_id
       WHERE s.refresh_token_hash = ?
         AND s.revoked_at IS NULL
         AND s.expires_at > NOW(6)
         AND u.user_sts = 1
       LIMIT 1`,
      tokenHash(token),
    );

    return rows[0]?.user_id ?? null;
  }

  async revoke(token: string, reason: string): Promise<void> {
    if (token.length < 32 || token.length > 256) {
      return;
    }

    await this.database.$executeRawUnsafe(
      `UPDATE api_sessions
       SET revoked_at = COALESCE(revoked_at, NOW(6)),
           revoke_reason = COALESCE(revoke_reason, ?)
       WHERE refresh_token_hash = ?`,
      reason.slice(0, 120),
      tokenHash(token),
    );
  }

  async revokeAllForUser(userId: number, reason: string): Promise<void> {
    await this.database.$executeRawUnsafe(
      `UPDATE api_sessions
       SET revoked_at = NOW(), revoke_reason = ?
       WHERE user_id = ? AND revoked_at IS NULL`,
      reason,
      userId,
    );
  }
}
