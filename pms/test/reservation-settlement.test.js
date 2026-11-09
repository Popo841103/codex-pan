import test from 'node:test';
import assert from 'node:assert/strict';
import { apply, seed } from '../src/demo-store.js';

test('batch settlement preserves individual balances and rejects offsetting stays', () => {
  const base = { propertyId:'TEST-KL', at:'2027-01-01T10:00:00Z', actor:'TEST' };
  const state = seed();
  state.reservations = [{id:'parent',propertyId:base.propertyId,stayIds:['a','b']}];
  state.orders = ['a','b'].map((id,index)=>({
    id, propertyId:base.propertyId, reservationId:'parent', status:'checked_out',
    productId:'room', start:'2027-01-01', end:'2027-01-02', nightly:10000,
    transactions:[{kind:'payment',amount:index===0?9000:11000}]
  }));
  const command = {...base, type:'settle_reservation', reservationId:'parent', id:'batch'};
  assert.throws(()=>apply(state,command),/balance/);
  assert(state.orders.every(order=>!order.folioClosed));
  state.orders.forEach(order=>{order.transactions[0].amount=10000;});
  state.orders[1].transactions.push({kind:'deposit_in',amount:500});
  assert.throws(()=>apply(state,command),/balance/);
  state.orders[1].transactions.pop();
  const settled = apply(state,command);
  assert(settled.orders.every(order=>order.folioClosed));
  assert.deepEqual(settled.orders.map(order=>order.folioEvents[0].batchId),['batch','batch']);
  assert.deepEqual(settled.orders.map(order=>order.transactions),state.orders.map(order=>order.transactions));
  assert.throws(()=>apply(settled,{...command,id:'second'}),/folio_closed/);
});

test('a group receipt allocates the exact amount atomically to its own stays', () => {
  const state=seed();
  const propertyId='TEST-KL';
  state.reservations=[{id:'parent',propertyId,stayIds:['a','b']}];
  state.orders=['a','b'].map(id=>({
    id,propertyId,reservationId:'parent',status:'checked_out',productId:'room',
    start:'2027-01-01',end:'2027-01-02',nightly:10000,transactions:[]
  }));
  const command={
    type:'payment_reservation',id:'receipt',propertyId,reservationId:'parent',method:'bank',
    amount:15000,at:'2027-01-02T10:00:00Z',reference:'Bank record',
    allocations:[{orderId:'a',amount:10000},{orderId:'b',amount:5000}]
  };
  assert.throws(()=>apply(state,{...command,amount:16000}),/amount/);
  assert.throws(()=>apply(state,{...command,allocations:[command.allocations[0],{orderId:'outside',amount:5000}]}),/scope/);
  assert.throws(()=>apply(state,{...command,allocations:[command.allocations[0],{orderId:'a',amount:5000}]}),/amount/);
  assert.throws(()=>apply(state,{...command,amount:21000,allocations:[command.allocations[0],{orderId:'b',amount:11000}]}),/balance/);
  assert(state.orders.every(o=>o.transactions.length===0));
  const result=apply(state,command);
  const [a,b]=result.orders.map(o=>o.transactions[0]);
  assert.deepEqual([a.amount,b.amount],[10000,5000]);
  assert.deepEqual([a.batchId,b.batchId],['receipt','receipt']);
  assert.notEqual(a.id,b.id);
  assert.equal(b.reference,'Bank record');
  const undo={...command,type:'undo_reservation_payment',id:'undo',batchId:'receipt',reason:'Duplicate posting'};
  const reversed=apply(result,undo);
  assert.deepEqual(reversed.orders.map(o=>o.transactions.map(t=>t.kind)),[['payment','refund'],['payment','refund']]);
  assert.deepEqual(reversed.orders.map(o=>o.transactions[1].reverses),[a.id,b.id]);
  assert.throws(()=>apply(reversed,undo),/bill_state/);
  result.orders[1].folioClosed=true;
  assert.throws(()=>apply(result,undo),/bill_state/);
  assert.equal(result.orders[0].transactions.length,1);
});
