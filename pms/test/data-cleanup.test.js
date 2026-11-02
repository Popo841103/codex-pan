import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Store } from '../server/store.js';
import { apply } from '../src/demo-store.js';

const open = () => { const store = new Store(':memory:'); store.seedTestProperties(); return store; };
const admin = (store, role='admin', propertyIds=['TEST-KL']) =>
  store.createUser({ username:role+'-'+randomUUID().slice(0,6), password:'x'.repeat(14), role, propertyIds });
const revision = (store,propertyId) => store.db.prepare('SELECT revision FROM properties WHERE id=?').get(propertyId).revision;
const send = (store,user,command,propertyId='TEST-KL') =>
  store.command({id:user.id},{key:randomUUID(),expectedRevision:revision(store,propertyId),command:{propertyId,...command}});
const roomType = store => JSON.parse(store.db.prepare('SELECT body FROM properties WHERE id=?').get('TEST-KL').body).roomTypes[0].id;
const roomTypeOf = (store,propertyId) => JSON.parse(store.db.prepare('SELECT body FROM properties WHERE id=?').get(propertyId).body).roomTypes[0].id;
const stay = (store,user,id,guest,over={}) => send(store,user,{type:'create',id,guest,start:'2027-07-01',end:'2027-07-03',
  productId:'room',roomTypeId:roomType(store),gender:'any',source:'direct',...over});
const names = (store,user) => store.read({id:user.id}).orders.filter(o=>o.propertyId==='TEST-KL').map(o=>o.guest).sort();

test('clearing removes test bookings and leaves every other one alone',()=>{
  const store=open(),user=admin(store);
  stay(store,user,'a','TEST alpha');stay(store,user,'b','TESTING beta');stay(store,user,'c','test lower');
  stay(store,user,'d','Chan Wei Ming');stay(store,user,'e','Tan Ah Kow');
  send(store,user,{type:'purge_test_orders',prefix:'TEST'});
  assert.deepEqual(names(store,user),['Chan Wei Ming','Tan Ah Kow'],'only the prefixed bookings went');
  store.close();
});

test('the prefix is matched case-insensitively and only at the start of the name',()=>{
  const store=open(),user=admin(store);
  stay(store,user,'a','test one');stay(store,user,'b','TeSt two');stay(store,user,'c','Contest three');
  send(store,user,{type:'purge_test_orders',prefix:'test'});
  assert.deepEqual(names(store,user),['Contest three'],'a name that merely contains the prefix is kept');
  store.close();
});

test('a different prefix selects a different set of bookings',()=>{
  const store=open(),user=admin(store);
  stay(store,user,'a','TEST alpha');stay(store,user,'b','REHEARSAL beta');
  send(store,user,{type:'purge_test_orders',prefix:'REHEARSAL'});
  assert.deepEqual(names(store,user),['TEST alpha'],'the prefix given is the prefix used');
  store.close();
});

test('an empty prefix falls back to TEST rather than deleting everything',()=>{
  const store=open(),user=admin(store);
  stay(store,user,'a','TEST alpha');stay(store,user,'b','Chan Wei Ming');
  send(store,user,{type:'purge_test_orders',prefix:'   '});
  assert.deepEqual(names(store,user),['Chan Wei Ming'],'a blank prefix must not become "delete all"');
  store.close();
});

test('nothing to clear is refused instead of reported as a success',()=>{
  const store=open(),user=admin(store);
  stay(store,user,'a','Chan Wei Ming');
  const before=revision(store,'TEST-KL');
  assert.throws(()=>send(store,user,{type:'purge_test_orders',prefix:'TEST'}),e=>e.status===400&&e.message==='nothing_to_purge');
  assert.equal(revision(store,'TEST-KL'),before,'a refused purge changes nothing at all');
  store.close();
});

test('what was removed is recorded in the audit',()=>{
  const store=open(),user=admin(store);
  stay(store,user,'a','TEST alpha');stay(store,user,'b','TEST beta');
  send(store,user,{type:'purge_test_orders',prefix:'TEST'});
  const entry=store.read({id:user.id}).audit.find(a=>a.type==='purge_test_orders');
  assert.equal(entry.purged.length,2);
  assert.deepEqual(entry.purged.map(p=>p.guest).sort(),['TEST alpha','TEST beta']);
  assert.equal(entry.purged[0].status,'confirmed','the state it was in is kept, not just the name');
  assert.equal(entry.purged[0].start,'2027-07-01');
  assert.equal(entry.purged[0].end,'2027-07-03');
  assert.equal(entry.actor,user.username);
  store.close();
});

test('only an administrator of the property may clear its bookings',()=>{
  const store=open(),boss=admin(store);
  const ops=admin(store,'operations'),viewer=admin(store,'viewer'),other=admin(store,'admin',['TEST-PG']);
  stay(store,boss,'a','TEST alpha');
  for(const who of [ops,viewer])
    assert.throws(()=>send(store,who,{type:'purge_test_orders',prefix:'TEST'}),e=>e.status===403);
  assert.throws(()=>send(store,other,{type:'purge_test_orders',prefix:'TEST'}),e=>e.status===403,'another property administrator cannot clear this one');
  assert.equal(revision(store,'TEST-KL'),1,'nothing was deleted by any of them');
  store.close();
});

