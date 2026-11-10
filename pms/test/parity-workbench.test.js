import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {seed,apply,directoryEntries} from '../src/demo-store.js';
import {parityKinds,parityReport,parityCsv,occupancyIcal,previewIcal} from '../src/financial-reports.js';
import {Store} from '../server/store.js';
const propertyId='TEST-KL',from='2027-02-01',to='2027-02-02',at='2027-03-01T18:00:00Z';
const command=(s,type,extra={})=>apply(s,{id:randomUUID(),propertyId,type,at,actor:'TEST admin',...extra});
const query=(s,kind,extra={})=>parityReport(s,{propertyId,from,to,businessDate:from,kind,...extra});
function fixture(){let s=seed();s=command(s,'business_date_init',{date:from});s=command(s,'create',{id:'TEST-STAY',guest:'TEST guest',productId:'room',gender:'any',resourceId:'TEST-KL-R1',roomTypeId:s.resources.find(r=>r.id==='TEST-KL-R1').roomTypeId,start:from,end:'2027-02-03',nightly:12345,source:'direct',phone:'TEST phone'});return s;}
test('all 13 queries are pure, property scoped and expose only their declared columns',()=>{
 const s=fixture();s.orders.push({...s.orders[0],id:'OTHER',propertyId:'TEST-PG',guest:'DO NOT EXPOSE'});const original=structuredClone(s);
 for(const kind of parityKinds){const r=query(s,kind);assert(!JSON.stringify(r).includes('DO NOT EXPOSE'),kind);for(const row of r.rows)assert.deepEqual(Object.keys(row),r.columns);}
 assert.deepEqual(s,original);
});
test('date validation bounds inventory work and rejects unsupported report kinds',()=>{
 for(const extra of [{from:'2027-02-30'},{to:'2026-01-01'},{kind:'unknown'},{to:'2029-01-01'},{from:'2027-01-01',to:'2027-02-01'}])assert.throws(()=>query(seed(),'futureInventory',extra),/report/);
 assert.throws(()=>query(seed(),'dailyInventory',{businessDate:''}),/report/);
 assert.throws(()=>query(seed(),'dailyInventory',{source:'booking'}),/report/);
});
test('daily and future inventories use availability allocation including unassigned and boxed stays',()=>{
 let s=fixture();const roomTypeId=s.orders[0].roomTypeId;
 const available=query(s,'dailyInventory').rows.find(r=>r.roomTypeId===roomTypeId).available;
 assert.equal(query(s,'futureInventory').rows.filter(r=>r.roomTypeId===roomTypeId).length,2);
 s=command(s,'box_stays',{orderIds:['TEST-STAY'],reason:'TEST box'});
 assert.equal(query(s,'dailyInventory').rows.find(r=>r.roomTypeId===roomTypeId).available,available+1);
});
test('housekeeping keeps current cleanliness out of historical turnover and never invents task ownership',()=>{
 const s=fixture();const calendar=query(s,'housekeepingCalendar').rows.find(r=>r.resourceId==='TEST-KL-R1'&&r.date===from);
 assert.equal(calendar.arrivals,1);assert.equal(calendar.cleaning,'');assert(!('inspector' in calendar));
 const list=query(s,'housekeepingList').rows.find(r=>r.resourceId==='TEST-KL-R1');assert.equal(list.date,'');assert.equal(list.cleaning,'clean');
});
test('revenue, channel and sales reconcile earned charges independently of receipt clocks and deposits',()=>{
 const s=fixture();s.orders[0].transactions=[{kind:'payment',amount:5000,at:'2027-02-01T18:00:00Z',method:'cash'},{kind:'deposit_in',amount:2000,at:'2027-02-01T18:00:00Z',method:'cash'}];
 assert.equal(query(s,'revenueSummary').rows.reduce((n,r)=>n+r.total,0),24690);
 assert.equal(query(s,'channelSummary').rows[0].total,24690);assert.equal(query(s,'salesSummary').rows[0].total,24690);
 assert.equal(query(s,'transactionSummary',{to:from}).rows.length,0);
 const cash=query(s,'transactionSummary',{from:'2027-02-02',to:'2027-02-02'}).rows[0];assert.equal(cash.payment,5000);assert.equal(cash.netDeposit,2000);
});
test('accommodation summary keeps room, bed and suite denominators separate',()=>{
 const r=query(fixture(),'accommodationSummary');assert.deepEqual(new Set(r.rows.map(r=>r.productId)),new Set(['room','bed','suite']));
 const room=r.rows.find(r=>r.productId==='room'&&r.key===from);assert.equal(room.soldNights,1);assert.equal(room.revenue,12345);assert.equal(room.occupancy,room.soldNights/room.sellableNights);
});
test('rate history is selected by affected date and preserves actor, batch and original snapshot',()=>{
 let s=seed();const roomTypeId=s.roomTypes.find(r=>r.propertyId===propertyId&&r.productId==='room').id;
 s=command(s,'rate_plan_save',{code:'TEST',name:'TEST plan',roomTypeIds:[roomTypeId]});
 for(const amount of [10000,11000])s=command(s,'rates_bulk_update',{planCode:'TEST',roomTypeIds:[roomTypeId],ranges:[{from,to:from}],weekdays:[1,2,3,4,5,6,7],amount});
 const r=query(s,'rateHistory');assert.equal(r.rows.length,2);assert.equal(JSON.parse(r.rows[1].before).amount,10000);assert.equal(r.rows[1].at,at);assert.equal(r.rows[1].actor,'TEST admin');
});
test('customer detail never merges equal names; internal invoice shows complete stay lines and current balance',()=>{
 const s=fixture();s.orders.push({...s.orders[0],id:'TEST-SECOND'});
 assert.equal(query(s,'customerDetails').rows.length,2);
 const invoice=query(s,'invoice',{to:from,search:'TEST-STAY'});assert.equal(invoice.rows.length,3);assert.equal(invoice.rows.at(-1).charge,24690);
});
test('CSV preserves exactly filtered columns and neutralizes formulas including leading spaces',()=>{
 const r=query(fixture(),'customerDetails',{search:'no match'});assert.equal(r.rows.length,0);assert.equal(parityCsv(r).split('\r\n').length,1);
 const csv=parityCsv({columns:['text'],rows:[{text:'  =SUM(1,2)"\nTEST'}]});assert(csv.includes('"\'  =SUM(1,2)""\nTEST"'));
});
test('occupancy ICS contains no guest/contact/order IDs; pasted preview round trips without state writes',()=>{
 const s=fixture(),before=structuredClone(s),ics=occupancyIcal(s,{propertyId,resourceId:'TEST-KL-R1',from,to});
 for(const privateText of ['TEST-STAY','TEST guest','TEST phone'])assert(!ics.includes(privateText));
 assert.deepEqual(previewIcal(ics),[{start:from,end:'2027-02-03'}]);assert.deepEqual(s,before);
 assert.throws(()=>occupancyIcal(s,{propertyId:'TEST-PG',resourceId:'TEST-KL-R1',from,to}),/scope/);
});
test('ICS rejects recurrence, network URLs, alarms, malformed calendars, invalid dates and reversed ranges',()=>{
 const ics=occupancyIcal(fixture(),{propertyId,resourceId:'TEST-KL-R1',from,to});
 for(const value of [ics.replace('SUMMARY:Unavailable','RRULE:FREQ=DAILY'),ics.replace('SUMMARY:Unavailable','URL:https://example.com'),ics.replace('SUMMARY:Unavailable','BEGIN:VALARM'),ics.replace('20270203','20270230'),ics.replace('20270203','20270101'),ics.replace('END:VCALENDAR',''),ics+'BEGIN:VEVENT\n'])assert.throws(()=>previewIcal(value),/ical/);
});
test('directory saves append versions and enforce parent/property scope, amounts, hourly durations',()=>{
 let s=fixture();const add=(kind,name,extra={})=>{s=command(s,'directory_entry_save',{kind,name,...extra});return s.directoryHistory.at(-1).entryId;};
 const groupId=add('tagGroup','TEST group'),tagId=add('tag','TEST tag',{groupId});const first=structuredClone(s.directoryHistory[1]);
 add('tag','TEST renamed',{entryId:tagId,groupId});assert.deepEqual(s.directoryHistory[1],first);assert.equal(directoryEntries(s,propertyId,'tag').length,1);
 add('corporate','TEST company');add('meal','TEST meal',{unitAmount:1000});add('item','TEST item',{unitAmount:250});
 add('hourly','TEST hourly',{unitAmount:500,baseAmount:2000,roomTypeId:s.orders[0].roomTypeId,minHours:2,unitHours:1,maxHours:6});
 assert.throws(()=>add('meal','TEST bad',{unitAmount:1.5}),/amount/);assert.throws(()=>add('tag','TEST bad',{groupId:'other-property'}),/scope/);
 assert.throws(()=>add('hourly','TEST bad',{unitAmount:0,baseAmount:0,roomTypeId:s.orders[0].roomTypeId,minHours:6,unitHours:1,maxHours:2}),/input/);
 assert.throws(()=>add('corporate','TEST bad',{arAccountId:'other-property'}),/scope/);
 s=command(s,'customer_tag_set',{orderId:'TEST-STAY',tagId,active:true});s=command(s,'customer_tag_set',{orderId:'TEST-STAY',tagId,active:false});assert.equal(s.customerTagHistory.length,2);assert(s.customerTagHistory[0].active);assert.equal(s.orders[0].nightly,12345);
});
test('SQLite directories mirror reducer, enforce admin scope, keep originals and retain durable audit',()=>{
 const store=new Store(':memory:');store.seedTestProperties();
 try{const admin=store.createUser({username:'TEST-admin',password:randomUUID(),role:'admin',propertyIds:[propertyId]});const ops=store.createUser({username:'TEST-ops',password:randomUUID(),role:'operations',propertyIds:[propertyId]});const other=store.createUser({username:'TEST-other',password:randomUUID(),role:'admin',propertyIds:['TEST-PG']});
 const send=(user,command)=>store.command(user,{key:randomUUID(),expectedRevision:store.read(admin).revisions[propertyId],command:{propertyId,...command}});
 let s=seed();
 for(const c of [{type:'directory_entry_save',kind:'tagGroup',name:'TEST group'},{type:'directory_entry_save',kind:'meal',name:'TEST meal',unitAmount:700},{type:'memo_save',text:'TEST initial'},{type:'business_date_init',date:from},{type:'memo_save',text:'TEST dated'},{type:'memo_save',text:'TEST changed'}]){
  const response=send(admin,c);const read=store.read(admin);const a=read.audit.find(a=>a.id===response.id);s=apply(s,{...c,propertyId,id:response.id,actor:admin.username,at:a.at});
  assert.deepEqual(read.directoryHistory||[],s.directoryHistory||[]);assert.deepEqual(read.memoHistory||[],s.memoHistory||[]);
 }
 assert.equal(query(store.read(admin),'quickNoteSummary').rows.length,2);assert.equal(query(store.read(admin),'quickNoteSummary').unallocated,1);
 const count=store.read(admin).audit.length;
 assert.throws(()=>send(ops,{type:'directory_entry_save',kind:'tag',name:'TEST denied'}),/forbidden/);
 assert.throws(()=>send(other,{type:'directory_entry_save',kind:'tag',name:'TEST denied'}),/forbidden|scope/);
 assert.equal(store.read(admin).audit.length,count);assert.equal(store.read(other).directoryHistory.length,0);
 assert(store.read(admin).audit.some(a=>a.memoChange?.text==='TEST initial'));assert(store.read(admin).audit.some(a=>a.directoryChange?.name==='TEST group'));
 }finally{store.close();}
});
test('ICS covers shared atoms and blocks without identifiers, and refuses unresolved allocations',()=>{
 const s=fixture(),r=s.resources.find(r=>r.id==='TEST-KL-R1');
 s.resources.push({...r,id:'TEST-SUITE',productId:'suite',atoms:[...r.atoms,'TEST-KL-R2']});
 s.orders[0].resourceId='TEST-SUITE';
 s.blocks.push({id:'TEST-PRIVATE-BLOCK',propertyId,atoms:[...r.atoms],start:'2027-02-02',end:'2027-02-04'});
 s.blocks.push({id:'TEST-OTHER',propertyId:'TEST-PG',atoms:[...r.atoms],start:'2027-02-01',end:'2027-02-05'});
 const ics=occupancyIcal(s,{propertyId,resourceId:r.id,from,to});
 assert.deepEqual(previewIcal(ics),[{start:from,end:'2027-02-03'},{start:'2027-02-02',end:'2027-02-04'}]);
 assert(!ics.includes('TEST-PRIVATE-BLOCK'));assert(!ics.includes('TEST-SUITE'));
 s.orders[0].resourceId=null;assert.throws(()=>occupancyIcal(s,{propertyId,resourceId:r.id,from,to}),/unresolved/);
 s.orders[0].resourceId=r.id;s.orders[0].status='checked_in';s.orders[0].end=from;
 assert.throws(()=>occupancyIcal(s,{propertyId,resourceId:r.id,from,to}),/unresolved/);
});
