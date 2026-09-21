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

export interface ClientContactRecord {
  id: number;
  name: string;
  role: string;
  email: string;
  phone: string;
  status: 0 | 1;
}

export interface ClientLocationRecord {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
  status: 0 | 1;
}

export interface ClientRelationsResponse {
  contacts: ClientContactRecord[];
  locations: ClientLocationRecord[];
  canCreateContacts: boolean;
  canEditContacts: boolean;
  canCreateLocations: boolean;
  canEditLocations: boolean;
}

export interface ClientContactWriteInput {
  name: string;
  role: string;
  email: string;
  phone: string;
  status: 0 | 1;
}

export interface ClientLocationWriteInput {
  name: string;
  address: string;
  city: string;
  state: string;
  status: 0 | 1;
}

export interface CategoryItemRecord {
  id: number;
  name: string;
  status: 0 | 1;
}

export interface CategorySubcategoryRecord {
  id: number;
  name: string;
  status: 0 | 1;
  items: CategoryItemRecord[];
}

export interface CategoryTreeResponse {
  subcategories: CategorySubcategoryRecord[];
  canCreateSubcategories: boolean;
  canEditSubcategories: boolean;
  canCreateItems: boolean;
  canEditItems: boolean;
}

export interface CategoryChildWriteInput {
  name: string;
  status: 0 | 1;
}
