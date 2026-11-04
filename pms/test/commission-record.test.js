import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {Store} from '../server/store.js';
import {apply} from '../src/demo-store.js';
import {commissionDetail} from '../src/financial-reports.js';
const pid='TEST-KL',day='2027-01-10',end='2027-01-12';
const req=(type,command={},revision=0,key=randomUUID())=>({key,expectedRevision:revision,command:{type,propertyId:pid,...command}});
function fixture(){
 const store=new Store(':memory:');store.seedTestProperties();
 const user=role=>store.createUser({username:'test-com-'+role+'-'+randomUUID().slice(0,6),password:'test-password-only',role,propertyIds:[pid]});
 const admin=user('admin'),finance=user('finance'),ops=user('operations'),viewer=user('viewer');
 const parent=store.command(ops,req('create_reservation',{date:day,guest:'TEST channel guest',bookingKind:'individual',source:'booking',channelOrderId:'CH-1',mode:'reserve',autoAssign:true,stays:[{productId:'room',roomTypeId:'TEST-KL-legacy-room-any',gender:'any',start:day,end,nightly:10000,adults:1,children:0,infants:0,occupants:[{name:'TEST guest',gender:'any'}]}]}));
 const order=store.read(ops).orders.find(o=>o.reservationId===parent.id);
 return {store,admin,finance,ops,viewer,order};
}
const rev=f=>f.store.read(f.ops).revisions[pid];
const save=(f,actor,command={})=>f.store.command(actor,req('commission_save',{orderId:f.order.id,...command},rev(f)));
const orderOf=f=>f.store.read(f.ops).orders.find(o=>o.id===f.order.id);
const detail=f=>commissionDetail(f.store.read(f.ops),{propertyId:pid,from:day,to:day});

