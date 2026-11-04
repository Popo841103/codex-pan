import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID,randomBytes } from 'node:crypto';
import { Store } from '../server/store.js';
import { apply, seed, noticeKinds, noticeLevels, noticeRuleKinds, severityOf, cleanNoticeLevels, cleanNoticeRules, escalateSeverity } from '../src/demo-store.js';

const open = () => { const store = new Store(':memory:'); store.seedTestProperties(); return store; };
const user = (store, role='admin', propertyIds=['TEST-KL']) =>
  store.createUser({ username:role+'-'+randomUUID().slice(0,6), password:'x'.repeat(14), role, propertyIds });
const revision = (store,propertyId='TEST-KL') => store.db.prepare('SELECT revision FROM properties WHERE id=?').get(propertyId).revision;
const send = (store,u,command,propertyId='TEST-KL') =>
  store.command({id:u.id},{key:randomUUID(),expectedRevision:revision(store,propertyId),command:{propertyId,...command}});
const types = (store,propertyId='TEST-KL') => JSON.parse(store.db.prepare('SELECT body FROM properties WHERE id=?').get(propertyId).body).roomTypes;
const publish = (store,u,over={},propertyId='TEST-KL') => send(store,u,{type:'site_save',slug:'kl-site',enabled:true,
  title:{en:'KL'},roomTypeIds:types(store,propertyId).map(t=>t.id),planCodes:[],...over},propertyId);
const ask = (store,over={}) => store.submitBookingRequest({slug:'kl-site',roomTypeId:types(store)[0].id,
  from:'2027-09-01',to:'2027-09-03',guests:1,name:'Tan Mei Ling',contact:'tan@example.com',note:'',language:'en',...over});
const notices = (store,u) => store.read({id:u.id}).notifications;

test('a request tells the people who can decide on it, and nobody else',()=>{
  const store=open(),boss=user(store);
  publish(store,boss);
  // Someone who can decide, someone who cannot, and someone switched off.
  const keeper=user(store,'operations'),watcher=user(store,'viewer');
  const gone=user(store,'operations');
  store.db.prepare('UPDATE users SET active=0 WHERE id=?').run(gone.id);
  const before=revision(store);
  ask(store);
  const forBoss=notices(store,boss),forKeeper=notices(store,keeper),forWatcher=notices(store,watcher);
  // A switched-off account cannot hold a session, so its notices are read from the table.
  const forGone=store.visibleNotifications({id:gone.id});
  assert.equal(forBoss.length,1,'an administrator is told');
  assert.equal(forKeeper.length,1,'an operator is told');
  assert.equal(forWatcher.length,0,'a viewer cannot decide on it, so is not told');
  assert.equal(forGone.length,0,'a switched-off account is not told');
  assert.equal(forBoss[0].kind,'booking_request');
  assert.equal(forBoss[0].guest,'Tan Mei Ling');
  assert.equal(forBoss[0].nights,2);
  assert.equal(forBoss[0].readAt,null,'it starts unread');
  assert.equal(revision(store),before,'a notice does not move the property on');
  store.close();
});

test('a notice stays inside the property that raised it',()=>{
  const store=open(),boss=user(store);
  publish(store,boss);
  const elsewhere=user(store,'admin',['TEST-PG']);
  const both=user(store,'admin',['TEST-KL','TEST-PG']);
  ask(store);
  assert.equal(notices(store,elsewhere).length,0,'another property is not told about this one');
  assert.equal(notices(store,both).length,1);
  assert.equal(notices(store,both)[0].propertyId,'TEST-KL');
  // It is also not readable from a property the account is not scoped to.
  assert.throws(()=>send(store,elsewhere,{type:'notification_read',notificationId:notices(store,boss)[0].id}),e=>e.status===403||e.status===404);
  store.close();
});

test('a property role override decides who is told',()=>{
  const store=open(),boss=user(store);
  publish(store,boss);
  // An account that is a viewer everywhere, but an operator at this one property.
  const promoted=user(store,'viewer',['TEST-KL']);
  store.db.prepare('UPDATE user_properties SET role=? WHERE user_id=? AND property_id=?').run('operations',promoted.id,'TEST-KL');
  ask(store);
  assert.equal(notices(store,promoted).length,1,'the override is what counts here');
  store.close();
});

test('marking read is personal: it changes no revision, order or notice',()=>{
  const store=open(),boss=user(store);
  publish(store,boss);
  const sent=ask(store);
  const notice=notices(store,boss)[0];
  const before={revision:revision(store),summary:JSON.stringify(notice)};
  const marked=send(store,boss,{type:'notification_read',notificationId:notice.id});
  assert.equal(marked.read,1);
  assert.equal(revision(store),before.revision,'reading is not a property business command');
  const after=notices(store,boss)[0];
  assert.ok(after.readAt,'it is now marked read');
  assert.equal(after.guest,'Tan Mei Ling');
  assert.equal(after.kind,'booking_request');
  assert.equal(after.requestId,sent.id,'the notice still points at the request');
  assert.equal(store.read({id:boss.id}).orders.length,0,'reading creates nothing');
  store.close();
});

test('someone else’s notice cannot be read, and a missing one is not invented',()=>{
  const store=open(),boss=user(store);
  publish(store,boss);
  const other=user(store,'admin',['TEST-KL']);
  ask(store);
  const notice=notices(store,boss)[0];
  assert.throws(()=>send(store,other,{type:'notification_read',notificationId:notice.id}),e=>e.status===404,
    'a notice addressed to somebody else is not readable');
  assert.throws(()=>send(store,boss,{type:'notification_read',notificationId:randomUUID()}),e=>e.status===404);
  assert.equal(notices(store,boss)[0].readAt,null,'a refused attempt reads nothing');
  store.close();
});

