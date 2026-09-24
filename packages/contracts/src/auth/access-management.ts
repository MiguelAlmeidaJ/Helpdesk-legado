export interface AccessPermissionItem {
  id: number;
  name: string;
  slug: string;
  module: string;
  description: string | null;
}

export interface AccessRoleOption {
  id: number;
  name: string;
  slug: string;
  system: boolean;
}

export interface AccessRole extends AccessRoleOption {
  description: string | null;
  permissionIds: number[];
  userCount: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface AccessManagementSnapshot {
  permissions: AccessPermissionItem[];
  roles: AccessRole[];
}

export interface AccessRoleInput {
  name: string;
  description?: string | null;
  permissionIds: number[];
}

export interface AccessRoleMutationResponse {
  id: number;
}

export interface AccessRoleOrderInput {
  roleIds: number[];
}
