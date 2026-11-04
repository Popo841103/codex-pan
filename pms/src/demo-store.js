import {changeRates} from './rates.js';
import { isBoxed, occupiesInventory, operationalBlock, changeOrderBox } from './inventory-actions.js';
// Trustworthy business day: one persisted date per property, advanced only by night audit.
// The browser never supplies the business date; a free-form date input is a work/view date, not the audited date.
export class BusinessDayError extends Error {}
const fail = code => { throw new BusinessDayError(code); };

export const isDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;

export function nextDay(date) {
  if (!isDate(date)) fail('date');
  return new Date(Date.parse(`${date}T00:00:00Z`) + 86400000).toISOString().slice(0, 10);
}

export function upgradeBusinessDay(state) {
  const next = { ...state };
  // Never reseed: an existing persisted business date is authoritative.
  next.businessDate ??= null;
  next.nightAudits ??= [];
  next.shiftTypes ??= [];
  next.handovers ??= [];
  return next;
}

// Any date strictly before the current business date has already been closed by an audit.
export function isAudited(state, date) {
  const { businessDate } = upgradeBusinessDay(state);
  return Boolean(businessDate) && isDate(date) && date < businessDate;
}

// Latest audit record for a property, or null when no audit has ever run.
export function lastAudit(state) {
  const { nightAudits } = upgradeBusinessDay(state);
  return nightAudits.length ? nightAudits[nightAudits.length - 1] : null;
}

const minutesOf = value => {
  if (typeof value !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) fail('input');
  return Number(value.slice(0, 2)) * 60 + Number(value.slice(3, 5));
};

// A shift may cross midnight, so an end at or before its start wraps into the next day.
function shiftWindows(types) {
  return types.map(t => {
    const start = minutesOf(t.start), end = minutesOf(t.end);
    return { id: t.id, start, end: end <= start ? end + 1440 : end };
  });
}

export function shiftsOverlap(a, b) {
  const [left] = shiftWindows([a]);
  for (const offset of [0, 1440]) {
    const right = { start: minutesOf(b.start) + offset, end: (() => {
      const s = minutesOf(b.start), e = minutesOf(b.end);
      return (e <= s ? e + 1440 : e) + offset;
    })() };
    if (left.start < right.end && right.start < left.end) return true;
  }
  return false;
}

const boxed = (order, isBoxed) => (isBoxed ? isBoxed(order) : order.inventoryStatus === 'boxed');

// Reference rule, independently implemented: arrivals that never arrived and departures that never
// left must be resolved before the day closes. Box expiry and unsettled history are advisory only.
export function nightAuditExceptions(state, businessDate, isBoxed) {
  if (!isDate(businessDate)) fail('date');
  const orders = (state.orders || []).filter(o => o.propertyId === undefined || true);
  const exceptions = [];
  for (const order of orders) {
    if (order.status === 'cancelled') continue;
    if (order.status === 'confirmed' && !boxed(order, isBoxed) && order.start <= businessDate)
      exceptions.push({ kind: 'no_show', severity: 'required', orderId: order.id, guest: order.guest || '', date: order.start });
    else if (order.status === 'checked_in' && order.end <= businessDate)
      exceptions.push({ kind: 'overdue_checkout', severity: 'required', orderId: order.id, guest: order.guest || '', date: order.end });
    else if (order.status === 'confirmed' && boxed(order, isBoxed) && order.end <= businessDate)
      exceptions.push({ kind: 'box_expiring', severity: 'advisory', orderId: order.id, guest: order.guest || '', date: order.end });
    else if (order.status === 'checked_out' && order.folioClosed !== true && order.end <= businessDate)
      exceptions.push({ kind: 'unsettled_history', severity: 'advisory', orderId: order.id, guest: order.guest || '', date: order.end });
  }
  const rank = { required: 0, advisory: 1 };
  return exceptions.sort((a, b) => rank[a.severity] - rank[b.severity] || a.date.localeCompare(b.date) || a.orderId.localeCompare(b.orderId));
}

