import {mealEntitlements,housekeepingTasks} from './demo-store.js';
import {isBoxed} from './inventory-actions.js';
import {replayReceivables,commissionPeriod,folioTransferCredit} from './demo-store.js';
import {localDay,comparisonDay} from './dashboard.js';
import {stayDays} from './reservations.js';
const validDate=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d+'T00:00:00Z'))&&new Date(d+'T00:00:00Z').toISOString().slice(0,10)===d;
function scope(state,q){if(!q||typeof q.propertyId!=='string'||!q.propertyId.trim()||!validDate(q.from)||!validDate(q.to)||q.from>q.to)throw Error('report_input');return state.orders.filter(o=>o.propertyId===q.propertyId&&(!q.source||q.source==='all'||o.source===q.source));}
const roomAt=(o,date)=>o.roomSegments?.find(p=>p.start<=date&&p.end>date)?.resourceId||o.resourceId;
const amount=v=>{if(!Number.isSafeInteger(v))throw Error('report_amount');return v;};
const inRange=(d,q)=>d>=q.from&&d<=q.to;
export function accommodationReport(state,q){const orders=scope(state,q),rows=[],unallocatedCharges=[];for(const o of orders){const {lines,unallocated}=orderChargeLines(o);for(const line of lines)if(inRange(line.date,q))rows.push(line);unallocatedCharges.push(...unallocated);}rows.sort((a,b)=>a.date.localeCompare(b.date)||a.orderId.localeCompare(b.orderId));const grouped=new Map();for(const row of rows)grouped.set(row.date,(grouped.get(row.date)||0)+row.amount);return {rows,total:rows.reduce((n,r)=>n+r.amount,0),daily:[...grouped].map(([date,amount])=>({date,amount})),unallocatedCharges};}
// A charge posts to the business date on which it is earned: a room night to its own
// night, an extra to the business date stored with it, and a cancellation penalty to
// the business date recorded when the cancellation happened. Anything without a
// business date is reported as unallocated instead of being assigned to a convenient day.
export function orderChargeLines(order){
  const base={orderId:order.id,reservationId:order.reservationId||null,guest:order.guest||'',source:order.source||'direct',roomTypeId:order.roomTypeId||'unspecified',productId:order.productId||'unspecified'};
  const lines=[],unallocated=[];
  if(order.status==='confirmed'&&isBoxed(order))return {lines,unallocated};
  if(order.status==='cancelled'){
    if(order.finalCharge!==undefined&&order.finalCharge!==null){
      const value=amount(order.finalCharge),date=order.cancelBusinessDate;
      if(validDate(date))lines.push({...base,date,kind:'cancellation',amount:value});
      else unallocated.push({...base,amount:value,reason:'posting_date_missing'});
    }
    return {lines,unallocated};
  }
  if(order.finalCharge!==undefined&&order.finalCharge!==null){
    unallocated.push({...base,amount:amount(order.finalCharge),reason:'posting_date_missing'});
    return {lines,unallocated};
  }
  for(const rate of order.nightlyRates||stayDays(order.start,order.end).map(date=>({date,amount:order.nightly||0}))){
    const value=amount(rate.amount);
    if(!validDate(rate.date)){unallocated.push({...base,amount:value,reason:'posting_date_missing'});continue;}
    lines.push({...base,date:rate.date,kind:order.hourly?'hourly':'room',amount:value});
  }
  for(const extra of order.extraCharges||[]){
    const value=amount(extra.quantity*extra.unitAmount)*(extra.kind==='discount'?-1:1);
    if(!validDate(extra.businessDate)){unallocated.push({...base,amount:value,reason:'posting_date_missing'});continue;}
    lines.push({...base,date:extra.businessDate,kind:extra.kind,name:extra.name,amount:value});
  }
  return {lines,unallocated};
}
const previousDay=date=>new Date(Date.parse(date+'T00:00:00Z')-86400000).toISOString().slice(0,10);
const emptyBalance=()=>({charge:0,paid:0,deposit:0,due:0});
const addBalance=(a,b)=>({charge:a.charge+b.charge,paid:a.paid+b.paid,deposit:a.deposit+b.deposit,due:a.due+b.due});
// Charges are cut on the business date because that is when they are earned; receipts
// are cut on the Malaysian transaction day because that is when the money moved. The
// report names both clocks rather than quietly mixing them into one column.
export function orderBalanceAt(order,date,inclusive=true){
  const cut=inclusive?(day=>day<=date):(day=>day<date);
  const balance=emptyBalance();
  for(const line of orderChargeLines(order).lines)if(cut(line.date))balance.charge+=line.amount;
  for(const tr of order.transactions||[]){
    if(!['payment','refund','deposit_in','deposit_out'].includes(tr.kind))continue;
    const day=tr.businessDate||localDay(tr.at);if(!day||!cut(day))continue;
    const value=amount(tr.amount);if(value<0)throw Error('report_amount');
    if(tr.kind==='payment')balance.paid+=value;
    else if(tr.kind==='refund')balance.paid-=value;
    else if(tr.kind==='deposit_in')balance.deposit+=value;
    else balance.deposit-=value;
  }
  const transferred=(order.arMoves||[]).filter(m=>cut(m.businessDate)).reduce((sum,m)=>sum+amount(m.amount),0);
  balance.due=balance.charge-balance.paid-transferred-folioTransferCredit(order,cut);
  return balance;
}
export function guestLedger(state,q){
  if(!q||typeof q.propertyId!=='string'||!q.propertyId.trim()||!validDate(q.date))throw Error('report_input');
  const orders=(state.orders||[]).filter(o=>o.propertyId===q.propertyId&&(!q.source||q.source==='all'||o.source===q.source));
  const rows=[];
  for(const order of orders){
    const balance=orderBalanceAt(order,q.date,true);
    if(!balance.charge&&!balance.paid&&!balance.deposit&&!balance.due)continue;
    rows.push({orderId:order.id,reservationId:order.reservationId||null,guest:order.guest||'',source:order.source||'direct',channelOrderId:order.channelOrderId||'',roomTypeId:order.roomTypeId||'unspecified',status:order.status,start:order.start||'',end:order.end||'',outstanding:balance.due>0?balance.due:0,overpaid:balance.due<0?-balance.due:0,depositHeld:balance.deposit,...balance});
  }
  rows.sort((a,b)=>Math.abs(b.due)-Math.abs(a.due)||a.orderId.localeCompare(b.orderId));
  const totals=rows.reduce((a,r)=>addBalance(a,r),emptyBalance());
  const buckets={outstanding:{count:0,amount:0},overpaid:{count:0,amount:0},depositHeld:{count:0,amount:0},settled:{count:0,amount:0}};
  for(const r of rows){
    if(r.outstanding){buckets.outstanding.count++;buckets.outstanding.amount+=r.outstanding;}
    if(r.overpaid){buckets.overpaid.count++;buckets.overpaid.amount+=r.overpaid;}
    if(r.depositHeld){buckets.depositHeld.count++;buckets.depositHeld.amount+=r.depositHeld;}
    if(!r.due&&!r.depositHeld)buckets.settled.count++;
  }
  return {date:q.date,rows,totals,buckets};
}
export function dailyOperations(state,q){
  if(!q||typeof q.propertyId!=='string'||!q.propertyId.trim()||!validDate(q.date))throw Error('report_input');
  const orders=(state.orders||[]).filter(o=>o.propertyId===q.propertyId&&(!q.source||q.source==='all'||o.source===q.source));
  const opening=orders.reduce((a,o)=>addBalance(a,orderBalanceAt(o,previousDay(q.date),true)),emptyBalance());
  const closing=orders.reduce((a,o)=>addBalance(a,orderBalanceAt(o,q.date,true)),emptyBalance());
  const charges={room:0,extras:0,cancellation:0,total:0},unallocated=[],chargeLines=[];
  for(const order of orders){const {lines,unallocated:missing}=orderChargeLines(order);for(const line of lines){if(line.date!==q.date)continue;chargeLines.push(line);charges.total+=line.amount;if(['room','hourly'].includes(line.kind))charges.room+=line.amount;else if(line.kind==='cancellation')charges.cancellation+=line.amount;else charges.extras+=line.amount;}unallocated.push(...missing);}
  const settlements={payment:0,refund:0,deposit_in:0,deposit_out:0,net:0,depositNet:0,count:0};
  for(const order of orders)for(const tr of order.transactions||[]){
    if(!['payment','refund','deposit_in','deposit_out'].includes(tr.kind))continue;
    if((tr.businessDate||localDay(tr.at))!==q.date)continue;
    const value=amount(tr.amount);if(value<0)throw Error('report_amount');
    settlements[tr.kind]+=value;settlements.count++;
  }
  const arNet=orders.flatMap(o=>o.arMoves||[]).filter(m=>m.businessDate===q.date).reduce((sum,m)=>sum+amount(m.amount),0);
  const folioCreditNet=orders.reduce((sum,order)=>sum+folioTransferCredit(order,date=>date===q.date),0);
  settlements.net=settlements.payment-settlements.refund;
  settlements.depositNet=settlements.deposit_in-settlements.deposit_out;
  const metrics={arrivals:orders.filter(o=>!isBoxed(o)&&o.status==='confirmed'&&o.start===q.date).length,departures:orders.filter(o=>!isBoxed(o)&&o.status==='checked_in'&&(o.hourly?o.start:o.end)===q.date).length,inHouse:orders.filter(o=>o.status==='checked_in'&&o.start<=q.date&&o.end>q.date).length,expectedArrivals:orders.filter(o=>o.status==='confirmed'&&o.start===q.date).length};
  // The day's own movements must rebuild the closing balance from the opening one. If
  // they do not, the page says the day is unreconciled instead of showing a total that
  // no longer ties back to the guest ledger.
  const expected={charge:opening.charge+charges.total,paid:opening.paid+settlements.net,deposit:opening.deposit+settlements.depositNet};
  const balanced=expected.charge===closing.charge&&expected.paid===closing.paid&&expected.deposit===closing.deposit&&opening.due+charges.total-settlements.net-arNet-folioCreditNet===closing.due;
  const businessDate=state.businessDates?.[q.propertyId]??state.businessDate??null;
  return {date:q.date,opening,closing,charges,settlements,arNet,...(folioCreditNet?{folioCreditNet}:{}),chargeLines,unallocated,metrics,expected,balanced,orderCount:orders.length,businessDate,businessDateSet:BusinessDate(businessDate)};
}
const BusinessDate=value=>typeof value==='string'&&validDate(value);
export function managerDailyReport(state,q){
  if(!q||typeof q.propertyId!=='string'||!q.propertyId.trim()||!validDate(q.date))throw Error('report_input');
  const current=dailyOperations(state,q),periods={},changes={};
  for(const key of ['month','year']){
    const date=key==='month'?comparisonDay(q.date,-1):comparisonDay(q.date,0,-1);
    periods[key]={date,operations:dailyOperations(state,{...q,date})};
  }
  for(const key of ['month','year']){
    const before=periods[key].operations;
    changes[key]={};
    for(const [metric,now,was] of [['charges',current.charges.total,before.charges.total],['receipts',current.settlements.net,before.settlements.net],['due',current.closing.due,before.closing.due]]){
      changes[key][metric]={now,was,delta:now-was,percent:was===0?null:(now-was)/Math.abs(was)*100};
    }
  }
  return {date:q.date,current,periods,changes};
}
// ---------------------------------------------------------------------------
// Accommodation reports. Rooms, suites and beds are counted separately because a
// dorm bed and a whole room are not the same product. A suite occupies the atoms of
// the rooms and beds inside it, so those units are removed from supply for that night
// instead of being counted twice: once as the suite and again as its own parts.
// ---------------------------------------------------------------------------
import { occupiesInventory, excludesCapacity } from './inventory-actions.js';
const nextDay=date=>new Date(Date.parse(date+'T00:00:00Z')+86400000).toISOString().slice(0,10);
const nightPrice=(order,date)=>{const rate=(order.nightlyRates||[]).find(r=>r.date===date);return amount(rate?rate.amount:order.nightly||0);};
const PRODUCTS=['room','bed','suite'];
const zeroProducts=()=>({room:0,bed:0,suite:0});
const addProducts=(a,b)=>({room:a.room+(b.room||0),bed:a.bed+(b.bed||0),suite:a.suite+(b.suite||0)});