test('clearing one property never touches another',()=>{
  const store=open(),user=admin(store,'admin',['TEST-KL','TEST-PG']);
  stay(store,user,'a','TEST alpha');
  send(store,user,{type:'create',id:'pg',guest:'TEST penang',start:'2027-07-01',end:'2027-07-03',
    productId:'room',roomTypeId:roomTypeOf(store,'TEST-PG'),gender:'any',source:'direct'},'TEST-PG');
  send(store,user,{type:'purge_test_orders',prefix:'TEST'});
  assert.deepEqual(names(store,user),[],'this property is empty');
  assert.deepEqual(store.read({id:user.id}).orders.filter(o=>o.propertyId==='TEST-PG').map(o=>o.guest),['TEST penang'],
    'the other property kept its booking');
  store.close();
});

test('a booking record left without stays goes with them, and inventory is released',()=>{
  const store=open(),user=admin(store);
  const type=roomType(store);
  send(store,user,{type:'create_reservation',id:'res-1',guest:'TEST group',bookingKind:'individual',companyName:'',
    source:'direct',mode:'reserve',autoAssign:true,reminders:[],date:'2027-07-01',
    stays:[{productId:'room',roomTypeId:type,gender:'any',start:'2027-07-01',end:'2027-07-03',occupants:[{name:'TEST guest',gender:'any'}]}]});
  assert.equal(store.read({id:user.id}).reservations.length,1);
  const before=store.read({id:user.id}).orders.length;
  assert.equal(before,1);
  send(store,user,{type:'purge_test_orders',prefix:'TEST'});
  const after=store.read({id:user.id});
  assert.equal(after.orders.length,0);
  assert.equal(after.reservations.length,0,'a booking record with no stays left is removed too');
  // The nights are free again: the same stay can be sold from scratch.
  assert.doesNotThrow(()=>stay(store,user,'again','Chan Wei Ming'));
  store.close();
});

test('a purge is idempotent under its request key',()=>{
  const store=open(),user=admin(store);
  stay(store,user,'a','TEST alpha');
  const key=randomUUID();
  const first=store.command({id:user.id},{key,expectedRevision:revision(store,'TEST-KL'),command:{propertyId:'TEST-KL',type:'purge_test_orders',prefix:'TEST'}});
  const replay=store.command({id:user.id},{key,expectedRevision:revision(store,'TEST-KL'),command:{propertyId:'TEST-KL',type:'purge_test_orders',prefix:'TEST'}});
  assert.equal(replay.replayed,true,'a retry does not report a second deletion');
  assert.equal(replay.id,first.id);
  assert.equal(store.read({id:user.id}).audit.filter(a=>a.type==='purge_test_orders').length,1);
  store.close();
});

test('the reducer refuses a purge that matches nothing and keeps the state intact',()=>{
  const base={version:1,properties:[{id:'P'}],resources:[],roomTypes:[],orders:[
    {id:'o1',propertyId:'P',guest:'Real guest',start:'2027-07-01',end:'2027-07-02',status:'confirmed',productId:'room',nightly:0,transactions:[],notes:''}],
    blocks:[],audit:[]};
  assert.throws(()=>apply(base,{type:'purge_test_orders',propertyId:'P',prefix:'TEST'}),/nothing_to_purge/);
  const next=apply(base,{type:'purge_test_orders',propertyId:'P',prefix:'Real'});
  assert.deepEqual(next.orders,[],'and deletes when it does match');
  assert.equal(base.orders.length,1,'without mutating the state it was given');
});

test('the maintenance page counts what would go and offers nothing to anyone who may not use it',async()=>{
  const {dataMaintenancePage}=await import('../web/workspace-ui.js');
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const orders=[{id:'a',propertyId:'P',guest:'TEST <script>one</script>',start:'2027-07-01',end:'2027-07-03',status:'confirmed'},
    {id:'b',propertyId:'P',guest:'Real guest',start:'2027-07-01',end:'2027-07-03',status:'confirmed'},
    {id:'c',propertyId:'Q',guest:'TEST elsewhere',start:'2027-07-01',end:'2027-07-03',status:'confirmed'}];
  const page=dataMaintenancePage({orders,reservations:[],propertyId:'P',can:()=>true,t:k=>k,escape:esc});
  assert.match(page,/TEST &lt;script&gt;one&lt;\/script&gt;/,'guest names are escaped like anywhere else');
  assert.doesNotMatch(page,/<script>one/);
  assert.match(page,/cleanupWillDelete<\/strong> 1/,'it counts only this property matching bookings');
  assert.match(page,/cleanupWillKeep<\/strong> 1/,'and says what survives');
  assert.doesNotMatch(page,/TEST elsewhere/,'another property booking is neither counted nor listed');
  assert.match(page,/id="cleanup-form"/,'an administrator gets the form');
  const readOnly=dataMaintenancePage({orders:[],reservations:[],propertyId:'P',can:()=>false,t:k=>k,escape:esc});
  assert.doesNotMatch(readOnly,/id="cleanup-form"/,'everyone else gets no form at all');
  assert.match(readOnly,/cleanupReadOnly/,'and is told why');
  assert.match(readOnly,/cleanupWillDelete<\/strong> 0/);
});
