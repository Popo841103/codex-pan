import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync,rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomBytes,randomUUID } from 'node:crypto';
import { Store } from '../server/store.js';
import { makeServer } from '../server/http.js';
import { Backend } from '../web/backend.js';
test('frontend API client: two accounts share writes, stale revision is rejected and sessions revoke',async t=>{
 const dir=mkdtempSync(join(tmpdir(),'jovian-client-')),store=new Store(join(dir,'test.sqlite'));
 store.seedTestProperties();const password=randomBytes(20).toString('hex');
 for(const username of ['operator-one','operator-two'])store.createUser({username,password,role:'operations',propertyIds:['TEST-KL']});
 const server=makeServer(store);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 t.after(async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));store.close();rmSync(dir,{recursive:true,force:true});});
 const base=`http://127.0.0.1:${server.address().port}`;
 const client=()=>{
  let cookie='';
  return new Backend(async(path,options={})=>{
   const response=await fetch(base+path,{...options,headers:{Origin:base,Cookie:cookie,...options.headers}});
   const issued=response.headers.get('set-cookie');if(issued)cookie=issued.split(';')[0];return response;
  });
 };
 const a=client(),b=client();await a.connect();await b.connect();assert.equal(a.shared,true);assert.equal(a.user,null);
 await a.login('operator-one',password);await b.login('operator-two',password);
 assert.ok(a.user.allowedActions.includes('create'));
 const first=await b.state();assert.equal(first.orders.length,0);
 const command={type:'create',propertyId:'TEST-KL',guest:'TEST Shared Guest',productId:'room',gender:'any',start:'2027-01-10',end:'2027-01-12',nightly:10000};
 await a.execute(command,0,randomUUID());
 const state=await b.state();assert.equal(state.orders.length,1);assert.equal(state.properties.length,1);
 await assert.rejects(()=>b.execute(command,first.revisions['TEST-KL'],randomUUID()),/stale_revision/);
 const payment={type:'payment',propertyId:'TEST-KL',orderId:state.orders[0].id,amount:5000,kind:'payment',method:'bank'};
 const key=randomUUID();await b.execute(payment,state.revisions['TEST-KL'],key);await b.execute(payment,state.revisions['TEST-KL'],key);
 const updated=await a.state();assert.equal(updated.orders[0].transactions.length,1);assert.equal(updated.audit[0].actor,'operator-two');
 assert.equal(updated.audit[0].amount,5000);
 await b.logout();await assert.rejects(()=>b.state(),/login_required/);
});
test('client recognizes legacy static 404, but never falls back after server failure',async()=>{
 const legacy=new Backend(async()=>new Response('',{status:404}));await legacy.connect();assert.equal(legacy.shared,false);
 const broken=new Backend(async()=>new Response('',{status:500}));await assert.rejects(()=>broken.connect(),/connection/);
});
