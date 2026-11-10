import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes, randomUUID } from 'node:crypto';
import { Worker } from 'node:worker_threads';
import { Store } from '../server/store.js';
import { makeServer } from '../server/http.js';
const password=()=>randomBytes(20).toString('hex');
function fixture(t){
 const dir=mkdtempSync(join(tmpdir(),'jovian-test-')),path=join(dir,'test.sqlite'),store=new Store(path);
 store.seedTestProperties();t.after(()=>{try{store.close();}catch{}rmSync(dir,{recursive:true,force:true});});
 const pass=password(),admin=store.createUser({username:'test-admin',password:pass,role:'admin',propertyIds:['TEST-KL','TEST-PG']});
 return {store,path,admin,pass};
}
const create=(extra={})=>({type:'create',propertyId:'TEST-KL',guest:'TEST Backend Guest',productId:'room',gender:'any',start:'2027-01-10',end:'2027-01-12',nightly:10000,...extra});
const execute=(store,user,command,revision=0,key=randomUUID())=>store.command(user,{command,expectedRevision:revision,key});
const code=(e,expected)=>e.message===expected;
test('persisted state survives closing/reopening; audit is atomic and append-only',t=>{
 const {store,path,admin}=fixture(t);
 const result=execute(store,admin,create());
 const reader=new Store(path);
 try{
 const state=reader.read(admin);assert.equal(state.orders[0].id,result.id);assert.equal(state.revisions['TEST-KL'],1);
 assert.equal(state.audit[0].actor,'test-admin');assert.equal(state.audit[0].type,'create');
 assert.throws(()=>store.db.prepare('DELETE FROM audit').run(),/audit_append_only/);
 assert.throws(()=>execute(store,admin,create({start:'2027-01-12',end:'2027-01-11'}),1));
 assert.equal(reader.read(admin).audit.length,1);
 }finally{reader.close();}
});
test('payment retry is idempotent and same key with different content fails',t=>{
 const {store,admin}=fixture(t),order=execute(store,admin,create());
 const command={type:'payment',propertyId:'TEST-KL',orderId:order.id,kind:'payment',method:'cash',amount:5000};
 const key=randomUUID(),first=execute(store,admin,command,1,key),second=execute(store,admin,command,1,key);
 assert.equal(first.id,second.id);assert.equal(second.replayed,true);
 assert.equal(store.read(admin).orders[0].transactions.length,1);
 assert.throws(()=>execute(store,admin,{...command,amount:6000},2,key),e=>code(e,'idempotency_mismatch'));
 assert.equal(store.read(admin).revisions['TEST-KL'],2);
});
test('permissions are checked in service and property data is filtered',t=>{
 const {store,admin}=fixture(t);
 const viewer=store.createUser({username:'test-viewer',password:password(),role:'viewer',propertyIds:['TEST-PG']});
 execute(store,admin,create());
 const state=store.read(viewer);assert.deepEqual(state.properties.map(p=>p.id),['TEST-PG']);assert.equal(state.orders.length,0);assert.equal(state.audit.length,0);
 assert.throws(()=>execute(store,viewer,create()),e=>code(e,'forbidden'));
 assert.throws(()=>execute(store,viewer,create({propertyId:'TEST-PG'})),e=>code(e,'forbidden'));
 const finance=store.createUser({username:'test-finance',password:password(),role:'finance',propertyIds:['TEST-KL']});
 assert.throws(()=>execute(store,finance,{type:'clean',propertyId:'TEST-KL',resourceId:'TEST-KL-R1'},1),e=>code(e,'forbidden'));
});
test('cross-store IDs and stale revision cannot mutate persisted orders',t=>{
 const {store,admin}=fixture(t),order=execute(store,admin,create());
 assert.throws(()=>execute(store,admin,{type:'assign',propertyId:'TEST-PG',orderId:order.id,resourceId:'TEST-PG-R1'}),e=>code(e,'scope'));
 assert.throws(()=>execute(store,admin,create(),0),e=>code(e,'stale_revision'));
 assert.equal(store.read(admin).orders.length,1);
});
test('passwords are hashed, sessions expire and can be revoked',t=>{
 const {store,admin,pass}=fixture(t);
 const row=store.db.prepare('SELECT * FROM users WHERE id=?').get(admin.id);
 assert.notEqual(row.password_hash,pass);assert.equal(row.password_hash.length,128);
 assert.throws(()=>store.login('test-admin','wrong'),e=>code(e,'credentials'));
 const login=store.login('test-admin',pass);assert.equal(store.session(login.token).user.id,admin.id);
 store.logout(login.token);assert.throws(()=>store.session(login.token),e=>code(e,'login_required'));
 const second=store.login('test-admin',pass);store.db.prepare('UPDATE sessions SET expires=0').run();
 assert.throws(()=>store.session(second.token),e=>code(e,'login_required'));
});
test('claims have database uniqueness; a failed allocation rolls back all state',t=>{
 const {store,admin}=fixture(t),a=execute(store,admin,create({resourceId:'TEST-KL-R1'}));
 assert.throws(()=>execute(store,admin,create({resourceId:'TEST-KL-R1'}),1),e=>code(e,'inventory_conflict'));
 assert.equal(store.read(admin).orders.length,1);assert.equal(store.read(admin).audit.length,1);
 assert.throws(()=>store.db.prepare('INSERT INTO claims VALUES(?,?,?,?)').run('TEST-KL','TEST-KL-R1','2027-01-10@00','other'),/UNIQUE/);
 assert.equal(store.read(admin).orders[0].id,a.id);
});
test('separate worker connections race for last room without overselling',async t=>{
 const {store,path,admin}=fixture(t);
 const body=JSON.parse(store.db.prepare('SELECT body FROM properties WHERE id=?').get('TEST-KL').body);
 body.resources=body.resources.filter(r=>r.id==='TEST-KL-R1');store.db.prepare('UPDATE properties SET body=? WHERE id=?').run(JSON.stringify(body),'TEST-KL');
 const flag=new SharedArrayBuffer(4),module=new URL('../server/store.js',import.meta.url).href;
 const worker=()=>new Promise((resolve,reject)=>{
  const w=new Worker(`const {parentPort,workerData}=require('node:worker_threads');(async()=>{const {Store}=await import(workerData.module);const s=new Store(workerData.path);parentPort.postMessage({ready:true});Atomics.wait(new Int32Array(workerData.flag),0,0);try{parentPort.postMessage({ok:true,value:s.command(workerData.user,workerData.payload)});}catch(e){parentPort.postMessage({ok:false,error:e.message});}finally{s.close();}})();`,{eval:true,workerData:{module,path,user:admin,flag,payload:{key:randomUUID(),expectedRevision:0,command:create()}}});
  w.on('message',m=>{if(m.ready){ready++;if(ready===2){Atomics.store(new Int32Array(flag),0,1);Atomics.notify(new Int32Array(flag),0);}}else resolve(m);});w.on('error',reject);
 });
 let ready=0;const results=await Promise.all([worker(),worker()]);
 assert.equal(results.filter(r=>r.ok).length,1);assert.equal(results.find(r=>!r.ok).error,'stale_revision');
 assert.throws(()=>execute(store,admin,create(),1),e=>code(e,'inventory_conflict'));
 assert.equal(store.read(admin).orders.length,1);
});
test('HTTP auth, CSRF, host checks and file allowlist',async t=>{
 const {store,pass}=fixture(t),server=makeServer(store);
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>{server.closeAllConnections();server.close(resolve);}));
 const base=`http://127.0.0.1:${server.address().port}`;
 let res=await fetch(base+'/api/state');assert.equal(res.status,401);
 res=await fetch(base+'/api/login',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({username:'test-admin',password:pass})});
 assert.equal(res.status,200);const cookie=res.headers.get('set-cookie').split(';')[0],auth=await res.json();
 assert.match(res.headers.get('set-cookie'),/HttpOnly/);
 res=await fetch(base+'/api/state',{headers:{Cookie:cookie}});assert.equal(res.status,200);
 res=await fetch(base+'/api/commands',{method:'POST',headers:{Origin:base,Cookie:cookie,'Content-Type':'application/json'},body:'{}'});assert.equal(res.status,403);
 res=await fetch(base+'/api/commands',{method:'POST',headers:{Origin:'https://other.example',Cookie:cookie,'X-CSRF-Token':auth.csrf,'Content-Type':'application/json'},body:'{}'});assert.equal(res.status,403);
 res=await fetch(base+'/api/commands',{method:'POST',headers:{Origin:base,Cookie:cookie,'X-CSRF-Token':auth.csrf,'Content-Type':'application/json'},body:JSON.stringify({key:randomUUID(),expectedRevision:0,command:create()})});assert.equal(res.status,200);
 for(const path of ['/.data/jovian.sqlite','/server/store.js','/test/server.test.js','/../package.json']){
  res=await fetch(base+path);assert.equal(res.status,404,path);
 }
 res=await fetch(base+'/web/');assert.equal(res.status,200);assert.match(res.headers.get('content-security-policy'),/frame-ancestors 'none'/);
 res=await fetch(base+'/api/logout',{method:'POST',headers:{Origin:base,Cookie:cookie,'X-CSRF-Token':auth.csrf}});assert.equal(res.status,200);
 res=await fetch(base+'/api/state',{headers:{Cookie:cookie}});assert.equal(res.status,401);
});
test('account setup CLI preserves existing data and never emits the password',async t=>{
 const {store,path,admin}=fixture(t);execute(store,admin,create());
 const {spawnSync}=await import('node:child_process');
 const pass=password();
 const args={username:'test-cli-ops',password:pass,role:'operations',propertyIds:['TEST-KL']};
 const run=spawnSync(process.execPath,['server/setup.js'],{cwd:new URL('../',import.meta.url),input:JSON.stringify(args),env:{...process.env,PMS_DB:path},encoding:'utf8'});
 assert.equal(run.status,0,run.stderr);assert.equal(run.stdout.includes(pass),false);
 const login=store.login('test-cli-ops',pass);assert.equal(login.user.role,'operations');assert.equal(store.read(login.user).orders.length,1);
 const check=spawnSync(process.execPath,['server/setup.js','--check'],{cwd:new URL('../',import.meta.url),env:{...process.env,PMS_DB:path},encoding:'utf8'});assert.equal(check.status,0);
});
