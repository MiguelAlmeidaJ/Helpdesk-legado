export enum UserRole {
  SystemAdministrator = 'system_administrator',
  Administration = 'administration',
  SectorManager = 'sector_manager',
  Quality = 'quality',
  Technician = 'technician',
  Intern = 'intern',
}

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.SystemAdministrator]: 'Administrador do sistema',
  [UserRole.Administration]: 'Administração',
  [UserRole.SectorManager]: 'Gerente de setor',
  [UserRole.Quality]: 'Qualidade',
  [UserRole.Technician]: 'Técnico',
  [UserRole.Intern]: 'Estagiário',
};
