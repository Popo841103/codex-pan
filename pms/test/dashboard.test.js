import test from 'node:test';
import assert from 'node:assert/strict';
import {seed,apply} from '../src/demo-store.js';
import {dashboard,queueOrders,comparisonDay,percentageChange} from '../src/dashboard.js';
import {dashboardPage,dashboardWords} from '../web/dashboard-ui.js';
import {Store} from '../server/store.js';
import {randomUUID} from 'node:crypto';
const pid='TEST-KL',date='2027-01-10';
const book=(s,id,start,end,extra={})=>apply(s,{type:'create',propertyId:pid,id,at:'2027-01-10T03:00:00Z',date,guest:'TEST guest',productId:'room',gender:'any',start,end,nightly:10000,...extra});
test('daily, month and year room fees use stay dates; cancellation and deposit are separate',()=>{
 let state=book(seed(),'past','2027-01-01','2027-01-03');state=book(state,'present',date,'2027-01-12');state=book(state,'cancel',date,'2027-01-11');
 state=apply(state,{type:'cancel',propertyId:pid,orderId:'cancel',reason:'TEST',finalCharge:5000});
 state=apply(state,{type:'payment',propertyId:pid,orderId:'present',kind:'deposit_in',amount:50000,method:'cash',at:'2027-01-10T03:00:00Z'});
 const data=dashboard(state,pid,date);assert.equal(data.today.roomFee,10000);assert.equal(data.monthFee,30000);assert.equal(data.yearFee,30000);assert.equal(data.cashflow.deposits,50000);assert.equal(data.cashflow.payments,0);
});
test('cashflows use Malaysia calendar day, independently of stay date',()=>{
 let state=book(seed(),'future','2027-02-01','2027-02-02');
 state=apply(state,{type:'payment',propertyId:pid,orderId:'future',kind:'payment',amount:6000,method:'bank',at:'2027-01-09T18:00:00Z'});
 const data=dashboard(state,pid,date);assert.equal(data.today.roomFee,0);assert.equal(data.cashflow.payments,6000);assert.equal(data.cashflow.transactions.length,1);
});
test('previous seven stay dates exclude today and ignore booking creation date',()=>{
 let state=book(seed(),'earlier','2027-01-03','2027-01-04',{source:'booking'});state=book(state,'today',date,'2027-01-11',{source:'airbnb'});state=book(state,'old','2027-01-01','2027-01-03',{source:'agoda'});
 const data=dashboard(state,pid,date);assert.deepEqual(data.sources,[{source:'booking',count:1,percentage:100}]);
});
test('room/bed denominators are separate, maintenance is excluded and suite units are not extra capacity',()=>{
 let state=seed();state=apply(state,{type:'room_type_save',propertyId:pid,id:'suite-type',names:{zh:'测试套房',en:'TEST suite',ms:'UJIAN suite'},productId:'suite',gender:'any',maxGuests:4});
 state=apply(state,{type:'suite_save',propertyId:pid,id:'suite',roomTypeId:'suite-type',roomIds:['TEST-KL-R1','TEST-KL-R2'],label:'TEST suite'});
 state=book(state,'suite-booking',date,'2027-01-11',{productId:'suite',roomTypeId:'suite-type',resourceId:'suite',nightly:20000});
 state=apply(state,{type:'block',propertyId:pid,resourceId:'TEST-KL-R3',start:date,end:'2027-01-11',id:'block'});
 const data=dashboard(state,pid,date);assert.equal(data.today.room.available,9);assert.equal(data.today.room.sold,2);assert.equal(data.today.bed.available,30);assert.equal(data.today.bed.sold,0);assert.equal(data.today.room.adr,10000);assert.equal(data.today.room.revpar,20000/9);
});
test('month-end and leap-year comparisons clamp dates and zero denominators return null',()=>{
 assert.equal(comparisonDay('2028-03-31',-1),'2028-02-29');assert.equal(comparisonDay('2028-02-29',0,-1),'2027-02-28');assert.equal(percentageChange(100,0),null);
 const data=dashboard(seed(),pid,date);assert.equal(data.today.room.adr,null);assert.equal(data.today.room.occ,0);
});
test('queue selectors distinguish overdue arrivals, planned arrivals, new orders and refunds',()=>{
 let state=book(seed(),'overdue','2027-01-08','2027-01-11');state=book(state,'today',date,'2027-01-12');
 assert.equal(queueOrders(state,pid,date,'exceptions').length,1);assert.equal(queueOrders(state,pid,date,'arrivals').length,1);assert.equal(queueOrders(state,'TEST-PG',date,'arrivals').length,0);
 assert.equal(dashboard(state,pid,date).queues.created,2);
});
test('home rendering escapes memo, provides real queue controls and covers three languages',()=>{
 const state=seed();state.properties[0].memo={text:'</textarea><img src=x>',actor:'TEST',at:''};
 for(const lang of ['zh','en','ms']){const t=k=>dashboardWords[lang][k]||k;const html=dashboardPage(state,pid,date,lang,t,n=>String(n),()=>false);assert.match(html,/&lt;\/textarea&gt;/);assert.doesNotMatch(html,/<img/);assert.match(html,/data-home-queue="arrivals"/);assert.match(html,/data-home="cashflow"/);assert.match(html,/id="home-memo"[^>]*readonly/);assert.doesNotMatch(html,/Infinity|NaN/);}
});
test('shared memo persists under property role and revision checks without changing orders',()=>{
 const store=new Store(':memory:');try{store.seedTestProperties();const user=role=>store.createUser({username:'test-memo-'+role,password:'test-password-only',role,propertyIds:[pid]});const operator=user('operations'),viewer=user('viewer');
 const input={key:randomUUID(),expectedRevision:0,command:{type:'memo_save',propertyId:pid,text:'TEST shared memo'}};store.command(operator,input);
 assert.equal(store.read(viewer).properties[0].memo.text,'TEST shared memo');assert.equal(store.read(viewer).orders.length,0);assert.equal(store.command(operator,input).replayed,true);
 assert.throws(()=>store.command(viewer,{...input,key:randomUUID(),expectedRevision:1}),/forbidden/);assert.throws(()=>store.command(operator,{...input,key:randomUUID()}),/stale_revision/);
 assert.equal(store.read(operator).properties[0].memo.text,'TEST shared memo');}finally{store.close();}
});
