import type { PermissionGrant } from './permission-grant';
import type { Sector } from './sector';
import type { UserRole } from './user-role';

export interface UserRoleAssignment {
  role: UserRole;
  sectors: Sector[];
}

export interface CurrentUserResponse {
  id: number;
  name: string;
  login: string;
  functionId: number | null;
  roleAssignments: UserRoleAssignment[];
  grants: PermissionGrant[];
}
