import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Store, ServiceError } from '../server/store.js';
import { makeServer } from '../server/http.js';

const open = () => { const store = new Store(':memory:'); store.seedTestProperties(); return store; };
const user = (store, role='admin', propertyIds=['TEST-KL']) =>
  store.createUser({ username:role+'-'+randomUUID().slice(0,6), password:'x'.repeat(14), role, propertyIds });
const revision = (store,propertyId='TEST-KL') => store.db.prepare('SELECT revision FROM properties WHERE id=?').get(propertyId).revision;
const send = (store,u,command,propertyId='TEST-KL') =>
  store.command({id:u.id},{key:randomUUID(),expectedRevision:revision(store,propertyId),command:{propertyId,...command}});
const body = (store,propertyId='TEST-KL') => JSON.parse(store.db.prepare('SELECT body FROM properties WHERE id=?').get(propertyId).body);
const types = (store,propertyId='TEST-KL') => body(store,propertyId).roomTypes;
const withRates = (store,plans,cells) => {
  const value=body(store);value.ratePlans=plans;value.rateCells=cells;
  store.db.prepare('UPDATE properties SET body=? WHERE id=?').run(JSON.stringify(value),'TEST-KL');
};
const publish = (store,u,over={}) => send(store,u,{type:'site_save',slug:'kl-site',enabled:true,
  title:{en:'KL'},roomTypeIds:[],planCodes:[],...over});
const ask = (store,over={}) => store.submitBookingRequest({slug:'kl-site',roomTypeId:types(store)[0].id,
  from:'2027-09-01',to:'2027-09-03',guests:1,name:'Tan Mei Ling',contact:'tan@example.com',note:'',language:'en',...over});
const requests = (store,u) => store.read({id:u.id}).bookingRequests;
const orders = (store,u,propertyId='TEST-KL') => store.read({id:u.id}).orders.filter(o=>o.propertyId===propertyId);
const priceIt = store => {
  const type=types(store)[0];
  withRates(store,[{propertyId:'TEST-KL',code:'PUB',name:'Public',roomTypeIds:[type.id],archived:false}],
    [{propertyId:'TEST-KL',planCode:'PUB',roomTypeId:type.id,date:'2027-09-01',amount:10000},
     {propertyId:'TEST-KL',planCode:'PUB',roomTypeId:type.id,date:'2027-09-02',amount:12000}]);
  publish(store,user(store),{planCodes:['PUB']});
  return type;
};

// A request used to mean exactly one room. A guest asking for two rooms now asks once,
// is quoted for both, and accepting it creates two separate stays on one booking -
// each going through the same inventory and folio rules as any other multi-room stay.
test('one request can cover several rooms, quoted and booked as separate stays',()=>{
  const store=open(),boss=user(store);
  const type=priceIt(store);
  const single=ask(store),multi=ask(store,{rooms:2});
  assert.equal(single.rooms,1,'a request that says nothing still means one room');
  assert.equal(multi.rooms,2);
  assert.equal(single.quotedTotal,22000);
  assert.equal(multi.quotedTotal,44000,'the quote is for every room, not just one');
  assert.equal(requests(store,boss).find(r=>r.id===multi.id).rooms,2,'the desk sees how many rooms were asked for');
  const outcome=send(store,boss,{type:'booking_request_decision',requestId:multi.id,decision:'accept'});
  const state=store.read({id:boss.id});
  const reservation=state.reservations.find(r=>r.id===outcome.id);
  assert.equal(reservation.stayIds.length,2,'each room becomes its own stay');
  const stays=state.orders.filter(o=>o.reservationId===outcome.id);
  assert.equal(stays.length,2);
  assert.equal(stays[0].nightly,10000);
  assert.equal(stays[1].nightly,10000,'both rooms carry the published nightly rate');
  assert.match(stays[0].notes,/2 rooms requested/,'the desk is told the request was for two rooms');
  assert.equal(requests(store,boss).find(r=>r.id===multi.id).status,'accepted');
  store.close();
});

test('a room count is bounded and cannot ask for more rooms than exist',()=>{
  const store=open(),boss=user(store);
  publish(store,boss);
  const type=types(store)[0];
  for(const bad of [0,9,-1,1.5,'two',NaN,'3;drop'])
    assert.throws(()=>ask(store,{rooms:bad}),e=>e instanceof ServiceError&&e.status===400&&e.message==='room_count',
      'refused room count: '+String(bad));
  const free=store.publicAvailability({slug:'kl-site',from:'2027-09-01',to:'2027-09-03',guests:1})
    .roomTypes.find(t=>t.id===type.id).available;
  if(Number.isSafeInteger(free)&&free>0&&free<8)
    assert.throws(()=>ask(store,{rooms:free+1}),e=>e.message==='room_count',
      'a request for more rooms than are free could never be accepted');
  // A single room still behaves exactly as before even when nothing is free: it is
  // recorded, and it is the desk's acceptance that runs out of inventory.
  assert.equal(store.db.prepare('SELECT COUNT(*) n FROM booking_requests').get().n,0,'nothing was written by refused input');
  store.close();
});

