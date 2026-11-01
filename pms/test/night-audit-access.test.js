import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes, randomUUID } from 'node:crypto';
import { Store } from '../server/store.js';

const password=()=>randomBytes(20).toString('hex');
function fixture(t){
 const dir=mkdtempSync(join(tmpdir(),'jovian-audit-')),path=join(dir,'test.sqlite'),store=new Store(path);
 store.seedTestProperties();t.after(()=>{try{store.close();}catch{}rmSync(dir,{recursive:true,force:true});});
 const admin=store.createUser({username:'test-admin',password:password(),role:'admin',propertyIds:['TEST-KL','TEST-PG']});
 const ops=store.createUser({username:'test-ops',password:password(),role:'operations',propertyIds:['TEST-KL']});
 return {store,path,admin,ops};
}
const execute=(store,user,command,revision=0,key=randomUUID())=>store.command(user,{command,expectedRevision:revision,key});
const forbidden=e=>e.status===403&&e.message==='forbidden';

test('only an administrator can set the opening business date',t=>{
 const {store,admin,ops}=fixture(t);
 assert.throws(()=>execute(store,ops,{type:'business_date_init',propertyId:'TEST-KL',date:'2027-01-10'}),forbidden);
 const result=execute(store,admin,{type:'business_date_init',propertyId:'TEST-KL',date:'2027-01-10'});
 assert.equal(result.propertyId,'TEST-KL');
 assert.equal(store.read(admin).businessDates['TEST-KL'],'2027-01-10');
 assert.equal(store.read(admin).businessDates['TEST-PG'],null,'the other property is untouched');
});

test('business date and audit history survive closing and reopening the database',t=>{
 const {store,path,admin}=fixture(t);
 execute(store,admin,{type:'business_date_init',propertyId:'TEST-KL',date:'2027-01-10'});
 execute(store,admin,{type:'night_audit',propertyId:'TEST-KL'},1);
 const reader=new Store(path);
 try{
  const state=reader.read(admin);
  assert.equal(state.businessDates['TEST-KL'],'2027-01-11');
  assert.equal(state.nightAudits.length,1);
  assert.equal(state.nightAudits[0].businessDate,'2027-01-10');
  assert.equal(state.nightAudits[0].actor,'test-admin');
 }finally{reader.close();}
});

test('operations may run an audit but cannot override an audited night',t=>{
 const {store,admin,ops}=fixture(t);
 execute(store,admin,{type:'business_date_init',propertyId:'TEST-KL',date:'2027-01-10'});
 execute(store,admin,{type:'shift_save',propertyId:'TEST-KL',name:'Morning',start:'07:00',end:'15:00'},1);
 // An in-house stay spanning the audited night: checked in, so it raises no arrival exception.
 const order=execute(store,admin,{type:'create',propertyId:'TEST-KL',guest:'TEST Audit Guest',productId:'room',gender:'any',start:'2027-01-09',end:'2027-01-12',nightly:10000},2);
 execute(store,admin,{type:'assign',propertyId:'TEST-KL',orderId:order.id,resourceId:'TEST-KL-R1'},3);
 execute(store,admin,{type:'checkin',propertyId:'TEST-KL',orderId:order.id,date:'2027-01-10'},4);
 assert.throws(()=>execute(store,ops,{type:'business_date_init',propertyId:'TEST-KL',date:'2027-01-11'},5),forbidden);
 execute(store,ops,{type:'night_audit',propertyId:'TEST-KL'},5);
 const audited=execute(store,ops,{type:'night_audit',propertyId:'TEST-KL'},6);
 assert.equal(audited.revision,7);
 assert.equal(store.read(admin).businessDates['TEST-KL'],'2027-01-12');
 // The stay started on an audited night, so a rewrite needs the administrator override.
 assert.throws(()=>execute(store,ops,{type:'edit',propertyId:'TEST-KL',orderId:order.id,guest:'TEST Audit Guest',
  start:'2027-01-09',end:'2027-01-13',nightly:10000,source:'direct',auditOverride:true},7),forbidden);
 assert.throws(()=>execute(store,ops,{type:'edit',propertyId:'TEST-KL',orderId:order.id,guest:'TEST Audit Guest',
  start:'2027-01-09',end:'2027-01-13',nightly:10000,source:'direct'},7),e=>e.status===400&&e.message==='audited');
 const overridden=execute(store,admin,{type:'edit',propertyId:'TEST-KL',orderId:order.id,guest:'TEST Audit Guest',
  start:'2027-01-09',end:'2027-01-13',nightly:10000,source:'direct',auditOverride:true},7);
 assert.equal(overridden.revision,8);
 assert.equal(store.read(admin).orders.find(o=>o.id===order.id).end,'2027-01-13');
});