// Which units can actually be sold on one night. A unit under maintenance or out of
// service is not sellable, and a unit inside a suite that is already sold is not
// sellable either, because selling it again would count the same space twice.
function sellableUnits(state,propertyId,date){
  const resources=(state.resources||[]).filter(r=>r.propertyId===propertyId&&!r.archived&&PRODUCTS.includes(r.productId));
  const blockedAtoms=new Set();
  for(const b of (state.blocks||[]))if(b.propertyId===propertyId&&excludesCapacity(b)&&date>=b.start&&date<b.end)for(const a of b.atoms||[])blockedAtoms.add(a);
  const suiteAtoms=new Set();
  for(const o of (state.orders||[])){
    if(o.propertyId!==propertyId||o.productId!=='suite'||!o.resourceId||!occupiesInventory(o))continue;
    if(!o.start||!o.end||!(date>=o.start&&date<o.end))continue;
    const res=resources.find(r=>r.id===o.resourceId);
    if(res)for(const a of res.atoms||[])suiteAtoms.add(a);
  }
  const sellable=[],outOfService=[],insideSuite=[];
  for(const r of resources){
    if((r.atoms||[]).some(a=>blockedAtoms.has(a))){outOfService.push(r);continue;}
    if(r.productId!=='suite'&&(r.atoms||[]).some(a=>suiteAtoms.has(a))){insideSuite.push(r);continue;}
    sellable.push(r);
  }
  return {resources,sellable,outOfService,insideSuite};
}

export function nightInventory(state,propertyId,date){
  const {sellable,outOfService,insideSuite}=sellableUnits(state,propertyId,date);
  const sold=zeroProducts(),revenue=zeroProducts(),unassigned=zeroProducts(),supply=zeroProducts();
  for(const r of sellable)supply[r.productId]++;
  const blocked=zeroProducts(),withinSuite=zeroProducts();
  for(const r of outOfService)blocked[r.productId]++;
  for(const r of insideSuite)withinSuite[r.productId]++;
  for(const o of (state.orders||[])){
    if(o.propertyId!==propertyId||!occupiesInventory(o)||o.hourly)continue;
    if(!o.start||!o.end||!(date>=o.start&&date<o.end))continue;
    const pid=PRODUCTS.includes(o.productId)?o.productId:'room',value=nightPrice(o,date);
    const unitId=roomAt(o,date),res=unitId?sellable.find(r=>r.id===unitId)||(state.resources||[]).find(r=>r.id===unitId):null;
    if(res)sold[pid]++;else unassigned[pid]++;
    revenue[pid]+=value;
  }
  return {date,supply,outOfService:blocked,insideSuite:withinSuite,sold,unassigned,revenue};
}

const sumProducts=o=>PRODUCTS.reduce((n,k)=>n+(o[k]||0),0);
const ratio=(a,b)=>b===0?null:a/b;
const label=(state,list,id,field='name')=>{const row=(state[list]||[]).find(r=>r.id===id);return row?row[field]||row.label||id:null;};

export function roomChargeDetail(state,q){
  const orders=scope(state,q),rows=[];
  for(const o of orders){
    for(const line of orderChargeLines(o).lines){
      if(line.kind!=='room'||!inRange(line.date,q))continue;
      rows.push({...line,channelOrderId:o.channelOrderId||'',roomTypeName:label(state,'roomTypes',o.roomTypeId),
        resourceLabel:label(state,'resources',roomAt(o,line.date),'label'),start:o.start||'',end:o.end||'',
        nights:(o.nightlyRates||stayDays(o.start,o.end)).filter(r=>inRange(r.date||r,q)).length,
        ratePlanId:o.ratePlanId||null});
    }
  }
  rows.sort((a,b)=>a.date.localeCompare(b.date)||a.orderId.localeCompare(b.orderId));
  const total=rows.reduce((n,r)=>n+r.amount,0),nightCount=rows.length;
  return {rows,total,nightCount,adr:ratio(total,nightCount)};
}

// Inventory belongs to the property, not to a booking channel, so no channel owns a
// share of sellable unit-nights. For the source dimension occupancy and RevPAR are
// reported as unavailable instead of being split by some invented rule.
const dimensionOfUnit=(dimension,unit,date)=>{
  if(dimension==='date')return date;
  if(dimension==='roomType')return unit.roomTypeId||'unspecified';
  if(dimension==='product')return unit.productId;
  if(dimension==='room')return unit.roomId||unit.id;
  return null;
};
export function roomBusinessSummary(state,q){
  const orders=scope(state,q),dimension=q.dimension||'date';
  if(!['date','roomType','product','source','room'].includes(dimension))throw Error('report_input');
  const keyOf=(order,resource,date)=>{
    if(dimension==='date')return date;
    if(dimension==='source')return order.source||'direct';
    const unit=resource||{productId:order.productId,roomTypeId:order.roomTypeId};
    return dimensionOfUnit(dimension,unit,date);
  };
  const buckets=new Map();
  const blank=()=>({sold:zeroProducts(),revenue:zeroProducts(),unassigned:zeroProducts(),supply:zeroProducts(),nights:0});
  const bucketFor=key=>{if(!buckets.has(key))buckets.set(key,{key,...blank()});return buckets.get(key);};
  for(const date of stayDays(q.from,nextDay(q.to))){
    const {sellable}=sellableUnits(state,q.propertyId,date);
    for(const o of orders){
      if(o.hourly||q.selectedIds&&!q.selectedIds.includes(o.id)||q.roomTypeId&&o.roomTypeId!==q.roomTypeId||!occupiesInventory(o)||!o.start||!o.end||!(date>=o.start&&date<o.end))continue;
      const resource=(state.resources||[]).find(r=>r.id===roomAt(o,date))||null;
      const bucket=bucketFor(keyOf(o,resource,date));
      const pid=PRODUCTS.includes(o.productId)?o.productId:'room',value=nightPrice(o,date);
      if(resource&&resource.propertyId===q.propertyId)bucket.sold[pid]++;else bucket.unassigned[pid]++;
      bucket.revenue[pid]+=value;
    }
    if(dimension==='source')continue; // no unit can be attributed to a channel
    for(const unit of sellable){
      if(q.roomTypeId&&unit.roomTypeId!==q.roomTypeId)continue;
      const key=dimensionOfUnit(dimension,unit,date);
      if(key===null)continue;
      const bucket=bucketFor(key);
      bucket.supply[unit.productId]++;
      bucket.nights++;
    }
  }
  const rows=[...buckets.values()].map(b=>{
    const revenue=sumProducts(b.revenue),sold=sumProducts(b.sold),unassigned=sumProducts(b.unassigned);
    const supplyNights=sumProducts(b.supply),available=dimension!=='source'&&(!q.source||q.source==='all')&&!q.planCode&&!q.customerId&&!q.createdFrom&&!q.createdTo&&!q.completedFrom&&!q.completedTo;
    return {key:b.key,revenue,sold,unassigned,totalSold:sold+unassigned,
      byProduct:PRODUCTS.map(pid=>({productId:pid,revenue:b.revenue[pid],sold:b.sold[pid],unassigned:b.unassigned[pid],
        supplyNights:b.supply[pid],adr:ratio(b.revenue[pid],b.sold[pid]+b.unassigned[pid]),
        occ:available?ratio(b.sold[pid]+b.unassigned[pid],b.supply[pid]):null,
        revpar:available?ratio(b.revenue[pid],b.supply[pid]):null})),
      adr:ratio(revenue,sold+unassigned),occ:available?ratio(sold+unassigned,supplyNights):null,
      revpar:available?ratio(revenue,supplyNights):null,supplyNights};
  }).sort((a,b)=>String(a.key).localeCompare(String(b.key)));
  const revenue=rows.reduce((n,r)=>n+r.revenue,0),sold=rows.reduce((n,r)=>n+r.totalSold,0);
  const supplyNights=rows.reduce((n,r)=>n+r.supplyNights,0),available=dimension!=='source';
  return {dimension,rows,occupancyAvailable:available,unassignedNights:rows.reduce((n,r)=>n+r.unassigned,0),
    totals:{revenue,sold,adr:ratio(revenue,sold),occ:available?ratio(sold,supplyNights):null,revpar:available?ratio(revenue,supplyNights):null,supplyNights}};
}