test('a stay with no recorded commission stays empty rather than printing a zero',()=>{
 const f=fixture();try{
  const d=detail(f);
  assert.equal(d.rows.length,1);
  assert.equal(d.rows[0].commission,null);
  assert.equal(d.rows[0].commissionRecorded,false);
  assert.equal(d.rows[0].settlement,'unrecorded');
  assert.equal(d.totals.commission,null,'the total is empty, not zero');
  assert.equal(d.recorded,0);assert.equal(d.unrecorded,1);
  assert.equal(d.channels[0].commission,null);
 }finally{f.store.close();}
});
test('finance records the invoiced amount and the report reads it back',()=>{
 const f=fixture();try{
  const result=save(f,f.finance,{amount:1234,reference:'INV-42',note:'Booking.com statement',settled:false});
  assert.equal(typeof result.revision,'number');
  const c=orderOf(f).commission;
  assert.equal(c.amount,1234);assert.equal(c.reference,'INV-42');
  assert.equal(c.note,'Booking.com statement');assert.equal(c.settledAt,null);
  const d=detail(f);
  assert.equal(d.rows[0].commission,1234);
  assert.equal(d.rows[0].commissionRecorded,true);
  assert.equal(d.rows[0].settlement,'recorded');
  assert.equal(d.rows[0].commissionReference,'INV-42');
  assert.equal(d.totals.commission,1234);
  assert.equal(d.recorded,1);assert.equal(d.unrecorded,0);
  assert.equal(d.channels[0].commission,1234);
 }finally{f.store.close();}
});
test('settlement state and corrections are audited, and the report follows the latest',()=>{
 const f=fixture();try{
  save(f,f.finance,{amount:1234,reference:'INV-42',note:'',settled:false});
  const first=f.store.read(f.ops).audit.filter(a=>a.type==='commission_save');
  assert.equal(first.length,1);
  assert.equal(first[0].commissionChange.before,null);
  assert.equal(first[0].commissionChange.after.amount,1234);
  save(f,f.finance,{amount:1500,reference:'INV-42-revised',note:'',settled:true});
  const c=orderOf(f).commission;
  assert.equal(c.amount,1500);assert.equal(c.reference,'INV-42-revised');
  assert(c.settledAt);assert(c.settledBy);
  const d=detail(f);
  assert.equal(d.rows[0].commission,1500);
  assert.equal(d.rows[0].settlement,'settled');
  assert.equal(d.channels[0].settled,1);
  const audits=f.store.read(f.ops).audit.filter(a=>a.type==='commission_save');
  assert.equal(audits.length,2);
  const correction=audits.find(a=>a.commissionChange.before?.amount===1234);
  assert(correction,'the previous figure is kept in the audit');
  assert.equal(correction.commissionChange.after.amount,1500);
 }finally{f.store.close();}
});
test('only admin and finance may record a commission, and a failed attempt writes nothing',()=>{
 const f=fixture();try{
  assert.throws(()=>save(f,f.ops,{amount:1,reference:'X',settled:false}),/forbidden/);
  assert.throws(()=>save(f,f.viewer,{amount:1,reference:'X',settled:false}),/forbidden/);
  assert.equal(orderOf(f).commission,undefined);
  const result=save(f,f.admin,{amount:500,reference:'X',settled:false});
  assert(result.revision>0);
  assert.equal(orderOf(f).commission.amount,500);
 }finally{f.store.close();}
});
test('invalid amounts, references, notes and settlement flags are refused',()=>{
 const cases=[
  {amount:-1,reference:'X',settled:false},
  {amount:1.5,reference:'X',settled:false},
  {amount:100000001,reference:'X',settled:false},
  {amount:1,reference:'   ',settled:false},
  {amount:1,reference:'X'.repeat(101),settled:false},
  {amount:1,reference:'X',settled:'yes'},
  {amount:1,reference:'X',settled:false,note:'X'.repeat(501)}
 ];
 for(const c of cases){const f=fixture();try{
   assert.throws(()=>save(f,f.finance,c),/commission_input/,JSON.stringify(c));
   assert.equal(orderOf(f).commission,undefined);
   assert.equal(detail(f).totals.commission,null);
  }finally{f.store.close();}}
});
test('a missing order is refused, and recording a commission never changes the charge or the money received',()=>{
 const f=fixture();try{
  assert.throws(()=>f.store.command(f.finance,req('commission_save',{orderId:'no-such-order',amount:1,reference:'X',settled:false},rev(f))),/scope/);
  const before=detail(f),beforeOrder=orderOf(f);
  save(f,f.finance,{amount:999,reference:'INV',settled:true});
  const after=detail(f),afterOrder=orderOf(f);
  assert.equal(after.rows[0].charge,before.rows[0].charge);
  assert.equal(after.rows[0].paid,before.rows[0].paid);
  assert.equal(after.rows[0].outstanding,before.rows[0].outstanding);
  assert.equal(afterOrder.status,beforeOrder.status);
  assert.equal(afterOrder.nightly,beforeOrder.nightly);
  assert.deepEqual(afterOrder.transactions,beforeOrder.transactions);
 }finally{f.store.close();}
});
test('two channels are bucketed separately and only recorded stays are summed',()=>{
 const f=fixture();try{
  f.store.command(f.ops,req('create_reservation',{date:day,guest:'TEST direct guest',bookingKind:'individual',source:'direct',mode:'reserve',autoAssign:true,stays:[{productId:'room',roomTypeId:'TEST-KL-legacy-room-any',gender:'any',start:day,end,nightly:8000,adults:1,children:0,infants:0,occupants:[{name:'TEST guest 2',gender:'any'}]}]},rev(f)));
  save(f,f.finance,{amount:1234,reference:'INV-42',settled:true});
  const d=detail(f);
  assert.equal(d.rows.length,2);
  assert.equal(d.totals.commission,1234,'only the recorded stay contributes');
  assert.equal(d.recorded,1);assert.equal(d.unrecorded,1);
  const booking=d.channels.find(c=>c.source==='booking'),direct=d.channels.find(c=>c.source==='direct');
  assert.equal(booking.commission,1234);assert.equal(booking.settled,1);
  assert.equal(direct.commission,null);assert.equal(direct.unrecorded,1);
 }finally{f.store.close();}
});
test('the local reducer applies the same validation and keeps the shared order shape',()=>{
 const f=fixture();try{
  const state=f.store.read(f.ops);
  const next=apply(state,{type:'commission_save',propertyId:pid,orderId:f.order.id,amount:777,reference:'LOC-1',note:'',settled:false,at:'2027-01-10T00:00:00Z',actor:'local'});
  assert.equal(next.orders.find(o=>o.id===f.order.id).commission.amount,777);
  assert.equal(next.orders.find(o=>o.id===f.order.id).commission.settledAt,null);
  assert.throws(()=>apply(state,{type:'commission_save',propertyId:pid,orderId:f.order.id,amount:-1,reference:'X',settled:false,at:'2027-01-10T00:00:00Z'}),/commission_input/);
  assert.throws(()=>apply(state,{type:'commission_save',propertyId:pid,orderId:f.order.id,amount:1,reference:'',settled:false,at:'2027-01-10T00:00:00Z'}),/commission_input/);
 }finally{f.store.close();}
});
test('the local reducer audit keeps both sides of a commission correction, like the shared backend',()=>{
 const f=fixture();try{
  const state=f.store.read(f.ops);
  const first=apply(state,{type:'commission_save',propertyId:pid,orderId:f.order.id,amount:1234,reference:'INV-1',note:'',settled:false,at:'2027-01-10T00:00:00Z',actor:'finance'});
  const second=apply(first,{type:'commission_save',propertyId:pid,orderId:f.order.id,amount:1500,reference:'INV-1-rev',note:'',settled:true,at:'2027-01-11T00:00:00Z',actor:'finance'});
  const rows=second.audit.filter(a=>a.type==='commission_save');
  assert.equal(rows.length,2);
  assert.equal(rows[0].commissionChange.before.amount,1234,'the overwritten figure stays on the record');
  assert.equal(rows[0].commissionChange.after.amount,1500);
  assert.equal(rows[0].commissionChange.after.reference,'INV-1-rev');
  assert.equal(rows[0].commissionChange.after.settledAt,'2027-01-11T00:00:00Z');
  assert.equal(rows[1].commissionChange.before,null,'a first entry has no earlier commission');
  assert.equal(rows[1].commissionChange.after.reference,'INV-1');
  assert.equal(rows[1].propertyId,pid);
  assert.equal(rows[1].actor,'finance');
  assert.equal(rows[1].orderId,f.order.id);
 }finally{f.store.close();}
});
