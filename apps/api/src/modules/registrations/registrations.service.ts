import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AppPermission,
  type RegistrationListResponse,
  type RegistrationRecord,
  type RegistrationResourceDefinition,
  type RegistrationResourceKey,
  type RegistrationWriteInput,
} from '@helpdesk/contracts';
import type { Nivel3DatabaseClient } from '@helpdesk/database';
import { NIVEL3_DATABASE } from '../../core/database/database.constants';
import type { AuthenticatedUser } from '../access/domain/authenticated-user';

type Row = Record<string, unknown>;

const STATES = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB',
  'PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
].map((value) => ({ value, label: value }));

const DEFINITIONS: Record<RegistrationResourceKey, RegistrationResourceDefinition> = {
  clients: {
    key: 'clients',
    title: 'Clientes',
    subtitle: 'Gerencie empresas, dados comerciais e serviços contratados.',
    singular: 'cliente',
    fields: [
      { key: 'legalName', label: 'Razão Social', type: 'text', required: true, maxLength: 80 },
      { key: 'tradeName', label: 'Nome Comercial', type: 'text', required: true, maxLength: 80 },
      { key: 'cnpj', label: 'CNPJ', type: 'text', maxLength: 22 },
      { key: 'address', label: 'Endereço', type: 'text', maxLength: 100 },
      { key: 'city', label: 'Cidade', type: 'text', required: true, maxLength: 50 },
      { key: 'state', label: 'UF', type: 'select', required: true, options: STATES },
      { key: 'email', label: 'E-mail', type: 'email', maxLength: 60 },
      { key: 'phone', label: 'Telefone', type: 'text', required: true, maxLength: 50 },
      { key: 'ti', label: 'TI', type: 'boolean' },
      { key: 'devops', label: 'DevOps', type: 'boolean' },
      { key: 'marketing', label: 'Marketing', type: 'boolean' },
    ],
  },
  categories: {
    key: 'categories',
    title: 'Categorias',
    subtitle: 'Gerencie as categorias utilizadas na classificação dos atendimentos.',
    singular: 'categoria',
    fields: [
      { key: 'name', label: 'Nome', type: 'text', required: true, maxLength: 50 },
      {
        key: 'sector',
        label: 'Setor',
        type: 'select',
        required: true,
        options: [
          { value: 1, label: 'TI' },
          { value: 2, label: 'Marketing' },
          { value: 3, label: 'ADM / DevOps' },
        ],
      },
    ],
  },
  'cost-centers': simple('cost-centers', 'Centros de Custo', 'centro de custo'),
  'accounting-classifications': simple('accounting-classifications', 'Classificação Contábil', 'classificação contábil'),
  'adjustment-indexes': simple('adjustment-indexes', 'Índices de Reajuste', 'índice de reajuste'),
  'payment-methods': simple('payment-methods', 'Formas de Pagamento', 'forma de pagamento'),
  'expense-types': classified('expense-types', 'Tipos de Despesa', 'tipo de despesa'),
  'service-types': classified('service-types', 'Tipos de Serviço', 'tipo de serviço'),
  'fee-types': classified('fee-types', 'Tipos de Taxa', 'tipo de taxa'),
};

function simple(
  key: RegistrationResourceKey,
  title: string,
  singular: string,
): RegistrationResourceDefinition {
  return {
    key,
    title,
    singular,
    subtitle: `Cadastre, edite e ative ou inative ${title.toLowerCase()}.`,
    fields: [{ key: 'name', label: 'Nome', type: 'text', required: true, maxLength: 50 }],
  };
}

function classified(
  key: RegistrationResourceKey,
  title: string,
  singular: string,
): RegistrationResourceDefinition {
  return {
    ...simple(key, title, singular),
    fields: [
      { key: 'name', label: 'Nome', type: 'text', required: true, maxLength: 50 },
      {
        key: 'accountingClassificationId',
        label: 'Classificação Contábil',
        type: 'select',
        required: true,
        optionSource: 'accounting-classifications',
      },
    ],
  };
}

const SIMPLE_TABLES: Partial<Record<RegistrationResourceKey, {
  table: string;
  nameColumn: string;
  classified?: boolean;
}>> = {
  'cost-centers': { table: 'cads_centro_custo', nameColumn: 'centro_custo' },
  'accounting-classifications': { table: 'cads_class_contab', nameColumn: 'categoria' },
  'adjustment-indexes': { table: 'cads_ind_reaju', nameColumn: 'indice' },
  'payment-methods': { table: 'cads_forma_pag', nameColumn: 'forma' },
  'expense-types': { table: 'cads_tipo_despe', nameColumn: 'despesa', classified: true },
  'service-types': { table: 'cads_tipo_servi', nameColumn: 'servico', classified: true },
  'fee-types': { table: 'cads_tipo_taxa', nameColumn: 'taxa', classified: true },
};

