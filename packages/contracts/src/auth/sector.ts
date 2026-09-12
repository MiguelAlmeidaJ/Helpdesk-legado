export enum Sector {
  IT = 'it',
  DevOps = 'devops',
  Marketing = 'marketing',
  Commercial = 'commercial',
  Cyber = 'cyber',
}

export const SECTOR_LABELS: Record<Sector, string> = {
  [Sector.IT]: 'TI',
  [Sector.DevOps]: 'DevOps',
  [Sector.Marketing]: 'Marketing',
  [Sector.Commercial]: 'Comercial',
  [Sector.Cyber]: 'Cyber',
};
