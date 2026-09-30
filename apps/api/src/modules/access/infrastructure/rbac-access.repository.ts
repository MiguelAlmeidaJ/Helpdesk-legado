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

interface ActiveOnCallRow {
  area: 'ti' | 'devops';
  role_slug: string;
  permission_slug: string | null;
}

const BRAZIL_NOW_SQL = "CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '-03:00')";

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

    const onCall = await this.activeOnCallAccess(userId);
    const permissionSlugs = new Set([
      ...rolePermissions.map((permission) => permission.slug),
      ...onCall.permissionSlugs,
    ]);

    for (const permission of userPermissions) {
      if (permission.effect === 'deny') {
        permissionSlugs.delete(permission.slug);
      } else {
        permissionSlugs.add(permission.slug);
      }
    }

    const roleSlugs = [
      ...roles.map((role) => role.slug),
      ...(onCall.active ? ['plantonista'] : []),
    ];

    return {
      active: user.user_sts === 1,
      roleSlugs: [...new Set(roleSlugs)],
      permissionSlugs,
      onCallAreas: onCall.areas,
    };
  }

  private async activeOnCallAccess(userId: number): Promise<{
    active: boolean;
    areas: ('ti' | 'devops')[];
    permissionSlugs: string[];
  }> {
    try {
      const rows = await this.database.$queryRawUnsafe<ActiveOnCallRow[]>(
        `SELECT
           s.area,
           r.slug AS role_slug,
           p.slug AS permission_slug
         FROM on_call_schedules s
         INNER JOIN business_calendar_settings cfg ON cfg.id = 1
         INNER JOIN roles r ON r.slug = 'plantonista'
         LEFT JOIN role_permissions rp ON rp.role_id = r.id
         LEFT JOIN permissions p ON p.id = rp.permission_id
         WHERE s.user_id = ?
           AND s.week_start = (
             CASE
               WHEN WEEKDAY(DATE(${BRAZIL_NOW_SQL})) = 0
                 AND TIME(${BRAZIL_NOW_SQL}) < cfg.business_start
               THEN DATE_SUB(DATE(${BRAZIL_NOW_SQL}), INTERVAL 7 DAY)
               ELSE DATE_SUB(
                 DATE(${BRAZIL_NOW_SQL}),
                 INTERVAL WEEKDAY(DATE(${BRAZIL_NOW_SQL})) DAY
               )
             END
           )
           AND (
             WEEKDAY(DATE(${BRAZIL_NOW_SQL})) IN (5, 6)
             OR EXISTS (
               SELECT 1
               FROM business_holidays h
               WHERE h.holiday_date = DATE(${BRAZIL_NOW_SQL})
             )
             OR TIME(${BRAZIL_NOW_SQL}) >= cfg.business_end
             OR TIME(${BRAZIL_NOW_SQL}) < cfg.business_start
           )`,
        userId,
      );

      const areas = [
        ...new Set(rows.map((row) => row.area)),
      ] as ('ti' | 'devops')[];

      return {
        active: areas.length > 0,
        areas,
        permissionSlugs: [
          ...new Set(
            rows
              .map((row) => row.permission_slug)
              .filter((slug): slug is string => Boolean(slug)),
          ),
        ],
      };
    } catch {
      // Mantém autenticação operacional antes do bootstrap ou em manutenção.
      return { active: false, areas: [], permissionSlugs: [] };
    }
  }
}
