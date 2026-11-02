// Optional in-process DOM verification of the property site. It drives the same UI
// modules a browser loads and then opens the public page the server renders, so the
// round trip is checked end to end. It does not operate a real browser, does not touch
// the user's logged-in sessions and does not execute SmartOrder. Supply an installed
// jsdom module path as argv[2].
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
const slug='dom-site-'+randomUUID().slice(0,6);
const title='DOM test property';
const publicGet=async path=>{
  const response=await realFetch(new URL(path,base),{headers:{Cookie:''}});
  return {status:response.status,body:await response.text()};
};
try {
  const response=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:adminName,password:adminPassword})});
  assert.equal(response.status,200,'the administrator should be able to sign in');

  await import(new URL('../web/app.js?site-check='+randomUUID(),import.meta.url).href);
  $('[data-property="TEST-KL"]').click();
  $('#global-nav [data-view="resourcesSettings"]').click();
  await until(()=>document.querySelector('#nav [data-view="propertySite"]'),'property site entry in the settings group');
  $('#nav [data-view="propertySite"]').click();
  await until(()=>document.body.dataset.view==='propertySite','property site view active');
  await until(()=>text().match(/门店网站|Property site/),'property site page rendered');
  assert.match(text(),/尚未设置网址标识|No address slug/,'a property starts unpublished and says so');

  // The administrator publishes the site through the page, in three languages.
  const form=$('#site-form');
  form.elements.slug.value=slug;
  set('#site-form [name=enabled]','true');
  for(const lang of ['zh','en','ms']){
    const input=$(`#site-form [data-site-text="title"][data-site-lang="${lang}"]`);
    input.value=lang==='en'?title:(lang==='zh'?'DOM 测试门店':'DOM hartanah');
    input.dispatchEvent(new dom.window.Event('input',{bubbles:true}));
  }
  $(`#site-form [data-site-text="contact"][data-site-lang="en"]`).value='+60 3 0000 0000';
  form.dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));
  await until(()=>text().includes(slug),'the published address is shown on the page');
  assert.match(text(),/已发布|Published/,'the page reports the site as published');
  assert.match($('#content').innerHTML,new RegExp('/sites/'+slug),'the public address is linked');

  // The public page is served without a session, and says what it cannot do.
  const published=await publicGet('/sites/'+slug);
  assert.equal(published.status,200,'a published site is reachable without signing in');
  assert.match(published.body,new RegExp(title),'the English title is rendered');
  assert.doesNotMatch(published.body,/<script/i,'the public page carries no script at all');
  assert.match(published.body,/no online payment/,'the page states that it takes no booking');
  assert.match(published.body,/\+60 3 0000 0000/,'the contact details entered on the page are shown');

  const zh=await publicGet('/sites/'+slug+'?lang=zh');
  assert.match(zh.body,/DOM 测试门店/,'the Chinese title is served when asked for');
  assert.match(zh.body,/入住/,'and so is the Chinese form');

  // Availability comes from the inventory the front desk sells from: ten rooms free,
  // and no price because no rate plan was published.
  const stay=await publicGet(`/sites/${slug}?from=2027-06-01&to=2027-06-03&guests=2`);
  assert.match(stay.body,/10 available/,'ten rooms are free for both nights');
  assert.match(stay.body,/No published price/,'with no published plan there is no invented price');

  // A draft is not reachable from outside at all.
  const saved=store.db.prepare('SELECT * FROM property_sites WHERE slug=?').get(slug);
  store.db.prepare('UPDATE property_sites SET enabled=0 WHERE slug=?').run(slug);
  assert.equal((await publicGet('/sites/'+slug)).status,404,'unpublishing puts the site back out of reach');
  store.db.prepare('UPDATE property_sites SET enabled=1 WHERE slug=?').run(slug);

  // A hostile value in the query is escaped rather than executed.
  const hostile=await publicGet(`/sites/${slug}?from="><script>alert(1)</script>&to=2027-06-02`);
  assert.doesNotMatch(hostile.body,/<script>alert/,'a hostile query value never reaches the page');
  assert.equal((await publicGet('/sites/no-such-site')).status,404,'an unknown site is not found');

  console.log('Property site DOM passed: published from the settings page, served without a session in three languages, availability read from real inventory, no price invented, and unpublished sites stay out of reach.');
  await new Promise(done=>setTimeout(done,100));
}finally {
  global.fetch=realFetch;server.closeAllConnections();await new Promise(done=>server.close(done));store.close();dom.window.close();
}
