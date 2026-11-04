import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Store} from '../server/store.js';
import {defaultRetentionDays,minRetentionDays,maxRetentionDays} from '../server/self-checkin.js';

const pid='TEST-KL',other='TEST-PG',day='2027-01-10',end='2027-01-12';
const req=(type,command={},revision=0,key=randomUUID(),propertyId=pid)=>({key,expectedRevision:revision,command:{type,propertyId,...command}});
function fixture(){
 let now=Date.parse(day+'T07:05:00Z');
 const store=new Store(':memory:',{selfCheckin:{key:randomBytes(32),clock:()=>now}});store.seedTestProperties();
 const user=(role,pids=[pid])=>store.createUser({username:'test-ret-'+role+'-'+randomUUID().slice(0,6),password:'test-password-only',role,propertyIds:pids});
 const admin=user('admin',[pid,other]),ops=user('operations'),finance=user('finance'),viewer=user('viewer');
 const parent=store.command(ops,req('create_reservation',{date:day,guest:'TEST identity guest',bookingKind:'individual',source:'booking',mode:'reserve',autoAssign:true,
   stays:[{productId:'room',roomTypeId:'TEST-KL-legacy-room-any',gender:'any',start:day,end,nightly:10000,adults:1,children:0,infants:0,occupants:[{name:'',gender:'any'}]}]}));
 const order=store.read(ops).orders.find(o=>o.reservationId===parent.id);
 const saved=store.checkin.command(admin,req('sc_policy_save',{enabled:true,requirePayment:true,requiredDeposit:0,registrationMode:'all',instructions:''}));
 const invite=store.checkin.command(ops,req('sc_invite',{orderId:order.id}));
 store.checkin.register(invite.token,{revision:1,consent:true,people:[{name:'TEST identity guest',documentType:'passport',documentNumber:'TESTP123456'}]});
 return {store,admin,ops,finance,viewer,order,invite,policyRevision:saved.revision,
   setNow:value=>{now=Date.parse(value);},grant:()=>store.checkin.read(admin,pid).grants[0],
   row:()=>store.db.prepare('SELECT * FROM sc_grants WHERE order_id=?').get(order.id),
   purge:(actor=admin,revision=saved.revision,key=randomUUID())=>store.checkin.command(actor,req('sc_purge_identity',{},revision,key))};
}
const audits=f=>f.store.db.prepare("SELECT * FROM sc_audit WHERE action='sc_purge_identity'").all();

test('an existing policy without a retention period keeps its old behaviour and reads the documented default',()=>{
 const f=fixture();try{
  assert.equal(defaultRetentionDays,90);
  assert.equal(f.store.checkin.policy(pid).retentionDays,90,'the saved policy from an older caller gains the default');
  assert.equal(f.store.checkin.policy(other).retentionDays,90,'a property with no policy at all also defaults to 90');
  const body=JSON.parse(f.store.db.prepare('SELECT body FROM sc_policies WHERE property_id=?').get(pid).body);
  assert.equal(body.retentionDays,90,'saving through the current command stores the default period');
  // A policy row written by an older build has no retentionDays at all. Reading it
  // must supply the default without rewriting the stored row.
  const legacy={...body};delete legacy.retentionDays;
  f.store.db.prepare('UPDATE sc_policies SET body=? WHERE property_id=?').run(JSON.stringify(legacy),pid);
  assert.equal(f.store.checkin.policy(pid).retentionDays,90);
  assert.equal(JSON.parse(f.store.db.prepare('SELECT body FROM sc_policies WHERE property_id=?').get(pid).body).retentionDays,undefined,'a read never rewrites the old row');
  assert.equal(f.grant().identityPurged,false);
  assert.equal(f.row().purged_at,null,'nothing is purged without an explicit command');
 }finally{f.store.close();}
});

test('the retention period is a per-property, administrator-only, validated setting',()=>{
 const f=fixture();try{
  const saved=f.store.checkin.command(f.admin,req('sc_policy_save',{enabled:true,requirePayment:true,requiredDeposit:0,registrationMode:'all',instructions:'',retentionDays:30},f.policyRevision));
  assert.equal(saved.revision,f.policyRevision+1);
  assert.equal(f.store.checkin.policy(pid).retentionDays,30);
  assert.equal(f.store.checkin.policy(other).retentionDays,90,'another property is untouched');
  for(const bad of [0,minRetentionDays-1,maxRetentionDays+1,1.5,'30',null,NaN]){
   assert.throws(()=>f.store.checkin.command(f.admin,req('sc_policy_save',{enabled:true,requirePayment:true,requiredDeposit:0,registrationMode:'all',instructions:'',retentionDays:bad},saved.revision)),/checkin_input/,String(bad));
  }
  assert.equal(f.store.checkin.policy(pid).retentionDays,30,'a refused save changes nothing');
  assert.throws(()=>f.store.checkin.command(f.ops,req('sc_policy_save',{enabled:true,requirePayment:true,requiredDeposit:0,registrationMode:'all',instructions:'',retentionDays:7},saved.revision)),/forbidden/);
 }finally{f.store.close();}
});

