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
 const send=command=>store.command(operator,{key:randomUUID(),expectedRevision:store.read(operator).revisions['TEST-KL'],command:{propertyId:'TEST-KL',...command}});
 send({type:'business_date_init',date:'2027-02-01'});
 const resource=store.read(operator).resources.find(r=>r.id==='TEST-KL-R1');
 const created=send({type:'create',guest:'TEST parity DOM',productId:'room',gender:'any',resourceId:resource.id,roomTypeId:resource.roomTypeId,start:'2027-02-01',end:'2027-02-03',nightly:12345,source:'direct'});
 await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password})});
 await import(new URL('../web/app.js?parity='+randomUUID(),import.meta.url).href);
 $('[data-property="TEST-KL"]').click();
 $('#global-nav [data-view="customers"]').click();
 const directory=kind=>$('[data-directory-save="'+kind+'"]');
 async function save(kind,values){const form=directory(kind);form.closest('details').open=true;for(const [key,value] of Object.entries(values))form.elements[key].value=value;form.querySelector('button').click();await until(()=>store.read(operator).directoryHistory?.at(-1)?.name===values.name&&directory(kind).elements.name.value==='','directory '+kind);}
 await save('tagGroup',{name:'TEST group'});const groupId=store.read(operator).directoryHistory.at(-1).entryId;
 await save('tag',{name:'TEST tag',groupId});const tagId=store.read(operator).directoryHistory.at(-1).entryId;
 await save('corporate',{name:'TEST company',contact:'TEST contact',phone:'TEST phone'});
 await save('meal',{name:'TEST meal',unitAmount:'10.00'});
 await save('item',{name:'TEST item',unitAmount:'3.00'});
 await save('hourly',{name:'TEST hourly',roomTypeId:resource.roomTypeId,minHours:'2',baseAmount:'20.00',unitHours:'1',unitAmount:'5.00',maxHours:'6'});
 const tagForm=$('[data-customer-tag]');tagForm.elements.orderId.value=created.id;tagForm.elements.tagId.value=tagId;tagForm.querySelector('button').click();
 await until(()=>store.read(operator).customerTagHistory?.length===1&&document.querySelector('[data-customer-tag]')?.elements.orderId.value==='','tag assigned');
 directory('tag').closest('details').open=true;set('[data-directory-save="tag"] [name=entryId]',tagId);assert.equal(directory('tag').elements.name.value,'TEST tag');directory('tag').elements.name.value='TEST renamed';directory('tag').querySelector('button').click();
 await until(()=>store.read(operator).directoryHistory.length===7&&directory('tag').elements.name.value==='','tag version appended');
 directory('tag').closest('details').open=true;set('[data-directory-save="tag"] [name=entryId]',tagId);
 assert.equal(directory('tag').elements.name.value,'TEST renamed');
 directory('tag').elements.name.value='TEST renamed twice';directory('tag').querySelector('button').click();
 await until(()=>store.read(operator).directoryHistory.length===8&&directory('tag').elements.name.value==='','stable directory ID after multiple versions');
 const before=store.read(operator),revision=before.revisions['TEST-KL'],auditCount=before.audit.length;
 $('#nav [data-view="parityWorkspace"]').click();
 const form=$('[data-parity-query]');form.elements.from.value='2027-02-01';form.elements.to.value='2027-02-02';
 let csvBlob;const originalCreate=URL.createObjectURL,originalRevoke=URL.revokeObjectURL,originalAnchor=dom.window.HTMLAnchorElement.prototype.click;
 URL.createObjectURL=blob=>{csvBlob=blob;return 'blob:synthetic';};URL.revokeObjectURL=()=>{};dom.window.HTMLAnchorElement.prototype.click=()=>{};
 for(const kind of ['dailyInventory','futureInventory','housekeepingCalendar','housekeepingList','rateHistory','customerDetails','revenueSummary','transactionSummary','channelSummary','salesSummary','accommodationSummary','quickNoteSummary','invoice']){
  form.elements.kind.value=kind;form.querySelector('button').click();assert.equal(form.querySelector('output').textContent,'',kind);assert($('[data-parity-results] table'),kind);
  $('[data-parity-csv]').click();const csv=await csvBlob.text();assert.equal(csv.split('\r\n').length,document.querySelectorAll('[data-parity-results] tbody tr').length+1,kind);
  if(kind==='customerDetails')assert($('[data-parity-results]').textContent.includes('TEST renamed'));
 }
 form.elements.kind.value='customerDetails';form.elements.search.value='NO MATCH';form.querySelector('button').click();assert.equal(document.querySelectorAll('[data-parity-results] tbody tr').length,0);$('[data-parity-csv]').click();assert.equal((await csvBlob.text()).split('\r\n').length,1);
 form.elements.to.value='2030-01-01';form.querySelector('button').click();assert(form.querySelector('output').textContent);assert($('[data-parity-csv]').disabled);
 form.elements.to.value='2027-02-02';form.elements.search.value='';form.querySelector('button').click();
 const ical=$('[data-parity-ical]');ical.elements.resourceId.value=resource.id;$('[data-parity-ical-export]').click();const ics=await csvBlob.text();assert(!ics.includes('TEST parity DOM'));assert(ics.includes('BEGIN:VEVENT'));
 ical.elements.ics.value=ics;ical.querySelector('button[type="submit"],button:not([type])').click();assert($('[data-ical-preview]').textContent.includes('2027-02-01 → 2027-02-03'));
 ical.elements.ics.value=ics.replace('SUMMARY:Unavailable','RRULE:FREQ=DAILY');ical.querySelector('button:not([type])').click();assert.equal($('[data-ical-preview]').textContent,'');
 for(const language of ['en','ms','zh']){$('#language').value=language;$('#language').dispatchEvent(new dom.window.Event('change',{bubbles:true}));assert($('[data-parity-workspace]'));assert.equal($('[data-parity-query] select').options.length,27);}
 URL.createObjectURL=originalCreate;URL.revokeObjectURL=originalRevoke;dom.window.HTMLAnchorElement.prototype.click=originalAnchor;
 $('#global-nav [data-view="orders"]').click();$('[data-open-stay="'+created.id+'"]').click();$('[data-internal-invoice]').click();assert($('[data-internal-invoice-view]').textContent.includes('24690'));$('#utility-dialog').close();$('#detail-dialog').close();
 assert.equal(store.read(operator).revisions['TEST-KL'],revision);assert.equal(store.read(operator).audit.length,auditCount);assert.deepEqual(store.read(operator).orders,before.orders);
 // Property switch removes both the open invoice and the previous query results.
 set('#property','TEST-PG');assert(!document.querySelector('[data-internal-invoice-view]'));
 $('#global-nav [data-view="business"]').click();$('#nav [data-view="parityWorkspace"]').click();
 assert(!$('[data-directory-panel]').textContent.includes('TEST company'));
 const otherForm=$('[data-parity-query]');otherForm.elements.kind.value='customerDetails';otherForm.elements.from.value='2027-02-01';otherForm.elements.to.value='2027-02-02';otherForm.querySelector('button').click();
 assert.equal(document.querySelectorAll('[data-parity-results] tbody tr').length,0);
 assert(!$('#content').textContent.includes('TEST parity DOM'));
 console.log('Parity workbench DOM passed: six directories, tag versions, 13 read-only queries/CSV, iCal, invoice, zh/en/ms; SQLite synthetic only');
} finally {global.fetch=realFetch;server.closeAllConnections();await new Promise(resolve=>server.close(resolve));store.close();dom.window.close();}
