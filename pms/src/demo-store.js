import {changeRates} from './rates.js';
import { isBoxed, occupiesInventory, operationalBlock, changeOrderBox } from './inventory-actions.js';
import { planInventory } from './inventory.js';
import { upgradeCatalog, configureCatalog, saleResources, overlapsAtoms, isClean, setCleaning } from './catalog.js';
import { createReservation, stayDays, prepareStay } from './reservations.js';
export class DemoError extends Error {}
const reject = code => { throw new DemoError(code); };
export function seed() {
  const properties = [{ id: 'TEST-KL', name: 'TEST · Kuala Lumpur' }, { id: 'TEST-PG', name: 'TEST · Penang' }];
  const resources = properties.flatMap(p => [
    ...Array.from({ length: p.id === 'TEST-KL' ? 10 : 2 }, (_, i) => ({ id: `${p.id}-R${i+1}`, label: `R${String(i+1).padStart(2,'0')}`, roomId: `${p.id}-R${i+1}`, propertyId: p.id, productId: 'room', gender: 'any', atoms: [`${p.id}-R${i+1}`], cleaning: 'clean' })),
    ...Array.from({ length: p.id === 'TEST-KL' ? 30 : 6 }, (_, i) => ({ id: `${p.id}-B${i+1}`, label: `D${Math.floor(i/6)+1} · B${i%6+1}`, roomId: `${p.id}-D${Math.floor(i/6)+1}`, propertyId: p.id, productId: 'bed', gender: i < 12 ? 'female' : i < 24 ? 'male' : 'any', atoms: [`${p.id}-B${i+1}`], cleaning: 'clean' }))
  ]);
  return upgradeCatalog({ version: 1, properties, resources, orders: [], blocks: [], audit: [] });
}
export function preview(state, propertyId) {
  state = upgradeCatalog(state);
  const demands = state.orders.filter(o => o.propertyId === propertyId && occupiesInventory(o)).map(o => ({ id: o.id, propertyId, productId: o.productId, roomTypeId: o.roomTypeId, gender: o.gender, start: o.start, end: o.end, fixedResourceId: o.resourceId || undefined, sameRoomGroup: o.group || undefined }));
  const available = new Set(saleResources(state, propertyId).map(r => r.id));
  return planInventory({ propertyId, resources: state.resources.filter(r => r.propertyId === propertyId).map(r => ({ ...r, archived: !available.has(r.id) })), demands, blocks: state.blocks.filter(b => b.propertyId === propertyId) });
}
// Mutations are copy-on-write: a failed operation leaves the original state intact.
// Shared mode wraps this pure reducer in Store's authorized database transaction.
export function apply(state, command) {
  let next = upgradeCatalog(state);
  for (const o of next.orders) { o.nightly ??= 0; o.transactions ??= []; o.notes ??= ''; o.source ??= 'direct'; o.locked ??= false; }
  const { type, propertyId } = command;
  if (['checkin','checkout'].includes(type) && (typeof command.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(command.date))) reject('date');
  if (!next.properties.some(p => p.id === propertyId)) reject('scope');
  let order = next.orders.find(o => o.id === command.orderId && o.propertyId === propertyId);
  let resource = next.resources.find(r => r.id === command.resourceId && r.propertyId === propertyId);
  const inHouse = target => next.orders.some(o => o.propertyId === propertyId && o.status === 'checked_in' &&
    (!['assign','checkin'].includes(type) || o.id !== order?.id) && overlapsAtoms(next.resources.find(r => r.id === o.resourceId), target));
  const catalogActions = ['room_type_save','physical_room_save','suite_save','resource_update','resource_archive'];
  const needsOrder = ['assign','checkin','checkout','edit','payment','cancel','lock'].includes(type);
  if (needsOrder && !order) reject('scope');
  if (order && isBoxed(order) && ['assign','checkin','checkout','lock'].includes(type)) reject('box_state');
  if(['rate_plan_save','rate_plan_archive','rates_bulk_update'].includes(type)){changeRates(next,command);}
  else if (['box_stays','restore_stays'].includes(type)) {
    changeOrderBox(next,command,preview);
  } else if(type==='create_reservation') {
    next=createReservation(next,command,apply,preview);
  } else if(type==='memo_save') {
    next.properties.find(p=>p.id===propertyId).memo={text:text(command.text,3000),at:command.at,actor:command.actor||'local'};
  } else if (catalogActions.includes(type)) {
    configureCatalog(next, command);
  } else if (type === 'create') {
    if (!command.id || next.orders.some(o => o.id === command.id)) reject('duplicate');
    if (typeof command.guest !== 'string' || !command.guest.trim() || command.guest.length > 100) reject('guest');
    if (!['room','bed','suite'].includes(command.productId) || !['female','male','any'].includes(command.gender)) reject('input');
    const roomType = command.roomTypeId ? next.roomTypes.find(t => t.id === command.roomTypeId && t.propertyId === propertyId && t.productId === command.productId) : null;
    if (command.roomTypeId && !roomType) reject('scope');
    if (typeof command.group !== 'undefined' && (typeof command.group !== 'string' || command.group.length > 60)) reject('input');
    next.orders.push({ id: command.id, propertyId, guest: command.guest.trim(), productId: command.productId, roomTypeId:roomType?.id || null, gender: command.gender, start: command.start, end: command.end, group: command.group || '', status: 'confirmed', resourceId: command.resourceId || null, history: [], nightly: money(command.nightly ?? 0), source: validSource(command.source || 'direct'), notes: text(command.notes || '',2048), transactions: [], locked:false, ...guestFields(command), createdAt:command.at, createdBy:command.actor||'local' });
  } else if (type === 'assign') {
    if (!resource || ['checked_out','cancelled'].includes(order.status)) reject('state');
    if (order.locked) reject('locked');
    if (order.status === 'checked_in' && !isClean(next, resource)) reject('dirty');
    if (order.status === 'checked_in' && inHouse(resource)) reject('occupied');
    if (order.resourceId === resource.id) reject('state');
    const previous = order.resourceId;
    order.resourceId = resource.id;
    order.history.push({ from: previous, to: resource.id, at: command.at });
    if (previous && order.status === 'checked_in') setCleaning(next, next.resources.find(r => r.id === previous), 'dirty');
  } else if (type === 'edit') {
    if (['checked_out','cancelled'].includes(order.status)) reject('state');
    if (order.status === 'checked_in' && command.start !== order.start) reject('state');
    if (typeof command.guest !== 'string' || !command.guest.trim()) reject('guest');
    order.guest = text(command.guest.trim(),100);
    if(order.nightlyRates){const days=stayDays(command.start,command.end),rates=new Map(order.nightlyRates.map(r=>[r.date,r.amount]));order.nightlyRates=days.map(date=>({date,amount:command.nightly===order.nightly?(rates.get(date)??command.nightly):command.nightly}));}
    order.start = command.start; order.end = command.end;
    order.nightly = money(command.nightly);
    order.notes = text(command.notes || '',2048);
    order.source = validSource(command.source);
    Object.assign(order,guestFields(command,order));
    if(command.occupants!==undefined&&order.reservationId)Object.assign(order,prepareStay(next,propertyId,{...order,occupants:command.occupants,arrivalTime:command.arrivalTime??order.arrivalTime,departureTime:command.departureTime??order.departureTime}));
  } else if (type === 'lock') {
    if (!order.resourceId || ['checked_out','cancelled'].includes(order.status)) reject('state');
    order.locked = !order.locked;
  } else if (type === 'payment') {
    const amount = money(command.amount);
    if (!amount || !['payment','refund','deposit_in','deposit_out'].includes(command.kind)) reject('amount');
    if (!['cash','bank','card','ota'].includes(command.method)) reject('input');
    const balance = folio(order);
    if (command.kind === 'refund' && amount > balance.paid) reject('refund');
    if (command.kind === 'deposit_out' && amount > balance.deposit) reject('refund');
    order.transactions.push({ id:command.id, kind:command.kind, amount, method:command.method, reference:text(command.reference||'',100),note:text(command.note||'',500), at:command.at });
  } else if (type === 'cancel') {
    if (order.status !== 'confirmed' || !command.reason?.trim()) reject('state');
    order.finalCharge = money(command.finalCharge);
    order.status = 'cancelled'; order.cancelReason = text(command.reason,500);
  } else if (type === 'checkin') {
    if (order.status !== 'confirmed' || !order.resourceId) reject('state');
    if(order.occupants){prepareStay(next,propertyId,order);if(order.occupants.some(p=>!p.name))reject('occupant_names');}
    resource = next.resources.find(r => r.id === order.resourceId);
    if (!isClean(next, resource)) reject('dirty');
    // Explicit simulated business date; do not use browser UTC date as property date.
    if (command.date < order.start || command.date >= order.end) reject('date');
    if (inHouse(resource)) reject('occupied');
    order.status = 'checked_in';
  } else if (type === 'checkout') {
    if (order.status !== 'checked_in' || command.date !== order.end) reject('date');
    const balance = folio(order);
    if (balance.due !== 0 || balance.deposit !== 0) reject('balance');
    order.status = 'checked_out';
    setCleaning(next, next.resources.find(r => r.id === order.resourceId), 'dirty');
  } else if (['bulk_clean','bulk_block','bulk_unblock'].includes(type)) {
    if (!Array.isArray(command.resourceIds) || !command.resourceIds.length || command.resourceIds.length>100 || new Set(command.resourceIds).size!==command.resourceIds.length) reject('input');
    const selected=command.resourceIds.map(id=>next.resources.find(r=>r.id===id&&r.propertyId===propertyId));
    if(selected.some(r=>!r))reject('scope');
    if(type==='bulk_clean'){
      if(!['clean','dirty'].includes(command.cleaning))reject('input');
      if(selected.some(inHouse))reject('occupied');
      selected.forEach(r=>setCleaning(next,r,command.cleaning));
    }else{
      validRange(command.start,command.end);
      const atoms=[...new Set(selected.flatMap(r=>r.atoms))];
      if(type==='bulk_block'){
        const detail=operationalBlock(command);
        // Never displace an in-house guest, including when their planned departure is overdue.
        if(next.orders.some(o=>o.status==='checked_in'&&next.resources.find(r=>r.id===o.resourceId)?.atoms.some(a=>atoms.includes(a))))reject('occupied');
        next.blocks.push({id:command.id,propertyId,atoms,start:command.start,end:command.end,...detail});
      }else{
        // Release only selected atoms during the requested range. Preserve other dates/atoms.
        const blockIds=command.blockIds;
        if(blockIds!==undefined&&(!Array.isArray(blockIds)||!blockIds.length||new Set(blockIds).size!==blockIds.length||blockIds.some(id=>!next.blocks.some(b=>b.id===id&&b.propertyId===propertyId))))reject('scope');
        next.blocks=next.blocks.flatMap((b,index)=>{
          if(b.propertyId!==propertyId||blockIds&&!blockIds.includes(b.id)||b.end<=command.start||b.start>=command.end||!b.atoms.some(a=>atoms.includes(a)))return [b];
          const parts=[],remaining=b.atoms.filter(a=>!atoms.includes(a));
          if(remaining.length)parts.push({...b,id:`${command.id}-${index}-other`,atoms:remaining});
          const hit=b.atoms.filter(a=>atoms.includes(a));
          if(b.start<command.start)parts.push({...b,id:`${command.id}-${index}-before`,atoms:hit,end:command.start});
          if(b.end>command.end)parts.push({...b,id:`${command.id}-${index}-after`,atoms:hit,start:command.end});
          return parts;
        });
      }
    }
  } else if (type === 'clean') {
    if (!resource || inHouse(resource)) reject('occupied');
    setCleaning(next, resource, 'clean');
  } else if (type === 'block') {
    if (!resource) reject('scope');
    validRange(command.start,command.end);
    if(next.orders.some(o=>o.status==='checked_in'&&next.resources.find(r=>r.id===o.resourceId)?.atoms.some(a=>resource.atoms.includes(a))))reject('occupied');
    next.blocks.push({ id: command.id, propertyId, atoms: resource.atoms, start: command.start, end: command.end, ...operationalBlock(command) });
  } else if (type === 'unblock') {
    const block = next.blocks.find(b => b.id === command.blockId && b.propertyId === propertyId);
    if (!block) reject('scope');
    next.blocks = next.blocks.filter(b => b !== block);
  } else reject('input');
  preview(next, propertyId);
  next.audit.unshift({ id: command.id || `${command.at}-${next.audit.length}`, propertyId, type, orderId: order?.id || null, resourceId: resource?.id || null, resourceIds: command.resourceIds, cleaning:command.cleaning, at: command.at });
  return next;
}

