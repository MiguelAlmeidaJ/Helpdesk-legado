import type {
  AccessSource,
  PermissionGrant,
  UserRoleAssignment,
} from '@helpdesk/contracts';

export interface AuthenticatedUser {
  id: number;
  name: string;
  login: string;
  functionId: number | null;
  accessSource: AccessSource;
  roleAssignments: readonly UserRoleAssignment[];
  grants: readonly PermissionGrant[];
}
