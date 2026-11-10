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
const operator=store.createUser({username,password,role:'admin',propertyIds:['TEST-KL']});
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
 send({type:'shift_save',name:'TEST shift',start:'08:00',end:'16:00'});
 await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password})});
 await import(new URL('../web/app.js?internal='+randomUUID(),import.meta.url).href);
 $('[data-property="TEST-KL"]').click();
 const nav=view=>{const link=document.querySelector('#nav [data-view="'+view+'"]')||document.querySelector('#global-nav [data-view="'+view+'"]');assert(link,'navigation '+view);link.click();};
 $('#notifications').click();
 const form=type=>$('[data-internal-command="'+type+'"]');
 form('notice_send').elements.text.value='TEST DOM notice';form('notice_send').querySelector('button').click();
 await until(()=>store.read(operator).staffNotices?.length===1&&document.querySelector('[data-staff-history]')?.textContent.includes('TEST DOM notice'),'notice sent');
 $('[name="noticeSearch"]').value='not matching';$('[name="noticeSearch"]').dispatchEvent(new dom.window.Event('input',{bubbles:true}));assert($('[data-history-row]').hidden);
 form('notice_withdraw').elements.reason.value='TEST correction';form('notice_withdraw').querySelector('button').click();
 await until(()=>store.read(operator).noticeWithdrawals?.length===1&&document.querySelector('[data-staff-history]')?.textContent.includes('TEST correction'),'withdrawn original retained');
 form('notice_scope_save').elements.username.value=username;form('notice_scope_save').elements.kind.value='rooms_to_clean';form('notice_scope_save').elements.level.value='urgent';form('notice_scope_save').querySelector('button').click();
 await until(()=>store.read(operator).noticeScopes?.length===1&&document.querySelector('[data-internal-command="notice_scope_save"]')?.elements.username.value==='','scope setting');
 const report=$('[data-internal-report]');report.elements.from.value='2027-02-01';report.elements.to.value='2027-02-01';report.querySelector('button').click();await until(()=>document.querySelector('[data-report-results]')?.textContent.includes('TEST DOM notice'),'reminder report');

 let csvBlob;const originalCreate=URL.createObjectURL,originalRevoke=URL.revokeObjectURL,originalAnchor=dom.window.HTMLAnchorElement.prototype.click;
 URL.createObjectURL=blob=>{csvBlob=blob;return 'blob:synthetic';};URL.revokeObjectURL=()=>{};dom.window.HTMLAnchorElement.prototype.click=()=>{};
 $('[data-report-csv]').click();assert((await csvBlob.text()).includes('TEST DOM notice'));URL.createObjectURL=originalCreate;URL.revokeObjectURL=originalRevoke;dom.window.HTMLAnchorElement.prototype.click=originalAnchor;
 nav('resourcesSettings');$('[data-listing-preview] textarea').value='https://example.com/room\nhttps://example.com/private';$('[data-listing-preview] button').click();
 await until(()=>document.querySelector('[data-listing-confirm]'),'listing preview');assert.equal(store.read(operator).listingDrafts?.length||0,0);
 $('[data-listing-confirm]').click();assert.equal(store.read(operator).listingDrafts?.length||0,0);
 $('[data-listing-check]').checked=true;$('[data-listing-confirm]').click();await until(()=>store.read(operator).listingDrafts?.length===1&&document.querySelector('[data-listing-preview] textarea')?.value==='','draft confirmed');
 let content=form('booking_content_save');content.elements.photos.value='https://example.com/2.jpg\nhttps://example.com/1.jpg';content.elements.cover.value='https://example.com/1.jpg';for(const l of ['zh','en','ms'])content.elements['description_'+l].value='TEST '+l;content.querySelector('button').click();
 await until(()=>store.read(operator).contentHistory?.length===1&&document.querySelector('[data-internal-command="booking_content_save"]')!==content&&document.querySelector('[data-internal-command="booking_content_save"]')?.elements.description_en.value==='TEST en','content saved and loaded');
 $('#global-nav [data-view="business"]').click();nav('commission');form('commission_rate_save').elements.source.value='booking';form('commission_rate_save').elements.percent.value='15';form('commission_rate_save').elements.effectiveFrom.value='2027-02-01';form('commission_rate_save').querySelector('button').click();await until(()=>store.read(operator).commissionRates?.length===1&&document.querySelector('[data-internal-operations]')?.textContent.includes('15%'),'rate history');
 for(const language of ['en','ms','zh']){$('#language').value=language;$('#language').dispatchEvent(new dom.window.Event('change',{bubbles:true}));assert(document.querySelector('[data-internal-operations]'));}


 send({type:'site_save',slug:'test-dom-public',enabled:true,title:{en:'TEST public'},roomTypeIds:[],planCodes:[]});
 const publicResponse=await fetch('/sites/test-dom-public?lang=en&from=2027-04-01&to=2027-04-02&guests=1');assert(publicResponse.headers.get('content-security-policy').includes('https:'));
 const publicDom=new JSDOM(await publicResponse.text(),{url:base+'/sites/test-dom-public'}),publicDoc=publicDom.window.document;
 assert(publicDoc.querySelector('[data-booking-photos] img'));assert(publicDoc.querySelector('[data-booking-description]').textContent.includes('TEST en'));
 const publicForm=publicDoc.querySelector('form.request');publicForm.querySelector('[name="multi"]').checked=true;
 const quantities=[...publicForm.querySelectorAll('[name^="select_"]')];assert(quantities.length>=2);quantities.forEach((input,i)=>input.value=i<2?'1':'0');publicForm.elements.name.value='TEST multi public DOM';publicForm.elements.contact.value='test@example.com';
 const publicData=new URLSearchParams([...new publicDom.window.FormData(publicForm)].map(([k,v])=>[k,String(v)]));
 await fetch(publicForm.action,{method:'POST',body:publicData});assert.equal(store.read(operator).bookingRequests.find(r=>r.guest==='TEST multi public DOM').selections.length,2);publicDom.window.close();
 await $('#refresh').onclick();
 const stay=send({type:'create',guest:'TEST query stay',source:'direct',productId:'room',gender:'any',resourceId:'TEST-KL-R1',start:'2027-02-02',end:'2027-02-03',nightly:0});await $('#refresh').onclick();
 $('#global-nav [data-view="calendar"]').click();set('#calendar-date','2027-02-02');
 const before=store.read(operator).revisions['TEST-KL'];$('[data-calendar-range-query]').click();assert($('[data-calendar-range-results]').textContent.includes('TEST query stay'));set('[data-calendar-query-search]','NO MATCH');assert($('[data-calendar-query-row]').hidden);$('#utility-dialog').close();
 $('[data-action="details"][data-id="'+stay.id+'"]').click();$('[data-reservation-history]').click();assert($('[data-reservation-history-query]').textContent.includes('2027-02-02'));assert.equal(store.read(operator).revisions['TEST-KL'],before);
 console.log('Internal A1-A5/A7/A8 DOM passed (fixtures and synthetic SQLite only)');
}finally {
 global.fetch=realFetch;server.closeAllConnections();await new Promise(resolve=>server.close(resolve));store.close();dom.window.close();
}
