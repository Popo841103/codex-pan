// Optional in-process DOM verification of team access. It drives the same UI modules
// a browser loads; it does not operate a real browser, does not touch the user's
// logged-in sessions and does not execute SmartOrder. Supply an installed jsdom
// module path as argv[2].
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
const adminName='test-dom-'+randomUUID().slice(0,8),adminPassword=randomUUID();
const admin=store.createUser({username:adminName,password:adminPassword,role:'admin',propertyIds:['TEST-KL','TEST-PG']});
const server=makeServer(store);await new Promise(done=>server.listen(0,'127.0.0.1',done));
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
const set=(selector,value)=>{const node=$(selector);node.value=value;node.dispatchEvent(new dom.window.Event('input',{bubbles:true}));node.dispatchEvent(new dom.window.Event('change',{bubbles:true}));};
const until=async(check,title)=>{for(let n=0;n<1000;n++){if(check())return;await new Promise(done=>setTimeout(done,10));}throw Error('Timed out: '+title+'; UI message: '+(document.querySelector('#message')?.textContent||'')+'; DOM errors: '+errors.map(e=>e.message).join('; '));};
const text=()=>$('#content').textContent;
const memberPassword='dom-member-password';
const memberName='dom-staff-'+randomUUID().slice(0,6);
const login=async(username,password)=>{
  const response=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password})});
  assert.equal(response.status,200,username+' should be able to sign in');
};
const openTeam=async()=>{
  await import(new URL('../web/app.js?team-check='+randomUUID(),import.meta.url).href);
  $('[data-property="TEST-KL"]').click();
  $('#global-nav [data-view="resourcesSettings"]').click();
  await until(()=>document.querySelector('#nav [data-view="teamAccess"]'),'team access entry in the settings group');
  $('#nav [data-view="teamAccess"]').click();
  await until(()=>document.body.dataset.view==='teamAccess','team access view active');
  await until(()=>text().match(/团队与权限|Team & access/),'team access page rendered');
};
try {
  await login(adminName,adminPassword);
  await openTeam();
  assert.match(text(),new RegExp(adminName),'the administrator is listed');
  assert.match(text(),/本人账号|Your own account/,'their own row cannot be edited here');
  assert.match(text(),/房价与资源设置|Rates and resources/,'the page states what each role actually allows');

  // A new member is created through the page, with a viewer account role.
  const form=$('#member-new');
  form.elements.username.value=memberName;
  form.elements.password.value=memberPassword;
  set('#member-new [name=role]','viewer');
  for(const option of form.elements.properties.options)option.selected=['TEST-KL','TEST-PG'].includes(option.value);
  form.dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));
  await until(()=>text().includes(memberName),'the new member appears in the list');
  assert.match(text(),/只读|Read only/,'the member was created with the role chosen on the page');

  // A property override gives that same account operations in one property only.
  set(`#content [data-member-property-role="${memberName}"]`,'operations');
  $(`#content [data-member-apply="${memberName}"]`).click();
  await until(()=>text().match(/运营|Operations/),'the property override is shown after saving');
  assert.match(text(),/管理员|Administrator/,'the change is recorded in the audit list with who made it');

  // Sign in as that member: the override decides what the UI offers, per property.
  await login(memberName,memberPassword);
  await import(new URL('../web/app.js?member-check='+randomUUID(),import.meta.url).href);
  await until(()=>document.querySelector('[data-property="TEST-KL"]'),'property switch rendered for the member');
  $('[data-property="TEST-KL"]').click();
  await until(()=>document.body.dataset.view,'member view rendered');
  assert.equal($('#new').disabled,false,'operations in this property may create a booking');
  $('[data-property="TEST-PG"]').click();
  await until(()=>$('#property').value==='TEST-PG','the other property is selected');
  assert.equal($('#new').disabled,true,'the same account stays a viewer in the other property');

  console.log('Team access DOM passed: member created and audited, property role override applied, and the signed-in member gets different powers per property.');
  await new Promise(done=>setTimeout(done,100));
}finally {
  global.fetch=realFetch;server.closeAllConnections();await new Promise(done=>server.close(done));store.close();dom.window.close();
}