export function shiftSummary(state, { from, to }) {
  if (typeof from !== 'string' || typeof to !== 'string' || !from || !to || from >= to) fail('shift_window');
  const kinds = ['payment', 'refund', 'deposit_in', 'deposit_out'];
  const byKind = Object.fromEntries(kinds.map(kind => [kind, { count: 0, amount: 0 }]));
  const byMethod = {};
  // Only money that actually changes the cash drawer belongs in a cash count:
  // room payments less refunds. Deposits are a liability held separately and are
  // never counted as till cash, so they get their own column, not this one.
  const cashByMethod = {};
  let count = 0;
  for (const order of state.orders || []) for (const transaction of order.transactions || []) {
    if (typeof transaction.at !== 'string' || transaction.at < from || transaction.at >= to) continue;
    if (!kinds.includes(transaction.kind)) continue;
    byKind[transaction.kind].count += 1;
    byKind[transaction.kind].amount += transaction.amount;
    const method = typeof transaction.method === 'string' ? transaction.method : 'unknown';
    byMethod[method] ??= { count: 0, amount: 0 };
    byMethod[method].count += 1;
    byMethod[method].amount += transaction.amount;
    if (transaction.kind === 'payment' || transaction.kind === 'refund') {
      cashByMethod[method] = (cashByMethod[method] || 0) + (transaction.kind === 'payment' ? transaction.amount : -transaction.amount);
    }
    count += 1;
  }
  return { from, to, count, byKind, byMethod,
    net: byKind.payment.amount - byKind.refund.amount,
    depositNet: byKind.deposit_in.amount - byKind.deposit_out.amount,
    cashExpectedByMethod: cashByMethod,
    cashExpectedTotal: Object.values(cashByMethod).reduce((sum, value) => sum + value, 0) };
}