function has(user: AuthenticatedUser, permission: AppPermission): boolean {
  return user.grants.some(
    (grant) =>
      grant.permission === AppPermission.SystemAdmin ||
      grant.permission === permission,
  );
}

function status(input: RegistrationWriteInput): 0 | 1 {
  if (!input || typeof input !== 'object' || (input.status !== 0 && input.status !== 1)) {
    throw new BadRequestException('status deve ser 0 ou 1.');
  }
  return input.status;
}

function values(input: RegistrationWriteInput): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input.values)) {
    throw new BadRequestException('Dados do cadastro são inválidos.');
  }
  return input.values ?? {};
}

function text(
  source: Record<string, unknown>,
  key: string,
  maxLength: number,
  required = false,
): string {
  const value = typeof source[key] === 'string' ? source[key].trim() : '';
  if (required && !value) {
    throw new BadRequestException(`${key} é obrigatório.`);
  }
  if (value.length > maxLength) {
    throw new BadRequestException(`${key} deve ter no máximo ${maxLength} caracteres.`);
  }
  return value;
}

function integer(
  source: Record<string, unknown>,
  key: string,
  min = 1,
): number {
  const value = source[key];
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min) {
    throw new BadRequestException(`${key} é inválido.`);
  }
  return value;
}

function booleanValue(source: Record<string, unknown>, key: string): boolean {
  return source[key] === true || source[key] === 1;
}

function rowStatus(value: unknown): 0 | 1 {
  return Number(value) === 1 ? 1 : 0;
}

@Injectable()
export class RegistrationsService {
  constructor(
    @Inject(NIVEL3_DATABASE)
    private readonly db: Nivel3DatabaseClient,
  ) {}

  definition(resource: string): RegistrationResourceDefinition {
    if (!(resource in DEFINITIONS)) {
      throw new NotFoundException('Cadastro não encontrado.');
    }
    return DEFINITIONS[resource as RegistrationResourceKey];
  }

  private resource(resource: string): RegistrationResourceKey {
    return this.definition(resource).key;
  }

  private permissions(resource: RegistrationResourceKey) {
    if (resource === 'clients') {
      return {
        read: AppPermission.RegistrationsClientsRead,
        create: AppPermission.RegistrationsClientsCreate,
        edit: AppPermission.RegistrationsClientsEdit,
      };
    }
    if (resource === 'categories') {
      return {
        read: AppPermission.RegistrationsCategoriesRead,
        create: AppPermission.RegistrationsCategoriesCreate,
        edit: AppPermission.RegistrationsCategoriesEdit,
      };
    }
    return {
      read: AppPermission.RegistrationsFinanceRead,
      create: AppPermission.RegistrationsFinanceManage,
      edit: AppPermission.RegistrationsFinanceManage,
    };
  }

  private access(user: AuthenticatedUser, resource: RegistrationResourceKey) {
    const permissions = this.permissions(resource);
    const canCreate = has(user, permissions.create);
    const canEdit = has(user, permissions.edit);
    if (!has(user, permissions.read) && !canCreate && !canEdit) {
      throw new ForbiddenException('Usuário sem acesso a este cadastro.');
    }
    return { canCreate, canEdit };
  }

  async list(
    user: AuthenticatedUser,
    resourceValue: string,
    searchValue?: string,
  ): Promise<RegistrationListResponse> {
    const resource = this.resource(resourceValue);
    const access = this.access(user, resource);
    const search = searchValue?.trim().slice(0, 100) ?? '';
    const items =
      resource === 'clients'
        ? await this.clients(search)
        : resource === 'categories'
          ? await this.categories(search)
          : await this.simpleRecords(resource, search);

    return {
      definition: DEFINITIONS[resource],
      items,
      ...access,
    };
  }

  async create(
    user: AuthenticatedUser,
    resourceValue: string,
    input: RegistrationWriteInput,
  ): Promise<RegistrationRecord> {
    const resource = this.resource(resourceValue);
    if (!this.access(user, resource).canCreate) {
      throw new ForbiddenException('Usuário sem permissão para criar neste cadastro.');
    }
    return this.write(resource, null, input);
  }

  async update(
    user: AuthenticatedUser,
    resourceValue: string,
    id: number,
    input: RegistrationWriteInput,
  ): Promise<RegistrationRecord> {
    const resource = this.resource(resourceValue);
    if (!this.access(user, resource).canEdit) {
      throw new ForbiddenException('Usuário sem permissão para editar este cadastro.');
    }
    if (!Number.isSafeInteger(id) || id < 1) {
      throw new BadRequestException('id é inválido.');
    }
    return this.write(resource, id, input);
  }

