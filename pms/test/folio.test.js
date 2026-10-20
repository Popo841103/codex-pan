import test from 'node:test';
import assert from 'node:assert/strict';
import { seed, apply, folio } from '../src/demo-store.js';
const command=(type,extra={})=>({type,propertyId:'TEST-KL',id:crypto.randomUUID(),at:'2027-01-10T08:00:00Z',date:'2027-01-10',...extra});
const start=()=>apply(seed(),command('create',{id:'one',guest:'TEST Finance',productId:'room',gender:'any',start:'2027-01-10',end:'2027-01-12',nightly:12345,source:'direct'}));
const change=(s,type,extra={})=>apply(s,command(type,{orderId:'one',...extra}));
test('money uses integer cents; room charges and deposits remain separate',()=>{
 let s=start();assert.equal(folio(s.orders[0]).charge,24690);
 s=change(s,'payment',{kind:'payment',amount:10000,method:'bank'});
 s=change(s,'payment',{kind:'deposit_in',amount:5000,method:'cash'});
 assert.deepEqual(folio(s.orders[0]),{nights:2,charge:24690,paid:10000,due:14690,deposit:5000});
});
test('refunds cannot exceed net receipts, deposit return cannot exceed balance',()=>{
 let s=start();s=change(s,'payment',{kind:'payment',amount:1000,method:'cash'});
 s=change(s,'payment',{kind:'refund',amount:400,method:'cash'});
 const before=JSON.stringify(s);
 assert.throws(()=>change(s,'payment',{kind:'refund',amount:601,method:'cash'}));
 assert.throws(()=>change(s,'payment',{kind:'deposit_out',amount:1,method:'cash'}));
 assert.throws(()=>change(s,'payment',{kind:'payment',amount:0.1,method:'cash'}));
 assert.equal(JSON.stringify(s),before);
});
test('cancel releases inventory without inventing a refund',()=>{
 let s=start();s=change(s,'payment',{kind:'payment',amount:10000,method:'cash'});
 s=change(s,'cancel',{reason:'TEST cancellation',finalCharge:3000});
 assert.equal(s.orders[0].status,'cancelled');
 assert.equal(folio(s.orders[0]).due,-7000);
 s=change(s,'payment',{kind:'refund',amount:7000,method:'cash'});
 assert.equal(folio(s.orders[0]).due,0);
 assert.throws(()=>change(s,'checkin'));
});
test('extension revalidates inventory and price, conflict preserves existing stay',()=>{
 let s=start();s=change(s,'assign',{resourceId:'TEST-KL-R1'});
 s=apply(s,command('create',{id:'two',guest:'TEST Next',productId:'room',gender:'any',start:'2027-01-12',end:'2027-01-13',resourceId:'TEST-KL-R1'}));
 const before=JSON.stringify(s);
 assert.throws(()=>change(s,'edit',{guest:'TEST Finance',start:'2027-01-10',end:'2027-01-13',nightly:12345,source:'direct'}));
 assert.equal(JSON.stringify(s),before);
 s=change(s,'edit',{guest:'TEST Finance',start:'2027-01-10',end:'2027-01-11',nightly:12345,source:'direct'});
 assert.equal(folio(s.orders[0]).charge,12345);
});
test('locked room cannot be moved until explicitly unlocked',()=>{
 let s=start();s=change(s,'assign',{resourceId:'TEST-KL-R1'});s=change(s,'lock');
 assert.throws(()=>change(s,'assign',{resourceId:'TEST-KL-R2'}));
 s=change(s,'lock');s=change(s,'assign',{resourceId:'TEST-KL-R2'});
 assert.equal(s.orders[0].resourceId,'TEST-KL-R2');
});
test('checkout requires resolved room balance and deposit',()=>{
 let s=start();s=change(s,'assign',{resourceId:'TEST-KL-R1'});s=change(s,'checkin');
 assert.throws(()=>change(s,'checkout',{date:'2027-01-12'}));
 s=change(s,'payment',{kind:'payment',amount:24690,method:'cash'});
 s=change(s,'payment',{kind:'deposit_in',amount:5000,method:'cash'});
 assert.throws(()=>change(s,'checkout',{date:'2027-01-12'}));
 s=change(s,'payment',{kind:'deposit_out',amount:5000,method:'cash'});
 s=change(s,'checkout',{date:'2027-01-12'});
 assert.equal(s.orders[0].status,'checked_out');
});