test('marking a whole property read leaves other properties alone',()=>{
  const store=open(),boss=user(store,'admin',['TEST-KL','TEST-PG']);
  publish(store,boss);
  publish(store,boss,{slug:'pg-site',title:{en:'PG'},roomTypeIds:types(store,'TEST-PG').map(t=>t.id)},'TEST-PG');
  ask(store);
  ask(store,{slug:'pg-site',roomTypeId:types(store,'TEST-PG')[0].id});
  assert.equal(notices(store,boss).length,2);
  const marked=send(store,boss,{type:'notification_read',all:true},'TEST-KL');
  assert.equal(marked.read,1,'only this property is marked');
  const after=notices(store,boss);
  assert.equal(after.find(n=>n.propertyId==='TEST-KL').readAt!==null,true);
  assert.equal(after.find(n=>n.propertyId==='TEST-PG').readAt,null,'the other property is untouched');
  store.close();
});

test('reading twice answers from the receipt instead of reading again',()=>{
  const store=open(),boss=user(store);
  publish(store,boss);
  ask(store);
  const notice=notices(store,boss)[0],key=randomUUID();
  const first=store.command({id:boss.id},{key,expectedRevision:revision(store),command:{propertyId:'TEST-KL',type:'notification_read',notificationId:notice.id}});
  const again=store.command({id:boss.id},{key,expectedRevision:revision(store),command:{propertyId:'TEST-KL',type:'notification_read',notificationId:notice.id}});
  assert.equal(first.read,1);
  assert.equal(again.replayed,true,'a retry does not write a second read');
  assert.equal(again.read,1);
  // The same key carrying a different body is refused rather than answered.
  assert.throws(()=>store.command({id:boss.id},{key,expectedRevision:revision(store),
    command:{propertyId:'TEST-KL',type:'notification_read',notificationId:notices(store,boss)[0].id,all:true}}),e=>e.status===409);
  store.close();
});

test('the unread count is what the header bell would show',()=>{
  const store=open(),boss=user(store);
  publish(store,boss);
  assert.deepEqual(store.notificationFeed({id:boss.id}),{unread:0,items:[]});
  ask(store);ask(store,{name:'Second Guest'});
  const feed=store.notificationFeed({id:boss.id});
  assert.equal(feed.unread,2);
  assert.equal(feed.items.length,2);
  send(store,boss,{type:'notification_read',all:true});
  assert.equal(store.notificationFeed({id:boss.id}).unread,0,'the bell clears once they are read');
  store.close();
});

test('a notice is a record: it cannot be rewritten, and reading cannot be undone',()=>{
  const store=open(),boss=user(store);
  publish(store,boss);
  ask(store);
  const notice=notices(store,boss)[0];
  assert.throws(()=>store.db.prepare('UPDATE notifications SET summary=? WHERE id=?').run('Changed',notice.id),
    'a notice is never rewritten');
  send(store,boss,{type:'notification_read',notificationId:notice.id});
  assert.throws(()=>store.db.prepare('UPDATE notification_reads SET at=? WHERE notification_id=?').run('2000-01-01T00:00:00.000Z',notice.id),
    'reading cannot be backdated');
  assert.throws(()=>store.db.prepare('DELETE FROM notification_reads WHERE notification_id=?').run(notice.id),
    'reading cannot be undone');
  store.close();
});

test('the newest unread comes first',()=>{
  const store=open(),boss=user(store);
  publish(store,boss);
  ask(store,{name:'First Guest'});
  ask(store,{name:'Second Guest'});
  send(store,boss,{type:'notification_read',notificationId:notices(store,boss).find(n=>n.guest==='First Guest').id});
  const order=notices(store,boss).map(n=>n.guest);
  assert.deepEqual(order,['Second Guest','First Guest'],'what is still waiting comes ahead of what was read');
  store.close();
});

// Standing facts, not events: they are worked out from the property each time, so one
// that has been dealt with stops appearing instead of lingering as a stale message.
const withBusinessDate = (store,u,date='2027-06-01',propertyId='TEST-KL') =>
  send(store,u,{type:'business_date_init',date},propertyId);
const roomType = (store,propertyId='TEST-KL') => JSON.parse(store.db.prepare('SELECT body FROM properties WHERE id=?').get(propertyId).body)
  .roomTypes.find(t=>t.productId==='room');
const book = (store,u,{guest,start,end,mode='reserve'}) => send(store,u,{type:'create_reservation',mode,bookingKind:'individual',
  companyName:'',source:'direct',autoAssign:false,guest,date:start,
  stays:[{productId:'room',roomTypeId:roomType(store).id,gender:'any',start,end,adults:1,children:0,infants:0,
    occupants:[{name:mode==='checkin'?guest:'',gender:'any'}],nightly:10000,
    nightlyRates:days(start,end).map(date=>({date,amount:10000}))}]});
function days(from,to){const out=[];for(let d=from;d<to;d=new Date(Date.parse(d+'T00:00:00Z')+86400000).toISOString().slice(0,10))out.push(d);return out;}
const setBody = (store,change,propertyId='TEST-KL') => {
  const value=JSON.parse(store.db.prepare('SELECT body FROM properties WHERE id=?').get(propertyId).body);
  change(value);store.db.prepare('UPDATE properties SET body=? WHERE id=?').run(JSON.stringify(value),propertyId);
};
const kinds = (store,u) => store.read({id:u.id}).notifications.map(n=>n.kind);

