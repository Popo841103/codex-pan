import test from 'node:test';
import assert from 'node:assert/strict';
import {seed,apply,folio,preview} from '../src/demo-store.js';
import {dailyOperations} from '../src/financial-reports.js';
const propertyId='TEST-KL',at='2027-04-02T03:00:00Z';let seq=0;
const send=(s,type,extra={})=>apply(s,{propertyId,id:'walk-'+(++seq),at,date:'2027-04-02',type,...extra});
function checkedIn(){let s=send(seed(),'business_date_init',{date:'2027-04-02'});s=send(s,'create',{id:'walk-stay',guest:'Synthetic early',productId:'room',gender:'any',resourceId:'TEST-KL-R1',start:'2027-04-01',end:'2027-04-03',nightly:10000});return send(s,'checkin',{orderId:'walk-stay',date:'2027-04-01'});}
test('early checkout explicitly keeps total, shortens stay, recognizes retained fee and releases dirty room',()=>{
 let s=checkedIn();s=send(s,'payment',{orderId:'walk-stay',kind:'payment',amount:20000,method:'cash'});
 assert.throws(()=>send(s,'checkout',{orderId:'walk-stay'}),/early_checkout/);
 s=send(s,'checkout',{orderId:'walk-stay',confirmed:true,earlyChoice:'keep'});
 const o=s.orders[0];assert.equal(o.end,'2027-04-02');assert.equal(o.status,'checked_out');assert.equal(folio(o).charge,20000);assert.equal(folio(o).due,0);assert.equal(s.resources.find(r=>r.id===o.resourceId).cleaning,'dirty');
 assert.equal(dailyOperations(s,{propertyId,date:'2027-04-01'}).charges.room,20000);
});
test('recompute early checkout requires refund first and cannot bypass audited or split folios',()=>{
 let s=checkedIn();s=send(s,'payment',{orderId:'walk-stay',kind:'payment',amount:20000,method:'cash'});
 assert.throws(()=>send(s,'checkout',{orderId:'walk-stay',confirmed:true,earlyChoice:'recompute'}),/balance/);
 s=send(s,'payment',{orderId:'walk-stay',kind:'refund',amount:10000,method:'cash'});
 s=send(s,'checkout',{orderId:'walk-stay',confirmed:true,earlyChoice:'recompute'});assert.equal(folio(s.orders[0]).charge,10000);assert.equal(folio(s.orders[0]).due,0);
 let locked=checkedIn();locked.nightAudits=[{businessDate:'2027-04-01',at}];assert.throws(()=>send(locked,'checkout',{orderId:'walk-stay',confirmed:true,earlyChoice:'keep'}),/audited/);
});

test('room move from a chosen night preserves first allocation, one folio and audit segments',()=>{
 let s=checkedIn();const before=folio(s.orders[0]);
 s=send(s,'assign',{orderId:'walk-stay',resourceId:'TEST-KL-R2',fromDate:'2027-04-02',reason:'Synthetic chosen night'});
 const o=s.orders[0];assert.deepEqual(o.roomSegments,[{start:'2027-04-01',end:'2027-04-02',resourceId:'TEST-KL-R1'},{start:'2027-04-02',end:'2027-04-03',resourceId:'TEST-KL-R2'}]);
 assert.deepEqual(preview(s,propertyId).map(p=>[p.resourceId,p.start,p.end]),[['TEST-KL-R1','2027-04-01','2027-04-02'],['TEST-KL-R2','2027-04-02','2027-04-03']]);
 assert.deepEqual(folio(o),before);assert.equal(s.orders.length,1);assert.equal(s.audit[0].stayChange.after.roomSegments.length,2);
 assert.throws(()=>send(s,'assign',{orderId:'walk-stay',resourceId:'TEST-KL-R1',fromDate:'2027-04-03',reason:'invalid'}),/date/);
});

test('in-house future move is refused until the chosen operating day, preserving cleaning',()=>{
 const s=checkedIn();assert.throws(()=>send(s,'assign',{date:'2027-04-01',orderId:'walk-stay',resourceId:'TEST-KL-R2',fromDate:'2027-04-02',reason:'Synthetic tomorrow move'}),/future_room_move/);
 assert.equal(s.resources.find(r=>r.id==='TEST-KL-R1').cleaning,'clean');assert.equal(s.orders[0].resourceId,'TEST-KL-R1');
});
