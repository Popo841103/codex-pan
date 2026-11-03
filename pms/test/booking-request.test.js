import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Store, ServiceError } from '../server/store.js';

const open = () => { const store = new Store(':memory:'); store.seedTestProperties(); return store; };
const user = (store, role='admin', propertyIds=['TEST-KL']) =>
  store.createUser({ username:role+'-'+randomUUID().slice(0,6), password:'x'.repeat(14), role, propertyIds });
const revision = (store,propertyId='TEST-KL') => store.db.prepare('SELECT revision FROM properties WHERE id=?').get(propertyId).revision;
const send = (store,u,command,propertyId='TEST-KL') =>
  store.command({id:u.id},{key:randomUUID(),expectedRevision:revision(store,propertyId),command:{propertyId,...command}});
const body = (store,propertyId='TEST-KL') => JSON.parse(store.db.prepare('SELECT body FROM properties WHERE id=?').get(propertyId).body);
const types = (store,propertyId='TEST-KL') => body(store,propertyId).roomTypes;
const withRates = (store,propertyId,plans,cells) => {
  const value=body(store,propertyId);
  value.ratePlans=plans;value.rateCells=cells;
  store.db.prepare('UPDATE properties SET body=? WHERE id=?').run(JSON.stringify(value),propertyId);
};
const publish = (store,u,over={}) => send(store,u,{type:'site_save',slug:'kl-site',enabled:true,
  title:{en:'KL'},roomTypeIds:[],planCodes:[],...over});
const ask = (store,over={}) => store.submitBookingRequest({slug:'kl-site',roomTypeId:types(store)[0].id,
  from:'2027-09-01',to:'2027-09-03',guests:1,name:'Tan Mei Ling',contact:'tan@example.com',note:'',language:'en',...over});
const requests = (store,u) => store.read({id:u.id}).bookingRequests;
const orders = (store,u,propertyId='TEST-KL') => store.read({id:u.id}).orders.filter(o=>o.propertyId===propertyId);

test('a request is stored as undecided: no booking, no inventory, no money',()=>{
  const store=open(),boss=user(store);
  publish(store,boss);
  const before=revision(store);
  const sent=ask(store);
  assert.equal(sent.status,'pending');
  assert.match(sent.reference,/^[0-9A-F]{8}$/,'the guest is given a reference to quote');
  const row=requests(store,boss)[0];
  assert.equal(row.status,'pending');
  assert.equal(row.guest,'Tan Mei Ling');
  assert.equal(row.start,'2027-09-01');
  assert.equal(row.end,'2027-09-03');
  assert.equal(orders(store,boss).length,0,'asking is not booking');
  assert.equal(revision(store),before,'an undecided request does not move the property on');
  // No money can exist yet because no order does.
  assert.equal(store.read({id:boss.id}).orders.reduce((n,o)=>n+o.transactions.length,0),0);
  store.close();
});

test('only a published site collects requests',()=>{
  const store=open(),boss=user(store);
  publish(store,boss,{enabled:false});
  assert.throws(()=>ask(store),e=>e instanceof ServiceError&&e.status===404,'a draft is not open to the internet');
  publish(store,boss);
  for(const slug of ['no-such-site','KL-Site','kl site'])
    assert.throws(()=>ask(store,{slug}),e=>e.status===404,'rejected slug: '+slug);
  assert.doesNotThrow(()=>ask(store),'the published site takes a request');
  store.close();
});

test('a room type the site does not publish cannot be requested',()=>{
  const store=open(),boss=user(store,'admin',['TEST-KL','TEST-PG']);
  const theirs=types(store,'TEST-PG')[0].id;
  publish(store,boss);
  assert.throws(()=>ask(store,{roomTypeId:theirs}),e=>e.status===400&&e.message==='site_input',
    'another property room type is not on this site');
  assert.throws(()=>ask(store,{roomTypeId:'made-up'}),e=>e.status===400);
  store.close();
});