test('the desk is told the cut-off and how many registrations would be purged, per property',()=>{
 const f=fixture();try{
  f.setNow('2027-06-10T07:05:00Z');
  const read=f.store.checkin.read(f.admin,pid);
  assert.deepEqual(read.retention,{days:90,cutoff:'2027-03-12',eligible:1},'the cut-off is computed on the server in property local time');
  assert.equal(f.store.checkin.read(f.admin,other).retention.eligible,0,'a property with no registrations has nothing to purge');
  assert.equal(f.row().submission!==null,true,'previewing does not delete anything');
  const shorter=f.store.checkin.command(f.admin,req('sc_policy_save',{enabled:true,requirePayment:true,requiredDeposit:0,registrationMode:'all',instructions:'',retentionDays:365},f.policyRevision));
  assert.equal(shorter.revision,f.policyRevision+1);
  assert.equal(f.store.checkin.read(f.admin,pid).retention.eligible,0,'a longer period keeps the same registration in scope');
 }finally{f.store.close();}
});

test('a stay that has not aged past the retention period is never purged',()=>{
 const f=fixture();try{
  f.setNow('2027-01-20T07:05:00Z');
  const result=f.purge();
  assert.equal(result.grantsCleared,0);
  assert.equal(result.cutoff,'2026-10-22');
  assert(f.row().submission,'the encrypted registration is still there');
  assert.equal(f.row().purged_at,null);
  assert.equal(audits(f).length,1,'even a no-op purge is recorded as a decision');
 }finally{f.store.close();}
});

test('only an administrator may purge, and a refused attempt clears nothing',()=>{
 const f=fixture();try{
  f.setNow('2027-06-10T07:05:00Z');
  for(const actor of [f.ops,f.finance,f.viewer])
   assert.throws(()=>f.purge(actor),/forbidden/,actor.role);
  assert(f.row().submission);assert.equal(f.row().purged_at,null);assert.equal(audits(f).length,0);
  const result=f.purge(f.admin);
  assert.equal(result.grantsCleared,1);
 }finally{f.store.close();}
});

test('purging removes only the encrypted identity payload and any door PIN, never the booking or its money',()=>{
 const f=fixture();try{
  const at=new Date(Date.parse('2027-06-10T07:05:00Z')).toISOString(),grantId=f.row().id;
  f.store.db.prepare('INSERT INTO sc_access VALUES(?,?,?,?,?,?,?,?,?)').run(randomUUID(),grantId,'TEST-SIG','active','ENCRYPTED-PIN','TEST-EXT',null,at,at);
  const beforeOrder=f.store.read(f.ops).orders.find(o=>o.id===f.order.id);
  const beforeRevision=f.store.read(f.ops).revisions[pid];
  const beforeReceipts=f.store.db.prepare('SELECT * FROM sc_receipts').all();
  f.setNow('2027-06-10T07:05:00Z');
  const result=f.purge();
  assert.equal(result.grantsCleared,1);assert.equal(result.pinsCleared,1);assert.equal(result.retentionDays,90);
  const row=f.row();
  assert.equal(row.submission,null);assert.equal(row.document_hashes,null);assert.equal(row.rejection_reason,null);
  assert(row.purged_at,'the purge is marked so the desk does not read it as a missing registration');
  assert.equal(row.status,'active','the grant row itself is kept, with its order link and audit trail');
  const access=f.store.db.prepare('SELECT * FROM sc_access WHERE grant_id=?').get(grantId);
  assert.equal(access.pin,null);assert.equal(access.reason,'identity_purged');assert.equal(access.status,'active','no device action is faked');
  const afterOrder=f.store.read(f.ops).orders.find(o=>o.id===f.order.id);
  assert.equal(afterOrder.status,beforeOrder.status);assert.equal(afterOrder.nightly,beforeOrder.nightly);
  assert.deepEqual(afterOrder.transactions,beforeOrder.transactions);
  assert.equal(f.store.read(f.ops).revisions[pid],beforeRevision,'purging is not a business mutation');
  const afterReceipts=f.store.db.prepare('SELECT * FROM sc_receipts').all();
  assert.equal(afterReceipts.length,beforeReceipts.length+1,'only the purge command adds its own idempotent receipt');
  for(const r of beforeReceipts)assert(afterReceipts.some(a=>a.request_key===r.request_key&&a.response===r.response),'existing receipts survive intact');
  const log=audits(f);
  assert.equal(log.length,1);
  assert.deepEqual(JSON.parse(log[0].summary),{cutoff:'2027-03-12',retentionDays:90,grantsCleared:1,pinsCleared:1});
  const trail=JSON.stringify(f.store.db.prepare('SELECT * FROM sc_audit').all())+JSON.stringify(f.store.db.prepare('SELECT * FROM sc_grants').all());
  assert(!trail.includes('TESTP123456'),'no document number survives in the audit or the grant');
  assert.throws(()=>f.store.db.prepare("DELETE FROM sc_audit WHERE action='sc_purge_identity'").run(),/checkin_append_only/);
 }finally{f.store.close();}
});

