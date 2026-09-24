import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  AccessManagementSnapshot,
  AccessPermissionItem,
  AccessRole,
  AccessRoleInput,
  AccessRoleMutationResponse,
} from '@helpdesk/contracts';
import type { Nivel3DatabaseClient } from '@helpdesk/database';
import { NIVEL3_DATABASE } from '../../../core/database/database.constants';

type PermissionRow = {
  id: number | bigint;
  name: string;
  slug: string;
  module: string;
  description: string | null;
};

type RoleRow = {
  id: number | bigint;
  name: string;
  slug: string;
  description: string | null;
  is_system: number | bigint | boolean;
  sort_order: number | bigint;
  created_at: Date | string;
  updated_at: Date | string;
  user_count: number | bigint;
};

type RolePermissionRow = {
  role_id: number | bigint;
  permission_id: number | bigint;
};

type RoleIdentityRow = {
  id: number | bigint;
  name: string;
  slug: string;
  is_system: number | bigint | boolean;
  user_count: number | bigint;
};

type CountRow = { total: number | bigint };
type IdRow = { id: number | bigint };
type SortOrderRow = { next_order: number | bigint };

type AccessTransaction = Pick<
  Nivel3DatabaseClient,
  '$executeRawUnsafe' | '$queryRawUnsafe'
>;

