import {
  AppPermission,
  PermissionScope,
  type PermissionGrant,
} from '@helpdesk/contracts';
import type { AuthenticatedUser } from '../domain/authenticated-user';
import type { LegacyUserSession } from '../domain/legacy-user-session';
import type { RbacAccessSnapshot } from '../domain/rbac-access-snapshot';

const TICKET_PERMISSION = {
  read: 'atendimentos.visualizar',
  create: 'atendimentos.criar',
  edit: 'atendimentos.editar',
  execute: 'atendimentos.executar',
  hold: 'atendimentos.colocar_espera',
  reject: 'atendimentos.recusar',
  manageOthers: 'atendimentos.editar_terceiros',
  audit: 'atendimentos.auditar',
} as const;

const LOGISTICS_PERMISSION = {
  vehicleAgendaRead: 'logistica.agenda.visualizar',
  vehicleAgendaManage: 'logistica.agenda.gerenciar',
  expensesRead: 'logistica.rd.visualizar',
  expensesManage: 'logistica.rd.gerenciar',
  expensesAdminRead: 'logistica.rd.admin.visualizar',
  expensesAdminManage: 'logistica.rd.admin.gerenciar',
  expensesApprove: 'logistica.rd.aprovar',
  expensesPay: 'logistica.rd.pagar',
  statementsRead: 'logistica.extratos.visualizar',
} as const;

const USER_PERMISSION = {
  read: 'usuarios.visualizar',
  create: 'usuarios.criar',
  edit: 'usuarios.editar',
  manageAccess: 'usuarios.editar_acesso',
} as const;

const CATALOG_PERMISSION = {
  manage: ['catalogos.gerenciar', 'catalog.manage'],
  tiRead: ['catalogos.ti.visualizar', 'catalog.ti.read'],
  tiEdit: [
    'catalogos.ti.editar',
    'catalog.ti.edit',
    'catalogos.ti.gerenciar',
    'catalogo.ti.gerenciar',
    'catalog.ti.manage',
  ],
  devOpsRead: ['catalogos.devops.visualizar', 'catalog.devops.read'],
  devOpsEdit: [
    'catalogos.devops.editar',
    'catalog.devops.edit',
    'catalogos.devops.gerenciar',
    'catalogo.devops.gerenciar',
    'catalog.devops.manage',
  ],
} as const;

const REGISTRATION_PERMISSION = {
  clientsRead: 'cadastros.clientes.visualizar',
  clientsCreate: 'cadastros.clientes.criar',
  clientsEdit: 'cadastros.clientes.editar',
  contactsCreate: 'cadastros.clientes.contatos.criar',
  contactsEdit: 'cadastros.clientes.contatos.editar',
  locationsCreate: 'cadastros.clientes.locais.criar',
  locationsEdit: 'cadastros.clientes.locais.editar',
  categoriesRead: 'cadastros.categorias.visualizar',
  categoriesCreate: 'cadastros.categorias.criar',
  categoriesEdit: 'cadastros.categorias.editar',
  subcategoriesCreate: 'cadastros.categorias.subcategorias.criar',
  subcategoriesEdit: 'cadastros.categorias.subcategorias.editar',
  itemsCreate: 'cadastros.categorias.itens.criar',
  itemsEdit: 'cadastros.categorias.itens.editar',
  financeRead: 'cadastros.financeiro.visualizar',
  financeManage: 'cadastros.financeiro.gerenciar',
} as const;

const SYSTEM_ADMIN_ROLE = 'system-admin';

function permissionLevel(moduleValue: string, index: number): number {
  const value = moduleValue[index];
  return value && /^\d$/.test(value) ? Number(value) : 0;
}

function addGrant(
  grants: PermissionGrant[],
  permission: AppPermission,
  enabled: boolean,
  scope: PermissionScope,
) {
  if (enabled) {
    grants.push({ permission, scope });
  }
}

function hasAnyPermission(
  permissions: ReadonlySet<string>,
  slugs: readonly string[],
): boolean {
  return slugs.some((slug) => permissions.has(slug));
}

