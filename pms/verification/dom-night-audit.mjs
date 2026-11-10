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
  $('#global-nav [data-view="home"]').click();
  $('[data-home="nightAudit"]').click();
  await until(()=>document.body.dataset.view==='nightAudit','night audit view active');
  await until(()=>document.querySelector('#content .panel'),'night audit page rendered');
};
try {
  const login=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password})});
  assert.equal(login.status,200);
  await openNightAudit();
  assert.match($('#content').textContent,/尚未设定营业日|Business date not set/,'an unset business date must be stated, never guessed');
  assert($('[data-night-audit-workbench]'));
  assert.equal(document.querySelector('#business-date-init'),null);
  $('[data-night-audit-settings-link]').click();
  assert($('[data-night-audit-settings]'));
  assert.equal(document.querySelector('#night-audit-run'),null);
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

  await openNightAudit();
  $('#night-audit-handle-all').click();
  await until(()=>store.read(operator).audit.some(row=>row.type==='night_audit_handle_all'),'bulk handling saved');
  const handled=store.read(operator).audit.find(row=>row.type==='night_audit_handle_all');
  assert(handled.handledAuditOrders.length>=1);
  assert(store.read(operator).orders.every(order=>!order.folioClosed));
  await until(()=>!document.querySelector('#night-audit-handle-all'),'workbench refreshed');
  $('[data-night-audit-settings-link]').click();
  set('#handover-mode','shift_person');
  $('#handover-mode-save').click();
  await until(()=>store.read(operator).properties.find(row=>row.id==='TEST-KL').handoverMode==='shift_person','person mode saved');

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
  assert.equal(handover.operator,username);
  assert.equal(handover.businessDate,'2027-01-12');
  assert.equal(handover.from,'2027-01-12T07:00:00+08:00','handover windows use the property offset');
  assert.equal(handover.to,'2027-01-12T15:00:00+08:00');
  assert.equal(typeof handover.summary.net,'number');
  assert.equal('cashCount' in handover,false,'an old handover has no invented cash count');
  await until(()=>(document.querySelector('#content')?.textContent||'').includes('未盘点'),'the uncounted handover row is rendered');
  assert.match($('#content').textContent,/未盘点|Not counted|Belum dikira/,'the UI says the till was not counted');
  assert.equal(document.querySelector('[data-cash-approve]'),null,'no approval is offered without a count');

  // Counting the till is optional. A counted figure that differs from the expected
  // net cash is a visible discrepancy, never a silent write-off. The commit above
  // already re-rendered this page, so no module re-import is needed here.
  set('#handover-cash','5.00');
  $('#handover-run').click();
  await until(()=>store.read(operator).handovers.length===2,'a handover with a counted till is recorded');
  const countedHandover=store.read(operator).handovers.find(h=>h.cashCount);
  assert.equal(countedHandover.cashCount.counted,500,'the UI converts MYR to minor units');
  assert.equal(countedHandover.cashCount.expected,0,'no real transactions fall inside this historical shift window');
  assert.equal(countedHandover.cashCount.variance,500);
  assert.equal(countedHandover.cashCount.status,'pending');
  assert.equal(countedHandover.cashCount.approval,null);
  await until(()=>document.querySelector(`[data-cash-approve="${countedHandover.id}"]`),'the pending variance is visible in the UI');
  assert.match($('#content').textContent,/待管理员审批|Awaiting administrator approval|Menunggu kelulusan pentadbir/);

  const reason='TEST float returned to the guest';
  set(`#cash-reason-${countedHandover.id}`,reason);
  document.querySelector(`[data-cash-approve="${countedHandover.id}"]`).click();
  await until(()=>store.read(operator).handovers.find(h=>h.id===countedHandover.id)?.cashCount?.status==='approved','administrator approval is recorded');
  const approved=store.read(operator).handovers.find(h=>h.id===countedHandover.id).cashCount;
  assert.equal(approved.counted,500);
  assert.equal(approved.expected,0);
  assert.equal(approved.variance,500,'the original discrepancy stays readable, never rewritten');
  assert.equal(approved.approval.reason,reason);
  assert.equal(approved.approval.actor,username);
  assert.equal(store.read(operator).audit.filter(a=>a.type==='cash_variance_approve').length,1,'the approval is durable and happens once');
  await until(()=>!document.querySelector(`[data-cash-approve="${countedHandover.id}"]`),'a decided variance cannot be approved twice');
  assert.match($('#content').textContent,/已审批|Approved|Diluluskan/);

  // A balanced till needs no approval; leaving the field blank keeps the old shape.
  set('#handover-cash','0.00');
  $('#handover-run').click();
  await until(()=>store.read(operator).handovers.length===3,'a balanced handover is recorded');
  const balanced=store.read(operator).handovers.at(-1);
  assert.equal(balanced.cashCount.status,'balanced');
  assert.equal(balanced.cashCount.approval,null);
  await until(()=>(document.querySelector('#content')?.textContent||'').includes('已平'),'the balanced row is rendered');
  assert.equal(document.querySelector(`[data-cash-approve="${balanced.id}"]`),null,'a balanced till is never offered for approval');

  set('#handover-cash','');
  $('#handover-run').click();
  await until(()=>store.read(operator).handovers.length===4,'a handover with no count is recorded');
  assert.equal('cashCount' in store.read(operator).handovers.at(-1),false,'an empty count leaves the old record shape');
  console.log('Night audit DOM passed: trusted business date, blocked then forced close with reason, shift and handover window, optional cash count, pending variance and administrator approval.');
  await new Promise(done=>setTimeout(done,100));
}finally {
  global.fetch=realFetch;server.closeAllConnections();await new Promise(done=>server.close(done));store.close();dom.window.close();
}