// A reference is short enough to guess, so it is never treated as a secret. Looking a
// request up also asks for the exact contact details left with it: no other guest can
// read a request, and neither the reference nor the contact is echoed back speculatively.
test('a guest can look up their own request, but nobody else can',()=>{
  const store=open(),boss=user(store);
  publish(store,boss);
  const sent=ask(store,{rooms:2});
  const found=store.lookupBookingRequest({slug:'kl-site',reference:sent.reference,contact:'tan@example.com'});
  assert.equal(found.status,'pending');
  assert.equal(found.rooms,2);
  assert.equal(found.quotedTotal,sent.quotedTotal);
  assert.equal(found.canWithdraw,true);
  assert.equal(found.decisionNote,null);
  assert.match(found.reference,/^[0-9A-F]{8}$/);
  assert.ok(found.roomType&&typeof found.roomType==='object','the room type name is returned for the page, not an internal id alone');
  // Case, surrounding space and internal whitespace in the contact are forgiven, but
  // the value itself must be the one left with the request.
  assert.equal(store.lookupBookingRequest({slug:'kl-site',reference:sent.reference.toLowerCase(),
    contact:' TAN@EXAMPLE.COM '}).reference,sent.reference);
  for(const bad of [
    {reference:sent.reference,contact:'other@example.com'},
    {reference:'DEADBEEF',contact:'tan@example.com'},
    {reference:'not-a-ref',contact:'tan@example.com'},
    {reference:sent.reference,contact:''},
    {reference:sent.reference,contact:'   '},
    {reference:sent.reference,contact:'tan@example.com',slug:'another-site'}])
    assert.throws(()=>store.lookupBookingRequest({slug:'kl-site',...bad}),e=>e instanceof ServiceError&&e.status===404,
      'refused lookup: '+JSON.stringify(bad));
  store.close();
});

// Withdrawing is the guest's own answer to a request they no longer want. It writes no
// booking, moves no revision and leaves an append-only event. It is expressed as a
// declined request with its own marker, so the original status constraint and every
// existing row stay untouched.
test('a guest can withdraw a pending request, and it can never become a booking',()=>{
  const store=open(),boss=user(store);
  publish(store,boss);
  const sent=ask(store),before=revision(store);
  const input={slug:'kl-site',reference:sent.reference,contact:'tan@example.com'};
  const out=store.withdrawBookingRequest(input);
  assert.equal(out.status,'declined');
  assert.equal(out.withdrawn,true);
  assert.equal(out.canWithdraw,false);
  assert.equal(out.decisionNote,null,'the internal marker is not shown to the guest');
  assert.equal(revision(store),before,'withdrawing is not a property business command');
  const row=requests(store,boss).find(r=>r.id===sent.id);
  assert.equal(row.status,'declined');
  assert.ok(row.withdrawnAt,'the desk can tell a withdrawal from a refusal');
  assert.equal(store.db.prepare("SELECT COUNT(*) n FROM booking_requests WHERE status='pending'").get().n,0,
    'it is no longer waiting on anybody, so it raises no waiting notice');
  // Accepting a withdrawn request used to be able to create an orphan booking: the
  // final status update is guarded, but the order would already exist by then.
  assert.throws(()=>send(store,boss,{type:'booking_request_decision',requestId:sent.id,decision:'accept'}),
    e=>e.status===409&&e.message==='request_state','a withdrawn request is refused before any order is built');
  assert.equal(orders(store,boss).length,0,'no orphan booking was left behind');
  assert.throws(()=>store.withdrawBookingRequest(input),e=>e.status===409,'it cannot be withdrawn twice');
  const events=store.visibleBookingRequestEvents(boss).filter(e=>e.requestId===sent.id);
  assert.ok(events.some(e=>e.action==='withdraw'&&e.actor==='guest'),'the withdrawal is on the append-only history');
  assert.throws(()=>store.db.prepare('DELETE FROM booking_request_events WHERE request_id=?').run(sent.id),/append_only/);
  store.close();
});

test('a decided request can still be looked up, shows the reason, and cannot be withdrawn',()=>{
  const store=open(),boss=user(store);
  publish(store,boss);
  const sent=ask(store);
  send(store,boss,{type:'booking_request_decision',requestId:sent.id,decision:'decline',reason:'No room that week'});
  const looked=store.lookupBookingRequest({slug:'kl-site',reference:sent.reference,contact:'tan@example.com'});
  assert.equal(looked.status,'declined');
  assert.equal(looked.withdrawn,false);
  assert.equal(looked.decisionNote,'No room that week','the reason the desk gave reaches the guest');
  assert.equal(looked.canWithdraw,false);
  assert.throws(()=>store.withdrawBookingRequest({slug:'kl-site',reference:sent.reference,contact:'tan@example.com'}),
    e=>e.status===409,'a refusal cannot be turned into a withdrawal');
  store.close();
});

