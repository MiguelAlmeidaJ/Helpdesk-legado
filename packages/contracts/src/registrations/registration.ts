export type RegistrationResourceKey =
  | 'clients'
  | 'categories'
  | 'cost-centers'
  | 'accounting-classifications'
  | 'adjustment-indexes'
  | 'payment-methods'
  | 'expense-types'
  | 'service-types'
  | 'fee-types';

export type RegistrationFieldType =
  | 'text'
  | 'email'
  | 'select'
  | 'boolean';

export interface RegistrationFieldOption {
  value: string | number;
  label: string;
}

export interface RegistrationFieldDefinition {
  key: string;
  label: string;
  type: RegistrationFieldType;
  required?: boolean;
  maxLength?: number;
  placeholder?: string;
  options?: RegistrationFieldOption[];
  optionSource?: 'accounting-classifications';
}

export interface RegistrationResourceDefinition {
  key: RegistrationResourceKey;
  title: string;
  subtitle: string;
  singular: string;
  fields: RegistrationFieldDefinition[];
}

export interface RegistrationRecord {
  id: number;
  status: 0 | 1;
  values: Record<string, string | number | boolean | null>;
}

export interface RegistrationListResponse {
  definition: RegistrationResourceDefinition;
  items: RegistrationRecord[];
  canCreate: boolean;
  canEdit: boolean;
}

export interface RegistrationWriteInput {
  status: 0 | 1;
  values: Record<string, string | number | boolean | null>;
}
