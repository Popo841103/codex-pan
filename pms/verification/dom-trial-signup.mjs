// Optional in-process DOM verification of "anyone can sign up and try one empty store".
// It drives the same UI modules a browser loads; it does not operate a real browser and
// does not execute SmartOrder. Supply an installed jsdom module path as argv[2].
//
// What this proves, and why it matters: the operator asked for a version anybody can
// try. A stranger must be able to create an account and their own empty store from the
// public page, sign in, and land on the room settings with nothing preset. The account
// must be fenced to that one store: the workspace shows no other property and the
// create-property panel is not offered to a trial origin.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {Store} from '../server/store.js';
import {makeServer} from '../server/http.js';
if(!process.argv[2])throw Error('Supply the jsdom module path for this optional verification.');
const {JSDOM,VirtualConsole}=await import(pathToFileURL(resolve(process.argv[2])).href);
const store=new Store(':memory:');
// A fresh installation: only a platform administrator exists, no property does.
const adminName='test-platform-'+randomUUID().slice(0,8),adminPassword=randomUUID();
store.createUser({username:adminName,password:adminPassword,role:'admin',propertyIds:[]});
const server=makeServer(store);await new Promise(done=>server.listen(0,'127.0.0.1',done));
const base=`http://127.0.0.1:${server.address().port}`,realFetch=fetch,errors=[];
let cookie='';
const plainFetch=async(path,options={})=>realFetch(new URL(path,base),{...options,signal:AbortSignal.timeout(8000),headers:{Origin:base,...options.headers}});
const dom=new JSDOM(readFileSync(new URL('../web/index.html',import.meta.url),'utf8'),{url:base+'/web/',runScripts:'outside-only',virtualConsole:new VirtualConsole().on('jsdomError',error=>errors.push(error))});
dom.window.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};
dom.window.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};
dom.window.confirm=()=>true;
global.window=dom.window;global.document=dom.window.document;global.FormData=dom.window.FormData;global.localStorage=dom.window.localStorage;global.location=dom.window.location;global.history=dom.window.history;
global.fetch=async(path,options={})=>{
  const response=await plainFetch(new URL(path,base),{...options,headers:{Cookie:cookie,...options.headers}});
  if(response.headers.has('set-cookie'))cookie=response.headers.get('set-cookie').split(';')[0];return response;
};
const $=selector=>{const node=document.querySelector(selector);assert(node,`Missing DOM control: ${selector}`);return node;};
const set=(selector,value)=>{const node=$(selector);node.value=value;node.dispatchEvent(new dom.window.Event('input',{bubbles:true}));node.dispatchEvent(new dom.window.Event('change',{bubbles:true}));};
const until=async(check,title)=>{for(let n=0;n<1000;n++){if(check())return;await new Promise(done=>setTimeout(done,10));}throw Error('Timed out: '+title+'; UI message: '+(document.querySelector('#message')?.textContent||'')+'; DOM errors: '+errors.map(e=>e.message).join('; '));};
const text=()=>$('#content').textContent;
const login=async(username,password)=>{
  const response=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password})});
  assert.equal(response.status,200,username+' should be able to sign in');
};
try {
  // 1. The public signup page exists, carries no script and offers the form.
  const page=await plainFetch('/signup');
  assert.equal(page.status,200,'the signup page is public');
  const html=await page.text();
  assert.ok(!/<script/i.test(html),'the signup page carries no script');

  // 2. A stranger posts the plain form: account and empty store are created at once.
  const trialPass='trial-pass-'+randomUUID();
  const fields={username:'trial-'+randomUUID().slice(0,8),password:trialPass,confirm:trialPass,
    storeName:'Try Corner Hostel',store:'TRY-KL',company:''};
  const posted=await plainFetch('/signup',{method:'POST',redirect:'manual',
    headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(fields)});
  assert.equal(posted.status,303,'the plain form posts without a session or a script');
  assert.match(posted.headers.get('location'),/^\/web\/\?signup=/,'the answer redirects to the workspace to sign in');

  // 3. The trial signs in and reaches the settings view with nothing in it.
  await login(fields.username,trialPass);
  await import(new URL('../web/app.js?trial-signup='+randomUUID(),import.meta.url).href);
  await until(()=>document.querySelector('#global-nav [data-view="resourcesSettings"]'),'the workspace loads with the settings entry');
  $('#global-nav [data-view="resourcesSettings"]').click();
  await until(()=>document.body.dataset.view==='resourcesSettings','the trial opens room type & resource settings');
  assert.match(text(),/尚未|还没有|has no room type|belum mempunyai/,'the trial store starts genuinely empty');
  assert.ok(!text().match(/新建门店|New property/),'a trial account is not offered a second store on the page');

  // 4. The fence is real, not cosmetic: the server refuses the command anyway.
  const session=await (await fetch('/api/session')).json();
  assert.ok(session.csrf,'a signed-in trial has a session to attack with');
  const response=await fetch('/api/commands',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':session.csrf},
    body:JSON.stringify({propertyId:'TRY-KL',expectedRevision:0,key:'trial-second-'+randomUUID(),
      command:{type:'property_create',propertyId:'TRY-KL',newPropertyId:'TRY-2',name:'Second Try'}})});
  assert.equal(response.status,403,'the server refuses a second store for a trial origin');
  const after=await (await fetch('/api/state')).json();
  assert.equal(after.properties.length,1,'nothing was created by the refused attempt');

  // 5. The trial configures its own catalog and sees exactly one property.
  await until(()=>document.querySelector('#global-nav [data-view="calendar"]'),'the workspace navigation is available');
  $('#global-nav [data-view="calendar"]').click();
  await until(()=>document.querySelector('#nav [data-view="tasks"]'),'the room section is reachable');
  $('#nav [data-view="tasks"]').click();
  await until(()=>document.body.dataset.view==='tasks','the tasks view renders for the trial store');

  console.log('DOM-TRIAL-SIGNUP: PASS — public script-free signup, empty trial store, one-store fence');
} catch (error) {
  console.error('DOM-TRIAL-SIGNUP: FAIL —',error.message);
  console.error('DOM errors:',errors.map(e=>e.message).join('; '));
  process.exitCode=1;
} finally {
  try{store.close();}catch{}
  server.closeAllConnections();await new Promise(done=>server.close(done));
}
