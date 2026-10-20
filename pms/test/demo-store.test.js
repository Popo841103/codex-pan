import test from 'node:test';
import assert from 'node:assert/strict';
import { seed, apply } from '../src/demo-store.js';
const cmd = (type, extra={})=>({type,propertyId:'TEST-KL',at:'2027-01-10T08:00:00Z',date:'2027-01-10',...extra});
const create = (s,id='one')=>apply(s,cmd('create',{id,guest:'TEST Guest',productId:'bed',gender:'female',start:'2027-01-10',end:'2027-01-12'}));
test('order, allocation, check-in, move, checkout and cleaning',()=>{
 let s=create(seed());
 s=apply(s,cmd('assign',{orderId:'one',resourceId:'TEST-KL-B1'}));
 s=apply(s,cmd('checkin',{orderId:'one'}));
 s=apply(s,cmd('assign',{orderId:'one',resourceId:'TEST-KL-B2'}));
 assert.equal(s.resources.find(r=>r.id==='TEST-KL-B1').cleaning,'dirty');
 assert.equal(s.orders[0].history.length,2);
 s=apply(s,cmd('checkout',{orderId:'one',date:'2027-01-12'}));
 assert.equal(s.orders[0].status,'checked_out');
 assert.equal(s.resources.find(r=>r.id==='TEST-KL-B2').cleaning,'dirty');
 s=apply(s,cmd('clean',{resourceId:'TEST-KL-B2'}));
 assert.equal(s.resources.find(r=>r.id==='TEST-KL-B2').cleaning,'clean');
 assert.equal(s.audit.length,6);
});
test('invalid move is atomic and preserves old assignment',()=>{
 let s=create(seed());s=apply(s,cmd('assign',{orderId:'one',resourceId:'TEST-KL-B1'}));
 const before=JSON.stringify(s);
 assert.throws(()=>apply(s,cmd('assign',{orderId:'one',resourceId:'TEST-KL-B13'})));
 assert.equal(JSON.stringify(s),before);
});
test('cross-store writes rejected, check-in requires allocation and date',()=>{
 const s=create(seed());
 assert.throws(()=>apply(s,cmd('assign',{orderId:'one',resourceId:'TEST-PG-B1'})));
 assert.throws(()=>apply(s,cmd('checkin',{orderId:'one'})));
 const assigned=apply(s,cmd('assign',{orderId:'one',resourceId:'TEST-KL-B1'}));
 assert.throws(()=>apply(assigned,cmd('checkin',{orderId:'one',date:'2027-01-09'})));
});
test('maintenance cannot displace fixed reservation; dirty target cannot check in',()=>{
 let s=create(seed());s=apply(s,cmd('assign',{orderId:'one',resourceId:'TEST-KL-B1'}));
 assert.throws(()=>apply(s,cmd('block',{id:'block',resourceId:'TEST-KL-B1',start:'2027-01-10',end:'2027-01-11'})));
 s.resources.find(r=>r.id==='TEST-KL-B1').cleaning='dirty';
 assert.throws(()=>apply(s,cmd('checkin',{orderId:'one'})));
});
test('same physical resource cannot host two currently checked-in guests',()=>{
 let s=create(seed());s=apply(s,cmd('assign',{orderId:'one',resourceId:'TEST-KL-B1'}));s=apply(s,cmd('checkin',{orderId:'one'}));
 s=apply(s,cmd('create',{id:'two',guest:'TEST next',productId:'bed',gender:'female',start:'2027-01-12',end:'2027-01-13'}));
 s=apply(s,cmd('assign',{orderId:'two',resourceId:'TEST-KL-B1'}));
 assert.throws(()=>apply(s,cmd('checkin',{orderId:'two',date:'2027-01-12'})));
});
