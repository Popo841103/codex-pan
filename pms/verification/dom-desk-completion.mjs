// Optional in-process DOM verification. This does not operate a browser or the
// user's logged-in sessions. Supply an installed jsdom module path as argv[2].
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {Store} from '../server/store.js';
import {makeServer,readPublicListing} from '../server/http.js';
if(!process.argv[2])throw Error('Supply the jsdom module path for this optional verification.');
const {JSDOM,VirtualConsole}=await import(pathToFileURL(resolve(process.argv[2])).href);
const store=new Store(':memory:');store.seedTestProperties();
const username='test-dom-'+randomUUID().slice(0,8),password=randomUUID();
const operator=store.createUser({username,password,role:'admin',propertyIds:['TEST-KL','TEST-PG']});
const server=makeServer(store,{listingReader:url=>readPublicListing(url,async path=>path.endsWith('/robots.txt')?'User-agent: *\nDisallow: /private':'<title>TEST fixture listing</title><meta name="description" content="TEST public description"><meta property="og:image" content="https://example.com/photo.jpg">')});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
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
const until=async(check,title)=>{for(let n=0;n<1000;n++){if(check())return;await new Promise(resolve=>setTimeout(resolve,10));}throw Error('Timed out: '+title+'; UI error: '+(document.querySelector('#reservation-error')?.textContent||'')+'; DOM errors: '+errors.map(e=>e.message).join('; '));};


