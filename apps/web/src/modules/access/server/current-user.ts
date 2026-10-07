import {
  AppPermission,
  type CurrentUserResponse,
} from '@helpdesk/contracts';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const DEFAULT_INTERNAL_API_URL = 'http://127.0.0.1:4004/api';

type RoutePolicy = {
  prefix: string;
  anyPermissions?: AppPermission[];
  systemAdminOnly?: boolean;
};

const ROUTE_POLICIES: readonly RoutePolicy[] = [
  // Administração é exclusiva do Administrador global.
  { prefix: '/administracao', systemAdminOnly: true },

  // Atendimento.
  {
    prefix: '/atendimentos/recorrencias',
    anyPermissions: [AppPermission.TicketsRecurrenceCreate],
  },
  {
    prefix: '/atendimentos/linha-do-tempo',
    anyPermissions: [AppPermission.TicketsTimelineRead],
  },
  {
    prefix: '/atendimentos/disponibilidade',
    anyPermissions: [AppPermission.TicketsRead],
  },
  {
    prefix: '/atendimentos/devops/projetos/novo',
    anyPermissions: [AppPermission.DevOpsProjectsCreate],
  },
  {
    prefix: '/atendimentos/devops/fluxos',
    anyPermissions: [
      AppPermission.DevOpsProjectsRead,
      AppPermission.DevOpsProjectsEdit,
    ],
  },
  {
    prefix: '/atendimentos/devops/projetos',
    anyPermissions: [
      AppPermission.DevOpsProjectsRead,
      AppPermission.DevOpsProjectsEdit,
    ],
  },
  {
    prefix: '/atendimentos/devops/nova-tarefa',
    anyPermissions: [AppPermission.DevOpsTasksCreate],
  },
  {
    prefix: '/atendimentos/devops',
    anyPermissions: [
      AppPermission.DevOpsTasksRead,
      AppPermission.DevOpsTasksEdit,
    ],
  },
  {
    prefix: '/atendimentos/marketing/nova-tarefa',
    anyPermissions: [AppPermission.MarketingTasksCreate],
  },
  {
    prefix: '/atendimentos/marketing',
    anyPermissions: [
      AppPermission.MarketingTasksRead,
      AppPermission.MarketingTasksEdit,
      AppPermission.MarketingTasksHold,
      AppPermission.MarketingTasksClose,
    ],
  },
  {
    prefix: '/atendimentos/novo',
    anyPermissions: [AppPermission.TicketsCreate],
  },
  {
    prefix: '/atendimentos',
    anyPermissions: [AppPermission.TicketsRead],
  },

  // Logística.
  {
    prefix: '/logistica/veiculos/agenda',
    anyPermissions: [AppPermission.LogisticsVehicleAgendaManage],
  },
  {
    prefix: '/logistica/despesas/administracao/aprovacoes',
    anyPermissions: [AppPermission.LogisticsExpensesApprove],
  },
  {
    prefix: '/logistica/despesas/administracao/pagamentos',
    anyPermissions: [AppPermission.LogisticsExpensesPay],
  },
  {
    prefix: '/logistica/despesas/administracao',
    anyPermissions: [
      AppPermission.LogisticsExpensesAdminRead,
      AppPermission.LogisticsExpensesAdminManage,
    ],
  },
  {
    prefix: '/logistica/despesas',
    anyPermissions: [
      AppPermission.LogisticsExpensesRead,
      AppPermission.LogisticsExpensesManage,
    ],
  },

  // Financeiro.
  {
    prefix: '/logistica/financeiro/cadastros',
    anyPermissions: [AppPermission.FinanceManage],
  },
  {
    prefix: '/logistica/financeiro',
    anyPermissions: [AppPermission.FinanceRead, AppPermission.FinanceManage],
  },
  {
    prefix: '/extratos',
    anyPermissions: [AppPermission.FinanceRead, AppPermission.FinanceManage],
  },
  {
    prefix: '/cadastros/formas-de-pagamento',
    anyPermissions: [AppPermission.FinanceRead, AppPermission.FinanceManage],
  },

  // Qualidade.
  {
    prefix: '/qualidade/plantao',
    anyPermissions: [
      AppPermission.QualityOnCallRead,
      AppPermission.QualityOnCallManage,
    ],
  },
  {
    prefix: '/qualidade/datas-comemorativas',
    anyPermissions: [
      AppPermission.QualityDatesRead,
      AppPermission.QualityDatesManage,
    ],
  },

  // Relatórios.
  {
    prefix: '/relatorios/arquivos',
    anyPermissions: [AppPermission.ReportsPdf],
  },
  {
    prefix: '/relatorios',
    anyPermissions: [AppPermission.ReportsRead],
  },

  // Cadastros.
  {
    prefix: '/usuarios',
    anyPermissions: [
      AppPermission.UsersRead,
      AppPermission.UsersCreate,
      AppPermission.UsersEdit,
    ],
  },
  {
    prefix: '/cadastros/clientes',
    anyPermissions: [
      AppPermission.RegistrationsClientsRead,
      AppPermission.RegistrationsClientsCreate,
      AppPermission.RegistrationsClientsEdit,
    ],
  },
  {
    prefix: '/cadastros/categorias',
    anyPermissions: [
      AppPermission.RegistrationsCategoriesRead,
      AppPermission.RegistrationsCategoriesCreate,
      AppPermission.RegistrationsCategoriesEdit,
    ],
  },
  {
    prefix: '/catalogos',
    anyPermissions: [
      AppPermission.CatalogTiRead,
      AppPermission.CatalogTiCreate,
      AppPermission.CatalogTiEdit,
      AppPermission.CatalogDevOpsRead,
      AppPermission.CatalogDevOpsCreate,
      AppPermission.CatalogDevOpsEdit,
    ],
  },
];

