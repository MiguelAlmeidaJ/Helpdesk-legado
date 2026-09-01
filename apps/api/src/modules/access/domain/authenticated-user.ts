import type {
  PermissionGrant,
  UserRoleAssignment,
} from '@helpdesk/contracts';

export interface AuthenticatedUser {
  id: number;
  name: string;
  login: string;
  functionId: number | null;
  roleAssignments: readonly UserRoleAssignment[];
  grants: readonly PermissionGrant[];
}
