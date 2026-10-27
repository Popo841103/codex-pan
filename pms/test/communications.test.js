import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdtempSync,writeFileSync,chmodSync,rmSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Store} from '../server/store.js';
import {NobedsMessages,MessagingError,loadMessagingConfig} from '../server/nobeds-messages.js';
import {makeServer} from '../server/http.js';
const pid='TEST-KL';
test('NOBEDS config requires private files and rejects malformed credentials without exposing them',()=>{
 const dir=mkdtempSync(join(tmpdir(),'jovian-config-')),path=join(dir,'messages.secret.json');
 const config={[pid]:{hotelId:47,token:'TEST-ONLY-NOT-REAL',channels:['booking'],sendEnabled:false}};
 try{
  assert.deepEqual(loadMessagingConfig(),{});
  writeFileSync(path,JSON.stringify(config),{mode:0o600});assert.deepEqual(loadMessagingConfig(path),config);
  chmodSync(path,0o644);assert.throws(()=>loadMessagingConfig(path),error=>!error.message.includes(config[pid].token)&&/Invalid PMS_NOBEDS_CONFIG/.test(error.message));
  chmodSync(path,0o600);symlinkSync(path,join(dir,'link'));assert.throws(()=>loadMessagingConfig(join(dir,'link')),/Invalid PMS_NOBEDS_CONFIG/);
  config[pid].channels=['unverified-ota'];writeFileSync(path,JSON.stringify(config));assert.throws(()=>loadMessagingConfig(path),/Invalid PMS_NOBEDS_CONFIG/);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
const request=(type,command={},revision=0,key=randomUUID())=>({key,expectedRevision:revision,command:{type,propertyId:pid,...command}});
function fixture(){
 const calls=[],config={[pid]:{hotelId:47,token:'TEST-CREDENTIAL-NOT-REAL',channels:['booking','airbnb'],sendEnabled:true}};
 let mode='success',rows=[{id:1,hotel_id:47,rid:901,message:'TEST guest <img src=x>',reply:'',created_at:'2026-10-27T09:00:00Z'}];
 const adapter=new NobedsMessages(config,async(url,options)=>{calls.push({path:url.pathname,query:url.search,method:options.method,body:options.body});
  if(url.pathname.includes('/bookings/'))return new Response(JSON.stringify([{hotel_id:47,order_id:901}]));
  if(options.method==='GET')return new Response(JSON.stringify(rows));
  if(mode==='timeout')throw Error('TEST credential must not leak: '+url.href);
  if(mode==='error-body')return new Response(JSON.stringify({errcode:42,error:'TEST reject'}));
  return new Response('{}');
 });
 const store=new Store(':memory:',{messagesAdapter:adapter});store.seedTestProperties();
 const user=role=>store.createUser({username:'test-'+role+'-'+randomUUID().slice(0,8),password:'test-password-only',role,propertyIds:[pid]});
 const admin=user('admin'),ops=user('operations'),other=user('operations'),viewer=user('viewer'),finance=user('finance');
 const order=store.command(ops,request('create',{guest:'TEST payer',productId:'room',gender:'any',start:'2027-01-10',end:'2027-01-12',source:'booking'})).id;
 return {store,admin,ops,other,viewer,finance,order,calls,adapter,setMode:v=>mode=v,setRows:v=>rows=v};
}
async function bind(f){return f.store.guest.command(f.admin,request('guest_bind',{orderId:f.order,rid:901,channel:'booking',verified:true}));}
test('support tickets are private to creator and property administrators, without inventory revision changes',()=>{
 const f=fixture();try{
  const rev=f.store.read(f.ops).revisions[pid],created=f.store.support.command(f.ops,request('support_create',{title:'TEST problem',body:'TEST description',category:'orders',priority:'normal',orderId:f.order}));
  assert.equal(f.store.support.read(f.ops,pid).total,1);assert.equal(f.store.support.read(f.other,pid).total,0);assert.equal(f.store.support.read(f.admin,pid).total,1);
  assert.throws(()=>f.store.support.read(f.other,pid,{ticketId:created.ticketId}),/support_not_found/);
  assert.throws(()=>f.store.support.command(f.other,request('support_reply',{ticketId:created.ticketId,body:'TEST wrong user'},1)),/support_not_found/);
  assert.throws(()=>f.store.support.read(f.ops,'TEST-PG'),/forbidden/);assert.equal(f.store.read(f.ops).revisions[pid],rev);
 }finally{f.store.close();}
});
test('support reply, resolve and reopen enforce revisions and retain append-only audit',()=>{
 const f=fixture();try{
  const created=f.store.support.command(f.viewer,request('support_create',{title:'TEST help',body:'TEST initial',category:'access',priority:'normal'}));
  const reply=request('support_reply',{ticketId:created.ticketId,body:'TEST admin answer'},1);f.store.support.command(f.admin,reply);assert.equal(f.store.support.command(f.admin,reply).replayed,true);
  let state=f.store.support.read(f.viewer,pid,{ticketId:created.ticketId});assert.equal(state.selected.messages.length,2);assert.equal(state.selected.status,'waiting');
  assert.throws(()=>f.store.support.command(f.viewer,request('support_reply',{ticketId:created.ticketId,body:'TEST stale'},1)),/support_stale/);
  f.store.support.command(f.viewer,request('support_status',{ticketId:created.ticketId,status:'resolved'},2));
  assert.throws(()=>f.store.support.command(f.admin,request('support_reply',{ticketId:created.ticketId,body:'TEST late'},3)),/support_closed/);
  f.store.support.command(f.viewer,request('support_status',{ticketId:created.ticketId,status:'open'},3));
  assert.throws(()=>f.store.db.exec('DELETE FROM support_messages'),/support_append_only/);assert.throws(()=>f.store.db.exec('DELETE FROM support_audit'),/support_append_only/);
 }finally{f.store.close();}
});
test('support contacts require property admin and valid contacts, with no borrowed default service',()=>{
 const f=fixture();try{
  assert.equal(f.store.support.read(f.ops,pid).contact.email,'');const command=request('support_contact_save',{name:'TEST desk',email:'test@example.invalid',phone:'+60123456789',whatsapp:'+60123456789',hours:'TEST hours'});
  assert.throws(()=>f.store.support.command(f.ops,command),/forbidden/);f.store.support.command(f.admin,command);
  assert.equal(f.store.support.read(f.finance,pid).contact.name,'TEST desk');
  assert.throws(()=>f.store.support.command(f.admin,request('support_contact_save',{phone:'123456'},1)),/support_contact_input/);
  f.store.db.prepare('UPDATE users SET active=0 WHERE id=?').run(f.admin.id);assert.throws(()=>f.store.support.command(f.admin,command),/login_required/);
 }finally{f.store.close();}
});
test('OTA inbox binding verifies provider booking and scope; only authorized operations can read',async()=>{
 const f=fixture();try{
  assert.throws(()=>f.store.guest.read(f.finance,pid),/forbidden/);assert.throws(()=>f.store.guest.read(f.viewer,pid),/forbidden/);
  await assert.rejects(f.store.guest.command(f.ops,request('guest_bind',{orderId:f.order,rid:901,channel:'booking',verified:true})),/forbidden/);
  const saved=await bind(f);assert(saved.threadId);assert.equal(f.store.guest.read(f.ops,pid).threads.length,1);
  assert(!JSON.stringify(f.store.guest.read(f.ops,pid)).includes('TEST-CREDENTIAL'));
  assert.throws(()=>f.store.guest.read(f.ops,'TEST-PG'),/forbidden/);assert(f.calls[0].path.startsWith('/api/bookings/'));
 }finally{f.store.close();}
});
test('OTA sync is deduplicated, read does not mark handled, and notes never contact the provider',async()=>{
 const f=fixture();try{
  const {threadId}=await bind(f),sync=request('guest_sync',{threadId},1);await f.store.guest.command(f.ops,sync);await f.store.guest.command(f.ops,sync);
  let state=f.store.guest.read(f.ops,pid,{threadId});assert.equal(state.selected.messages.length,1);assert.equal(state.threads[0].unread,1);
  const calls=f.calls.length;await f.store.guest.command(f.ops,request('guest_note',{threadId,body:'TEST internal'},2));assert.equal(f.calls.length,calls);
  await f.store.guest.command(f.ops,request('guest_handled',{threadId},3));state=f.store.guest.read(f.ops,pid,{threadId});assert.equal(state.threads[0].unread,0);
  assert.throws(()=>f.store.db.exec('DELETE FROM ota_messages'),/messages_append_only/);assert.throws(()=>f.store.db.exec('DELETE FROM ota_notes'),/messages_append_only/);
 }finally{f.store.close();}
});
test('OTA send retries return one accepted outbox record and never POST twice',async()=>{
 const f=fixture();try{
  const {threadId}=await bind(f),send=request('guest_send',{threadId,body:'TEST reply',confirmed:true},1);const result=await f.store.guest.command(f.ops,send);
  assert.equal(result.status,'provider_accepted');assert.equal((await f.store.guest.command(f.ops,send)).status,'provider_accepted');assert.equal(f.calls.filter(c=>c.method==='POST').length,1);
  assert.deepEqual(JSON.parse(f.calls.find(c=>c.method==='POST').body),{rid:901,reply:'TEST reply'});
  await assert.rejects(f.store.guest.command(f.ops,{...send,command:{...send.command,body:'TEST changed'}}),/idempotency_mismatch/);
 }finally{f.store.close();}
});
test('uncertain OTA sends do not retry and block new sends until explicit admin reconciliation',async()=>{
 const f=fixture();try{
  const {threadId}=await bind(f);f.setMode('timeout');const send=request('guest_send',{threadId,body:'TEST uncertain',confirmed:true},1);
  const result=await f.store.guest.command(f.ops,send);assert.equal(result.status,'unknown');await f.store.guest.command(f.ops,send);assert.equal(f.calls.filter(c=>c.method==='POST').length,1);
  await assert.rejects(f.store.guest.command(f.ops,request('guest_send',{threadId,body:'TEST duplicate',confirmed:true},2)),/messages_pending/);
  await assert.rejects(f.store.guest.command(f.ops,request('guest_reconcile',{threadId,outgoingId:result.outgoingId,status:'confirmed_not_sent',reason:'TEST checked',confirmed:true},2)),/forbidden/);
  await f.store.guest.command(f.admin,request('guest_reconcile',{threadId,outgoingId:result.outgoingId,status:'confirmed_not_sent',reason:'TEST checked actual OTA',confirmed:true},2));
  f.setMode('success');assert.equal((await f.store.guest.command(f.ops,request('guest_send',{threadId,body:'TEST new explicit request',confirmed:true},3))).status,'provider_accepted');
  assert(!JSON.stringify(f.store.guest.read(f.ops,pid,{threadId})).includes('TEST-CREDENTIAL'));
 }finally{f.store.close();}
});
test('200 with a provider error is rejected, malformed cross-property payload is not imported',async()=>{
 const f=fixture();try{
  const {threadId}=await bind(f);f.setMode('error-body');assert.equal((await f.store.guest.command(f.ops,request('guest_send',{threadId,body:'TEST rejected',confirmed:true},1))).status,'failed');
  f.setRows([{id:1,hotel_id:999,rid:901,message:'TEST foreign',reply:'',created_at:'2026-10-27T09:00:00Z'}]);await assert.rejects(f.store.guest.command(f.ops,request('guest_sync',{threadId},2)),/messages_contract/);
  assert.equal(f.store.guest.read(f.ops,pid,{threadId}).selected.messages.length,0);
 }finally{f.store.close();}
});
test('unconfigured provider never exposes fake threads or sends, source changes invalidate mappings',async()=>{
 const f=fixture();try{
  const {threadId}=await bind(f),order=f.store.read(f.ops).orders[0];f.store.command(f.ops,request('edit',{orderId:order.id,guest:order.guest,start:order.start,end:order.end,nightly:0,source:'airbnb'},1));
  await assert.rejects(f.store.guest.command(f.ops,request('guest_send',{threadId,body:'TEST wrong channel',confirmed:true},1)),/messages_mapping/);
  const empty=new Store(':memory:');try{empty.seedTestProperties();const u=empty.createUser({username:'test-empty',password:'test-password-only',role:'operations',propertyIds:[pid]});const state=empty.guest.read(u,pid);assert.equal(state.provider.configured,false);assert.equal(state.threads.length,0);}finally{empty.close();}
 }finally{f.store.close();}
});
test('communication HTTP APIs require auth and CSRF and serve only public UI assets',async t=>{
 const f=fixture(),server=makeServer(f.store);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));f.store.close();});
 const origin='http://127.0.0.1:'+server.address().port;assert.equal((await fetch(origin+'/api/support?propertyId='+pid)).status,401);
 const login=await fetch(origin+'/api/login',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({username:f.ops.username,password:'test-password-only'})});const auth=await login.json(),cookie=login.headers.get('set-cookie').split(';')[0];
 const payload=request('support_create',{title:'TEST HTTP',body:'TEST content',category:'system',priority:'normal'});
 const post=csrf=>fetch(origin+'/api/support/commands',{method:'POST',headers:{Origin:origin,Cookie:cookie,'Content-Type':'application/json',...(csrf?{'X-CSRF-Token':csrf}:{})},body:JSON.stringify(payload)});
 assert.equal((await post()).status,403);assert.equal((await post(auth.csrf)).status,200);
 assert.equal((await fetch(origin+'/web/communication-ui.js')).status,200);assert.equal((await fetch(origin+'/server/support.js')).status,404);
});