test('a guest who should have arrived, and one who should have left, are both raised',()=>{
  const store=open(),boss=user(store);
  withBusinessDate(store,boss);
  book(store,boss,{guest:'No Show',start:'2027-06-01',end:'2027-06-03'});
  book(store,boss,{guest:'Overstay',start:'2027-05-30',end:'2027-06-05',mode:'checkin'});
  setBody(store,value=>{value.orders.find(o=>o.guest==='Overstay').end='2027-06-01';});
  const list=store.read({id:boss.id}).notifications;
  assert.ok(kinds(store,boss).includes('no_show'),'the arrival that never arrived is raised');
  assert.ok(kinds(store,boss).includes('overdue_checkout'),'the departure that never left is raised');
  const noShow=list.find(n=>n.kind==='no_show');
  assert.equal(noShow.guest,'No Show');
  assert.equal(noShow.date,'2027-06-01');
  assert.ok(noShow.id.startsWith('derived:'),'it is a standing fact, not a stored event');
  assert.ok(noShow.orderId,'it points at the booking to deal with');
  store.close();
});

test('a booking arriving today with no room yet is raised once',()=>{
  const store=open(),boss=user(store);
  withBusinessDate(store,boss);
  book(store,boss,{guest:'Unassigned',start:'2027-06-01',end:'2027-06-03'});
  assert.equal(kinds(store,boss).filter(k=>k==='unassigned_arrival').length,1);
  // Giving them a room is enough: the notice is a fact, so it stops being true.
  setBody(store,value=>{value.orders[0].resourceId=value.resources.find(r=>r.productId==='room').id;});
  assert.equal(kinds(store,boss).includes('unassigned_arrival'),false,'a room was given, so it is no longer standing');
  store.close();
});

test('rooms needing cleaning are raised as one notice for the property',()=>{
  const store=open(),boss=user(store);
  withBusinessDate(store,boss);
  assert.equal(kinds(store,boss).includes('rooms_to_clean'),false,'nothing is dirty yet');
  setBody(store,value=>{value.resources.filter(r=>r.productId==='room').slice(0,3).forEach(r=>{r.cleaning='dirty';});});
  const notice=store.read({id:boss.id}).notifications.find(n=>n.kind==='rooms_to_clean');
  assert.equal(notice.count,3,'one notice counts them rather than raising three');
  setBody(store,value=>{value.resources.forEach(r=>{r.cleaning='clean';});});
  assert.equal(kinds(store,boss).includes('rooms_to_clean'),false,'cleaned, so no longer standing');
  store.close();
});

test('a request left waiting more than a day is raised, but not one just sent',()=>{
  const store=open(),boss=user(store);
  withBusinessDate(store,boss);
  publish(store,boss);
  ask(store);
  assert.equal(kinds(store,boss).includes('request_waiting'),false,'a fresh request is not chased yet');
  // Two days on with nobody answering it.
  const row=store.db.prepare("SELECT id FROM booking_requests WHERE status='pending'").get();
  store.db.prepare('UPDATE booking_requests SET created_at=? WHERE id=?').run(new Date(Date.now()-2*86400000).toISOString(),row.id);
  const waiting=store.read({id:boss.id}).notifications.find(n=>n.kind==='request_waiting');
  assert.ok(waiting,'a request nobody answered is raised');
  assert.equal(waiting.guest,'Tan Mei Ling');
  assert.ok(waiting.requestId,'it points at the request to decide on');
  // Deciding it is what makes it stop.
  send(store,boss,{type:'booking_request_decision',requestId:row.id,decision:'decline',reason:'No rooms left'});
  assert.equal(kinds(store,boss).includes('request_waiting'),false,'decided, so it is no longer waiting');
  store.close();
});

test('a standing notice is told only to whoever can deal with it',()=>{
  const store=open(),boss=user(store);
  withBusinessDate(store,boss);
  book(store,boss,{guest:'No Show',start:'2027-06-01',end:'2027-06-03'});
  setBody(store,value=>{value.resources.find(r=>r.productId==='room').cleaning='dirty';});
  const watcher=user(store,'viewer');
  assert.equal(store.read({id:watcher.id}).notifications.length,0,'a viewer can do none of it, so is told none of it');
  const keeper=user(store,'operations');
  assert.deepEqual(kinds(store,keeper).sort(),['no_show','rooms_to_clean','unassigned_arrival'],'an operator is told what they can act on');
  store.close();
});

test('a standing notice can be read, and a made-up one cannot',()=>{
  const store=open(),boss=user(store);
  withBusinessDate(store,boss);
  book(store,boss,{guest:'No Show',start:'2027-06-01',end:'2027-06-03'});
  const notice=store.read({id:boss.id}).notifications.find(n=>n.kind==='no_show');
  const before=revision(store);
  const marked=send(store,boss,{type:'notification_read',notificationId:notice.id});
  assert.equal(marked.read,1,'a standing fact can be marked read like any other');
  assert.equal(revision(store),before);
  assert.ok(store.read({id:boss.id}).notifications.find(n=>n.id===notice.id).readAt);
  assert.throws(()=>send(store,boss,{type:'notification_read',notificationId:'derived:no_show:INVENTED:2027-06-01'}),
    e=>e.status===404,'an id nobody is being shown is not readable');
  store.close();
});

test('marking a whole property read clears standing notices too',()=>{
  const store=open(),boss=user(store);
  withBusinessDate(store,boss);
  book(store,boss,{guest:'No Show',start:'2027-06-01',end:'2027-06-03'});
  setBody(store,value=>{value.resources.find(r=>r.productId==='room').cleaning='dirty';});
  assert.equal(store.notificationFeed(store.db.prepare('SELECT * FROM users WHERE id=?').get(boss.id)).unread>=2,true);
  send(store,boss,{type:'notification_read',all:true});
  assert.equal(store.notificationFeed(store.db.prepare('SELECT * FROM users WHERE id=?').get(boss.id)).unread,0,
    'everything waiting in this property is now read');
  store.close();
});

