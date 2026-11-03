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
