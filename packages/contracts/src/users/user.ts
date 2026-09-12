import type { PaginationMeta } from '../common/pagination';

export interface UserOption {
  id: number;
  name: string;
}

export interface ManagedUserSummary {
  id: number;
  status: 1 | 2;
  name: string;
  email: string;
  phone: string;
  login: string;
  type: 0 | 1 | 2;
  function: UserOption | null;
  companies: UserOption[];
}

export interface ManagedUserDetail extends ManagedUserSummary {
  link: string;
  pixKeyType: number | null;
  pixKey: string;
  legacyModules: string[];
}

export interface UserManagementCatalogs {
  functions: UserOption[];
  companies: UserOption[];
  pixKeyTypes: UserOption[];
}

export interface ManagedUserListResponse {
  data: ManagedUserSummary[];
  meta: PaginationMeta;
}

export interface CreateManagedUserRequest {
  name: string;
  email: string;
  phone: string;
  functionId: number;
  login: string;
  password: string;
  type: 1 | 2;
  link?: string;
  pixKeyType?: number | null;
  pixKey?: string;
  companyIds?: number[];
  legacyModules?: string[];
}

export interface UpdateManagedUserRequest {
  status: 1 | 2;
  name: string;
  email: string;
  phone: string;
  functionId: number;
  login: string;
  type: 1 | 2;
  link?: string;
  pixKeyType?: number | null;
  pixKey?: string;
  companyIds?: number[];
  legacyModules?: string[];
}
