
import test from 'node:test';
import assert from 'node:assert/strict';
import {apply, seed, folio} from '../src/demo-store.js';
const propertyId='TEST-KL';
const send=(s,id,type,extra={})=>apply(s,{id,type,propertyId,at:'2027-01-02T05:00:00Z',actor:'TEST',...extra});
function fixture(){
 let s={...seed(),businessDate:'2027-01-02'};
 s=send(s,'a','ar_account_save',{name:'TEST Company'});
 s=send(s,'b','ar_account_save',{name:'TEST Other'});
 for(const id of ['stay1','stay2']) s=send(s,id,'create',{guest:'TEST',productId:'room',gender:'any',start:'2027-01-01',end:'2027-01-02',nightly:10000});
 return s;
}
test('AR post, FIFO receipt, transfer and reversal conserve value without creating folio receipts',()=>{
 let s=fixture();
 s=send(s,'later','ar_post',{orderId:'stay1',accountId:'a',dueDate:'2027-02-01'});
 s=send(s,'earlier','ar_post',{orderId:'stay2',accountId:'a',dueDate:'2027-01-15'});
 assert.equal(folio(s.orders[0]).due,0);
 assert.equal(folio(s.orders[0]).paid,0);
 assert.equal(s.orders[0].folioClosed,true);
 s=send(s,'receipt','ar_write_off',{accountId:'a',amount:12000,method:'cash',reference:'TEST receipt'});
 assert.deepEqual(s.arEvents.at(-1).allocations,[{itemId:'earlier',amount:10000},{itemId:'later',amount:2000}]);
 assert.throws(()=>send(s,'move','ar_transfer',{accountId:'a',targetId:'b',itemId:'later',reason:'Correction'}),/ar_state/);
 s=send(s,'reverse','ar_undo_write_off',{accountId:'a',receiptId:'receipt',reason:'Correction'});
 s=send(s,'move','ar_transfer',{accountId:'a',targetId:'b',itemId:'later',reason:'Correction'});
 assert.equal(s.arItems.find(x=>x.id==='later').accountId,'b');
 s=send(s,'undo','ar_undo_post',{accountId:'b',itemId:'later',reason:'Correction'});
 assert.equal(folio(s.orders[0]).due,10000);
 assert.equal(s.orders[0].folioClosed,false);
 assert.equal(s.arEvents.find(x=>x.id==='receipt').amount,12000);
 assert.equal(s.orders.flatMap(o=>o.transactions).length,0);
});

import {Store} from '../server/store.js';
import {orderBalanceAt,dailyOperations} from '../src/financial-reports.js';
test('shared AR posts once, gates ledger reads by role and reconciles historical guest balances',()=>{
 const store=new Store(':memory:');
 try{
   store.seedTestProperties();
   const user=role=>store.createUser({username:'ar-test-'+role,password:'TEST-only-password',role,propertyIds:[propertyId]});
   const admin=user('admin'),finance=user('finance'),operations=user('operations');
   const send=(u,key,expectedRevision,command)=>store.command(u,{key,expectedRevision,command:{...command,propertyId}});
   send(admin,'ar-init-000',0,{type:'business_date_init',date:'2027-01-02'});
   const order=send(admin,'ar-stay-000',1,{type:'create',guest:'TEST',productId:'room',gender:'any',start:'2027-01-01',end:'2027-01-02',nightly:10000});
   const account=send(finance,'ar-account-000',2,{type:'ar_account_save',name:'TEST Company'});
   const post={type:'ar_post',accountId:account.id,orderId:order.id,dueDate:'2027-01-15'};
   assert.throws(()=>send(operations,'ar-post-no',3,post),/forbidden/);
   send(finance,'ar-post-000',3,post);
   assert.equal(send(finance,'ar-post-000',3,post).replayed,true);
   assert.throws(()=>send(finance,'ar-post-stale',3,post),/stale_revision/);
   assert.equal(store.read(operations).arAccounts.length,0);
   const state=store.read(finance);
   assert.equal(state.arItems.length,1);
   assert.equal(orderBalanceAt(state.orders[0],'2027-01-01').due,10000);
   assert.equal(orderBalanceAt(state.orders[0],'2027-01-02').due,0);
   assert.equal(dailyOperations(state,{propertyId,date:'2027-01-02'}).balanced,true);
 }finally{store.close();}
});
test('manual receipt refuses duplicates, foreign items and over-allocations atomically',()=>{
 let s=fixture();
 s=send(s,'item','ar_post',{orderId:'stay1',accountId:'a',dueDate:'2027-02-01'});
 const before=JSON.stringify(s);
 for(const allocations of [[{itemId:'other',amount:300}], [{itemId:'item',amount:10001}], [{itemId:'item',amount:200},{itemId:'item',amount:100}]])
   assert.throws(()=>send(s,'bad','ar_write_off',{accountId:'a',method:'cash',amount:300,allocations}),/ar_state|ar_input/);
 assert.equal(JSON.stringify(s),before);
 s=send(s,'custom','ar_write_off',{accountId:'a',method:'cash',amount:300,allocations:[{itemId:'item',amount:300}]});
 assert.equal(s.arItems[0].open,9700);
});