export function translateRbacAccess(
  session: LegacyUserSession,
  snapshot: RbacAccessSnapshot,
): AuthenticatedUser {
  const permissions = snapshot.permissionSlugs;
  const grants: PermissionGrant[] = [];

  addGrant(
    grants,
    AppPermission.SystemAdmin,
    snapshot.roleSlugs.includes(SYSTEM_ADMIN_ROLE),
    PermissionScope.All,
  );

  addGrant(grants, AppPermission.UsersRead, permissions.has(USER_PERMISSION.read), PermissionScope.All);
  addGrant(grants, AppPermission.UsersCreate, permissions.has(USER_PERMISSION.create), PermissionScope.All);
  addGrant(grants, AppPermission.UsersEdit, permissions.has(USER_PERMISSION.edit), PermissionScope.All);
  addGrant(grants, AppPermission.UsersManageAccess, permissions.has(USER_PERMISSION.manageAccess), PermissionScope.All);

  addGrant(grants, AppPermission.CatalogManage, hasAnyPermission(permissions, CATALOG_PERMISSION.manage), PermissionScope.All);
  addGrant(grants, AppPermission.CatalogTiRead, hasAnyPermission(permissions, CATALOG_PERMISSION.tiRead), PermissionScope.All);
  addGrant(grants, AppPermission.CatalogTiEdit, hasAnyPermission(permissions, CATALOG_PERMISSION.tiEdit), PermissionScope.All);
  addGrant(grants, AppPermission.CatalogDevOpsRead, hasAnyPermission(permissions, CATALOG_PERMISSION.devOpsRead), PermissionScope.All);
  addGrant(grants, AppPermission.CatalogDevOpsEdit, hasAnyPermission(permissions, CATALOG_PERMISSION.devOpsEdit), PermissionScope.All);

  const legacyRegistrations = session.modules[2];
  const legacyFinanceRegistrations = session.modules[7];
  addGrant(grants, AppPermission.RegistrationsClientsRead, permissions.has(REGISTRATION_PERMISSION.clientsRead) || permissionLevel(legacyRegistrations, 1) >= 1, PermissionScope.All);
  addGrant(grants, AppPermission.RegistrationsClientsCreate, permissions.has(REGISTRATION_PERMISSION.clientsCreate) || permissionLevel(legacyRegistrations, 1) >= 2, PermissionScope.All);
  addGrant(grants, AppPermission.RegistrationsClientsEdit, permissions.has(REGISTRATION_PERMISSION.clientsEdit) || permissionLevel(legacyRegistrations, 1) >= 3, PermissionScope.All);
  addGrant(grants, AppPermission.RegistrationsClientContactsCreate, permissions.has(REGISTRATION_PERMISSION.contactsCreate) || permissionLevel(legacyRegistrations, 2) >= 2, PermissionScope.All);
  addGrant(grants, AppPermission.RegistrationsClientContactsEdit, permissions.has(REGISTRATION_PERMISSION.contactsEdit) || permissionLevel(legacyRegistrations, 2) >= 3, PermissionScope.All);
  addGrant(grants, AppPermission.RegistrationsClientLocationsCreate, permissions.has(REGISTRATION_PERMISSION.locationsCreate) || permissionLevel(legacyRegistrations, 3) >= 3, PermissionScope.All);
  addGrant(grants, AppPermission.RegistrationsClientLocationsEdit, permissions.has(REGISTRATION_PERMISSION.locationsEdit) || permissionLevel(legacyRegistrations, 3) >= 3, PermissionScope.All);
  addGrant(grants, AppPermission.RegistrationsCategoriesRead, permissions.has(REGISTRATION_PERMISSION.categoriesRead) || permissionLevel(legacyRegistrations, 4) >= 1, PermissionScope.All);
  addGrant(grants, AppPermission.RegistrationsCategoriesCreate, permissions.has(REGISTRATION_PERMISSION.categoriesCreate) || permissionLevel(legacyRegistrations, 4) >= 2, PermissionScope.All);
  addGrant(grants, AppPermission.RegistrationsCategoriesEdit, permissions.has(REGISTRATION_PERMISSION.categoriesEdit) || permissionLevel(legacyRegistrations, 4) >= 3, PermissionScope.All);
  addGrant(grants, AppPermission.RegistrationsSubcategoriesCreate, permissions.has(REGISTRATION_PERMISSION.subcategoriesCreate) || permissionLevel(legacyRegistrations, 5) >= 2, PermissionScope.All);
  addGrant(grants, AppPermission.RegistrationsSubcategoriesEdit, permissions.has(REGISTRATION_PERMISSION.subcategoriesEdit) || permissionLevel(legacyRegistrations, 5) >= 3, PermissionScope.All);
  addGrant(grants, AppPermission.RegistrationsItemsCreate, permissions.has(REGISTRATION_PERMISSION.itemsCreate) || permissionLevel(legacyRegistrations, 6) >= 2, PermissionScope.All);
  addGrant(grants, AppPermission.RegistrationsItemsEdit, permissions.has(REGISTRATION_PERMISSION.itemsEdit) || permissionLevel(legacyRegistrations, 6) >= 3, PermissionScope.All);
  addGrant(grants, AppPermission.RegistrationsFinanceRead, permissions.has(REGISTRATION_PERMISSION.financeRead) || permissionLevel(legacyFinanceRegistrations, 0) >= 1, PermissionScope.All);
  addGrant(grants, AppPermission.RegistrationsFinanceManage, permissions.has(REGISTRATION_PERMISSION.financeManage) || permissionLevel(legacyFinanceRegistrations, 0) >= 1, PermissionScope.All);

  const operationalScope = permissions.has(TICKET_PERMISSION.manageOthers)
    ? PermissionScope.All
    : PermissionScope.Own;

  addGrant(
    grants,
    AppPermission.TicketsRead,
    permissions.has(TICKET_PERMISSION.read),
    PermissionScope.All,
  );
  addGrant(
    grants,
    AppPermission.TicketsCreate,
    permissions.has(TICKET_PERMISSION.create),
    PermissionScope.All,
  );
  addGrant(
    grants,
    AppPermission.TicketsEdit,
    permissions.has(TICKET_PERMISSION.edit),
    operationalScope,
  );
  addGrant(
    grants,
    AppPermission.TicketsClassify,
    permissions.has(TICKET_PERMISSION.edit),
    operationalScope,
  );
  addGrant(
    grants,
    AppPermission.TicketsExecute,
    permissions.has(TICKET_PERMISSION.execute),
    operationalScope,
  );
  addGrant(
    grants,
    AppPermission.TicketsClose,
    permissions.has(TICKET_PERMISSION.execute),
    operationalScope,
  );
  addGrant(
    grants,
    AppPermission.TicketsHold,
    permissions.has(TICKET_PERMISSION.hold),
    operationalScope,
  );
  addGrant(
    grants,
    AppPermission.TicketsReject,
    permissions.has(TICKET_PERMISSION.reject),
    operationalScope,
  );

  addGrant(
    grants,
    AppPermission.TicketsAudit,
    permissions.has(TICKET_PERMISSION.audit) ||
      permissions.has(TICKET_PERMISSION.manageOthers),
    PermissionScope.All,
  );

  const legacyLogistics = session.modules[9];
  const canReadVehicleAgenda =
    permissions.has(LOGISTICS_PERMISSION.vehicleAgendaRead) ||
    permissions.has(LOGISTICS_PERMISSION.vehicleAgendaManage) ||
    permissionLevel(legacyLogistics, 1) >= 1;
  const canManageVehicleAgenda =
    permissions.has(LOGISTICS_PERMISSION.vehicleAgendaManage) ||
    permissionLevel(legacyLogistics, 1) >= 2;

  addGrant(
    grants,
    AppPermission.LogisticsVehicleAgendaRead,
    canReadVehicleAgenda,
    PermissionScope.All,
  );
  addGrant(
    grants,
    AppPermission.LogisticsVehicleAgendaManage,
    canManageVehicleAgenda,
    PermissionScope.All,
  );
  addGrant(
    grants,
    AppPermission.LogisticsExpensesRead,
    permissions.has(LOGISTICS_PERMISSION.expensesRead) ||
      permissionLevel(legacyLogistics, 0) >= 1,
    PermissionScope.Own,
  );
  addGrant(
    grants,
    AppPermission.LogisticsExpensesManage,
    permissions.has(LOGISTICS_PERMISSION.expensesManage) ||
      permissionLevel(legacyLogistics, 0) >= 1,
    PermissionScope.Own,
  );
  addGrant(
    grants,
    AppPermission.LogisticsExpensesAdminRead,
    permissions.has(LOGISTICS_PERMISSION.expensesAdminRead) ||
      permissionLevel(legacyLogistics, 2) >= 2,
    PermissionScope.All,
  );

  addGrant(
    grants,
    AppPermission.LogisticsExpensesAdminManage,
    permissions.has(LOGISTICS_PERMISSION.expensesAdminManage) ||
      permissionLevel(legacyLogistics, 2) >= 2,
    PermissionScope.All,
  );

  addGrant(
    grants,
    AppPermission.LogisticsExpensesApprove,
    permissions.has(LOGISTICS_PERMISSION.expensesApprove) ||
      permissionLevel(legacyLogistics, 2) >= 2,
    PermissionScope.All,
  );

  addGrant(
    grants,
    AppPermission.LogisticsExpensesPay,
    permissions.has(LOGISTICS_PERMISSION.expensesPay) ||
      permissionLevel(legacyLogistics, 2) >= 3,
    PermissionScope.All,
  );

  addGrant(
    grants,
    AppPermission.LogisticsStatementsRead,
    permissions.has(LOGISTICS_PERMISSION.statementsRead) ||
      permissionLevel(legacyLogistics, 9) >= 1,
    PermissionScope.All,
  );

  return {
    id: session.id,
    name: session.name,
    login: session.login,
    functionId: session.functionId,
    accessSource: 'rbac',
    roleAssignments: [],
    grants,
  };
}
