import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {Store} from '../server/store.js';
import {makeServer} from '../server/http.js';
import {folio,hourlyInventory} from '../src/demo-store.js';
import {accommodationReport,cashflowReport} from '../src/financial-reports.js';
import {occupiesInventory} from '../src/inventory-actions.js';

test('HTTP signup through overnight/hourly checkout reconciles folios, revenue, shift and released rooms',async t=>{
 const store=new Store(':memory:'),server=makeServer(store);
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 t.after(async()=>{server.closeAllConnections();await new Promise(r=>server.close(r));store.close();});
 const base=`http://127.0.0.1:${server.address().port}`,propertyId='FLOW-TRIAL',password=randomUUID();
 const signup=await fetch(base+'/signup',{method:'POST',redirect:'manual',headers:{Origin:base,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({username:'flow-owner',password,confirm:password,store:propertyId,storeName:'Synthetic flow'})});
 assert.equal(signup.status,303);
 let cookie='',csrf='';
 const api=async(path,input)=>{
  const r=await fetch(base+path,{method:input?'POST':'GET',headers:{Origin:base,Cookie:cookie,'Content-Type':'application/json','X-CSRF-Token':csrf},...(input?{body:JSON.stringify(input)}:{})});
  if(r.headers.has('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];
  const data=await r.json();assert.equal(r.status,200,`${path}: ${JSON.stringify(data)}`);return data;
 };
 csrf=(await api('/api/login',{username:'flow-owner',password})).csrf;
 const state=()=>api('/api/state');
 const command=async(type,extra={})=>api('/api/commands',{key:randomUUID(),expectedRevision:(await state()).revisions[propertyId],command:{propertyId,type,...extra}});
 // Deliberately use a business date different from today's Malaysia cash date.
 const date='2027-04-01',end='2027-04-02',from=new Date(Date.now()-60000).toISOString();
 await command('business_date_init',{date});
 const roomTypeId=(await command('room_type_save',{productId:'room',gender:'any',maxGuests:2,names:{zh:'测试',en:'Synthetic',ms:'Ujian'}})).id;
 const rooms=[];
 for(const label of ['Synthetic A','Synthetic B','Synthetic hourly']){
  const r=await command('physical_room_save',{kind:'room',roomTypeId,label,floor:'1'});rooms.push(`${r.id}-unit-1`);
 }
 await command('bulk_clean',{resourceIds:rooms,cleaning:'clean'});
 const parent=(await command('create_reservation',{date,guest:'Synthetic payer',source:'direct',bookingKind:'individual',autoAssign:false,mode:'reserve',stays:[{productId:'room',roomTypeId,gender:'any',resourceId:rooms[0],start:date,end,nightly:10000,adults:1,children:0,infants:0,occupants:[{name:'Synthetic guest',gender:'any'}]}]})).id;
 let s=await state();const orderId=s.orders.find(o=>o.reservationId===parent).id;
 await command('checkin',{orderId,date});
 await command('payment',{orderId,kind:'payment',amount:10000,method:'cash'});
 const itemId=(await command('directory_entry_save',{kind:'item',name:'Synthetic extra',unitAmount:2500})).id;
 await command('item_charge',{orderId,itemId,quantity:2,note:'Synthetic only'});
 await command('assign',{orderId,resourceId:rooms[1],reason:'Synthetic room move'});
 await command('payment',{orderId,kind:'payment',amount:5000,method:'cash'});
 await command('checkout',{orderId,date:end});
 const hourlyId=(await command('directory_entry_save',{kind:'hourly',name:'Synthetic hourly',roomTypeId,minHours:1,maxHours:8,unitHours:1,baseAmount:1000,unitAmount:500})).id;
 const hour=(await command('create_hourly',{hourlyId,resourceId:rooms[2],usageDate:date,startTime:'10:00',hours:2,guest:'Synthetic hour'})).id;
 await command('checkin',{orderId:hour,date});await command('payment',{orderId:hour,kind:'payment',amount:1500,method:'cash'});await command('checkout',{orderId:hour,date});
 await command('shift_save',{name:'Synthetic shift',start:'00:00',end:'23:59'});
 const shiftTypeId=(await state()).shiftTypes[0].id;
 const to=new Date(Date.now()+1000).toISOString();
 await command('shift_handover',{shiftTypeId,from,to,countedCash:16500,note:'Synthetic reconciliation'});
 s=await state();
 assert.equal(s.orders.length,2);assert.equal(s.reservations.length,1);
 const totals=s.orders.map(folio);assert.deepEqual(totals.map(f=>f.charge).sort((a,b)=>a-b),[1500,15000]);
 assert.ok(totals.every(f=>f.due===0&&f.deposit===0));assert.ok(s.orders.every(o=>o.status==='checked_out'&&!occupiesInventory(o)));
 assert.ok(s.resources.filter(r=>rooms.includes(r.id)).every(r=>r.cleaning==='dirty'));
 assert.ok(hourlyInventory(s,propertyId,date,rooms[2]).every(r=>r.status==='available'));
 const revenue=accommodationReport(s,{propertyId,from:date,to:end,source:'all'});
 assert.equal(revenue.total,16500);assert.equal(revenue.unallocatedCharges.length,0);
 const cashDay=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kuala_Lumpur',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 assert.notEqual(cashDay,date);
 const cash=cashflowReport(s,{propertyId,from:cashDay,to:cashDay,source:'all'});
 assert.equal(cash.totals.netAccommodation,revenue.total);assert.equal(cash.totals.netDeposit,0);
 assert.equal(cashflowReport(s,{propertyId,from:date,to:date,source:'all'}).totals.netAccommodation,0);
 const handover=s.handovers.at(-1);assert.equal(handover.businessDate,date);assert.equal(handover.summary.net,revenue.total);assert.equal(handover.summary.depositNet,0);assert.equal(handover.cashCount.status,'balanced');
 assert.equal(s.orders.find(o=>o.id===orderId).resourceId,rooms[1]);
 assert.ok(s.audit.some(a=>a.type==='assign'&&a.orderId===orderId));
});
