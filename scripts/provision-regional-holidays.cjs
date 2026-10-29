// Schema only; no holiday records are inserted, updated or removed.
const fs = require('node:fs');
const path = require('node:path');
async function provision(db) {
  return db.$transaction(async tx => {
    await tx.$executeRawUnsafe(fs.readFileSync(path.join(__dirname, 'sqlserver/business-regional-holidays.sql'), 'utf8'));
    // Restore the migrated IDENTITY counter only when it is behind existing IDs.
    await tx.$executeRawUnsafe(`DECLARE @max_id bigint, @identity bigint;
      SELECT @max_id = COALESCE(MAX(id), 0) FROM dbo.business_holidays WITH (TABLOCKX, HOLDLOCK);
      SELECT @identity = CONVERT(bigint, IDENT_CURRENT('dbo.business_holidays'));
      IF @identity < @max_id
      BEGIN
        DECLARE @command nvarchar(200) = N'DBCC CHECKIDENT (''dbo.business_holidays'', RESEED, ' + CONVERT(nvarchar(30), @max_id) + N') WITH NO_INFOMSGS';
        EXEC sp_executesql @command;
      END;`);
  }, { timeout: 30000 });
}
module.exports = { provision };
if (require.main === module) {
  process.loadEnvFile(path.resolve(__dirname, '../.env'));
  const { createNivel3Client } = require('../packages/database/dist');
  const db = createNivel3Client();
  provision(db).then(() => console.log('Calendário regional preparado; registros existentes preservados.'))
    .catch(() => { console.error('Falha ao preparar calendário regional. Transação revertida.'); process.exitCode = 1; })
    .finally(() => db.$disconnect());
}
