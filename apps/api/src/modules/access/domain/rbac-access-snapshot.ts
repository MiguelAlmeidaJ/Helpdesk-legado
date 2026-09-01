export interface RbacAccessSnapshot {
  active: boolean;
  hasAssignments: boolean;
  roleSlugs: readonly string[];
  permissionSlugs: ReadonlySet<string>;
}
