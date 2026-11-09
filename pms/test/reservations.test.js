import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {seed,apply,preview,folio} from '../src/demo-store.js';
import {reservationSummary} from '../src/reservations.js';
import {Store} from '../server/store.js';
import {makeServer} from '../server/http.js';
import {Backend} from '../web/backend.js';
import {composerCommand, createStayDraft} from '../web/reservation-ui.js';
const pid='TEST-KL',day='2027-01-10';
const row=(extra={})=>({productId:'room',roomTypeId:'TEST-KL-legacy-room-any',gender:'any',start:day,end:'2027-01-12',adults:1,children:0,infants:0,occupants:[{name:'TEST occupant',gender:'any'}],nightly:10000,...extra});
const request=(extra={})=>({type:'create_reservation',propertyId:pid,id:'test-parent',at:'2027-01-10T09:00:00Z',actor:'test-operator',date:day,guest:'TEST payer',bookingKind:'individual',companyName:'',source:'direct',autoAssign:false,mode:'reserve',stays:[row(),row()],...extra});
const cmd=(type,extra={})=>({type,propertyId:pid,id:randomUUID(),date:day,at:'2027-01-10T09:00:00Z',...extra});
test('one parent owns two stays with independent dates, nightly snapshots, occupants and extras',()=>{
 const state=apply(seed(),request({stays:[row({nightlyRates:[{date:day,amount:11111},{date:'2027-01-11',amount:22222}],extraCharges:[{kind:'charge',name:'TEST extra',quantity:2,unitAmount:500}]}),row({start:'2027-01-11',end:'2027-01-12',adults:2,occupants:[{name:'TEST A',gender:'female'},{name:'TEST B',gender:'male'}]})]}));
 assert.equal(state.reservations.length,1);assert.equal(state.orders.length,2);assert.equal(preview(state,pid).length,2);
 assert.equal(folio(state.orders[0]).charge,34333);assert.equal(folio(state.orders[1]).charge,10000);
 assert.equal(reservationSummary(state,state.reservations[0],folio).totals.charge,44333);
 assert.equal(state.orders[0].reservationId,'test-parent');assert.equal(state.orders[1].occupants.length,2);
 assert.equal(state.orders[0].resourceId,null);
});
test('one conflicting room rolls back the entire parent and all children',()=>{
 const state=seed(),before=JSON.stringify(state);
 assert.throws(()=>apply(state,request({stays:[row({resourceId:'TEST-KL-R1'}),row({resourceId:'TEST-KL-R1'})]})),/No continuous allocation/);
 assert.equal(JSON.stringify(state),before);
 assert.throws(()=>apply(state,request({stays:[row(),row({roomTypeId:'TEST-PG-legacy-room-any'})]})),/scope/);
 assert.equal(state.orders.length,0);
});
test('direct check-in allows dirty units while rejecting missing occupants and future dates',()=>{
 let state=seed();state.resources.find(r=>r.id==='TEST-KL-R2').cleaning='dirty';
 const checkedIn=apply(state,request({mode:'checkin',stays:[row({resourceId:'TEST-KL-R1'}),row({resourceId:'TEST-KL-R2'})]}));
 assert(checkedIn.orders.every(order=>order.status==='checked_in'));
 assert.equal(state.orders.length,0);
 assert.throws(()=>apply(seed(),request({mode:'checkin',stays:[row({occupants:[{name:'',gender:'any'}]})]})),/occupant_names/);
 assert.throws(()=>apply(seed(),request({mode:'checkin',stays:[row({start:'2027-01-11',end:'2027-01-12'})]})),/date/);
 const valid=apply(seed(),request({mode:'checkin',autoAssign:true}));assert(valid.orders.every(o=>o.status==='checked_in'&&o.resourceId));
});
test('a reserved child needs occupant names and an allocation before partial check-in',()=>{
 let state=apply(seed(),request({autoAssign:true,stays:[row({occupants:[{name:'',gender:'any'}]}),row()]}));
 const first=state.orders[0];assert.throws(()=>apply(state,cmd('checkin',{orderId:first.id})),/occupant_names/);
 state=apply(state,cmd('edit',{orderId:first.id,guest:first.guest,start:first.start,end:first.end,nightly:first.nightly,source:first.source,occupants:[{name:'TEST completed',gender:'any'}]}));
 state=apply(state,cmd('checkin',{orderId:first.id}));
 const sum=reservationSummary(state,state.reservations[0],folio);assert.equal(sum.counts.checked_in,1);assert.equal(sum.counts.confirmed,1);
});
test('capacity includes infants; malformed per-night arrays and discount overruns reject',()=>{
 for(const stay of [row({adults:2,infants:1,occupants:[{name:'A',gender:'any'},{name:'B',gender:'any'},{name:'C',gender:'any'}]}),row({nightlyRates:[{date:day,amount:10000},{date:day,amount:10000}]}),row({extraCharges:[{kind:'discount',name:'TEST',quantity:1,unitAmount:999999}]})])assert.throws(()=>apply(seed(),request({stays:[stay]})));
 const bed=row({productId:'bed',roomTypeId:'TEST-KL-legacy-bed-female',gender:'female',occupants:[{name:'TEST male',gender:'male'}]});
 assert.throws(()=>apply(seed(),request({stays:[bed]})),/occupancy/);
});
test('note edits preserve varying nightly prices; explicit rate edits reprice visibly',()=>{
 let state=apply(seed(),request({stays:[row({nightlyRates:[{date:day,amount:11111},{date:'2027-01-11',amount:22222}]})]}));
 const id=state.orders[0].id;
 state=apply(state,cmd('edit',{orderId:id,guest:'TEST payer',start:day,end:'2027-01-12',nightly:10000,source:'direct',notes:'TEST note'}));
 assert.equal(folio(state.orders[0]).charge,33333);
 state=apply(state,cmd('edit',{orderId:id,guest:'TEST payer',start:day,end:'2027-01-13',nightly:10000,source:'direct'}));assert.equal(folio(state.orders[0]).charge,43333);
 state=apply(state,cmd('edit',{orderId:id,guest:'TEST payer',start:day,end:'2027-01-13',nightly:20000,source:'direct'}));assert.equal(folio(state.orders[0]).charge,60000);
});
test('company reservations do not create credit balances; reminders are internal records',()=>{
 assert.throws(()=>apply(seed(),request({bookingKind:'company',companyName:''})),/reservation_input/);
 const state=apply(seed(),request({bookingKind:'company',companyName:'TEST Company',reminders:[{when:'2027-01-10T12:00',text:'TEST reminder'}]}));
 assert.equal(state.reservations[0].reminders[0].status,'internal_note');assert.equal(state.orders[0].transactions.length,0);
 assert.equal(state.reservations[0].companyName,'TEST Company');
});
test('parent net zero does not certify that every stay and deposit is settled',()=>{
 let state=apply(seed(),request());
 state=apply(state,cmd('payment',{orderId:state.orders[0].id,kind:'payment',amount:40000,method:'cash'}));
 const summary=reservationSummary(state,state.reservations[0],folio);
 assert.equal(summary.totals.due,0);assert.equal(summary.unsettledStays,2);
 assert.equal(summary.counts.checked_out,0);
});
test('composite commands validate business date and contact email before creating any child',()=>{
 for(const extra of [{date:'2027-02-30'},{date:'not-a-date'},{email:'invalid-email'}])assert.throws(()=>apply(seed(),request(extra)));
});
test('one SQLite transaction, revision, receipt and audit record cover all stays',()=>{
 const store=new Store(':memory:');try {
  store.seedTestProperties();const admin=store.createUser({username:'test-parent-admin',password:'test-password-only',role:'admin',propertyIds:[pid]});
  const input={key:randomUUID(),expectedRevision:0,command:request()};const saved=store.command(admin,input);assert.equal(store.command(admin,input).replayed,true);
  const state=store.read(admin);assert.equal(state.orders.length,2);assert.equal(state.reservations.length,1);assert.equal(state.audit.length,1);assert.equal(state.revisions[pid],1);
  assert.equal(state.audit[0].reservationId,saved.id);assert.equal(state.audit[0].stayIds.length,2);assert.equal(store.db.prepare('SELECT COUNT(*) AS n FROM claims').get().n,4);
  const before=JSON.stringify(state);assert.throws(()=>store.command(admin,{key:randomUUID(),expectedRevision:1,command:request({stays:[row({resourceId:'TEST-KL-R1'}),row({resourceId:'TEST-KL-R1'})]})}),/inventory_conflict/);
  assert.equal(JSON.stringify(store.read(admin)),before);
  for(const role of ['finance','viewer']) {const user=store.createUser({username:'test-parent-'+role,password:'test-password-only',role,propertyIds:[pid]});assert.throws(()=>store.command(user,{...input,key:randomUUID(),expectedRevision:1}),/forbidden/);}
 }finally{store.close();}
});
test('actual composer serialization keeps cents exact and excludes client totals and cache fields',()=>{
 const draft={bookingKind:'individual',companyName:'',guest:'TEST',email:'',phone:'',country:'',guestLanguage:'ms',source:'direct',channelOrderId:'',notes:'',color:'',autoAssign:false,reminders:[],stays:[{...row(),nightly:'10.01',rates:{[day]:'12.34'},extraCharges:[{kind:'charge',name:'TEST',quantity:2,unitAmount:'0.10'}],total:999999}]};
 const serialized=composerCommand(draft,'reserve');assert.equal(serialized.stays[0].nightly,1001);assert.deepEqual(serialized.stays[0].nightlyRates.map(r=>r.amount),[1234,1001]);
 assert.equal(serialized.stays[0].extraCharges[0].unitAmount,10);assert.equal(serialized.stays[0].total,undefined);assert.equal(serialized.stays[0].rates,undefined);
});
test('HTTP client sees one parent with two shared children; transaction reference stays a manual record',async t=>{
 const store=new Store(':memory:');store.seedTestProperties();store.createUser({username:'test-web-parent',password:'test-password-only',role:'operations',propertyIds:[pid]});
 const server=makeServer(store);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));store.close();});
 const origin=`http://127.0.0.1:${server.address().port}`;let cookie='';const client=new Backend(async(path,options={})=>{const response=await fetch(origin+path,{...options,headers:{Origin:origin,Cookie:cookie,...options.headers}});if(response.headers.has('set-cookie'))cookie=response.headers.get('set-cookie').split(';')[0];return response;});
 await client.connect();await client.login('test-web-parent','test-password-only');await client.execute(request(),0,randomUUID());const state=await client.state();
 assert.equal(state.reservations.length,1);assert.equal(state.orders.length,2);assert(state.reservations.every(r=>r.propertyId===pid));
 await client.execute({type:'payment',propertyId:pid,orderId:state.orders[0].id,kind:'payment',amount:100,method:'card',reference:'TEST-REFERENCE-ONLY'},1,randomUUID());
 const updated=await client.state();assert.equal(updated.orders[0].transactions[0].reference,'TEST-REFERENCE-ONLY');assert.equal(updated.orders[0].transactions[0].gatewayStatus,undefined);
 for(const path of ['/src/reservations.js','/src/dashboard.js','/src/inventory-actions.js','/web/calendar-actions.js','/web/reservation-ui.js','/web/dashboard-ui.js'])assert.equal((await fetch(origin+path)).status,200);
});

