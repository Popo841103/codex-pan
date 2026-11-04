import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {Store} from '../server/store.js';
const pid='TEST-KL',day='2027-01-10',end='2027-01-12';
const req=(type,command={},revision=0,key=randomUUID())=>({key,expectedRevision:revision,command:{type,propertyId:pid,...command}});
function fixture({connected=false,people=1,assigned=true}={}){
 let now=Date.parse(day+'T07:05:00Z');const calls=[];
 const accessProvider={status:()=>({provider:'TEST_ONLY',connected,tested:connected}),async provision(command){calls.push(command);return {externalId:'TEST confirmed device',deviceConfirmed:true};}};
 const store=new Store(':memory:',{selfCheckin:{key:randomBytes(32),clock:()=>now,accessProvider}});store.seedTestProperties();
 const user=role=>store.createUser({username:'test-desk-'+role+'-'+randomUUID().slice(0,6),password:'test-password-only',role,propertyIds:[pid]});
 const admin=user('admin'),ops=user('operations'),finance=user('finance'),viewer=user('viewer');
 const parent=store.command(ops,req('create_reservation',{date:day,guest:'TEST desk guest',bookingKind:'individual',source:'booking',mode:'reserve',autoAssign:assigned,stays:[{productId:'room',roomTypeId:'TEST-KL-legacy-room-any',gender:'any',start:day,end,nightly:10000,adults:people,children:0,infants:0,occupants:Array.from({length:people},()=>({name:'',gender:'any'}))}]}));
 const order=store.read(ops).orders.find(o=>o.reservationId===parent.id);
 store.checkin.command(admin,req('sc_policy_save',{enabled:true,requirePayment:true,requiredDeposit:0,registrationMode:'all',instructions:'TEST instructions'}));
 const invite=store.checkin.command(ops,req('sc_invite',{orderId:order.id}));
 return {store,admin,ops,finance,viewer,order,invite,calls,setNow:value=>now=Date.parse(value)};
}
function register(f,people=1){return f.store.checkin.register(f.invite.token,{revision:1,consent:true,people:Array.from({length:people},(_,i)=>({name:'TEST occupant '+i,documentType:'passport',documentNumber:'TESTP'+String(987654+i)}))});}
function grantOf(f){return f.store.checkin.read(f.ops,pid).grants.find(g=>g.id===f.invite.grantId);}
function approve(f){const g=grantOf(f);return f.store.checkin.command(f.admin,req('sc_review',{grantId:g.id,review:'approved',reason:'TEST verified identity'},g.revision));}
function pay(f){return f.store.command(f.finance,req('payment',{orderId:f.order.id,kind:'payment',method:'cash',amount:20000},f.store.read(f.ops).revisions[pid]));}
function desk(f,actor=f.admin,overrides={}){const g=grantOf(f);return f.store.checkin.command(actor,req('sc_checkin',{grantId:g.id,...overrides},g.revision));}
const status=f=>f.store.read(f.ops).orders.find(o=>o.id===f.order.id).status;