const MOVEMENTS=['create','assign','edit','lock','checkin','checkout','cancel','box_stays','restore_stays'];
function classify(a){
  const b=a.stayChange?.before||null,after=a.stayChange?.after||null;
  if(a.type==='cancel')return 'cancel';
  if(a.type==='assign')return b&&after&&b.resourceId!==after.resourceId?'room_change':'assign';
  if(a.type==='edit'){
    if(b&&after&&b.start!==after.start)return 'date_change';
    if(b&&after&&b.end&&after.end&&after.end<b.end)return 'early_departure';
    if(b&&after&&b.end&&after.end&&after.end>b.end)return 'late_departure';
    if(b&&after&&b.nightly!==after.nightly)return 'price_change';
    return 'edit';
  }
  if(a.type==='box_stays')return 'boxed';
  if(a.type==='restore_stays')return 'restored';
  if(a.type==='checkin')return 'checkin';
  if(a.type==='checkout')return 'checkout';
  if(a.type==='lock')return 'lock';
  return a.type;
}
export function roomMovementLog(state,q){
  if(!q||typeof q.propertyId!=='string'||!q.propertyId.trim()||!validDate(q.from)||!validDate(q.to)||q.from>q.to)throw Error('report_input');
  const rows=[];
  for(const a of (state.audit||[])){
    if(a.propertyId!==q.propertyId||!MOVEMENTS.includes(a.type))continue;
    const day=localDay(a.at);if(!day||day<q.from||day>q.to)continue;
    const order=(state.orders||[]).find(o=>o.id===a.orderId)||null;
    if(q.source&&q.source!=='all'&&order&&order.source!==q.source)continue;
    const before=a.stayChange?.before||null,after=a.stayChange?.after||null;
    rows.push({at:a.at,day,actor:a.actor||'local',type:a.type,movement:classify(a),orderId:a.orderId||null,
      guest:order?.guest||'',source:order?.source||'direct',channelOrderId:order?.channelOrderId||'',
      beforeRoom:before?label(state,'resources',before.resourceId,'label'):null,
      afterRoom:after?label(state,'resources',after.resourceId,'label'):null,
      beforeStart:before?.start||null,beforeEnd:before?.end||null,afterStart:after?.start||null,afterEnd:after?.end||null,
      beforeNightly:before?.nightly??null,afterNightly:after?.nightly??null,
      beforeCharge:before?.charge??null,afterCharge:after?.charge??null,
      beforeStatus:before?.status||null,afterStatus:after?.status||null,
      penalty:a.type==='cancel'?(order?.finalCharge??null):null,reason:a.stayChange?.reason||null});
  }
  rows.sort((x,y)=>y.at.localeCompare(x.at));
  const counts={};for(const r of rows)counts[r.movement]=(counts[r.movement]||0)+1;
  return {rows,counts,types:[...new Set(rows.map(r=>r.movement))].sort()};
}
// ---------------------------------------------------------------------------
// Other (non-room) charges and cancellation penalties. Both are earned on a
// business date, so both are cut on it; anything without one is unallocated
// instead of being pushed onto a day it did not happen.
// ---------------------------------------------------------------------------
const signedExtra=extra=>amount(extra.quantity*extra.unitAmount)*(extra.kind==='discount'?-1:1);
// A cancelled order, or one carrying a final charge, no longer bills its extra
// lines: the final charge replaced them. Listing them again would charge the
// same stay twice, so those orders are counted as superseded and named on the page.
const extrasBillable=order=>!isBoxed(order)&&order.status!=='cancelled'&&(order.finalCharge===undefined||order.finalCharge===null);
const emptyExtras=()=>({charge:0,discount:0,net:0,count:0});

export function extraChargeDetail(state,q){
  const orders=scope(state,q),rows=[],unallocated=[],byName=new Map(),daily=new Map();
  let superseded=0;
  for(const o of orders){
    if(!extrasBillable(o)){if((o.extraCharges||[]).length)superseded++;continue;}
    for(const extra of o.extraCharges||[]){
      const value=signedExtra(extra),quantity=amount(extra.quantity),unit=amount(extra.unitAmount);
      const row={orderId:o.id,reservationId:o.reservationId||null,guest:o.guest||'',source:o.source||'direct',
        channelOrderId:o.channelOrderId||'',roomTypeId:o.roomTypeId||'unspecified',
        roomTypeName:label(state,'roomTypes',o.roomTypeId),
        resourceLabel:label(state,'resources',o.resourceId,'label'),
        productId:o.productId||'unspecified',stayType:PRODUCTS.includes(o.productId)?o.productId:'room',
        name:extra.name||'',kind:extra.kind==='discount'?'discount':'charge',
        quantity,unitAmount:unit,amount:value,date:validDate(extra.businessDate)?extra.businessDate:null};
      if(!row.date){unallocated.push({...row,reason:'posting_date_missing'});continue;}
      if(!inRange(row.date,q))continue;
      rows.push(row);
      daily.set(row.date,(daily.get(row.date)||0)+value);
      const bucket=byName.get(row.name)||{name:row.name,chargeCount:0,charge:0,discountCount:0,discount:0,net:0,quantity:0};
      if(row.kind==='discount'){bucket.discountCount++;bucket.discount+=-value;bucket.quantity-=quantity;}
      else{bucket.chargeCount++;bucket.charge+=value;bucket.quantity+=quantity;}
      bucket.net+=value;
      byName.set(row.name,bucket);
    }
  }
  rows.sort((a,b)=>a.date.localeCompare(b.date)||a.name.localeCompare(b.name)||a.orderId.localeCompare(b.orderId));
  const totals=emptyExtras();
  for(const r of rows){totals.count++;if(r.kind==='discount')totals.discount+=-r.amount;else totals.charge+=r.amount;}
  totals.net=totals.charge-totals.discount;
  return {rows,unallocated,superseded,totals,
    daily:[...daily].map(([date,value])=>({date,amount:value})).sort((a,b)=>a.date.localeCompare(b.date)),
    names:[...byName.values()].sort((a,b)=>a.name.localeCompare(b.name))};
}

// What the stay would have cost if it had not been cancelled. It is the booked
// room nights plus the booked extras, never the penalty itself, so the share a
// penalty takes of the booking can be shown without inventing a policy outcome.
// Dates on old records are not always complete, so a missing range degrades to a
// blank total instead of throwing a reservation error from inside a report.
const nightCount=order=>Array.isArray(order.nightlyRates)&&order.nightlyRates.length?order.nightlyRates.length
  :validDate(order.start)&&validDate(order.end)&&order.end>order.start?Math.round((Date.parse(order.end)-Date.parse(order.start))/86400000):0;
const bookedTotal=order=>{
  const room=Array.isArray(order.nightlyRates)&&order.nightlyRates.length
    ?order.nightlyRates.reduce((n,r)=>n+amount(r.amount),0)
    :nightCount(order)*(order.nightly||0);
  const extras=(order.extraCharges||[]).reduce((n,e)=>n+signedExtra(e),0);
  return {room,extras,total:room+extras};
};
// The policy is stored as a snapshot on the order. The moment of cancellation was
// never recorded, so no fee is computed from it here: a "what the policy would have
// charged" column would be a guess for any flexible policy.
export function policySnapshot(order){
  const p=order?.cancellationPolicy;
  if(!p||typeof p!=='object')return {kind:null,percent:null,basis:null,days:null,time:null,deadline:null};
  if(!['manual','free','nonrefundable','partial','flexible'].includes(p.kind))return {kind:null,percent:null,basis:null,days:null,time:null,deadline:null};
  const out={kind:p.kind,percent:Number.isInteger(p.percent)?p.percent:null,
    basis:p.basis==='firstNight'||p.basis==='total'?p.basis:null,
    days:Number.isInteger(p.days)?p.days:null,
    time:typeof p.time==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(p.time)?p.time:null,deadline:null};
  if(out.kind==='flexible'&&out.days!==null&&out.time&&validDate(order.start)){
    const date=new Date(Date.parse(order.start+'T00:00:00Z')-out.days*86400000).toISOString().slice(0,10);
    out.deadline=`${date}T${out.time}:00+08:00`;
  }
  return out;
}
const cancelActor=(state,orderId)=>{const entry=(state.audit||[]).find(a=>a.type==='cancel'&&a.orderId===orderId);return entry?.actor||null;};

export function cancellationPenaltyDetail(state,q){
  const orders=scope(state,q),rows=[],unallocated=[],bySource=new Map(),daily=new Map();
  for(const o of orders){
    if(o.status!=='cancelled')continue;
    if(o.finalCharge===undefined||o.finalCharge===null)continue;
    const penalty=amount(o.finalCharge),booked=bookedTotal(o);
    const received=(o.transactions||[]).reduce((n,t)=>n+(t.kind==='payment'?amount(t.amount):t.kind==='refund'?-amount(t.amount):0),0);
    const row={orderId:o.id,reservationId:o.reservationId||null,guest:o.guest||'',source:o.source||'direct',
      channelOrderId:o.channelOrderId||'',roomTypeId:o.roomTypeId||'unspecified',
      roomTypeName:label(state,'roomTypes',o.roomTypeId),
      resourceLabel:label(state,'resources',o.resourceId,'label'),
      start:o.start||'',end:o.end||'',nights:nightCount(o),
      booked:booked.total,bookedRoom:booked.room,bookedExtras:booked.extras,penalty,
      share:booked.total===0?null:penalty/booked.total,
      received,reason:o.cancelReason||'',actor:cancelActor(state,o.id),
      policy:policySnapshot(o),date:validDate(o.cancelBusinessDate)?o.cancelBusinessDate:null};
    if(!row.date){unallocated.push({...row,reason:'posting_date_missing'});continue;}
    if(!inRange(row.date,q))continue;
    rows.push(row);
    daily.set(row.date,(daily.get(row.date)||0)+penalty);
    const bucket=bySource.get(row.source)||{source:row.source,count:0,penalty:0,booked:0};
    bucket.count++;bucket.penalty+=penalty;bucket.booked+=booked.total;
    bySource.set(row.source,bucket);
  }
  rows.sort((a,b)=>a.date.localeCompare(b.date)||a.orderId.localeCompare(b.orderId));
  const total=rows.reduce((n,r)=>n+r.penalty,0),booked=rows.reduce((n,r)=>n+r.booked,0);
  return {rows,unallocated,total,count:rows.length,booked,share:booked===0?null:total/booked,
    daily:[...daily].map(([date,value])=>({date,amount:value})).sort((a,b)=>a.date.localeCompare(b.date)),
    sources:[...bySource.values()].sort((a,b)=>a.source.localeCompare(b.source))};
}
// ---------------------------------------------------------------------------
// Occupants, registration completeness and channel commission.
// The occupant and registration pages read the stay records themselves: the
// booking contact, every name carried on the stay, and whether a room was ever
// assigned. The commission page has nothing to read. Orders carry no commission
// amount, no channel rate is configured anywhere and no settlement is ever
// received, so this page reports the gap - what was booked, what was received -
// and refuses to multiply revenue by a percentage nobody entered.
const GENDERS=['female','male','any'];
const occupantName=person=>typeof person==='object'&&person!==null&&typeof person.name==='string'?person.name.trim():'';
const genderOf=person=>GENDERS.includes(person?.gender)?person.gender:'any';
const paidOnOrder=order=>(order.transactions||[]).reduce((n,t)=>n+(t.kind==='payment'?amount(t.amount):t.kind==='refund'?-amount(t.amount):0),0);
// A stay occupies the nights in [start, end), so it touches the window when it
// starts no later than the last day and ends strictly after the first day.
const stayOverlaps=(order,q)=>validDate(order.start)&&validDate(order.end)&&order.start<=q.to&&order.end>q.from;
// These pages are about people, not money. Nothing here is earned on a business
// date that a night audit would move, so the stay carries its own booking dates
// and the window selects by arrival or by any night in the period.
const stayBasis=(order,q,basis)=>{
  if(basis==='overlap')return stayOverlaps(order,q)?(order.start<q.from?q.from:order.start):null;
  return validDate(order.start)&&inRange(order.start,q)?order.start:null;
};

