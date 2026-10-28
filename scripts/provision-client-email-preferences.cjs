// Additive SQL Server provisioning. Existing and new clients default to no ticket e-mail.
const path=require('node:path');
process.loadEnvFile(path.resolve(__dirname,'../.env'));
const {createNivel3Client}=require('../packages/database/dist');

async function provision(db){
 return db.$transaction(async tx=>{
  await tx.$executeRawUnsafe(`IF COL_LENGTH('dbo.clientes','clt_receber_email') IS NULL
   ALTER TABLE dbo.clientes ADD clt_receber_email bit NOT NULL
   CONSTRAINT DF_clientes_receber_email DEFAULT (0) WITH VALUES`);
  const rows=await tx.$queryRawUnsafe(`SELECT COUNT(*) AS clients,
   SUM(CASE WHEN clt_receber_email=1 THEN 1 ELSE 0 END) AS opted_in FROM dbo.clientes`);
  return{clients:Number(rows[0].clients),optedIn:Number(rows[0].opted_in||0)};
 },{timeout:30000});
}
module.exports={provision};
if(require.main===module){
 const db=createNivel3Client();
 provision(db).then(result=>console.log(JSON.stringify(result)))
  .catch(()=>{console.error('Não foi possível preparar a preferência de e-mail dos clientes. A transação foi revertida.');process.exitCode=1;})
  .finally(()=>db.$disconnect());
}
