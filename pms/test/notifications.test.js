import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Store } from '../server/store.js';

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
