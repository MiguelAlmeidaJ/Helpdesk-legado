import { ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type {
  AccessPermissionItem,
  CreateManagedUserRequest,
  ManagedUserDetail,
  ManagedUserListResponse,
  ManagedUserSummary,
  UpdateManagedUserRequest,
  UserManagementCatalogs,
  UserOption,
} from '@helpdesk/contracts';
import { RBAC_PERMISSION_SLUGS, type Nivel3DatabaseClient } from '@helpdesk/database';
import { NIVEL3_DATABASE } from '../../../core/database/database.constants';

interface UserRow {
  user_id: number;
  is_global_admin: boolean | number;
  user_sts: number | null;
  user_nome: string | null;
  user_mail: string | null;
  user_cel: string | null;
  user_funcao: number | null;
  cargo_nome: string | null;
  user_login: string | null;
  tipo_usuario: number;
  link: string | null;
  pix_type: number | null;
  chavepix: string | null;
  user_observacao: string | null;
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

interface CountRow { total: bigint | number }
interface CompanyLinkRow { usuario_id: number; id: number; name: string | null }
interface OptionRow { id: number; name: string | null }
interface FunctionOptionRow extends OptionRow { is_global_admin: boolean }
interface ConflictRow { user_id: number; user_login: string | null; user_mail: string | null }
interface InsertIdRow { id: bigint | number }
interface UserPermissionLinkRow {
  user_id: number;
  permission_id: number | bigint;
}
interface PermissionLinkRow { function_id: number; permission_id: number | bigint }
interface PermissionOptionRow {
  id: number | bigint;
  name: string;
  slug: string;
  module: string;
  description: string | null;
}

function status(value: number | null): 1 | 2 {
  return value === 1 ? 1 : 2;
}

function userType(value: number): 0 | 1 | 2 {
  return value === 1 || value === 2 ? value : 0;
}

@Injectable()
export class UsersRepository {
  constructor(
    @Inject(NIVEL3_DATABASE)
    private readonly database: Nivel3DatabaseClient,
  ) {}

  async list(
    page: number,
    limit: number,
    search: string,
    statusFilter?: 1 | 2,
    functionId?: number,
  ): Promise<ManagedUserListResponse> {
    const offset = (page - 1) * limit;
    const pattern = `%${search}%`;
    const conditions: string[] = [];
    const parameters: Array<string | number> = [];

    if (search) {
      conditions.push('(u.user_nome LIKE ? OR u.user_login LIKE ? OR u.user_mail LIKE ?)');
      parameters.push(pattern, pattern, pattern);
    }
    if (statusFilter === 1) {
      conditions.push('u.user_sts = 1');
    } else if (statusFilter === 2) {
      conditions.push('(u.user_sts IS NULL OR u.user_sts <> 1)');
    }
    if (functionId) {
      conditions.push('u.user_funcao = ?');
      parameters.push(functionId);
    }

    const filter = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const [rows, totals] = await Promise.all([
      this.database.$queryRawUnsafe<UserRow[]>(
        `SELECT u.*, c.cargo_nome,
         CASE WHEN c.is_global_admin=1 OR EXISTS (
           SELECT 1 FROM dbo.user_roles ur JOIN dbo.roles r ON r.id=ur.role_id
           WHERE ur.user_id=u.user_id AND r.slug='system-admin'
         ) THEN 1 ELSE 0 END AS is_global_admin
         FROM usuarios u
         LEFT JOIN cargos_n3 c ON c.cargo_id = u.user_funcao
         ${filter}
         ORDER BY u.user_sts ASC, u.user_nome ASC, u.user_id ASC
         LIMIT ? OFFSET ?`,
        ...parameters,
        limit,
        offset,
      ),
      this.database.$queryRawUnsafe<CountRow[]>(
        `SELECT COUNT(*) AS total FROM usuarios u ${filter}`,
        ...parameters,
      ),
    ]);
    const userIds = rows.map((row) => row.user_id);
    const [companies, extraPermissions] = await Promise.all([
      this.companiesByUserIds(userIds),
      this.extraPermissionsByUserIds(userIds),
    ]);
    const total = Number(totals[0]?.total ?? 0);

    return {
      data: rows.map((row) =>
        this.toSummary(
          row,
          companies.get(row.user_id) ?? [],
          extraPermissions.get(row.user_id) ?? [],
        ),
      ),
      meta: { page, limit, total, totalPages: total === 0 ? 0 : Math.ceil(total / limit) },
    };
  }

  async findById(id: number): Promise<ManagedUserDetail | null> {
    const rows = await this.database.$queryRawUnsafe<UserRow[]>(
      `SELECT u.*, c.cargo_nome,
       CASE WHEN c.is_global_admin=1 OR EXISTS (
         SELECT 1 FROM dbo.user_roles ur JOIN dbo.roles r ON r.id=ur.role_id
         WHERE ur.user_id=u.user_id AND r.slug='system-admin'
       ) THEN 1 ELSE 0 END AS is_global_admin
       FROM usuarios u
       LEFT JOIN cargos_n3 c ON c.cargo_id = u.user_funcao
       WHERE u.user_id = ? LIMIT 1`,
      id,
    );
    const row = rows[0];
    if (!row) return null;
    const [companies, extraPermissions] = await Promise.all([
      this.companiesByUserIds([id]),
      this.extraPermissionsByUserIds([id]),
    ]);
    return {
      ...this.toSummary(row, companies.get(id) ?? [], extraPermissions.get(id) ?? []),
      link: row.link ?? '',
      pixKeyType: row.pix_type,
      pixKey: row.chavepix ?? '',
      observation: row.user_observacao ?? '',
    };
  }

  async catalogs(includePermissions = false): Promise<UserManagementCatalogs> {
    const [functions, companies, pixKeyTypes, permissions, functionLinks] = await Promise.all([
      this.database.$queryRaw<FunctionOptionRow[]>`
        SELECT cargo_id AS id, cargo_nome AS name, is_global_admin
        FROM cargos_n3 WHERE cargo_sts = 1 ORDER BY cargo_nome`,
      this.database.$queryRaw<OptionRow[]>`
        SELECT clt_id AS id, COALESCE(NULLIF(clt_nomer, ''), clt_nomef) AS name
        FROM clientes WHERE clt_sts = 1 ORDER BY name`,
      this.database.$queryRaw<OptionRow[]>`
        SELECT id, name_type AS name FROM type_keys ORDER BY id`,
      includePermissions ? this.permissionOptions() : Promise.resolve([]),
      includePermissions ? this.database.$queryRawUnsafe<PermissionLinkRow[]>(
        `SELECT c.cargo_id AS function_id, rp.permission_id
         FROM cargos_n3 c INNER JOIN roles r ON r.slug = CONCAT('function-', c.cargo_id)
         INNER JOIN role_permissions rp ON rp.role_id = r.id`,
      ) : Promise.resolve([]),
    ]);
    const map = (rows: OptionRow[]): UserOption[] =>
      rows.map((row) => ({ id: row.id, name: row.name ?? `#${row.id}` }));
    return {
      functions: functions.map(row => ({ id: row.id, name: row.name ?? `#${row.id}`, isGlobalAdmin: Boolean(row.is_global_admin) })),
      functionPermissionIds: functionLinks.reduce<Record<number, number[]>>((result, link) => {
        (result[Number(link.function_id)] ??= []).push(Number(link.permission_id));
        return result;
      }, {}),
      companies: map(companies),
      pixKeyTypes: map(pixKeyTypes),
      permissions: permissions.map((permission) => ({ ...permission, id: Number(permission.id) })),
    };
  }

  async findConflict(login: string, email: string, exceptId?: number): Promise<'login' | 'email' | null> {
    const rows = await this.database.$queryRawUnsafe<ConflictRow[]>(
      `SELECT user_id, user_login, user_mail FROM usuarios
       WHERE (LOWER(user_login) = LOWER(?) OR LOWER(user_mail) = LOWER(?))
         AND (? IS NULL OR user_id <> ?)
       LIMIT 1`,
      login,
      email,
      exceptId ?? null,
      exceptId ?? null,
    );
    const row = rows[0];
    if (!row) return null;
    return row.user_login?.toLowerCase() === login.toLowerCase() ? 'login' : 'email';
  }

  async clientRoleId(): Promise<number | null> {
    const rows = await this.database.$queryRawUnsafe<Array<{ id: number | bigint }>>(
      `SELECT id
       FROM roles
       WHERE LOWER(TRIM(name)) = 'cliente'
          OR LOWER(slug) IN ('cliente', 'client')
       ORDER BY CASE
         WHEN LOWER(TRIM(name)) = 'cliente' THEN 0
         WHEN LOWER(slug) = 'cliente' THEN 1
         ELSE 2
       END, id
       LIMIT 1`,
    );
    return rows[0] ? Number(rows[0].id) : null;
  }

  async userHasSystemAdminRole(userId: number): Promise<boolean> {
    const rows = await this.database.$queryRawUnsafe<CountRow[]>(
      `SELECT COUNT(*) AS total
       FROM user_roles ur
       INNER JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = ?
         AND r.slug = 'system-admin'`,
      userId,
    );
    return Number(rows[0]?.total ?? 0) > 0;
  }

  async containsSystemAdminRole(roleIds: number[]): Promise<boolean> {
    if (roleIds.length === 0) return false;
    const placeholders = roleIds.map(() => '?').join(',');
    const rows = await this.database.$queryRawUnsafe<CountRow[]>(
      `SELECT COUNT(*) AS total
       FROM roles
       WHERE id IN (${placeholders})
         AND slug = 'system-admin'`,
      ...roleIds,
    );
    return Number(rows[0]?.total ?? 0) > 0;
  }

  async rolesExist(roleIds: number[]): Promise<boolean> {
    if (roleIds.length === 0) return true;
    const placeholders = roleIds.map(() => '?').join(',');
    const rows = await this.database.$queryRawUnsafe<CountRow[]>(
      `SELECT COUNT(*) AS total
       FROM roles
       WHERE id IN (${placeholders})
         AND slug <> 'plantonista'`,
      ...roleIds,
    );
    return Number(rows[0]?.total ?? 0) === roleIds.length;
  }

  async permissionsExist(permissionIds: number[]): Promise<boolean> {
    if (permissionIds.length === 0) return true;
    const ids = [...new Set(permissionIds)];
    const placeholders = ids.map(() => '?').join(',');
    const canonical = RBAC_PERMISSION_SLUGS.map(() => '?').join(',');
    const rows = await this.database.$queryRawUnsafe<CountRow[]>(
      `SELECT COUNT(*) AS total FROM permissions
       WHERE id IN (${placeholders}) AND slug IN (${canonical})`,
      ...ids, ...RBAC_PERMISSION_SLUGS,
    );
    return Number(rows[0]?.total ?? 0) === ids.length;
  }

  async create(
    input: CreateManagedUserRequest,
    passwordHash: string,
    assignedBy: number,
    canManageAccess: boolean,
  ): Promise<number> {
    return this.database.$transaction(async (transaction) => {
      await this.assertFunctionExists(transaction, input.functionId);
      const isGlobalAdmin = await this.lockGlobalAdministration(transaction, assignedBy);
      await this.assertGlobalUserAccess(transaction, isGlobalAdmin, input.functionId);
      const ids = await transaction.$queryRawUnsafe<InsertIdRow[]>(
        `INSERT INTO usuarios
          (user_sts, user_nome, user_mail, user_cel, user_funcao, user_login,
           user_pass, tipo_usuario, link, pix_type, chavepix, user_observacao)
         OUTPUT INSERTED.user_id AS id
         VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        input.name, input.email, input.phone, input.functionId, input.login,
        passwordHash, input.type, input.link ?? '', input.pixKeyType ?? null,
        input.pixKey ?? '', input.observation ?? '',
      );
      const id = Number(ids[0]?.id);
      await this.syncGlobalAdminRole(transaction, id, input.functionId, assignedBy);
      await this.replaceCompanies(transaction, id, input.companyIds ?? []);
      if (canManageAccess) {
        await this.replaceExtraPermissions(transaction, id, input.extraPermissionIds ?? [], assignedBy, input.functionId);
      }
      return id;
    });
  }

  async update(
    id: number,
    input: UpdateManagedUserRequest,
    canManageAccess: boolean,
    assignedBy: number,
  ): Promise<boolean> {
    return this.database.$transaction(async (transaction) => {
      await this.assertFunctionExists(transaction, input.functionId);
      const isGlobalAdmin = await this.lockGlobalAdministration(transaction, assignedBy);
      await this.assertGlobalUserAccess(transaction, isGlobalAdmin, input.functionId, id);
      if (!isGlobalAdmin && id === assignedBy) {
        const current = await transaction.$queryRawUnsafe<Array<{ user_funcao: number | null }>>(
          'SELECT user_funcao FROM dbo.usuarios WITH (UPDLOCK, HOLDLOCK) WHERE user_id=@P1', id,
        );
        if (current[0] && Number(current[0].user_funcao) !== input.functionId) {
          throw new ForbiddenException('Somente um administrador global pode alterar a sua função.');
        }
      }
      const globalFunction = await this.isGlobalFunction(transaction, input.functionId);
      if (input.status !== 1 || !globalFunction) await this.assertAnotherGlobalAdmin(transaction, id);
      const changed = await transaction.$executeRawUnsafe(
        `UPDATE usuarios SET user_sts = ?, user_nome = ?, user_mail = ?,
          user_cel = ?, user_funcao = ?, user_login = ?, tipo_usuario = ?,
          link = ?, pix_type = ?, chavepix = ?, user_observacao = ?
         WHERE user_id = ?`,
        input.status, input.name, input.email, input.phone, input.functionId,
        input.login, input.type, input.link ?? '', input.pixKeyType ?? null,
        input.pixKey ?? '', input.observation ?? '', id,
      );
      if (changed === 0) return false;
      await this.syncGlobalAdminRole(transaction, id, input.functionId, assignedBy);
      await this.replaceCompanies(transaction, id, input.companyIds ?? []);
      if (canManageAccess && input.extraPermissionIds !== undefined) {
        await this.replaceExtraPermissions(transaction, id, input.extraPermissionIds, assignedBy, input.functionId);
      }
      return true;
    });
  }

  private async assertFunctionExists(transaction: Pick<Nivel3DatabaseClient, '$queryRawUnsafe'>, functionId: number) {
    const rows = await transaction.$queryRawUnsafe<Array<{ id: number }>>(
      'SELECT cargo_id AS id FROM dbo.cargos_n3 WITH (HOLDLOCK) WHERE cargo_id = @P1', functionId,
    );
    if (!rows.length) throw new NotFoundException('A função selecionada não existe mais. Atualize o cadastro e escolha outra função.');
  }

  async deactivate(id: number, actorId: number): Promise<boolean> {
    return this.database.$transaction(async transaction => {
      const isGlobalAdmin = await this.lockGlobalAdministration(transaction, actorId);
      await this.assertGlobalUserAccess(transaction, isGlobalAdmin, undefined, id);
      await this.assertAnotherGlobalAdmin(transaction, id);
      return (await transaction.$executeRawUnsafe(
        'UPDATE usuarios SET user_sts = 2 WHERE user_id = ? AND user_sts <> 2', id,
      )) > 0;
    });
  }

  // Serializes administrator changes and rechecks the actor against current database state.
  private async lockGlobalAdministration(tx: Pick<Nivel3DatabaseClient, '$queryRawUnsafe'>, actorId: number) {
    await tx.$queryRawUnsafe("SELECT id FROM dbo.roles WITH (UPDLOCK, HOLDLOCK) WHERE slug = 'system-admin'");
    const actors = await tx.$queryRawUnsafe<Array<{ is_global: number; can_manage: number }>>(
      `SELECT CASE WHEN (c.is_global_admin = 1 AND c.cargo_sts = 1) OR EXISTS
        (SELECT 1 FROM dbo.user_roles ur JOIN dbo.roles r ON r.id = ur.role_id
         WHERE ur.user_id = u.user_id AND r.slug = 'system-admin') THEN 1 ELSE 0 END AS is_global,
       CASE WHEN NOT EXISTS (
         SELECT 1 FROM dbo.user_permissions up JOIN dbo.permissions p ON p.id=up.permission_id
         WHERE up.user_id=u.user_id AND p.slug='usuarios.criar' AND up.effect='deny'
       ) AND (EXISTS (
         SELECT 1 FROM dbo.roles r JOIN dbo.role_permissions rp ON rp.role_id=r.id
         JOIN dbo.permissions p ON p.id=rp.permission_id
         WHERE r.slug=CONCAT('function-',u.user_funcao) AND p.slug='usuarios.criar'
       ) OR EXISTS (
         SELECT 1 FROM dbo.user_permissions up JOIN dbo.permissions p ON p.id=up.permission_id
         WHERE up.user_id=u.user_id AND p.slug='usuarios.criar' AND up.effect='allow'
       )) THEN 1 ELSE 0 END AS can_manage
       FROM dbo.usuarios u LEFT JOIN dbo.cargos_n3 c ON c.cargo_id=u.user_funcao
       WHERE u.user_id=@P1 AND u.user_sts=1`, actorId,
    );
    const actor = actors[0];
    if (!actor || (!actor.is_global && !actor.can_manage)) throw new ForbiddenException('Você não tem permissão para criar ou editar usuários.');
    return Boolean(actor.is_global);
  }

  private async assertGlobalUserAccess(
    tx: Pick<Nivel3DatabaseClient, '$queryRawUnsafe'>, isGlobalAdmin: boolean, functionId?: number, userId?: number,
  ) {
    if (isGlobalAdmin) return;
    if (functionId && await this.isGlobalFunction(tx, functionId)) {
      throw new ForbiddenException('Somente administradores globais podem atribuir a função Administrador global.');
    }
    if (userId) {
      const targets = await tx.$queryRawUnsafe<Array<{ user_id: number }>>(
        `SELECT u.user_id FROM dbo.usuarios u LEFT JOIN dbo.cargos_n3 c ON c.cargo_id=u.user_funcao
         WHERE u.user_id=@P1 AND (c.is_global_admin=1 OR EXISTS (
           SELECT 1 FROM dbo.user_roles ur JOIN dbo.roles r ON r.id=ur.role_id
           WHERE ur.user_id=u.user_id AND r.slug='system-admin'))`, userId,
      );
      if (targets.length) throw new ForbiddenException('Somente administradores globais podem alterar um administrador global.');
    }
  }

  private async isGlobalFunction(tx: Pick<Nivel3DatabaseClient, '$queryRawUnsafe'>, functionId: number) {
    const rows = await tx.$queryRawUnsafe<Array<{ is_global_admin: boolean }>>(
      'SELECT is_global_admin FROM dbo.cargos_n3 WHERE cargo_id = @P1 AND cargo_sts = 1', functionId,
    );
    return Boolean(rows[0]?.is_global_admin);
  }

  private async assertAnotherGlobalAdmin(tx: Pick<Nivel3DatabaseClient, '$queryRawUnsafe'>, excludedId: number) {
    const rows = await tx.$queryRawUnsafe<Array<{ user_id: number }>>(
      `SELECT TOP (1) u.user_id FROM dbo.usuarios u
       LEFT JOIN dbo.cargos_n3 c ON c.cargo_id = u.user_funcao
       WHERE u.user_sts = 1 AND u.user_id <> @P1 AND
       ((c.is_global_admin = 1 AND c.cargo_sts = 1) OR EXISTS
        (SELECT 1 FROM dbo.user_roles ur JOIN dbo.roles r ON r.id = ur.role_id
         WHERE ur.user_id = u.user_id AND r.slug = 'system-admin'))`, excludedId,
    );
    if (!rows.length) throw new ConflictException('Mantenha pelo menos um administrador global ativo.');
  }

  private async syncGlobalAdminRole(
    tx: Pick<Nivel3DatabaseClient, '$queryRawUnsafe' | '$executeRawUnsafe'>,
    userId: number, functionId: number, actorId: number,
  ) {
    if (await this.isGlobalFunction(tx, functionId)) {
      await tx.$executeRawUnsafe(
        `INSERT INTO dbo.user_roles (user_id, role_id, assigned_by)
         SELECT @P1, r.id, @P2 FROM dbo.roles r WHERE r.slug = 'system-admin'
         AND NOT EXISTS (SELECT 1 FROM dbo.user_roles ur WHERE ur.user_id = @P1 AND ur.role_id = r.id)`,
        userId, actorId,
      );
    } else {
      await tx.$executeRawUnsafe(
        `DELETE ur FROM dbo.user_roles ur JOIN dbo.roles r ON r.id = ur.role_id
         WHERE ur.user_id = @P1 AND r.slug = 'system-admin'`, userId,
      );
    }
  }

  private async companiesByUserIds(ids: number[]): Promise<Map<number, UserOption[]>> {
    const result = new Map<number, UserOption[]>();
    if (ids.length === 0) return result;
    const placeholders = ids.map(() => '?').join(',');
    const rows = await this.database.$queryRawUnsafe<CompanyLinkRow[]>(
      `SELECT cu.usuario_id, c.clt_id AS id,
              COALESCE(NULLIF(c.clt_nomer, ''), c.clt_nomef) AS name
       FROM clientes_usuarios cu
       INNER JOIN clientes c ON c.clt_id = cu.cliente_id
       WHERE cu.usuario_id IN (${placeholders}) AND c.clt_sts = 1
       ORDER BY name`,
      ...ids,
    );
    for (const row of rows) {
      const entries = result.get(row.usuario_id) ?? [];
      entries.push({ id: row.id, name: row.name ?? `#${row.id}` });
      result.set(row.usuario_id, entries);
    }
    return result;
  }

  private permissionOptions(): Promise<PermissionOptionRow[]> {
    const placeholders = RBAC_PERMISSION_SLUGS.map(() => '?').join(',');
    return this.database.$queryRawUnsafe<PermissionOptionRow[]>(
      `SELECT id, name, slug, module, description FROM permissions
       WHERE slug IN (${placeholders}) ORDER BY module, id`,
      ...RBAC_PERMISSION_SLUGS,
    );
  }

  private async extraPermissionsByUserIds(ids: number[]): Promise<Map<number, number[]>> {
    const result = new Map<number, number[]>();
    if (ids.length === 0) return result;
    const placeholders = ids.map(() => '?').join(',');
    const rows = await this.database.$queryRawUnsafe<UserPermissionLinkRow[]>(
      `SELECT user_id, permission_id FROM user_permissions
       WHERE user_id IN (${placeholders}) AND effect = 'allow'`, ...ids,
    );
    for (const row of rows) {
      const entries = result.get(row.user_id) ?? [];
      entries.push(Number(row.permission_id));
      result.set(row.user_id, entries);
    }
    return result;
  }

  private async replaceCompanies(
    transaction: Pick<Nivel3DatabaseClient, '$executeRawUnsafe'>,
    userId: number,
    companyIds: number[],
  ): Promise<void> {
    await transaction.$executeRawUnsafe('DELETE FROM clientes_usuarios WHERE usuario_id = ?', userId);
    for (const companyId of companyIds) {
      await transaction.$executeRawUnsafe(
        'INSERT INTO clientes_usuarios (cliente_id, usuario_id) VALUES (?, ?)',
        companyId,
        userId,
      );
    }
  }

  private async replaceExtraPermissions(
    transaction: Pick<Nivel3DatabaseClient, '$executeRawUnsafe'>,
    userId: number,
    permissionIds: number[],
    assignedBy: number,
    functionId: number,
  ): Promise<void> {
    await transaction.$executeRawUnsafe(
      "DELETE FROM user_permissions WHERE user_id = ? AND effect = 'allow'",
      userId,
    );
    for (const permissionId of [...new Set(permissionIds)]) {
      await transaction.$executeRawUnsafe(
        `INSERT INTO user_permissions (user_id, permission_id, effect, assigned_at, assigned_by)
         SELECT ?, ?, 'allow', NOW(), ?
         WHERE NOT EXISTS (
           SELECT 1 FROM roles r
           INNER JOIN role_permissions rp ON rp.role_id = r.id
           WHERE r.slug = CONCAT('function-', ?) AND rp.permission_id = ?
         )`,
        userId,
        permissionId,
        assignedBy,
        functionId,
        permissionId,
      );
    }
  }

  private toSummary(
    row: UserRow,
    companies: UserOption[],
    extraPermissionIds: number[],
  ): ManagedUserSummary {
    return {
      id: row.user_id,
      isGlobalAdmin: Boolean(row.is_global_admin),
      status: status(row.user_sts),
      name: row.user_nome ?? '',
      email: row.user_mail ?? '',
      phone: row.user_cel ?? '',
      login: row.user_login ?? '',
      type: userType(row.tipo_usuario),
      function: row.user_funcao
        ? { id: row.user_funcao, name: row.cargo_nome ?? `#${row.user_funcao}` }
        : null,
      companies,
      extraPermissionIds,
    };
  }
}
