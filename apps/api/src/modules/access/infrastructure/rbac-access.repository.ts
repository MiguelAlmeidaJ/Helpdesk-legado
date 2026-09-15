import { Inject, Injectable } from '@nestjs/common';
import type { Nivel3DatabaseClient } from '@helpdesk/database';
import { NIVEL3_DATABASE } from '../../../core/database/database.constants';
import type { RbacAccessSnapshot } from '../domain/rbac-access-snapshot';

interface UserStatusRow {
  user_sts: number | null;
}

interface RoleRow {
  slug: string;
}

interface PermissionRow {
  slug: string;
}

interface UserPermissionRow {
  slug: string;
  effect: 'allow' | 'deny';
}

@Injectable()
export class RbacAccessRepository {
  constructor(
    @Inject(NIVEL3_DATABASE)
    private readonly database: Nivel3DatabaseClient,
  ) {}

  async findByUserId(userId: number): Promise<RbacAccessSnapshot | null> {
    const users = await this.database.$queryRaw<UserStatusRow[]>`
      SELECT user_sts
      FROM usuarios
      WHERE user_id = ${userId}
      LIMIT 1
    `;

    const user = users[0];

    if (!user) {
      return null;
    }

    const [roles, rolePermissions, userPermissions] = await Promise.all([
      this.database.$queryRaw<RoleRow[]>`
        SELECT r.slug
        FROM user_roles ur
        INNER JOIN roles r ON r.id = ur.role_id
        WHERE ur.user_id = ${userId}
        ORDER BY r.id
      `,
      this.database.$queryRaw<PermissionRow[]>`
        SELECT DISTINCT p.slug
        FROM user_roles ur
        INNER JOIN role_permissions rp ON rp.role_id = ur.role_id
        INNER JOIN permissions p ON p.id = rp.permission_id
        WHERE ur.user_id = ${userId}
      `,
      this.database.$queryRaw<UserPermissionRow[]>`
        SELECT p.slug, up.effect
        FROM user_permissions up
        INNER JOIN permissions p ON p.id = up.permission_id
        WHERE up.user_id = ${userId}
      `,
    ]);

    const permissionSlugs = new Set(
      rolePermissions.map((permission) => permission.slug),
    );

    for (const permission of userPermissions) {
      if (permission.effect === 'deny') {
        permissionSlugs.delete(permission.slug);
      } else {
        permissionSlugs.add(permission.slug);
      }
    }

    return {
      active: user.user_sts === 1,
      hasAssignments: roles.length > 0 || userPermissions.length > 0,
      roleSlugs: roles.map((role) => role.slug),
      permissionSlugs,
    };
  }
}