test('shift configuration is administrator-only while handover is available to operations',t=>{
 const {store,admin,ops}=fixture(t);
 execute(store,admin,{type:'business_date_init',propertyId:'TEST-KL',date:'2027-01-10'});
 assert.throws(()=>execute(store,ops,{type:'shift_save',propertyId:'TEST-KL',name:'Morning',start:'07:00',end:'15:00'},1),forbidden);
 execute(store,admin,{type:'shift_save',propertyId:'TEST-KL',name:'Morning',start:'07:00',end:'15:00'},1);
 const handed=execute(store,ops,{type:'shift_handover',propertyId:'TEST-KL',shiftTypeId:'shift-morning',
  from:'2027-01-10T07:00:00.000Z',to:'2027-01-10T15:00:00.000Z',note:''},2);
 assert.equal(handed.revision,3);
 const state=store.read(admin);
 assert.equal(state.handovers.length,1);
 assert.equal(state.handovers[0].actor,'test-ops');
 assert.equal(state.shiftTypes.length,1);
});

test('cross-property audit commands stay scoped to the authorized property',t=>{
 const {store,admin}=fixture(t);
 execute(store,admin,{type:'business_date_init',propertyId:'TEST-KL',date:'2027-01-10'});
 execute(store,admin,{type:'night_audit',propertyId:'TEST-KL'},1);
 const state=store.read(admin);
 assert.equal(state.businessDates['TEST-KL'],'2027-01-11');
 assert.equal(state.businessDates['TEST-PG'],null);
 assert.equal(state.nightAudits.filter(a=>a.propertyId==='TEST-PG').length,0);
});

test('the durable audit keeps who acted and what the stay looked like before and after',t=>{
 const {store,admin}=fixture(t);
 const created=execute(store,admin,{propertyId:'TEST-KL',type:'create',guest:'TEST moved',productId:'room',gender:'any',start:'2027-02-01',end:'2027-02-04',nightly:10000});
 execute(store,admin,{propertyId:'TEST-KL',type:'assign',orderId:created.id,resourceId:'TEST-KL-R3'},1);
 execute(store,admin,{propertyId:'TEST-KL',type:'edit',orderId:created.id,guest:'TEST moved',start:'2027-02-01',end:'2027-02-03',nightly:10000,source:'direct',notes:''},2);
 const entries=store.read(admin).audit.filter(a=>a.orderId===created.id);
 const byType=Object.fromEntries(entries.map(a=>[a.type,a]));
 assert.equal(byType.assign.stayChange.before.resourceId,null,'the stay had no unit before it was assigned');
 assert.equal(byType.assign.stayChange.after.resourceId,'TEST-KL-R3');
 assert.equal(byType.edit.stayChange.before.end,'2027-02-04','the departure date before the edit is kept');
 assert.equal(byType.edit.stayChange.after.end,'2027-02-03','and so is the one after it');
 assert.equal(byType.create.stayChange.before,null,'a new stay has no earlier state');
 assert.equal(byType.create.stayChange.after.end,'2027-02-04');
 assert.equal(byType.edit.actor,'test-admin','who made the change is recorded on the durable audit');
});
