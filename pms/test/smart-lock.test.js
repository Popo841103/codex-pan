import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {Store} from '../server/store.js';
import {apply,smartLockBrands,smartLockConfig,ttLockBrand,stayLocks,smartLockWindow,smartLockName} from '../src/demo-store.js';
import {syntheticTTLock} from '../server/self-checkin.js';
const pid='TEST-KL',day='2027-01-10';
function fixture(){
 let now=Date.parse(day+'T07:05:00Z');
 const store=new Store(':memory:',{selfCheckin:{key:randomBytes(32),clock:()=>now}});store.seedTestProperties();
 const user=role=>store.createUser({username:'test-lock-'+role,password:randomUUID(),role,propertyIds:[pid]});
 const admin=user('admin'),ops=user('operations'),viewer=user('viewer'),finance=user('finance');
 const command=(type,fields={},who=admin)=>store.command(who,{key:randomUUID(),expectedRevision:store.read(who).revisions[pid],command:{type,propertyId:pid,...fields}});
 const orderId=command('create',{guest:'TEST synthetic lock stay',productId:'room',gender:'any',resourceId:pid+'-R1',start:day,end:'2027-01-12',nightly:0}).id;
 const order=()=>store.read(admin).orders.find(o=>o.id===orderId);
 const connect=()=>command('smart_lock_connect',{brand:ttLockBrand});
 const bind=(kind='private',extra={})=>command('smart_lock_bind',{kind,name:'TEST synthetic '+kind,online:true,gateway:true,...(kind==='private'?{resourceId:pid+'-R1'}:{roomTypeIds:[store.read(admin).resources.find(r=>r.id===pid+'-R1').roomTypeId]}),...extra});
 const setting=extra=>command('smart_lock_settings',{settings:{...smartLockConfig(store.read(admin),pid).settings,...extra}});
 const read=()=>store.checkin.lockRead(ops,pid,orderId);
 const action=(action,extra={},who=ops)=>store.checkin.lockCommand(who,{propertyId:pid,orderId,action,...extra});
 return {store,admin,ops,viewer,finance,command,orderId,order,connect,bind,setting,read,action,setNow:v=>now=Date.parse(v)};
}

