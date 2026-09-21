export type FinanceViewKey =
  | 'receivables-accrual'
  | 'receivables-cashflow'
  | 'payables'
  | 'entries'
  | 'recurring'
  | 'accounting'
  | 'statements';

export type FinanceRowKind =
  | 'receivable'
  | 'receipt'
  | 'payable'
  | 'recurring'
  | 'ledger';

export interface FinanceRow {
  id: string;
  sourceId: number | null;
  kind: FinanceRowKind;
  date: string | null;
  dueDate: string | null;
  party: string;
  description: string;
  amount: number;
  balance: number | null;
  status: string;
  unit: string | null;
  group: string | null;
  subgroup: string | null;
  classification: string | null;
  documentType: string | null;
  agency: string | null;
  observation: string | null;
  recurring: boolean;
  active: boolean | null;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface FinanceSummary {
  inflow: number;
  outflow: number;
  balance: number;
  openReceivables: number;
  openPayables: number;
  count: number;
}

export interface FinanceListResponse {
  view: FinanceViewKey;
  period: { startDate: string; endDate: string };
  canManage: boolean;
  summary: FinanceSummary;
  rows: FinanceRow[];
}

export interface FinanceCatalogOption {
  id: number;
  name: string;
  parentId?: number | null;
}

export interface FinanceCatalogsResponse {
  clients: FinanceCatalogOption[];
  units: FinanceCatalogOption[];
  groups: FinanceCatalogOption[];
  subgroups: FinanceCatalogOption[];
  classifications: FinanceCatalogOption[];
  documentTypes: FinanceCatalogOption[];
  agencies: FinanceCatalogOption[];
}

export interface FinanceReceivableWriteInput {
  clientId: number;
  description: string;
  amount: number;
  dueDate: string;
  unitId: number;
  groupId: number;
  subgroupId: number;
  classificationId: number;
  documentTypeId?: number | null;
  percentTi?: number;
  percentDevops?: number;
  percentMarketing?: number;
}

export interface FinancePayableWriteInput {
  description: string;
  supplier?: string;
  amount: number;
  dueDate: string;
  unitId: number;
  groupId: number;
  subgroupId: number;
  classificationId: number;
  documentTypeId?: number | null;
}

export interface FinanceReceiptInput {
  amount: number;
  date: string;
  agencyId: number;
  observation?: string;
}

export interface FinancePaymentInput {
  date: string;
  agencyId: number;
  observation?: string;
}

export interface FinanceRecurringWriteInput {
  type: 'Receber' | 'Pagar';
  clientId?: number | null;
  supplier?: string | null;
  description: string;
  amount: number;
  dueDay: number;
  unitId: number;
  groupId: number;
  subgroupId: number;
  classificationId: number;
  documentTypeId?: number | null;
  percentTi?: number;
  percentDevops?: number;
  percentMarketing?: number;
  active: boolean;
}
