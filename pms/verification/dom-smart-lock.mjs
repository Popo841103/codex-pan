// Optional in-process DOM verification. This does not operate a browser or the
// user's logged-in sessions. Supply an installed jsdom module path as argv[2].
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {randomBytes,randomUUID} from 'node:crypto';
import {typeName} from '../src/catalog.js';
import {Store} from '../server/store.js';
import {makeServer} from '../server/http.js';
if(!process.argv[2])throw Error('Supply the jsdom module path for this optional verification.');
const {JSDOM,VirtualConsole}=await import(pathToFileURL(resolve(process.argv[2])).href);
let now=Date.parse('2027-01-20T07:05:00Z');
const store=new Store(':memory:',{selfCheckin:{key:randomBytes(32),clock:()=>now}});store.seedTestProperties();
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
 const savedBody=store.checkin.body('TEST-KL');savedBody.resources.find(r=>r.id==='TEST-KL-R1').label='101';
 const type=savedBody.roomTypes.find(t=>t.id===savedBody.resources.find(r=>r.id==='TEST-KL-R1').roomTypeId);delete type.name;type.names={zh:'标准大床',en:'Standard King',ms:'Katil King'};
 store.db.prepare('UPDATE properties SET body=? WHERE id=?').run(JSON.stringify(savedBody),'TEST-KL');
 const stay=action('create',{guest:'TEST smart lock DOM',productId:'room',gender:'any',resourceId:'TEST-KL-R1',start:'2027-01-20',end:'2027-01-22',nightly:0});
 const hourlyBody=store.checkin.body('TEST-KL');hourlyBody.orders.find(o=>o.id===stay.id).hourly={usageDate:'2027-01-20',startTime:'14:00',endTime:'17:00',hours:3};store.db.prepare('UPDATE properties SET body=? WHERE id=?').run(JSON.stringify(hourlyBody),'TEST-KL');
 const login=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password})});assert.equal(login.status,200);
 await import(new URL('../web/app.js?smart-lock='+randomUUID(),import.meta.url).href);
 $('[data-property="TEST-KL"]').click();
 const settings=()=>{$('#global-nav [data-view="resourcesSettings"]').click();$('#nav [data-view="integration"]').click();};
 settings();assert.equal($('#lock-brand').options.length,19);$('#lock-connect').click();assert($('#lock-settings-error').textContent.includes('API'));assert.equal(store.read(operator).properties[0].smartLock,undefined);
 set('#lock-brand','TTLock (Sciener / Tongtong / 科技侠)');$('#lock-connect').click();await until(()=>store.read(operator).properties.find(p=>p.id==='TEST-KL').smartLock?.connected&&!document.querySelector('#lock-brand')?.disabled,'synthetic connection');
 await until(()=>$('#content').textContent.includes('仅本地测试连接')&&$('#message').textContent.includes('已保存'),'connection refresh complete');
 assert.equal($('#lock-connect').textContent,'仅本地测试连接');assert($('#lock-connect').disabled);
 await until(()=>$('#message').textContent==='','success flash timeout');
 $('[data-integration-tab="locks"]').click();assert.equal($('#message').textContent,'');$('#lock-add').click();assert.equal($('#utility-title').textContent,'添加合成锁');assert($('#lock-binding-form [name=kind]').closest('label').textContent.startsWith('门锁类型'));set('#lock-binding-form [name=name]','TEST-101 客房锁');$('#lock-binding-form button[type=submit]').click();await until(()=>!$('#utility-dialog').open&&document.querySelectorAll('[data-lock-row]').length===1,'private bind');
 $('#lock-add').click();set('#lock-binding-form [name=name]','TEST DOM common');set('#lock-binding-form [name=kind]','common');const checkbox=$('#lock-binding-form [name=roomTypeIds][value="'+type.id+'"]');assert(checkbox.closest('label').textContent.includes('标准大床'));checkbox.checked=true;$('#lock-binding-form button[type=submit]').click();await until(()=>!$('#utility-dialog').open&&document.querySelectorAll('[data-lock-row]').length===2,'common bind');
 set('#lock-filter','no such TEST lock');assert.equal(document.querySelectorAll('[data-lock-row]').length,0);set('#lock-filter','101');assert.equal(document.querySelectorAll('[data-lock-row]').length,1);assert(!$('#lock-table').textContent.includes('TEST · TEST'));set('#lock-filter','标准大床');assert.equal(document.querySelectorAll('[data-lock-row]').length,2);assert(!$('#lock-table').textContent.includes(type.id));
 const commonRow=[...document.querySelectorAll('[data-lock-row]')].find(r=>r.textContent.includes('TEST DOM common'));assert.equal(commonRow.children[1].textContent,'标准大床');
 for(const [language,title,kindLabel,addTitle] of [['en','Edit synthetic lock','Door type','Add synthetic lock'],['ms','Edit kunci sintetik','Jenis pintu','Tambah kunci sintetik'],['zh','编辑合成锁','门锁类型','添加合成锁']]){set('#language',language);$('[data-lock-edit]').click();assert.equal($('#utility-title').textContent,title);assert($('#lock-binding-form [name=kind]').closest('label').textContent.startsWith(kindLabel));assert($('#lock-binding-form [name=roomTypeIds][value="'+type.id+'"]').closest('label').textContent.includes(typeName(type,language,type.id)));$('[data-lock-cancel]').click();$('#lock-add').click();assert.equal($('#utility-title').textContent,addTitle);$('[data-lock-cancel]').click();}
 $('#global-nav [data-view="calendar"]').click();assert.equal($('#message').textContent,'');settings();$('[data-integration-tab="setting"]').click();
 set('#lock-setting-form [name=length]','9');$('#lock-settings-cancel').click();assert.equal($('#lock-setting-form [name=length]').value,'auto');
 set('#lock-setting-form [name=length]','4');set('#lock-setting-form [name=privateBefore]','5');$('#lock-setting-form button[type=submit]').click();await until(()=>store.read(operator).properties.find(p=>p.id==='TEST-KL').smartLock.settings.length===4,'settings persisted');await until(()=>$('#lock-setting-form [name=length]').value==='4','settings refresh');
 const previousForm=$('#lock-setting-form');set('#lock-setting-form [name=privateBefore]','12');$('#lock-setting-form button[type=submit]').click();await until(()=>store.read(operator).properties.find(p=>p.id==='TEST-KL').smartLock.settings.privateBefore===12&&$('#lock-setting-form')!==previousForm&&$('#message').textContent.includes('已保存'),'12-hour settings');
 const orderSnapshot=structuredClone(store.read(operator).orders);const revision=store.read(operator).revisions['TEST-KL'];
 $('[data-integration-tab="keyCard"]').click();assert($('#content').textContent.includes('Room Key Assistant'));assert.equal($('#content [data-key-card]').querySelectorAll('button,input').length,0);assert.equal(store.read(operator).revisions['TEST-KL'],revision);
 for(const language of ['en','ms','zh']){set('#language',language);assert($('#content [data-key-card]'));assert(!$('#content').textContent.includes('undefined'));}
 $('#global-nav [data-view="calendar"]').click();$('[data-cal-tool="smart-lock"]').click();assert.equal(document.querySelectorAll('[data-smart-lock] [data-lock-row]').length,1);set('[data-smart-lock] input','no matches');assert.equal(document.querySelectorAll('[data-smart-lock] [data-lock-row]').length,0);set('[data-smart-lock] input','TEST');$('[data-lock-tab="common"]').click();assert.equal(document.querySelectorAll('[data-smart-lock] [data-lock-row]').length,1);$('#utility-close').click();
 $('#message').textContent='测试操作已保存';
 // Open the actual stay detail rather than a detached test-only dialog.
 set('#calendar-date','2027-01-20');$('[data-action="details"][data-id="'+stay.id+'"]').click();
 await until(()=>document.querySelector('[data-stay-smart-lock]'),'stay smart lock action');assert.equal($('#message').textContent,'');$('[data-stay-smart-lock]').click();await until(()=>document.querySelectorAll('[data-stay-lock] output').length===2,'encrypted test passcodes displayed');assert([...document.querySelectorAll('[data-stay-lock] output')].every(o=>/^\d{4}$/.test(o.textContent)));
 const expectedWindow='2027/1/20 02:00:00 → 2027/1/21 05:00:00';assert([...document.querySelectorAll('[data-stay-lock] tbody tr')].every(r=>r.children[2].textContent===expectedWindow));
 $('[data-remote-unlock]').click();await until(()=>$('#utility-error').textContent.includes('拒绝'),'remote unlock refusal');assert.deepEqual(store.read(operator).orders,orderSnapshot);
 const access=store.checkin.lockRead(operator,'TEST-KL',stay.id).rows[0];$('[data-revoke-lock="'+access.accessId+'"]').click();await until(()=>store.db.prepare('SELECT pin FROM sl_access WHERE id=?').get(access.accessId).pin===null,'test revoke');
 await until(()=>document.querySelectorAll('[data-revoke-lock]').length===1,'revoke refresh');$('[data-generate-lock]').click();await until(()=>document.querySelectorAll('[data-revoke-lock]').length===2,'test regenerate');
 // Reopen after the raw 17:00 end, with invalidated legacy signatures.
 $('#utility-close').click();now=Date.parse('2027-01-20T18:10:00+08:00');
 store.db.prepare("UPDATE sl_access SET signature='legacy-hotel-window' WHERE status='test_active'").run();
 const openPanel=()=>{$('[data-stay-smart-lock]').click();};
 openPanel();await until(()=>document.querySelectorAll('[data-revoke-lock]').length===2,'buffer auto-generation on panel open');
 const bufferPins=[...document.querySelectorAll('[data-stay-lock] output')].map(o=>o.textContent);assert(bufferPins.every(p=>/^\d{4}$/.test(p)));
 assert([...document.querySelectorAll('[data-stay-lock] tbody tr')].every(r=>r.children[2].textContent===expectedWindow));
 $('#utility-close').click();openPanel();await until(()=>document.querySelectorAll('[data-revoke-lock]').length===2,'buffer reopen');assert.deepEqual([...document.querySelectorAll('[data-stay-lock] output')].map(o=>o.textContent),bufferPins);
 for(const row of store.checkin.lockRead(operator,'TEST-KL',stay.id).rows)store.checkin.lockCommand(operator,{propertyId:'TEST-KL',orderId:stay.id,action:'revoke',accessId:row.accessId});
 $('#utility-close').click();openPanel();await until(()=>document.querySelectorAll('[data-stay-lock] output').length===2&&!document.querySelector('[data-revoke-lock]'),'manual revocations stay revoked');
 $('[data-generate-lock]').click();await until(()=>document.querySelectorAll('[data-revoke-lock]').length===2,'buffer manual generation');assert([...document.querySelectorAll('[data-stay-lock] output')].every(o=>/^\d{4}$/.test(o.textContent)));
 $('#utility-close').click();now=Date.parse('2027-01-21T05:00:00+08:00');openPanel();await until(()=>document.querySelectorAll('[data-stay-lock] output').length===2&&!document.querySelector('[data-revoke-lock]'),'expired window hides PINs');assert([...document.querySelectorAll('[data-stay-lock] output')].every(o=>o.textContent==='—'));
 $('[data-generate-lock]').click();await until(()=>$('#utility-error').textContent.includes('住宿不可生成'),'expired generation refusal');
 $('#utility-close').click();console.log('Smart lock DOM passed: reserved brands, password-free TTLock, private/common binding, search, settings save/cancel, card help only, three languages, stay test PINs, revoke/regenerate, remote refusal; in-memory synthetic SQLite only');
} finally {global.fetch=realFetch;server.closeAllConnections();await new Promise(resolve=>server.close(resolve));store.close();dom.window.close();}
