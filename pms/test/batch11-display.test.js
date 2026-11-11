import test from 'node:test';
import assert from 'node:assert/strict';
import {parityReportTable} from '../web/workspace-ui.js';
const state={orders:[{id:'stay-id',guest:'钱七',resourceId:'room-id'}],resources:[{id:'room-id',label:'101'}],roomTypes:[{id:'type-id',names:{zh:'大床房'}}]};
test('clerk sees MYR, guest, room and room type in shift and invoice tables',()=>{
 for(const kind of ['shiftAccrual','invoice']){
 const html=parityReportTable({kind,rows:[{orderId:'stay-id',roomTypeId:'type-id',resourceId:'room-id',amount:10500}],columns:['orderId','roomTypeId','resourceId','amount'],totals:{amount:10500}},'zh',String,state);
 assert(html.includes('MYR 105.00'));assert(html.includes('钱七 · 101'));assert(html.includes('大床房'));assert(!html.includes('10500'));assert(!html.includes('<td>type-id'));assert(!html.includes('（分）'));
 }
});
import {seed,apply} from '../src/demo-store.js';
import {parityReport} from '../src/financial-reports.js';
test('four legacy undated receipts remain four after a new business-date payment',()=>{
 const propertyId='TEST-KL',date='2026-11-11';let n=0;
 const send=(type,extra={})=>{state2=apply(state2,{id:'b11-'+(++n),propertyId,type,at:'2026-11-11T02:00:00Z',actor:'TEST',...extra});};
 let state2=seed();send('business_date_init',{date});send('create',{id:'stay',guest:'钱七',resourceId:'TEST-KL-R1',productId:'room',gender:'any',start:date,end:'2026-11-12',nightly:10500});
 state2.orders[0].transactions=Array.from({length:4},(_,i)=>({id:'legacy-'+i,kind:'payment',amount:100,method:'cash'}));
 const old=structuredClone(state2.orders[0].transactions),query=()=>parityReport(state2,{propertyId,kind:'shiftAccrual',from:date,to:date});assert.equal(query().unallocated,4);
 send('payment',{orderId:'stay',kind:'payment',amount:10500,method:'cash'});assert.equal(query().unallocated,4);assert.equal(query().rows.find(r=>r.kind==='payment').amount,10500);assert.deepEqual(state2.orders[0].transactions.slice(0,4),old);
});