  private async clients(search: string): Promise<RegistrationRecord[]> {
    const like = `%${search}%`;
    const rows = await this.db.$queryRawUnsafe<Row[]>(
      `SELECT clt_id, clt_nomer, clt_nomef, clt_cnpj, clt_end, clt_city,
              clt_uf, clt_mail, clt_tel, clt_sts, clt_ti, clt_adm, clt_mkt
       FROM clientes
       WHERE (? = '' OR clt_nomer LIKE ? OR clt_nomef LIKE ? OR clt_cnpj LIKE ?)
       ORDER BY clt_sts DESC, clt_nomef ASC, clt_id ASC`,
      search,
      like,
      like,
      like,
    );

    return rows.map((row) => ({
      id: Number(row.clt_id),
      status: rowStatus(row.clt_sts),
      values: {
        legalName: String(row.clt_nomer ?? ''),
        tradeName: String(row.clt_nomef ?? ''),
        cnpj: String(row.clt_cnpj ?? ''),
        address: String(row.clt_end ?? ''),
        city: String(row.clt_city ?? ''),
        state: String(row.clt_uf ?? ''),
        email: String(row.clt_mail ?? ''),
        phone: String(row.clt_tel ?? ''),
        ti: Number(row.clt_ti) === 1,
        devops: Number(row.clt_adm) === 1,
        marketing: Number(row.clt_mkt) === 1,
      },
    }));
  }

  private async categories(search: string): Promise<RegistrationRecord[]> {
    const like = `%${search}%`;
    const rows = await this.db.$queryRawUnsafe<Row[]>(
      `SELECT cat_id, cat_nome, cat_setor, cat_sts
       FROM categorias
       WHERE (? = '' OR cat_nome LIKE ?)
       ORDER BY cat_sts DESC, cat_nome ASC, cat_id ASC`,
      search,
      like,
    );

    return rows.map((row) => ({
      id: Number(row.cat_id),
      status: rowStatus(row.cat_sts),
      values: {
        name: String(row.cat_nome ?? ''),
        sector: Number(row.cat_setor ?? 1),
      },
    }));
  }

  private async simpleRecords(
    resource: RegistrationResourceKey,
    search: string,
  ): Promise<RegistrationRecord[]> {
    const config = SIMPLE_TABLES[resource];
    if (!config) throw new NotFoundException('Cadastro não encontrado.');
    const like = `%${search}%`;
    const rows = config.classified
      ? await this.db.$queryRawUnsafe<Row[]>(
          `SELECT t.id, t.${config.nameColumn} AS name, t.status,
                  t.class_contab, c.categoria AS classification_name
           FROM ${config.table} t
           LEFT JOIN cads_class_contab c ON c.id = t.class_contab
           WHERE (? = '' OR t.${config.nameColumn} LIKE ?)
           ORDER BY t.status DESC, t.${config.nameColumn} ASC, t.id ASC`,
          search,
          like,
        )
      : await this.db.$queryRawUnsafe<Row[]>(
          `SELECT id, ${config.nameColumn} AS name, status
           FROM ${config.table}
           WHERE (? = '' OR ${config.nameColumn} LIKE ?)
           ORDER BY status DESC, ${config.nameColumn} ASC, id ASC`,
          search,
          like,
        );

    return rows.map((row) => ({
      id: Number(row.id),
      status: rowStatus(row.status),
      values: {
        name: String(row.name ?? ''),
        ...(config.classified
          ? {
              accountingClassificationId: Number(row.class_contab ?? 0),
              accountingClassificationName: String(row.classification_name ?? ''),
            }
          : {}),
      },
    }));
  }

  private async write(
    resource: RegistrationResourceKey,
    id: number | null,
    input: RegistrationWriteInput,
  ): Promise<RegistrationRecord> {
    const nextStatus = status(input);
    const source = values(input);

    if (resource === 'clients') {
      return this.writeClient(id, source, nextStatus);
    }
    if (resource === 'categories') {
      return this.writeCategory(id, source, nextStatus);
    }
    return this.writeSimple(resource, id, source, nextStatus);
  }

