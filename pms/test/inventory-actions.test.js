import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {seed,apply,preview,folio} from '../src/demo-store.js';
import {accommodationReport,cashflowReport,dailyOperations} from '../src/financial-reports.js';
import {dashboard,queueOrders} from '../src/dashboard.js';
import {Store} from '../server/store.js';
import {selectedRange,validateSelection} from '../web/calendar-actions.js';
const pid='TEST-KL',start='2027-01-30',end='2027-02-02';
const cmd=(type,extra={})=>({type,propertyId:pid,id:randomUUID(),at:start+'T08:00:00Z',date:start,...extra});
const create=(state,id='stay',resourceId='TEST-KL-R1')=>apply(state,cmd('create',{id,guest:'TEST box guest',productId:'room',gender:'any',resourceId,start,end,nightly:10000}));
const box=(state,ids=['stay'])=>apply(state,cmd('box_stays',{orderIds:ids,reason:'TEST inventory review'}));
const restore=(state,extra={})=>apply(state,cmd('restore_stays',{orderIds:['stay'],reason:'TEST inventory confirmed',autoAssign:false,...extra}));

test('boxing excludes fees but preserves receipts, deposits and stored prices',()=>{
 let state=create(seed());state=apply(state,cmd('payment',{orderId:'stay',kind:'payment',amount:10000,method:'cash'}));
 state=apply(state,cmd('payment',{orderId:'stay',kind:'deposit_in',amount:5000,method:'cash'}));
 const old=structuredClone(state.orders[0]),fees=folio(old);state=box(state);
 const order=state.orders[0];assert.equal(order.status,'confirmed');assert.equal(order.resourceId,null);assert.equal(order.inventoryStatus,'boxed');assert.equal(folio(order).charge,0);assert.equal(folio(order).due,-10000);assert.deepEqual(order.transactions,old.transactions);assert.equal(preview(state,pid).length,0);
 const q={propertyId:pid,from:start,to:start,date:start};
 assert.equal(accommodationReport(state,q).total,0);
 assert.equal(cashflowReport(state,q).totals.payment,10000);
 assert.equal(dailyOperations(state,q).closing.due,-10000);
 assert.equal(dashboard(state,pid,start).today.roomFee,0);assert.equal(dashboard(state,pid,start).cashflow.deposits,5000);assert.equal(queueOrders(state,pid,start,'unassigned').length,0);assert.equal(queueOrders(state,pid,start,'arrivals').length,0);
 assert.throws(()=>apply(state,cmd('assign',{orderId:'stay',resourceId:'TEST-KL-R2'})),/box_state/);assert.throws(()=>apply(state,cmd('checkin',{orderId:'stay'})),/box_state/);
 const restored=restore(state);assert.equal(restored.orders[0].resourceId,null);assert.equal(preview(restored,pid).length,1);assert.deepEqual(folio(restored.orders[0]),fees);assert.equal(restored.orders[0].inventoryHistory.length,2);
});
test('restoring a full property fails atomically and keeps boxed orders and existing bookings',()=>{
 let state=seed();for(let n=1;n<=10;n++)state=create(state,'stay-'+n,'TEST-KL-R'+n);
 state=box(state,['stay-1']);state=create(state,'replacement','TEST-KL-R1');const before=JSON.stringify(state);
 assert.throws(()=>restore(state,{orderIds:['stay-1'],autoAssign:true}));assert.equal(JSON.stringify(state),before);
 state=apply(state,cmd('cancel',{orderId:'replacement',reason:'TEST cancel',finalCharge:0}));state=restore(state,{orderIds:['stay-1'],autoAssign:true});
 assert.equal(state.orders.find(o=>o.id==='stay-1').resourceId,'TEST-KL-R1');assert.equal(preview(state,pid).length,10);
});
test('box batches reject locks, in-house stays, duplicate and foreign IDs without partial changes',()=>{
 let state=create(create(seed(),'first','TEST-KL-R1'),'second','TEST-KL-R2');state=apply(state,cmd('lock',{orderId:'second'}));
 const before=JSON.stringify(state);assert.throws(()=>box(state,['first','second']),/box_state/);assert.equal(JSON.stringify(state),before);
 assert.throws(()=>box(state,['first','first']),/input/);assert.throws(()=>box(state,['first','foreign']),/scope/);
 state=apply(state,cmd('lock',{orderId:'second'}));state=apply(state,cmd('checkin',{orderId:'second'}));assert.throws(()=>box(state,['first','second']),/box_state/);
});
test('cancelling a boxed stay preserves refundable money without allocating a room',()=>{
 let state=create(seed());state=apply(state,cmd('payment',{orderId:'stay',kind:'payment',amount:10000,method:'cash'}));state=box(state);
 state=apply(state,cmd('cancel',{orderId:'stay',reason:'TEST cancel',finalCharge:0}));assert.equal(preview(state,pid).length,0);assert.equal(folio(state.orders[0]).paid,10000);assert.equal(folio(state.orders[0]).due,-10000);assert.throws(()=>restore(state),/box_state/);
});
test('maintenance and out-of-service remove capacity; sale-blocking holds retain the denominator',()=>{
 for(const kind of ['maintenance','out_of_service','hold']){
  const state=apply(seed(),cmd('bulk_block',{resourceIds:['TEST-KL-R1'],start,end,blockType:kind,reason:'TEST block'}));
  assert.equal(dashboard(state,pid,start).today.room.available,kind==='hold'?10:9);assert.throws(()=>create(state));assert.equal(state.blocks[0].blockType,kind);
 }
 assert.throws(()=>apply(seed(),cmd('block',{resourceId:'TEST-KL-R1',start,end,blockType:'bad'})),/block_input/);
 assert.throws(()=>apply(seed(),cmd('block',{resourceId:'TEST-KL-R1',start,end,reason:'x'.repeat(201)})),/block_input/);
});
test('targeted release preserves overlapping block types, other atoms, dates and reasons',()=>{
 let state=apply(seed(),cmd('bulk_block',{id:'hold',resourceIds:['TEST-KL-R1','TEST-KL-R2'],start,end,blockType:'hold',reason:'TEST hold'}));
 state=apply(state,cmd('bulk_block',{id:'repair',resourceIds:['TEST-KL-R1'],start,end,blockType:'maintenance',reason:'TEST repair'}));
 state=apply(state,cmd('bulk_unblock',{resourceIds:['TEST-KL-R1'],start:'2027-01-31',end:'2027-02-01',blockIds:['hold']}));
 assert(state.blocks.some(b=>b.id==='repair'&&b.reason==='TEST repair'));assert.equal(state.blocks.filter(b=>b.blockType==='hold').length,3);assert(state.blocks.some(b=>b.atoms.includes('TEST-KL-R2')&&b.start===start&&b.end===end));
 assert.throws(()=>apply(state,cmd('bulk_unblock',{resourceIds:['TEST-KL-R1'],start,end,blockIds:['missing']})),/scope/);
});
test('selection counts both endpoint nights, handles reverse and cross-month ranges and rejects occupied intervals',()=>{
 const first={resourceId:'TEST-KL-R1',day:'2027-01-31'},last={resourceId:'TEST-KL-R1',day:'2027-02-01'};
 const range=selectedRange(first,last);assert.deepEqual(range,{resourceId:'TEST-KL-R1',start:'2027-01-31',end:'2027-02-02'});assert.deepEqual(selectedRange(last,first),range);
 assert.throws(()=>selectedRange(first,{...last,resourceId:'TEST-KL-R2'}),/selection_scope/);
 const state=create(seed());assert.throws(()=>validateSelection(state,pid,range,preview(state,pid)),/selection_conflict/);
});
test('range validation detects sibling suite atoms, blocks and foreign resources',()=>{
 let state=seed();state=apply(state,cmd('room_type_save',{id:'TEST-suite',productId:'suite',gender:'any',maxGuests:2,names:{zh:'TEST整套',en:'TEST suite',ms:'TEST suite'}}));
 state=apply(state,cmd('suite_save',{id:'suite',roomTypeId:'TEST-suite',roomIds:['TEST-KL-R1'],label:'TEST whole'}));
 state=apply(state,cmd('create',{id:'whole',guest:'TEST',productId:'suite',gender:'any',roomTypeId:'TEST-suite',resourceId:'suite',start,end}));
 const range={resourceId:'TEST-KL-R1',start,end};assert.throws(()=>validateSelection(state,pid,range,preview(state,pid)),/selection_conflict/);
 assert.throws(()=>validateSelection(seed(),pid,{...range,resourceId:'TEST-PG-R1'},[]),/selection_scope/);
 const blocked=apply(seed(),cmd('block',{resourceId:'TEST-KL-R1',start,end,blockType:'hold'}));assert.throws(()=>validateSelection(blocked,pid,range,[]),/selection_conflict/);assert.equal(validateSelection(blocked,pid,range,[],{allowBlocks:true}).nights,3);
});
test('SQLite boxing uses one revision, audit and receipt; unauthorized and stale writes preserve claims',()=>{
 const store=new Store(':memory:');try{
  store.seedTestProperties();const admin=store.createUser({username:'test-box-admin',password:'test-password-only',role:'admin',propertyIds:[pid]});
  const created=store.command(admin,{key:randomUUID(),expectedRevision:0,command:cmd('create',{guest:'TEST',productId:'room',gender:'any',resourceId:'TEST-KL-R1',start,end})});
  const request={key:randomUUID(),expectedRevision:1,command:cmd('box_stays',{orderIds:[created.id],reason:'TEST box'})};
  store.command(admin,request);assert.equal(store.command(admin,request).replayed,true);assert.equal(store.db.prepare('SELECT COUNT(*) n FROM claims').get().n,0);
  const state=store.read(admin);assert.equal(state.revisions[pid],2);const audit=state.audit.find(a=>a.type==='box_stays');assert.equal(audit.stayIds[0],created.id);assert.equal(audit.inventoryChange.before[0].resourceId,'TEST-KL-R1');assert.equal(audit.inventoryChange.after[0].inventoryStatus,'boxed');
  for(const role of ['finance','viewer']){const user=store.createUser({username:'test-box-'+role,password:'test-password-only',role,propertyIds:[pid]});assert.throws(()=>store.command(user,{key:randomUUID(),expectedRevision:2,command:cmd('restore_stays',{orderIds:[created.id],autoAssign:true,reason:'TEST restore'})}),/forbidden/);}
  // A refused and a stale write must leave the property state untouched. Member
  // administration is deliberately compared separately: it is not property state.
  const replayed=store.read(admin);
  assert.deepEqual(replayed.orders,state.orders);assert.deepEqual(replayed.blocks,state.blocks);
  assert.deepEqual(replayed.audit,state.audit);assert.deepEqual(replayed.revisions,state.revisions);
  assert.throws(()=>store.command(admin,{key:randomUUID(),expectedRevision:1,command:cmd('restore_stays',{orderIds:[created.id],autoAssign:true,reason:'TEST restore'})}),/stale_revision/);
  store.command(admin,{key:randomUUID(),expectedRevision:2,command:cmd('restore_stays',{orderIds:[created.id],autoAssign:true,reason:'TEST restore'})});assert.equal(store.db.prepare('SELECT COUNT(*) n FROM claims').get().n,3);
 }finally{store.close();}
});
test('durable block audit keeps typed before/after evidence when one atom and date interval is released',()=>{
 const store=new Store(':memory:');try{
  store.seedTestProperties();const user=store.createUser({username:'test-block-audit',password:'test-password-only',role:'operations',propertyIds:[pid]});
  const saved=store.command(user,{key:randomUUID(),expectedRevision:0,command:cmd('bulk_block',{resourceIds:['TEST-KL-R1','TEST-KL-R2'],start,end,blockType:'hold',reason:'TEST selected hold'})});
  store.command(user,{key:randomUUID(),expectedRevision:1,command:cmd('bulk_unblock',{resourceIds:['TEST-KL-R1'],start:'2027-01-31',end:'2027-02-01',blockIds:[saved.id]})});
  const state=store.read(user),audit=state.audit.find(a=>a.type==='bulk_unblock');assert.equal(audit.blockChange.before.length,1);assert.equal(audit.blockChange.after.length,3);assert(state.blocks.every(b=>b.blockType==='hold'&&b.reason==='TEST selected hold'&&b.createdBy===user.username));
  assert.equal(state.revisions[pid],2);assert.equal(store.db.prepare('SELECT COUNT(*) n FROM receipts').get().n,2);
 }finally{store.close();}
});

