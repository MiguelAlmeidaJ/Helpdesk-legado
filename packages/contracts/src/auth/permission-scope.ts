export enum PermissionScope {
  Own = 'own',
  Sector = 'sector',
  All = 'all',
}

export const PERMISSION_SCOPE_LABELS: Record<PermissionScope, string> = {
  [PermissionScope.Own]: 'Próprio',
  [PermissionScope.Sector]: 'Setor',
  [PermissionScope.All]: 'Todos',
};
