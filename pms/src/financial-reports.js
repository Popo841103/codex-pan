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
export function cashflowReport(state,q){if(!q)throw Error('report_input');if(q.operator!==undefined&&q.operator!=='all'&&q.operator!=='unknown'&&!(typeof q.operator==='string'&&q.operator.startsWith('actor:')&&q.operator.length>6&&q.operator.length<=512))throw Error('report_input');if(q.transactionKind&&!['all','payment','refund','deposit_in','deposit_out'].includes(q.transactionKind))throw Error('report_input');const counts={payment:0,refund:0,deposit_in:0,deposit_out:0};const orders=scope(state,q),rows=[],totals={payment:0,refund:0,deposit_in:0,deposit_out:0,netAccommodation:0,netDeposit:0},byMethod=new Map();for(const o of orders)for(const tr of o.transactions||[]){if(!['payment','refund','deposit_in','deposit_out'].includes(tr.kind))continue;if(q.operator==='unknown'&&tr.actor||q.operator?.startsWith('actor:')&&tr.actor!==q.operator.slice(6))continue;if(q.transactionKind&&q.transactionKind!=='all'&&tr.kind!==q.transactionKind||q.method&&q.method!=='all'&&(tr.method||'unspecified')!==q.method)continue;const date=localDay(tr.at);if(!date||!inRange(date,q))continue;const value=amount(tr.amount);if(value<0)throw Error('report_amount');rows.push({orderId:o.id,reservationId:o.reservationId||null,guest:o.guest||'',source:o.source||'direct',...tr,date});totals[tr.kind]+=value;counts[tr.kind]++;const method=tr.method||'unspecified';if(!byMethod.has(method))byMethod.set(method,{method,counts:{payment:0,refund:0,deposit_in:0,deposit_out:0},payment:0,refund:0,deposit_in:0,deposit_out:0,netAccommodation:0,netDeposit:0});byMethod.get(method)[tr.kind]+=value;byMethod.get(method).counts[tr.kind]++;}for(const t of [totals,...byMethod.values()]){t.netAccommodation=t.payment-t.refund;t.netDeposit=t.deposit_in-t.deposit_out;}rows.sort((a,b)=>a.at.localeCompare(b.at));return {rows,totals,counts,methods:[...byMethod.values()].sort((a,b)=>a.method.localeCompare(b.method))};}

export function accommodationBreakdown(state,q,dimension='date'){if(!['date','source','roomTypeId'].includes(dimension))throw Error('report_dimension');const report=accommodationReport(state,q),groups=new Map();for(const r of report.rows){const key=r[dimension]||'unspecified';if(!groups.has(key))groups.set(key,{key,total:0,roomFee:0,extras:0,unitNights:0,orderIds:[]});const g=groups.get(key);g.total+=r.amount;if(r.kind==='room'){g.roomFee+=r.amount;g.unitNights++;}else g.extras+=r.amount;if(!g.orderIds.includes(r.orderId))g.orderIds.push(r.orderId);}return {...report,dimension,groups:[...groups.values()].sort((a,b)=>a.key.localeCompare(b.key))};}

export function defaultComparisonPeriods(from,to){if(!validDate(from)||!validDate(to)||from>to)throw Error('report_input');return {current:{from,to},month:{from:comparisonDay(from,-1),to:comparisonDay(to,-1)},year:{from:comparisonDay(from,0,-1),to:comparisonDay(to,0,-1)}};}
export function financialComparison(state,{propertyId,source='all',periods}={}){if(!periods||!['current','month','year'].every(k=>periods[k]))throw Error('report_input');const results={};for(const key of ['current','month','year']){const q={...periods[key],propertyId,source},business=accommodationReport(state,q),cash=cashflowReport(state,q);results[key]={from:q.from,to:q.to,unallocatedCharges:business.unallocatedCharges,values:{revenue:business.total,roomFee:business.rows.filter(r=>r.kind==='room').reduce((s,r)=>s+r.amount,0),extras:business.rows.filter(r=>r.kind!=='room').reduce((s,r)=>s+r.amount,0),unitNights:business.rows.filter(r=>r.kind==='room').length,...cash.totals}};}const changes={};for(const key of ['month','year']){changes[key]={};for(const metric of Object.keys(results.current.values)){const now=results.current.values[metric],before=results[key].values[metric];changes[key][metric]={delta:now-before,percent:before===0?null:(now-before)/Math.abs(before)*100};}}return {periods:results,changes};}