// Commands are applied to an already-cloned draft; every failure throws before any mutation lands.
export function applyBusinessDay(next, command, reject, { isBoxed } = {}) {
  const state = upgradeBusinessDay(next);
  const { type } = command;
  if (type === 'business_date_init') {
    // Set once by an administrator. Never silently guessed from the server clock.
    if (state.businessDate) reject('state');
    if (!isDate(command.date)) reject('date');
    state.businessDate = command.date;
    return state;
  }
  if (type === 'night_audit') {
    if (!state.businessDate) reject('business_date');
    const exceptions = nightAuditExceptions(state, state.businessDate, isBoxed);
    const blocking = exceptions.filter(entry => entry.severity === 'required');
    if (blocking.length && !command.force) reject('night_audit_exceptions');
    if (command.force) {
      const reason = typeof command.reason === 'string' ? command.reason.trim() : '';
      if (!reason || reason.length > 500) reject('reason');
      command.reason = reason;
    }
    const closed = state.businessDate;
    state.businessDate = nextDay(closed);
    state.nightAudits.push({ id: command.id, at: command.at, actor: command.actor || 'local',
      businessDate: closed, nextDate: state.businessDate, mode: command.mode === 'auto' ? 'auto' : 'manual',
      forced: Boolean(command.force), reason: command.force ? command.reason : '',
      exceptions, blocking: blocking.length });
    return state;
  }
  if (type === 'shift_save') {
    const name = typeof command.name === 'string' ? command.name.trim() : '';
    if (!name || name.length > 20) reject('input');
    const start = typeof command.start === 'string' ? command.start : '';
    const end = typeof command.end === 'string' ? command.end : '';
    minutesOf(start); minutesOf(end);
    if (start === end) reject('input');
    const id = command.shiftId || `shift-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    // Without an explicit id this is a new shift, so a colliding slug means a duplicate name.
    if (!command.shiftId && state.shiftTypes.some(t => t.id === id)) reject('shift_name');
    const others = state.shiftTypes.filter(t => t.id !== id);
    if (others.some(t => t.name === name)) reject('shift_name');
    const candidate = { id, name, start, end };
    if (others.some(t => shiftsOverlap(t, candidate))) reject('shift_overlap');
    const existing = state.shiftTypes.find(t => t.id === id);
    if (existing) Object.assign(existing, candidate);
    else state.shiftTypes.push(candidate);
    state.shiftTypes.sort((a, b) => minutesOf(a.start) - minutesOf(b.start));
    return state;
  }
  if (type === 'shift_delete') {
    const target = state.shiftTypes.find(t => t.id === command.shiftId);
    if (!target) reject('scope');
    if (state.handovers.some(h => h.shiftTypeId === target.id)) reject('shift_in_use');
    state.shiftTypes = state.shiftTypes.filter(t => t.id !== target.id);
    return state;
  }
  if (type === 'shift_handover') {
    if (!state.businessDate) reject('business_date');
    const shift = state.shiftTypes.find(t => t.id === command.shiftTypeId);
    if (!shift) reject('scope');
    const from = typeof command.from === 'string' ? command.from : '';
    const to = typeof command.to === 'string' ? command.to : '';
    if (!from || !to || from >= to) reject('shift_window');
    const note = typeof command.note === 'string' ? command.note.trim() : '';
    if (note.length > 500) reject('input');
    const summary = shiftSummary(state, { from, to });
    // A cash count is optional. Omitting it leaves an old-style handover exactly as
    // it was: no cashCount field at all, never a guessed zero. The till total is
    // one whole number of minor units, the figure a person actually counts. The
    // expected figure is payments less refunds only; deposits stay in their own
    // column because they are a liability, not money in the drawer.
    let cashCount = null;
    if (command.countedCash !== undefined) {
      if (!Number.isSafeInteger(command.countedCash) || command.countedCash < 0 || command.countedCash > 100000000) reject('cash_count');
      const variance = command.countedCash - summary.cashExpectedTotal;
      cashCount = { counted: command.countedCash, expected: summary.cashExpectedTotal, variance,
        status: variance === 0 ? 'balanced' : 'pending', approval: null };
    }
    state.handovers.push({ id: command.id, at: command.at, actor: command.actor || 'local',
      businessDate: state.businessDate, shiftTypeId: shift.id, shiftName: shift.name, from, to, note, summary,
      ...(cashCount ? { cashCount } : {}) });
    return state;
  }
  // A short or over till is never silently written off. An administrator records a
  // reason against the variance; the counted and expected figures are never changed
  // by the approval, so the original discrepancy stays readable on the record.
  if (type === 'cash_variance_approve') {
    const reason = typeof command.reason === 'string' ? command.reason.trim() : '';
    if (!reason || reason.length > 500) reject('input');
    const target = state.handovers.find(h => h.id === command.handoverId);
    if (!target || !target.cashCount) reject('scope');
    if (target.cashCount.status !== 'pending') reject('cash_variance_decided');
    state.handovers = state.handovers.map(h => h.id === command.handoverId
      ? { ...h, cashCount: { ...h.cashCount, status: 'approved', approval: { at: command.at, actor: command.actor || 'local', reason } } }
      : h);
    return state;
  }
  reject('input');
  return state;
}

// Folded in above: a release install only refreshes files that already exist,
// so the business-day rules live here rather than in a new module.
const businessDayActions = ['business_date_init','night_audit','shift_save','shift_delete','shift_handover','cash_variance_approve'];
import { planInventory } from './inventory.js';
import { upgradeCatalog, configureCatalog, saleResources, overlapsAtoms, isClean, setCleaning } from './catalog.js';
import { createReservation, stayDays, prepareStay } from './reservations.js';
export class DemoError extends Error {}
const reject = code => { throw new DemoError(code); };
// How much a notice matters. Kept here rather than in the server alone so the desk
// page and the shared backend can never disagree about the default, the names of
// the kinds or what a property is allowed to override.
export const noticeLevels=['urgent','attention','routine'];
export const noticeKinds=['no_show','overdue_checkout','unassigned_arrival','checkin_review','booking_request','request_waiting','rooms_to_clean'];
export const noticeDefaults={no_show:'urgent',overdue_checkout:'urgent',unassigned_arrival:'urgent',checkin_review:'urgent',
  booking_request:'attention',request_waiting:'attention',rooms_to_clean:'routine'};
export const severityRank={urgent:0,attention:1,routine:2};
// An override is only honoured for a kind this build knows and a level that exists;
// an unlisted kind is not invented as urgent, it waits behind the people who are here.
export const severityOf=(kind,levels)=>{
  const override=levels&&Object.hasOwn(levels,kind)?levels[kind]:null;
  return noticeLevels.includes(override)?override:(noticeDefaults[kind]||'attention');
};
// Validation is shared so a browser value and a stored value are checked the same way.
// Only explicit overrides are kept: a level left at the default follows the current
// system rule instead of freezing an old one into the property's settings.
export const cleanNoticeLevels=value=>{
  if(!value||typeof value!=='object'||Array.isArray(value))return null;
  const out={};
  for(const [kind,level] of Object.entries(value)){
    if(!noticeKinds.includes(kind))return null;
    if(level===null||level===undefined||level===''||level==='default')continue;
    if(!noticeLevels.includes(level))return null;
    out[kind]=level;
  }
  return out;
};
// A conditional rule is about a fact that can be counted, not about an event. Only
// these kinds have a standing magnitude the desk can compare with a threshold: how
// many rooms are dirty, how many requests are being left waiting, how many identity
// details are waiting on a person. Stored events have no size to measure, so no rule
// can be written for them.
export const noticeRuleKinds=['rooms_to_clean','request_waiting','checkin_review'];
// A rule reads "when there are at least N of this fact, treat it as this level".
// Only explicit rules are kept, so a kind left alone keeps following the system
// default and a threshold of one is still a deliberate choice.
export const cleanNoticeRules=value=>{
  if(!value||typeof value!=='object'||Array.isArray(value))return null;
  const out={};
  for(const [kind,rule] of Object.entries(value)){
    if(!noticeRuleKinds.includes(kind))return null;
    if(rule===null||rule===undefined||rule===''||rule==='default')continue;
    if(!rule||typeof rule!=='object'||Array.isArray(rule))return null;
    if(!Number.isInteger(rule.atLeast)||rule.atLeast<1||rule.atLeast>99)return null;
    if(!noticeLevels.includes(rule.level))return null;
    out[kind]={atLeast:rule.atLeast,level:rule.level};
  }
  return out;
};
// A rule can only raise a notice towards the top of the list, never push a guest
// waiting at the door down behind routine work. If the threshold is not met, or the
// chosen level is not more urgent than the base, the base is what is read.
export const escalateSeverity=(kind,base,magnitude,rules)=>{
  const rule=rules&&Object.hasOwn(rules,kind)?rules[kind]:null;
  if(!rule||typeof magnitude!=='number'||!(magnitude>=rule.atLeast))return base;
  return severityRank[rule.level]<severityRank[base]?rule.level:base;
};
export function seed() {
  const properties = [{ id: 'TEST-KL', name: 'TEST · Kuala Lumpur' }, { id: 'TEST-PG', name: 'TEST · Penang' }];
  const resources = properties.flatMap(p => [
    ...Array.from({ length: p.id === 'TEST-KL' ? 10 : 2 }, (_, i) => ({ id: `${p.id}-R${i+1}`, label: `R${String(i+1).padStart(2,'0')}`, roomId: `${p.id}-R${i+1}`, propertyId: p.id, productId: 'room', gender: 'any', atoms: [`${p.id}-R${i+1}`], cleaning: 'clean' })),
    ...Array.from({ length: p.id === 'TEST-KL' ? 30 : 6 }, (_, i) => ({ id: `${p.id}-B${i+1}`, label: `D${Math.floor(i/6)+1} · B${i%6+1}`, roomId: `${p.id}-D${Math.floor(i/6)+1}`, propertyId: p.id, productId: 'bed', gender: i < 12 ? 'female' : i < 24 ? 'male' : 'any', atoms: [`${p.id}-B${i+1}`], cleaning: 'clean' }))
  ]);
  return upgradeCatalog({ version: 1, properties, resources, orders: [], blocks: [], audit: [], notifications: [], noticeSettings: [], noticeRules: [] });
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
  let next = upgradeBusinessDay(upgradeCatalog(state));
  for (const o of next.orders) { o.nightly ??= 0; o.transactions ??= []; o.notes ??= ''; o.source ??= 'direct'; o.locked ??= false; }
  const { type, propertyId } = command;
  if (['checkin','checkout'].includes(type) && (typeof command.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(command.date))) reject('date');
  if (!next.properties.some(p => p.id === propertyId)) reject('scope');
  let order = next.orders.find(o => o.id === command.orderId && o.propertyId === propertyId);
  let resource = next.resources.find(r => r.id === command.resourceId && r.propertyId === propertyId);
  const inHouse = target => next.orders.some(o => o.propertyId === propertyId && o.status === 'checked_in' &&
    (!['assign','checkin'].includes(type) || o.id !== order?.id) && overlapsAtoms(next.resources.find(r => r.id === o.resourceId), target));
  const staySnapshot = o => o ? { start:o.start, end:o.end, nightly:o.nightly, resourceId:o.resourceId,
    status:o.status, productId:o.productId, finalCharge:o.finalCharge ?? null } : null;
  const stayBefore = ['edit','assign','checkin','checkout','cancel','lock'].includes(type) ? staySnapshot(order) : null;
  const catalogActions = ['room_type_save','physical_room_save','suite_save','resource_update','resource_archive'];
  const needsOrder = ['settle','reopen_folio','assign','checkin','checkout','edit','payment','cancel','lock','commission_save'].includes(type);
  if (needsOrder && !order) reject('scope');
  if(order?.folioClosed&&['edit','payment','cancel'].includes(type))reject('folio_closed');
  // Clearing test bookings removes them outright rather than cancelling them, so a
  // property can be emptied of seeded or rehearsal data without leaving it in the
  // ledger as cancelled revenue. It only ever touches stays whose guest name begins
  // with the prefix it was given, so a real booking cannot be caught by accident,
  // and it refuses to run when nothing matches rather than reporting a false success.
  if (type === 'purge_test_orders') {
    const prefix = (typeof command.prefix === 'string' && command.prefix.trim() ? command.prefix.trim() : 'TEST').slice(0,20);
    const match = prefix.toUpperCase();
    const doomed = next.orders.filter(o => o.propertyId === propertyId && String(o.guest||'').toUpperCase().startsWith(match));
    if (!doomed.length) reject('nothing_to_purge');
    const gone = new Set(doomed.map(o => o.id));
    next.orders = next.orders.filter(o => !gone.has(o.id));
    // A booking record exists only to hold its stays, so one left with none goes too.
    next.reservations = (next.reservations||[]).filter(r => r.propertyId !== propertyId || r.stayIds.some(id => !gone.has(id)));
  }
  // Locally both notice settings live in the state itself. Both modes use the same
  // validation, so a value the shared backend would refuse is refused here too. The
  // level is always recomputed from the system default, the property's own level and
  // any conditional rule together, so saving either setting cannot leave a stale one.
  const noticeRecalc = (state, scope) => {
    const levels = state.noticeSettings?.find(s => s.propertyId === scope)?.levels;
    const rules = state.noticeRules?.find(s => s.propertyId === scope)?.rules;
    state.notifications = (state.notifications||[]).map(n => n.propertyId === scope
      ? {...n, severity: escalateSeverity(n.kind, severityOf(n.kind, levels), n.magnitude, rules)} : n);
  };
  if (type === 'notice_severity_save') {
    const levels = cleanNoticeLevels(command.levels);
    if (!levels) reject('input');
    next.noticeSettings = [...(next.noticeSettings||[]).filter(s => s.propertyId !== propertyId),
      {propertyId, levels, updatedAt: command.at, updatedBy: command.actor || 'local'}];
    noticeRecalc(next, propertyId);
  }
  // A conditional rule is a setting of its own: it changes no business state and only
  // raises a standing fact towards the top when the fact is big enough to warrant it.
  if (type === 'notice_rule_save') {
    const rules = cleanNoticeRules(command.rules);
    if (!rules) reject('input');
    next.noticeRules = [...(next.noticeRules||[]).filter(s => s.propertyId !== propertyId),
      {propertyId, rules, updatedAt: command.at, updatedBy: command.actor || 'local'}];
    noticeRecalc(next, propertyId);
  }
  // Nights already closed by a night audit cannot be rewritten without an explicit override.
  // Authorization for that override is enforced by the shared service, never by the browser.
  // A closed night freezes the revenue it earned: rewriting or cancelling a stay can
  // change history, so both need an administrator override. Taking money does not change
  // what was earned, so a receipt is never blocked by a night that is already closed.
  if (order && ['edit','cancel'].includes(type) && command.auditOverride !== true &&
      (isAudited(next, order.start) || isAudited(next, order.end))) reject('audited');
  if (order && isBoxed(order) && ['assign','checkin','checkout','lock'].includes(type)) reject('box_state');
  if(type==='settle'){const f=folio(order);if(order.folioClosed)reject('folio_closed');if(f.due!==0||f.deposit!==0)reject('balance');order.folioClosed=true;(order.folioEvents??=[]).push({type:'settle',at:command.at,actor:command.actor||'local',charge:f.charge,paid:f.paid,deposit:f.deposit});}
  else if(type==='reopen_folio'){if(!order.folioClosed)reject('state');const reason=text(command.reason||'',500).trim();if(!reason)reject('reason');order.folioClosed=false;(order.folioEvents??=[]).push({type:'reopen',at:command.at,actor:command.actor||'local',reason});}
  else if(['rate_plan_save','rate_plan_archive','rates_bulk_update'].includes(type)){changeRates(next,command);}
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
    order.transactions.push({ id:command.id, actor:command.actor||'local', kind:command.kind, amount, method:command.method, reference:text(command.reference||'',100),note:text(command.note||'',500), at:command.at });
  } else if (type === 'commission_save') {
    // A channel commission is the amount the channel actually billed, entered by
    // finance from that invoice. No rate is configured and none is ever inferred.
    if (!Number.isSafeInteger(command.amount) || command.amount < 0 || command.amount > 100000000) reject('commission_input');
    const reference = String(command.reference ?? '').trim();
    if (!reference || reference.length > 100) reject('commission_input');
    const note = String(command.note ?? '').trim();
    if (note.length > 500) reject('commission_input');
    if (typeof command.settled !== 'boolean') reject('commission_input');
    order.commission = {amount: command.amount, reference, note, at: command.at, actor: command.actor || 'local',
      settledAt: command.settled ? command.at : null, settledBy: command.settled ? (command.actor || 'local') : null};
  } else if (type === 'cancel') {
    if (order.status !== 'confirmed' || !command.reason?.trim()) reject('state');
    order.finalCharge = money(command.finalCharge);
    // The penalty belongs to the night the cancellation happened. Without a trusted
    // business date it is left undated and reports must show it as unallocated.
    const postingDate = upgradeBusinessDay(next).businessDate;
    if (postingDate) order.cancelBusinessDate = postingDate;
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
  } else if (businessDayActions.includes(type)) {
    try { next = applyBusinessDay(next, command, reject, { isBoxed }); }
    catch (e) { if (e instanceof BusinessDayError) reject(e.message); throw e; }
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
  } else if (!['purge_test_orders','notice_severity_save','notice_rule_save'].includes(type)) reject('input');
  preview(next, propertyId);
  const movedTo = next.orders.find(o => o.id === (order?.id || command.id)) || null;
  next.audit.unshift({ id: command.id || `${command.at}-${next.audit.length}`, propertyId, type, orderId: order?.id || null, resourceId: resource?.id || null, resourceIds: command.resourceIds, cleaning:command.cleaning, actor: command.actor || 'local',
    ...(stayBefore || ['create','box_stays','restore_stays'].includes(type) ? { stayChange:{ before:stayBefore,
      after:['box_stays','restore_stays'].includes(type) ? null : staySnapshot(movedTo),
      reason: typeof command.reason === 'string' ? command.reason.trim() : null } } : {}),
    ...(businessDayActions.includes(type)?{businessDate:next.businessDate,closedDate:command.type==='night_audit'?next.nightAudits.at(-1).businessDate:null}:{}), at: command.at });
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