// How much a notice matters decides the order, not the clock: somebody who should be
// standing at the desk is read before a room that needs cleaning.
test('what is waiting on a person outranks housekeeping',()=>{
  const store=open(),boss=user(store);
  withBusinessDate(store,boss);
  book(store,boss,{guest:'No Show',start:'2027-06-01',end:'2027-06-03'});
  publish(store,boss);
  ask(store,{name:'Site Guest'});
  setBody(store,value=>{value.resources.filter(r=>r.productId==='room').slice(0,2).forEach(r=>{r.cleaning='dirty';});});
  const list=store.read({id:boss.id}).notifications;
  const level=kind=>list.find(n=>n.kind===kind)?.severity;
  assert.equal(level('no_show'),'urgent','a guest who should have arrived is urgent');
  assert.equal(level('booking_request'),'attention','a request is waiting, but nobody is standing outside');
  assert.equal(level('rooms_to_clean'),'routine','cleaning is routine work');
  const rank={urgent:0,attention:1,routine:2};
  assert.deepEqual(list.map(n=>rank[n.severity]),[...list.map(n=>rank[n.severity])].sort((a,b)=>a-b),
    'the list never puts routine work above a person');
  assert.ok(list.findIndex(n=>n.kind==='no_show')<list.findIndex(n=>n.kind==='rooms_to_clean'),
    'the guest comes before the cleaning');
  store.close();
});

// Self-registration ends with a person: somebody hands in their identity details and then
// stands behind that decision. That is work waiting, so it is raised like any other.
const checkinStore = () => { const store=new Store(':memory:',{selfCheckin:{key:randomBytes(32)}}); store.seedTestProperties(); return store; };

test('a registration waiting on a person is raised, and stops when that person decides',()=>{
  const store=checkinStore(),boss=user(store),keeper=user(store,'operations'),watcher=user(store,'viewer');
  const checkin=(u,command,revision=0)=>store.checkin.command({id:u.id},{key:randomUUID(),expectedRevision:revision,
    command:{propertyId:'TEST-KL',...command}});
  checkin(boss,{type:'sc_policy_save',enabled:true,requirePayment:false,requiredDeposit:0,registrationMode:'all',instructions:''});
  book(store,boss,{guest:'Registration Guest',start:'2027-06-01',end:'2027-06-03'});
  const order=store.read({id:boss.id}).orders.find(o=>o.guest==='Registration Guest');
  const invite=checkin(keeper,{type:'sc_invite',orderId:order.id});
  assert.equal(kinds(store,boss).includes('checkin_review'),false,'an invitation nobody has filled in is not work yet');
  store.checkin.register(invite.token,{revision:1,consent:true,people:[{name:'Registration Guest',documentType:'passport',documentNumber:'TEST12345'}]});
  const notice=store.read({id:boss.id}).notifications.find(n=>n.kind==='checkin_review');
  assert.ok(notice,'identity handed in and waiting on somebody is raised');
  assert.equal(notice.severity,'urgent','a guest waiting on a review comes before routine work');
  assert.equal(notice.guest,'Registration Guest');
  assert.ok(notice.grantId,'it points at the registration to review');
  assert.equal(kinds(store,watcher).includes('checkin_review'),false,'a viewer cannot review identity, so is not told');
  // Reviewing it is what makes it stop: the fact is no longer standing.
  // Registration switched off closes the guest's link too, so nobody is standing behind
  // that decision any more and it is not presented as work waiting.
  checkin(boss,{type:'sc_policy_save',enabled:false,requirePayment:false,requiredDeposit:0,registrationMode:'all',instructions:''},1);
  assert.equal(kinds(store,boss).includes('checkin_review'),false,'switched off, so nothing is waiting on it');
  checkin(boss,{type:'sc_policy_save',enabled:true,requirePayment:false,requiredDeposit:0,registrationMode:'all',instructions:''},2);
  assert.ok(kinds(store,boss).includes('checkin_review'),'switched back on, and the guest is still waiting');
  // Reviewing it is what makes it stop: the fact is no longer standing.
  const grant=store.checkin.read({id:boss.id},'TEST-KL').grants.find(g=>g.id===notice.grantId);
  checkin(boss,{type:'sc_review',grantId:grant.id,review:'approved',reason:'TEST checked identity at the desk'},grant.revision);
  assert.equal(kinds(store,boss).includes('checkin_review'),false,'reviewed, so no longer standing');
  store.close();
});


// A property may decide how much each kind of notice matters to it. The system default
// never changes; only what this property chose differently is stored, so a level left
// alone keeps following the current rule. The chosen level is what the list is read by.
const bookAt = (store,u,propertyId,guest) => send(store,u,{type:'create_reservation',mode:'reserve',bookingKind:'individual',
  companyName:'',source:'direct',autoAssign:false,guest,date:'2027-06-01',
  stays:[{productId:'room',roomTypeId:roomType(store,propertyId).id,gender:'any',start:'2027-06-01',end:'2027-06-03',
    adults:1,children:0,infants:0,occupants:[{name:'',gender:'any'}],nightly:10000,
    nightlyRates:days('2027-06-01','2027-06-03').map(date=>({date,amount:10000}))}]},propertyId);
const dirtyTwo = (store,propertyId='TEST-KL') => setBody(store,value=>{
  value.resources.filter(r=>r.productId==='room').slice(0,2).forEach(r=>{r.cleaning='dirty';});},propertyId);
const levels = (store,u,value,propertyId='TEST-KL',key=randomUUID()) =>
  store.command({id:u.id},{key,expectedRevision:revision(store,propertyId),
    command:{propertyId,type:'notice_severity_save',levels:value}});

