import {
  AppPermission,
  PermissionScope,
  type PermissionGrant,
} from '@helpdesk/contracts';
import type { AuthenticatedUser } from '../domain/authenticated-user';
import type { LegacyUserSession } from '../domain/legacy-user-session';
import type { RbacAccessSnapshot } from '../domain/rbac-access-snapshot';

const P = {
  usersRead: 'usuarios.visualizar',
  usersCreate: 'usuarios.criar',
  usersEdit: 'usuarios.editar',
  usersManageAccess: 'usuarios.editar_acesso',
  usersAssignRole: 'usuarios.atribuir_tipo',
  usersManageOverrides: 'usuarios.permissoes_usuario',

  ticketsRead: 'atendimentos.visualizar',
  ticketsCreate: 'atendimentos.criar',
  ticketsEdit: 'atendimentos.editar',
  ticketsHold: 'atendimentos.colocar_espera',
  ticketsClose: 'atendimentos.finalizar',
  ticketsRecurrence: 'atendimentos.recorrencia.criar',
  ticketsTimeline: 'atendimentos.timeline.visualizar',

  devOpsProjectsRead: 'devops.projetos.visualizar',
  devOpsProjectsCreate: 'devops.projetos.criar',
  devOpsProjectsEdit: 'devops.projetos.editar',
  devOpsTasksRead: 'devops.tarefas.visualizar',
  devOpsTasksCreate: 'devops.tarefas.criar',
  devOpsTasksEdit: 'devops.tarefas.editar',

  marketingRead: 'marketing.tarefas.visualizar',
  marketingCreate: 'marketing.tarefas.criar',
  marketingEdit: 'marketing.tarefas.editar',
  marketingHold: 'marketing.tarefas.colocar_espera',
  marketingClose: 'marketing.tarefas.finalizar',

  vehicleSchedule: 'logistica.agenda.agendar',
  rdRead: 'logistica.rd.visualizar',
  rdCreate: 'logistica.rd.criar',
  rdManage: 'logistica.rd.gestao',

  financeRead: 'financeiro.visualizar',
  financeEdit: 'financeiro.editar',

  reportsRead: 'relatorios.visualizar',
  reportsPdf: 'relatorios.gerar_pdf',

  clientsRead: 'cadastros.clientes.visualizar',
  clientsCreate: 'cadastros.clientes.criar',
  clientsEdit: 'cadastros.clientes.editar',
  categoriesRead: 'cadastros.categorias.visualizar',
  categoriesCreate: 'cadastros.categorias.criar',
  categoriesEdit: 'cadastros.categorias.editar',

  catalogTiRead: 'catalogos.ti.visualizar',
  catalogTiCreate: 'catalogos.ti.criar',
  catalogTiEdit: 'catalogos.ti.editar',
  catalogDevOpsRead: 'catalogos.devops.visualizar',
  catalogDevOpsCreate: 'catalogos.devops.criar',
  catalogDevOpsEdit: 'catalogos.devops.editar',

  qualityOnCallRead: 'qualidade.plantao.visualizar',
  qualityOnCallManage: 'qualidade.plantao.gerenciar',
  qualityDatesRead: 'qualidade.datas.visualizar',
  qualityDatesManage: 'qualidade.datas.gerenciar',
} as const;

const SYSTEM_ADMIN_ROLE = 'system-admin';

function addGrant(
  grants: PermissionGrant[],
  permission: AppPermission,
  enabled: boolean,
  scope: PermissionScope = PermissionScope.All,
) {
  if (
    enabled &&
    !grants.some(
      (grant) =>
        grant.permission === permission &&
        grant.scope === scope,
    )
  ) {
    grants.push({ permission, scope });
  }
}