  private async writeClient(
    id: number | null,
    source: Record<string, unknown>,
    nextStatus: 0 | 1,
  ): Promise<RegistrationRecord> {
    const data = {
      legalName: text(source, 'legalName', 80, true),
      tradeName: text(source, 'tradeName', 80, true),
      cnpj: text(source, 'cnpj', 22),
      address: text(source, 'address', 100),
      city: text(source, 'city', 50, true),
      state: text(source, 'state', 2, true).toUpperCase(),
      email: text(source, 'email', 60),
      phone: text(source, 'phone', 50, true),
      ti: booleanValue(source, 'ti') ? 1 : 0,
      devops: booleanValue(source, 'devops') ? 1 : 0,
      marketing: booleanValue(source, 'marketing') ? 1 : 0,
    };

    if (id === null) {
      id = await this.insertWithId(
        `INSERT INTO clientes
          (clt_nomer, clt_nomef, clt_cnpj, clt_end, clt_city, clt_uf, clt_mail, clt_tel, clt_sts, clt_ti, clt_adm, clt_mkt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        data.legalName, data.tradeName, data.cnpj, data.address, data.city,
        data.state, data.email, data.phone, nextStatus, data.ti, data.devops, data.marketing,
      );
    } else {
      const count = await this.db.$executeRawUnsafe(
        `UPDATE clientes
         SET clt_nomer=?, clt_nomef=?, clt_cnpj=?, clt_end=?, clt_city=?,
             clt_uf=?, clt_mail=?, clt_tel=?, clt_sts=?, clt_ti=?, clt_adm=?, clt_mkt=?
         WHERE clt_id=?`,
        data.legalName, data.tradeName, data.cnpj, data.address, data.city,
        data.state, data.email, data.phone, nextStatus, data.ti, data.devops, data.marketing, id,
      );
      if (!count) throw new NotFoundException('Cliente não encontrado.');
    }

    return { id, status: nextStatus, values: { ...data, ti: !!data.ti, devops: !!data.devops, marketing: !!data.marketing } };
  }

  private async writeCategory(
    id: number | null,
    source: Record<string, unknown>,
    nextStatus: 0 | 1,
  ): Promise<RegistrationRecord> {
    const name = text(source, 'name', 50, true);
    const sector = integer(source, 'sector');
    if (![1, 2, 3].includes(sector)) {
      throw new BadRequestException('sector é inválido.');
    }

    if (id === null) {
      id = await this.insertWithId(
        'INSERT INTO categorias (cat_nome, cat_setor, cat_sts) VALUES (?, ?, ?)',
        name,
        sector,
        nextStatus,
      );
    } else {
      const count = await this.db.$executeRawUnsafe(
        'UPDATE categorias SET cat_nome=?, cat_setor=?, cat_sts=? WHERE cat_id=?',
        name,
        sector,
        nextStatus,
        id,
      );
      if (!count) throw new NotFoundException('Categoria não encontrada.');
    }

    return { id, status: nextStatus, values: { name, sector } };
  }

  private async writeSimple(
    resource: RegistrationResourceKey,
    id: number | null,
    source: Record<string, unknown>,
    nextStatus: 0 | 1,
  ): Promise<RegistrationRecord> {
    const config = SIMPLE_TABLES[resource];
    if (!config) throw new NotFoundException('Cadastro não encontrado.');
    const name = text(source, 'name', 50, true);
    let accountingClassificationId: number | undefined;

    if (config.classified) {
      accountingClassificationId = integer(source, 'accountingClassificationId');
      const rows = await this.db.$queryRawUnsafe<Row[]>(
        'SELECT id FROM cads_class_contab WHERE id=? LIMIT 1',
        accountingClassificationId,
      );
      if (!rows[0]) {
        throw new BadRequestException('Classificação contábil não encontrada.');
      }
    }

    if (id === null) {
      if (config.classified) {
        id = await this.insertWithId(
          `INSERT INTO ${config.table} (${config.nameColumn}, class_contab, status) VALUES (?, ?, ?)`,
          name,
          accountingClassificationId,
          nextStatus,
        );
      } else {
        id = await this.insertWithId(
          `INSERT INTO ${config.table} (${config.nameColumn}, status) VALUES (?, ?)`,
          name,
          nextStatus,
        );
      }
    } else {
      const count = config.classified
        ? await this.db.$executeRawUnsafe(
            `UPDATE ${config.table} SET ${config.nameColumn}=?, class_contab=?, status=? WHERE id=?`,
            name,
            accountingClassificationId,
            nextStatus,
            id,
          )
        : await this.db.$executeRawUnsafe(
            `UPDATE ${config.table} SET ${config.nameColumn}=?, status=? WHERE id=?`,
            name,
            nextStatus,
            id,
          );
      if (!count) throw new NotFoundException('Registro não encontrado.');
    }

    return {
      id,
      status: nextStatus,
      values: {
        name,
        ...(config.classified ? { accountingClassificationId: accountingClassificationId! } : {}),
      },
    };
  }

  private insertWithId(sql: string, ...parameters: unknown[]): Promise<number> {
    return this.db.$transaction(async (transaction) => {
      await transaction.$executeRawUnsafe(sql, ...parameters);
      const rows = await transaction.$queryRawUnsafe<Array<{ id: number | bigint }>>(
        'SELECT LAST_INSERT_ID() AS id',
      );
      const id = Number(rows[0]?.id);
      if (!Number.isSafeInteger(id) || id < 1) {
        throw new BadRequestException('Não foi possível identificar o registro criado.');
      }
      return id;
    });
  }
}
