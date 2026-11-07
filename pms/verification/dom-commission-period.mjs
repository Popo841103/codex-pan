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
 send({type:'business_date_init',date:'2027-01-31'});
 const order=send({type:'create',guest:'TEST commission month',source:'booking',productId:'room',gender:'any',start:'2027-01-30',end:'2027-01-31',nightly:10000});
 send({type:'commission_save',orderId:order.id,amount:1750,reference:'TEST-INV-MONTH',settled:false});
 const login=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password})});
 assert.equal(login.status,200);
 await import(new URL('../web/app.js?commission-month='+randomUUID(),import.meta.url).href);
 $('[data-property="TEST-KL"]').click();$('#global-nav [data-view="business"]').click();$('#nav [data-view="commission"]').click();
 const submit=()=>{
   set('#commission-close-form [name="month"]','2027-01');
   $('#commission-close-form [type="checkbox"]').checked=true;
   $('#commission-close-form button').click();
 };
 submit();
 await until(()=>$('#message').textContent.length>0,'active month rejected');
 assert.equal(store.read(operator).commissionPeriods.length,0);
 send({type:'night_audit',force:true,reason:'TEST month transition'});
 await $('#refresh').onclick();
 $('#message').textContent='';
 submit();
 await until(()=>$('#message').textContent.length>0,'unsettled invoice rejected');
 assert.equal(store.read(operator).commissionPeriods.length,0);
 send({type:'commission_save',orderId:order.id,amount:1750,reference:'TEST-INV-MONTH',settled:true});
 await $('#refresh').onclick();
 submit();
 await until(()=>store.read(operator).commissionPeriods.length===1&&document.querySelector('[data-commission-period="2027-01"]')?.textContent.includes('TEST-INV-MONTH'),'frozen commission displayed');
 assert.equal(store.read(operator).commissionPeriods[0].total,1750);
 assert.equal(document.querySelectorAll('#commission-form [name="orderId"] option').length,0);
 console.log('Commission month DOM passed');
}finally {
  global.fetch=realFetch;server.closeAllConnections();await new Promise(resolve=>server.close(resolve));store.close();dom.window.close();
}
