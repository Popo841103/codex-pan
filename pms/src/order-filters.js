import {queueOrders,localDay} from './dashboard.js';
import {folio} from './demo-store.js';
import {isBoxed,inventoryState} from './inventory-actions.js';
export const orderTabs=Object.freeze(['all','arrivals','departures','created','unassigned','pending','exceptions','boxed','deletedResource']);
export function hasDeletedResource(state,order){
 const resources=state.resources||[],types=state.roomTypes||[],rooms=state.physicalRooms||[];
 const missing=(rows,id)=>!!id&&!rows.some(r=>r.id===id&&r.propertyId===order.propertyId&&!r.archived);
 if(missing(resources,order.resourceId)||missing(types,order.roomTypeId))return true;
 const resource=resources.find(r=>r.id===order.resourceId&&r.propertyId===order.propertyId);
 return !!resource&&(missing(types,resource.roomTypeId)||missing(rooms,resource.roomId));
}
export function filterOrders(state,propertyId,date,filters={}){
 const {tab='all',query='',source='all',status='all',inventory='all',from='',to='',dateType='created',cash='all',exception='all'}=filters;
 if(!orderTabs.includes(tab))return [];
 const queue=['arrivals','departures','created','unassigned','pending','exceptions'].includes(tab)?new Set(queueOrders(state,propertyId,date,tab).map(o=>o.id)):null;
 const ignoreDates=['arrivals','departures','created','boxed'].includes(tab),needle=String(query).trim().toLocaleLowerCase();
 return state.orders.filter(o=>{
  if(o.propertyId!==propertyId||queue&&!queue.has(o.id)||tab==='boxed'&&!isBoxed(o)||tab==='deletedResource'&&!hasDeletedResource(state,o))return false;
  if(source!=='all'&&(o.source||'direct')!==source||status!=='all'&&o.status!==status||inventory!=='all'&&inventoryState(o)!==inventory)return false;
  if(needle&&![o.id,o.reservationId,o.channelOrderId,o.guest,o.email,o.phone,o.notes].join(' ').toLocaleLowerCase().includes(needle))return false;
  if(exception==='late-arrival'&&(isBoxed(o)||o.status!=='confirmed'||o.start>=date))return false;
  if(exception==='late-departure'&&(o.status!=='checked_in'||o.end>=date))return false;
  if(cash!=='all'){const due=folio(o).due;if(['due','unpaid'].includes(cash)&&due<=0||['settled','paid'].includes(cash)&&due!==0||['refund','overpaid'].includes(cash)&&due>=0)return false;}
  if(!ignoreDates&&(from||to)){
   if(from&&to&&from>to)return false;
   if(dateType==='overlap'){if(from&&o.end<=from||to&&o.start>to)return false;}
   else {const value=dateType==='start'?o.start:dateType==='end'?o.end:o.createdBusinessDate||localDay(o.createdAt);if(!value||from&&value<from||to&&value>to)return false;}
  }
  return true;
 });
}
