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
 const orderId=send({type:'create',guest:'TEST batch08',resourceId:'TEST-KL-R1',productId:'room',gender:'any',start:today,end:'2027-03-02',source:'booking',nightly:10500}).id;
 send({type:'payment',orderId,kind:'payment',amount:10500,method:'cash'});
 await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password})});
 await import(new URL('../web/app.js?internal-display='+randomUUID(),import.meta.url).href);
 $('[data-property="TEST-KL"]').click();
 assert($('#staff-context').textContent.includes(today));assert($('[data-audit-read]'));
 $('#global-nav [data-view="resourcesSettings"]').click();
 async function save(type,values){const form=$('[data-source-command="'+type+'"]'),count=store.read(operator).deskHistory?.length||0;for(const [k,v] of Object.entries(values))form.elements[k].value=String(v);form.dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));await until(()=>store.read(operator).deskHistory?.length===count+1&&$('[data-source-command="'+type+'"]')!==form,'internal save '+type+' '+JSON.stringify(values));}
 await save('channel_source_save',{sourceId:'booking',name:'TEST source label',note:'TEST manual only',active:false,reason:'TEST version'});
 assert($('[data-internal-sources]').textContent.includes('TEST source label'));assert(![...$('#order-form [name=source]').options].some(o=>o.value==='booking'));
 await save('message_draft_save',{draftId:'',orderId,dueDate:'2027-03-05',title:'TEST message draft',text:'TEST manual content',status:'draft',reason:'TEST author'});
 const draftId=store.read(operator).deskHistory.at(-1).draftId;
 await save('message_draft_save',{draftId,orderId,dueDate:'2027-03-05',title:'TEST completed draft',text:'TEST manually handled',status:'done',reason:'TEST manual handling'});
 assert($('[data-message-drafts]').textContent.includes('TEST completed draft'));assert.equal(store.read(operator).orders[0].transactions.length,1);
 $('#nav [data-view="teamAccess"]').click();assert($('[data-effective-permissions]').textContent.includes('✓'));assert($('[data-access-constraints]'));
 $('#global-nav [data-view="calendar"]').click();$('[data-cal-view="dailyStays"]').click();assert($('[data-daily-stays]'));
 const before=store.read(operator);let form=$('[data-daily-query]');form.elements.date.value='2027-03-02';form.elements.query.value='TEST batch08';form.querySelector('button').click();assert($('[data-daily-stays]').textContent.includes('TEST batch08'));assert.equal(store.read(operator).businessDates['TEST-KL'],today);
 for(const language of ['en','ms','zh']){set('#language',language);assert($('[data-daily-stays]'));assert(!$('#content').textContent.includes('undefined'));}
 $('#global-nav [data-view="resourcesSettings"]').click();$('#nav [data-view="nightAuditSettings"]').click();assert($('[data-manual-audit-policy]'));assert($('[data-audit-read-query]'));$('[data-audit-read-query] button').click();
 $('#nav [data-view="bookingRequests"]').click();assert($('[data-request-query]'));$('[data-request-query] button').click();assert.equal($('[data-request-query] output').textContent,'0');
 $('#global-nav [data-view="business"]').click();$('#nav [data-view="parityWorkspace"]').click();
 const q11=$('[data-parity-query]');q11.elements.kind.value='shiftAccrual';q11.elements.from.value=today;q11.elements.to.value=today;q11.querySelector('button').click();
 const visible11=$('[data-parity-results]').textContent;assert(visible11.includes('MYR 105.00'));assert(visible11.includes('TEST batch08'));assert(visible11.includes(store.read(operator).resources.find(r=>r.id==='TEST-KL-R1').label));assert(!visible11.includes(orderId));assert(!visible11.includes('10500'));assert($('[data-parity-note]').textContent.includes('历史'));
 q11.elements.kind.value='invoice';q11.querySelector('button').click();assert($('[data-parity-results]').textContent.includes('MYR 105.00'));assert(!$('[data-parity-results]').textContent.includes(orderId));
 for(const section of ['actorSummary','sourceSummary','receptionSummary','handoverWindows']){const q=$('[data-parity-query]');q.elements.kind.value='managerBusiness';q.elements.section.value=section;q.elements.from.value=today;q.elements.to.value=today;q.querySelector('button').click();assert.equal(q.querySelector('output').textContent,'');}
 assert.equal(store.read(operator).audit.length,before.audit.length);
 $('#global-nav [data-view="resourcesSettings"]').click();set('#property','TEST-PG');assert(!$('#content').textContent.includes('TEST source label'));assert(!$('#content').textContent.includes('TEST completed draft'));
 console.log('Internal display DOM passed: source versions/disabled composer, manual draft completion, effective permissions, selected-day departures, business/local clocks, read-only audit and request filters, four manager sections, zh/en/ms, property isolation; synthetic SQLite only');
} finally {global.fetch=realFetch;server.closeAllConnections();await new Promise(resolve=>server.close(resolve));store.close();dom.window.close();}