function iso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function roleSlug(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

@Injectable()
export class AccessManagement {
  constructor(
    @Inject(NIVEL3_DATABASE)
    private readonly database: Nivel3DatabaseClient,
  ) {}

  async snapshot(): Promise<AccessManagementSnapshot> {
    const [permissions, roles, assignments] = await Promise.all([
      this.database.$queryRawUnsafe<PermissionRow[]>(
        `SELECT id, name, slug, module, description
         FROM permissions
         ORDER BY module, name, id`,
      ),
      this.database.$queryRawUnsafe<RoleRow[]>(
        `SELECT r.id, r.name, r.slug, r.description, r.is_system,
                r.sort_order, r.created_at, r.updated_at,
                COUNT(DISTINCT ur.user_id) AS user_count
         FROM roles r
         LEFT JOIN user_roles ur ON ur.role_id = r.id
         GROUP BY r.id, r.name, r.slug, r.description, r.is_system,
                  r.sort_order, r.created_at, r.updated_at
         ORDER BY r.sort_order ASC, r.id ASC`,
      ),
      this.database.$queryRawUnsafe<RolePermissionRow[]>(
        `SELECT role_id, permission_id
         FROM role_permissions
         ORDER BY role_id, permission_id`,
      ),
    ]);

    const permissionsByRole = new Map<number, number[]>();
    for (const assignment of assignments) {
      const roleId = Number(assignment.role_id);
      const entries = permissionsByRole.get(roleId) ?? [];
      entries.push(Number(assignment.permission_id));
      permissionsByRole.set(roleId, entries);
    }

    return {
      permissions: permissions.map<AccessPermissionItem>((permission) => ({
        id: Number(permission.id),
        name: permission.name,
        slug: permission.slug,
        module: permission.module,
        description: permission.description,
      })),
      roles: roles.map<AccessRole>((role) => ({
        id: Number(role.id),
        name: role.name,
        slug: role.slug,
        description: role.description,
        system: Boolean(role.is_system),
        permissionIds: permissionsByRole.get(Number(role.id)) ?? [],
        userCount: Number(role.user_count),
        sortOrder: Number(role.sort_order),
        createdAt: iso(role.created_at),
        updatedAt: iso(role.updated_at),
      })),
    };
  }

  async create(input: AccessRoleInput): Promise<AccessRoleMutationResponse> {
    const slug = roleSlug(input.name);
    if (!slug) {
      throw new ConflictException('O nome não gera um identificador válido.');
    }
    await this.assertRoleAvailable(input.name, slug);
    await this.assertPermissionsExist(input.permissionIds);

    const id = await this.database.$transaction(async (transaction) => {
      const orders = await transaction.$queryRawUnsafe<SortOrderRow[]>(
        'SELECT COALESCE(MAX(sort_order), -10) + 10 AS next_order FROM roles',
      );
      const nextOrder = Number(orders[0]?.next_order ?? 0);

      await transaction.$executeRawUnsafe(
        `INSERT INTO roles
          (name, slug, description, is_system, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, 0, ?, NOW(), NOW())`,
        input.name,
        slug,
        input.description ?? null,
        nextOrder,
      );
      const ids = await transaction.$queryRawUnsafe<IdRow[]>(
        'SELECT LAST_INSERT_ID() AS id',
      );
      const createdId = Number(ids[0]?.id ?? 0);
      await this.replacePermissions(transaction, createdId, input.permissionIds);
      return createdId;
    });

    return { id };
  }

  async update(
    id: number,
    input: AccessRoleInput,
  ): Promise<AccessRoleMutationResponse> {
    const current = await this.roleIdentity(id);
    if (current.slug === 'system-admin') {
      throw new ConflictException(
        'O perfil Administrador global é protegido e possui acesso total implícito.',
      );
    }

    await this.assertPermissionsExist(input.permissionIds);
    if (!Boolean(current.is_system)) {
      await this.assertRoleAvailable(input.name, current.slug, id);
    }

    await this.database.$transaction(async (transaction) => {
      if (!Boolean(current.is_system)) {
        await transaction.$executeRawUnsafe(
          `UPDATE roles
           SET name = ?, description = ?, updated_at = NOW()
           WHERE id = ?`,
          input.name,
          input.description ?? null,
          id,
        );
      } else {
        await transaction.$executeRawUnsafe(
          'UPDATE roles SET updated_at = NOW() WHERE id = ?',
          id,
        );
      }
      await this.replacePermissions(transaction, id, input.permissionIds);
    });

    return { id };
  }

  async reorder(roleIds: number[]): Promise<void> {
    const current = await this.database.$queryRawUnsafe<IdRow[]>(
      'SELECT id FROM roles ORDER BY sort_order ASC, id ASC',
    );
    const currentIds = current.map((row) => Number(row.id));
    const expected = new Set(currentIds);

    if (
      roleIds.length !== currentIds.length ||
      new Set(roleIds).size !== roleIds.length ||
      roleIds.some((id) => !expected.has(id))
    ) {
      throw new ConflictException(
        'A lista de tipos de usuário mudou. Atualize a página e tente novamente.',
      );
    }

    await this.database.$transaction(async (transaction) => {
      for (const [index, roleId] of roleIds.entries()) {
        await transaction.$executeRawUnsafe(
          'UPDATE roles SET sort_order = ?, updated_at = NOW() WHERE id = ?',
          index * 10,
          roleId,
        );
      }
    });
  }

  async remove(id: number): Promise<void> {
    const role = await this.roleIdentity(id);
    if (role.slug === 'system-admin') {
      throw new ConflictException(
        'O perfil Administrador global é protegido e não pode ser excluído.',
      );
    }
    await this.database.$executeRawUnsafe('DELETE FROM roles WHERE id = ?', id);
  }

  private async roleIdentity(id: number): Promise<RoleIdentityRow> {
    const rows = await this.database.$queryRawUnsafe<RoleIdentityRow[]>(
      `SELECT r.id, r.name, r.slug, r.is_system,
              COUNT(DISTINCT ur.user_id) AS user_count
       FROM roles r
       LEFT JOIN user_roles ur ON ur.role_id = r.id
       WHERE r.id = ?
       GROUP BY r.id, r.name, r.slug, r.is_system
       LIMIT 1`,
      id,
    );
    const role = rows[0];
    if (!role) throw new NotFoundException('Tipo de usuário não encontrado.');
    return role;
  }

  private async assertRoleAvailable(
    name: string,
    slug: string,
    ignoredId?: number,
  ): Promise<void> {
    const rows = await this.database.$queryRawUnsafe<IdRow[]>(
      `SELECT id FROM roles
       WHERE (LOWER(name) = LOWER(?) OR slug = ?)
         AND (? IS NULL OR id <> ?)
       LIMIT 1`,
      name,
      slug,
      ignoredId ?? null,
      ignoredId ?? null,
    );
    if (rows[0]) {
      throw new ConflictException('Já existe um tipo de usuário com este nome.');
    }
  }

  private async assertPermissionsExist(permissionIds: number[]): Promise<void> {
    if (permissionIds.length === 0) return;
    const placeholders = permissionIds.map(() => '?').join(',');
    const rows = await this.database.$queryRawUnsafe<CountRow[]>(
      `SELECT COUNT(*) AS total FROM permissions WHERE id IN (${placeholders})`,
      ...permissionIds,
    );
    if (Number(rows[0]?.total ?? 0) !== permissionIds.length) {
      throw new NotFoundException('Uma ou mais permissões não existem.');
    }
  }

  private async replacePermissions(
    transaction: AccessTransaction,
    roleId: number,
    permissionIds: number[],
  ): Promise<void> {
    await transaction.$executeRawUnsafe(
      'DELETE FROM role_permissions WHERE role_id = ?',
      roleId,
    );
    for (const permissionId of permissionIds) {
      await transaction.$executeRawUnsafe(
        `INSERT INTO role_permissions (role_id, permission_id, granted_at)
         VALUES (?, ?, NOW())`,
        roleId,
        permissionId,
      );
    }
  }
}