import {shiftSummary} from '../src/demo-store.js';
test('cash AR receipts and reversals enter the drawer separately from accommodation receipts',()=>{
 let s=fixture();
 s=send(s,'item','ar_post',{orderId:'stay1',accountId:'a',dueDate:'2027-02-01'});
 s=send(s,'receipt','ar_write_off',{accountId:'a',amount:7000,method:'cash'});
 s=send(s,'bank','ar_write_off',{accountId:'a',amount:3000,method:'bank'});
 const window={from:'2027-01-02T00:00:00Z',to:'2027-01-03T00:00:00Z',propertyId};
 assert.equal(shiftSummary(s,window).net,0);
 assert.equal(shiftSummary(s,window).arNet,10000);
 assert.equal(shiftSummary(s,window).cashExpectedTotal,7000);
 s=send(s,'undo','ar_undo_write_off',{accountId:'a',receiptId:'receipt',reason:'Correction'});
 assert.equal(shiftSummary(s,window).cashExpectedTotal,0);
 assert.equal(shiftSummary(s,window).arNet,3000);
});

test('month close snapshots open AR, rejects an active month and never rewrites a prior close',()=>{
 let s=fixture();
 s=send(s,'post','ar_post',{orderId:'stay1',accountId:'a',dueDate:'2027-01-20'});
 assert.throws(()=>send(s,'early','ar_close_month',{month:'2027-01'}),/ar_period/);
 s={...s,businessDate:'2027-02-01'};
 s=send(s,'close','ar_close_month',{month:'2027-01'});
 const frozen=JSON.stringify(s.arPeriods[0]);
 assert.equal(s.arPeriods[0].balances.find(a=>a.accountId==='a').closing,10000);
 assert.throws(()=>send(s,'again','ar_close_month',{month:'2027-01'}),/ar_period/);
 assert.throws(()=>send({...s,businessDate:'2027-01-31'},'late','ar_write_off',{accountId:'a',method:'cash',amount:1000}),/ar_period/);
 s=send(s,'later','ar_write_off',{accountId:'a',method:'cash',amount:1000});
 assert.equal(JSON.stringify(s.arPeriods[0]),frozen);
 assert.equal(s.arItems[0].open,9000);
});

test('shared month close is authorized, scoped and idempotent',()=>{
 const store=new Store(':memory:');
 try{
   store.seedTestProperties();
   const user=(role,propertyIds)=>store.createUser({username:'close-month-'+role,password:'TEST-only-password',role,propertyIds});
   const admin=user('admin',[propertyId]),finance=user('finance',[propertyId]),viewer=user('viewer',[propertyId]);
   const run=(u,key,expectedRevision,command)=>store.command(u,{key,expectedRevision,command:{...command,propertyId}});
   run(admin,'ar-close-init',0,{type:'business_date_init',date:'2027-02-01'});
   const close={type:'ar_close_month',month:'2027-01'};
   assert.throws(()=>run(finance,'ar-close-no',1,close),/forbidden/);
   run(admin,'ar-close-one',1,close);
   assert.equal(run(admin,'ar-close-one',1,close).replayed,true);
   assert.equal(store.read(finance).arPeriods.length,1);
   assert.equal(store.read(viewer).arPeriods.length,0);
   assert.equal(store.read(admin).audit[0].arPeriod.month,'2027-01');
 }finally{store.close();}
});
