import { planInventory } from './inventory.js';
export class DemoError extends Error {}
const reject = code => { throw new DemoError(code); };
export function seed() {
  const properties = [{ id: 'TEST-KL', name: 'TEST · Kuala Lumpur' }, { id: 'TEST-PG', name: 'TEST · Penang' }];
  const resources = properties.flatMap(p => [
    ...Array.from({ length: p.id === 'TEST-KL' ? 10 : 2 }, (_, i) => ({ id: `${p.id}-R${i+1}`, label: `R${String(i+1).padStart(2,'0')}`, roomId: `${p.id}-R${i+1}`, propertyId: p.id, productId: 'room', gender: 'any', atoms: [`${p.id}-R${i+1}`], cleaning: 'clean' })),
    ...Array.from({ length: p.id === 'TEST-KL' ? 30 : 6 }, (_, i) => ({ id: `${p.id}-B${i+1}`, label: `D${Math.floor(i/6)+1} · B${i%6+1}`, roomId: `${p.id}-D${Math.floor(i/6)+1}`, propertyId: p.id, productId: 'bed', gender: i < 12 ? 'female' : i < 24 ? 'male' : 'any', atoms: [`${p.id}-B${i+1}`], cleaning: 'clean' }))
  ]);
  return { version: 1, properties, resources, orders: [], blocks: [], audit: [] };
}
export function preview(state, propertyId) {
  const demands = state.orders.filter(o => o.propertyId === propertyId && !['checked_out','cancelled'].includes(o.status)).map(o => ({ id: o.id, propertyId, productId: o.productId, gender: o.gender, start: o.start, end: o.end, fixedResourceId: o.resourceId || undefined, sameRoomGroup: o.group || undefined }));
  return planInventory({ propertyId, resources: state.resources.filter(r => r.propertyId === propertyId), demands, blocks: state.blocks.filter(b => b.propertyId === propertyId) });
}
// Mutations are copy-on-write: a failed operation leaves the original state intact.
// This local prototype has no authentication or multi-user transaction guarantees.
export function apply(state, command) {
  const next = structuredClone(state);
  for (const o of next.orders) { o.nightly ??= 0; o.transactions ??= []; o.notes ??= ''; o.source ??= 'direct'; o.locked ??= false; }
  const { type, propertyId } = command;
  if (['checkin','checkout'].includes(type) && (typeof command.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(command.date))) reject('date');
  if (!next.properties.some(p => p.id === propertyId)) reject('scope');
  let order = next.orders.find(o => o.id === command.orderId && o.propertyId === propertyId);
  let resource = next.resources.find(r => r.id === command.resourceId && r.propertyId === propertyId);
  const needsOrder = ['assign','checkin','checkout','edit','payment','cancel','lock'].includes(type);
  if (needsOrder && !order) reject('scope');
  if (type === 'create') {
    if (!command.id || next.orders.some(o => o.id === command.id)) reject('duplicate');
    if (typeof command.guest !== 'string' || !command.guest.trim() || command.guest.length > 100) reject('guest');
    if (!['room','bed'].includes(command.productId) || !['female','male','any'].includes(command.gender)) reject('input');
    if (typeof command.group !== 'undefined' && (typeof command.group !== 'string' || command.group.length > 60)) reject('input');
    next.orders.push({ id: command.id, propertyId, guest: command.guest.trim(), productId: command.productId, gender: command.gender, start: command.start, end: command.end, group: command.group || '', status: 'confirmed', resourceId: command.resourceId || null, history: [], nightly: money(command.nightly ?? 0), source: validSource(command.source || 'direct'), notes: text(command.notes || '',2000), transactions: [], locked:false });
  } else if (type === 'assign') {
    if (!resource || ['checked_out','cancelled'].includes(order.status)) reject('state');
    if (order.locked) reject('locked');
    if (order.status === 'checked_in' && resource.cleaning !== 'clean') reject('dirty');
    if (order.resourceId === resource.id) reject('state');
    const previous = order.resourceId;
    order.resourceId = resource.id;
    order.history.push({ from: previous, to: resource.id, at: command.at });
    if (previous && order.status === 'checked_in') next.resources.find(r => r.id === previous).cleaning = 'dirty';
  } else if (type === 'edit') {
    if (['checked_out','cancelled'].includes(order.status)) reject('state');
    if (order.status === 'checked_in' && command.start !== order.start) reject('state');
    if (typeof command.guest !== 'string' || !command.guest.trim()) reject('guest');
    order.guest = text(command.guest.trim(),100);
    order.start = command.start; order.end = command.end;
    order.nightly = money(command.nightly);
    order.notes = text(command.notes || '',2000);
    order.source = validSource(command.source);
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
    order.transactions.push({ id:command.id, kind:command.kind, amount, method:command.method, note:text(command.note||'',500), at:command.at });
  } else if (type === 'cancel') {
    if (order.status !== 'confirmed' || !command.reason?.trim()) reject('state');
    order.finalCharge = money(command.finalCharge);
    order.status = 'cancelled'; order.cancelReason = text(command.reason,500);
  } else if (type === 'checkin') {
    if (order.status !== 'confirmed' || !order.resourceId) reject('state');
    resource = next.resources.find(r => r.id === order.resourceId);
    if (resource.cleaning !== 'clean') reject('dirty');
    // Explicit simulated business date; do not use browser UTC date as property date.
    if (command.date < order.start || command.date >= order.end) reject('date');
    if (next.orders.some(o => o.id !== order.id && o.resourceId === order.resourceId && o.status === 'checked_in')) reject('occupied');
    order.status = 'checked_in';
  } else if (type === 'checkout') {
    if (order.status !== 'checked_in' || command.date !== order.end) reject('date');
    const balance = folio(order);
    if (balance.due !== 0 || balance.deposit !== 0) reject('balance');
    order.status = 'checked_out';
    next.resources.find(r => r.id === order.resourceId).cleaning = 'dirty';
  } else if (type === 'clean') {
    if (!resource || next.orders.some(o => o.resourceId === resource.id && o.status === 'checked_in')) reject('occupied');
    resource.cleaning = 'clean';
  } else if (type === 'block') {
    if (!resource) reject('scope');
    next.blocks.push({ id: command.id, propertyId, atoms: resource.atoms, start: command.start, end: command.end });
  } else if (type === 'unblock') {
    const block = next.blocks.find(b => b.id === command.blockId && b.propertyId === propertyId);
    if (!block) reject('scope');
    next.blocks = next.blocks.filter(b => b !== block);
  } else reject('input');
  preview(next, propertyId);
  next.audit.unshift({ id: command.id || `${command.at}-${next.audit.length}`, propertyId, type, orderId: order?.id || null, resourceId: resource?.id || null, at: command.at });
  return next;
}

const text = (value, max) => { if(typeof value !== 'string' || value.length > max) reject('input'); return value; };
const money = value => { if (!Number.isSafeInteger(value) || value < 0 || value > 100000000) reject('amount'); return value; };
const validSource = value => { if (!['direct','walkin','booking','airbnb','agoda','other'].includes(value)) reject('input'); return value; };
export function folio(order) {
  const nights = Math.round((Date.parse(order.end)-Date.parse(order.start))/86400000);
  const charge = order.finalCharge ?? nights*(order.nightly||0);
  const transactions = order.transactions || [];
  const sum = kind => transactions.filter(t=>t.kind===kind).reduce((n,t)=>n+t.amount,0);
  const paid = sum('payment')-sum('refund');
  return { nights, charge, paid, due: charge-paid, deposit:sum('deposit_in')-sum('deposit_out') };
}
