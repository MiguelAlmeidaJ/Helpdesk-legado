import type { PaginationMeta } from '../common/pagination';
import type { AccessPermissionItem } from '../auth/access-management';

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
  extraPermissionIds: number[];
}

export interface ManagedUserDetail extends ManagedUserSummary {
  link: string;
  pixKeyType: number | null;
  pixKey: string;
  observation: string;
}

export interface UserManagementCatalogs {
  functions: UserOption[];
  functionPermissionIds: Record<number, number[]>;
  companies: UserOption[];
  pixKeyTypes: UserOption[];
  permissions: AccessPermissionItem[];
}

export interface ManagedUserListFilters {
  search?: string;
  status?: 1 | 2 | null;
  functionId?: number | null;
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
  observation?: string;
  companyIds?: number[];
  extraPermissionIds?: number[];
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
  observation?: string;
  companyIds?: number[];
  extraPermissionIds?: number[];
}

export interface UserFunctionSummary {
  id: number;
  name: string;
  status: 1 | 2;
  activeUserCount: number;
  linkedUserCount: number;
  permissionIds: number[];
}

export interface UserFunctionActiveMember {
  id: number;
  name: string;
  login: string;
  functionId: number | null;
}

export interface UserFunctionActiveMembersResponse {
  users: UserFunctionActiveMember[];
  activeUserCount: number;
  assignedActiveUserCount: number;
  unassignedActiveUserCount: number;
}

export interface UserFunctionInput {
  name: string;
  status: 1 | 2;
  permissionIds: number[];
}

export interface UserFunctionMutationResponse {
  id: number;
}
