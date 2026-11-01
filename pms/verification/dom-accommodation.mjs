// Optional in-process DOM verification of the accommodation reports.
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
const send=command=>store.command(operator,{key:randomUUID(),expectedRevision:revision(),command:{propertyId:'TEST-KL',...command}});
const malaysianDay=value=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kuala_Lumpur',year:'numeric',month:'2-digit',day:'2-digit'}).format(value);
const shiftDay=(day,days)=>malaysianDay(new Date(Date.parse(day+'T00:00:00Z')+days*86400000));
const today=malaysianDay(new Date());
// The UI is loaded afresh for each view so it reads the state the commands above left
// behind, instead of a snapshot taken before they ran.
const openView=async view=>{
  await import(new URL('../web/app.js?accommodation-check='+randomUUID(),import.meta.url).href);
  $('[data-property="TEST-KL"]').click();
  $('#global-nav [data-view="business"]').click();
  await until(()=>document.querySelector(`#nav [data-view="${view}"]`),`${view} entry in the statistics group`);
  $(`#nav [data-view="${view}"]`).click();
  await until(()=>document.body.dataset.view===view,`${view} view active`);
  await until(()=>document.querySelector('#content .panel'),`${view} page rendered`);
};
const secondTable=()=>document.querySelectorAll('#content .table-wrap table')[1];
const productRows=()=>[...secondTable().querySelectorAll('tbody tr')].map(row=>[...row.children].map(cell=>cell.textContent.trim()));
try {
  const login=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password})});
  assert.equal(login.status,200);

  send({type:'business_date_init',date:today});

  // The seeded property has ten rooms and thirty beds. A suite has to be built from two
  // of those rooms before the composition rule can be observed at all.
  const suiteType=send({type:'room_type_save',productId:'suite',gender:'any',maxGuests:4,
    names:{zh:'套房 101+102',en:'Suite 101+102',ms:'Suite 101+102'}});
  const suite=send({type:'suite_save',roomTypeId:suiteType.id,roomIds:['TEST-KL-R1','TEST-KL-R2'],label:'DOM Suite 101+102'});

  await openView('roomBusiness');
  set('#content [data-finance-filter="dimension"]','product');
  await until(()=>secondTable(),'per-product table rendered');
  const before=productRows();
  assert.equal(before.length,3,'rooms, beds and suites each keep their own row');
  // Ten rooms, thirty beds and one suite are sellable on a night with nothing sold.
  assert.deepEqual(before.map(cells=>cells.at(-1)).sort(),['1','10','30']);

  // Selling the suite must take its two rooms out of the room row instead of counting
  // the same space twice: once as the suite and again as two sellable rooms.
  const suiteStay=send({type:'create',guest:'TEST suite guest',productId:'suite',roomTypeId:suiteType.id,
    gender:'any',resourceId:suite.id,start:today,end:shiftDay(today,2),nightly:50000});
  await openView('roomBusiness');
  set('#content [data-finance-filter="dimension"]','product');
  await until(()=>secondTable(),'per-product table rendered again');
  const after=productRows();
  // The two rooms inside the sold suite stop being sellable, the beds are untouched,
  // and the suite itself counts as one room-night rather than three.
  assert.deepEqual(after.map(cells=>cells.at(-1)).sort(),['1','30','8']);
  assert.deepEqual(after.map(cells=>cells[3]).sort(),['0','0','1'],'only the suite is sold');
  assert.match($('#content').textContent,/分别计算|counted separately/,'the page states that rooms, suites and beds are separate');

  // No channel owns inventory, so the page must say so instead of inventing a denominator.
  set('#content [data-finance-filter="dimension"]','source');
  await until(()=>$('#content').textContent.match(/无可靠分母|no reliable denominator/),'the channel view refuses to invent occupancy');
  assert.match($('#content').textContent,/—|—/,'occupancy is left blank rather than estimated');

  // Room charge detail must list the earned night at its own rate.
  await openView('roomCharge');
  set('#content [data-finance-filter="from"]',today);
  set('#content [data-finance-filter="to"]',today);
  await until(()=>$('#content').textContent.match(/房费明细|Room charge detail/),'room charge detail rendered');
  assert.match($('#content').textContent,/TEST suite guest/,'the sold suite night appears in the detail');
  assert.match($('#content').textContent,/未记录|Not recorded/,'a rate plan is not invented for an order that has none');
  assert.match($('#content').textContent,/500\.00/,'the night is listed at its own rate');

  // Movements must keep who acted and what changed, including the penalty on cancellation.
  const stay=send({type:'create',id:'order-move',guest:'TEST moved guest',productId:'room',roomTypeId:'TEST-KL-legacy-room-any',
    gender:'any',start:today,end:shiftDay(today,3),nightly:10000});
  send({type:'assign',orderId:stay.id,resourceId:'TEST-KL-R3'});
  send({type:'edit',orderId:stay.id,guest:'TEST moved guest',start:today,end:shiftDay(today,2),nightly:10000,source:'direct',notes:''});
  send({type:'cancel',orderId:stay.id,reason:'TEST early out',finalCharge:2000});
  await openView('roomMovement');
  set('#content [data-finance-filter="from"]',today);
  set('#content [data-finance-filter="to"]',today);
  await until(()=>$('#content').textContent.match(/房间异动记录|Room movement log/),'movement log rendered');
  const log=$('#content').textContent;
  assert.match(log,/提前退房|Early departure/,'leaving earlier than booked is named as its own movement');
  assert.match(log,/取消|Cancel/,'the cancellation is listed');
  assert.match(log,/20\.00/,'the cancellation penalty is shown with the cancellation');
  assert.match(log,/TEST early out/,'the reason is kept');
  assert.match(log,new RegExp(username),'who made each change is recorded');
  assert.match(log,/R03/,'the unit assigned by the move is shown by its label');

  console.log('Accommodation reports DOM passed: suite composition removes its rooms from supply, channel occupancy refused, charge detail and movement log rendered.');
  await new Promise(done=>setTimeout(done,100));
}finally {
  global.fetch=realFetch;server.closeAllConnections();await new Promise(done=>server.close(done));store.close();dom.window.close();
}
