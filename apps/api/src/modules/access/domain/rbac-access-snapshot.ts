export interface RbacAccessSnapshot {
  active: boolean;
  roleSlugs: readonly string[];
  permissionSlugs: ReadonlySet<string>;
  onCallAreas: readonly ('ti' | 'devops')[];
}
