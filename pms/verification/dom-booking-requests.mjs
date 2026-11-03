// Optional in-process DOM verification of booking requests. A guest asks on the public
// site, the request lands undecided, and only the front desk turning it into a booking
// takes a room. It does not operate a real browser, does not touch the user's logged-in
// sessions and does not execute SmartOrder. Supply an installed jsdom module path as
// argv[2].
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
let asked=0;
dom.window.confirm=()=>{asked++;return true;};
// The page calls confirm in module scope, which resolves to the global binding here.
global.confirm=dom.window.confirm;
global.window=dom.window;global.document=dom.window.document;global.FormData=dom.window.FormData;global.localStorage=dom.window.localStorage;
global.fetch=async(path,options={})=>{
  const response=await realFetch(new URL(path,base),{...options,signal:AbortSignal.timeout(8000),headers:{Origin:base,Cookie:cookie,...options.headers}});
  if(response.headers.has('set-cookie'))cookie=response.headers.get('set-cookie').split(';')[0];return response;
};
const $=selector=>{const node=document.querySelector(selector);assert(node,`Missing DOM control: ${selector}`);return node;};
const until=async(check,title)=>{for(let n=0;n<1000;n++){if(check())return;await new Promise(done=>setTimeout(done,10));}throw Error('Timed out: '+title+'; UI message: '+(document.querySelector('#message')?.textContent||'')+'; DOM errors: '+errors.map(e=>e.message).join('; '));};
const text=()=>$('#content').textContent;
const slug='dom-requests-'+randomUUID().slice(0,6);
const body=()=>JSON.parse(store.db.prepare('SELECT body FROM properties WHERE id=?').get('TEST-KL').body);
const roomType=body().roomTypes[0].id;
// A published rate plan is written straight into the property body, so the page can be
// checked against a price that really exists rather than one invented for the test.
const publishRate=()=>{
  const value=body();
  value.ratePlans=[{code:'BAR',name:'Best available',roomTypeIds:[roomType]}];
  value.rateCells=['2027-10-01','2027-10-02'].map(date=>({propertyId:'TEST-KL',planCode:'BAR',roomTypeId:roomType,date,amount:22000}));
  store.db.prepare('UPDATE properties SET body=? WHERE id=?').run(JSON.stringify(value),'TEST-KL');
};
const publicGet=async path=>{const response=await realFetch(new URL(path,base),{headers:{Cookie:''}});return {status:response.status,body:await response.text()};};
const publicPost=async (path,fields)=>{
  const response=await realFetch(new URL(path,base),{method:'POST',redirect:'manual',
    headers:{'Content-Type':'application/x-www-form-urlencoded',Origin:base},body:new URLSearchParams(fields)});
  return {status:response.status,location:response.headers.get('location')};
};
try {
  const response=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:adminName,password:adminPassword})});
  assert.equal(response.status,200,'the administrator should be able to sign in');
  await import(new URL('../web/app.js?requests-check='+randomUUID(),import.meta.url).href);
  $('[data-property="TEST-KL"]').click();

  // The site is published from the settings page, then given a published rate plan.
  publishRate();
  $('#global-nav [data-view="resourcesSettings"]').click();
  await until(()=>document.querySelector('#nav [data-view="propertySite"]'),'property site entry in the settings group');
  $('#nav [data-view="propertySite"]').click();
  await until(()=>document.body.dataset.view==='propertySite','property site view active');
  const form=$('#site-form');
  form.elements.slug.value=slug;
  form.elements.slug.dispatchEvent(new dom.window.Event('input',{bubbles:true}));
  form.elements.enabled.value='true';
  form.elements.enabled.dispatchEvent(new dom.window.Event('change',{bubbles:true}));
  const submitSite=()=>{form.dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));};
  submitSite();
  await until(()=>text().includes(slug),'the published address is shown on the page');
  const siteRow=store.db.prepare('SELECT * FROM property_sites WHERE slug=?').get(slug);
  const siteBody=JSON.parse(siteRow.body);siteBody.planCodes=['BAR'];
  store.db.prepare('UPDATE property_sites SET body=? WHERE slug=?').run(JSON.stringify(siteBody),slug);

  // The public page offers a form, and says what submitting it does and does not do.
  const search=await publicGet(`/sites/${slug}?from=2027-10-01&to=2027-10-03&guests=1`);
  assert.equal(search.status,200);
  assert.match(search.body,/name="roomType"/,'a bookable room type carries a request form');
  assert.match(search.body,/MYR 440\.00/,'the published price for two nights is shown');
  assert.doesNotMatch(search.body,/<script/i,'the page still carries no script at all');

  // A guest asks. The answer is a reference, never a confirmation.
  const sent=await publicPost(`/sites/${slug}/request`,{lang:'en',from:'2027-10-01',to:'2027-10-03',guests:'1',
    roomType,name:'Nurul Aina',contact:'nurul@example.com',note:'Ground floor please'});
  assert.equal(sent.status,303,'the form posts and redirects, so reloading never resends');
  assert.match(sent.location,/&sent=[0-9A-F]{8}$/,'a reference is handed back');
  const acknowledged=await publicGet(sent.location);
  assert.match(acknowledged.body,/Your request has been received/,'the page states it was received');
  assert.match(acknowledged.body,/not a confirmation and nothing has been charged/,'and that it is not a booking');
  const stored=store.db.prepare('SELECT * FROM booking_requests WHERE slug=?').all(slug);
  assert.equal(stored.length,1,'one request was stored');
  assert.equal(stored[0].status,'pending','and it is undecided');
  assert.equal(stored[0].quoted_total,44000,'the quote is the published price for the stay');

  // The front desk finds the request and decides it.
  await until(()=>document.querySelector('#nav [data-view="bookingRequests"]'),'booking requests entry in the settings group');
  $('#nav [data-view="bookingRequests"]').click();
  await until(()=>document.body.dataset.view==='bookingRequests','booking requests view active');
  // The request arrived after this page last read the backend, so the desk refreshes.
  $('#refresh').click();
  await until(()=>text().includes('Nurul Aina'),'the request is listed on the page');
  assert.match(text(),/MYR\s+440\.00/,'the quoted price is shown to the desk');
  const accept=$('#content [data-request-accept]');
  accept.click();
  await until(()=>/已接受|Accepted/.test(text()),'the request is reported as accepted');
  assert.equal(asked,1,'the page asked before creating a booking');
  const updated=store.db.prepare('SELECT * FROM booking_requests WHERE slug=?').all(slug)[0];
  assert.equal(updated.status,'accepted');
  assert.ok(updated.order_id,'the request points at the booking it became');
  const order=JSON.parse(store.db.prepare('SELECT body FROM properties WHERE id=?').get('TEST-KL').body).orders.find(o=>o.id===updated.order_id);
  assert.equal(order.guest,'Nurul Aina','the booking carries the name the guest gave');
  assert.equal(order.source,'bookingengine','and says it came from the site');
  assert.deepEqual(order.nightlyRates,[{date:'2027-10-01',amount:22000},{date:'2027-10-02',amount:22000}],
    'the booking is priced at what the site quoted');
  assert.equal(order.status,'confirmed','accepting reserves; it does not check anyone in');
  assert.match($('#content').innerHTML,/data-open-stay=/,'the desk can open the booking that came out of the request');

  // A second request is declined instead, with a reason that stays on the record.
  const second=await publicPost(`/sites/${slug}/request`,{lang:'en',from:'2027-10-05',to:'2027-10-06',guests:'1',
    roomType,name:'Declined Guest',contact:'declined@example.com',note:''});
  assert.equal(second.status,303);
  $('#refresh').click();
  await until(()=>text().includes('Declined Guest'),'the newer request appears after a refresh');
  const requestId=store.db.prepare("SELECT * FROM booking_requests WHERE guest_name='Declined Guest'").get().id;
  $(`#content [data-request-reason="${requestId}"]`).value='Maintenance that week';
  $(`#content [data-request-decline="${requestId}"]`).click();
  await until(()=>text().includes('Maintenance that week'),'the reason is shown against the request');
  const declined=store.db.prepare("SELECT * FROM booking_requests WHERE guest_name='Declined Guest'").get();
  assert.equal(declined.status,'declined');
  // Declining took no room: the only booking is the one that was accepted.
  const after=JSON.parse(store.db.prepare('SELECT body FROM properties WHERE id=?').get('TEST-KL').body).orders;
  assert.equal(after.length,1,'a declined request never becomes a booking');

  console.log('Booking requests DOM passed: a guest asks on the published site and gets a reference rather than a confirmation, the desk sees the request with the price that was quoted, accepting creates the booking at that price and takes the room, and declining leaves only a reason behind.');
  await new Promise(done=>setTimeout(done,100));
}finally {
  global.fetch=realFetch;server.closeAllConnections();await new Promise(done=>server.close(done));store.close();dom.window.close();
}
