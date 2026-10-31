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
const set=(selector,value)=>{const node=$(selector);if(node.type==='checkbox')node.checked=value;else node.value=value;node.dispatchEvent(new dom.window.Event('input',{bubbles:true}));node.dispatchEvent(new dom.window.Event('change',{bubbles:true}));};
const until=async(check,title)=>{for(let n=0;n<1000;n++){if(check())return;await new Promise(done=>setTimeout(done,10));}throw Error('Timed out: '+title+'; UI message: '+(document.querySelector('#message')?.textContent||'')+'; DOM errors: '+errors.map(e=>e.message).join('; '));};
const revision=()=>store.read(operator).revisions['TEST-KL'];
const send=(command,key=randomUUID())=>store.command(operator,{key,expectedRevision:revision(),command:{propertyId:'TEST-KL',...command}});
const openNightAudit=async()=>{
  await import(new URL('../web/app.js?night-audit-check='+randomUUID(),import.meta.url).href);
  $('[data-property="TEST-KL"]').click();
  $('#global-nav [data-view="business"]').click();
  await until(()=>document.querySelector('#nav [data-view="nightAudit"]'),'night audit entry in the statistics group');
  $('#nav [data-view="nightAudit"]').click();
  await until(()=>document.body.dataset.view==='nightAudit','night audit view active');
  await until(()=>document.querySelector('#content .panel'),'night audit page rendered');
};
try {
  const login=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password})});
  assert.equal(login.status,200);
  await openNightAudit();
  assert.match($('#content').textContent,/尚未设定营业日|Business date not set/,'an unset business date must be stated, never guessed');
  assert($('#business-date-init'),'administrators get an explicit opening-date control');
  set('#business-date-init','2027-01-10');
  $('#business-date-save').click();
  await until(()=>store.read(operator).businessDates['TEST-KL']==='2027-01-10'&&!document.querySelector('#business-date-init'),'opening business date saved and no longer editable');

  // A stay that is in house across the audited night raises no arrival exception.
  const order=send({type:'create',guest:'TEST audit guest',productId:'room',gender:'any',start:'2027-01-09',end:'2027-01-12',nightly:10000});
  send({type:'assign',orderId:order.id,resourceId:'TEST-KL-R1'});
  send({type:'checkin',orderId:order.id,date:'2027-01-10'});
  await openNightAudit();
  assert.match($('#content').textContent,/2027-01-10/,'business date is shown as authoritative state');
  assert.equal(document.querySelector('#audit-reason'),null,'no forced close is offered while nothing is outstanding');
  $('#night-audit-run').click();
  await until(()=>store.read(operator).businessDates['TEST-KL']==='2027-01-11','night audit advanced the business date by one day');
  assert.equal(store.read(operator).nightAudits.length,1);
  assert.equal(store.read(operator).nightAudits[0].forced,false);

  // A confirmed arrival that never arrived blocks closing until an administrator records a reason.
  send({type:'create',guest:'TEST no show',productId:'room',gender:'any',start:'2027-01-11',end:'2027-01-13',nightly:8000});
  await openNightAudit();
  assert($('#audit-reason'),'an unresolved arrival must be visible before the day closes');
  set('#audit-reason','TEST guest contacted, arriving tomorrow');
  $('#night-audit-run').click();
  await until(()=>store.read(operator).businessDates['TEST-KL']==='2027-01-12','forced night audit advanced the business date');
  const forced=store.read(operator).nightAudits.at(-1);
  assert.equal(forced.forced,true,'a forced close is recorded as forced, not silently accepted');
  assert.match(forced.reason,/arriving tomorrow/);

  // Shifts and handover.
  await openNightAudit();
  set('#shift-name','Morning');set('#shift-start','07:00');set('#shift-end','15:00');
  $('#shift-save').click();
  await until(()=>store.read(operator).shiftTypes.length===1,'shift saved');
  await openNightAudit();
  set('#handover-note','TEST float counted');
  $('#handover-run').click();
  await until(()=>store.read(operator).handovers.length===1,'handover recorded');
  const handover=store.read(operator).handovers[0];
  assert.equal(handover.shiftName,'Morning');
  assert.equal(handover.businessDate,'2027-01-12');
  assert.equal(handover.from,'2027-01-12T07:00:00+08:00','handover windows use the property offset');
  assert.equal(handover.to,'2027-01-12T15:00:00+08:00');
  assert.equal(typeof handover.summary.net,'number');
  console.log('Night audit DOM passed: trusted business date, blocked then forced close with reason, shift and handover window.');
  await new Promise(done=>setTimeout(done,100));
}finally {
  global.fetch=realFetch;server.closeAllConnections();await new Promise(done=>server.close(done));store.close();dom.window.close();
}