test('dates and party size are checked before a request is queued',()=>{
  const store=open(),boss=user(store);
  publish(store,boss);
  const type=types(store)[0];
  for(const [from,to] of [['2027-09-03','2027-09-01'],['2027-09-01','2027-09-01'],['2027-09-01','2027-11-20'],['later','2027-09-03']])
    assert.throws(()=>ask(store,{from,to}),e=>e.status===400&&e.message==='date_range','rejected stay: '+from+' → '+to);
  for(const guests of [0,21,1.5,'two'])
    assert.throws(()=>ask(store,{guests}),e=>e.status===400&&e.message==='guest_count','rejected party: '+guests);
  // Capacity is known from the room type, so a party that could never be accepted is
  // refused at the door rather than being queued for someone to reject by hand.
  assert.throws(()=>ask(store,{guests:type.maxGuests+1}),e=>e.status===400&&e.message==='guest_count');
  const bed=types(store).find(t=>t.productId==='bed');
  if(bed)assert.throws(()=>ask(store,{roomTypeId:bed.id,guests:2}),e=>e.status===400&&e.message==='guest_count',
    'a bed is asked for by one person');
  assert.equal(orders(store,boss).length,0);
  assert.equal(requests(store,boss).length,0,'nothing unacceptable was queued');
  store.close();
});

test('a name and a way to reply are required, and long notes are cut rather than rejected',()=>{
  const store=open(),boss=user(store);
  publish(store,boss);
  assert.throws(()=>ask(store,{name:'   '}),e=>e.status===400&&e.message==='guest_name');
  assert.throws(()=>ask(store,{name:'n'.repeat(101)}),e=>e.status===400&&e.message==='guest_name');
  assert.throws(()=>ask(store,{contact:''}),e=>e.status===400&&e.message==='contact');
  assert.throws(()=>ask(store,{contact:'c'.repeat(255)}),e=>e.status===400&&e.message==='contact');
  ask(store,{name:'  Chan  Wei  Ming ',contact:' +60 12 345 ',note:'n'.repeat(4000)});
  const row=requests(store,boss)[0];
  assert.equal(row.guest,'Chan Wei Ming','the name is trimmed and collapsed');
  assert.equal(row.contact,'+60 12 345');
  assert.equal(row.note.length,2000,'an over-long note is cut at the limit');
  store.close();
});

test('accepting a request creates the booking at the price the guest was quoted',()=>{
  const store=open(),boss=user(store);
  const type=types(store)[0];
  withRates(store,'TEST-KL',[{code:'BAR',name:'Best available',roomTypeIds:[type.id]}],
    ['2027-09-01','2027-09-02'].map(date=>({propertyId:'TEST-KL',planCode:'BAR',roomTypeId:type.id,date,amount:18000})));
  publish(store,boss,{planCodes:['BAR']});
  const sent=ask(store,{guests:2});
  assert.equal(sent.quotedTotal,36000,'the quote is what the site would have shown');
  const before=revision(store);
  const accepted=send(store,boss,{type:'booking_request_decision',requestId:sent.id,decision:'accept'});
  assert.equal(accepted.requestStatus,'accepted');
  assert.equal(accepted.bookingRequestId,sent.id);
  const row=requests(store,boss).find(r=>r.id===sent.id);
  assert.equal(row.status,'accepted');
  assert.equal(row.orderId,accepted.id+'-stay-1','the request points at the booking it became');
  const order=orders(store,boss).find(o=>o.id===row.orderId);
  assert.equal(order.guest,'Tan Mei Ling');
  assert.equal(order.status,'confirmed','accepting reserves, it does not check anyone in');
  assert.equal(order.source,'bookingengine','a request from the site is marked as coming from the site');
  assert.equal(order.adults,2,'the party size the guest asked for is carried across');
  assert.deepEqual(order.nightlyRates,[{date:'2027-09-01',amount:18000},{date:'2027-09-02',amount:18000}],
    'the price used is the one quoted, not a fresh one');
  assert.equal(order.resourceId,null,'a room is not assigned until the desk does it');
  assert.equal(revision(store),before+1);
  const audit=store.read({id:boss.id}).audit[0];
  assert.equal(audit.bookingRequestId,sent.id,'the audit says which request created the booking');
  store.close();
});

