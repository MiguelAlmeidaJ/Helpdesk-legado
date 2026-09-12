import type { AppPermission } from './app-permission';
import type { PermissionScope } from './permission-scope';
import type { Sector } from './sector';

export interface PermissionGrant {
  permission: AppPermission;
  scope: PermissionScope;
  sectors?: Sector[];
}
