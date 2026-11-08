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