const text = (value, max) => { if(typeof value !== 'string' || value.length > max) reject('input'); return value; };
const money = value => { if (!Number.isSafeInteger(value) || value < 0 || value > 100000000) reject('amount'); return value; };
const validSource = value => { if (!['direct','walkin','booking','airbnb','agoda','tripcom','expedia','traveloka','tiket','bookingengine','chinesesite','rednote','neppan','hostelworld','tujia','vrbo','xiaozhu','temairazu','rakuten','klook','other'].includes(value)) reject('input'); return value; };
export function folio(order) {
  const nights = Math.round((Date.parse(order.end)-Date.parse(order.start))/86400000);
  const roomCharge=order.nightlyRates?order.nightlyRates.reduce((n,r)=>n+r.amount,0):nights*(order.nightly||0);
  const extras=(order.extraCharges||[]).reduce((n,r)=>n+(r.kind==='charge'?1:-1)*r.quantity*r.unitAmount,0);
  const charge = order.finalCharge ?? roomCharge+extras;
  const transactions = order.transactions || [];
  const sum = kind => transactions.filter(t=>t.kind===kind).reduce((n,t)=>n+t.amount,0);
  const paid = sum('payment')-sum('refund');
  return { nights, charge, paid, due: charge-paid, deposit:sum('deposit_in')-sum('deposit_out') };
}

function validRange(start,end){
  const valid=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
  if(!valid(start)||!valid(end)||end<=start||(Date.parse(end)-Date.parse(start))/86400000>366)reject('date_range');
}
function guestFields(command,prior={}){
  const fields={};
  for(const [name,max] of Object.entries({email:254,phone:40,country:80,guestLanguage:40,channelOrderId:100,channelNotes:2000}))fields[name]=text(command[name]??prior[name]??'',max);
  fields.color=command.color??prior.color??'';
  if(!['','peach','blue','green','violet'].includes(fields.color))reject('input');
  return fields;
}