export function roomOccupantDetail(state,q,{basis='arrival'}={}){
  if(!['arrival','overlap'].includes(basis))throw Error('report_input');
  const orders=scope(state,q),rows=[],byDay=new Map(),byGender=new Map(),byRoomType=new Map(),stayIds=new Set();
  let unnamed=0,nights=0;
  for(const o of orders){
    if(o.status==='cancelled')continue;
    const date=stayBasis(o,q,basis);
    if(!date)continue;
    const people=Array.isArray(o.occupants)?o.occupants:[];
    const counted=people.length?people:[{}];
    const resourceLabel=label(state,'resources',o.resourceId,'label');
    for(const person of counted){
      const name=occupantName(person);
      if(!name)unnamed++;
      const gender=genderOf(person);
      rows.push({orderId:o.id,reservationId:o.reservationId||null,guest:o.guest||'',occupant:name,
        gender,source:o.source||'direct',channelOrderId:o.channelOrderId||'',
        roomTypeId:o.roomTypeId||'unspecified',roomTypeName:label(state,'roomTypes',o.roomTypeId),
        resourceLabel,productId:o.productId||'unspecified',stayType:PRODUCTS.includes(o.productId)?o.productId:'room',
        status:o.status||'reserved',start:o.start||'',end:o.end||'',nights:nightCount(o),party:people.length,date});
      byDay.set(date,(byDay.get(date)||0)+1);
      byGender.set(gender,(byGender.get(gender)||0)+1);
    }
    const key=o.roomTypeId||'unspecified';
    let bucket=byRoomType.get(key);
    if(!bucket){bucket={key,roomTypeName:label(state,'roomTypes',o.roomTypeId),people:0,stays:0};byRoomType.set(key,bucket);}
    bucket.people+=counted.length;bucket.stays++;
    stayIds.add(o.id);nights+=nightCount(o);
  }
  rows.sort((a,b)=>a.date.localeCompare(b.date)||a.guest.localeCompare(b.guest)||a.occupant.localeCompare(b.occupant)||a.orderId.localeCompare(b.orderId));
  return {basis,rows,unnamed,totals:{people:rows.length,stays:stayIds.size,nights,unnamed},
    daily:[...byDay].map(([date,people])=>({date,people})).sort((a,b)=>a.date.localeCompare(b.date)),
    genders:[...byGender].map(([gender,people])=>({gender,people})).sort((a,b)=>b.people-a.people||a.gender.localeCompare(b.gender)),
    roomTypes:[...byRoomType.values()].sort((a,b)=>b.people-a.people||a.key.localeCompare(b.key))};
}

// Identity documents are encrypted on the server and are never decrypted into a
// report, so "registered" here can only ever mean what the stay record itself
// holds: a name was written down for that occupant. A missing name is reported
// as missing, not filled in from another stay.
export function registrationRecord(state,q,{basis='arrival'}={}){
  if(!['arrival','overlap'].includes(basis))throw Error('report_input');
  const orders=scope(state,q),rows=[];
  for(const o of orders){
    if(o.status==='cancelled')continue;
    const date=stayBasis(o,q,basis);
    if(!date)continue;
    const people=Array.isArray(o.occupants)?o.occupants:[];
    const expected=people.length,registered=people.filter(p=>occupantName(p)).length;
    rows.push({orderId:o.id,reservationId:o.reservationId||null,guest:o.guest||'',source:o.source||'direct',
      channelOrderId:o.channelOrderId||'',roomTypeId:o.roomTypeId||'unspecified',
      roomTypeName:label(state,'roomTypes',o.roomTypeId),
      resourceLabel:label(state,'resources',o.resourceId,'label'),
      productId:o.productId||'unspecified',stayType:PRODUCTS.includes(o.productId)?o.productId:'room',
      status:o.status||'reserved',start:o.start||'',end:o.end||'',nights:nightCount(o),date,
      expected,registered,missing:expected-registered,assigned:Boolean(o.resourceId),
      complete:expected>0&&registered===expected});
  }
  rows.sort((a,b)=>a.date.localeCompare(b.date)||a.guest.localeCompare(b.guest)||a.orderId.localeCompare(b.orderId));
  const totals=rows.reduce((t,r)=>({stays:t.stays+1,expected:t.expected+r.expected,registered:t.registered+r.registered,
    missing:t.missing+r.missing,incomplete:t.incomplete+(r.complete?0:1),unassigned:t.unassigned+(r.assigned?0:1)}),
    {stays:0,expected:0,registered:0,missing:0,incomplete:0,unassigned:0});
  return {basis,rows,totals};
}

// A channel commission is what the channel actually billed, recorded by finance
// from that invoice. No rate is configured and none is ever inferred: a stay with
// no recorded commission keeps its figures empty, so the page never prints a zero
// that would look like a real reconciliation.
export function commissionDetail(state,q){
  const orders=scope(state,q),rows=[],channels=new Map();
  let unallocated=0,recorded=0,commissionTotal=0;
  const recordedOn=o=>{const c=o.commission;return c&&Number.isSafeInteger(c.amount)&&c.amount>=0?c:null;};
  for(const o of orders){
    if(!validDate(o.start)||!inRange(o.start,q))continue;
    const {lines,unallocated:lost}=orderChargeLines(o);
    const pick=kind=>lines.filter(l=>l.kind===kind).reduce((n,l)=>n+l.amount,0);
    const room=pick('room'),penalty=pick('cancellation');
    const extras=lines.filter(l=>l.kind!=='room'&&l.kind!=='cancellation').reduce((n,l)=>n+l.amount,0);
    const charge=room+extras+penalty,paid=paidOnOrder(o);
    unallocated+=lost.reduce((n,l)=>n+l.amount,0);
    const entry=recordedOn(o),commission=entry?amount(entry.amount):null;
    if(commission!==null){recorded++;commissionTotal+=commission;}
    const row={orderId:o.id,reservationId:o.reservationId||null,guest:o.guest||'',source:o.source||'direct',
      channelOrderId:o.channelOrderId||'',roomTypeId:o.roomTypeId||'unspecified',
      roomTypeName:label(state,'roomTypes',o.roomTypeId),
      resourceLabel:label(state,'resources',o.resourceId,'label'),
      status:o.status||'reserved',start:o.start||'',end:o.end||'',nights:nightCount(o),
      room,extras,penalty,charge,paid,outstanding:charge-paid-folioTransferCredit(o),
      commission,commissionRecorded:commission!==null,
      settlement:entry?(entry.settledAt?'settled':'recorded'):'unrecorded',
      commissionReference:entry?.reference||'',commissionNote:entry?.note||'',commissionAt:entry?.at||'',commissionPeriod:commissionPeriod(entry)};
    rows.push(row);
    let bucket=channels.get(row.source);
    if(!bucket){bucket={source:row.source,orders:0,nights:0,room:0,charge:0,paid:0,outstanding:0,commission:null,recorded:0,unrecorded:0,settled:0};channels.set(row.source,bucket);}
    bucket.orders++;bucket.nights+=row.nights;bucket.room+=room;bucket.charge+=charge;
    bucket.paid+=paid;bucket.outstanding+=row.outstanding;
    if(commission!==null){bucket.commission=(bucket.commission||0)+commission;bucket.recorded++;if(row.settlement==='settled')bucket.settled++;}
    else bucket.unrecorded++;
  }
  rows.sort((a,b)=>a.start.localeCompare(b.start)||a.guest.localeCompare(b.guest)||a.orderId.localeCompare(b.orderId));
  const totals=rows.reduce((t,r)=>({orders:t.orders+1,nights:t.nights+r.nights,room:t.room+r.room,charge:t.charge+r.charge,
    paid:t.paid+r.paid,outstanding:t.outstanding+r.outstanding}),{orders:0,nights:0,room:0,charge:0,paid:0,outstanding:0});
  totals.commission=recorded?commissionTotal:null;
  return {rows,channels:[...channels.values()].sort((a,b)=>a.source.localeCompare(b.source)),
    totals,recorded,unrecorded:rows.length-recorded,unallocated};
}
export function cashflowReport(state,q){if(!q)throw Error('report_input');if(q.operator!==undefined&&q.operator!=='all'&&q.operator!=='unknown'&&!(typeof q.operator==='string'&&q.operator.startsWith('actor:')&&q.operator.length>6&&q.operator.length<=512))throw Error('report_input');if(q.transactionKind&&!['all','payment','refund','deposit_in','deposit_out'].includes(q.transactionKind))throw Error('report_input');const counts={payment:0,refund:0,deposit_in:0,deposit_out:0};const orders=scope(state,q),rows=[],totals={payment:0,refund:0,deposit_in:0,deposit_out:0,netAccommodation:0,netDeposit:0},byMethod=new Map();for(const o of orders)for(const tr of o.transactions||[]){if(!['payment','refund','deposit_in','deposit_out'].includes(tr.kind))continue;if(q.operator==='unknown'&&tr.actor||q.operator?.startsWith('actor:')&&tr.actor!==q.operator.slice(6))continue;if(q.transactionKind&&q.transactionKind!=='all'&&tr.kind!==q.transactionKind||q.method&&q.method!=='all'&&(tr.method||'unspecified')!==q.method)continue;const date=localDay(tr.at);if(!date||!inRange(date,q))continue;const value=amount(tr.amount);if(value<0)throw Error('report_amount');rows.push({orderId:o.id,reservationId:o.reservationId||null,guest:o.guest||'',source:o.source||'direct',...tr,date});totals[tr.kind]+=value;counts[tr.kind]++;const method=tr.method||'unspecified';if(!byMethod.has(method))byMethod.set(method,{method,counts:{payment:0,refund:0,deposit_in:0,deposit_out:0},payment:0,refund:0,deposit_in:0,deposit_out:0,netAccommodation:0,netDeposit:0});byMethod.get(method)[tr.kind]+=value;byMethod.get(method).counts[tr.kind]++;}for(const t of [totals,...byMethod.values()]){t.netAccommodation=t.payment-t.refund;t.netDeposit=t.deposit_in-t.deposit_out;}rows.sort((a,b)=>a.at.localeCompare(b.at));return {rows,totals,counts,methods:[...byMethod.values()].sort((a,b)=>a.method.localeCompare(b.method))};}

