const {test}=require('node:test'),assert=require('node:assert/strict');
const {TicketNotificationMailer}=require('../apps/api/dist/modules/tickets/infrastructure/notification/ticket-notification.mailer');
const {ProcessTicketNotificationOutbox}=require('../apps/api/dist/modules/tickets/application/process-ticket-notification-outbox');
const {PrismaTicketNotificationOutboxRepository}=require('../apps/api/dist/modules/tickets/infrastructure/persistence/prisma-ticket-notification-outbox.repository');
const {RegistrationsService}=require('../apps/api/dist/modules/registrations/registrations.service');
const {AppPermission}=require('../packages/contracts/dist');
const mailer=new TicketNotificationMailer({get:()=>undefined});
const context={ticketId:42,clientName:'Fixture',clientEmail:'client@example.test',requesterName:'Fixture requester',requesterEmail:'requester@example.test',technicianName:'Internal',technicianEmail:'tech@example.test',clientReceivesEmails:false};

test('client preference defaults off; client and requester are excluded while the technician remains',()=>{
 assert.deepEqual(mailer.recipients(context),['tech@example.test']);
 assert.deepEqual(mailer.recipients({...context,clientReceivesEmails:undefined}),['tech@example.test']);
 assert.deepEqual(mailer.recipients({...context,clientReceivesEmails:true}),['client@example.test','requester@example.test','tech@example.test']);
 assert.deepEqual(mailer.recipients({...context,technicianEmail:'CLIENT@example.test'}),[]);
 assert.deepEqual(mailer.recipients({...context,technicianEmail:'REQUESTER@example.test'}),[]);
 assert.deepEqual(mailer.recipients({...context,clientReceivesEmails:true,requesterEmail:'CLIENT@example.test'}),['CLIENT@example.test','tech@example.test']);
});

test('mailer blocks supplied client recipients without touching SMTP when opted out',async()=>{
 await mailer.send({id:'fixture',ticketId:42,eventType:'ticket.opened',payload:{}},context,['client@example.test','requester@example.test']);
});

test('outbox resolves the current preference for each event, including events queued before opt-out',async()=>{
 let enabled=true;const deliveries=[],completed=[];
 const repository={findPending:async()=>[{id:'old-event',ticketId:42,eventType:'ticket.opened',payload:{}},{id:'second-event',ticketId:42,eventType:'ticket.finalized',payload:{}}],claim:async()=>true,context:async()=>({...context,clientReceivesEmails:enabled}),complete:async id=>{completed.push(id);enabled=false;},fail:async()=>assert.fail('No SMTP failures expected')};
 const processor=new ProcessTicketNotificationOutbox(repository,{recipients:c=>mailer.recipients(c),send:async(_event,_context,recipients)=>deliveries.push(recipients)});
 const result=await processor.execute(10);
 assert.equal(result.sent,2);assert.equal(completed.length,2);
 assert.deepEqual(deliveries,[['client@example.test','requester@example.test','tech@example.test'],['tech@example.test']]);
});

test('outbox completes opted-out events with no internal recipients without SMTP',async()=>{
 let completed=false;
 const repository={findPending:async()=>[{id:'fixture',ticketId:42,eventType:'ticket.concluded',payload:{}}],claim:async()=>true,context:async()=>({...context,technicianEmail:null}),complete:async()=>{completed=true;},fail:async()=>assert.fail('No failure expected')};
 const result=await new ProcessTicketNotificationOutbox(repository,{recipients:c=>mailer.recipients(c),send:async()=>assert.fail('Opted-out client must not be mailed')}).execute(10);
 assert.equal(result.withoutRecipients,1);assert.equal(completed,true);
});

test('repository interprets SQL Server bit values strictly and excludes missing preferences',async()=>{
 for(const [value,expected]of[[true,true],[1,true],[false,false],[0,false],[null,false],[undefined,false]]){
  const repo=new PrismaTicketNotificationOutboxRepository({$queryRawUnsafe:async()=>[{ticket_id:42,client_receives_emails:value}]});
  assert.equal((await repo.context(42)).clientReceivesEmails,expected);
 }
});

test('client form starts with CNPJ, exposes preference and persists false by default and explicit opt-in',async()=>{
 const writes=[];
 const database={$executeRawUnsafe:async(...args)=>{writes.push(args);return 1;},$queryRawUnsafe:async()=>[{id:99}],$transaction:async work=>work(database)};
 const service=new RegistrationsService(database);
 assert.equal(service.definition('clients').fields[0].key,'cnpj');
 assert.equal(service.definition('clients').fields.find(f=>f.key==='receiveEmails').type,'boolean');
 const actor={grants:[{permission:AppPermission.SystemAdmin,scope:'all'}]};
 const values={legalName:'Fixture',tradeName:'Fixture',city:'Fixture',state:'SP',phone:'1133334444'};
 const result=await service.update(actor,'clients',99,{status:1,values});
 assert.equal(result.values.receiveEmails,false);assert.equal(writes[0].at(-2),false);
 const enabled=await service.update(actor,'clients',99,{status:1,values:{...values,receiveEmails:true}});
 assert.equal(enabled.values.receiveEmails,true);assert.equal(writes[1].at(-2),true);
 const created=await service.create(actor,'clients',{status:1,values});
 assert.equal(created.values.receiveEmails,false);
});
