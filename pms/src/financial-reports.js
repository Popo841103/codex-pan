import {localDay,comparisonDay} from './dashboard.js';
import {stayDays} from './reservations.js';
const validDate=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d+'T00:00:00Z'))&&new Date(d+'T00:00:00Z').toISOString().slice(0,10)===d;
function scope(state,q){if(!q||typeof q.propertyId!=='string'||!q.propertyId.trim()||!validDate(q.from)||!validDate(q.to)||q.from>q.to)throw Error('report_input');return state.orders.filter(o=>o.propertyId===q.propertyId&&(!q.source||q.source==='all'||o.source===q.source));}
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
    lines.push({...base,date:rate.date,kind:'room',amount:value});
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
    const day=localDay(tr.at);if(!day||!cut(day))continue;
    const value=amount(tr.amount);if(value<0)throw Error('report_amount');
    if(tr.kind==='payment')balance.paid+=value;
    else if(tr.kind==='refund')balance.paid-=value;
    else if(tr.kind==='deposit_in')balance.deposit+=value;
    else balance.deposit-=value;
  }
  balance.due=balance.charge-balance.paid;
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
  for(const order of orders){const {lines,unallocated:missing}=orderChargeLines(order);for(const line of lines){if(line.date!==q.date)continue;chargeLines.push(line);charges.total+=line.amount;if(line.kind==='room')charges.room+=line.amount;else if(line.kind==='cancellation')charges.cancellation+=line.amount;else charges.extras+=line.amount;}unallocated.push(...missing);}
  const settlements={payment:0,refund:0,deposit_in:0,deposit_out:0,net:0,depositNet:0,count:0};
  for(const order of orders)for(const tr of order.transactions||[]){
    if(!['payment','refund','deposit_in','deposit_out'].includes(tr.kind))continue;
    if(localDay(tr.at)!==q.date)continue;
    const value=amount(tr.amount);if(value<0)throw Error('report_amount');
    settlements[tr.kind]+=value;settlements.count++;
  }
  settlements.net=settlements.payment-settlements.refund;
  settlements.depositNet=settlements.deposit_in-settlements.deposit_out;
  const metrics={arrivals:orders.filter(o=>o.start===q.date).length,departures:orders.filter(o=>o.end===q.date).length,inHouse:orders.filter(o=>o.status==='checked_in').length,expectedArrivals:orders.filter(o=>o.status==='confirmed'&&o.start===q.date).length};
  // The day's own movements must rebuild the closing balance from the opening one. If
  // they do not, the page says the day is unreconciled instead of showing a total that
  // no longer ties back to the guest ledger.
  const expected={charge:opening.charge+charges.total,paid:opening.paid+settlements.net,deposit:opening.deposit+settlements.depositNet};
  const balanced=expected.charge===closing.charge&&expected.paid===closing.paid&&expected.deposit===closing.deposit;
  const businessDate=state.businessDates?.[q.propertyId]??state.businessDate??null;
  return {date:q.date,opening,closing,charges,settlements,chargeLines,unallocated,metrics,expected,balanced,orderCount:orders.length,businessDate,businessDateSet:BusinessDate(businessDate)};
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
    if(o.propertyId!==propertyId||!occupiesInventory(o))continue;
    if(!o.start||!o.end||!(date>=o.start&&date<o.end))continue;
    const pid=PRODUCTS.includes(o.productId)?o.productId:'room',value=nightPrice(o,date);
    const res=o.resourceId?sellable.find(r=>r.id===o.resourceId)||(state.resources||[]).find(r=>r.id===o.resourceId):null;
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
        resourceLabel:label(state,'resources',o.resourceId,'label'),start:o.start||'',end:o.end||'',
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
      if(!occupiesInventory(o)||!o.start||!o.end||!(date>=o.start&&date<o.end))continue;
      const resource=(state.resources||[]).find(r=>r.id===o.resourceId)||null;
      const bucket=bucketFor(keyOf(o,resource,date));
      const pid=PRODUCTS.includes(o.productId)?o.productId:'room',value=nightPrice(o,date);
      if(resource&&resource.propertyId===q.propertyId)bucket.sold[pid]++;else bucket.unassigned[pid]++;
      bucket.revenue[pid]+=value;
    }
    if(dimension==='source')continue; // no unit can be attributed to a channel
    for(const unit of sellable){
      const key=dimensionOfUnit(dimension,unit,date);
      if(key===null)continue;
      const bucket=bucketFor(key);
      bucket.supply[unit.productId]++;
      bucket.nights++;
    }
  }
  const rows=[...buckets.values()].map(b=>{
    const revenue=sumProducts(b.revenue),sold=sumProducts(b.sold),unassigned=sumProducts(b.unassigned);
    const supplyNights=sumProducts(b.supply),available=dimension!=='source';
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
    if(b&&after&&b.end&&after.end&&after.end<b.end)return 'early_departure';
    if(b&&after&&b.end&&after.end&&after.end>b.end)return 'late_departure';
    if(b&&after&&b.start!==after.start)return 'date_change';
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
const extrasBillable=order=>order.status!=='cancelled'&&(order.finalCharge===undefined||order.finalCharge===null);
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
export function cashflowReport(state,q){if(!q)throw Error('report_input');if(q.operator!==undefined&&q.operator!=='all'&&q.operator!=='unknown'&&!(typeof q.operator==='string'&&q.operator.startsWith('actor:')&&q.operator.length>6&&q.operator.length<=512))throw Error('report_input');if(q.transactionKind&&!['all','payment','refund','deposit_in','deposit_out'].includes(q.transactionKind))throw Error('report_input');const counts={payment:0,refund:0,deposit_in:0,deposit_out:0};const orders=scope(state,q),rows=[],totals={payment:0,refund:0,deposit_in:0,deposit_out:0,netAccommodation:0,netDeposit:0},byMethod=new Map();for(const o of orders)for(const tr of o.transactions||[]){if(!['payment','refund','deposit_in','deposit_out'].includes(tr.kind))continue;if(q.operator==='unknown'&&tr.actor||q.operator?.startsWith('actor:')&&tr.actor!==q.operator.slice(6))continue;if(q.transactionKind&&q.transactionKind!=='all'&&tr.kind!==q.transactionKind||q.method&&q.method!=='all'&&(tr.method||'unspecified')!==q.method)continue;const date=localDay(tr.at);if(!date||!inRange(date,q))continue;const value=amount(tr.amount);if(value<0)throw Error('report_amount');rows.push({orderId:o.id,reservationId:o.reservationId||null,guest:o.guest||'',source:o.source||'direct',...tr,date});totals[tr.kind]+=value;counts[tr.kind]++;const method=tr.method||'unspecified';if(!byMethod.has(method))byMethod.set(method,{method,counts:{payment:0,refund:0,deposit_in:0,deposit_out:0},payment:0,refund:0,deposit_in:0,deposit_out:0,netAccommodation:0,netDeposit:0});byMethod.get(method)[tr.kind]+=value;byMethod.get(method).counts[tr.kind]++;}for(const t of [totals,...byMethod.values()]){t.netAccommodation=t.payment-t.refund;t.netDeposit=t.deposit_in-t.deposit_out;}rows.sort((a,b)=>a.at.localeCompare(b.at));return {rows,totals,counts,methods:[...byMethod.values()].sort((a,b)=>a.method.localeCompare(b.method))};}

export function accommodationBreakdown(state,q,dimension='date'){if(!['date','source','roomTypeId'].includes(dimension))throw Error('report_dimension');const report=accommodationReport(state,q),groups=new Map();for(const r of report.rows){const key=r[dimension]||'unspecified';if(!groups.has(key))groups.set(key,{key,total:0,roomFee:0,extras:0,unitNights:0,orderIds:[]});const g=groups.get(key);g.total+=r.amount;if(r.kind==='room'){g.roomFee+=r.amount;g.unitNights++;}else g.extras+=r.amount;if(!g.orderIds.includes(r.orderId))g.orderIds.push(r.orderId);}return {...report,dimension,groups:[...groups.values()].sort((a,b)=>a.key.localeCompare(b.key))};}

export function defaultComparisonPeriods(from,to){if(!validDate(from)||!validDate(to)||from>to)throw Error('report_input');return {current:{from,to},month:{from:comparisonDay(from,-1),to:comparisonDay(to,-1)},year:{from:comparisonDay(from,0,-1),to:comparisonDay(to,0,-1)}};}
export function financialComparison(state,{propertyId,source='all',periods}={}){if(!periods||!['current','month','year'].every(k=>periods[k]))throw Error('report_input');const results={};for(const key of ['current','month','year']){const q={...periods[key],propertyId,source},business=accommodationReport(state,q),cash=cashflowReport(state,q);results[key]={from:q.from,to:q.to,unallocatedCharges:business.unallocatedCharges,values:{revenue:business.total,roomFee:business.rows.filter(r=>r.kind==='room').reduce((s,r)=>s+r.amount,0),extras:business.rows.filter(r=>r.kind!=='room').reduce((s,r)=>s+r.amount,0),unitNights:business.rows.filter(r=>r.kind==='room').length,...cash.totals}};}const changes={};for(const key of ['month','year']){changes[key]={};for(const metric of Object.keys(results.current.values)){const now=results.current.values[metric],before=results[key].values[metric];changes[key][metric]={delta:now-before,percent:before===0?null:(now-before)/Math.abs(before)*100};}}return {periods:results,changes};}
