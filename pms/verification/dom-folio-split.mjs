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
 store.command(operator,{key:randomUUID(),expectedRevision:0,command:{type:'create_reservation',propertyId:'TEST-KL',id:'test-edit-locales',date:'2027-01-10',guest:'TEST locale editor',bookingKind:'individual',companyName:'',autoAssign:false,source:'direct',mode:'reserve',stays:[{productId:'room',roomTypeId:'TEST-KL-legacy-room-any',gender:'any',start:'2027-01-10',end:'2027-01-12',adults:1,children:0,infants:0,occupants:[{name:'TEST A',gender:'any'}],nightly:10000}]}});
 const orderForCash=store.read(operator).orders[0];store.command(operator,{key:'cash-dom-payment',expectedRevision:1,command:{type:'payment',propertyId:'TEST-KL',orderId:orderForCash.id,kind:'payment',method:'cash',amount:10000}});store.command(operator,{key:'cash-dom-deposit',expectedRevision:2,command:{type:'payment',propertyId:'TEST-KL',orderId:orderForCash.id,kind:'deposit_in',method:'cash',amount:5000}});
 const login=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password})});assert.equal(login.status,200);
 await import(new URL('../web/app.js?locale-check='+randomUUID(),import.meta.url).href);
 $('[data-property="TEST-KL"]').click();$('#global-nav [data-view="orders"]').click();
 $('#content [data-open-reservation]').click();$('#utility-body [data-open-stay]').click();$('#detail-tab-bill').click();

 const rows=[...document.querySelectorAll('[data-split-row]')];
 for(const [index,label,charge,paid] of [[0,'TEST A','100','100'],[1,'TEST B','100','0']]){
   for(const [field,value] of Object.entries({label,charge,paid})) rows[index].querySelector('[name="'+field+'"]').value=value;
 }
 $('#split-form button:last-child').click();
 await until(()=>document.querySelector('[data-split-command="settle_bill"]'),'split rendered');
 assert.equal(document.querySelectorAll('[data-split-command="settle_bill"] button:disabled').length,2);
 set('#payment-form [name="kind"]','deposit_out');set('#payment-form [name="amount"]','50');$('#payment-form button').click();
 await until(()=>document.querySelector('[data-split-command="settle_bill"] button:enabled'),'deposit returned');
 $('[data-split-command="settle_bill"] button:enabled').click();
 await until(()=>document.querySelector('[data-split-command="settle_undo"]'),'first bill closed');
 assert.equal(store.read(operator).orders[0].folioClosed,false);
 const open=store.read(operator).orders[0].splitBills.find(b=>!b.closedBy);
 set('#payment-form [name="kind"]','payment');set('#payment-form [name="amount"]','100');set('#payment-form [name="billId"]',open.id);$('#payment-form button').click();
 await until(()=>document.querySelector('[data-split-command="settle_bill"] button:enabled'),'second bill paid');
 $('[data-split-command="settle_bill"] button:enabled').click();
 await until(()=>document.querySelectorAll('[data-split-command="settle_undo"]').length===2,'both bills settled');
 assert.equal(store.read(operator).orders[0].folioClosed,true);
 set('[data-split-command="settle_undo"] [name="reason"]','TEST reversal');
 $('[data-split-command="settle_undo"] button').click();
 await until(()=>document.querySelectorAll('[data-split-command="settle_undo"]').length===1,'reversed one bill');
 assert.equal(store.read(operator).orders[0].folioClosed,false);
 assert(store.read(operator).orders[0].folioEvents.at(-1).reverses);
 console.log('Split folio DOM passed');
}finally {
  global.fetch=realFetch;server.closeAllConnections();await new Promise(resolve=>server.close(resolve));store.close();dom.window.close();
}
