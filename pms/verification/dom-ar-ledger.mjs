// Optional in-process DOM verification. This does not operate a browser or the
// user's logged-in sessions. Supply an installed jsdom module path as argv[2].
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
const server=makeServer(store);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
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
 send({type:'business_date_init',date:'2027-01-10'});
 send({type:'create_reservation',date:'2027-01-09',guest:'TEST AR guest',bookingKind:'individual',companyName:'',autoAssign:false,source:'direct',mode:'reserve',stays:[{productId:'room',roomTypeId:'TEST-KL-legacy-room-any',gender:'any',start:'2027-01-09',end:'2027-01-10',adults:1,children:0,infants:0,occupants:[{name:'TEST A',gender:'any'}],nightly:10000}]});
 const login=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password})});
 assert.equal(login.status,200);
 await import(new URL('../web/app.js?ar-check='+randomUUID(),import.meta.url).href);
 $('[data-property="TEST-KL"]').click();$('#global-nav [data-view="business"]').click();$('#nav [data-view="arLedger"]').click();
 set('[data-ar-command="ar_account_save"] [name="name"]','TEST Company');
 $('[data-ar-command="ar_account_save"] button').click();
 await until(()=>document.querySelector('#ar-select'),'AR account appears');
 $('#global-nav [data-view="orders"]').click();$('#content [data-open-reservation]').click();$('#utility-body [data-open-stay]').click();$('#detail-tab-bill').click();
 set('#ar-post-form [name="dueDate"]','2027-02-10');
 $('#ar-post-form [type="checkbox"]').checked=true;
 $('#ar-post-form button').click();
 await until(()=>store.read(operator).orders[0].folioClosed&&!document.querySelector('#ar-post-form'),'AR posted');
 $('#detail-close').click();$('#global-nav [data-view="business"]').click();$('#nav [data-view="arLedger"]').click();
 set('[data-ar-command="ar_write_off"] [name="amount"]','100');
 $('[data-ar-command="ar_write_off"] button').click();
 await until(()=>document.querySelector('[data-ar-command="ar_undo_write_off"]'),'receipt allocated');
 assert.equal(store.read(operator).arItems[0].open,0);
 assert.equal(store.read(operator).orders[0].transactions.length,0);
 set('[data-ar-command="ar_undo_write_off"] [name="reason"]','TEST receipt reversal');
 $('[data-ar-command="ar_undo_write_off"] button').click();
 await until(()=>store.read(operator).arItems[0].open===10000&&!document.querySelector('[data-ar-command="ar_undo_write_off"]'),'allocation reversed');
 $('#nav [data-view="arReports"]').click();
 assert.equal(document.querySelectorAll('[data-finance-filter="arReport"] option').length,8);
 assert.match($('#content tbody').textContent,/TEST Company/);
 assert.match($('#content tbody').textContent,/100.00/);
 for(const kind of ['balances','postings','allocations','receipts','adjustments','guest','accrual']){
   set('[data-finance-filter="arReport"]',kind);
   assert(!document.querySelector('#content [role="alert"]'),kind);
 }
 set('[data-finance-filter="arReport"]','receipts');
 assert.equal(document.querySelectorAll('#content tbody tr').length,2);
 assert.match($('#content tbody').textContent,/-|−/);
 set('[data-finance-filter="from"]','2027-01-10');
 set('[data-finance-filter="to"]','2027-01-09');
 assert($('#content [role="alert"]'));
 console.log('AR ledger DOM passed: account, folio posting, receipt allocation and reversal');
}finally {
  global.fetch=realFetch;server.closeAllConnections();await new Promise(resolve=>server.close(resolve));store.close();dom.window.close();
}
