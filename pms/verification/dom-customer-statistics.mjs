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
 send({type:'business_date_init',date:today});
 const resource=store.read(operator).resources.find(r=>r.id==='TEST-KL-R1');
 const created=send({type:'create',guest:'TEST original snapshot',productId:'room',gender:'any',resourceId:resource.id,roomTypeId:resource.roomTypeId,start:today,end:tomorrow,nightly:10000,source:'direct'});
 await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password})});
 await import(new URL('../web/app.js?customerstats='+randomUUID(),import.meta.url).href);
 $('[data-property="TEST-KL"]').click();$('#global-nav [data-view="customers"]').click();
 const directory=kind=>$('[data-directory-save="'+kind+'"]');
 async function save(kind,values){const form=directory(kind);form.closest('details').open=true;for(const [key,value] of Object.entries(values))form.elements[key].value=value;form.querySelector('button').click();await until(()=>store.read(operator).directoryHistory?.at(-1)?.name===values.name&&directory(kind)!==form,'directory '+kind);return store.read(operator).directoryHistory.at(-1).entryId;}
 const customerId=await save('customer',{name:'TEST independent profile',phone:'TEST phone',email:'test@example.invalid',birthday:'2000-02-29',documentHint:'1234',active:'true'});
 const categoryId=await save('quickCategory',{name:'TEST reception receipts',direction:'payment',active:'true'});
 const itemId=await save('item',{name:'TEST towel',unitAmount:'3.50'});
 await save('invoiceTemplate',{name:'TEST internal template',heading:'TEST internal invoice',footer:'TEST no tax submission',active:'true'});
 const hourlyId=await save('hourly',{name:'TEST hourly rate',roomTypeId:resource.roomTypeId,minHours:'2',maxHours:'8',baseAmount:'20.00',unitHours:'2',unitAmount:'5.00'});
 async function complete(type,values){const form=$('[data-completion-command="'+type+'"]'),count=store.read(operator).completionHistory?.length||0;form.closest('details').open=true;for(const [key,value] of Object.entries(values))form.elements[key].value=value;form.querySelector('button').click();await until(()=>store.read(operator).completionHistory?.length===count+1&&$('[data-completion-command="'+type+'"]')!==form,'completion '+type);}
 await complete('customer_link',{orderId:created.id,customerId,reason:'TEST explicit verified link'});
 assert($('[data-completion-panel]').textContent.includes('TEST original snapshot'));
 await complete('quick_entry',{orderId:created.id,categoryId,amount:'12.00',method:'cash',note:'TEST attributed receipt'});
 await complete('item_charge',{orderId:created.id,itemId,quantity:'2',note:'TEST confirm price'});
 await complete('create_hourly',{hourlyId,resourceId:'TEST-KL-R2',guest:'TEST hourly DOM',usageDate:today,startTime:'10:00',hours:'3'});
 const hourly=store.read(operator).orders.find(o=>o.hourly);assert.equal(hourly.nightly,2500);assert.equal(store.read(operator).orders.find(o=>o.id===created.id).guest,'TEST original snapshot');
 const bad=$('[data-completion-command="quick_entry"]');bad.closest('details').open=true;for(const [key,value] of Object.entries({orderId:created.id,categoryId,amount:'0',note:'TEST invalid'}))bad.elements[key].value=value;bad.dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));await until(()=>bad.querySelector('output').textContent&&!bad.querySelector('button').disabled,'invalid quick entry');assert.equal(store.read(operator).completionHistory.length,4);
 $('#global-nav [data-view="business"]').click();$('#nav [data-view="parityWorkspace"]').click();
 let csvBlob;const oldCreate=URL.createObjectURL,oldRevoke=URL.revokeObjectURL,oldClick=dom.window.HTMLAnchorElement.prototype.click;
 URL.createObjectURL=blob=>{csvBlob=blob;return 'blob:TEST';};URL.revokeObjectURL=()=>{};dom.window.HTMLAnchorElement.prototype.click=function(){};
 const query=(kind,extra={})=>{const f=$('[data-parity-query]');f.reset();for(const [key,value] of Object.entries({kind,from:today,to:today,...extra}))f.elements[key].value=value;f.querySelector('button').click();assert.equal(f.querySelector('output').textContent,'',kind);return $('[data-parity-results]');};
 assert(query('customerProfiles',{customerId}).textContent.includes('TEST independent profile'));
 for(const kind of ['revenueSummary','transactionSummary','channelSummary','salesSummary']){const r=query(kind,{dimension:'source',dimension2:'roomTypeId'});assert(r.querySelectorAll('tbody tr').length);$('[data-parity-csv]').click();assert.equal((await csvBlob.text()).split('\r\n').length,r.querySelectorAll('tbody tr').length+1);}
 for(const dimension of ['date','source','roomTypeId','resourceId','productId'])assert(query('accommodationSummary',{dimension}).querySelectorAll('tbody tr').length);
 assert(query('quickEntries').textContent.includes('TEST reception receipts'));
 assert(query('quickNoteSummary').textContent.includes('TEST attributed receipt'));
 assert(query('transactionDetail',{method:'cash',actor:username}).textContent.includes('MYR 12.00'));
 assert(query('ledgerRecords',{createdFrom:today,createdTo:today,section:'staySummary'}).textContent.includes('TEST original snapshot'));
 assert.equal(query('ledgerRecords',{completedFrom:today,completedTo:today,section:'staySummary'}).querySelectorAll('tbody tr').length,0);
 assert(query('hourlyReservations').textContent.includes('MYR 25.00'));
 const invoice=query('invoice',{search:created.id});assert(invoice.textContent.includes('TEST internal invoice'));assert(invoice.textContent.includes('MYR 107.00'));
 invoice.querySelector('[data-open-stay]').click();$('[data-internal-invoice]').click();assert($('[data-internal-invoice-view]').textContent.includes('TEST no tax submission'));
 let printed=false;dom.window.print=()=>{printed=document.body.classList.contains('invoice-print');};$('[data-invoice-print]').click();assert(printed);assert(!document.body.classList.contains('invoice-print'));$('#utility-close').click();$('#detail-dialog').close();
 const before=store.read(operator);for(const language of ['en','ms','zh']){set('#language',language);assert($('[data-completion-panel]'));assert(!$('#content').textContent.includes('undefined'));assert(query('customerProfiles').textContent.includes('TEST independent profile'));}
 assert.deepEqual(store.read(operator).orders,before.orders);assert.equal(store.read(operator).audit.length,before.audit.length);
 set('#property','TEST-PG');assert(!$('#content').textContent.includes('TEST independent profile'));assert(!$('#content').textContent.includes('TEST attributed receipt'));
 URL.createObjectURL=oldCreate;URL.revokeObjectURL=oldRevoke;dom.window.HTMLAnchorElement.prototype.click=oldClick;
 console.log('Customer statistics DOM passed: profiles/link, attributed quick receipt, item snapshot, hourly booking, dimensions/CSV, creation/completion filters, printable invoice, three languages and property isolation; synthetic SQLite only');
} finally {global.fetch=realFetch;server.closeAllConnections();await new Promise(resolve=>server.close(resolve));store.close();dom.window.close();}
