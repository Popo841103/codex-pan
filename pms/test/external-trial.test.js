import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { ExternalTrialStore } from '../server/external-trial-store.js';
import { makeServer } from '../server/http.js';

async function fixture(t) {
  const store=new ExternalTrialStore(':memory:');
  const server=makeServer(store,{externalTrial:true});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  t.after(async()=>{server.closeAllConnections();await new Promise(r=>server.close(r));store.close();});
  const base=`http://127.0.0.1:${server.address().port}`;
  const post=(path,data,auth)=>fetch(base+path,{method:'POST',redirect:'manual',headers:{Origin:base,'Content-Type':'application/json',...(auth?{Cookie:auth.cookie,'X-CSRF-Token':auth.csrf}:{})},body:JSON.stringify(data)});
  const get=(path,auth)=>fetch(base+path,{headers:auth?{Cookie:auth.cookie}:{}});
  async function apply(company,email) {
    const response=await fetch(base+'/trial/apply',{method:'POST',redirect:'manual',headers:{Origin:base,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({company,email})});
    assert.equal(response.status,303);
    return store.db.prepare('SELECT id FROM trial_applications WHERE email=?').get(email).id;
  }
  async function login(username,password) {
    const response=await post('/api/login',{username,password});assert.equal(response.status,200);
    const data=await response.json();return {...data,cookie:response.headers.get('set-cookie').split(';')[0]};
  }
  return {store,base,post,get,apply,login};
}

test('application → operator approval → login; two companies cannot read or mutate each other',async t=>{
  const {store,get,post,apply,login}=await fixture(t);
  const aid=await apply('星云示例酒店','nebula@example.invalid');
  assert.equal(store.db.prepare('SELECT COUNT(*) n FROM users').get().n,0,'application is not an account');
  assert.equal((await post('/api/login',{username:'nebula',password:'not-an-account'})).status,401);
  const apass=randomUUID(),bpass=randomUUID();
  const a=store.approve(aid,{username:'nebula',password:apass});
  const bid=await apply('月湾示例旅舍','moon@example.invalid');
  const b=store.approve(bid,{username:'moonbay',password:bpass});
  assert.throws(()=>store.approve(aid,{username:'again',password:apass}),e=>e.status===409);
  const authA=await login('nebula',apass),authB=await login('moonbay',bpass);
  const read=async auth=>(await get('/api/state',auth)).json();
  const command=(auth,propertyId,type,extra={})=>post('/api/commands',{key:randomUUID(),expectedRevision:0,command:{propertyId,type,...extra}},auth);
  for(const [auth,own,other] of [[authA,a,b],[authB,b,a]]) {
    const state=await read(auth);
    assert.deepEqual(state.properties.map(p=>p.id),[own.propertyId]);
    assert.ok(state.members.every(m=>m.username===own.username));
    assert.ok(!JSON.stringify(state).includes(other.propertyId));
    assert.equal((await command(auth,other.propertyId,'room_type_save',{productId:'room',gender:'any',maxGuests:2,names:{zh:'示例房',en:'Sample Room',ms:'Contoh'}})).status,403);
    for(const route of ['support','smart-lock','guest-messages','checkin-admin'])assert.equal((await get(`/api/${route}?propertyId=${other.propertyId}`,auth)).status,403);
    assert.equal((await command(auth,own.propertyId,'member_save',{username:'extra',password:randomUUID(),role:'admin',propertyIds:[other.propertyId]})).status,403);
    assert.equal((await command(auth,own.propertyId,'property_create',{newPropertyId:'escape',name:'Escape'})).status,403);
  }
  const free=await command(authA,a.propertyId,'room_type_save',{productId:'room',gender:'any',maxGuests:2,names:{zh:'示例房',en:'Sample Room',ms:'Contoh'}});
  assert.equal(free.status,200,await free.text());
  assert.equal((await read(authA)).roomTypes.length,1);
  assert.equal((await read(authB)).roomTypes.length,0);
  assert.deepEqual((await read(authA)).orders,[],'no guest or payment seed records');
});

test('feature entitlement is checked in permissions and direct APIs; grants and revocation are company scoped',async t=>{
  const {store,post,get,apply,login}=await fixture(t);
  const password=randomUUID();
  const a=store.approve(await apply('星云示例酒店','a@example.invalid'),{username:'feature-a',password});
  const b=store.approve(await apply('月湾示例旅舍','b@example.invalid'),{username:'feature-b',password});
  const authA=await login(a.username,password),authB=await login(b.username,password);
  const route='/api/guest-messages?propertyId=';
  assert.equal((await get(route+a.propertyId,authA)).status,403);
  assert.equal((await post('/api/guest-messages/commands',{propertyId:a.propertyId,action:'sync'},authA)).status,403);
  assert.ok(!authA.user.allowedActionsByProperty[a.propertyId].includes('guest_read'));
  store.setFeature(a.propertyId,'messaging',true);
  assert.equal((await get(route+a.propertyId,authA)).status,200);
  assert.equal((await get(route+b.propertyId,authB)).status,403);
  store.setFeature(a.propertyId,'messaging',false);
  assert.equal((await get(route+a.propertyId,authA)).status,403);
  assert.equal((await post('/api/commands',{key:randomUUID(),expectedRevision:0,command:{propertyId:a.propertyId,type:'site_save'}},authA)).status,403);
});

test('application UI, approval-only signup, validation, abuse and atomic approval',async t=>{
  const {store,base,get,post,apply}=await fixture(t);
  const page=await (await get('/web/')).text();
  assert.match(page,/申请使用 \/ 联系我们/);assert.match(page,/9jk558xy@mail.grokbot.com/);
  assert.match(page,/智能门锁.*需申请开放/);
  assert.match(await (await get('/signup')).text(),/name="company"/);
  assert.throws(()=>store.signup({}),e=>e.status===403);
  assert.throws(()=>store.createUser({}),e=>e.status===403);
  assert.throws(()=>store.applyForTrial({company:'',email:'invalid'}),e=>e.status===400);
  const id=await apply('星云示例酒店','valid@example.invalid');
  assert.throws(()=>store.approve(id,{username:'short-pass',password:'short'}),e=>e.status===400);
  assert.equal(store.db.prepare('SELECT status FROM trial_applications WHERE id=?').get(id).status,'pending');
  assert.equal(store.db.prepare('SELECT COUNT(*) n FROM users').get().n,0);
  assert.equal((await post('/api/commands',{})).status,401);
  const cross=await fetch(base+'/trial/apply',{method:'POST',headers:{Origin:'https://example.invalid','Content-Type':'application/x-www-form-urlencoded'},body:'company=x&email=x@y.invalid'});
  assert.equal(cross.status,403);
  for(let i=0;i<4;i++)await apply('虚构酒店'+i,`limit${i}@example.invalid`);
  const limited=await fetch(base+'/trial/apply',{method:'POST',headers:{Origin:base,'Content-Type':'application/x-www-form-urlencoded'},body:'company=Example&email=last@example.invalid'});
  assert.equal(limited.status,429);
});