test('accepting takes the same inventory the desk sells from, and stops when it is gone',()=>{
  const store=open(),boss=user(store);
  const type=types(store)[0];
  publish(store,boss);
  const free=()=>store.publicAvailability({slug:'kl-site',from:'2027-09-01',to:'2027-09-03',guests:1})
    .roomTypes.find(t=>t.id===type.id).available;
  const start=free();
  const first=ask(store);
  send(store,boss,{type:'booking_request_decision',requestId:first.id,decision:'accept'});
  assert.equal(free(),start-1,'an accepted request really holds a room');
  // Fill everything that is left through the desk itself, then the same request can no
  // longer be honoured, so it must fail instead of overselling.
  for(let n=0;n<start-1;n++)send(store,boss,{type:'create',id:'fill-'+randomUUID(),guest:'Fill '+n,start:'2027-09-01',end:'2027-09-03',
    productId:type.productId,roomTypeId:type.id,gender:'any',source:'direct'});
  assert.equal(free(),0);
  const second=ask(store);
  assert.throws(()=>send(store,boss,{type:'booking_request_decision',requestId:second.id,decision:'accept'}),
    e=>e.status===409&&e.message==='inventory_conflict','accepting is refused rather than overselling');
  const row=requests(store,boss).find(r=>r.id===second.id);
  assert.equal(row.status,'pending','a request that could not be honoured stays for someone to answer');
  store.close();
});

test('declining records why and changes nothing else',()=>{
  const store=open(),boss=user(store);
  publish(store,boss);
  const sent=ask(store);
  const before=revision(store);
  const outcome=send(store,boss,{type:'booking_request_decision',requestId:sent.id,decision:'decline',reason:'Renovation that week'});
  assert.equal(outcome.status,'declined');
  const row=requests(store,boss).find(r=>r.id===sent.id);
  assert.equal(row.status,'declined');
  assert.equal(row.decisionNote,'Renovation that week');
  assert.ok(row.decidedAt,'the decision is timestamped by the server');
  assert.equal(orders(store,boss).length,0,'a declined request creates nothing');
  assert.equal(revision(store),before,'declining does not move the property on');
  const events=store.read({id:boss.id}).bookingRequestEvents;
  assert.equal(events[0].action,'decline');
  assert.equal(events[0].reason,'Renovation that week');
  assert.ok(events.some(e=>e.action==='submit'&&e.actor==='public'),'the original request stays on the record');
  store.close();
});

test('a request is decided once, and only by someone who may take bookings',()=>{
  const store=open(),boss=user(store);
  const viewer=user(store,'viewer'),finance=user(store,'finance'),ops=user(store,'operations');
  publish(store,boss,{slug:'kl-site'});
  const accepted=ask(store,{name:'One'}),declined=ask(store,{name:'Two'});
  send(store,boss,{type:'booking_request_decision',requestId:accepted.id,decision:'accept'});
  send(store,boss,{type:'booking_request_decision',requestId:declined.id,decision:'decline',reason:'Closed'});
  for(const [u,requestId] of [[boss,accepted.id],[ops,accepted.id]])
    assert.throws(()=>send(store,u,{type:'booking_request_decision',requestId,decision:'accept'}),
      e=>e.status===409&&e.message==='request_state','a decided request is not decided again');
  assert.throws(()=>send(store,boss,{type:'booking_request_decision',requestId:declined.id,decision:'decline',reason:'Again'}),
    e=>e.status===409&&e.message==='request_state');
  const third=ask(store,{name:'Three'});
  for(const u of [viewer,finance])
    assert.throws(()=>send(store,u,{type:'booking_request_decision',requestId:third.id,decision:'accept'}),
      e=>e.status===403,'a '+u.role+' account cannot decide requests');
  assert.doesNotThrow(()=>send(store,ops,{type:'booking_request_decision',requestId:third.id,decision:'decline',reason:'Full'}),
    'the front desk may answer requests');
  // A request raised for another property is not visible to, or decidable by, this one.
  const outsider=user(store,'admin',['TEST-PG']);
  store.command({id:outsider.id},{key:randomUUID(),expectedRevision:revision(store,'TEST-PG'),
    command:{propertyId:'TEST-PG',type:'site_save',slug:'pg-site',enabled:true,roomTypeIds:[],planCodes:[]}});
  const theirs=store.submitBookingRequest({slug:'pg-site',roomTypeId:types(store,'TEST-PG')[0].id,
    from:'2027-09-01',to:'2027-09-02',guests:1,name:'Outsider',contact:'x@y.z',note:'',language:'en'});
  assert.throws(()=>send(store,boss,{type:'booking_request_decision',requestId:theirs.id,decision:'accept'}),e=>e.status===404);
  assert.equal(requests(store,boss).filter(r=>r.id===theirs.id).length,0,'another property request never appears here');
  store.close();
});