test('a purged registration is visible as purged and can no longer be reviewed or checked in',()=>{
 const f=fixture();try{
  f.setNow('2027-06-10T07:05:00Z');f.purge();
  const grant=f.grant();
  assert.equal(grant.identityPurged,true);assert.equal(grant.registered,0);assert.equal(grant.checkinReady,false);
  assert(grant.reasons.includes('checkin_identity_purged'),'the reason is stated instead of failing to decrypt');
  assert.throws(()=>f.store.checkin.command(f.admin,req('sc_review',{grantId:grant.id,review:'approved',reason:'TEST'},grant.revision)),/checkin_input/);
  assert.throws(()=>f.store.checkin.command(f.admin,req('sc_checkin',{grantId:grant.id},grant.revision)),/checkin_identity_purged/);
  assert.equal(f.store.read(f.ops).orders.find(o=>o.id===f.order.id).status,'confirmed','the stay was never checked in by a failed attempt');
 }finally{f.store.close();}
});

test('a purge is idempotent by request key and a stale revision is refused',()=>{
 const f=fixture();try{
  f.setNow('2027-06-10T07:05:00Z');
  const key=randomUUID(),first=f.purge(f.admin,f.policyRevision,key);
  const replay=f.purge(f.admin,f.policyRevision,key);
  assert.equal(replay.replayed,true);assert.equal(replay.grantsCleared,first.grantsCleared);
  assert.equal(audits(f).length,1,'a replay never writes a second audit row');
  assert.throws(()=>f.purge(f.admin,f.policyRevision-1),/checkin_stale/);
  assert.equal(audits(f).length,1);
 }finally{f.store.close();}
});

test('an older database gains the purge column without rebuilding the table or losing a registration',()=>{
 const dir=mkdtempSync(join(tmpdir(),'jovian-retention-'));
 try{
  const file=join(dir,'jovian.sqlite'),clock=()=>Date.parse(day+'T07:05:00Z');
  const first=new Store(file,{selfCheckin:{key:randomBytes(32),clock}});first.seedTestProperties();
  const admin=first.createUser({username:'test-ret-migrate-'+randomUUID().slice(0,6),password:'test-password-only',role:'admin',propertyIds:[pid]});
  const parent=first.command(admin,req('create_reservation',{date:day,guest:'TEST migration guest',bookingKind:'individual',source:'booking',mode:'reserve',autoAssign:true,
    stays:[{productId:'room',roomTypeId:'TEST-KL-legacy-room-any',gender:'any',start:day,end,nightly:10000,adults:1,children:0,infants:0,occupants:[{name:'',gender:'any'}]}]}));
  const order=first.read(admin).orders.find(o=>o.reservationId===parent.id);
  first.checkin.command(admin,req('sc_policy_save',{enabled:true,requirePayment:true,requiredDeposit:0,registrationMode:'all',instructions:''}));
  const invite=first.checkin.command(admin,req('sc_invite',{orderId:order.id}));
  first.checkin.register(invite.token,{revision:1,consent:true,people:[{name:'TEST migration guest',documentType:'passport',documentNumber:'TESTM654321'}]});
  const oldRow=first.db.prepare('SELECT * FROM sc_grants WHERE order_id=?').get(order.id);
  assert(oldRow.submission);
  // Simulate the older schema: the column did not exist when this row was written.
  first.db.exec('ALTER TABLE sc_grants DROP COLUMN purged_at');
  first.close();
  const second=new Store(file,{selfCheckin:{key:randomBytes(32),clock}});
  const columns=second.db.prepare('PRAGMA table_info(sc_grants)').all().map(c=>c.name);
  assert(columns.includes('purged_at'),'startup widens the old table');
  const kept=second.db.prepare('SELECT * FROM sc_grants WHERE order_id=?').get(order.id);
  assert.equal(kept.submission,oldRow.submission,'the encrypted registration survived intact');
  assert.equal(kept.purged_at,null,'an existing row is not marked as purged');
  second.close();
 }finally{rmSync(dir,{recursive:true,force:true});}
});
