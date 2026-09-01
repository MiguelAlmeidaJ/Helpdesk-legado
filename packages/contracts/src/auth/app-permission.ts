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
  UsersManage = 'users.manage',

  FinanceRead = 'finance.read',
  FinanceManage = 'finance.manage',

  CommercialRead = 'commercial.read',
  CommercialManage = 'commercial.manage',
}
