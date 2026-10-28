// Explicit, idempotent provisioning. Preserves existing global access; grants no new administrators.
const path = require('node:path');
process.loadEnvFile(path.resolve(__dirname, '../.env'));
const { createNivel3Client } = require('../packages/database/dist');

async function provision(db) {
  return db.$transaction(async tx => {
    await tx.$executeRawUnsafe("IF COL_LENGTH('dbo.cargos_n3', 'is_global_admin') IS NULL ALTER TABLE dbo.cargos_n3 ADD is_global_admin bit NOT NULL CONSTRAINT DF_cargos_global_admin DEFAULT (0)");
    await tx.$executeRawUnsafe("IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.cargos_n3') AND name='UX_cargos_global_admin') CREATE UNIQUE INDEX UX_cargos_global_admin ON dbo.cargos_n3(is_global_admin) WHERE is_global_admin=1");
    const roles = await tx.$queryRawUnsafe("SELECT id FROM dbo.roles WITH (UPDLOCK,HOLDLOCK) WHERE slug='system-admin'");
    if (!roles.length) throw new Error('Configure um administrador global existente antes de provisionar a função.');
    const admins = await tx.$queryRawUnsafe("SELECT u.user_id FROM dbo.usuarios u JOIN dbo.user_roles ur ON ur.user_id=u.user_id WHERE ur.role_id=@P1 AND u.user_sts=1", Number(roles[0].id));
    if (!admins.length) throw new Error('Nenhum administrador global ativo. Operação cancelada para evitar bloqueio do acesso.');
    let functions = await tx.$queryRawUnsafe('SELECT cargo_id FROM dbo.cargos_n3 WITH (UPDLOCK,HOLDLOCK) WHERE is_global_admin=1');
    if (!functions.length) {
      const collisions = await tx.$queryRawUnsafe("SELECT cargo_id FROM dbo.cargos_n3 WHERE LOWER(TRIM(cargo_nome))=N'administrador global'");
      if (collisions.length) throw new Error('Já existe uma função com esse nome. Revise seus vínculos antes de conceder acesso global.');
      functions = await tx.$queryRawUnsafe("INSERT INTO dbo.cargos_n3(cargo_nome,cargo_sts,is_global_admin) OUTPUT INSERTED.cargo_id VALUES(N'Administrador global',1,1)");
    }
    const id = Number(functions[0].cargo_id);
    await tx.$executeRawUnsafe("UPDATE dbo.roles SET name=N'Administrador global',is_system=1,updated_at=GETDATE() WHERE id=@P1", Number(roles[0].id));
    // Only users already holding system-admin are reassigned. All other functions and users remain intact.
    const assigned = await tx.$executeRawUnsafe(
      `UPDATE u SET user_funcao=@P1 FROM dbo.usuarios u
       JOIN dbo.user_roles ur ON ur.user_id=u.user_id AND ur.role_id=@P2
       WHERE u.user_funcao IS NULL OR u.user_funcao<>@P1`, id, Number(roles[0].id),
    );
    return { functionId: id, existingActiveAdministrators: admins.length, reassignedExistingAdministrators: assigned };
  }, { timeout: 30000 });
}

module.exports = { provision };
if (require.main === module) {
  const db = createNivel3Client();
  provision(db).then(result => console.log(JSON.stringify(result)))
    .catch(() => { console.error('Falha ao provisionar Administrador global. A transação foi revertida; verifique a estrutura e os administradores existentes.'); process.exitCode=1; })
    .finally(() => db.$disconnect());
}
