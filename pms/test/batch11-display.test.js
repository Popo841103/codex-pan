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
