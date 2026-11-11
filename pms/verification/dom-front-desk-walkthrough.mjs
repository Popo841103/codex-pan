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
try {
 const login=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password})});assert.equal(login.status,200);
 await import(new URL('../web/app.js?walk='+randomUUID(),import.meta.url).href);
 $('[data-property="TEST-KL"]').click();
 await until(()=>document.querySelector('[data-business-date-prompt]'),'opening date prompt');
 assert.equal($('#business-date-init').value,today);$('#business-date-save').click();await until(()=>store.read(operator).businessDates['TEST-KL']===today&&$('#message').textContent.includes('保存'),'opening saved');
 const room=store.read(operator).resources.find(r=>r.id==='TEST-KL-R1');
 send({type:'directory_entry_save',kind:'hourly',name:'TEST hourly MYR',roomTypeId:room.roomTypeId,minHours:2,maxHours:8,unitHours:1,baseAmount:6000,unitAmount:2000});
 $('#refresh').click();await until(()=>$('#message').textContent.includes('保存')||document.querySelector('#refresh'),'refresh');
 await new Promise(r=>setTimeout(r,100));
 $('#global-nav [data-view="calendar"]').click();await until(()=>document.querySelector('[data-new-order]'),'visible new order');
 assert.match($('#content').textContent,/可售.*房间.*床位/s);$('[data-new-order]').click();$('[data-kind="hourly"]').click();
 const f=$('#hourly-reservation-form');assert.match(f.textContent,/60.00/);assert.doesNotMatch(f.elements.resourceId.textContent,/unit-1/);
 f.elements.guest.value='TEST hourly desk';f.elements.phone.value='000-test';f.elements.resourceId.value=room.id;f.dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));
 await until(()=>store.read(operator).orders.some(o=>o.guest==='TEST hourly desk')&&!$('#reservation-dialog').open,'hourly saved and dialog closed');
 const o=store.read(operator).orders.find(o=>o.guest==='TEST hourly desk');assert.equal(o.phone,'000-test');assert.equal(o.hourly.hours,2);
 assert($('.hour-slot'));assert.match($('.hour-slot').textContent,/14:00.*16:00/s);
 $('.hour-slot').click();assert.match($('#detail-body').textContent,/2 h/);assert.doesNotMatch($('#detail-body .stay-card').textContent,/1 晚|每晚房费/);
 $('#detail-close').click();$('#global-nav [data-view="calendar"]').click();$('#nav [data-view="tasks"]').click();
 const dirty=store.read(operator).resources.find(r=>r.cleaning==='dirty');if(dirty){const b=$(`[data-action="clean"][data-id="${dirty.id}"]`);b.click();b.click();await until(()=>store.read(operator).resources.find(r=>r.id===dirty.id).cleaning==='clean','clean saved');await new Promise(r=>setTimeout(r,50));assert.doesNotMatch($('#message').textContent,/正在保存/);}
 $('#global-nav [data-view="resourcesSettings"]').click();$('[data-catalog="type"][data-id=""]').click();
 const catalog=$('#catalog-form');catalog.elements.name_en.value='TEST default priced';catalog.elements.maxGuests.value='2';catalog.elements.defaultRate.value='123.45';catalog.querySelector('input[type=checkbox]').checked=true;catalog.querySelector('button').click();
 await until(()=>store.read(operator).roomTypes.some(t=>t.names.en==='TEST default priced')&&!$('#utility-dialog').open,'one-name type and default plan saved');
 const type=store.read(operator).roomTypes.find(t=>t.names.en==='TEST default priced');assert.equal(store.read(operator).ratePlans.find(p=>p.code===type.defaultRatePlanCode).defaultAmount,12345);
 send({type:'physical_room_save',kind:'room',roomTypeId:type.id,label:'TEST default room',floor:''});$('#refresh').click();await new Promise(r=>setTimeout(r,100));
 $('#global-nav [data-view="calendar"]').click();$('[data-new-order]').click();set('#reservation-form [data-field="roomTypeId"]',type.id);
 assert.equal($('#reservation-form [data-field="nightly"]').value,'123.45');assert.equal($('#reservation-form [data-field="ratePlanCode"]').value,type.defaultRatePlanCode);assert.match($('#reservation-total').textContent,/123.45/);
 $('#reservation-dialog [data-command="close"]').click();
 const tomorrow=shiftDay(today,1),hourlyId=store.read(operator).directoryHistory.find(r=>r.kind==='hourly').entryId;
 const future=send({type:'create_hourly',hourlyId,resourceId:room.id,usageDate:tomorrow,startTime:'14:00',hours:2,guest:'TEST future window'});
 $('#refresh').click();await new Promise(r=>setTimeout(r,100));set('#date',tomorrow);$(`[data-action="details"][data-id="${future.id}"]`).click();
 let warnings=0;window.confirm=()=>{warnings++;return false;};$('#detail-body [data-action="checkin"]').click();await new Promise(r=>setTimeout(r,30));assert.equal(warnings,1);assert.equal(store.read(operator).orders.find(o=>o.id===future.id).status,'confirmed');window.confirm=()=>true;$('#detail-close').click();
 const start=shiftDay(today,2),moveDate=shiftDay(today,3),end=shiftDay(today,4),moving=send({type:'create',guest:'TEST segmented DOM',productId:'room',gender:'any',resourceId:'TEST-KL-R2',start,end,nightly:10000});
 $('#refresh').click();await new Promise(r=>setTimeout(r,100));set('#date',start);$(`[data-action="details"][data-id="${moving.id}"]`).click();
 $('#detail-resource').value=room.id;$('#detail-move-from').value=moveDate;$('#detail-move-reason').value='TEST chosen night';$('#detail-assign').click();
 await until(()=>store.read(operator).orders.find(o=>o.id===moving.id).roomSegments?.length===2&&document.querySelector('[data-room-segments]'),'dated move segments saved and visible');
 assert.equal(store.read(operator).orders.find(o=>o.id===moving.id).roomSegments[0].resourceId,'TEST-KL-R2');assert.equal(store.read(operator).orders.find(o=>o.id===moving.id).transactions.length,0);$('#detail-close').click();
 console.log('Front desk DOM passed: opening prompt, normal hourly flow/MYR/phone, closes dialog, partial calendar marker, hours detail, clean completion.');
}finally {global.fetch=realFetch;server.closeAllConnections();await new Promise(done=>server.close(done));store.close();dom.window.close();}
