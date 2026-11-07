// Optional in-process DOM verification of property-defined roles. It drives the same UI
// modules a browser loads; it does not operate a real browser and does not execute
// SmartOrder. Supply an installed jsdom module path as argv[2].
//
// What this proves: the settings page draws the whole grantable surface (every action the
// server enforces, grouped by module), a role created on that page carries exactly the
// ticks that were made, a member handed that role gets those powers and nothing else, and
// a role somebody still holds cannot be deleted.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {Store, allActions} from '../server/store.js';
import {makeServer} from '../server/http.js';
if(!process.argv[2])throw Error('Supply the jsdom module path for this optional verification.');
const {JSDOM,VirtualConsole}=await import(pathToFileURL(resolve(process.argv[2])).href);
const store=new Store(':memory:');store.seedTestProperties();
const adminName='test-dom-'+randomUUID().slice(0,8),adminPassword=randomUUID();
store.createUser({username:adminName,password:adminPassword,role:'admin',propertyIds:['TEST-KL','TEST-PG']});
const server=makeServer(store);await new Promise(done=>server.listen(0,'127.0.0.1',done));
const base=`http://127.0.0.1:${server.address().port}`,realFetch=fetch,errors=[];
let cookie='';
const dom=new JSDOM(readFileSync(new URL('../web/index.html',import.meta.url),'utf8'),{url:base+'/web/',runScripts:'outside-only',virtualConsole:new VirtualConsole().on('jsdomError',error=>errors.push(error))});
dom.window.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};
dom.window.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};
dom.window.confirm=()=>true;global.confirm=dom.window.confirm;
global.window=dom.window;global.document=dom.window.document;global.FormData=dom.window.FormData;global.localStorage=dom.window.localStorage;global.location=dom.window.location;global.history=dom.window.history;
global.fetch=async(path,options={})=>{
  const response=await realFetch(new URL(path,base),{...options,signal:AbortSignal.timeout(8000),headers:{Origin:base,Cookie:cookie,...options.headers}});
  if(response.headers.has('set-cookie'))cookie=response.headers.get('set-cookie').split(';')[0];return response;
};
const $=selector=>{const node=document.querySelector(selector);assert(node,`Missing DOM control: ${selector}`);return node;};
const set=(selector,value)=>{const node=$(selector);node.value=value;node.dispatchEvent(new dom.window.Event('input',{bubbles:true}));node.dispatchEvent(new dom.window.Event('change',{bubbles:true}));};
const until=async(check,title)=>{for(let n=0;n<1000;n++){if(check())return;await new Promise(done=>setTimeout(done,10));}throw Error('Timed out: '+title+'; UI message: '+(document.querySelector('#message')?.textContent||'')+'; DOM errors: '+errors.map(e=>e.message).join('; '));};
const text=()=>$('#content').textContent;
const memberPassword='dom-member-password';
const memberName='dom-desk-'+randomUUID().slice(0,6);
const roleName='Night desk '+randomUUID().slice(0,4);
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

  // The page offers every action the server enforces, once each, grouped by module.
  const boxes=[...document.querySelectorAll('#role-new input[name=actions]')].map(node=>node.value);
  assert.deepEqual([...new Set(boxes)].sort(),[...allActions].sort(),
    'the role matrix must list exactly the actions the server checks, so no rule is invisible');
  assert.equal(boxes.length,new Set(boxes).size,'no action is offered twice');
  assert.match(text(),/角色就是一组动作|A role is a set of actions/,'the page explains what a role is');

  // Create a role by ticking two actions, then hand it to a member.
  const form=$('#role-new');
  form.elements.name.value=roleName;
  const tick=['notice_severity_save','checkin'];
  for(const box of form.querySelectorAll('input[name=actions]'))box.checked=tick.includes(box.value);
  form.dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));
  await until(()=>text().includes(roleName),'the new role is listed after saving');
  const stored=store.db.prepare('SELECT actions FROM role_definitions WHERE name=?').get(roleName);
  assert(stored,'the role was written by the server');
  assert.deepEqual(JSON.parse(stored.actions),[...tick].sort(),'the role holds exactly the ticks, with no implied defaults');

  const newMember=$('#member-new');
  newMember.elements.username.value=memberName;
  newMember.elements.password.value=memberPassword;
  set('#member-new [name=role]','viewer');
  for(const option of newMember.elements.properties.options)option.selected=option.value==='TEST-KL';
  newMember.dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));
  await until(()=>text().includes(memberName),'the member appears in the list');
  const roleId=store.db.prepare('SELECT id FROM role_definitions WHERE name=?').get(roleName).id;
  set(`#content [data-member-property-role="${memberName}"]`,roleId);
  $(`#content [data-member-apply="${memberName}"]`).click();
  await until(()=>store.db.prepare('SELECT role FROM user_properties WHERE property_id=? AND user_id=(SELECT id FROM users WHERE username=?)').get('TEST-KL',memberName)?.role===roleId,'the role is assigned in this property');
  assert.match(text(),new RegExp(roleName),'the member row shows the role that was given');

  // A role in use cannot be deleted; the page says why and keeps the role.
  $('[data-role-delete]').click();
  await until(()=>document.querySelector('#message').textContent.length>0,'the refusal is reported');
  assert.equal(store.db.prepare('SELECT COUNT(*) n FROM role_definitions WHERE id=?').get(roleId).n,1,'a role somebody holds is not deleted');

  // The member signs in: the ticked actions are what the interface offers.
  await login(memberName,memberPassword);
  await import(new URL('../web/app.js?member-check='+randomUUID(),import.meta.url).href);
  await until(()=>document.querySelector('[data-property="TEST-KL"]'),'property switch rendered for the member');
  $('[data-property="TEST-KL"]').click();
  await until(()=>document.body.dataset.view,'member view rendered');
  assert.equal($('#new').disabled,true,'the role carries no reservation action, so booking stays closed');
  const session=await (await fetch('/api/session')).json();
  assert.deepEqual([...session.user.allowedActionsByProperty['TEST-KL']].sort(),[...tick].sort(),
    'the signed-in member holds exactly what the role was ticked for');

  // Back as the administrator: the member's extra-grant editor exists and is pre-ticked
  // with what that member actually carries, and saving it is the replace-the-set command.
  await login(adminName,adminPassword);
  await import(new URL('../web/app.js?admin-check='+randomUUID(),import.meta.url).href);
  await until(()=>document.querySelector('[data-property="TEST-KL"]'),'property switch rendered again');
  $('[data-property="TEST-KL"]').click();
  $('#global-nav [data-view="resourcesSettings"]').click();
  await until(()=>document.querySelector('#nav [data-view="teamAccess"]'),'team access entry again');
  $('#nav [data-view="teamAccess"]').click();
  await until(()=>document.querySelector(`#content form[data-perms-form="${memberName}"]`),'the member extra-action editor is rendered');
  const ticks=[...document.querySelectorAll(`#content form[data-perms-form="${memberName}"] input[name=actions]:checked`)].map(n=>n.value);
  assert.deepEqual(ticks.sort(),[],'the member was given no extra actions, only the role');

  console.log('Role permission DOM passed: the matrix matches the enforced actions, a created role holds only its ticks, a member inherits exactly that, and a held role cannot be deleted.');
  await new Promise(done=>setTimeout(done,100));
}finally {
  global.fetch=realFetch;server.closeAllConnections();await new Promise(done=>server.close(done));store.close();dom.window.close();
}
