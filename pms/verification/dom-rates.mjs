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
const until=async(check,title)=>{for(let n=0;n<1000;n++){if(check())return;await new Promise(resolve=>setTimeout(resolve,10));}throw Error('Timed out: '+title+'; UI error: '+(document.querySelector('#utility-error')?.textContent||document.querySelector('#reservation-error')?.textContent||'')+'; DOM errors: '+errors.map(e=>e.message).join('; '));};
try {
 const login=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password})});assert.equal(login.status,200);await import(new URL('../web/app.js?rates='+randomUUID(),import.meta.url).href);$('[data-property="TEST-KL"]').click();$('#global-nav [data-view="channels"]').click();$('[data-rates-open]').click();
 set('#rate-plan-form [name="code"]','PARENT');set('#rate-plan-form [name="name"]','TEST parent');$('#rate-plan-form button').click();await until(()=>store.read(operator).ratePlans.length===1,'create independent plan');await until(()=>$('#rate-bulk-form [name="planCode"]').options.length===1,'plan UI refresh');
 set('#rate-bulk-form [name="from"]','2027-01-01');set('#rate-bulk-form [name="to"]','2027-01-02');set('#rate-bulk-form [name="amount"]','100');set('#rate-bulk-form [name="confirmed"]',true);$('#rate-bulk-form').requestSubmit();await until(()=>store.read(operator).rateCells.length===2,'initial rates');await until(()=>$('#rate-bulk-form [name="amount"]').value==='','rates UI refreshed');
 set('#rate-plan-form [name="code"]','CHILD');set('#rate-plan-form [name="name"]','TEST child');set('#rate-plan-form [name="parentCode"]','PARENT');set('#rate-plan-form [name="adjustmentMode"]','percent');set('#rate-plan-form [name="adjustment"]','10');$('#rate-plan-form button').click();await until(()=>store.read(operator).ratePlans.length===2,'derived plan');const state=store.read(operator);assert.equal(state.rateCells.find(r=>r.planCode==='CHILD').amount,11000);assert.equal($('#rate-bulk-form [name="planCode"]').options.length,1);console.log('Rate DOM passed: independent and derived plan creation, fixed prices, percent serialization, inherited prices and direct-write UI protection.');
}finally {
  global.fetch=realFetch;server.closeAllConnections();await new Promise(resolve=>server.close(resolve));store.close();dom.window.close();
}
