// Optional in-process DOM verification. This does not operate a browser or the
// user's logged-in sessions. Supply an installed jsdom module path as argv[2].
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {randomBytes,randomUUID} from 'node:crypto';
import {Store} from '../server/store.js';
import {makeServer} from '../server/http.js';
if(!process.argv[2])throw Error('Supply the jsdom module path for this optional verification.');
const {JSDOM,VirtualConsole}=await import(pathToFileURL(resolve(process.argv[2])).href);
const store=new Store(':memory:',{selfCheckin:{key:randomBytes(32),clock:()=>Date.parse('2027-01-20T07:05:00Z')}});store.seedTestProperties();
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
 const action=(type,fields={})=>store.command(operator,{key:randomUUID(),expectedRevision:store.read(operator).revisions['TEST-KL'],command:{type,propertyId:'TEST-KL',...fields}});
 const stay=action('create',{guest:'TEST smart lock DOM',productId:'room',gender:'any',resourceId:'TEST-KL-R1',start:'2027-01-20',end:'2027-01-22',nightly:0});
 const login=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password})});assert.equal(login.status,200);
 await import(new URL('../web/app.js?smart-lock='+randomUUID(),import.meta.url).href);
 $('[data-property="TEST-KL"]').click();
 const settings=()=>{$('#global-nav [data-view="resourcesSettings"]').click();$('#nav [data-view="integration"]').click();};
 settings();assert.equal($('#lock-brand').options.length,19);$('#lock-connect').click();assert($('#lock-settings-error').textContent.includes('API'));assert.equal(store.read(operator).properties[0].smartLock,undefined);
 set('#lock-brand','TTLock (Sciener / Tongtong / 科技侠)');$('#lock-connect').click();await until(()=>store.read(operator).properties.find(p=>p.id==='TEST-KL').smartLock?.connected&&!document.querySelector('#lock-brand')?.disabled,'synthetic connection');
 await until(()=>$('#content').textContent.includes('仅本地测试连接')&&$('#message').textContent.includes('已保存'),'connection refresh complete');
 $('[data-integration-tab="locks"]').click();$('#lock-add').click();set('#lock-binding-form [name=name]','TEST DOM private');$('#lock-binding-form button[type=submit]').click();await until(()=>!$('#utility-dialog').open&&document.querySelectorAll('[data-lock-row]').length===1,'private bind');
 $('#lock-add').click();set('#lock-binding-form [name=name]','TEST DOM common');set('#lock-binding-form [name=kind]','common');const checkbox=$('#lock-binding-form [name=roomTypeIds]');checkbox.checked=true;$('#lock-binding-form button[type=submit]').click();await until(()=>!$('#utility-dialog').open&&document.querySelectorAll('[data-lock-row]').length===2,'common bind');
 set('#lock-filter','no such TEST lock');assert.equal(document.querySelectorAll('[data-lock-row]').length,0);set('#lock-filter','R01');assert.equal(document.querySelectorAll('[data-lock-row]').length,2);
 $('[data-integration-tab="setting"]').click();set('#lock-setting-form [name=length]','9');$('#lock-settings-cancel').click();assert.equal($('#lock-setting-form [name=length]').value,'auto');
 set('#lock-setting-form [name=length]','4');set('#lock-setting-form [name=privateBefore]','5');$('#lock-setting-form button[type=submit]').click();await until(()=>store.read(operator).properties.find(p=>p.id==='TEST-KL').smartLock.settings.length===4,'settings persisted');await until(()=>$('#lock-setting-form [name=length]').value==='4','settings refresh');
 const orderSnapshot=structuredClone(store.read(operator).orders);const revision=store.read(operator).revisions['TEST-KL'];
 $('[data-integration-tab="keyCard"]').click();assert($('#content').textContent.includes('Room Key Assistant'));assert.equal($('#content [data-key-card]').querySelectorAll('button,input').length,0);assert.equal(store.read(operator).revisions['TEST-KL'],revision);
 for(const language of ['en','ms','zh']){set('#language',language);assert($('#content [data-key-card]'));assert(!$('#content').textContent.includes('undefined'));}
 $('#global-nav [data-view="calendar"]').click();$('[data-cal-tool="smart-lock"]').click();assert.equal(document.querySelectorAll('[data-smart-lock] [data-lock-row]').length,1);set('[data-smart-lock] input','no matches');assert.equal(document.querySelectorAll('[data-smart-lock] [data-lock-row]').length,0);set('[data-smart-lock] input','TEST');$('[data-lock-tab="common"]').click();assert.equal(document.querySelectorAll('[data-smart-lock] [data-lock-row]').length,1);$('#utility-close').click();
 // Open the actual stay detail rather than a detached test-only dialog.
 set('#calendar-date','2027-01-20');$('[data-action="details"][data-id="'+stay.id+'"]').click();
 await until(()=>document.querySelector('[data-stay-smart-lock]'),'stay smart lock action');$('[data-stay-smart-lock]').click();await until(()=>document.querySelectorAll('[data-stay-lock] output').length===2,'encrypted test passcodes displayed');assert([...document.querySelectorAll('[data-stay-lock] output')].every(o=>/^\d{4}$/.test(o.textContent)));
 $('[data-remote-unlock]').click();await until(()=>$('#utility-error').textContent.includes('拒绝'),'remote unlock refusal');assert.deepEqual(store.read(operator).orders,orderSnapshot);
 const access=store.checkin.lockRead(operator,'TEST-KL',stay.id).rows[0];$('[data-revoke-lock="'+access.accessId+'"]').click();await until(()=>store.db.prepare('SELECT pin FROM sl_access WHERE id=?').get(access.accessId).pin===null,'test revoke');
 await until(()=>document.querySelectorAll('[data-revoke-lock]').length===1,'revoke refresh');$('[data-generate-lock]').click();await until(()=>document.querySelectorAll('[data-revoke-lock]').length===2,'test regenerate');
 $('#utility-close').click();console.log('Smart lock DOM passed: reserved brands, password-free TTLock, private/common binding, search, settings save/cancel, card help only, three languages, stay test PINs, revoke/regenerate, remote refusal; in-memory synthetic SQLite only');
} finally {global.fetch=realFetch;server.closeAllConnections();await new Promise(resolve=>server.close(resolve));store.close();dom.window.close();}
