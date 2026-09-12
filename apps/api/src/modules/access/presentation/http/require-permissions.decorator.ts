import { SetMetadata } from '@nestjs/common';
import type { AppPermission } from '@helpdesk/contracts';

export const REQUIRED_PERMISSIONS_KEY = 'required_permissions';

export const RequirePermissions = (...permissions: AppPermission[]) =>
  SetMetadata(REQUIRED_PERMISSIONS_KEY, permissions);
