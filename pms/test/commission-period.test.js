import test from 'node:test';
import assert from 'node:assert/strict';
import {apply,seed} from '../src/demo-store.js';
const propertyId='TEST-KL';
const send=(s,id,type,extra={})=>apply(s,{id,type,propertyId,at:'2027-02-01T01:00:00Z',actor:'TEST',...extra});
test('commission closes by recorded month, freezes invoice values and rejects changing closed periods',()=>{
 let s={...seed(),businessDate:'2027-01-31'};
 s=send(s,'stay','create',{guest:'TEST',source:'booking',productId:'room',gender:'any',start:'2026-12-31',end:'2027-01-01',nightly:10000});
 const invoice={orderId:'stay',amount:1500,reference:'INV-1',settled:false};
 s=send(s,'invoice','commission_save',invoice);
 assert.equal(s.orders[0].commission.period,'2027-01');
 assert.throws(()=>send(s,'early','commission_close_month',{month:'2027-01'}),/commission_period/);
 s={...s,businessDate:'2027-02-01'};
 assert.throws(()=>send(s,'pending','commission_close_month',{month:'2027-01'}),/commission_pending/);
 s=send(s,'settled','commission_save',{...invoice,settled:true});
 s=send(s,'close','commission_close_month',{month:'2027-01'});
 const row=s.commissionPeriods[0];
 assert.equal(row.total,1500);
 assert.deepEqual(row.channels,[{source:'booking',count:1,amount:1500}]);
 assert.equal(row.entries[0].reference,'INV-1');
 assert.throws(()=>send(s,'rewrite','commission_save',{...invoice,amount:999}),/commission_period/);
 assert.throws(()=>send(s,'repeat','commission_close_month',{month:'2027-01'}),/commission_period/);
 assert.throws(()=>send(s,'purge','purge_test_orders',{prefix:'TEST'}),/commission_period/);
 const correction={...invoice,amount:1200,reference:'CREDIT-1',correction:true,note:'Supplier credit memo'};
 s=send(s,'correction','commission_save',correction);
 assert.equal(s.orders[0].commission.amount,1500);
 assert.equal(s.orders[0].commissionCorrections[0].amount,-300);
 assert.equal(s.commissionPeriods[0].total,1500);
 assert.throws(()=>send(s,'repeat-correction','commission_save',correction),/commission_input/);
 s=send({...s,businessDate:'2027-03-01'},'close-feb','commission_close_month',{month:'2027-02'});
 assert.equal(s.commissionPeriods[1].total,-300);
 assert.equal(s.commissionPeriods[1].entries[0].originalPeriod,'2027-01');
});

import {Store} from '../server/store.js';
test('shared month close is administrator-only by default and replays its receipt',()=>{
 const store=new Store(':memory:');
 try{
   store.seedTestProperties();
   const user=(role,propertyIds)=>store.createUser({username:'commission-close-'+role,password:'TEST-only-password',role,propertyIds});
   const admin=user('admin',[propertyId]),finance=user('finance',[propertyId]),other=user('viewer',['TEST-PG']);
   const run=(u,key,expectedRevision,command)=>store.command(u,{key,expectedRevision,command:{...command,propertyId}});
   run(admin,'commission-init',0,{type:'business_date_init',date:'2027-02-01'});
   const cmd={type:'commission_close_month',month:'2027-01'};
   assert.throws(()=>run(finance,'commission-forbid',1,cmd),/forbidden/);
   run(admin,'commission-close',1,cmd);
   assert.equal(run(admin,'commission-close',1,cmd).replayed,true);
   assert.equal(store.read(finance).commissionPeriods.length,1);
   assert.equal(store.read(other).commissionPeriods.length,0);
   assert.equal(store.read(admin).audit[0].commissionPeriod.month,'2027-01');
 }finally{store.close();}
});
