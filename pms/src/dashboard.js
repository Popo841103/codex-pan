import { isBoxed, occupiesInventory, excludesCapacity } from './inventory-actions.js';
import { preview, folio } from './demo-store.js';
import { saleResources } from './catalog.js';
export const addDays=(d,n)=>new Date(Date.parse(d+'T00:00:00Z')+n*86400000).toISOString().slice(0,10);
export function localDay(value) {
  const date=new Date(value);if(!Number.isFinite(date.getTime()))return '';
  return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kuala_Lumpur',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
}
export function comparisonDay(day,months=0,years=0) {
  const date=new Date(day+'T00:00:00Z'),original=date.getUTCDate();
  date.setUTCDate(1);date.setUTCFullYear(date.getUTCFullYear()+years);date.setUTCMonth(date.getUTCMonth()+months);
  const last=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,0)).getUTCDate();
  date.setUTCDate(Math.min(original,last));return date.toISOString().slice(0,10);
}
export const percentageChange=(now,before)=>before===0?null:(now-before)/before*100;
export function queueOrders(state,propertyId,date,queue) {
  return state.orders.filter(o=>{
    if(o.propertyId!==propertyId)return false;
    const active=occupiesInventory(o);
    return ({arrivals:!isBoxed(o)&&o.start===date&&o.status==='confirmed',arrived:o.start<=date&&o.end>date&&o.status==='checked_in',
      departures:o.end===date&&o.status==='checked_in',departed:o.end===date&&o.status==='checked_out',
      created:(o.createdBusinessDate||localDay(o.createdAt))===date,unassigned:active&&!o.resourceId,
      pending:(o.status==='cancelled'&&(folio(o).paid>0||folio(o).deposit>0))||folio(o).due<0,
      exceptions:!isBoxed(o)&&o.status==='confirmed'&&o.start<date||o.status==='checked_in'&&o.end<date})[queue]===true;
  });
}
export function dashboard(state,propertyId,date) {
  const orders=state.orders.filter(o=>o.propertyId===propertyId),valid=orders.filter(o=>o.status!=='cancelled'&&!isBoxed(o));
  const resources=state.resources.filter(r=>r.propertyId===propertyId),sales=saleResources(state,propertyId);
  const allocations=new Map(preview(state,propertyId).map(p=>[p.demandId,p.resourceId]));
  const base=sales.filter(r=>r.productId!=='suite');
  const shares=(a,b)=>a.atoms.some(atom=>b.atoms.includes(atom));
  const daily=day=>{
    const current=valid.filter(o=>o.start<=day&&o.end>day),blocked=state.blocks.filter(b=>b.propertyId===propertyId&&b.start<=day&&b.end>day);
    const units=Object.fromEntries(['room','bed'].map(product=>[product,base.filter(r=>r.productId===product)]));
    const result={date:day,roomFee:0,room:{available:0,sold:0,fee:0},bed:{available:0,sold:0,fee:0}};
    for(const product of ['room','bed']) {
      result[product].available=units[product].filter(r=>!blocked.some(b=>excludesCapacity(b)&&shares(r,b))).length;
      result[product].sold=units[product].filter(r=>current.some(o=>{const assigned=resources.find(r=>r.id===(o.resourceId||allocations.get(o.id)));return assigned&&shares(assigned,r);})).length;
    }
    for(const order of current){
      const fee=order.nightlyRates?.find(r=>r.date===day)?.amount??order.nightly??0;result.roomFee+=fee;
      const resource=resources.find(r=>r.id===(order.resourceId||allocations.get(order.id)));
      const kinds=['room','bed'].filter(kind=>units[kind].some(unit=>resource&&shares(unit,resource)));
      if(kinds.length===1&&result[kinds[0]].fee!==null)result[kinds[0]].fee+=fee;
      else if(kinds.length>1){result.room.fee=null;result.bed.fee=null;}
    }
    for(const kind of ['room','bed']) {const r=result[kind];r.occ=r.available?r.sold/r.available:null;r.adr=r.sold&&r.fee!==null?r.fee/r.sold:null;r.revpar=r.available&&r.fee!==null?r.fee/r.available:null;}
    return result;
  };
  const feeBetween=(start,end)=>valid.reduce((n,o)=>{
    const a=o.start>start?o.start:start,b=o.end<end?o.end:end;if(a>=b)return n;
    if(o.nightlyRates)return n+o.nightlyRates.filter(r=>r.date>=a&&r.date<b).reduce((n,r)=>n+r.amount,0);
    return n+(Date.parse(b)-Date.parse(a))/86400000*(o.nightly||0);
  },0);
  const sourceCounts=new Map(),seen=new Set(),from=addDays(date,-7);
  for(const o of valid.filter(o=>o.start<date&&o.end>from)) {const key=o.reservationId||o.id;if(seen.has(key))continue;seen.add(key);const source=state.reservations?.find(r=>r.id===o.reservationId)?.source||o.source||'direct';sourceCounts.set(source,(sourceCounts.get(source)||0)+1);}
  const transactions=orders.flatMap(o=>(o.transactions||[]).map(row=>({...row,orderId:o.id,guest:o.guest}))).filter(row=>localDay(row.at)===date);
  const sum=kind=>transactions.filter(r=>r.kind===kind).reduce((n,r)=>n+r.amount,0);
  return {today:daily(date),lastMonth:daily(comparisonDay(date,-1)),lastYear:daily(comparisonDay(date,0,-1)),
    monthFee:feeBetween(date.slice(0,7)+'-01',addDays(date,1)),yearFee:feeBetween(date.slice(0,4)+'-01-01',addDays(date,1)),
    sources:[...sourceCounts].map(([source,count])=>({source,count,percentage:seen.size?count/seen.size*100:0})),
    queues:Object.fromEntries(['arrivals','departures','created','unassigned','pending','exceptions'].map(q=>[q,new Set(queueOrders(state,propertyId,date,q).map(o=>o.reservationId||o.id)).size])),
    cashflow:{transactions,payments:sum('payment'),refunds:sum('refund'),deposits:sum('deposit_in'),returns:sum('deposit_out')},
    trend:Array.from({length:7},(_,i)=>{const d=addDays(date,i-6);return {date:d,fee:feeBetween(d,addDays(d,1))};})};
}
