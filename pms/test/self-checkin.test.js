import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {mkdtempSync,rmSync,readFileSync,chmodSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Store} from '../server/store.js';
import {makeServer} from '../server/http.js';
import {loadOrCreateGuestKey} from '../server/self-checkin.js';
const pid='TEST-KL',day='2027-01-10',end='2027-01-12';
const req=(type,command={},revision=0,key=randomUUID())=>({key,expectedRevision:revision,command:{type,propertyId:pid,...command}});
function fixture({connected=false,mode='confirmed',people=1}={}){
 let now=Date.parse(day+'T07:05:00Z');const calls=[];
 const accessProvider={status:()=>({provider:'TEST_ONLY',connected,tested:connected}),async provision(command){calls.push(command);if(mode==='timeout')throw Error('TEST offline');if(mode==='unconfirmed')return {externalId:'TEST accepted',deviceConfirmed:false};return {externalId:'TEST confirmed device',deviceConfirmed:true};}};
 const store=new Store(':memory:',{selfCheckin:{key:randomBytes(32),clock:()=>now,accessProvider}});store.seedTestProperties();
 const user=role=>store.createUser({username:'test-sc-'+role+'-'+randomUUID().slice(0,6),password:'test-password-only',role,propertyIds:[pid]});
 const admin=user('admin'),ops=user('operations'),finance=user('finance'),viewer=user('viewer');
 const parent=store.command(ops,req('create_reservation',{date:day,guest:'TEST payer',bookingKind:'individual',source:'booking',mode:'reserve',autoAssign:true,stays:[{productId:'room',roomTypeId:'TEST-KL-legacy-room-any',gender:'any',start:day,end,nightly:10000,adults:people,children:0,infants:0,occupants:Array.from({length:people},()=>({name:'',gender:'any'}))}]}));
 const order=store.read(ops).orders.find(o=>o.reservationId===parent.id);
 store.checkin.command(admin,req('sc_policy_save',{enabled:true,requirePayment:true,requiredDeposit:0,registrationMode:'all',instructions:'TEST approved instructions'}));
 const inviteRequest=req('sc_invite',{orderId:order.id});const invite=store.checkin.command(ops,inviteRequest);
 return {store,admin,ops,finance,viewer,order,invite,inviteRequest,calls,setNow:value=>now=Date.parse(value)};
}
function register(f,people=1){return f.store.checkin.register(f.invite.token,{revision:1,consent:true,people:Array.from({length:people},(_,i)=>({name:'TEST occupant '+i,documentType:'passport',documentNumber:'TESTP'+String(987654+i)}))});}
function approve(f){const grant=f.store.checkin.read(f.admin,pid).grants.find(g=>g.id===f.invite.grantId);return f.store.checkin.command(f.admin,req('sc_review',{grantId:grant.id,review:'approved',reason:'TEST verified identity in fixture'},grant.revision));}
function pay(f){return f.store.command(f.finance,req('payment',{orderId:f.order.id,kind:'payment',method:'cash',amount:20000},f.store.read(f.ops).revisions[pid]));}

