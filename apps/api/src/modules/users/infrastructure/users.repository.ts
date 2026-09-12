import { Inject, Injectable } from '@nestjs/common';
import type {
  CreateManagedUserRequest,
  ManagedUserDetail,
  ManagedUserListResponse,
  ManagedUserSummary,
  UpdateManagedUserRequest,
  UserManagementCatalogs,
  UserOption,
} from '@helpdesk/contracts';
import type { Nivel3DatabaseClient } from '@helpdesk/database';
import { NIVEL3_DATABASE } from '../../../core/database/database.constants';

interface UserRow {
  user_id: number;
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
interface ConflictRow { user_id: number; user_login: string | null; user_mail: string | null }
interface InsertIdRow { id: bigint | number }

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

  async list(page: number, limit: number, search: string): Promise<ManagedUserListResponse> {
    const offset = (page - 1) * limit;
    const pattern = `%${search}%`;
    const filter = search
      ? 'WHERE u.user_nome LIKE ? OR u.user_login LIKE ? OR u.user_mail LIKE ?'
      : '';
    const parameters = search ? [pattern, pattern, pattern] : [];
    const [rows, totals] = await Promise.all([
      this.database.$queryRawUnsafe<UserRow[]>(
        `SELECT u.*, c.cargo_nome
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
    const companies = await this.companiesByUserIds(rows.map((row) => row.user_id));
    const total = Number(totals[0]?.total ?? 0);

    return {
      data: rows.map((row) => this.toSummary(row, companies.get(row.user_id) ?? [])),
      meta: { page, limit, total, totalPages: total === 0 ? 0 : Math.ceil(total / limit) },
    };
  }

  async findById(id: number): Promise<ManagedUserDetail | null> {
    const rows = await this.database.$queryRawUnsafe<UserRow[]>(
      `SELECT u.*, c.cargo_nome
       FROM usuarios u
       LEFT JOIN cargos_n3 c ON c.cargo_id = u.user_funcao
       WHERE u.user_id = ? LIMIT 1`,
      id,
    );
    const row = rows[0];
    if (!row) return null;
    const companies = await this.companiesByUserIds([id]);
    return {
      ...this.toSummary(row, companies.get(id) ?? []),
      link: row.link ?? '',
      pixKeyType: row.pix_type,
      pixKey: row.chavepix ?? '',
      legacyModules: [
        row.user_modulo_01, row.user_modulo_02, row.user_modulo_03,
        row.user_modulo_04, row.user_modulo_05, row.user_modulo_06,
        row.user_modulo_07, row.user_modulo_08, row.user_modulo_09,
      ],
    };
  }

  async catalogs(): Promise<UserManagementCatalogs> {
    const [functions, companies, pixKeyTypes] = await Promise.all([
      this.database.$queryRaw<OptionRow[]>`
        SELECT cargo_id AS id, cargo_nome AS name
        FROM cargos_n3 WHERE cargo_sts = 1 ORDER BY cargo_nome`,
      this.database.$queryRaw<OptionRow[]>`
        SELECT clt_id AS id, COALESCE(NULLIF(clt_nomer, ''), clt_nomef) AS name
        FROM clientes WHERE clt_sts = 1 ORDER BY name`,
      this.database.$queryRaw<OptionRow[]>`
        SELECT id, name_type AS name FROM type_keys ORDER BY id`,
    ]);
    const map = (rows: OptionRow[]): UserOption[] =>
      rows.map((row) => ({ id: row.id, name: row.name ?? `#${row.id}` }));
    return { functions: map(functions), companies: map(companies), pixKeyTypes: map(pixKeyTypes) };
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

  async create(input: CreateManagedUserRequest, passwordHash: string): Promise<number> {
    const modules = input.legacyModules ?? Array(9).fill('0000000000');
    return this.database.$transaction(async (transaction) => {
      await transaction.$executeRawUnsafe(
        `INSERT INTO usuarios
          (user_sts, user_nome, user_mail, user_cel, user_funcao, user_login,
           user_pass, tipo_usuario, link, pix_type, chavepix,
           user_modulo_01, user_modulo_02, user_modulo_03, user_modulo_04,
           user_modulo_05, user_modulo_06, user_modulo_07, user_modulo_08, user_modulo_09)
         VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        input.name, input.email, input.phone, input.functionId, input.login,
        passwordHash, input.type, input.link ?? '', input.pixKeyType ?? null,
        input.pixKey ?? '', ...modules,
      );
      const ids = await transaction.$queryRawUnsafe<InsertIdRow[]>('SELECT LAST_INSERT_ID() AS id');
      const id = Number(ids[0]?.id);
      await this.replaceCompanies(transaction, id, input.companyIds ?? []);
      return id;
    });
  }

  async update(id: number, input: UpdateManagedUserRequest, canManageAccess: boolean): Promise<boolean> {
    return this.database.$transaction(async (transaction) => {
      const modulesSql = canManageAccess && input.legacyModules
        ? `, user_modulo_01 = ?, user_modulo_02 = ?, user_modulo_03 = ?,
             user_modulo_04 = ?, user_modulo_05 = ?, user_modulo_06 = ?,
             user_modulo_07 = ?, user_modulo_08 = ?, user_modulo_09 = ?`
        : '';
      const moduleParameters = canManageAccess && input.legacyModules ? input.legacyModules : [];
      const changed = await transaction.$executeRawUnsafe(
        `UPDATE usuarios SET user_sts = ?, user_nome = ?, user_mail = ?,
          user_cel = ?, user_funcao = ?, user_login = ?, tipo_usuario = ?,
          link = ?, pix_type = ?, chavepix = ? ${modulesSql}
         WHERE user_id = ?`,
        input.status, input.name, input.email, input.phone, input.functionId,
        input.login, input.type, input.link ?? '', input.pixKeyType ?? null,
        input.pixKey ?? '', ...moduleParameters, id,
      );
      if (changed === 0) return false;
      await this.replaceCompanies(transaction, id, input.companyIds ?? []);
      return true;
    });
  }

  async deactivate(id: number): Promise<boolean> {
    const changed = await this.database.$executeRawUnsafe(
      'UPDATE usuarios SET user_sts = 2 WHERE user_id = ? AND user_sts <> 2',
      id,
    );
    return changed > 0;
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

  private toSummary(row: UserRow, companies: UserOption[]): ManagedUserSummary {
    return {
      id: row.user_id,
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
    };
  }
}
