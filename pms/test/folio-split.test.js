import test from 'node:test';import assert from 'node:assert/strict';import {seed,apply} from '../src/demo-store.js';
const c=(type,x={})=>({type,propertyId:'TEST-KL',id:'TEST-'+type,date:'2027-01-01',at:'2027-01-01T10:00:00Z',actor:'TEST',...x});const initial=()=>apply(seed(),c('create',{id:'TEST-order',guest:'TEST',productId:'room',gender:'any',start:'2027-01-01',end:'2027-01-02',nightly:10000}));
test('split preserves value, settles each bill independently and links a reversal',()=>{
 let s=apply(initial(),c('payment',{orderId:'TEST-order',kind:'payment',amount:10000,method:'cash'}));
 const command=c('settle_split',{orderId:'TEST-order',bills:[{label:'A',charge:4000,paid:4000},{label:'B',charge:6000,paid:6000}]});
 assert.throws(()=>apply(s,{...command,bills:[{label:'A',charge:4000,paid:4000},{label:'B',charge:5000,paid:6000}]}),/bill_total/);
 s=apply(s,command);
 const [a,b]=s.orders[0].splitBills;
 s=apply(s,c('settle_bill',{id:'close-a',orderId:'TEST-order',billId:a.id}));
 assert.equal(s.orders[0].folioClosed,false);
 s=apply(s,c('settle_bill',{id:'close-b',orderId:'TEST-order',billId:b.id}));
 assert.equal(s.orders[0].folioClosed,true);
 s=apply(s,c('settle_undo',{id:'undo-a',orderId:'TEST-order',billId:a.id,reason:'Correction'}));
 assert.equal(s.orders[0].folioClosed,false);
 assert.equal(s.orders[0].folioEvents.at(-1).reverses,'close-a');
 assert.equal(s.orders[0].transactions.length,1);
});

import {Store} from '../server/store.js';
test('shared split respects property permissions, revision and idempotency',()=>{
 const db=new Store(':memory:');
 try {
   db.seedTestProperties();
   const make=role=>db.createUser({username:'TEST-split-'+role,password:'TEST-only-password',role,propertyIds:['TEST-KL']});
   const admin=make('admin'), finance=make('finance'), operations=make('operations');
   const created=db.command(admin,{key:'split-create-1',expectedRevision:0,command:c('create',{guest:'TEST',productId:'room',gender:'any',start:'2027-01-01',end:'2027-01-02',nightly:10000})});
   const req={key:'split-bills-1',expectedRevision:1,command:c('settle_split',{orderId:created.id,bills:[{label:'Room',charge:7000,paid:0},{label:'Guest',charge:3000,paid:0}]})};
   assert.throws(()=>db.command(operations,req),/forbidden/);
   db.command(finance,req);
   assert.equal(db.command(finance,req).replayed,true);
   assert.equal(db.read(admin).orders[0].folioEvents.length,1);
   assert.throws(()=>db.command(finance,{key:'split-payment-1',expectedRevision:2,command:c('payment',{orderId:created.id,kind:'payment',amount:100,method:'cash'})}),/bill_state/);
   assert.equal(db.read(admin).orders[0].transactions.length,0);
 } finally { db.close(); }
});