test('duplicate channel references reject a new parent atomically but allow its multiple children',()=>{
 const first=apply(seed(),request({source:'booking',channelOrderId:'TEST-OTA-101'}));
 assert.equal(first.orders.length,2);const before=JSON.stringify(first);
 assert.throws(()=>apply(first,request({id:'second-parent',source:'booking',channelOrderId:' TEST-OTA-101 '})),/duplicate_channel/);
 assert.equal(JSON.stringify(first),before);
 assert.equal(apply(first,request({id:'other-channel',source:'airbnb',channelOrderId:'TEST-OTA-101'})).reservations.length,2);
 assert.equal(apply(first,request({id:'no-reference',source:'booking',channelOrderId:''})).reservations.length,2);
});

test('adding a stay inherits the full previous period with independent prices and occupants',()=>{
 const type={id:'type-test',productId:'room',gender:'any'};
 const previous=createStayDraft({day:'2027-01-10',end:'2027-01-14',type});
 previous.nightly='100';previous.rates['2027-01-10']='90';previous.occupants[0].name='TEST previous';
 const next=createStayDraft({day:previous.start,end:previous.end,type});
 assert.equal(next.start,'2027-01-10');assert.equal(next.end,'2027-01-14');
 assert.equal(next.nightly,'0');assert.deepEqual(next.rates,{});assert.equal(next.occupants[0].name,'');
 next.occupants[0].name='TEST next';assert.equal(previous.occupants[0].name,'TEST previous');
 assert.equal(createStayDraft({day:'2027-01-31',type}).end,'2027-02-01');
 assert.throws(()=>createStayDraft({day:'2027-02-30',type}),/date_range/);
});

test('reservation notes accept the observed 2048 character boundary and reject longer notes atomically',()=>{
 const state=apply(seed(),request({notes:'x'.repeat(2048)}));assert.equal(state.orders[0].notes.length,2048);
 const clean=seed(),before=JSON.stringify(clean);assert.throws(()=>apply(clean,request({notes:'x'.repeat(2049)})));assert.equal(JSON.stringify(clean),before);
});

test('composer preserves selected rate plan for server-side price validation',()=>{const draft={guest:'TEST',bookingKind:'individual',companyName:'',source:'direct',reminders:[],stays:[{...row(),ratePlanCode:'STANDARD',nightly:'1.00',rates:{},extraCharges:[]}]};assert.equal(composerCommand(draft,'reserve').stays[0].ratePlanCode,'STANDARD');});