test('the same request key replays the same answer instead of deciding twice',()=>{
  const store=open(),boss=user(store);
  publish(store,boss);
  const sent=ask(store);
  const key=randomUUID(),fingerprint={type:'booking_request_decision',requestId:sent.id,decision:'decline',reason:'Closed'};
  const first=store.command({id:boss.id},{key,expectedRevision:revision(store),command:{propertyId:'TEST-KL',...fingerprint}});
  const again=store.command({id:boss.id},{key,expectedRevision:revision(store),command:{propertyId:'TEST-KL',...fingerprint}});
  assert.equal(again.replayed,true);
  assert.equal(again.id,first.id);
  const events=store.read({id:boss.id}).bookingRequestEvents.filter(e=>e.requestId===sent.id&&e.action==='decline');
  assert.equal(events.length,1,'replaying does not write a second decision');
  assert.throws(()=>store.command({id:boss.id},{key,expectedRevision:revision(store),
    command:{propertyId:'TEST-KL',type:'booking_request_decision',requestId:sent.id,decision:'decline',reason:'Different'}}),
    e=>e.status===409&&e.message==='idempotency_mismatch');
  store.close();
});

test('declining needs a reason, and an unknown decision is refused',()=>{
  const store=open(),boss=user(store);
  publish(store,boss);
  const sent=ask(store);
  for(const over of [{reason:'   '},{reason:'r'.repeat(501)},{},{decision:'maybe'}])
    assert.throws(()=>send(store,boss,{type:'booking_request_decision',requestId:sent.id,decision:'decline',...over}),
      e=>e.status===400,'refused decision: '+JSON.stringify(Object.keys(over)));
  for(const over of [{}])
    assert.throws(()=>send(store,boss,{type:'booking_request_decision',requestId:sent.id,decision:'decline',...over}),
      e=>e.status===400,'refused decision: '+JSON.stringify(Object.keys(over)));
  assert.throws(()=>send(store,boss,{type:'booking_request_decision',requestId:'not-a-request',decision:'accept'}),e=>e.status===404);
  assert.equal(requests(store,boss)[0].status,'pending','nothing half-decided was written');
  store.close();
});

test('with no published price the booking is created at zero and the request says so',()=>{
  const store=open(),boss=user(store);
  publish(store,boss,{planCodes:[]});
  const sent=ask(store);
  assert.equal(sent.quotedTotal,null,'no price is invented where none was published');
  send(store,boss,{type:'booking_request_decision',requestId:sent.id,decision:'accept'});
  const row=requests(store,boss)[0];
  assert.equal(row.quotedTotal,null);
  const order=orders(store,boss).find(o=>o.id===row.orderId);
  assert.equal(order.nightly,0,'a booking with no quoted rate is left for the desk to price, never guessed');
  store.close();
});

test('the history of a request can only be appended to',()=>{
  const store=open(),boss=user(store);
  publish(store,boss);
  const sent=ask(store);
  send(store,boss,{type:'booking_request_decision',requestId:sent.id,decision:'decline',reason:'Closed'});
  assert.throws(()=>store.db.prepare('UPDATE booking_request_events SET summary=? WHERE request_id=?').run('Changed',sent.id),
    /append_only/,'a decision written once is never rewritten');
  assert.throws(()=>store.db.prepare('DELETE FROM booking_request_events WHERE request_id=?').run(sent.id),/append_only/);
  store.close();
});
