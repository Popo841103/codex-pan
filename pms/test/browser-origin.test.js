import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Store } from '../server/store.js';
import { makeServer } from '../server/http.js';

// Node fetch does not implement document referrer policies. Explicit headers here
// cover the Chromium no-referrer failure; real navigation is checked separately.
test('browser form and JSON origins remain strict with same-origin policy', async t => {
  const store=new Store(':memory:'); store.seedTestProperties();
  const admin=store.createUser({username:'origin-admin',password:randomUUID(),role:'admin',propertyIds:['TEST-KL']});
  store.command(admin,{key:randomUUID(),expectedRevision:0,command:{type:'site_save',propertyId:'TEST-KL',slug:'origin-site',enabled:true,title:{en:'Synthetic'},roomTypeIds:[],planCodes:[]}});
  const server=makeServer(store); await new Promise(r=>server.listen(0,'127.0.0.1',r));
  t.after(async()=>{server.closeAllConnections();await new Promise(r=>server.close(r));store.close();});
  const base=`http://127.0.0.1:${server.address().port}`;
  const state=store.read(admin),roomType=state.roomTypes.find(x=>x.propertyId==='TEST-KL').id;
  const fields={username:'browser-owner',password:randomUUID(),store:'ORIGIN-TRIAL',storeName:'Synthetic',company:''}; fields.confirm=fields.password;
  const routes=[['/signup',fields,303],['/sites/origin-site/request',{roomType,from:'2027-09-01',to:'2027-09-02',guests:'1',name:'Synthetic',contact:'synthetic@example.invalid'},303],['/sites/origin-site/manage',{action:'lookup',reference:'00000000',contact:'synthetic@example.invalid'},200],['/api/login',{username:'absent',password:'invalid'},401]];
  for(const path of ['/signup','/sites/origin-site','/web/','/web/recovery.html','/web/self-checkin.html']){
    const res=await fetch(base+path);assert.equal(res.headers.get('referrer-policy'),'same-origin');
    assert.doesNotMatch(await res.text(),/<meta[^>]+name="referrer"[^>]+content="no-referrer"/);
  }
  for(const [path,input,status] of routes){
    const json=path.startsWith('/api/');
    const post=headers=>fetch(base+path,{method:'POST',redirect:'manual',headers:{'Content-Type':json?'application/json':'application/x-www-form-urlencoded',...headers},body:json?JSON.stringify(input):new URLSearchParams(input)});
    for(const headers of [ {'Origin':'null','Sec-Fetch-Site':'same-origin'}, {}, {'Origin':'https://attacker.invalid','Sec-Fetch-Site':'cross-site'}, {'Origin':base,'Sec-Fetch-Site':'cross-site'} ]){
      const res=await post(headers);assert.equal(res.status,403,path);assert.deepEqual(await res.json(),{error:'origin'});
    }
    const res=await post({'Origin':base,'Sec-Fetch-Site':'same-origin','Referer':base+'/signup'});
    assert.equal(res.status,status,path);assert.equal(res.headers.get('referrer-policy'),'same-origin');
    if(json)assert.equal((await res.json()).error,'credentials');
    if(res.status===303)assert.ok(res.headers.get('location').startsWith('/'));
  }
  assert.ok(store.db.prepare("SELECT 1 FROM users WHERE username='browser-owner'").get());
  assert.equal(store.db.prepare('SELECT COUNT(*) n FROM booking_requests').get().n,1);
});
