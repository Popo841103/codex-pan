// Optional in-process DOM verification of the other-charge and cancellation-penalty
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
  await import(new URL('../web/app.js?extra-penalty-check='+randomUUID(),import.meta.url).href);
  $('[data-property="TEST-KL"]').click();
  $('#global-nav [data-view="business"]').click();
  await until(()=>document.querySelector(`#nav [data-view="${view}"]`),`${view} entry in the statistics group`);
  $(`#nav [data-view="${view}"]`).click();
  await until(()=>document.body.dataset.view===view,`${view} view active`);
  await until(()=>document.querySelector('#content .panel'),`${view} page rendered`);
};
const text=()=>$('#content').textContent;
try {
  const login=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password})});
  assert.equal(login.status,200);

  send({type:'business_date_init',date:today});

  // A penalty row can only carry a policy if a plan with a policy and a price exists,
  // so both are created before the booking that must show them.
  send({type:'rate_plan_save',code:'DOMPEN',name:'DOM penalty plan',roomTypeIds:[roomType],
    cancellationPolicy:{kind:'flexible',percent:5000,basis:'total',days:1,time:'18:00'}});
  send({type:'rates_bulk_update',planCode:'DOMPEN',roomTypeIds:[roomType],ranges:[{from:today,to:shiftDay(today,10)}],
    weekdays:[1,2,3,4,5,6,7],priceMode:'fixed',amount:10000,sale:'open'});

  // One live stay with an extra and a discount, both landing on the arrival business date.
  send({type:'create_reservation',id:'order-extra',guest:'TEST extra guest',bookingKind:'individual',companyName:'',
    source:'direct',mode:'reserve',autoAssign:false,reminders:[],date:today,
    stays:[{productId:'room',roomTypeId:roomType,gender:'any',start:today,end:shiftDay(today,2),
      nightlyRates:[{date:today,amount:10000},{date:shiftDay(today,1),amount:10000}],
      occupants:[{name:'TEST A',gender:'any'}],
      extraCharges:[{kind:'charge',name:'TEST extra bed',quantity:1,unitAmount:3000},
        {kind:'discount',name:'TEST coupon',quantity:1,unitAmount:1000}]}]});

  // A stay booked on the plan, then cancelled with a penalty. Its own extra is superseded
  // by the final charge, so it must not appear in the other-charge page.
  // The service assigns the command id itself, so the stay id is derived from what it
  // returns instead of being assumed.
  const penalty=send({type:'create_reservation',id:'order-pen',guest:'TEST penalty guest',bookingKind:'individual',companyName:'',
    source:'booking',mode:'reserve',autoAssign:false,reminders:[],date:today,
    stays:[{productId:'room',roomTypeId:roomType,gender:'any',start:today,end:shiftDay(today,2),ratePlanCode:'DOMPEN',
      occupants:[{name:'TEST B',gender:'any'}],
      extraCharges:[{kind:'charge',name:'TEST extra bed',quantity:1,unitAmount:3000}]}]});
  send({type:'cancel',orderId:`${penalty.id}-stay-1`,reason:'TEST late cancel',finalCharge:5000});

  await openView('extraCharge');
  set('#content [data-finance-filter="from"]',today);
  set('#content [data-finance-filter="to"]',today);
  await until(()=>text().match(/客房其他消费明细|Other charge detail/),'other charge detail rendered');
  assert.match(text(),/TEST extra bed/,'the extra is listed by its own name');
  assert.match(text(),/30\.00/,'the extra is listed at its own amount');
  assert.match(text(),/\u2212MYR\s*10\.00/,'a discount is listed as a negative line, not as a charge');
  assert.match(text(),/\+MYR\s*20\.00/,'the net is charges less discounts');
  assert.match(text(),/已被最终费用取代的订单|replaced by a final charge/,'a cancelled stay no longer bills its extras');
  assert.doesNotMatch(text(),/TEST penalty guest/,'the cancelled stay is not charged twice');

  await openView('cancellation');
  set('#content [data-finance-filter="from"]',today);
  set('#content [data-finance-filter="to"]',today);
  await until(()=>text().match(/客房违约金明细|Cancellation penalty detail/),'cancellation penalty detail rendered');
  assert.match(text(),/TEST penalty guest/,'the cancelled booking is listed');
  assert.match(text(),/50\.00/,'the penalty is shown');
  assert.match(text(),/TEST late cancel/,'the reason is kept');
  assert.match(text(),/入住前|Before arrival/,'the stored policy is shown as a snapshot');
  assert.match(text(),/18:00/,'the free-cancellation deadline keeps its Malaysian clock time');
  assert.match(text(),/50\.00%/,'the policy percentage is shown');
  assert.match(text(),/21\.7/,'the penalty is shown as a share of what the booking was worth');
  assert.match(text(),new RegExp(username),'who cancelled is recorded');

  console.log('Other charge and penalty DOM passed: extras and discounts listed separately, cancelled stay superseded, penalty policy snapshot and share rendered.');
  await new Promise(done=>setTimeout(done,100));
}finally {
  global.fetch=realFetch;server.closeAllConnections();await new Promise(done=>server.close(done));store.close();dom.window.close();
}
