import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { seed, apply, preview } from '../src/demo-store.js';
import { upgradeCatalog, saleResources } from '../src/catalog.js';
import { Store } from '../server/store.js';
import { makeServer } from '../server/http.js';
import { Backend } from '../web/backend.js';
import { catalogPage, catalogWords } from '../web/catalog-ui.js';
const pid = 'TEST-KL';
const command = (type, extra={}) => ({ type, propertyId:pid, id:randomUUID(), at:'2027-01-10T09:00:00Z', date:'2027-01-10', ...extra });
function addType(state, id, productId, gender='any') {
  return apply(state,command('room_type_save',{id,productId,gender,maxGuests:productId==='bed'?1:4,names:{zh:`测试 ${id}`,en:`TEST ${id}`,ms:`UJIAN ${id}`}}));
}
function fixture() {
  let state=addType(seed(),'test-bed','bed','female');
  state=addType(state,'test-suite','suite','female');
  state=apply(state,command('physical_room_save',{id:'test-dorm',kind:'dorm',roomTypeId:'test-bed',label:'TEST dorm',floor:'TEST floor',bedLabels:['A','B']}));
  const roomId=state.physicalRooms.find(r=>r.label==='TEST dorm').id;
  state=apply(state,command('suite_save',{id:'test-whole',label:'TEST whole dorm',roomTypeId:'test-suite',roomIds:[roomId]}));
  return state;
}
const book = (state, extra={}) => apply(state,command('create',{id:'test-booking',guest:'TEST Guest',productId:'bed',roomTypeId:'test-bed',gender:'female',start:'2027-01-10',end:'2027-01-12',...extra}));
test('legacy state upgrades additively without changing resource IDs, atoms or input',()=>{
  const legacy=seed();delete legacy.roomTypes;delete legacy.physicalRooms;
  legacy.resources.forEach(r=>{delete r.roomTypeId;delete r.archived;delete r.sortOrder;});
  const original=structuredClone(legacy), next=upgradeCatalog(legacy);
  assert.deepEqual(legacy,original);
  assert.deepEqual(next.resources.map(r=>[r.id,r.atoms]),legacy.resources.map(r=>[r.id,r.atoms]));
  assert(next.roomTypes.some(t=>t.propertyId===pid));assert(next.physicalRooms.some(r=>r.propertyId===pid));
  assert.equal(preview(next,pid).length,0);
});
test('new dorm beds use their physical room for same-room allocation and begin dirty',()=>{
  let state=fixture();state=book(state);
  state=apply(state,command('assign',{orderId:'test-booking',resourceId:'test-dorm-unit-1'}));
  state=apply(state,command('checkin',{orderId:'test-booking'}));
  assert.equal(state.orders[0].status,'checked_in');
  assert.equal(state.resources.find(r=>r.id==='test-dorm-unit-2').cleaning,'dirty');
});
test('suite and child beds cannot both reserve shared atoms, in either direction',()=>{
  const state=fixture();
  const suite=book(state,{id:'suite-booking',productId:'suite',roomTypeId:'test-suite',resourceId:'test-whole'});
  assert.throws(()=>book(suite),/No continuous allocation/);
  const bed=book(state);
  assert.throws(()=>book(bed,{id:'suite-booking',productId:'suite',roomTypeId:'test-suite'}),/No continuous allocation/);
  const adjacent=book(suite,{start:'2027-01-12',end:'2027-01-13'});
  assert.equal(preview(adjacent,pid).length,2);
});
test('room-type reservations do not spill into other products when their type is full',()=>{
  let state=fixture();state=book(state,{id:'one'});state=book(state,{id:'two'});
  assert.throws(()=>book(state,{id:'three'}),/No continuous allocation/);
  assert.throws(()=>book(fixture(),{roomTypeId:'TEST-PG-legacy-bed-female'}),/scope/);
  assert.equal(state.orders.length,2);
});
test('configuration rejects duplicate beds and foreign composition without partial state',()=>{
  const state=fixture(), before=JSON.stringify(state);
  assert.throws(()=>apply(state,command('physical_room_save',{kind:'dorm',roomTypeId:'test-bed',label:'TEST duplicate',floor:'',bedLabels:['A','a']})),/catalog_duplicate/);
  assert.throws(()=>apply(state,command('suite_save',{label:'TEST bad suite',roomTypeId:'test-suite',roomIds:['TEST-PG-R1']})),/scope/);
  assert.throws(()=>apply(state,command('suite_save',{label:'TEST mixed zone',roomTypeId:'test-suite',roomIds:['TEST-KL-D3']})),/catalog_composition/);
  assert.equal(JSON.stringify(state),before);
});
test('topology and gender cannot be rewritten through type or room edits',()=>{
  const state=fixture();
  assert.throws(()=>apply(state,command('room_type_save',{roomTypeId:'test-bed',productId:'bed',gender:'male',maxGuests:1,names:{zh:'测试改名',en:'TEST renamed',ms:'UJIAN nama'}})),/catalog_immutable/);
  assert.throws(()=>apply(state,command('physical_room_save',{physicalRoomId:'test-dorm-space',kind:'dorm',label:'TEST changed',floor:'2',bedLabels:['C']})),/catalog_immutable/);
  const renamed=apply(state,command('physical_room_save',{physicalRoomId:'test-dorm-space',kind:'dorm',label:'TEST changed',floor:'2'}));
  assert.equal(renamed.physicalRooms.find(r=>r.id==='test-dorm-space').label,'TEST changed');
  assert.deepEqual(renamed.resources.map(r=>[r.id,r.atoms]),state.resources.map(r=>[r.id,r.atoms]));
});
test('resource edits preserve occupancy and cannot remove the room type of a pending booking',()=>{
  let state=fixture();state=addType(state,'second-bed','bed','female');
  state=book(state,{id:'one'});state=book(state,{id:'two'});
  assert.throws(()=>apply(state,command('resource_update',{resourceId:'test-dorm-unit-1',roomTypeId:'second-bed',label:'TEST renamed',sortOrder:8})),/No continuous allocation/);
  const updated=apply(state,command('resource_update',{resourceId:'test-dorm-unit-1',roomTypeId:'test-bed',label:'TEST renamed',sortOrder:8}));
  assert.equal(updated.resources.find(r=>r.id==='test-dorm-unit-1').sortOrder,8);
  assert.deepEqual(updated.resources.find(r=>r.id==='test-dorm-unit-1').atoms,state.resources.find(r=>r.id==='test-dorm-unit-1').atoms);
});
test('archiving revalidates unassigned capacity, protects fixed orders and keeps history',()=>{
  let state=fixture();state=book(state,{id:'one'});state=book(state,{id:'two'});
  assert.throws(()=>apply(state,command('resource_archive',{resourceId:'test-dorm-unit-1',archived:true})),/No continuous allocation/);
  state=book(fixture(),{resourceId:'test-dorm-unit-1'});
  assert.throws(()=>apply(state,command('resource_archive',{resourceId:'test-dorm-unit-1',archived:true})),/catalog_in_use/);
  state=apply(state,command('cancel',{orderId:'test-booking',reason:'TEST cancellation',finalCharge:0}));
  state=apply(state,command('resource_archive',{resourceId:'test-dorm-unit-1',archived:true}));
  assert.equal(state.orders.length,1);assert(state.resources.some(r=>r.id==='test-dorm-unit-1'));
  assert(!saleResources(state,pid).some(r=>r.id==='test-whole'));
  state=apply(state,command('resource_archive',{resourceId:'test-dorm-unit-1',archived:false}));
  assert(saleResources(state,pid).some(r=>r.id==='test-whole'));
  assert.equal(state.resources.find(r=>r.id==='test-dorm-unit-1').cleaning,'dirty');
});
test('suite check-in observes child cleaning, overdue occupation and physical blocks',()=>{
  let state=fixture();state=apply(state,command('clean',{resourceId:'test-whole'}));
  state=book(state,{id:'suite-booking',productId:'suite',roomTypeId:'test-suite',resourceId:'test-whole'});
  state=apply(state,command('checkin',{orderId:'suite-booking'}));
  assert.throws(()=>apply(state,command('clean',{resourceId:'test-dorm-unit-1'})),/occupied/);
  assert.throws(()=>apply(state,command('clean',{resourceId:'test-dorm-unit-1',orderId:'suite-booking'})),/occupied/);
  assert.throws(()=>apply(state,command('bulk_clean',{resourceIds:['test-dorm-unit-2'],cleaning:'clean'})),/occupied/);
  assert.throws(()=>apply(state,command('bulk_clean',{resourceIds:['test-dorm-unit-2'],cleaning:'clean',orderId:'suite-booking'})),/occupied/);
  state=book(state,{resourceId:'test-dorm-unit-1',start:'2027-01-12',end:'2027-01-13'});
  assert.throws(()=>apply(state,command('checkin',{orderId:'test-booking',date:'2027-01-12'})),/occupied/);
  const blocked=apply(fixture(),command('block',{resourceId:'test-dorm-unit-1',start:'2027-01-10',end:'2027-01-12'}));
  assert.throws(()=>book(blocked,{productId:'suite',roomTypeId:'test-suite'}),/No continuous allocation/);
});
test('suite checkout dirties components without blocking staff from checking in the next guest',()=>{
  let state=fixture();state=apply(state,command('clean',{resourceId:'test-whole'}));
  state=book(state,{productId:'suite',roomTypeId:'test-suite',resourceId:'test-whole'});
  state=apply(state,command('checkin',{orderId:'test-booking'}));
  state=apply(state,command('checkout',{orderId:'test-booking',date:'2027-01-12'}));
  assert.equal(state.resources.find(r=>r.id==='test-dorm-unit-1').cleaning,'dirty');
  state=book(state,{id:'next',resourceId:'test-dorm-unit-1',start:'2027-01-12',end:'2027-01-13'});
  state=apply(state,command('checkin',{orderId:'next',date:'2027-01-12'}));
  assert.equal(state.orders.find(o=>o.id==='next').status,'checked_in');
});
const user = (store,role,propertyIds=[pid])=>store.createUser({username:`test-${role}-${randomUUID().slice(0,8)}`,password:'test-only-password',role,propertyIds});
const typeCommand=()=>({type:'room_type_save',propertyId:pid,productId:'room',gender:'any',maxGuests:2,names:{zh:'测试新房型',en:'TEST new type',ms:'UJIAN baharu'}});
test('shared configuration enforces server roles, property scope, receipts and audit',()=>{
  const store=new Store(':memory:');try {
    store.seedTestProperties();const admin=user(store,'admin');
    const request={key:randomUUID(),expectedRevision:0,command:typeCommand()};
    for(const role of ['operations','finance','viewer'])assert.throws(()=>store.command({...user(store,role),role:'admin'},request),/forbidden/);
    assert.throws(()=>store.command(user(store,'admin',['TEST-PG']),request),/forbidden/);
    const result=store.command(admin,request);
    assert.equal(store.command(admin,request).replayed,true);
    const state=store.read(admin);assert.equal(state.revisions[pid],1);assert.equal(state.audit.length,1);
    assert.equal(state.audit[0].catalogChange.after.id,result.id);
    assert(state.roomTypes.every(r=>r.propertyId===pid));assert(state.physicalRooms.every(r=>r.propertyId===pid));
    const before=JSON.stringify(state);
    assert.throws(()=>store.command(admin,{...request,key:randomUUID(),expectedRevision:1}),/catalog_duplicate/);
    assert.equal(JSON.stringify(store.read(admin)),before);
  }finally{store.close();}
});
test('database suite reservation claims every component and conflicting child writes roll back',()=>{
  const store=new Store(':memory:');try {
    store.seedTestProperties();const admin=user(store,'admin');
    const execute=command=>store.command(admin,{key:randomUUID(),expectedRevision:store.read(admin).revisions[pid],command:{...command,propertyId:pid}});
    const type=execute({...typeCommand(),productId:'suite'});
    const suite=execute({type:'suite_save',label:'TEST DB suite',roomTypeId:type.id,roomIds:['TEST-KL-R1','TEST-KL-R2']});
    const booked=execute({type:'create',guest:'TEST DB Guest',productId:'suite',roomTypeId:type.id,resourceId:suite.id,gender:'any',start:'2027-01-10',end:'2027-01-12'});
    const claims=store.db.prepare('SELECT * FROM claims ORDER BY atom,night').all();
    assert.equal(claims.length,4*24);assert(claims.every(c=>/^\d{4}-\d{2}-\d{2}@\d{2}$/.test(c.night)));assert(claims.every(c=>c.owner===booked.id));
    const before=JSON.stringify(store.read(admin));
    assert.throws(()=>execute({type:'create',guest:'TEST conflict',productId:'room',resourceId:'TEST-KL-R1',gender:'any',start:'2027-01-10',end:'2027-01-11'}),/inventory_conflict/);
    assert.equal(JSON.stringify(store.read(admin)),before);
    assert.deepEqual(store.db.prepare('SELECT * FROM claims ORDER BY atom,night').all(),claims);
  }finally{store.close();}
});
test('existing database state upgrades on read without changing its revision or resetting orders',()=>{
  const store=new Store(':memory:');try {
    store.seedTestProperties();const admin=user(store,'admin');
    const row=store.db.prepare('SELECT body FROM properties WHERE id=?').get(pid),legacy=JSON.parse(row.body);
    delete legacy.roomTypes;delete legacy.physicalRooms;legacy.resources.forEach(r=>delete r.roomTypeId);
    store.db.prepare('UPDATE properties SET body=? WHERE id=?').run(JSON.stringify(legacy),pid);
    const before=store.db.prepare('SELECT body,revision FROM properties WHERE id=?').get(pid);
    assert(store.read(admin).roomTypes.length>0);
    assert.deepEqual(store.db.prepare('SELECT body,revision FROM properties WHERE id=?').get(pid),before);
  }finally{store.close();}
});
test('independent SQLite connections reject stale configuration and persist successful changes',()=>{
  const dir=mkdtempSync(join(tmpdir(),'jovian-catalog-')),path=join(dir,'test.sqlite');
  const a=new Store(path),b=new Store(path);try {
    a.seedTestProperties();const admin=user(a,'admin');
    a.command(admin,{key:randomUUID(),expectedRevision:0,command:typeCommand()});
    assert.throws(()=>b.command(admin,{key:randomUUID(),expectedRevision:0,command:typeCommand()}),/stale_revision/);
    assert.equal(b.read(admin).roomTypes.filter(t=>t.names.en==='TEST new type').length,1);
  }finally{a.close();b.close();}
  const reopened=new Store(path);try{assert.match(reopened.db.prepare('SELECT body FROM properties WHERE id=?').get(pid).body,/TEST new type/);}finally{reopened.close();rmSync(dir,{recursive:true,force:true});}
});
test('catalog renderer escapes labels, keeps property isolation and shows restricted controls',()=>{
  const state=fixture();state.resources.find(r=>r.id==='test-whole').label='<img src=x>';
  for(const language of ['zh','en','ms']) {
    const t=k=>catalogWords[language][k]||k;
    const html=catalogPage(state,pid,language,t,()=>false);
    assert.match(html,/&lt;img src=x&gt;/);assert.doesNotMatch(html,/<img/);assert.doesNotMatch(html,/TEST-PG/);
    assert.match(html,/data-catalog="suite"[^>]*disabled/);
    assert(html.includes(t('catalogReadOnly')));
  }
});
test('real HTTP client configures a type and dorm, then reserves its exact bed type',async t=>{
  const store=new Store(':memory:');store.seedTestProperties();const admin=user(store,'admin'),operator=user(store,'operations');
  const server=makeServer(store);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));store.close();});
  const origin=`http://127.0.0.1:${server.address().port}`;
  function client(){let cookie='';return new Backend(async(path,options={})=>{
    const response=await fetch(origin+path,{...options,headers:{Origin:origin,Cookie:cookie,...options.headers}});
    if(response.headers.has('set-cookie'))cookie=response.headers.get('set-cookie').split(';')[0];return response;
  });}
  const a=client(),b=client();await a.connect();await a.login(admin.username,'test-only-password');await b.connect();await b.login(operator.username,'test-only-password');
  const type=await a.execute({...typeCommand(),productId:'bed',maxGuests:1},0,randomUUID());
  const physical=await a.execute({type:'physical_room_save',propertyId:pid,roomTypeId:type.id,kind:'dorm',label:'TEST HTTP dorm',floor:'1',bedLabels:['A']},1,randomUUID());
  await b.execute({type:'create',propertyId:pid,guest:'TEST HTTP Guest',roomTypeId:type.id,productId:'bed',gender:'any',start:'2027-01-10',end:'2027-01-11'},2,randomUUID());
  let state=await b.state();assert.equal(state.orders[0].roomTypeId,type.id);assert.equal(state.orders.length,1);
  assert.equal(preview(state,pid).find(p=>p.demandId===state.orders[0].id).resourceId,`${physical.id}-unit-1`);
  await assert.rejects(()=>b.execute(typeCommand(),3,randomUUID()),/forbidden/);
  await assert.rejects(()=>a.execute({type:'resource_archive',propertyId:pid,resourceId:`${physical.id}-unit-1`,archived:true},3,randomUUID()),/inventory_conflict/);
  state=await a.state();assert.equal(state.revisions[pid],3);assert.equal(state.orders.length,1);
  for(const path of ['/src/catalog.js','/web/catalog-ui.js'])assert.equal((await fetch(origin+path)).status,200);
});
