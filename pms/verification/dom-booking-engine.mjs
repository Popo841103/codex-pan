// Optional in-process DOM verification of the trustworthy business day, night audit and shift handover.
// This drives the same UI modules a browser loads; it does not operate a real browser,
// does not touch the user's logged-in sessions and does not execute SmartOrder.
// Supply an installed jsdom module path as argv[2].
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
dom.window.confirm=()=>true;
global.window=dom.window;global.document=dom.window.document;global.FormData=dom.window.FormData;global.localStorage=dom.window.localStorage;
global.fetch=async(path,options={})=>{
  const response=await realFetch(new URL(path,base),{...options,signal:AbortSignal.timeout(8000),headers:{Origin:base,Cookie:cookie,...options.headers}});
  if(response.headers.has('set-cookie'))cookie=response.headers.get('set-cookie').split(';')[0];return response;
};
const $=selector=>{const node=document.querySelector(selector);assert(node,`Missing DOM control: ${selector}`);return node;};
const revision=()=>store.read(operator).revisions['TEST-KL'];

try {
  const login=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password})});
  assert.equal(login.status,200);
  await import(new URL('../web/app.js?booking-engine='+randomUUID(),import.meta.url).href);
  $('[data-property="TEST-KL"]').click();
  $('#global-nav [data-view="resourcesSettings"]').click();
  $('#nav [data-view="bookingEngineSetup"]').click();
  assert.equal(document.querySelectorAll('[data-booking-channel]').length,4);
  assert.equal(document.querySelectorAll('[data-booking-empty]').length,2);
  assert.equal($('[data-booking-strike]').dataset.effective,'false');
  const preview=$('[data-booking-verify-preview]');
  assert.deepEqual([...preview.querySelectorAll('input')].map(input=>input.name),['businessContact','companyName','phone','address']);
  assert([...preview.querySelectorAll('input')].every(input=>input.readOnly));
  assert.equal(document.querySelector('#content form:not([data-preparation-query])'),null);
  assert.equal(document.querySelectorAll('[data-preparation-query]').length,1);
  $('[data-preparation-query] button').click();
  assert.equal(revision(),0,'the date coverage query must not write business state');
  $('[data-booking-maintenance="resourcesSettings"]').click();
  assert.equal(document.body.dataset.view,'resourcesSettings');
  $('#nav [data-view="bookingEngineSetup"]').click();
  $('[data-booking-maintenance="rates"]').click();
  assert.equal(document.body.dataset.view,'rates');
  assert.equal(revision(),0);
  console.log('Booking engine setup DOM passed');
}finally {
  global.fetch=realFetch;server.closeAllConnections();await new Promise(resolve=>server.close(resolve));store.close();dom.window.close();
}