test('a property can read cleaning before a guest, and that choice is its own',()=>{
  const store=open(),boss=user(store,'admin',['TEST-KL','TEST-PG']);
  withBusinessDate(store,boss);
  withBusinessDate(store,boss,'2027-06-01','TEST-PG');
  bookAt(store,boss,'TEST-KL','KL No Show');
  bookAt(store,boss,'TEST-PG','PG No Show');
  dirtyTwo(store,'TEST-KL');dirtyTwo(store,'TEST-PG');
  const before=store.read({id:boss.id}).notifications;
  assert.ok(before.findIndex(n=>n.kind==='no_show'&&n.propertyId==='TEST-KL')<
    before.findIndex(n=>n.kind==='rooms_to_clean'&&n.propertyId==='TEST-KL'),'by default the guest comes first');
  const rev=revision(store);
  levels(store,boss,{no_show:'routine',rooms_to_clean:'urgent'});
  assert.equal(revision(store),rev,'a setting never advances a business revision');
  const after=store.read({id:boss.id}).notifications;
  const klClean=after.find(n=>n.kind==='rooms_to_clean'&&n.propertyId==='TEST-KL');
  const klGuest=after.find(n=>n.kind==='no_show'&&n.propertyId==='TEST-KL');
  assert.equal(klClean.severity,'urgent','cleaning was raised by this property');
  assert.equal(klGuest.severity,'routine','the arrival was lowered by this property');
  assert.ok(after.indexOf(klClean)<after.indexOf(klGuest),'the property chose to read cleaning first');
  // The bell uses its own light feed, so the changed order has to reach it too.
  const feed=store.notificationFeed(boss);
  assert.ok(feed.items.indexOf(feed.items.find(n=>n.kind==='rooms_to_clean'&&n.propertyId==='TEST-KL'))<
    feed.items.indexOf(feed.items.find(n=>n.kind==='no_show'&&n.propertyId==='TEST-KL')),
    'the header bell reads the list in the property order as well');
  // The other property was never configured, so it keeps the system order.
  const pgClean=after.find(n=>n.kind==='rooms_to_clean'&&n.propertyId==='TEST-PG');
  const pgGuest=after.find(n=>n.kind==='no_show'&&n.propertyId==='TEST-PG');
  assert.equal(pgClean.severity,'routine','another property is not dragged along');
  assert.equal(pgGuest.severity,'urgent');
  assert.ok(after.indexOf(pgGuest)<after.indexOf(pgClean));
  store.close();
});

test('only an administrator of that property may set its priorities',()=>{
  const store=open(),boss=user(store),keeper=user(store,'operations'),money=user(store,'finance'),watcher=user(store,'viewer');
  const elsewhere=user(store,'admin',['TEST-PG']);
  for(const denied of [keeper,money,watcher])
    assert.throws(()=>levels(store,denied,{rooms_to_clean:'urgent'}),e=>e.status===403,'only an administrator decides');
  assert.throws(()=>levels(store,elsewhere,{rooms_to_clean:'urgent'}),e=>e.status===403,
    'an administrator of another property cannot set this one');
  assert.equal(store.visibleNoticeSettings(boss).length,0,'nothing was written by a refused attempt');
  // A property-level override makes a viewer an administrator here, as it does for
  // every other action: the page and the server must agree.
  store.db.prepare('UPDATE user_properties SET role=? WHERE user_id=? AND property_id=?').run('admin',watcher.id,'TEST-KL');
  assert.deepEqual(levels(store,watcher,{rooms_to_clean:'urgent'}).levels,{rooms_to_clean:'urgent'});
  assert.equal(store.visibleNoticeSettings(boss)[0].levels.rooms_to_clean,'urgent');
  store.close();
});

test('priority input is validated, defaults are not frozen, and the audit is append-only',()=>{
  const store=open(),boss=user(store);
  for(const bad of [{made_up_kind:'urgent'},{rooms_to_clean:'critical'},['urgent'],'urgent',null,42])
    assert.throws(()=>levels(store,boss,bad),e=>e.status===400,'a level must be a known kind and a real level');
  assert.equal(store.visibleNoticeSettings(boss).length,0,'nothing was stored by a refused value');
  // 'default', an empty string and null all mean follow the system rule, so a form
  // that sends every kind still stores only what was actually changed.
  const saved=levels(store,boss,{no_show:'default',overdue_checkout:'',checkin_review:null,rooms_to_clean:'urgent'});
  assert.deepEqual(saved.levels,{rooms_to_clean:'urgent'},'only explicit overrides are stored');
  const setting=store.visibleNoticeSettings(boss)[0];
  assert.equal(setting.propertyId,'TEST-KL');
  assert.equal(setting.updatedBy,boss.id);
  const audit=store.visibleNoticeSettingsAudit(boss);
  assert.equal(audit.length,1,'the change is recorded');
  assert.deepEqual(audit[0].previous,{},'what it replaced is kept');
  assert.deepEqual(audit[0].next,{rooms_to_clean:'urgent'});
  assert.throws(()=>store.db.prepare("UPDATE notice_settings_audit SET summary='{}' WHERE id=?").run(audit[0].id),
    /notice_settings_audit_append_only/,'the audit cannot be rewritten');
  assert.throws(()=>store.db.prepare('DELETE FROM notice_settings_audit WHERE id=?').run(audit[0].id),
    /notice_settings_audit_append_only/,'nor deleted');
  // Clearing the overrides puts everything back on the system rule.
  levels(store,boss,{rooms_to_clean:'default'});
  assert.deepEqual(store.visibleNoticeSettings(boss)[0].levels,{},'nothing is overridden any more');
  assert.equal(severityOf('rooms_to_clean',store.visibleNoticeSettings(boss)[0].levels),'routine');
  assert.equal(store.visibleNoticeSettingsAudit(boss).length,2,'the reset is recorded too');
  store.close();
});