export function translateRbacAccess(
  session: LegacyUserSession,
  snapshot: RbacAccessSnapshot,
): AuthenticatedUser {
  const permissions = snapshot.permissionSlugs;
  const grants: PermissionGrant[] = [];
  const has = (slug: string) => permissions.has(slug);

  addGrant(
    grants,
    AppPermission.SystemAdmin,
    snapshot.roleSlugs.includes(SYSTEM_ADMIN_ROLE),
  );
  addGrant(grants, AppPermission.OnCallTi, snapshot.onCallAreas.includes('ti'));
  addGrant(
    grants,
    AppPermission.OnCallDevOps,
    snapshot.onCallAreas.includes('devops'),
  );

  addGrant(grants, AppPermission.UsersRead, has(P.usersRead));
  addGrant(grants, AppPermission.UsersCreate, has(P.usersCreate));
  addGrant(grants, AppPermission.UsersEdit, has(P.usersEdit));
  addGrant(grants, AppPermission.UsersManageAccess, has(P.usersManageAccess));
  addGrant(grants, AppPermission.UsersAssignRole, has(P.usersAssignRole));
  addGrant(
    grants,
    AppPermission.UsersManageOverrides,
    has(P.usersManageOverrides),
  );

  addGrant(
    grants,
    AppPermission.QualityOnCallRead,
    has(P.qualityOnCallRead) || has(P.qualityOnCallManage),
  );
  addGrant(
    grants,
    AppPermission.QualityOnCallManage,
    has(P.qualityOnCallManage),
  );
  addGrant(
    grants,
    AppPermission.QualityDatesRead,
    has(P.qualityDatesRead) || has(P.qualityDatesManage),
  );
  addGrant(
    grants,
    AppPermission.QualityDatesManage,
    has(P.qualityDatesManage),
  );

  addGrant(grants, AppPermission.RegistrationsClientsRead, has(P.clientsRead));
  addGrant(
    grants,
    AppPermission.RegistrationsClientsCreate,
    has(P.clientsCreate),
  );
  addGrant(grants, AppPermission.RegistrationsClientsEdit, has(P.clientsEdit));
  addGrant(
    grants,
    AppPermission.RegistrationsClientContactsCreate,
    has(P.clientsCreate),
  );
  addGrant(
    grants,
    AppPermission.RegistrationsClientContactsEdit,
    has(P.clientsEdit),
  );
  addGrant(
    grants,
    AppPermission.RegistrationsClientLocationsCreate,
    has(P.clientsCreate),
  );
  addGrant(
    grants,
    AppPermission.RegistrationsClientLocationsEdit,
    has(P.clientsEdit),
  );

  addGrant(
    grants,
    AppPermission.RegistrationsCategoriesRead,
    has(P.categoriesRead),
  );
  addGrant(
    grants,
    AppPermission.RegistrationsCategoriesCreate,
    has(P.categoriesCreate),
  );
  addGrant(
    grants,
    AppPermission.RegistrationsCategoriesEdit,
    has(P.categoriesEdit),
  );
  addGrant(
    grants,
    AppPermission.RegistrationsSubcategoriesCreate,
    has(P.categoriesCreate),
  );
  addGrant(
    grants,
    AppPermission.RegistrationsSubcategoriesEdit,
    has(P.categoriesEdit),
  );
  addGrant(
    grants,
    AppPermission.RegistrationsItemsCreate,
    has(P.categoriesCreate),
  );
  addGrant(
    grants,
    AppPermission.RegistrationsItemsEdit,
    has(P.categoriesEdit),
  );

  addGrant(grants, AppPermission.CatalogTiRead, has(P.catalogTiRead));
  addGrant(grants, AppPermission.CatalogTiCreate, has(P.catalogTiCreate));
  addGrant(grants, AppPermission.CatalogTiEdit, has(P.catalogTiEdit));
  addGrant(grants, AppPermission.CatalogDevOpsRead, has(P.catalogDevOpsRead));
  addGrant(
    grants,
    AppPermission.CatalogDevOpsCreate,
    has(P.catalogDevOpsCreate),
  );
  addGrant(grants, AppPermission.CatalogDevOpsEdit, has(P.catalogDevOpsEdit));

  addGrant(grants, AppPermission.TicketsRead, has(P.ticketsRead));
  addGrant(grants, AppPermission.TicketsCreate, has(P.ticketsCreate));
  addGrant(grants, AppPermission.TicketsEdit, has(P.ticketsEdit));
  addGrant(grants, AppPermission.TicketsClassify, has(P.ticketsEdit));
  addGrant(grants, AppPermission.TicketsHold, has(P.ticketsHold));
  addGrant(grants, AppPermission.TicketsExecute, has(P.ticketsClose));
  addGrant(grants, AppPermission.TicketsClose, has(P.ticketsClose));
  addGrant(
    grants,
    AppPermission.TicketsRecurrenceCreate,
    has(P.ticketsRecurrence),
  );
  addGrant(
    grants,
    AppPermission.TicketsTimelineRead,
    has(P.ticketsTimeline),
  );

  addGrant(
    grants,
    AppPermission.DevOpsProjectsRead,
    has(P.devOpsProjectsRead),
  );
  addGrant(
    grants,
    AppPermission.DevOpsProjectsCreate,
    has(P.devOpsProjectsCreate),
  );
  addGrant(
    grants,
    AppPermission.DevOpsProjectsEdit,
    has(P.devOpsProjectsEdit),
  );
  addGrant(grants, AppPermission.DevOpsTasksRead, has(P.devOpsTasksRead));
  addGrant(grants, AppPermission.DevOpsTasksCreate, has(P.devOpsTasksCreate));
  addGrant(grants, AppPermission.DevOpsTasksEdit, has(P.devOpsTasksEdit));

  addGrant(
    grants,
    AppPermission.TicketsDevOpsRead,
    has(P.devOpsProjectsRead) ||
      has(P.devOpsProjectsCreate) ||
      has(P.devOpsProjectsEdit) ||
      has(P.devOpsTasksRead) ||
      has(P.devOpsTasksCreate) ||
      has(P.devOpsTasksEdit),
  );
  addGrant(
    grants,
    AppPermission.TicketsDevOpsCreate,
    has(P.devOpsProjectsCreate) || has(P.devOpsTasksCreate),
  );

  addGrant(grants, AppPermission.MarketingTasksRead, has(P.marketingRead));
  addGrant(grants, AppPermission.MarketingTasksCreate, has(P.marketingCreate));
  addGrant(grants, AppPermission.MarketingTasksEdit, has(P.marketingEdit));
  addGrant(grants, AppPermission.MarketingTasksHold, has(P.marketingHold));
  addGrant(grants, AppPermission.MarketingTasksClose, has(P.marketingClose));
  addGrant(
    grants,
    AppPermission.TicketsMarketingRead,
    has(P.marketingRead) ||
      has(P.marketingCreate) ||
      has(P.marketingEdit) ||
      has(P.marketingHold) ||
      has(P.marketingClose),
  );
  addGrant(
    grants,
    AppPermission.TicketsMarketingCreate,
    has(P.marketingCreate),
  );

  addGrant(grants, AppPermission.LogisticsVehicleAgendaRead, has(P.vehicleSchedule));
  addGrant(
    grants,
    AppPermission.LogisticsVehicleAgendaManage,
    has(P.vehicleSchedule),
  );
  addGrant(
    grants,
    AppPermission.LogisticsExpensesRead,
    has(P.rdRead) || has(P.rdCreate) || has(P.rdManage),
    has(P.rdManage) ? PermissionScope.All : PermissionScope.Own,
  );
  addGrant(
    grants,
    AppPermission.LogisticsExpensesManage,
    has(P.rdCreate) || has(P.rdManage),
    has(P.rdManage) ? PermissionScope.All : PermissionScope.Own,
  );
  addGrant(
    grants,
    AppPermission.LogisticsExpensesAdminRead,
    has(P.rdManage),
  );
  addGrant(
    grants,
    AppPermission.LogisticsExpensesAdminManage,
    has(P.rdManage),
  );
  addGrant(grants, AppPermission.LogisticsExpensesApprove, has(P.rdManage));
  addGrant(grants, AppPermission.LogisticsExpensesPay, has(P.rdManage));

  addGrant(grants, AppPermission.FinanceRead, has(P.financeRead) || has(P.financeEdit));
  addGrant(grants, AppPermission.FinanceManage, has(P.financeEdit));
  addGrant(
    grants,
    AppPermission.RegistrationsFinanceRead,
    has(P.financeRead) || has(P.financeEdit),
  );
  addGrant(
    grants,
    AppPermission.RegistrationsFinanceManage,
    has(P.financeEdit),
  );
  addGrant(
    grants,
    AppPermission.LogisticsStatementsRead,
    has(P.financeRead) || has(P.financeEdit),
  );

  addGrant(
    grants,
    AppPermission.ReportsRead,
    has(P.reportsRead) || has(P.reportsPdf),
  );
  addGrant(grants, AppPermission.ReportsPdf, has(P.reportsPdf));
  addGrant(
    grants,
    AppPermission.TicketsAudit,
    has(P.reportsRead) || has(P.reportsPdf),
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
