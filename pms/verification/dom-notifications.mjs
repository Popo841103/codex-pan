// Optional in-process DOM verification of notices. A request arrives from the published
// site, the desk is told about it without leaving the page they are on, and reading a
// notice is only ever reading: it creates nothing and decides nothing. It does not
// operate a real browser, does not touch the user's logged-in sessions and does not
// execute SmartOrder. Supply an installed jsdom module path as argv[2].
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {randomUUID,randomBytes} from 'node:crypto';
import {Store} from '../server/store.js';
import {makeServer} from '../server/http.js';
if(!process.argv[2])throw Error('Supply the jsdom module path for this optional verification.');
const {JSDOM,VirtualConsole}=await import(pathToFileURL(resolve(process.argv[2])).href);
const store=new Store(':memory:',{selfCheckin:{key:randomBytes(32)}});store.seedTestProperties();
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

  // Standing facts are notices too: what is still wrong with today, not what happened.
  const day='2027-06-01';
  adminCommand({type:'business_date_init',date:day});
  const room=body().roomTypes.find(t=>t.productId==='room');
  const nights=[day,'2027-06-02'].map(date=>({date,amount:10000}));
  adminCommand({type:'create_reservation',mode:'reserve',bookingKind:'individual',companyName:'',source:'direct',
    autoAssign:false,guest:'Late Arrival',date:day,
    stays:[{productId:'room',roomTypeId:room.id,gender:'any',start:day,end:'2027-06-03',adults:1,children:0,infants:0,
      occupants:[{name:'',gender:'any'}],nightly:10000,nightlyRates:nights}]});
  $('#refresh').click();
  await until(()=>$('#notifications').dataset.count==='2','a guest due today with no room raises two standing notices');
  $('#nav [data-view="notifications"]').click();
  await until(()=>document.body.dataset.view==='notifications','the notices view again');
  await until(()=>text().includes('Late Arrival'),'the standing notice names the guest');
  assert.match(text(),/Arrival that never arrived|应入住未入住/,'it says what is still wrong');
  assert.match(text(),/Arriving today, no room yet|今日到店未分房/,'and that no room has been given');

  // It opens the booking, and still decides nothing.
  $('#content [data-open-stay]').click();
  await until(()=>document.querySelector('dialog[open]'),'the booking opens from the notice');
  assert.match(document.body.textContent,/Late Arrival/,'the booking that was opened is the one named');
  assert.equal(store.db.prepare('SELECT status FROM booking_requests WHERE slug=?').get(slug).status,'pending',
    'opening the booking decided nothing either');

  // Reading clears the bell until the facts change.
  $('#nav [data-view="notifications"]').click();
  await until(()=>document.body.dataset.view==='notifications','back to the notices');
  $('#content [data-notice-all]').click();
  await until(()=>$('#notifications').dataset.count===undefined,'the bell clears once they are read');
  const orders=JSON.parse(store.db.prepare('SELECT body FROM properties WHERE id=?').get('TEST-KL').body).orders;
  assert.equal(orders.length,1,'reading created no extra booking');
  assert.equal(orders[0].status,'confirmed','and left the booking as it was');

  // How much a notice matters is what the list is read by: a guest who should be here is
  // shown before a room that needs cleaning, and the level is written out as a word.
  const dirty=body();
  dirty.resources.filter(r=>r.productId==='room').slice(0,2).forEach(r=>{r.cleaning='dirty';});
  store.db.prepare('UPDATE properties SET body=? WHERE id=?').run(JSON.stringify(dirty),'TEST-KL');
  $('#refresh').click();
  await until(()=>$('#notifications').dataset.count==='1','rooms left dirty are one thing waiting');
  $('#nav [data-view="notifications"]').click();
  await until(()=>document.body.dataset.view==='notifications','the notices view with routine work in it');
  await until(()=>text().includes('Rooms needing cleaning')||text().includes('待清洁房'),'the cleaning notice is listed');
  const list=$('#content').innerHTML;
  assert.ok(list.includes('sev-urgent')&&list.includes('sev-routine'),'every notice carries how much it matters');
  assert.ok(list.indexOf('sev-urgent')<list.indexOf('sev-routine'),'the guest who should be here is read before the cleaning');
  assert.match(text(),/Priority|级别/,'the level is written as a word, not only as a colour');

  // The property, not only the system, decides what is read first. The page shows the
  // built-in level and lets an administrator change it; saving is a setting, so no
  // revision moves and no notice is raised or dismissed by it.
  await until(()=>$('#notice-severity-form'),'the priority settings form is on the page');
  assert.equal(document.querySelectorAll('#notice-severity-form [data-notice-level]').length,7,'every known kind can be set');
  assert.match($('#notice-severity-form').textContent,/Urgent|紧急/,'the built-in level is written out next to each kind');
  const revBefore=revision();
  const noticeCountBefore=store.db.prepare('SELECT COUNT(*) n FROM notifications').get().n;
  $('#notice-severity-form [name="no_show"]').value='routine';
  $('#notice-severity-form [name="rooms_to_clean"]').value='urgent';
  $('#notice-severity-form').dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));
  await until(()=>$('#notice-severity-form [name="rooms_to_clean"]').value==='urgent'&&
    store.db.prepare('SELECT body FROM notice_settings WHERE property_id=?').get('TEST-KL'),
    'the settings were saved and the page shows them');
  await until(()=>{const rows=[...document.querySelectorAll('#content table:first-of-type tbody tr')].map(r=>r.textContent);
    const clean=rows.findIndex(r=>/Rooms needing cleaning|待清洁房/.test(r)),guest=rows.findIndex(r=>/Arrival that never arrived|应入住未入住/.test(r));
    return clean>=0&&guest>=0&&clean<guest;},'cleaning is now read before the guest');
  const flipped=$('#content').innerHTML;
  assert.match(flipped,/Recent priority changes|最近的级别调整/,'the change is recorded on the page');
  assert.equal(revision(),revBefore,'saving a setting advanced no business revision');
  assert.equal(store.db.prepare('SELECT COUNT(*) n FROM notifications').get().n,noticeCountBefore,
    'saving raised and dismissed nothing');
  // Leaving a kind at the system default stores nothing for it, so following the rule
  // is not the same as freezing an old value into a setting.
  const storedLevels=JSON.parse(store.db.prepare('SELECT body FROM notice_settings WHERE property_id=?').get('TEST-KL').body);
  assert.deepEqual(storedLevels,{no_show:'routine',rooms_to_clean:'urgent'},'only what was changed is stored');

  // A conditional rule is a setting of its own: when enough of a standing fact has
  // piled up, the list reads it as more urgent. Put the priorities back on the system
  // default first, so what changes the order here is the rule and nothing else.
  adminCommand({type:'notice_severity_save',levels:{}});
  $('#refresh').click();
  const listRows=()=>[...document.querySelector('#content table').querySelectorAll('tbody tr')].map(r=>r.textContent);
  const rowIndex=re=>listRows().findIndex(r=>re.test(r));
  // The refresh is asynchronous, so wait until the list really is back on the system
  // default before judging what the rule changes.
  await until(()=>document.querySelector('#notice-rule-form')&&
    rowIndex(/Arrival that never arrived|应入住未入住/)>=0&&
    rowIndex(/Arrival that never arrived|应入住未入住/)<rowIndex(/Rooms needing cleaning|待清洁房/),
    'the system default order is back before the rule is saved');
  assert.equal(document.querySelectorAll('#notice-rule-form [data-notice-rule-at-least]').length,3,
    'one row per kind that can be counted');
  assert.ok(rowIndex(/Arrival that never arrived|应入住未入住/)<rowIndex(/Rooms needing cleaning|待清洁房/),
    'before the rule the guest is read before cleaning');
  const revBeforeRule=revision();
  const noticeCountBeforeRule=store.db.prepare('SELECT COUNT(*) n FROM notifications').get().n;
  $('#notice-rule-form [data-notice-rule-at-least="rooms_to_clean"]').value='2';
  $('#notice-rule-form [data-notice-rule-level="rooms_to_clean"]').value='urgent';
  $('#notice-rule-form').dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));
  await until(()=>$('#notice-rule-form [data-notice-rule-at-least="rooms_to_clean"]').value==='2'&&
    store.db.prepare('SELECT body FROM notice_rules WHERE property_id=?').get('TEST-KL'),
    'the rule was saved and the page shows it');
  await until(()=>{const rows=listRows();
    const clean=rows.findIndex(r=>/Rooms needing cleaning|待清洁房/.test(r)),guest=rows.findIndex(r=>/Arrival that never arrived|应入住未入住/.test(r));
    return clean>=0&&guest>=0&&clean<guest;},'a big enough backlog is now read before the guest');
  assert.match($('#content').innerHTML,/raised by a rule|已按规则升级/,'the list says a rule decided it');
  assert.match($('#content').innerHTML,/Recent rule changes|最近的规则调整/,'the change is recorded on the page');
  assert.equal(revision(),revBeforeRule,'saving a rule advanced no business revision');
  assert.equal(store.db.prepare('SELECT COUNT(*) n FROM notifications').get().n,noticeCountBeforeRule,
    'saving a rule raised and dismissed nothing');
  const storedRules=JSON.parse(store.db.prepare('SELECT body FROM notice_rules WHERE property_id=?').get('TEST-KL').body);
  assert.deepEqual(storedRules,{rooms_to_clean:{atLeast:2,level:'urgent'}},'only the configured kind is stored');

  // Self-registration ends with a person: identity handed in is work waiting on them, and
  // the notice opens the review page rather than deciding anything.
  store.checkin.command({id:admin.id},{key:randomUUID(),expectedRevision:0,command:{propertyId:'TEST-KL',type:'sc_policy_save',
    enabled:true,requirePayment:false,requiredDeposit:0,registrationMode:'all',instructions:'TEST instructions'}});
  const stayDay='2027-07-01';
  const made=adminCommand({type:'create_reservation',mode:'reserve',bookingKind:'individual',companyName:'',source:'direct',
    autoAssign:false,guest:'Registration Guest',date:stayDay,
    stays:[{productId:'room',roomTypeId:room.id,gender:'any',start:stayDay,end:'2027-07-03',adults:1,children:0,infants:0,
      occupants:[{name:'',gender:'any'}],nightly:10000,nightlyRates:[stayDay,'2027-07-02'].map(date=>({date,amount:10000}))}]});
  const stay=store.read({id:admin.id}).orders.find(o=>o.reservationId===made.id);
  const invite=store.checkin.command({id:admin.id},{key:randomUUID(),expectedRevision:0,
    command:{propertyId:'TEST-KL',type:'sc_invite',orderId:stay.id}});
  $('#refresh').click();
  await until(()=>$('#notifications').dataset.count==='1','an invitation nobody has filled in is not work yet');
  store.checkin.register(invite.token,{revision:1,consent:true,
    people:[{name:'Registration Guest',documentType:'passport',documentNumber:'TEST12345'}]});
  $('#refresh').click();
  await until(()=>$('#notifications').dataset.count==='2','identity handed in and waiting is raised');
  $('#nav [data-view="notifications"]').click();
  await until(()=>document.body.dataset.view==='notifications','the notices view with a registration waiting');
  await until(()=>text().includes('Registration waiting for review')||text().includes('自助登记待核验'),'the notice names the registration');
  $('#content [data-notice-view="checkin"]').click();
  await until(()=>document.querySelector('dialog[open]'),'the notice opens the review page');
  assert.match(document.body.textContent,/Self check-in|自助入住/,'what opens is the self check-in review');
  assert.equal(store.db.prepare('SELECT review FROM sc_grants WHERE id=?').get(invite.grantId).review,'pending',
    'opening the notice reviewed nothing');

  console.log('passed: notices tell the desk, and reading one only ever reads it');
} catch(error){
  console.error(error);process.exitCode=1;
} finally {
  server.closeAllConnections();await new Promise(done=>server.close(done));store.close();
  // The page polls for notices on a timer, so this process has to be told to stop.
  process.exit(process.exitCode??0);
}