test('saving priorities is idempotent, scoped, and changes no business state',()=>{
  const store=open(),boss=user(store),elsewhere=user(store,'admin',['TEST-PG']);
  publish(store,boss);
  const key=randomUUID();
  const first=levels(store,boss,{rooms_to_clean:'urgent'},'TEST-KL',key);
  const replay=levels(store,boss,{rooms_to_clean:'urgent'},'TEST-KL',key);
  assert.equal(replay.replayed,true,'the same request key answers from its receipt');
  assert.deepEqual(replay.levels,first.levels);
  assert.throws(()=>levels(store,boss,{rooms_to_clean:'routine'},'TEST-KL',key),e=>e.status===409,
    'a reused key carrying a different body is refused');
  assert.deepEqual(store.visibleNoticeSettings(elsewhere),[],'another property cannot read this setting');
  assert.deepEqual(store.visibleNoticeSettingsAudit(elsewhere),[],'nor its audit');
  const state=store.read({id:boss.id});
  assert.equal(state.noticeSettings.length,1,'the desk page is given the setting to show');
  assert.equal(state.noticeSettingsAudit.length,1);
  assert.equal(state.orders.length,0,'no booking was created');
  assert.equal(state.notifications.length,0,'no notice was raised');
  store.close();
});

test('the shared defaults, kinds and validation live in one place with the local reducer',()=>{
  assert.deepEqual(noticeLevels,['urgent','attention','routine']);
  assert.ok(noticeKinds.includes('rooms_to_clean')&&noticeKinds.includes('checkin_review'));
  assert.equal(severityOf('no_show'),'urgent');
  assert.equal(severityOf('rooms_to_clean'),'routine');
  assert.equal(severityOf('unlisted_kind'),'attention','an unknown kind is never invented as urgent');
  assert.equal(severityOf('rooms_to_clean',{rooms_to_clean:'urgent'}),'urgent');
  assert.equal(severityOf('rooms_to_clean',{rooms_to_clean:'bogus'}),'routine','a bad override falls back');
  assert.deepEqual(cleanNoticeLevels({no_show:'default',rooms_to_clean:'urgent'}),{rooms_to_clean:'urgent'});
  assert.equal(cleanNoticeLevels({no_show:'bogus'}),null);
  // The local-only mode answers the same command, so a desk working without the shared
  // backend can save its settings without the page failing.
  const local=seed();
  const updated=apply(local,{propertyId:'TEST-KL',type:'notice_severity_save',levels:{rooms_to_clean:'urgent'},
    at:'2027-06-01T00:00:00.000Z',actor:'local'});
  assert.deepEqual(updated.noticeSettings.find(s=>s.propertyId==='TEST-KL').levels,{rooms_to_clean:'urgent'});
  assert.throws(()=>apply(local,{propertyId:'TEST-KL',type:'notice_severity_save',levels:{fake:'urgent'},at:'x'}),
    'a value the server would refuse is refused locally too');
});

// Conditional rules: a property can say that a standing fact only becomes urgent once
// enough of it has piled up. With no rule at all the list is exactly as it was, so the
// system default is never silently changed by adding the feature.
const ruleFor = (store,u,value,propertyId='TEST-KL',key=randomUUID()) =>
  store.command({id:u.id},{key,expectedRevision:revision(store,propertyId),
    command:{propertyId,type:'notice_rule_save',rules:value}});
const dirtyCount = (store,n,propertyId='TEST-KL') => setBody(store,value=>{
  value.resources.filter(r=>r.productId==='room').slice(0,n).forEach(r=>{r.cleaning='dirty';});},propertyId);

test('a conditional rule raises cleaning only once enough rooms are dirty',()=>{
  const store=open(),boss=user(store);
  withBusinessDate(store,boss);
  bookAt(store,boss,'TEST-KL','Late Guest');
  dirtyCount(store,2);
  const before=store.read({id:boss.id}).notifications;
  const cleanBefore=before.find(n=>n.kind==='rooms_to_clean');
  assert.equal(cleanBefore.severity,'routine','without a rule the system default stands');
  assert.equal(cleanBefore.magnitude,2,'the fact carries its size');
  assert.equal(cleanBefore.escalated,false);
  const rev=revision(store);
  ruleFor(store,boss,{rooms_to_clean:{atLeast:3,level:'urgent'}});
  assert.equal(revision(store),rev,'a rule is a setting and moves no business revision');
  const atTwo=store.read({id:boss.id}).notifications.find(n=>n.kind==='rooms_to_clean');
  assert.equal(atTwo.severity,'routine','two dirty rooms do not meet the threshold');
  assert.equal(atTwo.escalated,false);
  dirtyCount(store,3);
  const atThree=store.read({id:boss.id}).notifications.find(n=>n.kind==='rooms_to_clean');
  assert.equal(atThree.severity,'urgent','a big enough backlog is read ahead of routine work');
  assert.equal(atThree.escalated,true,'the list says the rule, not the default, decided it');
  assert.equal(atThree.magnitude,3);
  // The bell uses the same list, so the escalated order reaches it too.
  assert.equal(store.notificationFeed(boss).items.find(n=>n.kind==='rooms_to_clean').severity,'urgent');
  // Cleaning them all up makes the fact disappear rather than leaving a stale urgent one.
  setBody(store,value=>{value.resources.forEach(r=>{r.cleaning='clean';});});
  assert.equal(kinds(store,boss).includes('rooms_to_clean'),false);
  store.close();
});