test('an approved registration is checked in at the desk with its registered names, and no door code is minted',()=>{
 const f=fixture();try{
  register(f);approve(f);pay(f);
  const before=grantOf(f);assert.equal(before.checkinReady,true);assert.equal(before.checkedIn,false);
  assert.equal(f.store.checkin.session(f.invite.token).canRequestAccess,false,'the lock is still unconnected');
  const result=desk(f);
  assert.equal(result.checkedIn,true);assert.equal(result.orderId,f.order.id);assert.equal(result.date,day);
  assert.equal(typeof result.businessRevision,'number');
  const order=f.store.read(f.ops).orders.find(o=>o.id===f.order.id);
  assert.equal(order.status,'checked_in');assert.equal(order.occupants[0].name,'TEST occupant 0');
  assert.equal(f.store.db.prepare('SELECT COUNT(*) n FROM sc_access').get().n,0,'no PIN, no provisioned lock');
  assert.equal(f.calls.length,0,'the provider was never called');
  assert.equal(f.store.read(f.ops).audit.filter(a=>a.type==='checkin').length,1,'the real business check-in was audited');
  assert.equal(f.store.db.prepare("SELECT COUNT(*) n FROM sc_audit WHERE action='sc_checkin'").get().n,1);
  const after=grantOf(f);assert.equal(after.checkedIn,true);assert.equal(after.checkinReady,false);
  assert.equal(after.review,'approved','checking in does not undo the identity decision');
 }finally{f.store.close();}
});
test('a desk check-in is idempotent by request key and its append-only audit never doubles',()=>{
 const f=fixture();try{
  register(f);approve(f);pay(f);
  const g=grantOf(f),key=randomUUID();
  const first=f.store.checkin.command(f.admin,req('sc_checkin',{grantId:g.id},g.revision,key));
  const replay=f.store.checkin.command(f.admin,req('sc_checkin',{grantId:g.id},g.revision,key));
  assert.equal(replay.replayed,true);assert.equal(replay.orderId,first.orderId);assert.equal(replay.businessRevision,first.businessRevision);
  assert.equal(f.store.db.prepare("SELECT COUNT(*) n FROM sc_audit WHERE action='sc_checkin'").get().n,1);
  assert.equal(f.store.read(f.ops).audit.filter(a=>a.type==='checkin').length,1);
  assert.throws(()=>f.store.checkin.command(f.admin,req('sc_checkin',{grantId:g.id,reason:'forged'},g.revision,key)),/idempotency_mismatch/);
 }finally{f.store.close();}
});
test('every guest-side gate still applies before the desk can check a stay in',()=>{
 const cases=[
  {name:'not yet approved',options:{},prepare:f=>register(f),expect:/checkin_review_pending/},
  {name:'room charges unpaid',options:{},prepare:f=>{register(f);approve(f);},expect:/checkin_payment/},
  {name:'no room assigned',options:{assigned:false},prepare:f=>{register(f);approve(f);pay(f);},expect:/checkin_assignment/},
  {name:'room not clean',options:{},prepare:f=>{register(f);approve(f);pay(f);f.store.command(f.ops,req('bulk_clean',{resourceIds:[f.order.resourceId],cleaning:'dirty'},f.store.read(f.ops).revisions[pid]));},expect:/checkin_cleaning/},
  {name:'before arrival time',options:{},prepare:f=>{register(f);approve(f);pay(f);f.setNow(day+'T06:59:00Z');},expect:/checkin_time/},
  {name:'reviewer no longer active',options:{},actor:'ops',prepare:f=>{register(f);approve(f);pay(f);f.store.db.prepare('UPDATE users SET active=0 WHERE id=?').run(f.admin.id);},expect:/checkin_review_pending/},
  {name:'deposit still required',options:{},prepare:f=>{register(f);approve(f);pay(f);f.store.checkin.command(f.admin,req('sc_policy_save',{enabled:true,requirePayment:true,requiredDeposit:5000,registrationMode:'all',instructions:''},1));},expect:/checkin_deposit/}
 ];
 for(const c of cases){const f=fixture(c.options);try{
   c.prepare(f);
   assert.throws(()=>desk(f,c.actor==='ops'?f.ops:f.admin),c.expect,c.name);
   assert.equal(status(f),'confirmed',c.name+' leaves the stay untouched');
   assert.equal(f.store.db.prepare('SELECT COUNT(*) n FROM sc_access').get().n,0,c.name+' mints no door code');
   assert.equal(f.store.read(f.ops).audit.filter(a=>a.type==='checkin').length,0,c.name+' writes no business check-in');
  }finally{f.store.close();}}
});
test('paying a held deposit then checking in succeeds without a device',()=>{
 const f=fixture();try{
  register(f);approve(f);pay(f);
  f.store.checkin.command(f.admin,req('sc_policy_save',{enabled:true,requirePayment:true,requiredDeposit:5000,registrationMode:'all',instructions:''},1));
  f.store.command(f.finance,req('payment',{orderId:f.order.id,kind:'deposit_in',amount:5000,method:'cash'},f.store.read(f.ops).revisions[pid]));
  assert.equal(grantOf(f).checkinReady,true);
  assert.equal(desk(f).checkedIn,true);assert.equal(status(f),'checked_in');
 }finally{f.store.close();}
});
test('an already checked-in stay cannot be checked in twice, and a changed room invalidates the approval',()=>{
 const f=fixture();try{
  register(f);approve(f);pay(f);desk(f);
  assert.throws(()=>desk(f),/checkin_unavailable/);
  assert.equal(status(f),'checked_in');
  assert.equal(f.store.db.prepare("SELECT COUNT(*) n FROM sc_audit WHERE action='sc_checkin'").get().n,1);
 }finally{f.store.close();}
 const g=fixture();try{
  register(g);approve(g);pay(g);
  g.store.command(g.ops,req('assign',{orderId:g.order.id,resourceId:'TEST-KL-R2'},g.store.read(g.ops).revisions[pid]));
  assert.equal(grantOf(g).review,'pending','the order change reset the approval');
  assert.equal(grantOf(g).checkinReady,false);
  assert.throws(()=>desk(g),/checkin_review_pending/);
  assert.equal(status(g),'confirmed');
 }finally{g.store.close();}
});
test('only desk roles may check in, and a grant cannot be used from another property',()=>{
 const f=fixture();try{
  register(f);approve(f);pay(f);const g=grantOf(f);
  assert.throws(()=>f.store.checkin.command(f.finance,req('sc_checkin',{grantId:g.id},g.revision)),/forbidden/);
  assert.throws(()=>f.store.checkin.command(f.viewer,req('sc_checkin',{grantId:g.id},g.revision)),/forbidden/);
  const outsider=f.store.createUser({username:'test-desk-out-'+randomUUID().slice(0,6),password:'test-password-only',role:'admin',propertyIds:['TEST-PG']});
  assert.throws(()=>f.store.checkin.command(outsider,req('sc_checkin',{grantId:g.id},g.revision)),/forbidden/);
  assert.equal(status(f),'confirmed');
  assert.equal(f.store.checkin.command(f.ops,req('sc_checkin',{grantId:g.id},g.revision)).checkedIn,true,'operations may check in');
 }finally{f.store.close();}
});
test('stale revision, an unknown grant and malformed input are refused without changing the stay',()=>{
 const f=fixture();try{
  register(f);approve(f);pay(f);const g=grantOf(f);
  assert.throws(()=>f.store.checkin.command(f.admin,req('sc_checkin',{grantId:g.id},g.revision+1)),/checkin_stale/);
  assert.throws(()=>f.store.checkin.command(f.admin,req('sc_checkin',{grantId:'no-such-grant'},g.revision)),/checkin_not_found/);
  assert.throws(()=>f.store.checkin.command(f.admin,{key:'short',expectedRevision:g.revision,command:{type:'sc_checkin',propertyId:pid,grantId:g.id}}),/checkin_input/);
  assert.equal(status(f),'confirmed');assert.equal(grantOf(f).checkinReady,true);
 }finally{f.store.close();}
});
test('a multi-occupant registration fills every approved name into the stay',()=>{
 const f=fixture({people:2});try{
  register(f,2);approve(f);pay(f);
  assert.equal(grantOf(f).checkinReady,true);
  assert.equal(desk(f).checkedIn,true);
  const order=f.store.read(f.ops).orders.find(o=>o.id===f.order.id);
  assert.deepEqual(order.occupants.map(p=>p.name),['TEST occupant 0','TEST occupant 1']);
  assert.equal(order.status,'checked_in');
 }finally{f.store.close();}
});
