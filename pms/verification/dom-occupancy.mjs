// Optional in-process DOM verification of the occupant, registration and commission
// reports. It drives the same UI modules a browser loads; it does not operate a real
// browser, does not touch the user's logged-in sessions and does not execute SmartOrder.
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
const roomType='TEST-KL-legacy-room-any';
const openView=async view=>{
  await import(new URL('../web/app.js?occupancy-check='+randomUUID(),import.meta.url).href);
  $('[data-property="TEST-KL"]').click();
  $('#global-nav [data-view="business"]').click();
  await until(()=>document.querySelector(`#nav [data-view="${view}"]`),`${view} entry in the statistics group`);
  $(`#nav [data-view="${view}"]`).click();
  await until(()=>document.body.dataset.view===view,`${view} view active`);
  await until(()=>document.querySelector('#content .panel'),`${view} page rendered`);
};
const text=()=>$('#content').textContent;
// The totals block is the first table on these pages, so its rows can be read as pairs.
const totalsTable=()=>[...document.querySelectorAll('#content .table-wrap table')[0].querySelectorAll('tbody tr')]
  .map(row=>[row.children[0].textContent.trim(),row.children[1].textContent.trim()]);
try {
  const login=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password})});
  assert.equal(login.status,200);

  send({type:'business_date_init',date:today});

  // Two arrivals with names on every occupant, room assigned automatically.
  send({type:'create_reservation',id:'order-occ',guest:'TEST occupant guest',bookingKind:'individual',companyName:'',
    source:'direct',mode:'reserve',autoAssign:true,reminders:[],date:today,
    stays:[{productId:'room',roomTypeId:roomType,gender:'any',adults:2,start:today,end:shiftDay(today,2),
      nightlyRates:[{date:today,amount:10000},{date:shiftDay(today,1),amount:10000}],
      occupants:[{name:'TEST occ A',gender:'female'},{name:'TEST occ B',gender:'male'}]}]});

  // A booking where one name was never entered and no room was ever assigned. Both
  // facts have to stay visible instead of being quietly completed.
  send({type:'create_reservation',id:'order-reg',guest:'TEST registration guest',bookingKind:'individual',companyName:'',
    source:'direct',mode:'reserve',autoAssign:false,reminders:[],date:today,
    stays:[{productId:'room',roomTypeId:roomType,gender:'any',adults:2,start:today,end:shiftDay(today,3),
      nightlyRates:[{date:today,amount:8000},{date:shiftDay(today,1),amount:8000},{date:shiftDay(today,2),amount:8000}],
      occupants:[{name:'TEST reg A',gender:'any'},{name:'',gender:'any'}]}]});

  // A channel booking for the commission page, with part of the bill received.
  const channel=send({type:'create_reservation',id:'order-com',guest:'TEST channel guest',bookingKind:'individual',companyName:'',
    source:'booking',channelOrderId:'DOM-CH-1',mode:'reserve',autoAssign:false,reminders:[],date:today,
    stays:[{productId:'room',roomTypeId:roomType,gender:'any',adults:1,start:today,end:shiftDay(today,2),
      nightlyRates:[{date:today,amount:12000},{date:shiftDay(today,1),amount:12000}],
      occupants:[{name:'TEST com A',gender:'any'}]}]});
  send({type:'payment',orderId:channel.id+'-stay-1',kind:'payment',amount:5000,method:'card',at:today+'T10:00:00+08:00'});

  await openView('occupants');
  set('#content [data-finance-filter="from"]',today);
  set('#content [data-finance-filter="to"]',today);
  await until(()=>text().match(/房间入住人明细|Room occupant detail/),'occupant detail rendered');
  assert.match(text(),/TEST occ A/,'every occupant gets their own row');
  assert.match(text(),/TEST occ B/);
  assert.match(text(),/TEST com A/,'a channel arrival is in scope too');
  assert.match(text(),/未填写姓名|No name entered/,'a name that was never entered stays visible as missing');
  assert.doesNotMatch(text(),/TEST registration guest\s*$/,'the booking contact is not confused with an occupant name');
  const occTotals=Object.fromEntries(totalsTable());
  assert.equal(occTotals['人数']??occTotals['People'],'5','two plus two plus one people arrived in the window');
  assert.equal(occTotals['住宿笔数']??occTotals['Stays'],'3');
  assert.equal(occTotals['缺姓名人数']??occTotals['People with no name'],'1');

  // Placement can be moved from arrival date to any night inside the window.
  set('#content [data-finance-filter="basis"]','overlap');
  await until(()=>text().match(/房间入住人明细|Room occupant detail/),'occupant detail re-rendered on the overlap basis');
  assert.match(text(),/TEST occ A/,'the overlap basis keeps the same arrivals in scope');

  await openView('registration');
  set('#content [data-finance-filter="from"]',today);
  set('#content [data-finance-filter="to"]',today);
  await until(()=>text().match(/入住登记记录|Registration record/),'registration record rendered');
  assert.match(text(),/姓名齐备|Names complete/,'a stay whose names are all present is marked complete');
  assert.match(text(),/待补全|Names to complete/,'a stay missing a name is marked incomplete');
  assert.match(text(),/待分房|Unassigned/,'a stay with no room says so instead of showing a room');
  const regTotals=Object.fromEntries(totalsTable());
  assert.equal(regTotals['应登记人数']??regTotals['Occupants expected'],'5');
  assert.equal(regTotals['已登记姓名']??regTotals['Names entered'],'4');
  assert.equal(regTotals['缺姓名']??regTotals['Names missing'],'1');
  assert.equal(regTotals['不完整单数']??regTotals['Incomplete stays'],'1');
  assert.equal(regTotals['未分房单数']??regTotals['Stays with no room'],'2');
  assert.match(text(),/加密|encrypted/,'the page states that identity documents are never decrypted here');

  await openView('commission');
  set('#content [data-finance-filter="from"]',today);
  set('#content [data-finance-filter="to"]',today);
  await until(()=>text().match(/佣金明细|Commission detail/),'commission detail rendered');
  assert.match(text(),/TEST channel guest/,'the channel booking is listed');
  assert.match(text(),/DOM-CH-1/,'the channel reference is carried for reconciliation');
  assert.match(text(),/240\.00/,'what the channel booking was worth is still reported');
  assert.match(text(),/50\.00/,'what was received on it is still reported');
  assert.match(text(),/未记录|Not recorded/,'the commission column says no commission was ever recorded');
  assert.match(text(),/尚未接入|not connected/,'the page says commission is not connected');
  const commissionTotals=Object.fromEntries(totalsTable());
  assert.equal(commissionTotals['佣金金额']??commissionTotals['Commission'],'未记录',
    'the commission total is left empty rather than calculated from an invented rate');

  console.log('Occupant, registration and commission DOM passed: per-person rows with party size, missing names and unassigned rooms kept visible, commission reported as not recorded.');
  await new Promise(done=>setTimeout(done,100));
}finally {
  global.fetch=realFetch;server.closeAllConnections();await new Promise(done=>server.close(done));store.close();dom.window.close();
}