test('a rule can only raise a notice; a level below the base changes nothing',()=>{
  const store=open(),boss=user(store);
  withBusinessDate(store,boss);
  dirtyCount(store,1);
  // An event kind has no size to measure, so no rule can be written for it.
  assert.throws(()=>ruleFor(store,boss,{no_show:{atLeast:1,level:'urgent'}}),e=>e.status===400);
  // A rule to a level no more urgent than the base leaves the notice where it was.
  ruleFor(store,boss,{rooms_to_clean:{atLeast:1,level:'routine'}});
  const same=store.read({id:boss.id}).notifications.find(n=>n.kind==='rooms_to_clean');
  assert.equal(same.severity,'routine');
  assert.equal(same.escalated,false);
  // Even when a property first makes cleaning urgent, a lower rule cannot push it down.
  levels(store,boss,{rooms_to_clean:'urgent'});
  const raised=store.read({id:boss.id}).notifications.find(n=>n.kind==='rooms_to_clean');
  assert.equal(raised.severity,'urgent','the property level still holds');
  store.close();
});

test('a backlog of waiting requests is what the rule counts',()=>{
  const store=open(),boss=user(store);
  withBusinessDate(store,boss);
  publish(store,boss);
  ask(store);ask(store,{name:'Second Guest'});
  store.db.prepare('UPDATE booking_requests SET created_at=?').run(new Date(Date.now()-2*86400000).toISOString());
  const one=store.read({id:boss.id}).notifications.filter(n=>n.kind==='request_waiting');
  assert.equal(one.length,2);
  assert.ok(one.every(n=>n.magnitude===2),'each carries the size of the backlog, not one');
  assert.ok(one.every(n=>n.severity==='attention'));
  ruleFor(store,boss,{request_waiting:{atLeast:2,level:'urgent'}});
  const after=store.read({id:boss.id}).notifications.filter(n=>n.kind==='request_waiting');
  assert.ok(after.every(n=>n.severity==='urgent'&&n.escalated));
  // Deciding one shrinks the backlog below the threshold, so the other falls back.
  const row=store.db.prepare("SELECT id FROM booking_requests WHERE status='pending' LIMIT 1").get();
  send(store,boss,{type:'booking_request_decision',requestId:row.id,decision:'decline',reason:'No rooms left'});
  const left=store.read({id:boss.id}).notifications.find(n=>n.kind==='request_waiting');
  assert.equal(left.magnitude,1);
  assert.equal(left.severity,'attention','one request on its own is back on the default');
  assert.equal(left.escalated,false);
  store.close();
});

test('a rule works together with a property level for registrations waiting on a person',()=>{
  const store=checkinStore(),boss=user(store);
  const checkin=(u,command)=>store.checkin.command({id:u.id},{key:randomUUID(),expectedRevision:0,
    command:{propertyId:'TEST-KL',...command}});
  checkin(boss,{type:'sc_policy_save',enabled:true,requirePayment:false,requiredDeposit:0,registrationMode:'all',instructions:''});
  book(store,boss,{guest:'Registration Guest',start:'2027-06-01',end:'2027-06-03'});
  const order=store.read({id:boss.id}).orders.find(o=>o.guest==='Registration Guest');
  const invite=checkin(boss,{type:'sc_invite',orderId:order.id});
  store.checkin.register(invite.token,{revision:1,consent:true,people:[{name:'Registration Guest',documentType:'passport',documentNumber:'TEST12345'}]});
  const notice=store.read({id:boss.id}).notifications.find(n=>n.kind==='checkin_review');
  assert.equal(notice.magnitude,1,'the fact carries how many are waiting');
  assert.equal(notice.severity,'urgent');
  // The property reads a single registration as routine, but asks for a rule that
  // raises it when one is waiting: the rule is applied after the property level.
  levels(store,boss,{checkin_review:'routine'});
  ruleFor(store,boss,{checkin_review:{atLeast:1,level:'urgent'}});
  const raised=store.read({id:boss.id}).notifications.find(n=>n.kind==='checkin_review');
  assert.equal(raised.severity,'urgent','the rule raised it above the property level');
  assert.equal(raised.escalated,true);
  store.close();
});

test('only an administrator of that property may set its conditional rules',()=>{
  const store=open(),boss=user(store),keeper=user(store,'operations'),money=user(store,'finance'),watcher=user(store,'viewer');
  const elsewhere=user(store,'admin',['TEST-PG']);
  for(const denied of [keeper,money,watcher])
    assert.throws(()=>ruleFor(store,denied,{rooms_to_clean:{atLeast:2,level:'urgent'}}),e=>e.status===403,
      'only an administrator decides');
  assert.throws(()=>ruleFor(store,elsewhere,{rooms_to_clean:{atLeast:2,level:'urgent'}}),e=>e.status===403,
    'an administrator of another property cannot rule on this one');
  assert.equal(store.visibleNoticeRules(boss).length,0,'nothing was written by a refused attempt');
  store.db.prepare('UPDATE user_properties SET role=? WHERE user_id=? AND property_id=?').run('admin',watcher.id,'TEST-KL');
  assert.deepEqual(ruleFor(store,watcher,{rooms_to_clean:{atLeast:2,level:'urgent'}}).rules,
    {rooms_to_clean:{atLeast:2,level:'urgent'}},'a property-level admin override counts here too');
  store.close();
});

