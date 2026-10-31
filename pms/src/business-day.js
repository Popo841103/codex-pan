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
    count += 1;
  }
  return { from, to, count, byKind, byMethod,
    net: byKind.payment.amount - byKind.refund.amount,
    depositNet: byKind.deposit_in.amount - byKind.deposit_out.amount };
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
    state.handovers.push({ id: command.id, at: command.at, actor: command.actor || 'local',
      businessDate: state.businessDate, shiftTypeId: shift.id, shiftName: shift.name, from, to, note, summary });
    return state;
  }
  reject('input');
  return state;
}
