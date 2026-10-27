// Creates a real copy-only backup of the configured database. Does not restore it.
process.loadEnvFile('.env');
const { createNivel3Client } = require('../packages/database/dist');
const { MaintenanceService } = require('../apps/api/dist/modules/maintenance/application/maintenance.service');
const db = createNivel3Client();
const maintenance = new MaintenanceService(db, {});
(async () => {
  const [database] = await db.$queryRawUnsafe('SELECT DB_NAME() AS name');
  console.log('Creating and verifying native backup:', database.name);
  // Null actor identifies this local administrative validation rather than a web user.
  const result = await maintenance.runManualBackup('nivel3', null);
  const status = await maintenance.status();
  for (const file of result.files) {
    if (!status.backups.some(item => item.name === file.name && item.verifiedAt)) throw new Error('Verified backup missing from status.');
    console.log(JSON.stringify({ connectedDatabase: database.name, directory: status.nativeBackup.directory, ...file }));
  }
})().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => db.$disconnect());
