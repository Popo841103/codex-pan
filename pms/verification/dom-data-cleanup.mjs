// Optional in-process DOM verification of clearing test bookings. It drives the same
// UI modules a browser loads; it does not operate a real browser, does not touch the
// user's logged-in sessions and does not execute SmartOrder. Supply an installed jsdom
// module path as argv[2].
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {Store} from '../server/store.js';
import {makeServer} from '../server/http.js';
if(!process.argv[2])throw Error('Supply the jsdom module path for this optional verification.');
const {JSDOM,VirtualConsole}=await import(pathToFileURL(resolve(process.argv[2])).href);
const store=new Store(':memory:');store.seedTestProperties();
const username='test-dom-'+randomUUID().slice(0,8),password=randomUUID();
const operator=store.createUser({username,password,role:'admin',propertyIds:['TEST-KL']});
const server=makeServer(store);await new Promise(done=>server.listen(0,'127.0.0.1',done));
const base=`http://127.0.0.1:${server.address().port}`,realFetch=fetch,errors=[];
let cookie='';
const dom=new JSDOM(readFileSync(new URL('../web/index.html',import.meta.url),'utf8'),{url:base+'/web/',runScripts:'outside-only',virtualConsole:new VirtualConsole().on('jsdomError',error=>errors.push(error))});
dom.window.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};
dom.window.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};
// The page must ask before deleting; the script answers yes, and separately proves it
// asked at all.
let asked=0;
dom.window.confirm=()=>{asked++;return true;};
// The page calls confirm in module scope, which resolves to the global binding here.
global.confirm=dom.window.confirm;
global.window=dom.window;global.document=dom.window.document;global.FormData=dom.window.FormData;global.localStorage=dom.window.localStorage;
global.fetch=async(path,options={})=>{
  const response=await realFetch(new URL(path,base),{...options,signal:AbortSignal.timeout(8000),headers:{Origin:base,Cookie:cookie,...options.headers}});
  if(response.headers.has('set-cookie'))cookie=response.headers.get('set-cookie').split(';')[0];return response;
};
const $=selector=>{const node=document.querySelector(selector);assert(node,`Missing DOM control: ${selector}`);return node;};
const until=async(check,title)=>{for(let n=0;n<1000;n++){if(check())return;await new Promise(done=>setTimeout(done,10));}throw Error('Timed out: '+title+'; UI message: '+(document.querySelector('#message')?.textContent||'')+'; DOM errors: '+errors.map(e=>e.message).join('; '));};
const text=()=>$('#content').textContent;
const revision=()=>store.read(operator).revisions['TEST-KL'];
const send=command=>store.command(operator,{key:randomUUID(),expectedRevision:revision(),command:{propertyId:'TEST-KL',...command}});
const roomType='TEST-KL-legacy-room-any';
const guestName=randomUUID().slice(0,8);
const realGuest='Chan '+guestName;
const stay=(id,guest)=>send({type:'create',id,guest,start:'2027-08-01',end:'2027-08-03',
  productId:'room',roomTypeId:roomType,gender:'any',source:'direct'});
const openCleanup=async()=>{
  await import(new URL('../web/app.js?cleanup-check='+randomUUID(),import.meta.url).href);
  $('[data-property="TEST-KL"]').click();
  $('#global-nav [data-view="resourcesSettings"]').click();
  await until(()=>document.querySelector('#nav [data-view="dataCleanup"]'),'data maintenance entry in the settings group');
  $('#nav [data-view="dataCleanup"]').click();
  await until(()=>document.body.dataset.view==='dataCleanup','data maintenance view active');
  await until(()=>text().match(/数据维护|Data maintenance/),'data maintenance page rendered');
};
try {
  const response=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password})});
  assert.equal(response.status,200,'the administrator should be able to sign in');

  // Two rehearsal bookings and one real one, so the page has to tell them apart.
  stay('cleanup-a','TEST alpha');
  stay('cleanup-b','TEST beta');
  stay('cleanup-real',realGuest);

  await openCleanup();
  assert.match(text(),/TEST alpha/,'the page lists the bookings it would delete');
  assert.match(text(),/TEST beta/);
  assert.doesNotMatch(text(),new RegExp(realGuest),'the booking it would keep is not listed among the ones to delete');
  assert.match(text(),/将删除|Will delete/,'with a count of what would go');
  assert.match(text(),/将保留|Will keep/,'and a count of what survives');

  // Deleting is destructive, so the page must ask first.
  $('#content [data-cleanup-run]').click();
  await until(()=>store.read(operator).orders.filter(o=>o.propertyId==='TEST-KL').length===1,'the test bookings are gone');
  assert.equal(asked,1,'the page asked for confirmation before deleting anything');

  const left=store.read(operator).orders.filter(o=>o.propertyId==='TEST-KL').map(o=>o.guest);
  assert.deepEqual(left,[realGuest],'the real booking survived');

  // The audit keeps what was removed, so the deletion is not silent.
  const audit=store.read(operator).audit.find(a=>a.type==='purge_test_orders');
  assert.equal(audit.purged.length,2);
  assert.deepEqual(audit.purged.map(p=>p.guest).sort(),['TEST alpha','TEST beta']);

  // Nothing left to clear: the page says so and offers no working button.
  await openCleanup();
  assert.match(text(),/cleanupNone|当前没有符合该前缀的订单/,'an empty match is reported honestly');
  assert.equal($('#content [data-cleanup-run]').disabled,true,'and the delete button does nothing');

  console.log('Data maintenance DOM passed: only prefixed rehearsal bookings deleted after a confirmation, the real booking kept, and the removed ones recorded in the audit.');
  await new Promise(done=>setTimeout(done,100));
}finally {
  global.fetch=realFetch;server.closeAllConnections();await new Promise(done=>server.close(done));store.close();dom.window.close();
}
