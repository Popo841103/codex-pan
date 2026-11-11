import {previewIcal} from './financial-reports.js';
import {localDay} from './dashboard.js';
import {changeRates} from './rates.js';
import { isBoxed, occupiesInventory, operationalBlock, changeOrderBox, roomStatusRows } from './inventory-actions.js';
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
  const orders = state.orders || [];
  const exceptions = [];
  for (const order of orders) {
    if (order.status === 'cancelled') continue;
    if (order.status === 'confirmed' && !boxed(order, isBoxed) && order.start <= businessDate)
      exceptions.push({ kind: 'no_show', severity: 'required', orderId: order.id, guest: order.guest || '', date: order.start });
    else if (order.status === 'checked_in' && (order.hourly?order.start:order.end) <= businessDate)
      exceptions.push({ kind: 'overdue_checkout', severity: 'required', orderId: order.id, guest: order.guest || '', date: order.end });
    else if (order.status === 'confirmed' && boxed(order, isBoxed) && order.start <= businessDate)
      exceptions.push({ kind: 'box_expiring', severity: 'advisory', orderId: order.id, guest: order.guest || '', date: order.start });
    else if (order.status === 'checked_out' && order.folioClosed !== true && order.end <= businessDate)
      exceptions.push({ kind: 'unsettled_history', severity: 'advisory', orderId: order.id, guest: order.guest || '', date: order.end });
  }
  const rank = { required: 0, advisory: 1 };
  return exceptions.sort((a, b) => rank[a.severity] - rank[b.severity] || a.date.localeCompare(b.date) || a.orderId.localeCompare(b.orderId));
}

