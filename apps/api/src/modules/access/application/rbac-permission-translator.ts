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
  radio: 'atendimentos.radio',
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
  manage: 'catalogos.gerenciar',
  tiRead: 'catalogos.ti.visualizar',
  tiEdit: 'catalogos.ti.editar',
  devOpsRead: 'catalogos.devops.visualizar',
  devOpsEdit: 'catalogos.devops.editar',
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

const TICKET_TYPE_PERMISSION = {
  devOpsRead: 'devops.atendimentos.visualizar',
  devOpsCreate: 'devops.atendimentos.criar',
  marketingRead: 'marketing.atendimentos.visualizar',
  marketingCreate: 'marketing.atendimentos.criar',
} as const;

const QUALITY_PERMISSION = {
  onCallRead: 'qualidade.plantao.visualizar',
  onCallManage: 'qualidade.plantao.gerenciar',
  datesRead: 'qualidade.datas.visualizar',
  datesManage: 'qualidade.datas.gerenciar',
} as const;

const SYSTEM_ADMIN_ROLE = 'system-admin';

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

function hasPermission(
  permissions: ReadonlySet<string>,
  canonicalSlug: string,
  appPermission: AppPermission,
): boolean {
  return permissions.has(canonicalSlug) || permissions.has(appPermission);
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
  addGrant(
    grants,
    AppPermission.OnCallTi,
    snapshot.onCallAreas.includes('ti'),
    PermissionScope.All,
  );
  addGrant(
    grants,
    AppPermission.OnCallDevOps,
    snapshot.onCallAreas.includes('devops'),
    PermissionScope.All,
  );

  addGrant(grants, AppPermission.UsersRead, hasPermission(permissions, USER_PERMISSION.read, AppPermission.UsersRead), PermissionScope.All);
  addGrant(grants, AppPermission.UsersCreate, hasPermission(permissions, USER_PERMISSION.create, AppPermission.UsersCreate), PermissionScope.All);
  addGrant(grants, AppPermission.UsersEdit, hasPermission(permissions, USER_PERMISSION.edit, AppPermission.UsersEdit), PermissionScope.All);
  addGrant(grants, AppPermission.UsersManageAccess, hasPermission(permissions, USER_PERMISSION.manageAccess, AppPermission.UsersManageAccess), PermissionScope.All);

  addGrant(
    grants,
    AppPermission.QualityOnCallRead,
    permissions.has(QUALITY_PERMISSION.onCallRead) ||
      permissions.has(QUALITY_PERMISSION.onCallManage),
    PermissionScope.All,
  );
  addGrant(grants, AppPermission.QualityOnCallManage, permissions.has(QUALITY_PERMISSION.onCallManage), PermissionScope.All);
  addGrant(
    grants,
    AppPermission.QualityDatesRead,
    permissions.has(QUALITY_PERMISSION.datesRead) ||
      permissions.has(QUALITY_PERMISSION.datesManage),
    PermissionScope.All,
  );
  addGrant(grants, AppPermission.QualityDatesManage, permissions.has(QUALITY_PERMISSION.datesManage), PermissionScope.All);

  addGrant(grants, AppPermission.CatalogManage, permissions.has(CATALOG_PERMISSION.manage), PermissionScope.All);
  addGrant(grants, AppPermission.CatalogTiRead, permissions.has(CATALOG_PERMISSION.tiRead), PermissionScope.All);
  addGrant(grants, AppPermission.CatalogTiEdit, permissions.has(CATALOG_PERMISSION.tiEdit), PermissionScope.All);
  addGrant(grants, AppPermission.CatalogDevOpsRead, permissions.has(CATALOG_PERMISSION.devOpsRead), PermissionScope.All);
  addGrant(grants, AppPermission.CatalogDevOpsEdit, permissions.has(CATALOG_PERMISSION.devOpsEdit), PermissionScope.All);

  addGrant(grants, AppPermission.RegistrationsClientsRead, hasPermission(permissions, REGISTRATION_PERMISSION.clientsRead, AppPermission.RegistrationsClientsRead), PermissionScope.All);
  addGrant(grants, AppPermission.RegistrationsClientsCreate, hasPermission(permissions, REGISTRATION_PERMISSION.clientsCreate, AppPermission.RegistrationsClientsCreate), PermissionScope.All);
  addGrant(grants, AppPermission.RegistrationsClientsEdit, hasPermission(permissions, REGISTRATION_PERMISSION.clientsEdit, AppPermission.RegistrationsClientsEdit), PermissionScope.All);
  addGrant(grants, AppPermission.RegistrationsClientContactsCreate, hasPermission(permissions, REGISTRATION_PERMISSION.contactsCreate, AppPermission.RegistrationsClientContactsCreate), PermissionScope.All);
  addGrant(grants, AppPermission.RegistrationsClientContactsEdit, hasPermission(permissions, REGISTRATION_PERMISSION.contactsEdit, AppPermission.RegistrationsClientContactsEdit), PermissionScope.All);
  addGrant(grants, AppPermission.RegistrationsClientLocationsCreate, hasPermission(permissions, REGISTRATION_PERMISSION.locationsCreate, AppPermission.RegistrationsClientLocationsCreate), PermissionScope.All);
  addGrant(grants, AppPermission.RegistrationsClientLocationsEdit, hasPermission(permissions, REGISTRATION_PERMISSION.locationsEdit, AppPermission.RegistrationsClientLocationsEdit), PermissionScope.All);
  addGrant(grants, AppPermission.RegistrationsCategoriesRead, hasPermission(permissions, REGISTRATION_PERMISSION.categoriesRead, AppPermission.RegistrationsCategoriesRead), PermissionScope.All);
  addGrant(grants, AppPermission.RegistrationsCategoriesCreate, hasPermission(permissions, REGISTRATION_PERMISSION.categoriesCreate, AppPermission.RegistrationsCategoriesCreate), PermissionScope.All);
  addGrant(grants, AppPermission.RegistrationsCategoriesEdit, hasPermission(permissions, REGISTRATION_PERMISSION.categoriesEdit, AppPermission.RegistrationsCategoriesEdit), PermissionScope.All);
  addGrant(grants, AppPermission.RegistrationsSubcategoriesCreate, hasPermission(permissions, REGISTRATION_PERMISSION.subcategoriesCreate, AppPermission.RegistrationsSubcategoriesCreate), PermissionScope.All);
  addGrant(grants, AppPermission.RegistrationsSubcategoriesEdit, hasPermission(permissions, REGISTRATION_PERMISSION.subcategoriesEdit, AppPermission.RegistrationsSubcategoriesEdit), PermissionScope.All);
  addGrant(grants, AppPermission.RegistrationsItemsCreate, hasPermission(permissions, REGISTRATION_PERMISSION.itemsCreate, AppPermission.RegistrationsItemsCreate), PermissionScope.All);
  addGrant(grants, AppPermission.RegistrationsItemsEdit, hasPermission(permissions, REGISTRATION_PERMISSION.itemsEdit, AppPermission.RegistrationsItemsEdit), PermissionScope.All);
  addGrant(grants, AppPermission.RegistrationsFinanceRead, hasPermission(permissions, REGISTRATION_PERMISSION.financeRead, AppPermission.RegistrationsFinanceRead), PermissionScope.All);
  addGrant(grants, AppPermission.RegistrationsFinanceManage, hasPermission(permissions, REGISTRATION_PERMISSION.financeManage, AppPermission.RegistrationsFinanceManage), PermissionScope.All);

  const operationalScope = permissions.has(TICKET_PERMISSION.manageOthers)
    ? PermissionScope.All
    : PermissionScope.Own;

  addGrant(grants, AppPermission.TicketsRead, permissions.has(TICKET_PERMISSION.read), PermissionScope.All);
  addGrant(grants, AppPermission.TicketsCreate, permissions.has(TICKET_PERMISSION.create), PermissionScope.All);
  addGrant(grants, AppPermission.TicketsEdit, permissions.has(TICKET_PERMISSION.edit), operationalScope);
  addGrant(grants, AppPermission.TicketsClassify, permissions.has(TICKET_PERMISSION.edit), operationalScope);
  addGrant(grants, AppPermission.TicketsExecute, permissions.has(TICKET_PERMISSION.execute), operationalScope);
  addGrant(grants, AppPermission.TicketsClose, permissions.has(TICKET_PERMISSION.execute), operationalScope);
  addGrant(grants, AppPermission.TicketsHold, permissions.has(TICKET_PERMISSION.hold), operationalScope);
  addGrant(grants, AppPermission.TicketsReject, permissions.has(TICKET_PERMISSION.reject), operationalScope);
  addGrant(
    grants,
    AppPermission.TicketsAudit,
    permissions.has(TICKET_PERMISSION.audit) ||
      permissions.has(TICKET_PERMISSION.manageOthers),
    PermissionScope.All,
  );
  addGrant(grants, AppPermission.TicketsRadio, permissions.has(TICKET_PERMISSION.radio), PermissionScope.All);
  addGrant(grants, AppPermission.TicketsDevOpsRead, permissions.has(TICKET_TYPE_PERMISSION.devOpsRead), PermissionScope.All);
  addGrant(grants, AppPermission.TicketsDevOpsCreate, permissions.has(TICKET_TYPE_PERMISSION.devOpsCreate), PermissionScope.All);
  addGrant(grants, AppPermission.TicketsMarketingRead, permissions.has(TICKET_TYPE_PERMISSION.marketingRead), PermissionScope.All);
  addGrant(grants, AppPermission.TicketsMarketingCreate, permissions.has(TICKET_TYPE_PERMISSION.marketingCreate), PermissionScope.All);

  addGrant(
    grants,
    AppPermission.LogisticsVehicleAgendaRead,
    permissions.has(LOGISTICS_PERMISSION.vehicleAgendaRead) ||
      permissions.has(LOGISTICS_PERMISSION.vehicleAgendaManage),
    PermissionScope.All,
  );
  addGrant(grants, AppPermission.LogisticsVehicleAgendaManage, permissions.has(LOGISTICS_PERMISSION.vehicleAgendaManage), PermissionScope.All);
  addGrant(grants, AppPermission.LogisticsExpensesRead, permissions.has(LOGISTICS_PERMISSION.expensesRead), PermissionScope.Own);
  addGrant(grants, AppPermission.LogisticsExpensesManage, permissions.has(LOGISTICS_PERMISSION.expensesManage), PermissionScope.Own);
  addGrant(grants, AppPermission.LogisticsExpensesAdminRead, permissions.has(LOGISTICS_PERMISSION.expensesAdminRead), PermissionScope.All);
  addGrant(grants, AppPermission.LogisticsExpensesAdminManage, permissions.has(LOGISTICS_PERMISSION.expensesAdminManage), PermissionScope.All);
  addGrant(grants, AppPermission.LogisticsExpensesApprove, permissions.has(LOGISTICS_PERMISSION.expensesApprove), PermissionScope.All);
  addGrant(grants, AppPermission.LogisticsExpensesPay, permissions.has(LOGISTICS_PERMISSION.expensesPay), PermissionScope.All);
  addGrant(grants, AppPermission.LogisticsStatementsRead, permissions.has(LOGISTICS_PERMISSION.statementsRead), PermissionScope.All);

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