export function accommodationBreakdown(state,q,dimension='date'){if(!['date','source','roomTypeId'].includes(dimension))throw Error('report_dimension');const report=accommodationReport(state,q),groups=new Map();for(const r of report.rows){const key=r[dimension]||'unspecified';if(!groups.has(key))groups.set(key,{key,total:0,roomFee:0,extras:0,unitNights:0,orderIds:[]});const g=groups.get(key);g.total+=r.amount;if(r.kind==='room'){g.roomFee+=r.amount;g.unitNights++;}else g.extras+=r.amount;if(!g.orderIds.includes(r.orderId))g.orderIds.push(r.orderId);}return {...report,dimension,groups:[...groups.values()].sort((a,b)=>a.key.localeCompare(b.key))};}

export function defaultComparisonPeriods(from,to){if(!validDate(from)||!validDate(to)||from>to)throw Error('report_input');return {current:{from,to},month:{from:comparisonDay(from,-1),to:comparisonDay(to,-1)},year:{from:comparisonDay(from,0,-1),to:comparisonDay(to,0,-1)}};}
export function financialComparison(state,{propertyId,source='all',periods}={}){if(!periods||!['current','month','year'].every(k=>periods[k]))throw Error('report_input');const results={};for(const key of ['current','month','year']){const q={...periods[key],propertyId,source},business=accommodationReport(state,q),cash=cashflowReport(state,q);results[key]={from:q.from,to:q.to,unallocatedCharges:business.unallocatedCharges,values:{revenue:business.total,roomFee:business.rows.filter(r=>r.kind==='room').reduce((s,r)=>s+r.amount,0),extras:business.rows.filter(r=>r.kind!=='room').reduce((s,r)=>s+r.amount,0),unitNights:business.rows.filter(r=>r.kind==='room').length,...cash.totals}};}const changes={};for(const key of ['month','year']){changes[key]={};for(const metric of Object.keys(results.current.values)){const now=results.current.values[metric],before=results[key].values[metric];changes[key][metric]={delta:now-before,percent:before===0?null:(now-before)/Math.abs(before)*100};}}return {periods:results,changes};}

export function receivableReports(state,q){
  scope(state,q);
  const ar=replayReceivables(state,q);
  const guest=guestLedger(state,{propertyId:q.propertyId,date:q.to}).rows;
  const accrual=accommodationReport(state,q);
  const orders=new Map(state.orders.filter(o=>o.propertyId===q.propertyId).map(o=>[o.id,o]));
  return {...ar,guest,
    accrual:accrual.rows,unallocated:accrual.unallocatedCharges,
    orderName:id=>orders.get(id)?.guest||id};
}