export function shiftSummary(state, { from, to, propertyId, operator }) {
  const lower=Date.parse(from),upper=Date.parse(to);
  if(typeof from!=='string'||typeof to!=='string'||!Number.isFinite(lower)||!Number.isFinite(upper)||lower>=upper)fail('shift_window');
  const inWindow=at=>{const instant=Date.parse(at);return instant>=lower&&instant<upper;};
  const kinds = ['payment', 'refund', 'deposit_in', 'deposit_out'];
  const byKind = Object.fromEntries(kinds.map(kind => [kind, { count: 0, amount: 0 }]));
  const byMethod = {};
  // Only money that actually changes the cash drawer belongs in a cash count:
  // room payments less refunds. Deposits are a liability held separately and are
  // never counted as till cash, so they get their own column, not this one.
  const cashByMethod = {};
  let count = 0;
  for (const order of state.orders || []) for (const transaction of order.transactions || []) {
    if ((propertyId&&order.propertyId!==propertyId)||!inWindow(transaction.at)||(operator&&transaction.actor!==operator)) continue;
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
  let arNet=0, arCash=0;
  for (const entry of state.arEvents || []) {
    if (propertyId && entry.propertyId!==propertyId || !inWindow(entry.at)||(operator&&entry.actor!==operator)) continue;
    if (!['ar_write_off','ar_undo_write_off'].includes(entry.type)) continue;
    const movement=entry.type==='ar_write_off'?entry.amount:-entry.amount;
    arNet+=movement;
    if (entry.method==='cash') arCash+=movement;
  }
  if (arCash) cashByMethod.cash=(cashByMethod.cash||0)+arCash;
  return { from, to, count, byKind, byMethod, ...(arNet||arCash?{arNet,arCash}:{}),
    net: byKind.payment.amount - byKind.refund.amount,
    depositNet: byKind.deposit_in.amount - byKind.deposit_out.amount,
    cashExpectedByMethod: cashByMethod,
    cashExpectedTotal: cashByMethod.cash||0 };
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
    if (blocking.length && (!command.force||command.mode==='auto')) reject('night_audit_exceptions');
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
  if(type==='shift_mode_save'){
    if(!['shift','shift_person'].includes(command.mode))reject('input');
    const property=state.properties.find(row=>row.id===command.propertyId);
    if(!property)reject('scope');
    property.handoverMode=command.mode;
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
    const mode=state.properties.find(row=>row.id===command.propertyId)?.handoverMode||'shift';
    const operator=mode==='shift_person'?(command.actor||'local'):undefined;
    const summary = shiftSummary(state, { from, to, propertyId:command.propertyId,operator });
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
      ...(operator?{operator}:{}),
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
const businessDayActions = ['business_date_init','night_audit','shift_save','shift_delete','shift_handover','shift_mode_save','cash_variance_approve'];
import { planInventory, InventoryConflict } from './inventory.js';
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
  const owners=new Map();
  const demands = state.orders.filter(o => o.propertyId === propertyId && occupiesInventory(o)).flatMap(o => (o.roomSegments||[{start:o.start,end:o.end,resourceId:o.resourceId}]).map((part,i)=>{const id=o.roomSegments?o.id+'#segment-'+i:o.id;owners.set(id,o.id);return {id,propertyId,productId:o.productId,roomTypeId:o.roomTypeId,gender:o.gender,start:part.start,end:part.end,fixedResourceId:part.resourceId||undefined,hourly:o.hourly,sameRoomGroup:o.group||undefined};}));
  const available = new Set(saleResources(state, propertyId).map(r => r.id));
  return planInventory({ propertyId, resources: state.resources.filter(r => r.propertyId === propertyId).map(r => ({ ...r, archived: !available.has(r.id) })), demands, blocks: state.blocks.filter(b => b.propertyId === propertyId) }).map(p=>({...p,demandId:owners.get(p.demandId)}));
}
// Mutations are copy-on-write: a failed operation leaves the original state intact.
// Shared mode wraps this pure reducer in Store's authorized database transaction.
export function apply(state, command) {
  let next = upgradeBusinessDay(upgradeCatalog(state));
  for (const o of next.orders) { o.nightly ??= 0; o.transactions ??= []; o.notes ??= ''; o.source ??= 'direct'; o.locked ??= false; }
  const { type, propertyId } = command;
  const lastClosed=lastAudit(next)?.businessDate;
  const reversal=['undo_checkin','undo_checkout','restore_cancel'].includes(type);
  let settledStayIds, handledAuditOrders;
  if (['checkin','checkout'].includes(type) && (typeof command.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(command.date))) reject('date');
  if (!next.properties.some(p => p.id === propertyId)) reject('scope');
  let order = next.orders.find(o => o.id === command.orderId && o.propertyId === propertyId);
  let resource = next.resources.find(r => r.id === command.resourceId && r.propertyId === propertyId);
  if(['create','create_reservation','edit'].includes(type)){
   const source=command.source||'direct';
   if((type!=='edit'||source!==order?.source)&&channelSources(next,propertyId).some(r=>r.sourceId===source&&!r.active))reject('source_disabled');
  }

  // Keep the previous commission so the local reducer's audit tells the same
  // before/after story as the shared backend's durable audit.
  const commissionBefore = type === 'commission_save' ? (order?.commission || null) : null;
  const inHouse = target => next.orders.some(o => o.propertyId === propertyId && o.status === 'checked_in' &&
    (!['assign','checkin','undo_checkout'].includes(type) || o.id !== order?.id) && overlapsAtoms(next.resources.find(r => r.id === o.resourceId), target));
  const staySnapshot = o => o ? { start:o.start, end:o.end, nightly:o.nightly, resourceId:o.resourceId,
    status:o.status, roomSegments:o.roomSegments||null, productId:o.productId, finalCharge:o.finalCharge ?? null, charge:folio(o).charge } : null;
  const stayBefore = reversal || ['edit','assign','checkin','checkout','cancel','lock'].includes(type) ? staySnapshot(order) : null;
  const catalogActions = ['room_type_save','physical_room_save','suite_save','resource_update','resource_archive'];
  const needsOrder = ['ar_post','settle_split','settle_bill','settle_undo','settle_unsplit','settle','reopen_folio','assign','checkin','checkout','edit','payment','cancel','lock','commission_save'].includes(type);
  if ((needsOrder||reversal) && !order) reject('scope');
  if(order?.hourly&&type==='edit')reject('hourly_state');
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
    if (doomed.some(o=>o.folioTransfers?.length)) reject('bill_state');
    if (doomed.some(o=>o.arMoves?.length)) reject('ar_state');
    if (doomed.some(o=>o.commission&&isCommissionClosed(next,propertyId,commissionPeriod(o.commission))))reject('commission_period');
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
  if (order && type==='cancel' && command.auditOverride !== true &&
      (isAudited(next, order.start) || isAudited(next, order.end))) reject('audited');
  if (order && isBoxed(order) && ['assign','checkin','checkout','lock'].includes(type)) reject('box_state');
  const changesBoxedCharges=o=>isAudited(next,o.start)||(o.extraCharges||[]).some(row=>isAudited(next,row.businessDate));
  const restoreForSettlement=stays=>{
    const boxedStays=stays.filter(isBoxed);
    if(!boxedStays.length)return;
    if(boxedStays.some(changesBoxedCharges))reject('audited');
    changeOrderBox(next,{...command,type:'restore_stays',orderIds:boxedStays.map(o=>o.id),autoAssign:false,reason:'Folio settlement'},preview);
  };
  if(order&&['settle','ar_post'].includes(type)&&order.status==='confirmed')restoreForSettlement([order]);
  if(order?.splitBills && ['settle','reopen_folio','edit','cancel'].includes(type)) reject('bill_state');
  if(deskActions.includes(type)){changeDesk(next,command);}
  else if(completionActions.includes(type)){changeCompletion(next,command);}
  else if(operationsActions.includes(type)){changeOperations(next,command);}
  else if(['directory_entry_save','customer_tag_set'].includes(type)){changeDirectory(next,command);}
  else if(batchActions.includes(type)){
    changeBatchState(next,command);
  } else if(type==='night_audit_handle_all'){
    if(!isDate(next.businessDate))reject('business_date');
    const instant=Date.parse(command.at);
    if(!Number.isFinite(instant))reject('date');
    const naturalDay=new Date(instant+8*3600000).toISOString().slice(0,10);
    const pending=nightAuditExceptions({orders:next.orders.filter(o=>o.propertyId===propertyId)},next.businessDate,isBoxed)
      .filter(row=>row.severity==='required');
    handledAuditOrders=[];
    const record=(stay,status)=>{
      handledAuditOrders.push({orderId:stay.id,before:stay.status,after:status,resourceId:stay.resourceId});
      stay.status=status;
    };
    for(const row of pending.filter(row=>row.kind==='overdue_checkout')){
      const stay=next.orders.find(o=>o.id===row.orderId);
      record(stay,'checked_out');
      if(stay.resourceId)setCleaning(next,next.resources.find(r=>r.id===stay.resourceId),'dirty');
    }
    for(const row of pending.filter(row=>row.kind==='no_show')){
      const stay=next.orders.find(o=>o.id===row.orderId);
      let assignment=stay.resourceId;
      if(!assignment){
        try{assignment=preview(next,propertyId).find(p=>p.demandId===stay.id)?.resourceId;}
        catch(error){if(!(error instanceof InventoryConflict))throw error;}
      }
      const resource=next.resources.find(r=>r.id===assignment&&r.propertyId===propertyId);
      const status=stay.end<naturalDay?'checked_out':'checked_in';
      if(!resource||status==='checked_in'&&inHouse(resource)){
        handledAuditOrders.push({orderId:stay.id,skipped:'inventory'});
        continue;
      }
      stay.resourceId=assignment;
      record(stay,status);
    }
  } else if (type==='commission_close_month') {
    closeCommissionMonth(next,command);
  } else if (type.startsWith('ar_')) {
    changeReceivables(next,order,command);
  } else if (['settle_split','settle_bill','settle_undo','settle_unsplit'].includes(type)) {
    changeSplitBills(order, command);
  }
  else if(type==='settle') settleFolio(order,command);
  else if(type==='settle_reservation'){
    const parent=next.reservations.find(r=>r.id===command.reservationId&&r.propertyId===propertyId);
    if(!parent||parent.stayIds.length<2)reject('scope');
    const stays=parent.stayIds.map(id=>next.orders.find(o=>o.id===id&&o.propertyId===propertyId&&o.reservationId===parent.id));
    if(stays.some(stay=>!stay))reject('scope');
    const open=stays.filter(stay=>!stay.folioClosed);
    if(!open.length)reject('folio_closed');
    if(open.some(stay=>stay.splitBills))reject('bill_state');
    restoreForSettlement(open.filter(stay=>stay.status==='confirmed'));
    for(const stay of open)settleFolio(stay,command,command.id);
    settledStayIds=open.map(stay=>stay.id);
  }
  else if(type==='reopen_folio'){if(order.arItemId)reject('ar_state');if(!order.folioClosed)reject('state');const reason=text(command.reason||'',500).trim();if(!reason)reject('reason');order.folioClosed=false;(order.folioEvents??=[]).push({type:'reopen',at:command.at,actor:command.actor||'local',reason});}
  else if(['rate_plan_save','rate_plan_archive','rates_bulk_update'].includes(type)){changeRates(next,command);}
  else if (['box_stays','restore_stays'].includes(type)) {
    if(next.orders.some(o=>o.propertyId===propertyId&&Array.isArray(command.orderIds)&&command.orderIds.includes(o.id)&&changesBoxedCharges(o)))reject('audited');
    changeOrderBox(next,command,preview);
  } else if(type==='create_reservation') {
    next=createReservation(next,command,apply,preview);
  } else if(type==='display_preferences_save') {
    saveDisplayPreferences(next, command);
  } else if(type==='memo_save') {
    const memo={text:text(command.text,3000),at:command.at,actor:command.actor||'local'};
    next.properties.find(p=>p.id===propertyId).memo=memo;
    (next.memoHistory??=[]).push({id:command.id,propertyId,businessDate:next.businessDate||null,...memo});
  } else if (catalogActions.includes(type)) {
    configureCatalog(next, command);
  } else if (type === 'create') {
    if(next.nightAudits.length&&isAudited(next,command.start)&&command.auditOverride!==true)reject('audited');
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
    if(command.dragDate!==undefined){
      if(!isDate(command.dragDate))reject('date');
      if(lastClosed&&command.auditOverride!==true&&(order.start<=lastClosed||command.dragDate<=lastClosed))reject('audited');
      // Drag is a room change; rescheduling uses the existing edit and pricing flow.
      if(!order.resourceId||command.dragDate!==order.start)reject('date');
    }
    const from=command.fromDate||order.start;
    if(!isDate(from)||from<order.start||from>=order.end||order.hourly&&from!==order.start)reject('date');
    if(lastClosed&&from<=lastClosed&&command.auditOverride!==true)reject('audited');
    if(command.fromDate&&(!order.resourceId||!command.reason?.trim()))reject('reason');
    if (order.status === 'checked_in' && !isClean(next, resource)) reject('dirty');
    if (order.status === 'checked_in' && inHouse(resource)) reject('occupied');
    if (order.resourceId === resource.id) reject('state');
    if(from>order.start&&order.group)reject('segmented_stay');
    const previous = order.resourceId;
    if(from>order.start){
      const segments=order.roomSegments||[{start:order.start,end:order.end,resourceId:previous}];
      order.roomSegments=[...segments.filter(p=>p.start<from).map(p=>({...p,end:p.end>from?from:p.end})),{start:from,end:order.end,resourceId:resource.id}];
    }else delete order.roomSegments;
    order.resourceId = resource.id;
    order.history.push({ from: previous, to: resource.id, fromDate:command.fromDate||order.start, reason:command.reason||'', at: command.at });
    if (previous && order.status === 'checked_in') setCleaning(next, next.resources.find(r => r.id === previous), 'dirty');
  } else if (type === 'edit') {
    if (['checked_out','cancelled'].includes(order.status)) reject('state');
    if (order.status === 'checked_in' && command.start !== order.start) reject('state');
    if(order.roomSegments&&(command.start!==order.start||command.end!==order.end))reject('segmented_stay');
    if (typeof command.guest !== 'string' || !command.guest.trim()) reject('guest');
    order.guest = text(command.guest.trim(),100);
    if(lastClosed&&command.auditOverride!==true&&(
      (command.start!==order.start||command.arrivalTime!==undefined&&command.arrivalTime!==order.arrivalTime)&&command.start<lastClosed||
      (command.end!==order.end||command.departureTime!==undefined&&command.departureTime!==order.departureTime)&&command.end<=lastClosed))reject('audited');
    amendNightlyRates(next,order,command);
    order.start = command.start; order.end = command.end;
    order.nightly = money(command.nightly);
    order.notes = text(command.notes || '',2048);
    order.source = validSource(command.source);
    Object.assign(order,guestFields(command,order));
    if(command.occupants!==undefined&&order.reservationId)Object.assign(order,prepareStay(next,propertyId,{...order,occupants:command.occupants,arrivalTime:command.arrivalTime??order.arrivalTime,departureTime:command.departureTime??order.departureTime}));
  } else if (type === 'lock') {
    if (!order.resourceId || ['checked_out','cancelled'].includes(order.status)) reject('state');
    if(command.locked!==undefined&&typeof command.locked!=='boolean')reject('input');
    order.locked = command.locked ?? !order.locked;
  } else if (type === 'transfer_folio_credit') {
    const parent=next.reservations.find(r=>r.id===command.reservationId&&r.propertyId===propertyId);
    if(!parent||command.fromId===command.toId)reject('scope');
    const find=id=>next.orders.find(o=>o.id===id&&o.propertyId===propertyId&&o.reservationId===parent.id&&parent.stayIds.includes(id));
    const from=find(command.fromId), to=find(command.toId);
    if(!from||!to)reject('scope');
    if([from,to].some(o=>o.folioClosed||o.splitBills||o.arMoves?.length||isBoxed(o)))reject('bill_state');
    if(!isDate(next.businessDate))reject('business_date');
    const reason=text(command.reason,500).trim();
    if(!reason)reject('reason');
    const entry={id:command.id,fromId:from.id,toId:to.id,businessDate:next.businessDate,at:command.at,actor:command.actor||'local',reason};
    let amount;
    if(command.reverses!==undefined){
      const originalId=text(command.reverses,100);
      const originals=[from,to].map(stay=>{
        const history=stay.folioTransfers||[];
        const reversed=new Set(history.map(row=>row.reverses).filter(Boolean));
        return history.findLast(row=>!row.reverses&&!reversed.has(row.id));
      });
      const [out,incoming]=originals;
      if(!out||!incoming||out.id!==originalId||incoming.id!==originalId||
        out.fromId!==from.id||out.toId!==to.id||incoming.amount<=0||out.amount!==-incoming.amount)reject('bill_state');
      entry.reverses=originalId;
      amount=-incoming.amount;
    }else{
      amount=money(command.amount);
      const credit=folio(from);
      if(!amount||amount>Math.min(-credit.due,credit.paid+Math.min(credit.folioCredit||0,0),folio(to).due))reject('balance');
    }
    (from.folioTransfers??=[]).push({...entry,amount:-amount});
    (to.folioTransfers??=[]).push({...entry,amount});
  } else if (type === 'undo_reservation_payment') {
    const parent=next.reservations.find(r=>r.id===command.reservationId&&r.propertyId===propertyId);
    if(!parent)reject('scope');
    const batchId=text(command.batchId,100);
    const reason=text(command.reason,500).trim();
    if(!batchId||!reason)reject('reason');
    const originals=[];
    for(const stay of next.orders){
      if(stay.propertyId!==propertyId||stay.reservationId!==parent.id||!parent.stayIds.includes(stay.id))continue;
      const index=stay.transactions.findIndex(row=>row.kind==='payment'&&row.batchId===batchId);
      if(index<0)continue;
      const original=stay.transactions[index];
      if(stay.folioClosed||stay.splitBills||stay.folioTransfers?.length||stay.transactions.slice(index+1).some(row=>row.kind==='refund'))reject('bill_state');
      if(folio(stay).paid<original.amount)reject('balance');
      originals.push({stay,original});
    }
    if(originals.length<2)reject('bill_state');
    for(const [index,{stay,original}] of originals.entries()){
      stay.transactions.push({
        id:command.id+':'+index,batchId:command.id,reverses:original.id,reversesBatchId:batchId,
        actor:command.actor||'local',kind:'refund',businessDate:next.businessDate||null,amount:original.amount,method:original.method,
        reference:original.reference,note:reason,at:command.at
      });
    }
  } else if (type === 'payment_reservation') {
    const parent=next.reservations.find(r=>r.id===command.reservationId&&r.propertyId===propertyId);
    if(!parent)reject('scope');
    const {allocations,method}=command;
    const total=money(command.amount);
    if(!total||!Array.isArray(allocations)||allocations.length<2||allocations.length>parent.stayIds.length)reject('amount');
    if(!['cash','bank','card'].includes(method))reject('input');
    const reference=text(command.reference||'',100), note=text(command.note||'',500);
    const seen=new Set();
    let allocated=0;
    for(const [index,row] of allocations.entries()){
      const amount=money(row?.amount);
      if(!amount||seen.has(row.orderId))reject('amount');
      const stay=next.orders.find(o=>o.id===row.orderId&&o.propertyId===propertyId&&o.reservationId===parent.id);
      if(!stay||!parent.stayIds.includes(stay.id))reject('scope');
      if(stay.folioClosed||stay.splitBills)reject('bill_state');
      if(amount>folio(stay).due)reject('balance');
      seen.add(stay.id);
      allocated+=amount;
      stay.transactions.push({
        id:command.id+':'+index,batchId:command.id,actor:command.actor||'local',
        kind:'payment',businessDate:next.businessDate||null,amount,method,reference,note,at:command.at
      });
    }
    if(allocated!==total)reject('amount');
  } else if (type === 'payment') {
    const amount = money(command.amount);
    if (!amount || !['payment','refund','deposit_in','deposit_out'].includes(command.kind)) reject('amount');
    if (!['cash','bank','card','ota'].includes(command.method)) reject('input');
    const balance = folio(order);
    if (command.kind === 'refund' && amount > balance.paid+Math.min(balance.folioCredit||0,0)) reject('refund');
    if (command.kind === 'deposit_out' && amount > balance.deposit) reject('refund');
    let bill;
    if (command.kind === 'payment' || command.kind === 'refund') {
      if (order.splitBills) {
        bill = order.splitBills.find(b => b.id === command.billId);
        if (!bill || bill.closedBy) reject('bill_state');
        if (command.kind === 'refund' && amount > bill.paid) reject('refund');
        bill.paid += command.kind === 'payment' ? amount : -amount;
      } else if (command.billId) reject('bill_state');
    }
    order.transactions.push({ ...(bill ? {billId:bill.id} : {}), id:command.id, actor:command.actor||'local', kind:command.kind, businessDate:next.businessDate||null, amount, method:command.method, reference:text(command.reference||'',100),note:text(command.note||'',500), at:command.at });
  } else if (type === 'commission_save') {
    // A channel commission is the amount the channel actually billed, entered by
    // finance from that invoice. No rate is configured and none is ever inferred.
    if (!Number.isSafeInteger(command.amount) || command.amount < 0 || command.amount > 100000000) reject('commission_input');
    const reference = String(command.reference ?? '').trim();
    if (!reference || reference.length > 100) reject('commission_input');
    const note = String(command.note ?? '').trim();
    if (note.length > 500) reject('commission_input');
    if (typeof command.settled !== 'boolean') reject('commission_input');
    const period=commissionPeriod(order.commission)||(isDate(next.businessDate)?next.businessDate.slice(0,7):commissionPeriod({at:command.at}));
    if(command.correction===true){
      if(!order.commission||!isCommissionClosed(next,propertyId,period)||!isDate(next.businessDate))reject('commission_period');
      const currentMonth=next.businessDate.slice(0,7);
      if(isCommissionClosed(next,propertyId,currentMonth))reject('commission_period');
      const history=order.commissionCorrections??=[];
      const previous=history.at(-1)?.correctedAmount??order.commission.amount;
      if(!note||command.amount===previous||reference===order.commission.reference||history.some(row=>row.reference===reference))reject('commission_input');
      history.push({id:command.id,businessDate:next.businessDate,period:currentMonth,originalPeriod:period,reference,note,
        amount:command.amount-previous,correctedAmount:command.amount,at:command.at,actor:command.actor||'local'});
    }else{
      if(isCommissionClosed(next,propertyId,period))reject('commission_period');
      order.commission = {businessDate:order.commission?.businessDate??(isDate(next.businessDate)?next.businessDate:null),expected:order.commission?.expected??expectedCommission(next,order,next.businessDate||''),amount: command.amount, reference, note, at: command.at, actor: command.actor || 'local',...(period?{period}:{}),
      settledAt: command.settled ? command.at : null, settledBy: command.settled ? (command.actor || 'local') : null};
    }
  } else if (type === 'cancel') {
    if (order.status !== 'confirmed' || !command.reason?.trim()) reject('state');
    order.finalCharge = money(command.finalCharge);
    // The penalty belongs to the night the cancellation happened. Without a trusted
    // business date it is left undated and reports must show it as unallocated.
    const postingDate = upgradeBusinessDay(next).businessDate;
    if (postingDate) order.cancelBusinessDate = postingDate;
    order.cancelledAt = command.at;
    order.status = 'cancelled'; order.cancelReason = text(command.reason,500);
  } else if (reversal) {
    const expected={undo_checkin:'checked_in',undo_checkout:'checked_out',restore_cancel:'cancelled'}[type];
    if(order.status!==expected)reject('state');
    if(lastClosed&&command.auditOverride!==true){
      // The reference boundary uses the cancellation operation's local calendar day.
      const stamp=type==='restore_cancel'?(order.cancelledAt||next.audit.find(row=>row.type==='cancel'&&row.orderId===order.id)?.at):null;
      const boundary=type==='restore_cancel'?(stamp&&Number.isFinite(Date.parse(stamp))?new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Kuala_Lumpur'}).format(new Date(stamp)):null):type==='undo_checkout'?order.end:order.start;
      if(!isDate(boundary)||boundary<=lastClosed)reject('audited');
    }
    if(order.folioClosed||order.splitBills||order.arMoves?.length||order.folioTransfers?.length)reject('bill_state');
    if(type==='restore_cancel'){
      // A posted penalty needs a separate accounting correction; this is a status-only action.
      if(order.finalCharge)reject('bill_state');
      order.status='confirmed';
    }else{
      if(isBoxed(order))reject('box_state');
      if(type==='undo_checkout'){
        const assigned=saleResources(next,propertyId).find(r=>r.id===order.resourceId);
        if(!assigned)reject('state');
        if(inHouse(assigned))reject('occupied');
      }
      order.status=type==='undo_checkout'?'checked_in':'confirmed';if(type==='undo_checkout')order.completedAt=null;
    }
  } else if (type === 'checkin') {
    if(next.nightAudits.length&&isAudited(next,command.date)&&command.auditOverride!==true)reject('audited');
    if (order.status !== 'confirmed' || !order.resourceId) reject('state');
    if(order.occupants){prepareStay(next,propertyId,order);if(order.occupants.some(p=>!p.name))reject('occupant_names');}
    resource = next.resources.find(r => r.id === order.resourceId);
    // Explicit simulated business date; do not use browser UTC date as property date.
    if (command.date < order.start || command.date >= order.end) reject('date');
    if (inHouse(resource)) reject('occupied');
    order.status = 'checked_in';
  } else if (type === 'checkout') {
    if (order.status !== 'checked_in' || command.date < order.start || order.hourly && command.date!==order.start) reject('date');
    if(!order.hourly&&command.date<order.end){
      if(command.confirmed!==true||!['keep','recompute'].includes(command.earlyChoice)||command.date<=order.start)reject('early_checkout');
      if(order.folioClosed||order.splitBills||order.arMoves?.length||order.folioTransfers?.length)reject('bill_state');
      if(lastClosed&&order.end>lastClosed&&order.start<=lastClosed)reject('audited');
      const rates=order.nightlyRates||stayDays(order.start,order.end).map(date=>({date,amount:order.nightly||0}));
      const retained=rates.filter(r=>r.date<command.date),removed=rates.filter(r=>r.date>=command.date).reduce((n,r)=>n+r.amount,0);
      if(command.earlyChoice==='keep')retained[retained.length-1].amount+=removed;
      order.earlyDeparture={originalEnd:order.end,date:command.date,choice:command.earlyChoice,retainedAmount:command.earlyChoice==='keep'?removed:0,at:command.at};
      order.end=command.date;order.nightlyRates=retained;
      if(order.roomSegments)order.roomSegments=order.roomSegments.filter(p=>p.start<command.date).map(p=>({...p,end:p.end>command.date?command.date:p.end}));
    }
    const balance = folio(order);
    if (balance.due !== 0 || balance.deposit !== 0 || order.splitBills?.some(b=>b.charge!==b.paid+(b.arAmount||0))) reject('balance');
    order.status = 'checked_out';order.completedAt=command.at;
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
          if(b.icalImportId)reject('input');
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
    if(block.icalImportId)reject('input'); // Imported holds require reasoned whole-import revocation.
    next.blocks = next.blocks.filter(b => b !== block);
  } else if (!['purge_test_orders','notice_severity_save','notice_rule_save'].includes(type)) reject('input');
  preview(next, propertyId);
  const statusRows=roomStatusRows(state,next,command);
  const movedTo = next.orders.find(o => o.id === (order?.id || command.id)) || null;
  if(['create','create_reservation','create_hourly','checkin','checkout','cancel','undo_checkin','undo_checkout','restore_cancel'].includes(type)){
    const record={id:command.id,propertyId,type,at:command.at,actor:command.actor||'local',postingBusinessDate:next.businessDate||null,orderId:order?.id||(['create','create_hourly'].includes(type)?command.id:null),reservationId:type==='create_reservation'?command.id:null};
    (next.receptionHistory??=[]).push(record);
  }
  next.audit.unshift({ id: command.id || `${command.at}-${next.audit.length}`, propertyId, type, postingBusinessDate:next.businessDate||null, orderId: order?.id || null, resourceId: resource?.id || null, resourceIds: command.resourceIds, cleaning:command.cleaning, actor: command.actor || 'local',
    ...(stayBefore || ['create','box_stays','restore_stays'].includes(type) ? { stayChange:{ before:stayBefore,
      after:['box_stays','restore_stays'].includes(type) ? null : staySnapshot(movedTo),
      reason: typeof command.reason === 'string' ? command.reason.trim() : null } } : {}),
    ...(businessDayActions.includes(type)?{businessDate:next.businessDate,closedDate:command.type==='night_audit'?next.nightAudits.at(-1).businessDate:null}:{}),
    ...(['directory_entry_save','customer_tag_set'].includes(type)?{directoryChange:type==='directory_entry_save'?next.directoryHistory.at(-1):next.customerTagHistory.at(-1)}:{}),
    ...(operationsActions.includes(type)?{operationsChange:next.operationsHistory.at(-1)}:{}),
    ...(deskActions.includes(type)?{deskChange:next.deskHistory.at(-1)}:{}),
    ...(completionActions.includes(type)?{completionChange:next.completionHistory.at(-1)}:{}),
    ...(type==='memo_save'?{memoChange:next.memoHistory.at(-1)}:{}),
    ...(type==='transfer_folio_credit'?{reservationId:command.reservationId,fromId:command.fromId,toId:command.toId,amount:next.orders.find(o=>o.id===command.toId)?.folioTransfers?.at(-1)?.amount,reverses:command.reverses,reason:command.reason.trim()}:{}),
    ...(type==='undo_reservation_payment'?{reservationId:command.reservationId,reversesBatchId:command.batchId,reason:command.reason.trim()}:{}),
    ...(type==='payment_reservation'?{reservationId:command.reservationId,amount:command.amount,method:command.method,allocations:command.allocations.map(({orderId,amount})=>({orderId,amount}))}:{}),
    ...(handledAuditOrders?{handledAuditOrders}:{}),
    ...(statusRows.length?{roomStatusRows:statusRows}:{}),
    ...(batchActions.includes(type)?{batchChange:{recordId:command.id,businessDate:next.businessDate}}:{}),
    ...(settledStayIds?{reservationId:command.reservationId,settledStayIds}:{}),
    ...(type==='commission_save'&&command.correction===true?{commissionCorrection:order.commissionCorrections.at(-1)}:{}),
    ...(type==='commission_save'?{commissionChange:{before:commissionBefore,after:order?.commission||null}}:{}), at: command.at });
  return next;
}

const text = (value, max) => { if(typeof value !== 'string' || value.length > max) reject('input'); return value; };
const money = value => { if (!Number.isSafeInteger(value) || value < 0 || value > 100000000) reject('amount'); return value; };
const validSource = value => { if (!['direct','walkin','booking','airbnb','agoda','tripcom','expedia','traveloka','tiket','bookingengine','chinesesite','rednote','neppan','hostelworld','tujia','vrbo','xiaozhu','temairazu','rakuten','klook','other'].includes(value)) reject('input'); return value; };
function saveDisplayPreferences(state, {propertyId, preferences}) {
  const property = state.properties.find(row => row.id === propertyId);
  const fields = ['groups','roomTypeOrder','roomOrder','groupOrder','payments','channels','advanceCard'];
  const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  if (!record(preferences) || !Object.keys(preferences).length || Object.keys(preferences).some(key => !fields.includes(key))) reject('input');
  const next = {...property.displayPreferences};
  const roomIds = new Set(state.physicalRooms.filter(row => row.propertyId === propertyId).map(row => row.id));
  const typeIds = new Set(state.roomTypes.filter(row => row.propertyId === propertyId).map(row => row.id));
  const order = (value, allowed) => {
    if (!Array.isArray(value) || value.length > allowed.size || new Set(value).size !== value.length || value.some(id => !allowed.has(id))) reject('input');
    return [...value];
  };
  if (Object.hasOwn(preferences,'groups')) {
    if (!Array.isArray(preferences.groups) || preferences.groups.length > 200) reject('input');
    const usedIds = new Set(), usedRooms = new Set();
    next.groups = preferences.groups.map(group => {
      if (!record(group) || typeof group.id !== 'string' || !/^[A-Za-z0-9_-]{1,80}$/.test(group.id) || usedIds.has(group.id)) reject('input');
      const name = text(group.name,80).trim();
      if (!name) reject('input');
      const members = order(group.roomIds,roomIds);
      if (members.some(id => usedRooms.has(id))) reject('input');
      usedIds.add(group.id);
      members.forEach(id => usedRooms.add(id));
      return {id:group.id,name,roomIds:members};
    });
    if (next.groupOrder) next.groupOrder = next.groupOrder.filter(id => usedIds.has(id));
  }
  const groupIds = new Set((next.groups || []).map(group => group.id));
  for (const [field,allowed] of [['roomTypeOrder',typeIds],['roomOrder',roomIds],['groupOrder',groupIds]]) {
    if (Object.hasOwn(preferences,field)) next[field] = order(preferences[field],allowed);
  }
  for (const field of ['payments','channels']) {
    if (!Object.hasOwn(preferences,field)) continue;
    const entries = preferences[field];
    if (!Array.isArray(entries) || entries.length > 40) reject('input');
    const ids = new Set();
    next[field] = entries.map(entry => {
      if (!record(entry) || typeof entry.enabled !== 'boolean' || ids.has(entry.id)) reject('input');
      if (field === 'payments') {
        if (!['cash','bank','card','ota'].includes(entry.id)) reject('input');
      } else validSource(entry.id);
      ids.add(entry.id);
      return {id:entry.id,enabled:entry.enabled};
    });
  }
  if (Object.hasOwn(preferences,'advanceCard')) {
    const {advanceCard} = preferences;
    if (!record(advanceCard) || typeof advanceCard.enabled !== 'boolean') reject('input');
    const {enabled,minutes} = advanceCard;
    if (enabled && (!Number.isInteger(minutes) || minutes < 0 || minutes > 1440)) reject('input');
    next.advanceCard = {enabled,minutes:enabled ? minutes : 0};
  }
  property.displayPreferences = next;
}
function settleFolio(order, command, batchId) {
  const totals=folio(order);
  if(order.folioClosed)reject('folio_closed');
  if(totals.due!==0||totals.deposit!==0)reject('balance');
  order.folioClosed=true;
  (order.folioEvents??=[]).push({
    type:'settle',at:command.at,actor:command.actor||'local',
    charge:totals.charge,paid:totals.paid,deposit:totals.deposit,...(batchId?{batchId}:{})
  });
}
function amendNightlyRates(state,order,command) {
  validRange(command.start,command.end);
  const nightly=money(command.nightly);
  const oldDays=stayDays(order.start,order.end);
  const days=stayDays(command.start,command.end);
  const prior=new Map((order.nightlyRates||oldDays.map(date=>({date,amount:order.nightly||0}))).map(row=>[row.date,row.amount]));
  const nextDays=new Set(days);
  const audited=date=>command.auditOverride!==true&&isAudited(state,date);
  if(oldDays.some(date=>audited(date)&&!nextDays.has(date))||days.some(date=>audited(date)&&!prior.has(date)))reject('audited');
  if(command.source!==order.source&&(oldDays.some(audited)||(order.extraCharges||[]).some(row=>audited(row.businessDate))))reject('audited');
  const repricing=nightly!==order.nightly;
  if(repricing&&days.every(audited))reject('audited');
  if(!repricing&&command.start===order.start&&command.end===order.end)return;
  const rates=days.map(date=>({
    date,amount:prior.has(date)&&(audited(date)||!repricing)?prior.get(date):nightly
  }));
  money(rates.reduce((sum,row)=>sum+row.amount,0)+(order.extraCharges||[]).reduce((sum,row)=>sum+signedFolioExtra(row),0));
  order.nightlyRates=rates;
}
function roomChargeFor(order, nights) {
  return order.nightlyRates?order.nightlyRates.reduce((n,r)=>n+r.amount,0):nights*(order.nightly||0);
}
const signedFolioExtra = row => (row.kind==='charge'?1:-1)*row.quantity*row.unitAmount;
export function folio(order) {
  const nights = Math.round((Date.parse(order.end)-Date.parse(order.start))/86400000);
  const roomCharge=roomChargeFor(order,nights);
  const extras=(order.extraCharges||[]).reduce((n,r)=>n+signedFolioExtra(r),0);
  const charge = order.status==='confirmed'&&isBoxed(order)?0:order.finalCharge??roomCharge+extras;
  const transactions = order.transactions || [];
  const sum = kind => transactions.filter(t=>t.kind===kind).reduce((n,t)=>n+t.amount,0);
  const paid = sum('payment')-sum('refund');
  const transferred = (order.arMoves||[]).reduce((sum,row)=>sum+row.amount,0);
  const folioCredit=folioTransferCredit(order);
  return { nights, charge, paid, ...(transferred?{transferred}:{}), ...(folioCredit?{folioCredit}:{}), due: charge-paid-transferred-folioCredit, deposit:sum('deposit_in')-sum('deposit_out') };
}

export function folioTransferCredit(order, include=()=>true) {
  return (order.folioTransfers||[]).filter(entry=>include(entry.businessDate)).reduce((sum,entry)=>sum+entry.amount,0);
}

export function folioSplitLines(order) {
  const totals=folio(order);
  const lines=[
    {key:'room',kind:'room',amount:roomChargeFor(order,totals.nights)},
    ...(order.extraCharges||[]).map((row,index)=>({key:'extra:'+index,kind:row.kind,name:row.name,amount:signedFolioExtra(row)}))
  ].filter(line=>line.amount!==0);
  return lines.length>=2 && lines.every(line=>Number.isSafeInteger(line.amount)) &&
    lines.reduce((sum,line)=>sum+line.amount,0)===totals.charge ? lines : [];
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

function changeSplitBills(order, command) {
  const {type,id,at,billId} = command;
  const event = {type,id,at,actor:command.actor || 'local'};
  const totals = folio(order);
  if (type === 'settle_split') {
    if (order.splitBills || order.folioClosed || order.folioTransfers?.length || isBoxed(order)) reject('bill_state');
    if (!Array.isArray(command.bills) || command.bills.length < 2 || command.bills.length > 20) reject('bill_total');
    const byLine = command.mode === 'lines';
    if (command.mode !== undefined && !byLine) reject('bill_total');
    const remaining = new Map(byLine ? folioSplitLines(order).map(line=>[line.key,line]) : []);
    const bills = command.bills.map((row, index) => {
      const label = text(row?.label,120).trim();
      if (!label) reject('bill_total');
      if (byLine && (!Array.isArray(row.lineKeys)||!row.lineKeys.length)) reject('bill_total');
      const lines = byLine ? row.lineKeys.map(key=>{
        const line=remaining.get(key);
        if (!line) reject('bill_total');
        remaining.delete(key);
        return line;
      }) : null;
      const charge=lines ? lines.reduce((sum,line)=>sum+line.amount,0) : row.charge;
      if (lines && charge<0) reject('bill_total');
      return {id:id+':'+index,label,charge:money(charge),paid:money(row.paid),closedBy:null,...(lines?{lines}:{})};
    });
    if (remaining.size || bills.reduce((sum,b) => sum+b.charge,0) !== totals.charge ||
        bills.reduce((sum,b) => sum+b.paid,0) !== totals.paid) reject('bill_total');
    order.splitBills = bills;
    event.bills = structuredClone(bills);
  } else {
    if (!order.splitBills) reject('bill_state');
    if (type === 'settle_unsplit') {
      if (order.splitBills.some(b => b.closedBy)) reject('bill_state');
      event.reason = text(command.reason || '',500).trim();
      if (!event.reason) reject('reason');
      event.bills = order.splitBills;
      delete order.splitBills;
    } else {
      const bill = order.splitBills.find(b => b.id === billId);
      if (!bill) reject('bill_state');
      event.billId = bill.id;
      if (type === 'settle_bill') {
        if (bill.closedBy) reject('bill_state');
        if (bill.charge !== bill.paid || totals.deposit !== 0) reject('balance');
        bill.closedBy = id;
        event.charge = bill.charge;
        event.paid = bill.paid;
      } else {
        if (!bill.closedBy) reject('bill_state');
        if (bill.arItemId) reject('ar_state');
        event.reason = text(command.reason || '',500).trim();
        if (!event.reason) reject('reason');
        event.reverses = bill.closedBy;
        bill.closedBy = null;
      }
    }
  }
  order.folioClosed = Boolean(order.splitBills?.every(b => b.closedBy));
  (order.folioEvents ??= []).push(event);
}

function changeReceivables(state, order, command) {
  const {id,propertyId,accountId,at} = command;
  const businessDate = state.businessDate;
  const correction=command.type==='ar_close_month'&&command.periodId!==undefined;
  const type=correction?'ar_adjust':command.type;
  if(type==='ar_close_month'){closeReceivableMonth(state,command);return;}
  const last=(state.arPeriods||[]).filter(row=>row.propertyId===propertyId).at(-1);
  if(last && type!=='ar_account_save' && businessDate<=last.to)reject('ar_period');
  const accounts = state.arAccounts ??= [];
  const items = state.arItems ??= [];
  const events = state.arEvents ??= [];
  const account = accounts.find(a=>a.id===accountId&&a.propertyId===propertyId);
  const event = {id,type,propertyId,accountId,at,businessDate,actor:command.actor||'local'};
  const reason = () => {
    const value = text(command.reason||'',500).trim();
    if (!value) reject('reason');
    return value;
  };
  if (type === 'ar_account_save') {
    const name = text(command.name,120).trim();
    if (!name || accounts.some(a=>a.propertyId===propertyId&&a.id!==accountId&&a.name.toLowerCase()===name.toLowerCase())) reject('ar_input');
    if (accountId && !account) reject('scope');
    event.accountId = account?.id || id;
    event.before = account?.name ?? null;
    event.name = name;
    if (account) account.name = name;
    else accounts.push({id,propertyId,name});
  } else {
    if (!account) reject('scope');
    if (!isDate(businessDate)) reject('ar_business_date');
    const item = items.find(x=>x.id===command.itemId&&x.accountId===accountId&&x.propertyId===propertyId&&!x.reversedBy);
    if(correction){
      const period=(state.arPeriods||[]).find(row=>row.propertyId===propertyId&&row.id===command.periodId);
      if(!period||!period.balances.some(row=>row.accountId===accountId))reject('ar_period');
      if(command.direction==='credit'&&(!item||item.businessDate>period.to))reject('ar_state');
      Object.assign(event,{correctsPeriodId:period.id,correctsMonth:period.month});
    }
    if (type === 'ar_post') {
      if (order.folioClosed || order.status!=='cancelled'&&order.end>businessDate || !isDate(command.dueDate) || command.dueDate<businessDate) reject('ar_state');
      const totals = folio(order);
      const bill = order.splitBills?.find(b=>b.id===command.billId);
      if (order.splitBills ? !bill || bill.closedBy : Boolean(command.billId)) reject('bill_state');
      const amount = bill ? bill.charge-bill.paid : totals.due;
      if (totals.deposit!==0 || amount<=0) reject('balance');
      money(amount);
      const target = bill || order;
      target.arItemId = id;
      if (bill) { bill.closedBy=id; bill.arAmount=amount; }
      order.folioClosed = bill ? order.splitBills.every(b=>b.closedBy) : true;
      (order.arMoves ??= []).push({id,amount,businessDate});
      (order.folioEvents ??= []).push({id,type,at,actor:event.actor,billId:bill?.id,amount});
      items.push({id,propertyId,accountId,orderId:order.id,billId:bill?.id||null,dueDate:command.dueDate,businessDate,amount,open:amount});
      Object.assign(event,{itemId:id,orderId:order.id,billId:bill?.id,amount,dueDate:command.dueDate});
    } else if (type === 'ar_adjust') {
      const amount=money(command.amount);
      const direction=command.direction;
      if(!amount||!['debit','credit'].includes(direction))reject('ar_input');
      Object.assign(event,{direction,reason:reason(),amount:direction==='debit'?amount:-amount});
      if(direction==='debit'){
        if(!isDate(command.dueDate)||command.dueDate<businessDate)reject('ar_input');
        const row={id,propertyId,accountId,orderId:null,origin:'adjustment',businessDate,dueDate:command.dueDate,amount,open:amount};
        items.push(row);
        Object.assign(event,{itemId:id,dueDate:row.dueDate});
      }else{
        if(!item||amount>item.open)reject('ar_state');
        item.open-=amount;
        event.itemId=item.id;
      }
    } else if (type === 'ar_undo_adjust') {
      const original=events.find(e=>e.id===command.adjustmentId&&e.type==='ar_adjust'&&e.accountId===accountId&&e.propertyId===propertyId);
      if(!original||original.correctsPeriodId||events.some(e=>e.type===type&&e.reverses===original.id))reject('ar_state');
      const target=items.find(x=>x.id===original.itemId&&x.accountId===accountId&&x.propertyId===propertyId&&!x.reversedBy);
      if(!target)reject('ar_state');
      event.reason=reason();
      if(original.direction==='debit'){
        if(target.open!==target.amount)reject('ar_state');
        target.open=0;
        target.reversedBy=id;
      }else{
        if(target.open-original.amount>target.amount)reject('ar_state');
        target.open-=original.amount;
      }
      Object.assign(event,{itemId:target.id,direction:original.direction,amount:-original.amount,reverses:original.id});
    } else if (type === 'ar_write_off') {
      const amount = money(command.amount);
      if (!amount || !['cash','bank','card','ota'].includes(command.method)) reject('ar_input');
      const candidates = items.filter(x=>x.propertyId===propertyId&&x.accountId===accountId&&!x.reversedBy&&x.open>0)
        .sort((a,b)=>a.dueDate.localeCompare(b.dueDate)||a.businessDate.localeCompare(b.businessDate)||a.id.localeCompare(b.id));
      let remaining = amount;
      const allocations = command.allocations ?? candidates.flatMap(x=>{
        const used=Math.min(x.open,remaining);
        remaining-=used;
        return used ? [{itemId:x.id,amount:used}] : [];
      });
      if (!Array.isArray(allocations) || !allocations.length || new Set(allocations.map(x=>x?.itemId)).size!==allocations.length) reject('ar_input');
      let allocated=0;
      const resolved=allocations.map(row=>{
        const target=candidates.find(x=>x.id===row.itemId);
        const used=money(row.amount);
        if (!target || !used || used>target.open) reject('ar_state');
        allocated+=used;
        return [target,used];
      });
      if (allocated!==amount) reject('ar_total');
      for(const [target,used] of resolved) target.open-=used;
      Object.assign(event,{amount,method:command.method,reference:text(command.reference||'',120).trim(),allocations:resolved.map(([x,used])=>({itemId:x.id,amount:used}))});
    } else if (type === 'ar_undo_write_off') {
      const receipt=events.find(e=>e.id===command.receiptId&&e.type==='ar_write_off'&&e.propertyId===propertyId&&e.accountId===accountId);
      if (!receipt || events.some(e=>e.type===type&&e.reverses===receipt.id)) reject('ar_state');
      event.reason=reason();
      for(const row of receipt.allocations) {
        const target=items.find(x=>x.id===row.itemId&&x.accountId===accountId&&x.propertyId===propertyId&&!x.reversedBy);
        if (!target || target.open+row.amount>target.amount) reject('ar_state');
        target.open+=row.amount;
      }
      Object.assign(event,{reverses:receipt.id,amount:receipt.amount,method:receipt.method,allocations:receipt.allocations});
    } else if (type === 'ar_transfer' || type === 'ar_undo_post') {
      if (!item || item.origin==='adjustment' || item.open!==item.amount) reject('ar_state');
      Object.assign(event,{itemId:item.id,amount:item.amount,reason:reason()});
      if (type === 'ar_transfer') {
        const target=accounts.find(a=>a.id===command.targetId&&a.propertyId===propertyId&&a.id!==accountId);
        if (!target) reject('scope');
        item.accountId=target.id;
        event.targetId=target.id;
      } else {
        const stay=state.orders.find(o=>o.id===item.orderId&&o.propertyId===propertyId);
        const bill=item.billId&&stay?.splitBills?.find(b=>b.id===item.billId);
        const target=item.billId ? bill : stay;
        if (target?.arItemId!==item.id) reject('ar_state');
        delete target.arItemId;
        if (bill) { delete bill.arAmount; bill.closedBy=null; }
        stay.folioClosed=false;
        stay.arMoves.push({id,amount:-item.amount,businessDate});
        stay.folioEvents.push({id,type,at,actor:event.actor,reverses:item.id,billId:item.billId,amount:-item.amount,reason:event.reason});
        item.open=0;
        item.reversedBy=id;
        event.reverses=item.id;
      }
    } else reject('input');
  }
  events.push(event);
}

export function replayReceivables(state,q) {
  if (!q || !isDate(q.from) || !isDate(q.to) || q.from>q.to) reject('report_input');
  const amount=value=>{if(!Number.isSafeInteger(value))reject('report_amount');return value;};
  const localDay=value=>{const time=Date.parse(value);return Number.isFinite(time)?new Date(time+8*3600000).toISOString().slice(0,10):'';};
  const accounts=new Map(), items=new Map(), opening=new Map();
  const postings=[], allocations=[], receipts=[], adjustments=[];
  const events=(state.arEvents||[]).filter(e=>e.propertyId===q.propertyId);
  const add=(map,key,value)=>map.set(key,(map.get(key)||0)+value);
  for(const event of events){
    const date=event.businessDate||localDay(event.at);
    if(date>q.to)continue;
    const {type,accountId,itemId,orderId,amount:value}=event;
    if(type==='ar_account_save'){accounts.set(accountId,event.name);continue;}
    if(!isDate(date))throw Error('report_input');
    const row={...event,date};
    const inPeriod=date>=q.from;
    const movement=(account,delta)=>{if(!inPeriod)add(opening,account,delta);};
    if(type==='ar_post'){
      items.set(itemId,{itemId,accountId,orderId,dueDate:event.dueDate,open:amount(value)});
      movement(accountId,value);
      if(inPeriod)postings.push(row);
    }else if(type==='ar_adjust'||type==='ar_undo_adjust'){
      const delta=amount(value);
      if(type==='ar_adjust'&&event.direction==='debit'){
        items.set(itemId,{itemId,accountId,orderId:null,dueDate:event.dueDate,open:delta});
      }else{
        const item=items.get(itemId);
        if(!item||item.accountId!==accountId||item.open+delta<0)throw Error('report_amount');
        item.open+=delta;
      }
      movement(accountId,delta);
      if(inPeriod)adjustments.push(row);
    }else if(type==='ar_transfer'){
      const item=items.get(itemId);
      if(!item||item.accountId!==accountId||item.open!==value)throw Error('report_amount');
      item.accountId=event.targetId;
      movement(accountId,-value);
      movement(event.targetId,value);
      if(inPeriod)adjustments.push(row);
    }else if(type==='ar_undo_post'){
      const item=items.get(itemId);
      if(!item||item.accountId!==accountId||item.open!==value)throw Error('report_amount');
      item.open=0;
      movement(accountId,-value);
      if(inPeriod)adjustments.push({...row,amount:-value});
    }else if(type==='ar_write_off'||type==='ar_undo_write_off'){
      const sign=type==='ar_write_off'?1:-1;
      movement(accountId,-sign*amount(value));
      if(inPeriod)receipts.push({...row,amount:sign*value});
      for(const allocation of event.allocations||[]){
        const item=items.get(allocation.itemId);
        if(!item||item.accountId!==accountId)throw Error('report_amount');
        item.open-=sign*amount(allocation.amount);
        if(item.open<0)throw Error('report_amount');
        if(inPeriod)allocations.push({...row,itemId:item.itemId,orderId:item.orderId,amount:sign*allocation.amount});
      }
    }
  }
  const balances=[...accounts].map(([accountId,name])=>{
    const closing=[...items.values()].filter(i=>i.accountId===accountId).reduce((sum,i)=>sum+i.open,0);
    const initial=opening.get(accountId)||0;
    return {accountId,name,opening:initial,change:closing-initial,closing};
  });
  const aging=[...items.values()].filter(i=>i.open>0).map(i=>{
    if(!isDate(i.dueDate))throw Error('report_input');
    const days=Math.round((Date.parse(q.to)-Date.parse(i.dueDate))/86400000);
    const band=days<=0?'arCurrent':days<=30?'arDays30':days<=60?'arDays60':days<=90?'arDays90':'arDaysOver90';
    return {...i,days,band};
  }).sort((a,b)=>a.dueDate.localeCompare(b.dueDate)||a.itemId.localeCompare(b.itemId));
  return {accounts,balances,aging,postings,allocations,receipts,adjustments};
}

function closeReceivableMonth(state,command){
  const {id,propertyId,month,at}=command;
  const from=typeof month==='string'?month+'-01':'';
  if(!isDate(from)||!isDate(state.businessDate))reject('ar_period');
  const end=new Date(from+'T00:00:00Z');
  end.setUTCMonth(end.getUTCMonth()+1,0);
  const to=end.toISOString().slice(0,10);
  const periods=state.arPeriods??=[];
  const prior=periods.filter(row=>row.propertyId===propertyId).at(-1);
  if(to>=state.businessDate||prior&&nextDay(prior.to)!==from)reject('ar_period');
  const report=replayReceivables(state,{propertyId,from,to});
  const balances=report.balances;
  const totals={opening:0,change:0,closing:0};
  for(const row of balances)for(const key of Object.keys(totals))totals[key]+=row[key];
  const corrections=(state.arEvents||[]).filter(event=>event.propertyId===propertyId&&event.correctsPeriodId&&event.businessDate>=from&&event.businessDate<=to);
  periods.push({id,propertyId,month,from,to,at,actor:command.actor||'local',balances,totals,...(corrections.length?{corrections:structuredClone(corrections)}:{})});
}

export function commissionPeriod(entry){
  if(isDate(entry?.period+'-01'))return entry.period;
  const at=Date.parse(entry?.at);
  return Number.isFinite(at)?new Date(at+8*3600000).toISOString().slice(0,7):null;
}

function isCommissionClosed(state,propertyId,period){
  return Boolean(period)&&(state.commissionPeriods||[]).some(row=>row.propertyId===propertyId&&period<=row.month);
}

function closeCommissionMonth(state,command){
  const {id,propertyId,month,at}=command;
  const from=typeof month==='string'?month+'-01':'';
  if(!isDate(from)||!isDate(state.businessDate))reject('commission_period');
  const end=new Date(from+'T00:00:00Z');
  end.setUTCMonth(end.getUTCMonth()+1,0);
  const to=end.toISOString().slice(0,10);
  const periods=state.commissionPeriods??=[];
  const prior=periods.filter(row=>row.propertyId===propertyId).at(-1);
  if(to>=state.businessDate||prior&&nextDay(prior.to)!==from)reject('commission_period');
  const recorded=state.orders.filter(o=>o.propertyId===propertyId&&o.commission);
  if(recorded.some(o=>!commissionPeriod(o.commission)))reject('commission_pending');
  if(!prior&&recorded.some(o=>commissionPeriod(o.commission)<month))reject('commission_period');
  const entries=recorded.filter(o=>commissionPeriod(o.commission)===month).map(o=>({
    orderId:o.id,source:o.source||'direct',reference:o.commission.reference,amount:o.commission.amount,businessDate:o.commission.businessDate||null,expected:o.commission.expected||null,
    settledAt:o.commission.settledAt,settledBy:o.commission.settledBy
  }));
  if(entries.some(e=>!e.settledAt))reject('commission_pending');
  for(const order of recorded){
    for(const row of order.commissionCorrections||[]){
      if(row.period===month)entries.push({...row,orderId:order.id,source:order.source||'direct'});
    }
  }
  const grouped=new Map();
  let total=0;
  for(const e of entries){
    money(e.originalPeriod?Math.abs(e.amount):e.amount);
    if(!grouped.has(e.source))grouped.set(e.source,{source:e.source,count:0,amount:0});
    const row=grouped.get(e.source);
    row.count++;
    row.amount+=e.amount;
    total+=e.amount;
  }
  if(!Number.isSafeInteger(total))reject('amount');
  periods.push({id,propertyId,month,from,to,at,actor:command.actor||'local',total,entries,channels:[...grouped.values()]});
}

// Internal operations batch: property body is the source in both local and SQLite modes.
export const batchActions=['notice_scope_save','notice_send','notice_withdraw','commission_rate_save','listing_draft_save','booking_content_save'];
const batchText=(value,max=2000)=>typeof value==='string'&&value.trim().length<=max?value.trim():'';
export function expectedCommission(state,order,date){
 const rate=(state.commissionRates||[]).filter(r=>r.propertyId===order.propertyId&&r.source===(order.source||'direct')&&r.effectiveFrom<=date)
  .sort((a,b)=>b.effectiveFrom.localeCompare(a.effectiveFrom)||b.at.localeCompare(a.at))[0];
 const basis=folio(order).charge;
 return {basis,rate:rate?.percent??null,amount:rate?Math.round(basis*rate.percent/100):null,rateId:rate?.id??null};
}
export function scopedReminder(state,notice,{username,shiftId}={}){
 const latest=new Map();for(const rule of state.noticeScopes||[])latest.set([rule.propertyId,rule.kind,rule.username,rule.shiftId].join(':'),rule);
 const rules=[...latest.values()].filter(r=>r.propertyId===notice.propertyId&&r.kind===notice.kind&&
  (!r.username||r.username===username)&&(!r.shiftId||r.shiftId===shiftId));
 const rank={routine:0,attention:1,urgent:2};
 return rules.reduce((n,r)=>rank[r.level]>rank[n.severity||'routine']?{...n,severity:r.level}:n,notice);
}
function changeBatchState(state,c){
 const {propertyId,id,at,actor='local',type}=c;
 if(type==='notice_scope_save'){
  if(!noticeKinds.includes(c.kind)||!noticeLevels.includes(c.level)||!batchText(c.username,64)&&!batchText(c.shiftId,100))reject('input');
  if(c.shiftId&&!(state.shiftTypes||[]).some(r=>r.id===c.shiftId))reject('scope');
  const rows=state.noticeScopes??=[];
  rows.push({id,propertyId,at,actor,kind:c.kind,level:c.level,username:batchText(c.username,64),shiftId:batchText(c.shiftId,100)});
 }else if(type==='notice_send'){
  if(!batchText(c.text,1000)||!isDate(state.businessDate))reject('input');
  (state.staffNotices??=[]).push({id,propertyId,at,actor,text:c.text.trim(),businessDate:state.businessDate,recipient:batchText(c.recipient,64)});
 }else if(type==='notice_withdraw'){
  const original=(state.staffNotices||[]).find(n=>n.id===c.noticeId&&n.propertyId===propertyId);
  if(!original||original.actor!==actor||(state.noticeWithdrawals||[]).some(n=>n.noticeId===c.noticeId))reject('scope');
  if(!batchText(c.reason,500)||!isDate(state.businessDate))reject('input');
  (state.noticeWithdrawals??=[]).push({id,propertyId,at,actor,noticeId:c.noticeId,reason:c.reason.trim(),businessDate:state.businessDate});
 }else if(type==='commission_rate_save'){
  if(!['direct','booking','agoda','airbnb','expedia','tripcom','traveloka','tiket','chinesesite','rednote','neppan','hostelworld','tujia','vrbo','xiaozhu','temairazu','rakuten','klook','walkin','bookingengine','other'].includes(c.source)||!Number.isFinite(c.percent)||c.percent<0||c.percent>100||Math.round(c.percent*100)/100!==c.percent||!isDate(c.effectiveFrom))reject('input');
  if(isCommissionClosed(state,propertyId,c.effectiveFrom.slice(0,7)))reject('commission_period');
  if((state.commissionRates||[]).some(r=>r.propertyId===propertyId&&r.source===c.source&&r.effectiveFrom===c.effectiveFrom))reject('input');
  (state.commissionRates??=[]).push({id,propertyId,at,actor,source:c.source,percent:c.percent,effectiveFrom:c.effectiveFrom});
 }else if(type==='listing_draft_save'){
  if(c.confirmed!==true||!batchText(c.title,200)||!safePublicUrl(c.url))reject('input');
  const capacity=c.capacity==null?null:Number(c.capacity);
  if(capacity!==null&&(!Number.isSafeInteger(capacity)||capacity<1||capacity>100))reject('input');
  const photos=cleanPhotoUrls(c.photos||[]);
  (state.listingDrafts??=[]).push({id,propertyId,at,actor,url:c.url,title:c.title.trim(),capacity,photos,description:batchText(c.description),kind:'room_type',sourceSnapshot:{url:c.url,title:c.title.trim(),capacity,photos:[...photos],description:batchText(c.description)},status:'draft'});
 }else if(type==='booking_content_save'){
  const target=c.draftId?(state.listingDrafts||[]).find(r=>r.id===c.draftId&&r.propertyId===propertyId):c.roomTypeId?state.roomTypes.find(r=>r.id===c.roomTypeId&&r.propertyId===propertyId):state.physicalRooms.find(r=>r.id===c.physicalRoomId&&r.propertyId===propertyId);
  if(!target)reject('scope');
  const descriptions={};for(const lang of ['zh','en','ms']){if(typeof c.descriptions?.[lang]!=='string'||c.descriptions[lang].length>2000)reject('input');descriptions[lang]=c.descriptions[lang].trim();}
  const photos=cleanPhotoUrls(c.photos||[]);
  if(c.cover&&!photos.includes(c.cover))reject('input');
  const before={title:target.title??null,capacity:target.capacity??null,photos:target.photos||[],cover:target.cover||'',descriptions:target.descriptions||{}};
  Object.assign(target,{photos,cover:c.cover||photos[0]||'',descriptions});
  if(c.draftId){if(!batchText(c.title,200)||c.capacity!==null&&(!Number.isSafeInteger(c.capacity)||c.capacity<1||c.capacity>100))reject('input');target.title=c.title.trim();target.capacity=c.capacity;}
  (state.contentHistory??=[]).push({id,propertyId,at,actor,targetId:target.id,before,after:{title:target.title??null,capacity:target.capacity??null,photos,cover:target.cover,descriptions}});
 }
}
export function safePublicUrl(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&u.hostname.includes('.')&&!/^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(u.hostname);}catch{return false;}}
function cleanPhotoUrls(values){if(!Array.isArray(values)||values.length>20||values.some(v=>!safePublicUrl(v)||v.length>2048))reject('input');return [...new Set(values)];}
export function operationsReports(state,propertyId,from,to){
 const within=d=>isDate(d)&&d>=from&&d<=to;
 const channel=[];
 for(const o of state.orders.filter(o=>o.propertyId===propertyId)){
  const invoice=o.commission;if(!invoice)continue;
  const date=invoice.businessDate;
  if(within(date)){const expected=invoice.expected||{amount:null,rate:null};channel.push({businessDate:date,source:o.source||'direct',orderId:o.id,reference:invoice.reference,basis:expected.basis??null,rate:expected.rate,expected:expected.amount,actual:invoice.amount,variance:expected.amount===null?null:invoice.amount-expected.amount});}
  for(const r of o.commissionCorrections||[])if(within(r.businessDate))channel.push({businessDate:r.businessDate,source:o.source||'direct',orderId:o.id,reference:r.reference,actual:r.amount,originalPeriod:r.originalPeriod});
 }
 const reminders=[...(state.staffNotices||[]).map(n=>({...n,action:'sent'})),...(state.noticeWithdrawals||[]).map(n=>({...n,action:'withdrawn'}))].filter(n=>n.propertyId===propertyId&&within(n.businessDate));
 const grouped=new Map();
 for(const row of channel){
  const group=grouped.get(row.source)||{from,to,source:row.source,bills:0,corrections:0,expected:0,actual:0,variance:null,unknownRates:0};
  if(row.originalPeriod)group.corrections++;else{group.bills++;if(row.expected==null)group.unknownRates++;else group.expected+=row.expected;}
  group.actual+=row.actual;grouped.set(row.source,group);
 }
 const channelSummary=[...grouped.values()].map(g=>({...g,expected:g.unknownRates?null:g.expected,variance:g.unknownRates?null:g.actual-g.expected}));
 return {channel,channelSummary,reminders,unallocatedCorrections:state.orders.filter(o=>o.propertyId===propertyId).flatMap(o=>o.commissionCorrections||[]).filter(r=>!isDate(r.businessDate)).length,unallocated:state.orders.filter(o=>o.propertyId===propertyId&&o.commission&&!o.commission.businessDate).length};
}
export function reminderForAccount(state,notice,username,at=new Date().toISOString()){
 const instant=Date.parse(at);if(!Number.isFinite(instant))return notice;
 const d=new Date(instant+8*3600000),minute=d.getUTCHours()*60+d.getUTCMinutes(),m=v=>Number(v.slice(0,2))*60+Number(v.slice(3));
 const shift=(state.shiftTypes||[]).filter(r=>!r.propertyId||r.propertyId===notice.propertyId).find(r=>{const a=m(r.start),b=m(r.end);return a<b?minute>=a&&minute<b:minute>=a||minute<b;});
 return scopedReminder(state,notice,{username,shiftId:shift?.id});
}

// Append-only internal directories. These definitions never price an existing
// stay or create meal entitlements, hourly bookings, charges or AR postings.
export const directoryKinds=['tagGroup','tag','corporate','meal','item','hourly','holiday','inspectionItem','mealCategory','customer','quickCategory','invoiceTemplate'];
export function directoryEntries(state,propertyId,kind){
 const latest=new Map();for(const row of state.directoryHistory||[])if(row.propertyId===propertyId&&(!kind||row.kind===kind))latest.set(row.entryId,row);return [...latest.values()];
}
function changeDirectory(state,c){
 const {propertyId,id,at,actor='local'}=c;
 if(c.type==='customer_tag_set'){
  if(!state.orders.some(o=>o.id===c.orderId&&o.propertyId===propertyId)||!directoryEntries(state,propertyId,'tag').some(t=>t.entryId===c.tagId)||typeof c.active!=='boolean')reject('scope');
  (state.customerTagHistory??=[]).push({id,propertyId,at,actor,orderId:c.orderId,tagId:c.tagId,active:c.active});return;
 }
 if(!directoryKinds.includes(c.kind)||typeof c.name!=='string'||!c.name.trim()||c.name.length>100)reject('input');
 const rows=directoryEntries(state,propertyId),before=c.entryId?rows.find(r=>r.entryId===c.entryId&&r.kind===c.kind):null;
 if(c.entryId&&!before)reject('scope');
 const entryId=before?.entryId||id;
 if(c.kind!=='customer'&&rows.some(r=>r.kind===c.kind&&r.entryId!==entryId&&r.name.toLowerCase()===c.name.trim().toLowerCase()))reject('input');
 const row={id,entryId,propertyId,at,actor,kind:c.kind,name:c.name.trim()};
 if(c.kind==='customer'){
  for(const key of ['phone','email','country','guestLanguage','birthday','documentHint','note']){const value=c[key]??'';if(typeof value!=='string'||value.length>(key==='note'?500:100))reject('input');row[key]=value.trim();}
  if(row.birthday&&!isDate(row.birthday)||row.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)||row.documentHint&&!/^[A-Za-z0-9]{1,4}$/.test(row.documentHint))reject('input');
  if(typeof c.active!=='boolean')reject('input');row.active=c.active;
 }
 if(c.kind==='quickCategory'){if(!['payment','refund'].includes(c.direction)||typeof c.active!=='boolean')reject('input');Object.assign(row,{direction:c.direction,active:c.active});}
 if(c.kind==='invoiceTemplate'){for(const key of ['heading','footer']){if(typeof c[key]!=='string'||c[key].length>500||/[<>]/.test(c[key]))reject('input');row[key]=c[key];}if(typeof c.active!=='boolean')reject('input');row.active=c.active;}
 if(c.kind==='tag'){
  if(c.groupId&&!rows.some(r=>r.entryId===c.groupId&&r.kind==='tagGroup'))reject('scope');row.groupId=c.groupId||'';
 }
 if(c.kind==='corporate'){
  for(const key of ['contact','phone']){if(c[key]!==undefined&&(typeof c[key]!=='string'||c[key].length>100))reject('input');row[key]=c[key]||'';}
  if(c.arAccountId&&!(state.arAccounts||[]).some(r=>r.propertyId===propertyId&&r.id===c.arAccountId))reject('scope');row.arAccountId=c.arAccountId||'';
 }
 if(['meal','item','hourly'].includes(c.kind)){
  if(!Number.isSafeInteger(c.unitAmount)||c.unitAmount<0||c.unitAmount>100000000)reject('amount');row.unitAmount=c.unitAmount;
 }
 if(c.kind==='meal'){
  if(c.categoryId&&!rows.some(r=>r.kind==='mealCategory'&&r.entryId===c.categoryId))reject('scope');
  const pricingMethod=c.pricingMethod||'unit';if(!['unit','person','room'].includes(pricingMethod)||c.active!==undefined&&typeof c.active!=='boolean')reject('input');
  Object.assign(row,{categoryId:c.categoryId||'',pricingMethod,consumptionTiming:'usage_date',active:c.active??true});
 }
 if(c.kind==='hourly'){
  if(!state.roomTypes.some(r=>r.propertyId===propertyId&&r.id===c.roomTypeId&&!r.archived))reject('scope');
  for(const key of ['minHours','unitHours','maxHours'])if(!Number.isSafeInteger(c[key])||c[key]<1||c[key]>24)reject('input');
  if(c.minHours>c.maxHours||c.unitHours>c.maxHours||!Number.isSafeInteger(c.baseAmount)||c.baseAmount<0||c.baseAmount>100000000)reject('input');
  Object.assign(row,{roomTypeId:c.roomTypeId,minHours:c.minHours,unitHours:c.unitHours,maxHours:c.maxHours,baseAmount:c.baseAmount});
 }
 if(c.kind==='holiday'){
  if(!isDate(c.date)||!['holiday','event'].includes(c.eventType)||!['low','medium','high'].includes(c.heat)||typeof c.active!=='boolean')reject('input');
  Object.assign(row,{date:c.date,eventType:c.eventType,heat:c.heat,active:c.active,source:'manual'});
 }
 if(c.kind==='inspectionItem'){if(typeof c.active!=='boolean')reject('input');if(c.roomTypeId&&!state.roomTypes.some(r=>r.propertyId===propertyId&&r.id===c.roomTypeId&&!r.archived))reject('scope');Object.assign(row,{active:c.active,roomTypeId:c.roomTypeId||''});}
 (state.directoryHistory??=[]).push(row);
}

// Internal operations: append-only entitlements, reversals and inspection evidence.
export const operationsActions=['meal_grant','meal_redeem','meal_reverse','inspection_record','housekeeping_task','reservation_failure_record'];
export function mealEntitlements(state,propertyId){
 return (state.operationsHistory||[]).filter(r=>r.propertyId===propertyId&&r.type==='meal_grant').map(r=>{
 const events=(state.operationsHistory||[]).filter(e=>e.propertyId===propertyId&&e.entitlementId===r.id);
 const redeemed=events.filter(e=>e.type==='meal_redeem'&&!events.some(v=>v.type==='meal_reverse'&&v.redemptionId===e.id)).reduce((n,e)=>n+e.quantity,0);
 return {...r,redeemed,remaining:r.quantity-redeemed};
 });
}
function changeOperations(state,c){
 const row={id:c.id,propertyId:c.propertyId,at:c.at,actor:c.actor||'local',type:c.type,businessDate:state.businessDate||null};
 if(c.type==='meal_grant'){
 const o=state.orders.find(o=>o.propertyId===c.propertyId&&o.id===c.orderId);
 const meal=directoryEntries(state,c.propertyId,'meal').find(m=>m.entryId===c.mealId);
 if(!o||!meal||meal.active===false||o.status==='cancelled'||isBoxed(o))reject('scope');
 if(!isDate(c.usageDate)||c.usageDate<o.start||c.usageDate>=o.end||!Number.isSafeInteger(c.quantity)||c.quantity<1||c.quantity>1000)reject('input');
 Object.assign(row,{orderId:o.id,mealId:meal.entryId,name:meal.name,category:directoryEntries(state,c.propertyId,'mealCategory').find(r=>r.entryId===meal.categoryId)?.name||'',pricingMethod:meal.pricingMethod||'unit',consumptionTiming:'usage_date',unitAmount:meal.unitAmount,usageDate:c.usageDate,quantity:c.quantity});
 }else if(c.type==='meal_redeem'){
 const e=mealEntitlements(state,c.propertyId).find(e=>e.id===c.entitlementId),o=state.orders.find(o=>o.id===e?.orderId&&o.propertyId===c.propertyId);
 if(!e||!o||o.status==='cancelled'||isBoxed(o))reject('scope');
 if(e.usageDate!==localDay(c.at)||!Number.isSafeInteger(c.quantity)||c.quantity<1||c.quantity>e.remaining)reject('input');
 Object.assign(row,{entitlementId:e.id,orderId:e.orderId,usageDate:e.usageDate,quantity:c.quantity});
 }else if(c.type==='meal_reverse'){
 const r=(state.operationsHistory||[]).find(r=>r.propertyId===c.propertyId&&r.id===c.redemptionId&&r.type==='meal_redeem');
 if(!r||(state.operationsHistory||[]).some(e=>e.redemptionId===r.id))reject('scope');
 if(typeof c.reason!=='string'||!c.reason.trim()||c.reason.length>500)reject('input');
 Object.assign(row,{redemptionId:r.id,entitlementId:r.entitlementId,orderId:r.orderId,usageDate:r.usageDate,reason:c.reason.trim()});
 }else if(c.type==='reservation_failure_record'){
 if(!isDate(c.date)||typeof c.reason!=='string'||!c.reason.trim()||c.reason.length>500||typeof c.reference!=='string'||!c.reference.trim()||c.reference.length>100)reject('input');
 Object.assign(row,{date:c.date,reason:c.reason.trim(),reference:c.reference.trim(),source:'internal',status:'failed'});
 }else if(c.type==='housekeeping_task'){
 if(!state.resources.some(r=>r.propertyId===c.propertyId&&r.id===c.resourceId&&!r.archived)||!isDate(c.date)||!['open','in_progress','done','cancelled'].includes(c.status)||typeof c.note!=='string'||c.note.length>500||typeof c.assignee!=='string'||c.assignee.length>100)reject('input');
 const before=c.taskId?housekeepingTasks(state,c.propertyId).find(t=>t.taskId===c.taskId):null;
 if(c.taskId&&!before)reject('scope');
 if(before&&['done','cancelled'].includes(before.status)||!before&&c.status!=='open')reject('state');
 Object.assign(row,{taskId:before?.taskId||c.id,resourceId:c.resourceId,date:c.date,status:c.status,note:c.note,assignee:c.assignee});
 }else{
 if(!state.resources.some(r=>r.propertyId===c.propertyId&&r.id===c.resourceId&&!r.archived))reject('scope');
 const resource=state.resources.find(r=>r.propertyId===c.propertyId&&r.id===c.resourceId);
 const items=directoryEntries(state,c.propertyId,'inspectionItem').filter(r=>r.active!==false&&(!r.roomTypeId||r.roomTypeId===resource.roomTypeId));
 if(!items.length||!Array.isArray(c.results)||c.results.length!==items.length||new Set(c.results.map(r=>r.itemId)).size!==items.length)reject('input');
 for(const item of items)if(!c.results.some(r=>r.itemId===item.entryId&&typeof r.passed==='boolean'))reject('input');
 if(typeof c.note!=='string'||c.note.length>500)reject('input');
 Object.assign(row,{resourceId:c.resourceId,note:c.note,results:items.map(i=>({itemId:i.entryId,name:i.name,passed:c.results.find(r=>r.itemId===i.entryId).passed}))});
 }
 (state.operationsHistory??=[]).push(row);
}

export function housekeepingTasks(state,propertyId){const tasks=new Map();for(const r of state.operationsHistory||[])if(r.propertyId===propertyId&&r.type==='housekeeping_task')tasks.set(r.taskId,r);return [...tasks.values()];}

// Completion batch: explicit identity links and attributed financial shortcuts.
export const completionActions=['customer_link','quick_entry','item_charge','create_hourly'];
export function customerLinks(state,propertyId){const map=new Map();for(const r of state.completionHistory||[])if(r.propertyId===propertyId&&r.type==='customer_link')map.set(r.orderId,r.customerId);return map;}
function changeCompletion(state,c){
 if(c.type==='create_hourly'){
  const plan=directoryEntries(state,c.propertyId,'hourly').find(r=>r.entryId===c.hourlyId),resource=state.resources.find(r=>r.id===c.resourceId&&r.propertyId===c.propertyId&&!r.archived);
  if(!plan||!resource||resource.roomTypeId!==plan.roomTypeId)reject('scope');
  if(state.orders.some(o=>o.propertyId===c.propertyId&&o.status==='checked_in'&&(o.hourly?o.start:o.end)<=state.businessDate&&state.resources.find(r=>r.id===o.resourceId)?.atoms.some(a=>resource.atoms.includes(a))))reject('occupied');
  if(!isDate(c.usageDate)||typeof c.startTime!=='string'||!/^([01]\d|2[0-3]):00$/.test(c.startTime)||!Number.isSafeInteger(c.hours)||c.hours<plan.minHours||c.hours>plan.maxHours||Number(c.startTime.slice(0,2))+c.hours>24)reject('input');
  const amount=money(plan.baseAmount+Math.ceil((c.hours-plan.minHours)/plan.unitHours)*plan.unitAmount),end=new Date(Date.parse(c.usageDate+'T00:00:00Z')+86400000).toISOString().slice(0,10);
  if(state.orders.some(o=>o.id===c.id))reject('duplicate');
  const result=apply({...state,orders:state.orders.filter(o=>!o.hourly)},{...c,type:'create',start:c.usageDate,end,nightly:amount,roomTypeId:resource.roomTypeId,productId:resource.productId,gender:resource.gender||'any',source:'direct'});
  const order=result.orders.find(o=>o.id===c.id);order.hourly={planId:plan.entryId,name:plan.name,minHours:plan.minHours,unitHours:plan.unitHours,baseAmount:plan.baseAmount,unitAmount:plan.unitAmount,hours:c.hours,startTime:c.startTime,endTime:String(Number(c.startTime.slice(0,2))+c.hours).padStart(2,'0')+':00',usageDate:c.usageDate,inventoryPolicy:'hour_slots'};
  state.orders=[...state.orders,order];(state.completionHistory??=[]).push({id:c.id,propertyId:c.propertyId,type:c.type,orderId:c.id,at:c.at,actor:c.actor||'local',businessDate:state.businessDate||null,amount,...order.hourly});return;
 }
 const o=state.orders.find(o=>o.id===c.orderId&&o.propertyId===c.propertyId);if(!o)reject('scope');
 const row={id:c.id,propertyId:c.propertyId,at:c.at,actor:c.actor||'local',type:c.type,orderId:o.id,businessDate:state.businessDate||null};
 if(c.type==='customer_link'){
  if(c.customerId&&!directoryEntries(state,c.propertyId,'customer').some(r=>r.entryId===c.customerId&&r.active))reject('scope');
  Object.assign(row,{customerId:c.customerId||'',reason:text(c.reason||'',500).trim()});if(!row.reason)reject('reason');
 }else{
  if(o.folioClosed||o.splitBills||o.arMoves?.length||isBoxed(o)||o.status==='cancelled')reject('bill_state');
  if(!isDate(state.businessDate)||isAudited(state,state.businessDate))reject('business_date');
  if(c.type==='quick_entry'){
   const category=directoryEntries(state,c.propertyId,'quickCategory').find(r=>r.entryId===c.categoryId&&r.active);if(!category)reject('scope');
   const note=text(c.note||'',500).trim();if(!note)reject('reason');
   const result=apply(state,{...c,type:'payment',kind:category.direction,note});
   state.orders=result.orders;
   Object.assign(row,{categoryId:category.entryId,name:category.name,kind:category.direction,amount:money(c.amount),method:c.method,note});
  }else{
   const item=directoryEntries(state,c.propertyId,'item').find(r=>r.entryId===c.itemId);if(!item)reject('scope');
   if(!Number.isSafeInteger(c.quantity)||c.quantity<1||c.quantity>100||!String(c.note||'').trim())reject('input');
   const extra={id:c.id,kind:'charge',name:item.name,quantity:c.quantity,unitAmount:item.unitAmount,businessDate:state.businessDate,at:c.at,actor:c.actor||'local',itemId:item.entryId,note:text(c.note,500)};
   money(folio(o).charge+extra.quantity*extra.unitAmount);(o.extraCharges??=[]).push(extra);Object.assign(row,extra,{type:c.type,amount:extra.quantity*extra.unitAmount});
  }
 }
 (state.completionHistory??=[]).push(row);
}

// Property-scoped internal front desk workspace. No network, timers or provider writes.
export const deskActions=['channel_source_save','message_draft_save','desk_setting_save','ical_import','ical_revoke','corporate_link','desk_task_save'];
export const deskSettingFields={
 property:['displayName','address','phone','email','description','arrivalInstructions'],
 frontdesk:['checkinTime','checkoutTime','welcome','checklist'],
 quickReply:['name','text'],notification:['name','text'],channel:['name','text'],
 print:['heading','footer']
};
export function deskSettings(state,propertyId){const out={};for(const r of state.deskHistory||[])if(r.propertyId===propertyId&&r.type==='desk_setting_save')out[r.section]=r;return out;}
export function deskReplies(state,propertyId){const out=new Map();for(const r of state.deskHistory||[])if(r.propertyId===propertyId&&r.type==='desk_setting_save'&&r.section==='quickReply')out.set(r.entryId||r.id,r);return [...out.values()];}
export function deskTasks(state,propertyId){const out=new Map();for(const r of state.deskHistory||[])if(r.propertyId===propertyId&&r.type==='desk_task_save')out.set(r.taskId,r);return [...out.values()];}
export function channelSources(state,propertyId){const rows=new Map();for(const r of state.deskHistory||[])if(r.propertyId===propertyId&&r.type==='channel_source_save')rows.set(r.sourceId,r);return [...rows.values()];}
export function messageDrafts(state,propertyId){const rows=new Map();for(const r of state.deskHistory||[])if(r.propertyId===propertyId&&r.type==='message_draft_save')rows.set(r.draftId,r);return [...rows.values()];}
function changeDesk(state,c){
 const text=(v,max=1000)=>{if(typeof v!=='string'||v.length>max||/[<>\x00-\x08]/.test(v))reject('input');return v.trim();};
 const row={id:c.id,propertyId:c.propertyId,type:c.type,actor:c.actor||'local',at:c.at,businessDate:state.businessDate||null};
 if(c.type==='channel_source_save'){
  validSource(c.sourceId);if(typeof c.active!=='boolean')reject('input');
  Object.assign(row,{sourceId:c.sourceId,name:text(c.name,100),note:text(c.note||'',500),active:c.active,reason:text(c.reason,200)});
  if(!row.name||!row.reason)reject('input');
 }else if(c.type==='message_draft_save'){
  const prior=c.draftId?messageDrafts(state,c.propertyId).find(r=>r.draftId===c.draftId):null;
  if(c.draftId&&!prior)reject('scope');
  if(!state.orders.some(o=>o.id===c.orderId&&o.propertyId===c.propertyId)||!isDate(c.dueDate)||!['draft','done','cancelled'].includes(c.status))reject('scope');
  Object.assign(row,{draftId:prior?.draftId||c.id,orderId:c.orderId,dueDate:c.dueDate,title:text(c.title,100),text:text(c.text),status:c.status,reason:text(c.reason,200)});
  if(!row.title||!row.text||!row.reason)reject('input');
 }else if(c.type==='desk_setting_save'){
  if(!Object.hasOwn(deskSettingFields,c.section))reject('input');row.section=c.section;row.values={};
  for(const k of deskSettingFields[c.section])row.values[k]=text(c[k]??'');
  if(c.section==='quickReply'){const prior=c.entryId?deskReplies(state,c.propertyId).find(r=>(r.entryId||r.id)===c.entryId):null;if(c.entryId&&!prior)reject('scope');if(c.active!==undefined&&typeof c.active!=='boolean')reject('input');row.entryId=prior?.entryId||prior?.id||c.id;row.active=c.active??true;}
  for(const k of ['checkinTime','checkoutTime'])if(row.values[k]&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(row.values[k]))reject('input');
 }else if(c.type==='ical_import'){
  const resource=state.resources.find(r=>r.id===c.resourceId&&r.propertyId===c.propertyId&&!r.archived);if(!resource)reject('scope');
  if(state.orders.some(o=>o.propertyId===c.propertyId&&o.status==='checked_in'&&(o.hourly?o.start:o.end)<=state.businessDate&&state.resources.find(r=>r.id===o.resourceId)?.atoms.some(a=>resource.atoms.includes(a))))reject('occupied');
  const intervals=previewIcal(c.ics);if(!intervals.length)reject('input');
  row.reason=text(c.reason,200);if(!row.reason)reject('input');row.resourceId=resource.id;row.intervals=intervals;row.blockIds=[];
  for(const [i,r] of intervals.entries()){
   if((Date.parse(r.end)-Date.parse(r.start))/86400000>366||lastAudit(state)?.businessDate>=r.start)reject('audited');
   if(state.blocks.some(b=>b.propertyId===c.propertyId&&b.icalImportId&&b.start===r.start&&b.end===r.end&&b.atoms.some(a=>resource.atoms.includes(a))))reject('duplicate');
   const id=c.id+':ical:'+i;row.blockIds.push(id);state.blocks.push({id,propertyId:c.propertyId,atoms:[...resource.atoms],...r,blockType:'hold',reason:row.reason,createdAt:c.at,actor:c.actor,icalImportId:c.id});
  }
 }else if(c.type==='ical_revoke'){
  const entry=(state.deskHistory||[]).find(r=>r.id===c.importId&&r.type==='ical_import'&&r.propertyId===c.propertyId);
  if(!entry)reject('scope');if((state.deskHistory||[]).some(r=>r.type==='ical_revoke'&&r.importId===entry.id))reject('duplicate');
  row.reason=text(c.reason,200);if(!row.reason)reject('input');
  if(entry.intervals.some(r=>lastAudit(state)?.businessDate>=r.start))reject('audited');
  row.importId=entry.id;state.blocks=state.blocks.filter(b=>b.icalImportId!==entry.id||b.propertyId!==c.propertyId);
 }else if(c.type==='corporate_link'){
  const o=state.orders.find(o=>o.id===c.orderId&&o.propertyId===c.propertyId);if(!o)reject('scope');
  const company=c.companyId?directoryEntries(state,c.propertyId,'corporate').find(r=>r.entryId===c.companyId):null;if(c.companyId&&!company)reject('scope');
  row.reason=text(c.reason,200);if(!row.reason)reject('input');row.orderId=o.id;row.companyId=company?.entryId||null;row.companyName=company?.name||null;
  // Internal relationship only; never rewrite agreed stay, AR or price snapshots.
 }else{
  const prior=c.taskId?deskTasks(state,c.propertyId).find(r=>r.taskId===c.taskId):null;if(c.taskId&&!prior)reject('scope');
  row.taskId=prior?.taskId||c.id;row.orderId=c.orderId||null;
  if(row.orderId&&!state.orders.some(o=>o.id===row.orderId&&o.propertyId===c.propertyId))reject('scope');
  if(!isDate(c.dueDate)||!['open','done','cancelled'].includes(c.status))reject('input');
  row.title=text(c.title,100);row.note=text(c.note||'');if(!row.title)reject('input');row.dueDate=c.dueDate;row.status=c.status;
 }
 (state.deskHistory??=[]).push(row);
}

// Pure whole-hour inventory; no clock inference and no hidden turnover.
export function hourlyInventory(state,propertyId,usageDate,resourceId){
 if(!isDate(usageDate))reject('date');
 const resource=saleResources(state,propertyId).find(r=>r.id===resourceId);if(!resource)reject('scope');
 const touches=atoms=>atoms.some(a=>resource.atoms.includes(a));
 const plans=preview(state,propertyId).filter(p=>touches(p.atoms)&&p.start<=usageDate&&usageDate<p.end);
 const blocked=state.blocks.some(b=>b.propertyId===propertyId&&b.start<=usageDate&&usageDate<b.end&&touches(b.atoms));
 const inHouse=state.orders.some(o=>o.propertyId===propertyId&&o.status==='checked_in'&&(o.hourly?o.start:o.end)<=usageDate&&touches(state.resources.find(r=>r.id===o.resourceId)?.atoms||[]));
 return Array.from({length:24},(_,hour)=>{const startTime=String(hour).padStart(2,'0')+':00',endTime=String(hour+1).padStart(2,'0')+':00';return {usageDate,resourceId,startTime,endTime,status:inHouse?'occupied':blocked?'blocked':plans.some(p=>p.hourly?.inventoryPolicy!=='hour_slots'||p.hourly.startTime<endTime&&startTime<p.hourly.endTime)?'reserved':'available',cleaning:resource.cleaning||'unknown'};});
}