test('display catalog reserves all 19 brands; only TTLock accepts password-free synthetic connect',()=>{
 const f=fixture();try{
  assert.deepEqual(smartLockBrands,['2N','33 Lock','Akiles','August','Baycom','ChatLock','igloohome','Kwikset','Lockly','Nuki','YGS','RemoteLock','Salto KS','Schlage','SmartThings','Tedee','TTLock (Sciener / Tongtong / 科技侠)','Wyze','Yale']);
  for(const brand of smartLockBrands.filter(b=>b!==ttLockBrand))assert.throws(()=>f.command('smart_lock_connect',{brand}),/smart_lock_vendor_pending/);
  assert.throws(()=>f.command('smart_lock_connect',{brand:ttLockBrand,password:'TEST refused secret'}),/input/);
  f.connect();assert.equal(smartLockConfig(f.store.read(f.admin),pid).mode,'synthetic');
  assert(!JSON.stringify(f.store.read(f.admin)).includes('TEST refused secret'));
 }finally{f.store.close();}
});
test('private and common binding share reducer validation and remain property-scoped',()=>{
 const f=fixture();try{
  f.connect();f.bind();f.bind('common');
  const state=f.store.read(f.admin),rows=stayLocks(state,f.order());assert.equal(rows.length,2);assert(rows.every(r=>r.id.startsWith('SYNTH-')&&r.name.startsWith('TEST synthetic ')));
  assert.throws(()=>f.bind('private',{resourceId:'TEST-PG-R1'}),/scope/);
  assert.throws(()=>f.bind('common',{roomTypeIds:['TEST-PG-legacy-room-any']}),/scope/);
  const c={type:'smart_lock_settings',propertyId:pid,settings:{...smartLockConfig(state,pid).settings,length:9},id:randomUUID(),at:new Date().toISOString()};
  const local=apply(state,c);f.command(c.type,{settings:c.settings});assert.deepEqual(smartLockConfig(local,pid),smartLockConfig(f.store.read(f.admin),pid));
  f.command('smart_lock_remove',{lockId:rows[0].id});assert.equal(f.read().rows.length,1);
 }finally{f.store.close();}
});
test('automatic generation uses Malaysia windows, length and lead days; only ciphertext persists',()=>{
 const f=fixture();try{
  f.setNow('2027-01-07T07:00:00Z');f.setting({leadDays:0,length:9,privateBefore:6,privateAfter:2,commonBefore:8,commonAfter:4});f.connect();f.bind();f.bind('common');assert.equal(f.store.db.prepare('SELECT count(*) n FROM sl_access').get().n,0);
  f.setting({leadDays:3});const rows=f.read().rows;assert.equal(rows.length,2);assert(rows.every(r=>/^\d{9}$/.test(r.pin)));
  assert.equal(rows[0].from,Date.parse(day+'T09:00:00+08:00'));assert.equal(rows[0].until,Date.parse('2027-01-12T14:00:00+08:00'));
  assert.equal(rows[1].from,Date.parse(day+'T07:00:00+08:00'));assert.equal(rows[1].until,Date.parse('2027-01-12T16:00:00+08:00'));
  const raw=JSON.stringify(f.store.db.prepare('SELECT * FROM sl_access').all())+JSON.stringify(f.store.db.prepare('SELECT * FROM sc_audit').all())+JSON.stringify(f.store.read(f.admin));
  for(const row of rows)assert(!raw.includes(row.pin));
  const repeat=f.action('generate');assert.deepEqual(repeat.rows.map(r=>r.pin),rows.map(r=>r.pin));
  const before=f.store.read(f.admin).orders;assert.throws(()=>f.action('remote_unlock'),/smart_lock_test_no_unlock/);assert.deepEqual(f.store.read(f.admin).orders,before);
 }finally{f.store.close();}
});
test('auto OFF is stored, invalid lengths and lead times rejected, unbound properties mint no code',()=>{
 const f=fixture();try{
  assert.equal(f.read().rows.length,0);assert.throws(()=>f.action('generate'),/checkin_lock_offline/);assert.equal(f.store.db.prepare('SELECT count(*) n FROM sl_access').get().n,0);
  f.setting({autoGenerate:false});f.connect();f.bind();assert.equal(f.read().rows[0].pin,undefined);
  for(const length of [3,10,'4'])assert.throws(()=>f.setting({length}),/input/);
  for(const leadDays of [-1,4,1.5])assert.throws(()=>f.setting({leadDays}),/input/);
  assert.equal(smartLockConfig(f.store.read(f.admin),'TEST-PG').connected,false);
  assert.match(f.action('generate').rows[0].pin,/^\d{6}$/);
  assert.throws(()=>syntheticTTLock.remoteUnlock(),/smart_lock_test_no_unlock/);
  assert.equal(syntheticTTLock.provision({requestId:'TEST fixture'}).physicalDoorOpened,false);
 }finally{f.store.close();}
});
test('binding changes, checkout, cancellation and boxing revoke encrypted test codes without changing financial state',()=>{
 for(const transition of ['remove','cancel','box','checkout']){
  const f=fixture();try{f.connect();f.bind();const accessId=f.read().rows[0].accessId,order=f.order();
   if(transition==='remove')f.command('smart_lock_remove',{lockId:f.read().rows[0].lock.id});
   if(transition==='cancel')f.command('cancel',{orderId:f.orderId,reason:'TEST cancellation',finalCharge:0});
   if(transition==='checkout'){f.command('checkin',{orderId:f.orderId,date:day});f.command('checkout',{orderId:f.orderId,date:'2027-01-12'});}
   if(transition==='box')f.command('box_stays',{orderIds:[f.orderId],reason:'TEST box'});
   const row=f.store.db.prepare('SELECT * FROM sl_access WHERE id=?').get(accessId);assert.equal(row.pin,null);assert.equal(row.status,'test_revoked');assert.equal(f.order().transactions.length,order.transactions.length);
  }finally{f.store.close();}
 }
});
test('device settings cannot be granted around admin/property rules; passcodes require current account authority',()=>{
 const f=fixture();try{
  for(const who of [f.ops,f.viewer,f.finance])assert.throws(()=>f.command('smart_lock_connect',{brand:ttLockBrand},who),/forbidden/);
  f.store.db.prepare('INSERT INTO member_permissions VALUES(?,?,?,?,?)').run(f.ops.id,pid,'smart_lock_connect',f.admin.id,new Date().toISOString());assert.throws(()=>f.command('smart_lock_connect',{brand:ttLockBrand},f.ops),/forbidden/);
  f.connect();f.bind();for(const who of [f.viewer,f.finance])assert.throws(()=>f.action('generate',{},who),/forbidden/);
  assert.throws(()=>f.store.checkin.lockRead(f.ops,'TEST-PG',f.orderId),/forbidden/);
  f.store.db.prepare('UPDATE users SET active=0 WHERE id=?').run(f.ops.id);assert.throws(()=>f.action('generate'),/login_required/);
 }finally{f.store.close();}
});
test('bound synthetic self-checkin reveals test-only PINs after existing review safeguards; unbound stays stay disconnected',async()=>{
 const f=fixture();try{
  const sc=(type,fields={},revision=0)=>f.store.checkin.command(f.admin,{key:randomUUID(),expectedRevision:revision,command:{type,propertyId:pid,...fields}});
  sc('sc_policy_save',{enabled:true,requirePayment:true,requiredDeposit:0,registrationMode:'all',instructions:'TEST only'});
  const invite=sc('sc_invite',{orderId:f.orderId});
  f.store.checkin.register(invite.token,{revision:1,consent:true,people:[{name:'TEST occupant',documentType:'passport',documentNumber:'TESTSYNTH123'}]});
  sc('sc_review',{grantId:invite.grantId,review:'approved',reason:'TEST fixture'},2);
  await assert.rejects(f.store.checkin.requestAccess(invite.token),/checkin_lock_offline/);
  f.connect();f.bind();f.bind('common');const session=await f.store.checkin.requestAccess(invite.token);
  assert.equal(session.synthetic,true);assert.equal(session.physicalDoorOpened,false);assert.equal(session.accessStatus,'test_active');assert.equal(session.testPasscodes.length,2);assert.equal(f.order().status,'confirmed');assert.equal(f.store.db.prepare('SELECT count(*) n FROM sc_access').get().n,0);
  for(const row of f.read().rows)f.command('smart_lock_remove',{lockId:row.lock.id});
  const gone=f.store.checkin.session(invite.token);assert.equal(gone.pin,undefined);assert.equal(gone.accessStatus,'not_connected');
 }finally{f.store.close();}
});
test('automatic view refresh honors lead time and OFF; offline synthetic locks and missing keys mint nothing',()=>{
 const f=fixture();try{
  f.setNow('2027-01-06T07:00:00Z');f.connect();f.bind();assert.equal(f.action('auto_generate').rows[0].pin,undefined);
  f.setNow('2027-01-07T07:00:00Z');assert.match(f.action('auto_generate').rows[0].pin,/^\d{6}$/);
  const lock=f.read().rows[0].lock;f.bind('private',{lockId:lock.id,online:false});assert.equal(f.action('generate').rows[0].pin,undefined);
  f.setting({autoGenerate:false});f.bind('private',{lockId:lock.id,online:true});assert.equal(f.action('auto_generate').rows[0].pin,undefined);
  f.store.checkin.key=null;assert.throws(()=>f.action('generate'),/checkin_key_missing/);
 }finally{f.store.close();}
});
test('settings and binding commands retain idempotency, revision and property-role protections',()=>{
 const f=fixture();try{
  const request={key:randomUUID(),expectedRevision:f.store.read(f.admin).revisions[pid],command:{type:'smart_lock_connect',propertyId:pid,brand:ttLockBrand}};
  const first=f.store.command(f.admin,request);assert.equal(f.store.command(f.admin,request).id,first.id);
  assert.throws(()=>f.store.command(f.admin,{...request,key:randomUUID()}),/stale_revision/);
  f.store.db.prepare("UPDATE user_properties SET role='operations' WHERE user_id=? AND property_id=?").run(f.admin.id,pid);
  assert.throws(()=>f.store.command(f.admin,request),/forbidden/);
 }finally{f.store.close();}
});

