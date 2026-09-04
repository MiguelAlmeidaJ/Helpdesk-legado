export enum AppPermission {
  SystemAdmin = 'system.admin',

  TicketsRead = 'tickets.read',
  TicketsCreate = 'tickets.create',
  TicketsEdit = 'tickets.edit',
  TicketsClassify = 'tickets.classify',
  TicketsExecute = 'tickets.execute',
  TicketsHold = 'tickets.hold',
  TicketsReject = 'tickets.reject',
  TicketsClose = 'tickets.close',
  TicketsAudit = 'tickets.audit',
  TicketsRadio = 'tickets.radio',

  UsersRead = 'users.read',
  UsersCreate = 'users.create',
  UsersEdit = 'users.edit',
  UsersManageAccess = 'users.manage-access',

  LogisticsVehicleAgendaRead = 'logistics.vehicle-agenda.read',
  LogisticsVehicleAgendaManage = 'logistics.vehicle-agenda.manage',
  LogisticsExpensesRead = 'logistics.expenses.read',
  LogisticsExpensesManage = 'logistics.expenses.manage',
  LogisticsExpensesAdminRead = 'logistics.expenses.admin.read',
  LogisticsExpensesAdminManage = 'logistics.expenses.admin.manage',
  LogisticsExpensesApprove = 'logistics.expenses.approve',
  LogisticsExpensesPay = 'logistics.expenses.pay',

  FinanceRead = 'finance.read',
  FinanceManage = 'finance.manage',

  CommercialRead = 'commercial.read',
  CommercialManage = 'commercial.manage',
}
