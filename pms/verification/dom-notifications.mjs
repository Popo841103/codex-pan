// Optional in-process DOM verification of notices. A request arrives from the published
// site, the desk is told about it without leaving the page they are on, and reading a
// notice is only ever reading: it creates nothing and decides nothing. It does not
// operate a real browser, does not touch the user's logged-in sessions and does not
// execute SmartOrder. Supply an installed jsdom module path as argv[2].
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
const admin=store.createUser({username:adminName,password:adminPassword,role:'admin',propertyIds:['TEST-KL']});
const server=makeServer(store);await new Promise(done=>server.listen(0,'127.0.0.1',done));
const base=`http://127.0.0.1:${server.address().port}`,realFetch=fetch,errors=[];
let cookie='';
const dom=new JSDOM(readFileSync(new URL('../web/index.html',import.meta.url),'utf8'),{url:base+'/web/',runScripts:'outside-only',virtualConsole:new VirtualConsole().on('jsdomError',error=>errors.push(error))});
dom.window.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};
dom.window.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};
global.window=dom.window;global.document=dom.window.document;global.FormData=dom.window.FormData;global.localStorage=dom.window.localStorage;
global.fetch=async(path,options={})=>{
  const response=await realFetch(new URL(path,base),{...options,signal:AbortSignal.timeout(8000),headers:{Origin:base,Cookie:cookie,...options.headers}});
  if(response.headers.has('set-cookie'))cookie=response.headers.get('set-cookie').split(';')[0];return response;
};
const $=selector=>{const node=document.querySelector(selector);assert(node,`Missing DOM control: ${selector}`);return node;};
const until=async(check,title)=>{for(let n=0;n<1000;n++){if(check())return;await new Promise(done=>setTimeout(done,10));}throw Error('Timed out: '+title+'; UI message: '+(document.querySelector('#message')?.textContent||'')+'; DOM errors: '+errors.map(e=>e.message).join('; '));};
const text=()=>$('#content').textContent;
const slug='dom-notices-'+randomUUID().slice(0,6);
const body=()=>JSON.parse(store.db.prepare('SELECT body FROM properties WHERE id=?').get('TEST-KL').body);
const roomType=body().roomTypes[0].id;
const revision=()=>store.db.prepare('SELECT revision FROM properties WHERE id=?').get('TEST-KL').revision;
const adminCommand=command=>store.command({id:admin.id},{key:randomUUID(),expectedRevision:revision(),command:{propertyId:'TEST-KL',...command}});
const publicPost=async (path,fields)=>{
  const response=await realFetch(new URL(path,base),{method:'POST',redirect:'manual',
    headers:{'Content-Type':'application/x-www-form-urlencoded',Origin:base},body:new URLSearchParams(fields)});
  return {status:response.status,location:response.headers.get('location')};
};
try {
  const response=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:adminName,password:adminPassword})});
  assert.equal(response.status,200,'the administrator should be able to sign in');
  await import(new URL('../web/app.js?notices-check='+randomUUID(),import.meta.url).href);
  $('[data-property="TEST-KL"]').click();
  await until(()=>$('#notifications'),'the notice bell is in the header');
  assert.equal($('#notifications').dataset.count,undefined,'nothing is waiting yet, so no count is shown');

  adminCommand({type:'site_save',slug,enabled:true,title:{en:'KL'},roomTypeIds:[roomType],planCodes:[]});
  const revisionBefore=revision();

  // A guest asks on the published site. The desk is not asked to do anything.
  const sent=await publicPost(`/sites/${slug}/request`,{lang:'en',from:'2027-10-01',to:'2027-10-03',guests:'1',
    roomType,name:'Siti Aminah',contact:'siti@example.com',note:'',roomType1:''});
  assert.equal(sent.status,303,'the request was accepted for consideration');
  const stored=store.db.prepare('SELECT * FROM booking_requests WHERE slug=?').all(slug);
  assert.equal(stored.length,1,'one request is stored, undecided');
  assert.equal(revision(),revisionBefore,'asking still moves nothing on the property');

  // The light feed is what the header polls, and it answers without the whole state.
  const feed=await (await fetch('/api/notifications')).json();
  assert.equal(feed.unread,1,'one thing is waiting for this account');
  assert.equal(feed.items[0].guest,'Siti Aminah','the feed names the guest');

  // Refreshing the desk brings the count onto the bell.
  $('#refresh').click();
  await until(()=>$('#notifications').dataset.count==='1','the bell shows one unread notice');
  assert.equal($('#notifications').dataset.count,'1');

  // Opening the bell lists what is waiting, and says plainly how far it goes.
  $('#notifications').click();
  await until(()=>document.body.dataset.view==='notifications','the notices view opens');
  await until(()=>text().includes('Siti Aminah'),'the notice names the guest who asked');
  assert.match(text(),/2027-10-01/,'and the dates asked for');
  assert.match($('#content').innerHTML,/data-notice-read=/,'it can be marked read');
  assert.match(text(),/no email, SMS or push is connected|没有连接邮件、短信或推送/,
    'the page says nothing is sent to anyone');

  // The notice points at the work instead of doing it.
  $('#content [data-notice-open]').click();
  await until(()=>document.body.dataset.view==='bookingRequests','the notice opens the requests page');
  await until(()=>text().includes('Siti Aminah'),'where the request itself is still undecided');
  assert.equal(store.db.prepare('SELECT status FROM booking_requests WHERE slug=?').get(slug).status,'pending',
    'opening the notice decided nothing');

  // Reading is only reading.
  const revisionBeforeRead=revision();
  $('#nav [data-view="notifications"]').click();
  await until(()=>document.body.dataset.view==='notifications','back to the notices');
  $('#content [data-notice-read]').click();
  await until(()=>$('#notifications').dataset.count===undefined,'the count clears once it is read');
  assert.equal(revision(),revisionBeforeRead,'reading moved no revision');
  assert.equal(store.db.prepare('SELECT status FROM booking_requests WHERE slug=?').get(slug).status,'pending',
    'and reading left the request for a person to decide');
  assert.equal(store.read({id:admin.id}).orders.length,0,'reading created no booking');
  assert.ok(store.db.prepare('SELECT * FROM notification_reads').all().length>=1,'the read is recorded');
  console.log('passed: notices tell the desk, and reading one only ever reads it');
} catch(error){
  console.error(error);process.exitCode=1;
} finally {
  server.closeAllConnections();await new Promise(done=>server.close(done));store.close();
  // The page polls for notices on a timer, so this process has to be told to stop.
  process.exit(process.exitCode??0);
}
