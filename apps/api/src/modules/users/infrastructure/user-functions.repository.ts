import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type {
  UserFunctionInput,
  UserFunctionMutationResponse,
  UserFunctionSummary,
} from '@helpdesk/contracts';
import type { Nivel3DatabaseClient } from '@helpdesk/database';
import { NIVEL3_DATABASE } from '../../../core/database/database.constants';

type FunctionRow = {
  id: number | bigint;
  name: string | null;
  status: number | null;
  active_user_count: number | bigint;
  linked_user_count: number | bigint;
};
type IdRow = { id: number | bigint };
type CountRow = { total: number | bigint };

@Injectable()
export class UserFunctionsRepository {
  constructor(
    @Inject(NIVEL3_DATABASE)
    private readonly database: Nivel3DatabaseClient,
  ) {}

  async list(): Promise<UserFunctionSummary[]> {
    const rows = await this.database.$queryRawUnsafe<FunctionRow[]>(
      `SELECT c.cargo_id AS id,
              c.cargo_nome AS name,
              c.cargo_sts AS status,
              SUM(CASE WHEN u.user_sts = 1 THEN 1 ELSE 0 END) AS active_user_count,
              COUNT(u.user_id) AS linked_user_count
       FROM cargos_n3 c
       LEFT JOIN usuarios u ON u.user_funcao = c.cargo_id
       GROUP BY c.cargo_id, c.cargo_nome, c.cargo_sts
       ORDER BY c.cargo_sts DESC, c.cargo_nome ASC, c.cargo_id ASC`,
    );

    return rows.map((row) => ({
      id: Number(row.id),
      name: row.name?.trim() || `Função #${Number(row.id)}`,
      status: row.status === 1 ? 1 : 2,
      activeUserCount: Number(row.active_user_count ?? 0),
      linkedUserCount: Number(row.linked_user_count ?? 0),
    }));
  }

  async create(input: UserFunctionInput): Promise<UserFunctionMutationResponse> {
    await this.assertNameAvailable(input.name);
    await this.database.$executeRawUnsafe(
      'INSERT INTO cargos_n3 (cargo_nome, cargo_sts) VALUES (?, ?)',
      input.name,
      input.status,
    );
    const ids = await this.database.$queryRawUnsafe<IdRow[]>('SELECT LAST_INSERT_ID() AS id');
    return { id: Number(ids[0]?.id ?? 0) };
  }

  async update(id: number, input: UserFunctionInput): Promise<UserFunctionMutationResponse> {
    await this.assertExists(id);
    await this.assertNameAvailable(input.name, id);
    await this.database.$executeRawUnsafe(
      'UPDATE cargos_n3 SET cargo_nome = ?, cargo_sts = ? WHERE cargo_id = ?',
      input.name,
      input.status,
      id,
    );
    return { id };
  }

  async remove(id: number): Promise<void> {
    await this.assertExists(id);
    const rows = await this.database.$queryRawUnsafe<CountRow[]>(
      'SELECT COUNT(*) AS total FROM usuarios WHERE user_funcao = ?',
      id,
    );
    const linked = Number(rows[0]?.total ?? 0);
    if (linked > 0) {
      throw new ConflictException(
        `Esta função possui ${linked} usuário(s) vinculado(s). Remova os vínculos ou deixe a função inativa antes de excluí-la.`,
      );
    }
    await this.database.$executeRawUnsafe(
      'DELETE FROM cargos_n3 WHERE cargo_id = ?',
      id,
    );
  }

  private async assertExists(id: number): Promise<void> {
    const rows = await this.database.$queryRawUnsafe<IdRow[]>(
      'SELECT cargo_id AS id FROM cargos_n3 WHERE cargo_id = ? LIMIT 1',
      id,
    );
    if (!rows[0]) throw new NotFoundException('Função de usuário não encontrada.');
  }

  private async assertNameAvailable(name: string, ignoredId?: number): Promise<void> {
    const rows = await this.database.$queryRawUnsafe<IdRow[]>(
      `SELECT cargo_id AS id
       FROM cargos_n3
       WHERE LOWER(TRIM(cargo_nome)) = LOWER(TRIM(?))
         AND (? IS NULL OR cargo_id <> ?)
       LIMIT 1`,
      name,
      ignoredId ?? null,
      ignoredId ?? null,
    );
    if (rows[0]) throw new ConflictException('Já existe uma função com este nome.');
  }
}