try {
 const today='2027-03-01',tomorrow='2027-03-02';
 const send=command=>store.command(operator,{key:randomUUID(),expectedRevision:store.read(operator).revisions['TEST-KL'],command:{propertyId:'TEST-KL',...command}});
 send({type:'business_date_init',date:today});
 const resource=store.read(operator).resources.find(r=>r.id==='TEST-KL-R1');
 const hourlyId=send({type:'directory_entry_save',kind:'hourly',name:'TEST slot plan',roomTypeId:resource.roomTypeId,minHours:1,maxHours:8,unitHours:1,baseAmount:1000,unitAmount:500}).id;
 const orderId=send({type:'create_hourly',hourlyId,resourceId:resource.id,guest:'TEST slot A',usageDate:today,startTime:'10:00',hours:2}).id;
 send({type:'create_hourly',hourlyId,resourceId:resource.id,guest:'TEST slot B',usageDate:today,startTime:'12:00',hours:2});
 const companyId=send({type:'directory_entry_save',kind:'corporate',name:'TEST company'}).id;
 await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password})});
 await import(new URL('../web/app.js?desk='+randomUUID(),import.meta.url).href);
 $('[data-property="TEST-KL"]').click();$('#global-nav [data-view="customers"]').click();
 async function desk(type,values){const form=$('[data-desk-command="'+type+'"]'),count=store.read(operator).deskHistory?.length||0;form.closest('details').open=true;for(const [k,v] of Object.entries(values))form.elements[k].value=v;form.dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));await until(()=>store.read(operator).deskHistory?.length===count+1&&$('[data-desk-command="'+type+'"]')!==form,'desk '+type);}
 const setting=(section,values)=>{const form=$('[data-desk-section="'+section+'"] form');form.closest('details').open=true;for(const [k,v] of Object.entries(values))form.elements[k].value=v;const count=store.read(operator).deskHistory?.length||0;form.querySelector('button').click();return until(()=>store.read(operator).deskHistory?.length===count+1&&$('[data-desk-section="'+section+'"] form')!==form,'setting '+section);};
 await setting('property',{displayName:'TEST branch',address:'TEST address',phone:'TEST',email:'test@example.invalid',description:'TEST internal',arrivalInstructions:'TEST arrival'});
 await setting('frontdesk',{checkinTime:'14:00',checkoutTime:'11:00',welcome:'TEST welcome',checklist:'TEST manual checks'});
 await setting('quickReply',{name:'TEST reply',text:'TEST reply body'});
 await setting('quickReply',{entryId:'',name:'TEST second reply',text:'TEST second body'});
 assert.equal(document.querySelectorAll('[data-desk-copy]').length,2);
 await setting('notification',{name:'TEST notice',text:'TEST desk announcement'});
 await setting('channel',{name:'TEST internal source',text:'TEST manual channel note'});
 await setting('print',{heading:'TEST desk print',footer:'TEST print footer'});
 await desk('corporate_link',{orderId,companyId,reason:'TEST contract link'});assert($('[data-corporate-stays]').textContent.includes('TEST company'));assert($('[data-corporate-stays]').textContent.includes('MYR 15.00'));
 await desk('desk_task_save',{orderId,title:'TEST manual follow-up',dueDate:today,status:'open',note:'TEST staff only'});const taskId=store.read(operator).deskHistory.at(-1).taskId;
 await desk('desk_task_save',{taskId,orderId,title:'TEST follow-up done',dueDate:today,status:'done',note:'TEST completed manually'});assert($('[data-desk-tasks]').textContent.includes('done'));
 const grid=$('[data-hour-grid]');grid.elements.usageDate.value=today;grid.elements.resourceId.value=resource.id;grid.querySelector('button').click();assert.equal($('[data-hour-grid-result]').querySelectorAll('tr').length,24);assert($('[data-hour-grid-result]').textContent.includes('10:00'));
 const ics='BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nSUMMARY:E2E iCal Guest\r\nDTSTART;VALUE=DATE:20270302\r\nDTEND;VALUE=DATE:20270303\r\nEND:VEVENT\r\nEND:VCALENDAR';
 await desk('ical_import',{resourceId:resource.id,ics,reason:'TEST pasted fixture'});const importId=store.read(operator).deskHistory.at(-1).id;assert.equal(store.read(operator).blocks.length,1);assert.equal(store.read(operator).blocks[0].summary,'E2E iCal Guest');assert($('[data-desk-command=ical_import]').textContent.includes('SUMMARY'));
 set('#date',today);$('#global-nav [data-view=calendar]').click();assert($('#content').textContent.includes('E2E iCal Guest'));$('#global-nav [data-view=customers]').click();
 await desk('ical_revoke',{importId,reason:'TEST revoke fixture'});assert.equal(store.read(operator).blocks.length,0);
 let printed=false;dom.window.print=()=>{printed=document.body.classList.contains('desk-print');};$('[data-desk-print]').click();assert(printed);assert(!document.body.classList.contains('desk-print'));
 $('#global-nav [data-view=business]').click();$('#nav [data-view=parityWorkspace]').click();const invoiceForm=$('[data-parity-query]');for(const [k,v] of Object.entries({kind:'invoice',from:today,to:today,search:orderId}))invoiceForm.elements[k].value=v;invoiceForm.querySelector('button').click();$('[data-parity-results] [data-open-stay]').click();$('[data-stay-preview=scheduled]').click();assert($('[data-scheduled-task]').textContent.includes('TEST follow-up done'));$('#utility-close').click();$('#detail-dialog').close();$('#global-nav [data-view=customers]').click();
 const before=store.read(operator);for(const language of ['en','ms','zh']){set('#language',language);assert($('[data-desk-panel]'));assert(!$('#content').textContent.includes('undefined'));assert($('[data-desk-panel]').textContent.includes('TEST desk announcement'));}assert.equal(store.read(operator).audit.length,before.audit.length);
 $('#global-nav [data-view="home"]').click();assert($('[data-desk-summary]').textContent.includes('TEST welcome'));assert($('[data-desk-summary]').textContent.includes('TEST desk announcement'));
 $('[data-desk-summary] [data-view=parityWorkspace]').click();assert.equal(document.body.dataset.view,'parityWorkspace');assert($('[data-desk-panel]'));
 $('#global-nav [data-view="customers"]').click();set('#property','TEST-PG');assert(!$('#content').textContent.includes('TEST desk announcement'));assert(!$('#content').textContent.includes('TEST company'));
 console.log('Desk completion DOM passed: six settings, corporate linkage/balance, versioned manual follow-up, 24 hourly rows, persisted pasted ICS/revocation, print, home summary, zh/en/ms and property isolation; synthetic SQLite only');
} finally {global.fetch=realFetch;server.closeAllConnections();await new Promise(resolve=>server.close(resolve));store.close();dom.window.close();}