test('invitation retries are idempotent and credentials are sealed, while number-only lookup is rejected',()=>{
 const f=fixture();try{
  const replay=f.store.checkin.command(f.ops,f.inviteRequest);assert.equal(replay.token,f.invite.token);assert.equal(replay.accessCode,f.invite.accessCode);
  const rows=JSON.stringify(f.store.db.prepare('SELECT * FROM sc_grants').all())+JSON.stringify(f.store.db.prepare('SELECT * FROM sc_receipts').all())+JSON.stringify(f.store.db.prepare('SELECT * FROM sc_audit').all());
  assert(!rows.includes(f.invite.token));assert(!rows.includes(f.invite.accessCode));
  assert.throws(()=>f.store.checkin.lookup({propertyId:pid,identifier:f.order.id,accessCode:'wrong'}),/checkin_lookup/);
  const session=f.store.checkin.lookup({propertyId:pid,identifier:f.order.id,accessCode:f.invite.accessCode});assert.equal(f.store.checkin.session(session.token).grantId,f.invite.grantId);
  assert.throws(()=>f.store.checkin.session('X'.repeat(43)),/checkin_unavailable/);
 }finally{f.store.close();}
});
test('identity is encrypted, full documents are an audited privileged view and registration is not check-in',()=>{
 const f=fixture();try{
  const before=f.store.read(f.ops).revisions[pid];const session=register(f);assert.equal(session.review,'pending');assert.equal(f.store.read(f.ops).orders[0].status,'confirmed');assert.equal(f.store.read(f.ops).revisions[pid],before);
  const raw=f.store.db.prepare('SELECT submission,document_hashes FROM sc_grants WHERE id=?').get(f.invite.grantId);assert(!JSON.stringify(raw).includes('TESTP987654'));assert(!JSON.stringify(f.store.checkin.read(f.ops,pid)).includes('TESTP987654'));
  assert.throws(()=>f.store.checkin.read(f.finance,pid),/forbidden/);assert.throws(()=>f.store.checkin.read(f.viewer,pid),/forbidden/);
  const view=f.store.checkin.command(f.ops,req('sc_document',{grantId:f.invite.grantId,reason:'TEST compare original'},2));assert.equal(view.people[0].documentNumber,'TESTP987654');
  assert.equal(f.store.db.prepare("SELECT COUNT(*) n FROM sc_audit WHERE action='sc_document'").get().n,1);
 }finally{f.store.close();}
});
test('all occupants, consent and review are required; invalid inputs leave the original encrypted submission intact',()=>{
 const f=fixture({people:2});try{
  assert.throws(()=>register(f,1),/checkin_people/);assert.throws(()=>f.store.checkin.register(f.invite.token,{revision:1,consent:false,people:[]}),/checkin_input/);
  register(f,2);const before=f.store.db.prepare('SELECT submission FROM sc_grants WHERE id=?').get(f.invite.grantId).submission;
  assert.throws(()=>f.store.checkin.register(f.invite.token,{revision:2,consent:true,people:[{name:'A',documentType:'passport',documentNumber:'!bad'},{name:'B',documentType:'passport',documentNumber:'TEST12345'}]}),/checkin_document/);
  assert.equal(f.store.db.prepare('SELECT submission FROM sc_grants WHERE id=?').get(f.invite.grantId).submission,before);
  assert(f.store.checkin.session(f.invite.token).reasons.includes('checkin_review_pending'));approve(f);assert.equal(f.store.checkin.session(f.invite.token).review,'approved');
 }finally{f.store.close();}
});
test('payment, arrival time, deposit, cleaning and reviewer authority are checked on every access request',async()=>{
 const f=fixture({connected:true});try{
  register(f);approve(f);await assert.rejects(f.store.checkin.requestAccess(f.invite.token),/checkin_payment/);assert.equal(f.calls.length,0);
  pay(f);f.setNow(day+'T06:59:00Z');assert(f.store.checkin.session(f.invite.token).reasons.includes('checkin_time'));f.setNow(day+'T07:05:00Z');
  f.store.checkin.command(f.admin,req('sc_policy_save',{enabled:true,requirePayment:true,requiredDeposit:5000,registrationMode:'all',instructions:''},1));assert(f.store.checkin.session(f.invite.token).reasons.includes('checkin_deposit'));
  f.store.command(f.finance,req('payment',{orderId:f.order.id,kind:'deposit_in',amount:5000,method:'cash'},f.store.read(f.ops).revisions[pid]));
  f.store.command(f.ops,req('bulk_clean',{resourceIds:[f.order.resourceId],cleaning:'dirty'},f.store.read(f.ops).revisions[pid]));assert(f.store.checkin.session(f.invite.token).reasons.includes('checkin_cleaning'));
  f.store.db.prepare('UPDATE users SET active=0 WHERE id=?').run(f.admin.id);assert(f.store.checkin.session(f.invite.token).reasons.includes('checkin_review_pending'));assert.equal(f.calls.length,0);
 }finally{f.store.close();}
});
test('unconnected locks do not generate local pretend codes or falsely check in the guest',async()=>{
 const f=fixture();try{
  register(f);approve(f);pay(f);await assert.rejects(f.store.checkin.requestAccess(f.invite.token),/checkin_lock_offline/);
  const state=f.store.checkin.session(f.invite.token);assert.equal(state.canRequestAccess,false);assert.equal(state.accessStatus,'not_connected');assert.equal(state.pin,undefined);assert.equal(f.store.db.prepare('SELECT COUNT(*) n FROM sc_access').get().n,0);assert.equal(f.store.read(f.ops).orders[0].status,'confirmed');
 }finally{f.store.close();}
});
test('only a confirmed test device can release six digits and complete the existing inventory check-in transaction',async()=>{
 const f=fixture({connected:true});try{
  register(f);approve(f);pay(f);const session=await f.store.checkin.requestAccess(f.invite.token);
  assert.match(session.pin,/^[0-9]{6}$/);assert.equal(session.accessStatus,'active');assert.equal(f.store.read(f.ops).orders[0].status,'checked_in');assert.equal(f.store.read(f.ops).orders[0].occupants[0].name,'TEST occupant 0');
  assert.equal((await f.store.checkin.requestAccess(f.invite.token)).pin,session.pin);assert.equal(f.calls.length,1);
  const raw=JSON.stringify(f.store.db.prepare('SELECT * FROM sc_access').all());assert(!raw.includes('"pin":"'+session.pin+'"'));
  assert.equal(f.store.read(f.ops).audit.filter(a=>a.type==='checkin').length,1);
 }finally{f.store.close();}
});
test('unconfirmed or timed-out devices never reveal a PIN and are not automatically retried',async()=>{
 for(const mode of ['unconfirmed','timeout']){const f=fixture({connected:true,mode});try{register(f);approve(f);pay(f);const session=await f.store.checkin.requestAccess(f.invite.token);assert.equal(session.accessStatus,'unknown');assert.equal(session.pin,undefined);await f.store.checkin.requestAccess(f.invite.token);assert.equal(f.calls.length,1);assert.equal(f.store.read(f.ops).orders[0].status,'confirmed');}finally{f.store.close();}}
});
test('moving a room invalidates prior approval and queues confirmed access for revocation without claiming deletion',async()=>{
 const f=fixture({connected:true});try{
  register(f);approve(f);pay(f);await f.store.checkin.requestAccess(f.invite.token);
  f.store.command(f.ops,req('assign',{orderId:f.order.id,resourceId:'TEST-KL-R2'},f.store.read(f.ops).revisions[pid]));const session=f.store.checkin.session(f.invite.token);
  assert.equal(session.review,'pending');assert.equal(session.pin,undefined);assert.equal(f.store.db.prepare('SELECT status FROM sc_access').get().status,'revoke_pending');
 }finally{f.store.close();}
});
test('changing arrival or departure hours invalidates the approved access window',async()=>{
 const f=fixture({connected:true});try{
  register(f);approve(f);pay(f);await f.store.checkin.requestAccess(f.invite.token);
  const order=f.store.read(f.ops).orders.find(o=>o.id===f.order.id);
  f.store.command(f.ops,req('edit',{...order,orderId:order.id,departureTime:'11:00'},f.store.read(f.ops).revisions[pid]));
  const session=f.store.checkin.session(f.invite.token);
  assert.equal(session.review,'pending');assert.equal(session.pin,undefined);
  assert.equal(f.store.db.prepare('SELECT status FROM sc_access').get().status,'revoke_pending');
 }finally{f.store.close();}
});
test('replacing or revoking invitations invalidates old links and lookup sessions, cancelled orders cannot regain access',()=>{
 const f=fixture();try{
  const oldSession=f.store.checkin.lookup({propertyId:pid,identifier:f.order.id,accessCode:f.invite.accessCode});
  const fresh=f.store.checkin.command(f.ops,req('sc_invite',{orderId:f.order.id}));assert.throws(()=>f.store.checkin.session(f.invite.token),/checkin_unavailable/);assert.throws(()=>f.store.checkin.session(oldSession.token),/checkin_unavailable/);
  f.store.command(f.ops,req('cancel',{orderId:f.order.id,reason:'TEST cancel',finalCharge:0},f.store.read(f.ops).revisions[pid]));assert.throws(()=>f.store.checkin.session(fresh.token),/checkin_unavailable/);
 }finally{f.store.close();}
});
test('document lookup only works with a private code after identity approval, and links expire by server time',()=>{
 const f=fixture();try{register(f);assert.throws(()=>f.store.checkin.lookup({propertyId:pid,identifier:'TESTP987654',accessCode:f.invite.accessCode}),/checkin_lookup/);approve(f);const result=f.store.checkin.lookup({propertyId:pid,identifier:'TESTP987654',accessCode:f.invite.accessCode});assert(result.token);f.setNow('2027-01-12T04:01:00Z');assert.throws(()=>f.store.checkin.session(result.token),/checkin_unavailable/);}finally{f.store.close();}
});
test('guest encryption keys persist privately and missing keys never silently replace encrypted history',()=>{
 const dir=mkdtempSync(join(tmpdir(),'jovian-key-'));try{const path=join(dir,'key'),first=loadOrCreateGuestKey(path);assert.deepEqual(loadOrCreateGuestKey(path),first);assert.equal(readFileSync(path).length,32);assert.throws(()=>loadOrCreateGuestKey(join(dir,'missing'),{allowCreate:false}),/original guest data key/);assert.equal(existsSync(join(dir,'missing')),false);chmodSync(path,0o644);assert.throws(()=>loadOrCreateGuestKey(path),/private regular file/);}finally{rmSync(dir,{recursive:true,force:true});}
});
test('public check-in API separates bearer scope from staff cookies, rejects cross-origin writes and serves a private registration page',async t=>{
 const f=fixture(),server=makeServer(f.store);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));f.store.close();});
 const origin='http://127.0.0.1:'+server.address().port;
 assert.equal((await fetch(origin+'/api/self-checkin/session')).status,401);
 const response=await fetch(origin+'/api/self-checkin/session',{headers:{Authorization:'Bearer '+f.invite.token}});assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');assert.equal((await response.json()).pin,undefined);
 const post=await fetch(origin+'/api/self-checkin/register',{method:'POST',headers:{Origin:'https://evil.invalid','Content-Type':'application/json',Authorization:'Bearer '+f.invite.token},body:JSON.stringify({})});assert.equal(post.status,403);
 const page=await fetch(origin+'/checkin/');assert.equal(page.status,200);assert.equal(page.headers.get('referrer-policy'),'same-origin');assert.equal((await fetch(origin+'/server/self-checkin.js')).status,404);
});
test('legacy single-stay orders without a stored type can complete check-in through their actual assigned resource',async()=>{
 const f=fixture({connected:true});try{
  const row=f.store.db.prepare('SELECT body FROM properties WHERE id=?').get(pid),body=JSON.parse(row.body);body.orders.find(o=>o.id===f.order.id).roomTypeId=null;f.store.db.prepare('UPDATE properties SET body=? WHERE id=?').run(JSON.stringify(body),pid);
  register(f);approve(f);pay(f);const result=await f.store.checkin.requestAccess(f.invite.token);assert.equal(result.accessStatus,'active');assert.equal(f.store.read(f.ops).orders[0].roomTypeId,'TEST-KL-legacy-room-any');assert.equal(f.store.read(f.ops).orders[0].status,'checked_in');
 }finally{f.store.close();}
});

