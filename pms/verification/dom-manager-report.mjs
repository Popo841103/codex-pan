// Optional in-process DOM verification of the manager's daily report and the guest ledger.
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
const set=(selector,value)=>{const node=$(selector);node.value=value;node.dispatchEvent(new dom.window.Event('input',{bubbles:true}));node.dispatchEvent(new dom.window.Event('change',{bubbles:true}));};
const until=async(check,title)=>{for(let n=0;n<1000;n++){if(check())return;await new Promise(done=>setTimeout(done,10));}throw Error('Timed out: '+title+'; UI message: '+(document.querySelector('#message')?.textContent||'')+'; DOM errors: '+errors.map(e=>e.message).join('; '));};
const revision=()=>store.read(operator).revisions['TEST-KL'];
const send=(command)=>store.command(operator,{key:randomUUID(),expectedRevision:revision(),command:{propertyId:'TEST-KL',...command}});
// Receipts are stamped by the server with the real clock, so the report day has to be the
// real Malaysian day rather than a date the test invented.
const malaysianDay=value=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kuala_Lumpur',year:'numeric',month:'2-digit',day:'2-digit'}).format(value);
const shiftDay=(day,days)=>malaysianDay(new Date(Date.parse(day+'T00:00:00Z')+days*86400000));
const today=malaysianDay(new Date());
const openReport=async view=>{
  await import(new URL('../web/app.js?manager-report-check='+randomUUID(),import.meta.url).href);
  $('[data-property="TEST-KL"]').click();
  $('#global-nav [data-view="business"]').click();
  await until(()=>document.querySelector(`#nav [data-view="${view}"]`),`${view} entry in the statistics group`);
  $(`#nav [data-view="${view}"]`).click();
  await until(()=>document.body.dataset.view===view,`${view} view active`);
  await until(()=>document.querySelector('#content .panel'),`${view} page rendered`);
};
try {
  const login=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password})});
  assert.equal(login.status,200);

  // A business date must exist before the daily report can claim any period at all.
  send({type:'business_date_init',date:today});

  // A stay earning one night before the report day and one night on it.
  const stay=send({type:'create',guest:'TEST daily guest',productId:'room',gender:'any',start:shiftDay(today,-1),end:shiftDay(today,1),nightly:10000});
  send({type:'payment',orderId:stay.id,kind:'payment',amount:10000,method:'card'});
  send({type:'payment',orderId:stay.id,kind:'deposit_in',amount:5000,method:'cash'});

  await openReport('managerDaily');
  const text=()=>$('#content').textContent;
  assert.match(text(),/已对账|reconciles/,'the page states that the day reconciles');
  assert.doesNotMatch(text(),/尚未设定营业日|No business date is set/,'a set business date removes the warning');
  assert.match(text(),/期初结余|Opening balance/,'opening balance is shown');
  assert.match(text(),/期末结余|Closing balance/,'closing balance is shown');
  assert.match(text(),/计算口径|How this is calculated/,'the page states its formula instead of only showing numbers');
  assert($('.ledger-formula'),'the formula is rendered with the day\'s own amounts');
  // Opening 100.00 + one earned night 100.00 − one receipt 100.00 = closing 100.00.
  assert.match($('.ledger-formula').textContent,/100\.00 \+ .*100\.00 − .*100\.00 = .*100\.00/,'the formula shows the day rebuilt from its own movements');
  assert.match(text(),/\b50\.00\b/,'the deposit is shown in the receipts section, never as revenue');

  // A cancellation penalty recorded on this business date must appear under this day.
  const cancelled=send({type:'create',guest:'TEST penalty guest',productId:'room',gender:'any',start:today,end:shiftDay(today,2),nightly:8000});
  send({type:'cancel',orderId:cancelled.id,reason:'TEST no show',finalCharge:3000});
  await openReport('managerDaily');
  assert.match(text(),/违约金|Cancellation penalties/,'the breakdown separates penalties from room charges');
  // The penalty has to move the totals, not just appear in a list: 100 + 130 − 100 = 130.
  assert.match($('.ledger-formula').textContent,/100\.00 \+ .*130\.00 − .*100\.00 = .*130\.00/,'the penalty is charged to the business date it happened on');

  // The guest ledger must never net what is owed against what was overpaid or held.
  await openReport('guestLedger');
  const ledger=$('#content').textContent;
  assert.match(ledger,/未收|Outstanding/,'outstanding is its own bucket');
  assert.match(ledger,/多收待退|Overpaid to return/,'overpaid money is its own bucket');
  assert.match(ledger,/押金余款|Deposit held/,'deposits are held separately and are not revenue');
  assert.match(ledger,/不提供挂账|does not offer charge-to-room/,'the page states that charge-to-room is not offered');
  assert.match(ledger,/\b100\.00\b/,'the stay still owes one night');
  assert.match(ledger,/\b50\.00\b/,'the deposit is listed separately from what is owed');

  console.log('Manager report DOM passed: reconciled daily balances with formula, penalty on its own business date, guest ledger buckets kept separate.');
  await new Promise(done=>setTimeout(done,100));
}finally {
  global.fetch=realFetch;server.closeAllConnections();await new Promise(done=>server.close(done));store.close();dom.window.close();
}