function internalApiUrl(): string {
  return (
    process.env.API_INTERNAL_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    DEFAULT_INTERNAL_API_URL
  ).replace(/\/$/, '');
}

function cookieHeader(
  values: Awaited<ReturnType<typeof cookies>>,
): string {
  return values
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join('; ');
}

function hasPermission(
  user: CurrentUserResponse,
  permission: AppPermission,
): boolean {
  return user.grants.some(
    (grant) =>
      grant.permission === AppPermission.SystemAdmin ||
      grant.permission === permission,
  );
}

function isSystemAdmin(user: CurrentUserResponse): boolean {
  return user.grants.some(
    (grant) => grant.permission === AppPermission.SystemAdmin,
  );
}

function routePolicy(returnTo: string): RoutePolicy | undefined {
  const pathname = returnTo.split(/[?#]/, 1)[0] ?? returnTo;
  return ROUTE_POLICIES.find(
    (policy) =>
      pathname === policy.prefix ||
      pathname.startsWith(`${policy.prefix}/`),
  );
}

function isAuthorized(
  user: CurrentUserResponse,
  returnTo: string,
): boolean {
  const policy = routePolicy(returnTo);
  if (!policy) return true;

  if (policy.systemAdminOnly) {
    return isSystemAdmin(user);
  }

  if (!policy.anyPermissions?.length) {
    return true;
  }

  return policy.anyPermissions.some((permission) =>
    hasPermission(user, permission),
  );
}

export async function getCurrentUser(): Promise<CurrentUserResponse | null> {
  const cookieStore = await cookies();
  const response = await fetch(`${internalApiUrl()}/auth/me`, {
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      Cookie: cookieHeader(cookieStore),
    },
  });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new Error(
      `Não foi possível validar a sessão na API (${response.status}).`,
    );
  }

  return response.json() as Promise<CurrentUserResponse>;
}

export async function requireAuthenticatedUser(
  returnTo: string,
): Promise<CurrentUserResponse> {
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  }

  if (!isAuthorized(user, returnTo)) {
    redirect('/painel');
  }

  return user;
}