test('a refused registration carries the reason to the guest, and registering again clears it',()=>{
 const f=fixture();try{
  register(f);
  const grant=f.store.checkin.read(f.admin,pid).grants.find(g=>g.id===f.invite.grantId);
  const refusal='TEST document photo unreadable, please submit again clearly';
  f.store.checkin.command(f.admin,req('sc_review',{grantId:grant.id,review:'rejected',reason:refusal},grant.revision));
  const refused=f.store.checkin.session(f.invite.token);
  assert.equal(refused.review,'rejected');
  assert.equal(refused.rejectionReason,refusal,'the guest is told what to put right, not only that they were refused');
  assert.equal(f.store.checkin.read(f.admin,pid).grants.find(g=>g.id===f.invite.grantId).rejectionReason,refusal,'the desk sees it too');
  // Approving is not a refusal, so no reason is carried forward from before.
  const again=f.store.checkin.read(f.admin,pid).grants.find(g=>g.id===f.invite.grantId);
  f.store.checkin.command(f.admin,req('sc_review',{grantId:again.id,review:'approved',reason:'TEST verified identity in fixture'},again.revision));
  assert.equal(f.store.checkin.session(f.invite.token).rejectionReason,null,'an approval shows no refusal note');
  // Registering again is the answer to a refusal, and the old note must not linger.
  const fresh=f.store.checkin.read(f.admin,pid).grants.find(g=>g.id===f.invite.grantId);
  f.store.checkin.command(f.admin,req('sc_review',{grantId:fresh.id,review:'rejected',reason:refusal},fresh.revision));
  const pending=f.store.checkin.session(f.invite.token);
  f.store.checkin.register(f.invite.token,{revision:pending.revision,consent:true,people:[{name:'TEST occupant 0',documentType:'passport',documentNumber:'TESTP987654'}]});
  const resubmitted=f.store.checkin.session(f.invite.token);
  assert.equal(resubmitted.review,'pending');
  assert.equal(resubmitted.rejectionReason,null,'a fresh submission starts over, without the old note still showing');
 }finally{f.store.close();}
});
