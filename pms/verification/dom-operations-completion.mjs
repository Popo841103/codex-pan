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
 const {localDay}=await import('../src/dashboard.js'),today=localDay(new Date()),tomorrow=new Date(Date.parse(today)+86400000).toISOString().slice(0,10);
 const send=command=>store.command(operator,{key:randomUUID(),expectedRevision:store.read(operator).revisions['TEST-KL'],command:{propertyId:'TEST-KL',...command}});
 send({type:'business_date_init',date:'2027-02-01'});
 const resource=store.read(operator).resources.find(r=>r.id==='TEST-KL-R1');
 const created=send({type:'create',guest:'TEST operations DOM',productId:'room',gender:'any',resourceId:resource.id,roomTypeId:resource.roomTypeId,start:today,end:tomorrow,nightly:10000,source:'direct'});
 await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password})});
 await import(new URL('../web/app.js?operations='+randomUUID(),import.meta.url).href);
 $('[data-property="TEST-KL"]').click();$('#global-nav [data-view="customers"]').click();
 const directory=kind=>$('[data-directory-save="'+kind+'"]');
 async function save(kind,values){const form=directory(kind);form.closest('details').open=true;for(const [key,value] of Object.entries(values))form.elements[key].value=value;form.querySelector('button').click();await until(()=>store.read(operator).directoryHistory?.at(-1)?.name===values.name&&directory(kind).elements.name.value==='','directory '+kind);}
 await save('meal',{name:'TEST breakfast',unitAmount:'800'});const mealId=store.read(operator).directoryHistory.at(-1).entryId;
 await save('holiday',{name:'TEST internal holiday',date:today,eventType:'holiday',heat:'high',active:'true'});
 await save('inspectionItem',{name:'TEST linen inspection',roomTypeId:resource.roomTypeId,active:'true'});const itemId=store.read(operator).directoryHistory.at(-1).entryId;
 async function operation(type,values,checks=[]){const form=$('[data-operations-command="'+type+'"]'),count=store.read(operator).operationsHistory?.length||0;for(const [key,value] of Object.entries(values))form.elements[key].value=value;for(const id of checks)form.querySelector('[data-inspection-item="'+id+'"]').checked=true;form.querySelector('button').click();await until(()=>store.read(operator).operationsHistory?.length===count+1&&!$('[data-operations-command="'+type+'"] button').disabled,'operation '+type);}
 await operation('meal_grant',{orderId:created.id,mealId,usageDate:today,quantity:'3'});const entitlementId=store.read(operator).operationsHistory.at(-1).id;
 await operation('meal_redeem',{entitlementId,quantity:'2'});const redemptionId=store.read(operator).operationsHistory.at(-1).id;
 assert($('[data-operations-panel]').textContent.includes('2 / 3'));
 await operation('meal_reverse',{redemptionId,reason:'TEST correction'});assert($('[data-operations-panel]').textContent.includes('0 / 3'));
 await operation('inspection_record',{resourceId:resource.id,note:'TEST clean'},[itemId]);assert.equal(store.read(operator).operationsHistory.at(-1).results[0].passed,true);
 await operation('housekeeping_task',{resourceId:resource.id,date:today,status:'open',assignee:username,note:'TEST turnover'});const taskId=store.read(operator).operationsHistory.at(-1).taskId;
 set('[data-operations-command="housekeeping_task"] [name=taskId]',taskId);assert.equal($('[data-operations-command="housekeeping_task"] [name=note]').value,'TEST turnover');
 await operation('housekeeping_task',{taskId,resourceId:resource.id,date:today,status:'done',assignee:username,note:'TEST done'});
 await operation('reservation_failure_record',{date:today,reference:'TEST failed DOM',reason:'TEST unavailable'});
 send({type:'payment',orderId:created.id,kind:'payment',amount:5000,method:'cash'});await $('#refresh').onclick();
 $('#global-nav [data-view="business"]').click();$('#nav [data-view="parityWorkspace"]').click();
 let csvBlob;const oldCreate=URL.createObjectURL,oldRevoke=URL.revokeObjectURL,oldClick=dom.window.HTMLAnchorElement.prototype.click;
 URL.createObjectURL=blob=>{csvBlob=blob;return 'blob:TEST';};URL.revokeObjectURL=()=>{};dom.window.HTMLAnchorElement.prototype.click=function(){};
 const query=(kind,from=today,to=from,extra={})=>{const f=$('[data-parity-query]');f.reset();f.elements.kind.value=kind;f.elements.from.value=from;f.elements.to.value=to;for(const [key,value] of Object.entries(extra))f.elements[key].value=value;f.querySelector('button').click();assert.equal(f.querySelector('output').textContent,'',kind);return $('[data-parity-results]');};
 for(const kind of ['mealRedemption','mealSummary','holidays','inspections','failedReservations','shiftAccrual','managerBusiness','ledgerRecords','accrualOperating','guestBalances']){query(kind,['inspections','shiftAccrual','managerBusiness','ledgerRecords','accrualOperating','guestBalances'].includes(kind)?'2027-02-01':today);$('[data-parity-csv]').click();assert.equal((await csvBlob.text()).split('\r\n').length,document.querySelectorAll('[data-parity-results] tbody tr').length+1,kind);}
 assert(query('holidays').querySelector('[data-holiday-calendar]').textContent.includes('TEST internal holiday'));
 assert(query('housekeepingList').textContent.includes(taskId+':done'));
 assert(query('managerBusiness','2027-02-01','2027-02-01',{section:'cashierSummary'}).textContent.includes('5000'));
 assert(query('managerBusiness','2027-02-01','2027-02-01',{section:'roomCards'}).textContent.includes('未接通'));
 const before=store.read(operator);for(const language of ['en','ms','zh']){set('#language',language);assert($('[data-operations-panel]'));assert.equal($('[data-parity-query] [name=kind]').options.length,27);query('mealSummary');}
 assert.equal(store.read(operator).audit.length,before.audit.length);assert.deepEqual(store.read(operator).orders,before.orders);
 set('#property','TEST-PG');assert(!$('#content').textContent.includes('TEST breakfast'));assert(!$('#content').textContent.includes('TEST failed DOM'));
 URL.createObjectURL=oldCreate;URL.revokeObjectURL=oldRevoke;dom.window.HTMLAnchorElement.prototype.click=oldClick;
 console.log('Operations completion DOM passed: meal grant/redeem/reversal, holidays, checklist, task transitions, failed list, 10 reports/CSV, three languages and property isolation; synthetic SQLite only');
} finally {global.fetch=realFetch;server.closeAllConnections();await new Promise(resolve=>server.close(resolve));store.close();dom.window.close();}