test('rule input is validated, defaults are not frozen, and the audit is append-only',()=>{
  const store=open(),boss=user(store);
  for(const bad of [
    {made_up_kind:{atLeast:1,level:'urgent'}},
    {rooms_to_clean:{atLeast:0,level:'urgent'}},
    {rooms_to_clean:{atLeast:100,level:'urgent'}},
    {rooms_to_clean:{atLeast:1.5,level:'urgent'}},
    {rooms_to_clean:{atLeast:'3',level:'urgent'}},
    {rooms_to_clean:{atLeast:2,level:'critical'}},
    {rooms_to_clean:{level:'urgent'}},
    {rooms_to_clean:'urgent'},
    ['urgent'],'urgent',null,42])
    assert.throws(()=>ruleFor(store,boss,bad),e=>e.status===400,'a rule needs a known kind, a whole threshold and a real level');
  assert.equal(store.visibleNoticeRules(boss).length,0,'nothing was stored by a refused value');
  const saved=ruleFor(store,boss,{request_waiting:'default',checkin_review:'',rooms_to_clean:{atLeast:3,level:'urgent'}});
  assert.deepEqual(saved.rules,{rooms_to_clean:{atLeast:3,level:'urgent'}},'only explicit rules are stored');
  const setting=store.visibleNoticeRules(boss)[0];
  assert.equal(setting.propertyId,'TEST-KL');
  assert.equal(setting.updatedBy,boss.id);
  const audit=store.visibleNoticeRulesAudit(boss);
  assert.equal(audit.length,1,'the change is recorded');
  assert.deepEqual(audit[0].previous,{},'what it replaced is kept');
  assert.deepEqual(audit[0].next,{rooms_to_clean:{atLeast:3,level:'urgent'}});
  assert.throws(()=>store.db.prepare("UPDATE notice_rules_audit SET summary='{}' WHERE id=?").run(audit[0].id),
    /notice_rules_audit_append_only/,'the audit cannot be rewritten');
  assert.throws(()=>store.db.prepare('DELETE FROM notice_rules_audit WHERE id=?').run(audit[0].id),
    /notice_rules_audit_append_only/,'nor deleted');
  // Clearing the rule puts that kind back on the system rule.
  ruleFor(store,boss,{rooms_to_clean:'default'});
  assert.deepEqual(store.visibleNoticeRules(boss)[0].rules,{},'nothing is configured any more');
  assert.equal(store.visibleNoticeRulesAudit(boss).length,2,'the reset is recorded too');
  store.close();
});

test('saving rules is idempotent, scoped, changes no business state and reaches the desk',()=>{
  const store=open(),boss=user(store),elsewhere=user(store,'admin',['TEST-PG']);
  publish(store,boss);
  const key=randomUUID();
  const first=ruleFor(store,boss,{rooms_to_clean:{atLeast:2,level:'urgent'}},'TEST-KL',key);
  const replay=ruleFor(store,boss,{rooms_to_clean:{atLeast:2,level:'urgent'}},'TEST-KL',key);
  assert.equal(replay.replayed,true,'the same request key answers from its receipt');
  assert.deepEqual(replay.rules,first.rules);
  assert.throws(()=>ruleFor(store,boss,{rooms_to_clean:{atLeast:3,level:'urgent'}},'TEST-KL',key),e=>e.status===409,
    'a reused key carrying a different body is refused');
  assert.deepEqual(store.visibleNoticeRules(elsewhere),[],'another property cannot read this rule');
  assert.deepEqual(store.visibleNoticeRulesAudit(elsewhere),[],'nor its audit');
  const state=store.read({id:boss.id});
  assert.equal(state.noticeRules.length,1,'the desk page is given the rule to show');
  assert.equal(state.noticeRulesAudit.length,1);
  assert.equal(state.orders.length,0,'no booking was created');
  assert.equal(state.notifications.length,0,'no notice was raised or dismissed');
  store.close();
});

test('the rule kinds, validation and escalation live in one place with the local reducer',()=>{
  assert.deepEqual(noticeRuleKinds,['rooms_to_clean','request_waiting','checkin_review']);
  assert.deepEqual(cleanNoticeRules({rooms_to_clean:{atLeast:3,level:'urgent'},request_waiting:'default'}),
    {rooms_to_clean:{atLeast:3,level:'urgent'}});
  assert.equal(cleanNoticeRules({no_show:{atLeast:1,level:'urgent'}}),null);
  assert.equal(cleanNoticeRules({rooms_to_clean:{atLeast:0,level:'urgent'}}),null);
  assert.equal(cleanNoticeRules({rooms_to_clean:{atLeast:2,level:'critical'}}),null);
  assert.equal(escalateSeverity('rooms_to_clean','routine',3,{rooms_to_clean:{atLeast:3,level:'urgent'}}),'urgent');
  assert.equal(escalateSeverity('rooms_to_clean','routine',2,{rooms_to_clean:{atLeast:3,level:'urgent'}}),'routine');
  assert.equal(escalateSeverity('rooms_to_clean','urgent',3,{rooms_to_clean:{atLeast:3,level:'routine'}}),'urgent',
    'a rule never pushes an urgent notice down');
  assert.equal(escalateSeverity('booking_request','attention',9,{rooms_to_clean:{atLeast:1,level:'urgent'}}),'attention',
    'an event with no matching rule is untouched');
  const local=seed();
  assert.deepEqual(local.noticeRules,[]);
  const updated=apply(local,{propertyId:'TEST-KL',type:'notice_rule_save',
    rules:{rooms_to_clean:{atLeast:3,level:'urgent'}},at:'2027-06-01T00:00:00.000Z',actor:'local'});
  assert.deepEqual(updated.noticeRules.find(s=>s.propertyId==='TEST-KL').rules,{rooms_to_clean:{atLeast:3,level:'urgent'}});
  assert.throws(()=>apply(local,{propertyId:'TEST-KL',type:'notice_rule_save',rules:{fake:{atLeast:1,level:'urgent'}},at:'x'}),
    'a value the server would refuse is refused locally too');
});
