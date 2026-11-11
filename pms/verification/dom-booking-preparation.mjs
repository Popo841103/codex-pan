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
const until=async(check,title)=>{for(let n=0;n<1000;n++){if(check())return;await new Promise(resolve=>setTimeout(resolve,10));}throw Error('Timed out: '+title+'; UI error: '+(document.querySelector('[data-source-command] output')?.textContent||document.querySelector('#message')?.textContent||'')+'; DOM errors: '+errors.map(e=>e.message).join('; '));};


try {
 const today='2027-03-01';
 const send=command=>store.command(operator,{key:randomUUID(),expectedRevision:store.read(operator).revisions['TEST-KL'],command:{propertyId:'TEST-KL',...command}});
 send({type:'business_date_init',date:today});
 const type=store.read(operator).roomTypes.find(r=>r.propertyId==='TEST-KL');
 send({type:'rate_plan_save',code:'TEST',name:'TEST plan',roomTypeIds:[type.id]});
 send({type:'rates_bulk_update',planCode:'TEST',roomTypeIds:[type.id],ranges:[{from:today,to:today}],weekdays:[1,2,3,4,5,6,7],amount:10000,priceMode:'fixed',sale:'open'});
 send({type:'site_save',slug:'test-preparation',enabled:false,title:{zh:'TEST title',en:'TEST title',ms:'TEST title'},description:{zh:'TEST description',en:'TEST description',ms:'TEST description'},contact:{zh:'TEST contact',en:'TEST contact',ms:'TEST contact'},roomTypeIds:[type.id],planCodes:['TEST']});
 const orderId=send({type:'create',guest:'TEST preparation stay',resourceId:'TEST-KL-R1',productId:'room',gender:'any',start:today,end:'2027-03-02',source:'direct',nightly:10000}).id;
 await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password})});
 await import(new URL('../web/app.js?preparation='+randomUUID(),import.meta.url).href);
 $('[data-property="TEST-KL"]').click();
 $('#global-nav [data-view="resourcesSettings"]').click();$('#nav [data-view="bookingEngineSetup"]').click();
 assert($('[data-booking-preparation]').textContent.includes('test-preparation'));assert.equal($('[data-preparation-text]').querySelectorAll('tr').length,9);assert($('[data-preparation-coverage]').textContent.includes('TEST'));
 const before=store.read(operator);
 let q=$('[data-preparation-query]');q.elements.from.value=today;q.elements.to.value='2027-03-02';q.querySelector('button').click();assert($('[data-preparation-coverage]').textContent.includes('1'));
 q=$('[data-preparation-query]');q.elements.to.value='2027-06-01';q.querySelector('button').click();assert(q.querySelector('output').textContent.length>0);
 for(const language of ['en','ms','zh']){set('#language',language);assert($('[data-booking-preparation]'));assert(!$('#content').textContent.includes('undefined'));}
 $('[data-preparation-step="rates"]').click();assert.equal(document.body.dataset.view,'rates');
 $('#global-nav [data-view="channels"]').click();assert($('[data-booking-preparation]'));$('[data-preparation-step="bookingRequests"]').click();assert.equal(document.body.dataset.view,'bookingRequests');
 $('#global-nav [data-view="calendar"]').click();$('[data-cal-view="dailyStays"]').click();$('[data-daily-query] [name=date]').value=today;$('[data-daily-query] button').click();$('[data-daily-stays] [data-open-stay="'+orderId+'"]').click();
 assert($('[data-stay-more-review]'));$('[data-stay-more-review]').open=true;$('[data-stay-more-review] [data-detail-go="audit"]').click();assert.equal($('#detail-tab-audit').getAttribute('aria-selected'),'true');assert($('[data-stay-more-review]'));
 $('#detail-dialog').close();$('#global-nav [data-view="resourcesSettings"]').click();$('#nav [data-view="bookingEngineSetup"]').click();set('#property','TEST-PG');assert(!$('#content').textContent.includes('test-preparation'));assert(!$('#content').textContent.includes('TEST plan'));
 const after=store.read(operator);assert.deepEqual(after.revisions,before.revisions);assert.equal(after.audit.length,before.audit.length);assert.deepEqual(after.orders,before.orders);
 console.log('Booking preparation DOM passed: actual saved draft, nine language checks, price coverage and invalid range, four safe navigation steps, channels entry, More review/tab drill, zh/en/ms, property isolation and no business writes; synthetic SQLite only');
} finally {global.fetch=realFetch;server.closeAllConnections();await new Promise(resolve=>server.close(resolve));store.close();dom.window.close();}
