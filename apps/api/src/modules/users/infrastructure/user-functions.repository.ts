import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type {
  AccessPermissionItem,
  UserFunctionInput,
  UserFunctionMutationResponse,
  UserFunctionSummary,
} from '@helpdesk/contracts';
import { RBAC_PERMISSION_SLUGS, type Nivel3DatabaseClient } from '@helpdesk/database';
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
type PermissionRow = { id: number | bigint; name: string; slug: string; module: string; description: string | null };
type PermissionLinkRow = { function_id: number; permission_id: number | bigint };

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

    const links = await this.database.$queryRawUnsafe<PermissionLinkRow[]>(
      `SELECT c.cargo_id AS function_id, rp.permission_id
       FROM cargos_n3 c
       INNER JOIN roles r ON r.slug = CONCAT('function-', c.cargo_id)
       INNER JOIN role_permissions rp ON rp.role_id = r.id`,
    );
    const permissionIds = new Map<number, number[]>();
    for (const link of links) {
      const entries = permissionIds.get(Number(link.function_id)) ?? [];
      entries.push(Number(link.permission_id));
      permissionIds.set(Number(link.function_id), entries);
    }
    return rows.map((row) => ({
      id: Number(row.id),
      name: row.name?.trim() || `Função #${Number(row.id)}`,
      status: row.status === 1 ? 1 : 2,
      activeUserCount: Number(row.active_user_count ?? 0),
      linkedUserCount: Number(row.linked_user_count ?? 0),
      permissionIds: permissionIds.get(Number(row.id)) ?? [],
    }));
  }

  async permissions(): Promise<AccessPermissionItem[]> {
    const placeholders = RBAC_PERMISSION_SLUGS.map(() => '?').join(',');
    const rows = await this.database.$queryRawUnsafe<PermissionRow[]>(
      `SELECT id, name, slug, module, description FROM permissions
       WHERE slug IN (${placeholders}) ORDER BY module, id`,
      ...RBAC_PERMISSION_SLUGS,
    );
    return rows.map((row) => ({ ...row, id: Number(row.id) }));
  }

  async create(input: UserFunctionInput): Promise<UserFunctionMutationResponse> {
    await this.assertNameAvailable(input.name);
    return this.database.$transaction(async (transaction) => {
      const ids = await transaction.$queryRawUnsafe<IdRow[]>(
        'INSERT INTO cargos_n3 (cargo_nome, cargo_sts) OUTPUT INSERTED.cargo_id AS id VALUES (?, ?)',
        input.name, input.status,
      );
      const id = Number(ids[0]?.id ?? 0);
      await this.replacePermissions(transaction, id, input.name, input.permissionIds);
      return { id };
    });
  }

  async update(id: number, input: UserFunctionInput): Promise<UserFunctionMutationResponse> {
    await this.assertExists(id);
    await this.assertNameAvailable(input.name, id);
    await this.database.$transaction(async (transaction) => {
      await transaction.$executeRawUnsafe(
        'UPDATE cargos_n3 SET cargo_nome = ?, cargo_sts = ? WHERE cargo_id = ?', input.name, input.status, id,
      );
      await this.replacePermissions(transaction, id, input.name, input.permissionIds);
    });
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
    await this.database.$transaction(async (transaction) => {
      await transaction.$executeRawUnsafe('DELETE FROM cargos_n3 WHERE cargo_id = ?', id);
      await transaction.$executeRawUnsafe('DELETE FROM roles WHERE slug = ?', `function-${id}`);
    });
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

  private async replacePermissions(
    transaction: Pick<Nivel3DatabaseClient, '$executeRawUnsafe' | '$queryRawUnsafe'>,
    functionId: number,
    functionName: string,
    permissionIds: number[],
  ): Promise<void> {
    const slug = `function-${functionId}`;
    const roles = await transaction.$queryRawUnsafe<IdRow[]>('SELECT id FROM roles WHERE slug = ? LIMIT 1', slug);
    let roleId = Number(roles[0]?.id ?? 0);
    if (!roleId) {
      const ids = await transaction.$queryRawUnsafe<IdRow[]>(
        `INSERT INTO roles (name, slug, description, is_system, sort_order, created_at, updated_at)
         OUTPUT INSERTED.id AS id
         VALUES (?, ?, ?, 1, 0, NOW(), NOW())`,
        functionName, slug, `Permissões herdadas pela função ${functionName}.`,
      );
      roleId = Number(ids[0]?.id ?? 0);
    } else {
      await transaction.$executeRawUnsafe(
        'UPDATE roles SET name = ?, description = ?, updated_at = NOW() WHERE id = ?',
        functionName, `Permissões herdadas pela função ${functionName}.`, roleId,
      );
    }
    await transaction.$executeRawUnsafe('DELETE FROM role_permissions WHERE role_id = ?', roleId);
    for (const permissionId of [...new Set(permissionIds)]) {
      await transaction.$executeRawUnsafe(
        'INSERT INTO role_permissions (role_id, permission_id, granted_at) VALUES (?, ?, NOW())',
        roleId, permissionId,
      );
    }
  }
}