test('TEST names preserve staff prefix and repair legacy double prefix without rebinding',()=>{
 for(const name of ['TEST-101 客房锁','test101','Test · Lobby','TEST Lobby'])assert.equal(smartLockName(name),name);
 assert.equal(smartLockName('101'),'TEST · 101');
 assert.equal(smartLockName('TEST · TEST-101 客房锁'),'TEST-101 客房锁');
 const f=fixture();try{f.connect();f.bind('private',{name:'test-101'});assert.equal(f.read().rows[0].lock.name,'test-101');}finally{f.store.close();}
});
test('hourly Malaysia actual instants define both door windows independently of all lead days',()=>{
 const order={start:'2026-11-11',end:'2026-11-12',arrivalTime:'15:00',departureTime:'12:00',hourly:{usageDate:'2026-11-11',startTime:'14:00',endTime:'17:00'}};
 for(const kind of ['private','common'])for(let leadDays=0;leadDays<=3;leadDays++)assert.deepEqual(smartLockWindow(order,{kind},{privateBefore:12,privateAfter:12,commonBefore:12,commonAfter:12,leadDays}),{from:Date.parse('2026-11-11T02:00:00+08:00'),until:Date.parse('2026-11-12T05:00:00+08:00')});
 assert.deepEqual(smartLockWindow({start:'2026-11-11',end:'2026-11-12',arrivalTime:'16:30',departureTime:'10:15'},{kind:'private'},{privateBefore:0,privateAfter:0}),{from:Date.parse('2026-11-11T16:30:00+08:00'),until:Date.parse('2026-11-12T10:15:00+08:00')});
});
test('saved hourly stays replace legacy window signatures, clear stale ciphertext and use actual lead threshold',()=>{
 const f=fixture();try{
  f.setNow('2027-01-07T06:00:00Z');f.connect();f.bind();f.bind('common');
  // Model an already saved hourly stay and pre-fix encrypted passcodes, without altering guest/financial data.
  const body=f.store.checkin.body(pid);body.orders.find(o=>o.id===f.orderId).hourly={usageDate:day,startTime:'14:00',endTime:'17:00'};
  f.store.db.prepare('UPDATE properties SET body=? WHERE id=?').run(JSON.stringify(body),pid);
  f.store.db.prepare("UPDATE sl_access SET signature='legacy-hotel-window'").run();
  const old=f.store.db.prepare('SELECT id FROM sl_access').all();
  const read=f.read();assert(read.rows.every(r=>!r.pin&&r.from===Date.parse(day+'T02:00:00+08:00')&&r.until===Date.parse(day+'T21:00:00Z')));
  for(const {id} of old){const row=f.store.db.prepare('SELECT pin,status FROM sl_access WHERE id=?').get(id);assert.equal(row.pin,null);assert.equal(row.status,'test_revoked');}
  assert(f.action('auto_generate').rows.every(r=>r.pin));
  f.setNow('2027-01-10T09:00:00Z');assert.throws(()=>f.action('generate'),/smart_lock_stay_unavailable/);
 }finally{f.store.close();}
});
