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

  ticketsRead: 'atendimentos.visualizar',
  ticketsCreate: 'atendimentos.criar',
  ticketsEdit: 'atendimentos.editar',
  ticketsHold: 'atendimentos.colocar_espera',
  ticketsAvailability: 'atendimentos.disponibilidade.visualizar',
  ticketsRecurrenceRead: 'atendimentos.recorrencia.visualizar',
  ticketsRecurrenceCreate: 'atendimentos.recorrencia.criar',
  ticketsTimeline: 'atendimentos.timeline.visualizar',

  devOpsProjectsRead: 'devops.projetos.visualizar',
  devOpsProjectsCreate: 'devops.projetos.criar',
  devOpsTasksRead: 'devops.tarefas.visualizar',
  devOpsTasksCreate: 'devops.tarefas.criar',

  marketingRead: 'marketing.tarefas.visualizar',
  marketingCreate: 'marketing.tarefas.criar',
  marketingClose: 'marketing.tarefas.finalizar',

  vehicleSchedule: 'logistica.agenda.agendar',
  vehicleManage: 'logistica.veiculos.gerenciar',
  rdAccess: 'logistica.rd.acessar',
  rdManage: 'logistica.rd.gestao',

  financeAccess: 'financeiro.acessar',

  reportsAccess: 'relatorios.acessar',

  clientsRead: 'cadastros.clientes.visualizar',
  clientsCreate: 'cadastros.clientes.criar',
  categoriesRead: 'cadastros.categorias.visualizar',
  categoriesCreate: 'cadastros.categorias.criar',

  catalogRead: 'catalogos.visualizar',
  catalogTiCreate: 'catalogos.ti.criar',
  catalogDevOpsCreate: 'catalogos.devops.criar',
  qualityAccess: 'qualidade.acessar',
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
  const isGlobalAdmin = snapshot.roleSlugs.includes(SYSTEM_ADMIN_ROLE);

  addGrant(
    grants,
    AppPermission.SystemAdmin,
    isGlobalAdmin,
  );
  addGrant(grants, AppPermission.OnCallTi, snapshot.onCallAreas.includes('ti'));
  addGrant(
    grants,
    AppPermission.OnCallDevOps,
    snapshot.onCallAreas.includes('devops'),
  );

  addGrant(grants, AppPermission.UsersRead, has(P.usersRead));
  addGrant(grants, AppPermission.UsersCreate, isGlobalAdmin);
  addGrant(grants, AppPermission.UsersEdit, isGlobalAdmin);
  addGrant(
    grants,
    AppPermission.UsersManageOverrides,
    isGlobalAdmin,
  );

  addGrant(
    grants,
    AppPermission.QualityOnCallRead,
    has(P.qualityAccess),
  );
  addGrant(
    grants,
    AppPermission.QualityOnCallManage,
    has(P.qualityAccess),
  );
  addGrant(
    grants,
    AppPermission.QualityDatesRead,
    has(P.qualityAccess),
  );
  addGrant(
    grants,
    AppPermission.QualityDatesManage,
    has(P.qualityAccess),
  );

  addGrant(grants, AppPermission.RegistrationsClientsRead, has(P.clientsRead));
  addGrant(
    grants,
    AppPermission.RegistrationsClientsCreate,
    has(P.clientsCreate),
  );
  addGrant(grants, AppPermission.RegistrationsClientsEdit, has(P.clientsCreate));
  addGrant(
    grants,
    AppPermission.RegistrationsClientContactsCreate,
    has(P.clientsCreate),
  );
  addGrant(
    grants,
    AppPermission.RegistrationsClientContactsEdit,
    has(P.clientsCreate),
  );
  addGrant(
    grants,
    AppPermission.RegistrationsClientLocationsCreate,
    has(P.clientsCreate),
  );
  addGrant(
    grants,
    AppPermission.RegistrationsClientLocationsEdit,
    has(P.clientsCreate),
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
    has(P.categoriesCreate),
  );
  addGrant(
    grants,
    AppPermission.RegistrationsSubcategoriesCreate,
    has(P.categoriesCreate),
  );
  addGrant(
    grants,
    AppPermission.RegistrationsSubcategoriesEdit,
    has(P.categoriesCreate),
  );
  addGrant(
    grants,
    AppPermission.RegistrationsItemsCreate,
    has(P.categoriesCreate),
  );
  addGrant(
    grants,
    AppPermission.RegistrationsItemsEdit,
    has(P.categoriesCreate),
  );

  addGrant(grants, AppPermission.CatalogTiRead, has(P.catalogRead));
  addGrant(grants, AppPermission.CatalogTiCreate, has(P.catalogTiCreate));
  addGrant(grants, AppPermission.CatalogTiEdit, has(P.catalogTiCreate));
  addGrant(grants, AppPermission.CatalogDevOpsRead, has(P.catalogRead));
  addGrant(
    grants,
    AppPermission.CatalogDevOpsCreate,
    has(P.catalogDevOpsCreate),
  );
  addGrant(grants, AppPermission.CatalogDevOpsEdit, has(P.catalogDevOpsCreate));

  addGrant(grants, AppPermission.TicketsRead, has(P.ticketsRead));
  addGrant(grants, AppPermission.TicketsCreate, has(P.ticketsCreate));
  addGrant(grants, AppPermission.TicketsEdit, has(P.ticketsEdit));
  addGrant(grants, AppPermission.TicketsClassify, has(P.ticketsEdit));
  addGrant(grants, AppPermission.TicketsExecute, has(P.ticketsEdit));
  addGrant(grants, AppPermission.TicketsReject, has(P.ticketsEdit));
  addGrant(grants, AppPermission.TicketsClose, has(P.ticketsEdit));
  addGrant(grants, AppPermission.TicketsHold, has(P.ticketsHold));
  addGrant(grants, AppPermission.TicketsRadio, has(P.ticketsAvailability));
  addGrant(
    grants,
    AppPermission.TicketsRecurrenceRead,
    has(P.ticketsRecurrenceRead) || has(P.ticketsRecurrenceCreate),
  );
  addGrant(
    grants,
    AppPermission.TicketsRecurrenceCreate,
    has(P.ticketsRecurrenceCreate),
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
    has(P.devOpsProjectsCreate),
  );
  addGrant(grants, AppPermission.DevOpsTasksRead, has(P.devOpsTasksRead));
  addGrant(grants, AppPermission.DevOpsTasksCreate, has(P.devOpsTasksCreate));
  addGrant(grants, AppPermission.DevOpsTasksEdit, has(P.devOpsTasksCreate));

  addGrant(
    grants,
    AppPermission.TicketsDevOpsRead,
    has(P.devOpsProjectsRead) ||
      has(P.devOpsProjectsCreate) ||
      has(P.devOpsTasksRead) ||
      has(P.devOpsTasksCreate) ||
      has(P.devOpsProjectsCreate),
  );
  addGrant(
    grants,
    AppPermission.TicketsDevOpsCreate,
    has(P.devOpsProjectsCreate) || has(P.devOpsTasksCreate),
  );

  addGrant(grants, AppPermission.MarketingTasksRead, has(P.marketingRead));
  addGrant(grants, AppPermission.MarketingTasksCreate, has(P.marketingCreate));
  addGrant(grants, AppPermission.MarketingTasksEdit, has(P.marketingCreate));
  addGrant(grants, AppPermission.MarketingTasksClose, has(P.marketingClose));
  addGrant(
    grants,
    AppPermission.TicketsMarketingRead,
    has(P.marketingRead) ||
      has(P.marketingCreate) ||
      has(P.marketingClose),
  );
  addGrant(
    grants,
    AppPermission.TicketsMarketingCreate,
    has(P.marketingCreate),
  );

  addGrant(grants, AppPermission.LogisticsVehicleAgendaRead, has(P.vehicleSchedule) || has(P.vehicleManage));
  addGrant(
    grants,
    AppPermission.LogisticsVehicleAgendaManage,
    has(P.vehicleManage),
  );
  addGrant(
    grants,
    AppPermission.LogisticsExpensesRead,
    has(P.rdAccess) || has(P.rdManage),
    has(P.rdManage) ? PermissionScope.All : PermissionScope.Own,
  );
  addGrant(
    grants,
    AppPermission.LogisticsExpensesManage,
    has(P.rdAccess) || has(P.rdManage),
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

  addGrant(grants, AppPermission.FinanceRead, has(P.financeAccess));
  addGrant(grants, AppPermission.FinanceManage, has(P.financeAccess));
  addGrant(
    grants,
    AppPermission.RegistrationsFinanceRead,
    has(P.financeAccess),
  );
  addGrant(
    grants,
    AppPermission.RegistrationsFinanceManage,
    has(P.financeAccess),
  );
  addGrant(
    grants,
    AppPermission.LogisticsStatementsRead,
    has(P.financeAccess),
  );

  addGrant(
    grants,
    AppPermission.ReportsRead,
    has(P.reportsAccess),
  );
  addGrant(grants, AppPermission.ReportsPdf, has(P.reportsAccess));
  addGrant(
    grants,
    AppPermission.TicketsAudit,
    has(P.reportsAccess),
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
