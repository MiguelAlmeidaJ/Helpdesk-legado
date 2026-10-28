const { test } = require('node:test');
const assert = require('node:assert/strict');
const { formatCnpj, normalizeCnpj, isValidCnpj, AppPermission } = require('../packages/contracts/dist');
const { CnpjLookupService } = require('../apps/api/dist/modules/registrations/cnpj-lookup.service');
const { RegistrationsService } = require('../apps/api/dist/modules/registrations/registrations.service');
const actor = { grants: [AppPermission.RegistrationsClientsCreate, AppPermission.RegistrationsClientsEdit].map(permission=>({permission,scope:'all'})) };
const alpha = '12ABC34501DE35', numeric = '19131243000197';
const payload = { cnpj: alpha, razao_social: 'Empresa Exemplo', nome_fantasia: 'Exemplo', logradouro: 'Paulista', numero: '37', bairro: 'Centro', municipio: 'São Paulo', uf: 'SP', email: null, ddd_telefone_1: '1133334444' };

test('official Receita example, numeric compatibility, uppercase, masks and check digits', () => {
 assert.equal(isValidCnpj('12.ABC.345/01DE-35'), true);
 assert.equal(isValidCnpj(numeric), true);
 assert.equal(isValidCnpj('12.abc.345/01de-35'), true);
 assert.equal(normalizeCnpj('00.000.000/0001-91'), '00000000000191');
 assert.equal(formatCnpj(alpha), '12.ABC.345/01DE-35');
 assert.equal(formatCnpj(numeric), '19.131.243/0001-97');
 assert.equal(formatCnpj('12a'), '12.A');
 assert.equal(formatCnpj('12abc34501deAA'), '12.ABC.345/01DE');
 for (const invalid of ['', '123', '12ABC34501DE36', '12ABC34501DEAA', '00000000000000', '11111111111111', alpha+'0', '12ABC34501DE_35']) assert.equal(isValidCnpj(invalid), false, invalid);
});

test('lookup is authorized, validates before network and maps only client fields with bounded cache', async () => {
 const original = global.fetch; const calls=[];
 global.fetch = async (url, init) => { calls.push({url,init}); return Response.json(payload); };
 try {
  const service = new CnpjLookupService();
  await assert.rejects(service.lookup({grants:[]},alpha), e=>e.getStatus()===403);
  await assert.rejects(service.lookup(actor,'../'+alpha+'?x=1'), e=>e.getStatus()===400);
  assert.equal(calls.length,0);
  const data = await service.lookup(actor,alpha.toLowerCase());
  assert.equal(data.cnpj,'12.ABC.345/01DE-35'); assert.equal(data.legalName,'Empresa Exemplo');
  assert.equal(data.email,''); assert.equal(data.city,'São Paulo'); assert.equal(data.state,'SP');
  assert.equal(data.phone,'1133334444'); assert.ok(data.address.includes('Paulista, 37'));
  assert.deepEqual(Object.keys(data).sort(),['address','city','cnpj','email','legalName','phone','state','tradeName']);
  assert.equal(calls[0].url,'https://minhareceita.org/'+alpha); assert.equal(calls[0].init.redirect,'error');
  assert.deepEqual(await service.lookup(actor,alpha),data); assert.equal(calls.length,1);
 } finally { global.fetch=original; }
});

test('lookup errors, missing company, timeouts and mismatched responses never become client data', async () => {
 const original=global.fetch;
 try {
  for (const [reply,status] of [[()=>new Response('',{status:404}),404],[()=>new Response('',{status:429}),503],[()=>new Response('',{status:500}),503],[()=>Response.json({...payload,cnpj:numeric}),503],[()=>new Response('not json'),503],[()=>{throw new Error('Timeout');},503]]) {
   global.fetch=async()=>reply();
   await assert.rejects(new CnpjLookupService().lookup(actor,alpha),e=>e.getStatus()===status);
  }
 } finally { global.fetch=original; }
});

test('client persistence preserves letters and leading zeroes and rejects invalid CNPJ before writing', async () => {
 const writes=[]; const service=new RegistrationsService({$executeRawUnsafe:async(...args)=>{writes.push(args);return 1;}});
 const input={legalName:'Fixture',tradeName:'Fixture',city:'São Paulo',state:'SP',phone:'1133334444',cnpj:alpha.toLowerCase()};
 const result=await service.update(actor,'clients',42,{status:1,values:input});
 assert.equal(result.values.cnpj,'12.ABC.345/01DE-35'); assert.equal(writes[0][3],'12.ABC.345/01DE-35');
 await service.update(actor,'clients',42,{status:1,values:{...input,cnpj:'00000000000191'}});
 assert.equal(writes[1][3],'00.000.000/0001-91');
 await assert.rejects(service.update(actor,'clients',42,{status:1,values:{...input,cnpj:'12ABC34501DEAA'}}),e=>e.getStatus()===400);
 assert.equal(writes.length,2);
});