test('settling a boxed booking restores inventory atomically before closing the folio',()=>{
 let state=box(create(seed()));
 assert.throws(()=>apply(state,cmd('settle',{orderId:'stay'})),/balance/);
 assert.equal(state.orders[0].inventoryStatus,'boxed');
 state=apply(state,cmd('payment',{orderId:'stay',kind:'payment',amount:30000,method:'cash'}));
 state=apply(state,cmd('settle',{orderId:'stay'}));
 assert.equal(state.orders[0].inventoryStatus,'reserved');
 assert.equal(state.orders[0].folioClosed,true);
 assert.equal(preview(state,pid).length,1);
 assert.throws(()=>box(state),/box_state/);
});

test('explicit room lock and calendar move share inventory and night-audit protections',()=>{
 let state=create(seed());
 const move={orderId:'stay',resourceId:'TEST-KL-R2',dragDate:start};
 state=apply(state,cmd('lock',{orderId:'stay',locked:true}));
 state=apply(state,cmd('lock',{orderId:'stay',locked:true}));
 assert.throws(()=>apply(state,cmd('assign',move)),/locked/);
 state=apply(state,cmd('lock',{orderId:'stay',locked:false}));
 assert.throws(()=>apply(state,cmd('assign',{...move,dragDate:'2027-01-31'})),/date/);
 assert.equal(apply(state,cmd('assign',move)).orders[0].resourceId,move.resourceId);
 state.businessDate='2027-01-31';state.nightAudits=[{businessDate:start}];
 assert.throws(()=>apply(state,cmd('assign',move)),/audited/);
});
test('status reversals preserve receipts and respect audited dates, including KL cancellation time',()=>{
 let state=create(seed());
 state=apply(state,cmd('checkin',{orderId:'stay'}));
 const reverse=type=>apply(state,cmd(type,{orderId:'stay'}));
 assert.equal(reverse('undo_checkin').orders[0].status,'confirmed');
 state.businessDate='2027-01-31';state.nightAudits=[{businessDate:start}];
 assert.throws(()=>reverse('undo_checkin'),/audited/);
 state=create(seed());
 state=apply(state,cmd('cancel',{orderId:'stay',reason:'TEST',finalCharge:0,at:'2027-01-29T17:00:00Z'}));
 assert.equal(reverse('restore_cancel').orders[0].status,'confirmed');
 state.businessDate='2027-01-31';state.nightAudits=[{businessDate:start}];
 assert.throws(()=>reverse('restore_cancel'),/audited/);
});

test('undo checkout does not touch money, respects the audit, and refuses reassigned inventory',()=>{
 let state=create(seed());const orderId='stay';
 state=apply(state,cmd('payment',{orderId,kind:'payment',amount:30000,method:'cash'}));
 state=apply(state,cmd('checkin',{orderId}));
 state=apply(state,cmd('checkout',{orderId,date:end}));
 const undo=()=>apply(state,cmd('undo_checkout',{orderId}));
 assert.equal(undo().orders[0].status,'checked_in');
 assert.deepEqual(undo().orders[0].transactions,state.orders[0].transactions);
 const checkedOut=state;
 state=create(state,'replacement');
 assert.throws(undo,/inventory|conflict/i);
 state=checkedOut;state.businessDate='2027-02-03';state.nightAudits=[{businessDate:end}];
 assert.throws(undo,/audited/);
});
test('restoring a cancellation does not erase a posted cancellation fee',()=>{
 let state=create(seed());
 state=apply(state,cmd('cancel',{orderId:'stay',reason:'TEST fee',finalCharge:1000}));
 assert.throws(()=>apply(state,cmd('restore_cancel',{orderId:'stay'})),/bill_state/);
 assert.equal(folio(state.orders[0]).charge,1000);
});