// Older databases predate the room count and the withdrawal marker. Reopening one must
// widen the table in place, keeping every existing request exactly as it was.
test('a database written before multi-room requests is widened on startup without losing a row',()=>{
  const dir=mkdtempSync(join(tmpdir(),'pms-old-requests-'));
  const file=join(dir,'store.db');
  try{
    const first=new Store(file);first.seedTestProperties();
    publish(first,user(first));
    const sent=ask(first);
    first.close();
    const raw=new DatabaseSync(file);
    raw.exec('ALTER TABLE booking_requests DROP COLUMN rooms');
    raw.exec('ALTER TABLE booking_requests DROP COLUMN withdrawn_at');
    assert.equal(raw.prepare('PRAGMA table_info(booking_requests)').all().some(c=>c.name==='rooms'),false);
    raw.close();
    const again=new Store(file);
    const cols=again.db.prepare('PRAGMA table_info(booking_requests)').all().map(c=>c.name);
    assert.ok(cols.includes('rooms')&&cols.includes('withdrawn_at'),'both columns came back');
    const row=again.db.prepare('SELECT * FROM booking_requests WHERE id=?').get(sent.id);
    assert.equal(row.status,'pending','the old request was not rewritten');
    assert.equal(row.rooms,1,'an old request means one room');
    assert.equal(row.withdrawn_at,null);
    assert.equal(again.lookupBookingRequest({slug:'kl-site',reference:sent.reference,contact:'tan@example.com'}).rooms,1);
    again.close();
  }finally{rmSync(dir,{recursive:true,force:true});}
});

// The public site still needs no script and no session. This drives the real HTTP
// routes: a filled honeypot writes nothing, a real request is posted, and the guest
// then checks and withdraws it through ordinary forms.
test('the public routes drop a honeypot fill and let a guest check and withdraw',async t=>{
  const store=open(),boss=user(store);
  publish(store,boss);
  const server=makeServer(store);
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(async()=>{server.closeAllConnections();await new Promise(r=>server.close(r));store.close();});
  const base=`http://127.0.0.1:${server.address().port}`;
  const post=(path,fields)=>fetch(base+path,{method:'POST',
    headers:{Origin:base,'Content-Type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams(fields),redirect:'manual'});
  const requestFields={lang:'en',from:'2027-09-01',to:'2027-09-03',guests:'1',
    roomType:types(store)[0].id,name:'Tan Mei Ling',contact:'tan@example.com',note:'',rooms:'1'};

  const spam=await post('/sites/kl-site/request',{...requestFields,company:'Cheap Hotels'});
  assert.equal(spam.status,303);
  assert.match(spam.headers.get('location'),/requestError=rate_limited/,
    'the honeypot answers like a rate limit so it does not reveal itself');
  assert.equal(store.db.prepare('SELECT COUNT(*) n FROM booking_requests').get().n,0,'a filled honeypot wrote no request');

  // A note stuffed with links is dropped by the store before anything is written.
  const links=await post('/sites/kl-site/request',{...requestFields,note:'http://a http://b http://c http://d'});
  assert.match(links.headers.get('location'),/requestError=site_input/);
  assert.equal(store.db.prepare('SELECT COUNT(*) n FROM booking_requests').get().n,0);

  const ok=await post('/sites/kl-site/request',requestFields);
  assert.equal(ok.status,303);
  const reference=/sent=([0-9A-F]{8})/.exec(ok.headers.get('location'))?.[1];
  assert.ok(reference,'the guest is given a reference to quote');
  assert.equal(store.db.prepare('SELECT COUNT(*) n FROM booking_requests').get().n,1);

  const lookup=await post('/sites/kl-site/manage',{lang:'en',reference,contact:'tan@example.com',action:'lookup'});
  assert.equal(lookup.status,200);
  const html=await lookup.text();
  assert.match(html,/Waiting for the property/,'the status is read from the database, not from the address bar');
  assert.match(html,/Check my booking request/);
  assert.equal(html.includes('<script'),false,'the page still carries no script');
  assert.match(html,/name="company"/,'the honeypot is on the lookup form too');

  const wrong=await post('/sites/kl-site/manage',{lang:'en',reference,contact:'nobody@example.com',action:'lookup'});
  assert.match(await wrong.text(),/No matching request was found/,'a stranger learns nothing');

  const withdrawn=await post('/sites/kl-site/manage',{lang:'en',reference,contact:'tan@example.com',action:'withdraw'});
  assert.match(await withdrawn.text(),/You withdrew this request/);
  assert.equal(store.db.prepare('SELECT COUNT(*) n FROM booking_requests WHERE withdrawn_at IS NOT NULL').get().n,1);
  assert.equal(orders(store,boss).length,0,'withdrawing over HTTP created no booking');

  // A lookup form with an unknown action is answered as not found, never as a decision.
  const odd=await post('/sites/kl-site/manage',{lang:'en',reference,contact:'tan@example.com',action:'accept'});
  assert.match(await odd.text(),/No matching request was found/);
});