// Read-only parity workbench. Every view consumes the same scoped state in demo
// and SQLite modes. No view records money, changes inventory, or repairs history.
import {rateAvailability} from './rate-availability.js';
import {saleResources} from './catalog.js';
import {folio,directoryEntries,customerLinks} from './demo-store.js';
export const parityKinds=['dailyInventory','futureInventory','housekeepingCalendar','housekeepingList','rateHistory','customerDetails','revenueSummary','transactionSummary','channelSummary','salesSummary','accommodationSummary','quickNoteSummary','invoice','mealRedemption','mealSummary','holidays','inspections','failedReservations','shiftAccrual','managerBusiness','ledgerRecords','accrualOperating','guestBalances','transactionDetail','customerProfiles','quickEntries','hourlyReservations'];
export function parityReport(state,q){
 const orders=scope(state,q);
 if(!parityKinds.includes(q.kind))throw Error('report_input');
 const span=(Date.parse(q.to)-Date.parse(q.from))/86400000+1;
 if(span>366||(['dailyInventory','futureInventory','housekeepingCalendar'].includes(q.kind)&&span>31))throw Error('report_range');
 const days=[];for(let d=q.from;d<=q.to;d=nextDay(d))days.push(d);
 for(const key of ['createdFrom','createdTo','completedFrom','completedTo'])if(q[key]&&!validDate(q[key]))throw Error('report_input');
 if(q.createdFrom&&q.createdTo&&q.createdFrom>q.createdTo||q.completedFrom&&q.completedTo&&q.completedFrom>q.completedTo)throw Error('report_input');
 const links=customerLinks(state,q.propertyId);
 const selected=orders.filter(o=>(!q.roomTypeId||o.roomTypeId===q.roomTypeId)&&(!q.status||!['revenueSummary','transactionSummary','channelSummary','salesSummary','accommodationSummary','ledgerRecords','customerProfiles','hourlyReservations','transactionDetail','quickEntries','managerBusiness','shiftAccrual'].includes(q.kind)||o.status===q.status)&&(!q.resourceId||o.resourceId===q.resourceId)&&(!q.planCode||o.ratePlanCode===q.planCode)&&(!q.customerId||links.get(o.id)===q.customerId)&&(!q.createdFrom||localDay(o.createdAt)>=q.createdFrom)&&(!q.createdTo||!!o.createdAt&&localDay(o.createdAt)<=q.createdTo)&&(!q.completedFrom||!!o.completedAt&&localDay(o.completedAt)>=q.completedFrom)&&(!q.completedTo||!!o.completedAt&&localDay(o.completedAt)<=q.completedTo));
 const allSource=!q.source||q.source==='all';
 let columns=[],rows=[],unallocated=0;
 if(['dailyInventory','futureInventory'].includes(q.kind)){
  if(!validDate(q.businessDate))throw Error('report_input');
  columns=['date','roomTypeId','productId','capacity','sellable','occupied','staying','departing','arriving','unassigned','boxed','cancelled','hold','maintenance','outOfService','linkedClosed','clean','dirty','available','channelOccupied'];
  const dates=q.kind==='dailyInventory'?[q.from]:days;
  const allOrders=state.orders.filter(o=>o.propertyId===q.propertyId);
  for(const date of dates)for(const type of (state.roomTypes||[]).filter(r=>r.propertyId===q.propertyId&&!r.archived&&(!q.roomTypeId||r.id===q.roomTypeId))){
   const resources=saleResources(state,q.propertyId).filter(r=>r.roomTypeId===type.id),stays=allOrders.filter(o=>o.roomTypeId===type.id),active=stays.filter(o=>occupiesInventory(o)&&o.start<=date&&(o.end>date||o.status==='checked_in'&&o.end<=q.businessDate&&date>=q.businessDate));
   const blocks=(state.blocks||[]).filter(b=>b.propertyId===q.propertyId&&b.start<=date&&b.end>date);
   const blocked=(r,kind)=>blocks.some(b=>(b.blockType||'maintenance')===kind&&r.atoms.some(a=>b.atoms.includes(a)));
   const shared=resources.filter(r=>allOrders.some(o=>o.resourceId!==r.id&&occupiesInventory(o)&&o.start<=date&&(o.end>date||o.status==='checked_in'&&o.end<=q.businessDate&&date>=q.businessDate)&&saleResources(state,q.propertyId).some(u=>u.id===o.resourceId&&u.atoms.some(a=>r.atoms.includes(a)))));
   const units=list=>new Set(list.map(o=>o.resourceId||o.id)).size;
   rows.push({date,roomTypeId:type.id,productId:type.productId,capacity:resources.length,sellable:resources.filter(r=>!blocked(r,'maintenance')&&!blocked(r,'out_of_service')&&!shared.includes(r)).length,occupied:units(active),staying:units(active.filter(o=>o.end!==date)),departing:stays.filter(o=>!isBoxed(o)&&o.status!=='cancelled'&&o.end===date).length,arriving:stays.filter(o=>occupiesInventory(o)&&o.start===date).length,unassigned:active.filter(o=>!o.resourceId).length,boxed:stays.filter(o=>isBoxed(o)&&o.start<=date&&o.end>date).length,cancelled:stays.filter(o=>o.status==='cancelled'&&o.start<=date&&o.end>date).length,hold:resources.filter(r=>blocked(r,'hold')).length,maintenance:resources.filter(r=>blocked(r,'maintenance')).length,outOfService:resources.filter(r=>blocked(r,'out_of_service')).length,linkedClosed:shared.length,clean:resources.filter(r=>r.cleaning==='clean').length,dirty:resources.filter(r=>r.cleaning==='dirty').length,available:rateAvailability(state,q.propertyId,type.id,date,q.businessDate),channelOccupied:allSource?units(active):units(active.filter(o=>o.source===q.source))});
  }
 }else if(['housekeepingCalendar','housekeepingList'].includes(q.kind)){
  if(!allSource)throw Error('report_input');
  columns=['date','roomTypeId','resourceId','cleaning','arrivals','departures','tasks','assignees','lastInspection','inspectionPassed'];
  for(const date of q.kind==='housekeepingList'?['']:days)for(const r of saleResources(state,q.propertyId).filter(r=>!q.roomTypeId||r.roomTypeId===q.roomTypeId)){
   const stays=selected.filter(o=>o.resourceId===r.id&&!isBoxed(o)&&o.status!=='cancelled');
   const tasks=housekeepingTasks(state,q.propertyId).filter(t=>t.resourceId===r.id&&(!date||t.date===date)),inspection=(state.operationsHistory||[]).filter(i=>i.propertyId===q.propertyId&&i.resourceId===r.id&&i.type==='inspection_record'&&(!date||i.businessDate===date)).at(-1);
   rows.push({date,roomTypeId:r.roomTypeId,resourceId:r.id,cleaning:date?'':r.cleaning||'',arrivals:date?stays.filter(o=>o.start===date).length:'',departures:date?stays.filter(o=>o.end===date).length:'',tasks:tasks.map(t=>t.taskId+':'+t.status).join(' / '),assignees:[...new Set(tasks.map(t=>t.assignee).filter(Boolean))].join(' / '),lastInspection:inspection?.at||'',inspectionPassed:inspection?inspection.results.every(i=>i.passed):''});
  }
 }else if(q.kind==='rateHistory'){
  columns=['date','at','actor','batchId','roomTypeId','planCode','before','after'];
  rows=(state.rateChanges||[]).filter(r=>r.propertyId===q.propertyId&&inRange(r.after.date,q)&&(!q.roomTypeId||r.after.roomTypeId===q.roomTypeId)).map(r=>({date:r.after.date,at:r.at,actor:r.actor,batchId:r.batchId,roomTypeId:r.after.roomTypeId,planCode:r.after.planCode,before:r.before?JSON.stringify(r.before):'',after:JSON.stringify(r.after)}));
 }else if(q.kind==='customerDetails'){
  columns=['orderId','guest','phone','email','country','tags','start','end','status','charge','paid','due','deposit'];
  rows=selected.filter(o=>o.start<=q.to&&o.end>=q.from).map(o=>({orderId:o.id,guest:o.guest,phone:o.phone||'',email:o.email||'',country:o.country||'',tags:activeStayTags(state,q.propertyId,o.id).join(' / '),start:o.start,end:o.end,status:o.status,...folio(o)}));
 }else if(q.kind==='revenueSummary'||q.kind==='channelSummary'){
  const report=accommodationBreakdown({...state,orders:selected},{...q,propertyId:q.propertyId},q.kind==='channelSummary'?'source':'date');unallocated=report.unallocatedCharges.length;
  columns=['key','total','roomFee','extras','unitNights'];rows=report.groups;
 }else if(q.kind==='transactionSummary'){
  const report=cashflowReport({...state,orders:selected},q);columns=['method','payment','refund','deposit_in','deposit_out','netAccommodation','netDeposit'];rows=report.methods;
 }else if(q.kind==='salesSummary'){
  columns=['bookingKind','companyName','total','unitNights'];const groups=new Map();
  for(const o of selected){const parent=(state.reservations||[]).find(r=>r.id===o.reservationId&&r.propertyId===q.propertyId);const bookingKind=parent?.bookingKind||'',companyName=parent?.companyName||'';const key=JSON.stringify([bookingKind,companyName]);
   for(const line of orderChargeLines(o).lines.filter(r=>inRange(r.date,q))){const g=groups.get(key)||{bookingKind,companyName,total:0,unitNights:0};g.total+=line.amount;if(line.kind==='room')g.unitNights++;groups.set(key,g);}
   unallocated+=orderChargeLines(o).unallocated.length;
  }rows=[...groups.values()];
 }else if(q.kind==='accommodationSummary'){
  const dim={roomTypeId:'roomType',productId:'product',resourceId:'room'}[q.dimension]||q.dimension||'date';
  const report=roomBusinessSummary(state,{...q,dimension:dim,selectedIds:selected.map(o=>o.id)});columns=['key','productId','revenue','soldNights','sellableNights','occupancy','adr','revpar'];
  rows=report.rows.flatMap(r=>r.byProduct.map(p=>({key:r.key,productId:p.productId,revenue:p.revenue,soldNights:p.sold+p.unassigned,sellableNights:p.supplyNights,occupancy:p.occ??'',adr:p.adr??'',revpar:p.revpar??''}))); // retain product and atom-aware denominators
 }else if(q.kind==='quickNoteSummary'){
  columns=['businessDate','at','actor','text'];rows=(state.memoHistory||[]).filter(r=>r.propertyId===q.propertyId&&inRange(r.businessDate,q));
  unallocated=(state.memoHistory||[]).filter(r=>r.propertyId===q.propertyId&&!validDate(r.businessDate)).length;
 }else if(q.kind==='invoice'){
  columns=['orderId','date','kind','name','amount','charge','paid','due','deposit','heading','footer'];
  for(const o of selected.filter(o=>o.start<=q.to&&o.end>=q.from)){
   const report=orderChargeLines(o);unallocated+=report.unallocated.length;
   for(const line of report.lines)rows.push({...line,name:line.name||''});
   const template=directoryEntries(state,q.propertyId,'invoiceTemplate').filter(r=>r.active).at(-1);rows.push({orderId:o.id,kind:'folio',...folio(o),heading:template?.heading||'',footer:template?.footer||''});
  }
 }
 if(['mealRedemption','mealSummary'].includes(q.kind)){
  columns=['usageDate','orderId','mealId','name','category','pricingMethod','consumptionTiming','quantity','redeemed','remaining','unitAmount','source','roomTypeId','resourceId','status'];
  rows=mealEntitlements(state,q.propertyId).filter(e=>inRange(e.usageDate,q)).flatMap(e=>{const o=selected.find(o=>o.id===e.orderId);return o?[{...e,source:o.source,roomTypeId:o.roomTypeId,resourceId:o.resourceId,status:o.status}]:[];});
  if(q.kind==='mealSummary'){columns=['usageDate','mealId','name','quantity','redeemed','remaining'];const groups=new Map();for(const r of rows){const key=r.usageDate+'|'+r.mealId,g=groups.get(key)||{...r,quantity:0,redeemed:0,remaining:0};for(const k of ['quantity','redeemed','remaining'])g[k]+=r[k];groups.set(key,g);}rows=[...groups.values()];}
 }else if(q.kind==='holidays'){
  columns=['date','name','eventType','source','heat','active','actor','at'];rows=directoryEntries(state,q.propertyId,'holiday').filter(r=>inRange(r.date,q));
 }else if(q.kind==='inspections'){
  columns=['businessDate','at','actor','resourceId','name','passed','note'];rows=(state.operationsHistory||[]).filter(r=>r.propertyId===q.propertyId&&r.type==='inspection_record'&&inRange(r.businessDate,q)).flatMap(r=>r.results.map(i=>({...r,...i})));unallocated=(state.operationsHistory||[]).filter(r=>r.propertyId===q.propertyId&&r.type==='inspection_record'&&!r.businessDate).length;
 }else if(q.kind==='failedReservations'){
  columns=['date','requestId','source','status','reason','start','end'];
  rows=(state.bookingRequests||[]).filter(r=>r.propertyId===q.propertyId&&['declined','failed','expired','withdrawn'].includes(r.status)).map(r=>({date:localDay(r.decidedAt||r.createdAt),requestId:r.id,source:'website',status:r.status,reason:r.decisionNote||r.reason||'',start:r.start,end:r.end})).filter(r=>inRange(r.date,q));
  rows.push(...(state.operationsHistory||[]).filter(r=>r.propertyId===q.propertyId&&r.type==='reservation_failure_record'&&inRange(r.date,q)).map(r=>({...r,requestId:r.reference})));
 }else if(['shiftAccrual','managerBusiness','ledgerRecords','accrualOperating','guestBalances'].includes(q.kind)){
  columns=['businessDate','orderId','source','roomTypeId','kind','amount','method','actor','at','localDate'];
  const charges=selected.flatMap(o=>orderChargeLines(o).lines).filter(r=>inRange(r.date,q));
  const transactions=selected.flatMap(o=>(o.transactions||[]).map(t=>({...t,orderId:o.id,source:o.source,roomTypeId:o.roomTypeId,localDate:t.at?localDay(t.at):''})));
  unallocated=selected.reduce((n,o)=>n+orderChargeLines(o).unallocated.length,0)+transactions.filter(t=>!validDate(t.businessDate)).length;
  rows=charges.map(r=>({...r,businessDate:r.date}));
  rows.push(...transactions.filter(t=>inRange(t.businessDate,q)));
  for(const o of selected)for(const m of o.arMoves||[])if(inRange(m.businessDate,q))rows.push({...m,orderId:o.id,source:o.source,roomTypeId:o.roomTypeId,kind:'ar_transfer'});
  for(const o of selected)for(const m of o.folioTransfers||[])if(inRange(m.businessDate,q))rows.push({...m,orderId:o.id,source:o.source,roomTypeId:o.roomTypeId,kind:'folio_transfer'});
  if(q.actor)rows=rows.filter(r=>r.actor===q.actor);
  if(q.method)rows=rows.filter(r=>r.method===q.method);
  if(q.shiftTypeId){const windows=(state.handovers||[]).filter(h=>h.propertyId===q.propertyId&&h.shiftTypeId===q.shiftTypeId);rows=rows.filter(r=>r.at&&windows.some(h=>Date.parse(r.at)>=Date.parse(h.from)&&Date.parse(r.at)<Date.parse(h.to)));}
  if(q.kind==='shiftAccrual'||q.kind==='managerBusiness'){
   const complete=(state.receptionHistory||[]).filter(a=>a.propertyId===q.propertyId),ids=new Set(complete.map(a=>a.id));
   rows.push(...[...complete,...(state.audit||[]).filter(a=>!ids.has(a.id))].filter(a=>a.propertyId===q.propertyId&&inRange(a.postingBusinessDate,q)&&(!q.actor||a.actor===q.actor)&&['create','create_reservation','create_hourly','checkin','checkout','cancel','undo_checkin','undo_checkout','restore_cancel'].includes(a.type)&&(a.orderId?selected.some(o=>o.id===a.orderId):a.reservationId?selected.some(o=>o.reservationId===a.reservationId):!q.roomTypeId&&allSource&&!q.status)).map(a=>({...a,businessDate:a.postingBusinessDate,kind:'reception:'+a.type})));
  }
  if(q.kind==='guestBalances'){
   columns=['orderId','source','roomTypeId','opening','charge','paid','ar','folioCredit','closing','deposit'];
   rows=selected.map(o=>{const balance=d=>{let charge=0,paid=0,deposit=0,ar=0,folioCredit=0;for(const l of orderChargeLines(o).lines)if(l.date<=d)charge+=l.amount;for(const t of o.transactions||[])if(validDate(t.businessDate)&&t.businessDate<=d){if(t.kind==='payment')paid+=t.amount;if(t.kind==='refund')paid-=t.amount;if(t.kind==='deposit_in')deposit+=t.amount;if(t.kind==='deposit_out')deposit-=t.amount;}for(const m of o.arMoves||[])if(m.businessDate<=d)ar+=m.amount;folioCredit=folioTransferCredit(o,date=>date<=d);return {charge,paid,ar,folioCredit,due:charge-paid-ar-folioCredit,deposit};};const a=balance(previousDay(q.from)),b=balance(q.to);return {orderId:o.id,source:o.source,roomTypeId:o.roomTypeId,opening:a.due,charge:b.charge-a.charge,paid:b.paid-a.paid,ar:b.ar-a.ar,folioCredit:b.folioCredit-a.folioCredit,closing:b.due,deposit:b.deposit};});
  }
 }

 if(q.kind==='rateHistory'){
  if(q.operationFrom&&!validDate(q.operationFrom)||q.operationTo&&!validDate(q.operationTo))throw Error('report_input');
  rows=rows.filter(r=>(!q.operationFrom||localDay(r.at)>=q.operationFrom)&&(!q.operationTo||localDay(r.at)<=q.operationTo)&&(!q.planCode||r.planCode===q.planCode)&&(!q.actor||r.actor===q.actor)&&(!q.adjustmentItem||JSON.parse(r.before||'{}')[q.adjustmentItem]!==JSON.parse(r.after)[q.adjustmentItem]));
 }
 if(['shiftAccrual','managerBusiness'].includes(q.kind)){
  if(q.shiftTypeId){const windows=(state.handovers||[]).filter(h=>h.propertyId===q.propertyId&&h.shiftTypeId===q.shiftTypeId);rows=rows.filter(r=>r.at&&windows.some(h=>Date.parse(r.at)>=Date.parse(h.from)&&Date.parse(r.at)<Date.parse(h.to)));}
  if(q.lineKind&&q.section!=='handoverWindows')rows=rows.filter(r=>r.kind===q.lineKind);
  if(['actorSummary','sourceSummary'].includes(q.section)){
   const dimension=q.section==='actorSummary'?'actor':'source';columns=[dimension,'transactions','payments','refunds','depositIn','depositOut','netReceipts','depositNet'];
   const groups=new Map();for(const r of rows.filter(r=>['payment','refund','deposit_in','deposit_out'].includes(r.kind))){const value=r[dimension]||'',g=groups.get(value)||{[dimension]:value,transactions:0,payments:0,refunds:0,depositIn:0,depositOut:0,netReceipts:0,depositNet:0};g.transactions++;g[({payment:'payments',refund:'refunds',deposit_in:'depositIn',deposit_out:'depositOut'})[r.kind]]+=r.amount;g.netReceipts=g.payments-g.refunds;g.depositNet=g.depositIn-g.depositOut;groups.set(value,g);}rows=[...groups.values()];
  }else if(q.section==='cashierSummary'){
   columns=['kind','method','amount'];const groups=new Map();for(const r of rows.filter(r=>['payment','refund','deposit_in','deposit_out'].includes(r.kind))){const key=JSON.stringify([r.kind,r.method]),g=groups.get(key)||{kind:r.kind,method:r.method,amount:0};g.amount+=r.amount;groups.set(key,g);}rows=[...groups.values()];
  }else if(q.section==='receptionSummary'){
   columns=['actor','kind','transactions'];const groups=new Map();for(const r of rows.filter(r=>r.kind?.startsWith('reception:'))){const key=JSON.stringify([r.actor,r.kind]),g=groups.get(key)||{actor:r.actor||'',kind:r.kind,transactions:0};g.transactions++;groups.set(key,g);}rows=[...groups.values()];
  }else if(q.section==='reception'){
   columns=['businessDate','at','actor','orderId','reservationId','kind'];rows=rows.filter(r=>r.kind?.startsWith('reception:'));
  }else if(q.section==='handoverWindows'){
   columns=['businessDate','shiftName','actor','operator','from','to','at'];rows=(state.handovers||[]).filter(h=>h.propertyId===q.propertyId&&inRange(h.businessDate,q)&&(!q.shiftTypeId||h.shiftTypeId===q.shiftTypeId)&&(!q.actor||h.actor===q.actor));
  }else if(q.section==='roomCards'){
   columns=['status'];rows=[{status:'room_card_not_connected'}];
  }else rows=rows.filter(r=>!r.kind?.startsWith('reception:'));
 }
 if(q.kind==='accrualOperating'){
  const first=q.to.slice(0,7)+'-01';
  const month=parityReport(state,{...q,kind:'ledgerRecords',from:first,to:q.to,search:'',section:''});
  const groups=new Map();for(const [list,key] of [[rows,'periodAmount'],[month.rows,'monthAmount']])for(const r of list){if(!r.kind)continue;const side=['payment','refund','ar_transfer','folio_transfer'].includes(r.kind)?'credit':['deposit_in','deposit_out'].includes(r.kind)?'deposit':'debit',id=side+'|'+r.kind+'|'+(r.method||''),g=groups.get(id)||{side,kind:r.kind,method:r.method||'',periodAmount:0,monthAmount:0};g[key]+=(['refund','deposit_out'].includes(r.kind)?-1:1)*(r.amount||0);groups.set(id,g);}columns=['side','kind','method','periodAmount','monthAmount'];rows=[...groups.values()];
 }
 if(q.kind==='ledgerRecords'&&q.section==='staySummary'){
  columns=['orderId','source','roomTypeId','guest','start','end','status','charge','paid','deposit','due','ar','createdAt','createdBy','completedAt'];
  rows=selected.filter(o=>o.start<=q.to&&o.end>=q.from).map(o=>({orderId:o.id,source:o.source,roomTypeId:o.roomTypeId,guest:o.guest,start:o.start,end:o.end,status:o.status,...folio(o),ar:(o.arMoves||[]).reduce((n,m)=>n+m.amount,0),createdAt:o.createdAt,createdBy:o.createdBy}));
 }

 if(['revenueSummary','channelSummary','salesSummary','transactionSummary'].includes(q.kind)&&(q.dimension||q.dimension2||q.lineKind||q.actor||q.method)){
  const dimensions=['date','source','roomTypeId','productId','resourceId','ratePlanCode','bookingKind','companyName','country','createdBy','actor','method','category'];
  const dimension=q.dimension||({channelSummary:'source',salesSummary:'bookingKind',transactionSummary:'method'}[q.kind]||'date');
  if(!dimensions.includes(dimension)||q.dimension2&&!dimensions.includes(q.dimension2))throw Error('report_input');
  const cash=q.kind==='transactionSummary',groups=new Map();unallocated=0;
  columns=['key','key2',...(cash?['payment','refund','deposit_in','deposit_out','netAccommodation','netDeposit','count']:['total','roomFee','extras','unitNights','count'])];
  for(const o of selected){const parent=(state.reservations||[]).find(r=>r.propertyId===q.propertyId&&r.id===o.reservationId),base={...o,bookingKind:parent?.bookingKind||'',companyName:parent?.companyName||''};
   const lines=cash?(o.transactions||[]).map(t=>({...t,date:t.at?localDay(t.at):''})):orderChargeLines(o).lines;
   unallocated+=cash?lines.filter(l=>!validDate(l.date)).length:orderChargeLines(o).unallocated.length;
   for(const l of lines.filter(l=>inRange(l.date,q)&&(!q.actor||l.actor===q.actor)&&(!q.method||l.method===q.method)&&(!q.lineKind||l.kind===q.lineKind))){
    const history=(state.completionHistory||[]).find(r=>r.propertyId===q.propertyId&&r.id===l.id&&r.type==='quick_entry');
    const value=d=>d==='date'?l.date:d==='actor'||d==='method'?l[d]||'':d==='category'?history?.name||'':base[d]||'';
    const key=value(dimension),key2=q.dimension2?value(q.dimension2):'',id=JSON.stringify([key,key2]);
    const g=groups.get(id)||{key,key2,total:0,roomFee:0,extras:0,unitNights:0,payment:0,refund:0,deposit_in:0,deposit_out:0,netAccommodation:0,netDeposit:0,count:0};g.count++;
    if(cash){if(['payment','refund','deposit_in','deposit_out'].includes(l.kind))g[l.kind]+=l.amount;g.netAccommodation=g.payment-g.refund;g.netDeposit=g.deposit_in-g.deposit_out;}
    else{g.total+=l.amount;if(l.kind==='room'){g.roomFee+=l.amount;g.unitNights++;}else g.extras+=l.amount;}
    groups.set(id,g);
   }
  }rows=[...groups.values()].sort((a,b)=>String(a.key).localeCompare(String(b.key))||String(a.key2).localeCompare(String(b.key2)));
 }
 if(q.kind==='transactionDetail'){
  columns=['id','orderId','guest','source','roomTypeId','kind','amount','method','actor','at','localDate','businessDate','reference','note'];
  const transactions=selected.flatMap(o=>(o.transactions||[]).map(t=>({...t,orderId:o.id,guest:o.guest,source:o.source,roomTypeId:o.roomTypeId,localDate:t.at?localDay(t.at):''})));
  rows=transactions.filter(t=>inRange(t.localDate,q)&&(!q.actor||t.actor===q.actor)&&(!q.method||t.method===q.method));unallocated=transactions.filter(t=>!validDate(t.localDate)).length;
 }
 if(q.kind==='hourlyReservations'){
  columns=['orderId','guest','roomTypeId','resourceId','usageDate','startTime','endTime','hours','name','charge','paid','due','deposit','status','inventoryPolicy','createdAt','completedAt'];
  rows=selected.filter(o=>o.hourly&&inRange(o.hourly.usageDate,q)).map(o=>({...o,...o.hourly,orderId:o.id,...folio(o)}));
 }
 if(q.kind==='customerProfiles'){
  columns=['customerId','name','phone','email','country','guestLanguage','birthday','documentHint','active','note','stays','charge','paid','due','outstanding','refundOwed','deposit','at','actor'];
  rows=directoryEntries(state,q.propertyId,'customer').filter(c=>!q.customerId||c.entryId===q.customerId).map(c=>{const stays=selected.filter(o=>links.get(o.id)===c.entryId),totals={charge:0,paid:0,due:0,deposit:0,outstanding:0,refundOwed:0};for(const o of stays){const f=folio(o);for(const k of ['charge','paid','due','deposit'])totals[k]+=f[k];totals.outstanding+=Math.max(f.due,0);totals.refundOwed+=Math.max(-f.due,0);}return {...c,customerId:c.entryId,stays:stays.map(o=>o.id).join(' / '),...totals};});
 }
 if(q.kind==='quickEntries'){
  columns=['businessDate','at','actor','orderId','name','kind','amount','method','note'];rows=(state.completionHistory||[]).filter(r=>r.propertyId===q.propertyId&&r.type==='quick_entry'&&inRange(r.businessDate,q)&&selected.some(o=>o.id===r.orderId)&&(!q.actor||r.actor===q.actor)&&(!q.method||r.method===q.method));
 }
 if(q.kind==='quickNoteSummary'){
  columns=['businessDate','at','actor','text','orderId','name','kind','amount','method'];rows.push(...(state.completionHistory||[]).filter(r=>r.propertyId===q.propertyId&&r.type==='quick_entry'&&inRange(r.businessDate,q)&&selected.some(o=>o.id===r.orderId)).map(r=>({...r,text:r.note})));if(q.actor)rows=rows.filter(r=>r.actor===q.actor);if(q.method)rows=rows.filter(r=>r.method===q.method);
 }
 if(q.kind==='ledgerRecords'){
  columns=[...new Set([...columns,'createdAt','completedAt','createdBy','status'])];
  rows=rows.map(r=>{const o=selected.find(o=>o.id===r.orderId);return {...r,createdAt:o?.createdAt||'',completedAt:o?.completedAt||'',createdBy:o?.createdBy||'',status:o?.status||''};});
 }
 // Historical missing dates are inspectable without inferring any posting date.
 if(['shiftAccrual','managerBusiness'].includes(q.kind)&&q.section==='historicalUndated'){
  columns=['orderId','source','roomTypeId','kind','amount','method','actor','at','reason'];
  rows=selected.flatMap(o=>[...orderChargeLines(o).unallocated,...(o.transactions||[]).filter(t=>!validDate(t.businessDate)).map(t=>({...t,reason:'posting_date_missing'}))].map(r=>({...r,orderId:o.id,source:o.source,roomTypeId:o.roomTypeId})));
  if(q.actor)rows=rows.filter(r=>r.actor===q.actor);if(q.method)rows=rows.filter(r=>r.method===q.method);
 }
 if(q.lineKind&&!(['shiftAccrual','managerBusiness'].includes(q.kind)&&['actorSummary','sourceSummary','receptionSummary','handoverWindows'].includes(q.section)))rows=rows.filter(r=>r.kind===q.lineKind||['revenueSummary','channelSummary','salesSummary','transactionSummary'].includes(q.kind)&&(!!q.dimension||!!q.dimension2||!!q.lineKind||!!q.actor||!!q.method));
 if(q.kind==='failedReservations'&&!allSource)rows=rows.filter(r=>r.source===q.source);
 if(q.status&&!['revenueSummary','transactionSummary','channelSummary','salesSummary','accommodationSummary','ledgerRecords','customerProfiles','transactionDetail','quickEntries','managerBusiness','shiftAccrual'].includes(q.kind))rows=rows.filter(r=>r.status===q.status);
 const query=String(q.search||'').trim().toLowerCase();rows=rows.filter(r=>!query||columns.some(k=>String(r[k]??'').toLowerCase().includes(query))).map(r=>Object.fromEntries(columns.map(k=>[k,r[k]??''])));
 if(q.kind==='futureInventory'&&q.layout==='matrix'){const sourceRows=rows,metrics=columns.filter(k=>!['date','roomTypeId','productId'].includes(k));columns=['roomTypeId','productId','metric',...days];rows=[];for(const id of [...new Set(sourceRows.map(r=>r.roomTypeId))])for(const metric of metrics){const selected=sourceRows.filter(r=>r.roomTypeId===id);rows.push(Object.fromEntries(columns.map(k=>[k,k==='roomTypeId'?id:k==='productId'?selected[0].productId:k==='metric'?metric:selected.find(r=>r.date===k)?.[metric]??''])));}}
 return {kind:q.kind,from:q.from,to:q.to,columns,rows,unallocated,totals:Object.fromEntries(columns.filter(k=>!['dailyInventory','futureInventory','housekeepingCalendar','housekeepingList','ledgerRecords','managerBusiness','shiftAccrual','accrualOperating','transactionDetail','quickEntries','quickNoteSummary'].includes(q.kind)).filter(k=>rows.some(r=>typeof r[k]==='number')).filter(k=>!['unitAmount','occupancy','adr','revpar'].includes(k)).map(k=>[k,rows.reduce((n,r)=>n+(typeof r[k]==='number'?r[k]:0),0)]))};
}
function activeStayTags(state,propertyId,orderId){
 const latest=new Map();for(const r of state.customerTagHistory||[])if(r.propertyId===propertyId&&r.orderId===orderId)latest.set(r.tagId,r.active);
 return directoryEntries(state,propertyId,'tag').filter(t=>latest.get(t.entryId)).map(t=>t.name);
}
export function parityCsv(report,label=k=>k){
 const cell=v=>'"'+String(v??'').replace(/^[\s]*[=+@-]/,"'$&").replace(/"/g,'""')+'"';
 return '\ufeff'+[report.columns.map(label),...report.rows.map(r=>report.columns.map(k=>r[k]))].map(r=>r.map(cell).join(',')).join('\r\n');
}
// Deliberately privacy-minimal, date-only occupancy export. It is a downloaded
// fixture, not a public subscription and does not identify a guest or reservation.
function icalUid(value){let hash=14695981039346656037n;for(const ch of value)hash=BigInt.asUintN(64,(hash^BigInt(ch.codePointAt(0)))*1099511628211n);return hash.toString(16);}
export function occupancyIcal(state,{propertyId,resourceId,from,to}){
 const orders=scope(state,{propertyId,from,to});
 const resources=saleResources(state,propertyId),resource=resources.find(r=>r.id===resourceId);
 if(!resource)throw Error('scope');
 const overlaps=atoms=>resource.atoms.some(a=>atoms?.includes(a));
 const relevant=orders.filter(o=>occupiesInventory(o)&&o.start<=to&&o.end>from);
 // An unassigned stay cannot truthfully be exported as a particular free unit.
 // Overdue in-house stays also have no known future departure interval.
 if(relevant.some(o=>!o.resourceId)||orders.some(o=>o.status==='checked_in'&&o.end<=to))throw Error('ical_unresolved');
 const rows=relevant.filter(o=>overlaps(resources.find(r=>r.id===o.resourceId)?.atoms)).map(o=>({start:o.start,end:o.end}));
 for(const block of state.blocks||[])if(block.propertyId===propertyId&&block.start<=to&&block.end>from&&overlaps(block.atoms))rows.push({start:block.start,end:block.end});
 const unique=[...new Map(rows.map(r=>[r.start+'|'+r.end,r])).values()];
 const compact=d=>d.replaceAll('-','');
 return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//JOVIAN//Occupancy fixture//EN',...unique.flatMap(r=>['BEGIN:VEVENT',`UID:occupancy-${icalUid(propertyId+'|'+resourceId+'|'+r.start+'|'+r.end)}@jovian.invalid`,'DTSTAMP:20000101T000000Z',`DTSTART;VALUE=DATE:${compact(r.start)}`,`DTEND;VALUE=DATE:${compact(r.end)}`,'SUMMARY:Unavailable','END:VEVENT']),'END:VCALENDAR',''].join('\r\n');
}
// Strict safe subset: pasted all-day fixtures only. Unsupported recurrence,
// timezone, URL and alarm features fail closed; nothing is fetched or committed.
export function previewIcal(text){
 if(typeof text!=='string'||text.length>100000)throw Error('ical_input');
 const lines=text.replace(/\r\n[ \t]/g,'').split(/\r?\n/).filter(Boolean);let calendar=false,ended=false,event=null;const rows=[];
 for(const line of lines){
  if(line==='BEGIN:VCALENDAR'&&!calendar&&!ended){calendar=true;continue;}
  if(line==='END:VCALENDAR'&&calendar&&!event){calendar=false;ended=true;continue;}
  if(!calendar||ended)throw Error('ical_input');
  if(line==='BEGIN:VEVENT'&&!event){event={};continue;}
  if(line==='END:VEVENT'&&event){if(!validDate(event.start)||!validDate(event.end)||event.end<=event.start||rows.length>=200)throw Error('ical_input');rows.push({start:event.start,end:event.end,...(event.summary?{summary:event.summary}:{})});event=null;continue;}
  const match=/^(DTSTART|DTEND);VALUE=DATE:(\d{4})(\d{2})(\d{2})$/.exec(line);
  if(match&&event){const key=match[1]==='DTSTART'?'start':'end';if(event[key])throw Error('ical_input');event[key]=`${match[2]}-${match[3]}-${match[4]}`;continue;}
  if(event&&line.startsWith('SUMMARY:')){event.summary=line.slice(8).replace(/\\n/gi,' ').replace(/\\([,;\\])/g,'$1').slice(0,200);continue;}
  if(event&&/^(UID|DTSTAMP|DESCRIPTION):/.test(line))continue;
  if(!event&&/^(VERSION:2\.0|PRODID:.*|CALSCALE:GREGORIAN)$/.test(line))continue;
  throw Error('ical_input');
 }
 if(!ended||event||calendar)throw Error('ical_input');return rows;
}

// Internal preparation snapshot only. A saved price is never a booking quote or OTA readiness.
export function bookingPreparation(state,{propertyId,from,to}){
 if(!state.properties.some(p=>p.id===propertyId)||!validDate(from)||!validDate(to)||from>to||(Date.parse(to)-Date.parse(from))/86400000>=31)throw Error('report_input');
 const days=[];for(let d=from;d<=to;d=nextDay(d))days.push(d);
 const site=(state.sites||[]).find(r=>r.propertyId===propertyId)||null;
 const types=state.roomTypes.filter(r=>r.propertyId===propertyId&&!r.archived);
 const plans=(state.ratePlans||[]).filter(r=>r.propertyId===propertyId&&!r.archived);
 const selectedTypes=types.filter(r=>!site?.roomTypeIds?.length||site.roomTypeIds.includes(r.id));
 const selectedPlans=plans.filter(r=>site?.planCodes?.includes(r.code));
 const rows=[];
 for(const type of selectedTypes){
  const units=state.resources.filter(r=>r.propertyId===propertyId&&r.roomTypeId===type.id&&!r.archived).length;
  const ownPlans=selectedPlans.filter(p=>p.roomTypeIds.includes(type.id));
  if(!ownPlans.length)rows.push({roomTypeId:type.id,units,planCode:'',pricedDays:0,openDays:0,missingDays:days.length});
  for(const plan of ownPlans){const cells=(state.rateCells||[]).filter(c=>c.propertyId===propertyId&&c.roomTypeId===type.id&&c.planCode===plan.code&&days.includes(c.date)&&Number.isSafeInteger(c.amount)&&c.amount>=0),pricedDays=new Set(cells.map(c=>c.date)).size;rows.push({roomTypeId:type.id,units,planCode:plan.code,pricedDays,openDays:new Set(cells.filter(c=>c.sale!=='closed').map(c=>c.date)).size,missingDays:days.length-pricedDays});}
 }
 const textChecks=['title','description','contact'].flatMap(field=>['zh','en','ms'].map(lang=>({field,lang,recorded:typeof site?.[field]?.[lang]==='string'&&!!site[field][lang].trim()})));
 const requests=(state.bookingRequests||[]).filter(r=>r.propertyId===propertyId),counts={pending:0,accepted:0,declined:0,withdrawn:0};
 for(const request of requests){const status=request.withdrawnAt?'withdrawn':request.status;if(Object.hasOwn(counts,status))counts[status]++;}
 return {propertyId,from,to,days:days.length,siteExists:!!site,enabled:site?.enabled===true,slug:site?.slug||'',updatedAt:site?.updatedAt||'',textChecks,rows,counts,configuredTypes:types.length,configuredPlans:plans.length,listingDrafts:(state.listingDrafts||[]).filter(r=>r.propertyId===propertyId).length};
}
