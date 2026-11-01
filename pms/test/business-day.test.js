import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seed, apply } from '../src/demo-store.js';
import { upgradeBusinessDay, nightAuditExceptions, shiftSummary, shiftsOverlap, isAudited, nextDay } from '../src/demo-store.js';

const state = () => seed();
const property = 'TEST-KL';
const cmd = (command, over = {}) => apply(state(), { propertyId: property, id: `c-${Math.random().toString(36).slice(2)}`, at: '2026-03-01T10:00:00.000Z', actor: 'tester', ...command, ...over });

const order = (over) => ({ id: 'o1', propertyId: property, guest: 'Guest', productId: 'room', gender: 'any',
  start: '2026-03-05', end: '2026-03-07', status: 'confirmed', resourceId: null, nightly: 10000, source: 'direct',
  transactions: [], locked: false, ...over });

test('business day starts unset and is never guessed from a clock', () => {
  assert.equal(upgradeBusinessDay({}).businessDate, null);
  assert.deepEqual(upgradeBusinessDay({}).nightAudits, []);
  assert.deepEqual(upgradeBusinessDay({}).shiftTypes, []);
  assert.deepEqual(upgradeBusinessDay({}).handovers, []);
});

test('administrator sets the business date once and it cannot be silently changed', () => {
  const first = cmd({ type: 'business_date_init', date: '2026-03-01' });
  assert.equal(first.businessDate, '2026-03-01');
  assert.throws(() => apply(first, { propertyId: property, id: 'c2', at: '2026-03-01T10:00:00.000Z', type: 'business_date_init', date: '2026-03-09' }), /state/);
  assert.throws(() => cmd({ type: 'business_date_init', date: 'not-a-date' }), /date/);
});

test('night audit advances exactly one day and keeps an append-only record', () => {
  let s = cmd({ type: 'business_date_init', date: '2026-03-01' });
  s = apply(s, { propertyId: property, id: 'na1', at: '2026-03-02T02:00:00.000Z', actor: 'night', type: 'night_audit' });
  assert.equal(s.businessDate, '2026-03-02');
  assert.equal(s.nightAudits.length, 1);
  assert.deepEqual(s.nightAudits[0], { id: 'na1', at: '2026-03-02T02:00:00.000Z', actor: 'night', businessDate: '2026-03-01',
    nextDate: '2026-03-02', mode: 'manual', forced: false, reason: '', exceptions: [], blocking: 0 });
  const before = JSON.stringify(s.nightAudits);
  s = apply(s, { propertyId: property, id: 'na2', at: '2026-03-03T02:00:00.000Z', actor: 'night', type: 'night_audit' });
  assert.equal(s.businessDate, '2026-03-03');
  assert.ok(JSON.stringify(s.nightAudits).startsWith(before.slice(0, -1)), 'earlier audit records are preserved');
});

test('audit refuses to close a day while required exceptions remain unresolved', () => {
  let s = cmd({ type: 'business_date_init', date: '2026-03-06' });
  s = apply(s, { propertyId: property, id: 'o1', at: '2026-03-01T10:00:00.000Z', type: 'create', guest: 'No Show',
    productId: 'room', gender: 'any', start: '2026-03-05', end: '2026-03-07' });
  s.orders[0].status = 'confirmed';
  const exceptions = nightAuditExceptions(s, '2026-03-06');
  assert.ok(exceptions.some(e => e.kind === 'no_show' && e.severity === 'required'));
  assert.throws(() => apply(s, { propertyId: property, id: 'na', at: '2026-03-07T02:00:00.000Z', type: 'night_audit' }), /night_audit_exceptions/);
});

test('forced audit requires a reason and records that it was forced', () => {
  let s = cmd({ type: 'business_date_init', date: '2026-03-06' });
  s = apply(s, { propertyId: property, id: 'o1', at: '2026-03-01T10:00:00.000Z', type: 'create', guest: 'No Show',
    productId: 'room', gender: 'any', start: '2026-03-05', end: '2026-03-07' });
  assert.throws(() => apply(s, { propertyId: property, id: 'na', at: '2026-03-07T02:00:00.000Z', type: 'night_audit', force: true }), /reason/);
  const forced = apply(s, { propertyId: property, id: 'na', at: '2026-03-07T02:00:00.000Z', actor: 'manager',
    type: 'night_audit', force: true, reason: 'guest contacted, arriving tomorrow' });
  assert.equal(forced.businessDate, '2026-03-07');
  assert.equal(forced.nightAudits[0].forced, true);
  assert.equal(forced.nightAudits[0].blocking, 1);
  assert.match(forced.nightAudits[0].reason, /arriving tomorrow/);
});

test('overdue checkout is a required exception and unsettled history only advisory', () => {
  const base = { ...state(), businessDate: '2026-03-08', orders: [
    order({ id: 'a', status: 'checked_in', start: '2026-03-05', end: '2026-03-07' }),
    order({ id: 'b', status: 'checked_out', start: '2026-03-05', end: '2026-03-07', folioClosed: false })
  ] };
  const exceptions = nightAuditExceptions(base, '2026-03-08');
  const byKind = Object.fromEntries(exceptions.map(e => [e.kind, e.severity]));
  assert.equal(byKind.overdue_checkout, 'required');
  assert.equal(byKind.unsettled_history, 'advisory');
  const settled = { ...base, orders: base.orders.map(o => (o.id === 'b' ? { ...o, folioClosed: true } : o)) };
  assert.equal(nightAuditExceptions(settled, '2026-03-08').filter(e => e.severity === 'required').length, 1);
});

test('audited nights cannot be edited or cancelled without an override, but money still posts', () => {
  let s = cmd({ type: 'business_date_init', date: '2026-03-10' });
  s = apply(s, { propertyId: property, id: 'o1', at: '2026-03-01T10:00:00.000Z', type: 'create', guest: 'Historic',
    productId: 'room', gender: 'any', start: '2026-03-05', end: '2026-03-07' });
  assert.ok(isAudited(s, '2026-03-05'));
  assert.equal(isAudited(s, '2026-03-10'), false);
  assert.throws(() => apply(s, { propertyId: property, id: 'e1', at: '2026-03-10T10:00:00.000Z', type: 'edit', orderId: 'o1',
    guest: 'Historic', start: '2026-03-05', end: '2026-03-08', nightly: 10000, source: 'direct' }), /audited/);
  assert.throws(() => apply(s, { propertyId: property, id: 'c1', at: '2026-03-10T10:00:00.000Z', type: 'cancel', orderId: 'o1',
    reason: 'TEST late', finalCharge: 0 }), /audited/);
  // Taking money does not rewrite what the closed night earned, so it is never blocked.
  const paid = apply(s, { propertyId: property, id: 'p1', at: '2026-03-10T10:00:00.000Z', type: 'payment', orderId: 'o1',
    kind: 'payment', amount: 5000, method: 'cash' });
  assert.equal(paid.orders.find(o => o.id === 'o1').transactions.length, 1);
  const overridden = apply(s, { propertyId: property, id: 'e2', at: '2026-03-10T10:00:00.000Z', actor: 'admin', type: 'edit', orderId: 'o1',
    guest: 'Historic', start: '2026-03-05', end: '2026-03-08', nightly: 10000, source: 'direct', auditOverride: true });
  assert.equal(overridden.orders.find(o => o.id === 'o1').end, '2026-03-08');
});

test('an unset business date never audits or locks existing data', () => {
  const s = state();
  assert.equal(isAudited(s, '2020-01-01'), false);
  assert.throws(() => apply(s, { propertyId: property, id: 'na', at: '2026-03-07T02:00:00.000Z', type: 'night_audit' }), /business_date/);
});

test('shift types reject duplicate names, empty ranges and overlapping times', () => {
  let s = cmd({ type: 'business_date_init', date: '2026-03-01' });
  s = apply(s, { propertyId: property, id: 's1', at: '2026-03-01T10:00:00.000Z', type: 'shift_save', name: 'Morning', start: '07:00', end: '15:00' });
  assert.equal(s.shiftTypes.length, 1);
  assert.throws(() => apply(s, { propertyId: property, id: 's2', at: '2026-03-01T10:00:00.000Z', type: 'shift_save', name: 'Morning', start: '16:00', end: '23:00' }), /shift_name/);
  assert.throws(() => apply(s, { propertyId: property, id: 's3', at: '2026-03-01T10:00:00.000Z', type: 'shift_save', name: 'Overlap', start: '14:00', end: '20:00' }), /shift_overlap/);
  assert.throws(() => apply(s, { propertyId: property, id: 's4', at: '2026-03-01T10:00:00.000Z', type: 'shift_save', name: 'Empty', start: '09:00', end: '09:00' }), /input/);
  assert.throws(() => apply(s, { propertyId: property, id: 's5', at: '2026-03-01T10:00:00.000Z', type: 'shift_save', name: 'Bad', start: '7:00', end: '15:00' }), /input/);
});

test('a shift may cross midnight without counting as an empty range', () => {
  let s = cmd({ type: 'business_date_init', date: '2026-03-01' });
  s = apply(s, { propertyId: property, id: 's1', at: '2026-03-01T10:00:00.000Z', type: 'shift_save', name: 'Night', start: '23:00', end: '07:00' });
  assert.equal(s.shiftTypes[0].end, '07:00');
  assert.equal(shiftsOverlap({ start: '23:00', end: '07:00' }, { start: '07:00', end: '15:00' }), false);
  assert.equal(shiftsOverlap({ start: '23:00', end: '07:00' }, { start: '03:00', end: '11:00' }), false || true);
});

test('handover snapshots the window and separates payments, refunds and deposits', () => {
  let s = cmd({ type: 'business_date_init', date: '2026-03-01' });
  s = apply(s, { propertyId: property, id: 's1', at: '2026-03-01T06:00:00.000Z', type: 'shift_save', name: 'Morning', start: '07:00', end: '15:00' });
  s = apply(s, { propertyId: property, id: 'o1', at: '2026-03-01T07:30:00.000Z', type: 'create', guest: 'Payer',
    productId: 'room', gender: 'any', start: '2026-03-05', end: '2026-03-07' });
  const inside = ['2026-03-01T08:00:00.000Z', '2026-03-01T09:00:00.000Z', '2026-03-01T10:00:00.000Z', '2026-03-01T11:00:00.000Z'];
  const kinds = [['payment', 20000, 'cash'], ['refund', 5000, 'cash'], ['deposit_in', 10000, 'card'], ['deposit_out', 2500, 'card']];
  kinds.forEach(([kind, amount, method], index) => {
    s = apply(s, { propertyId: property, id: `t${index}`, at: inside[index], type: 'payment', orderId: 'o1', kind, amount, method });
  });
  s = apply(s, { propertyId: property, id: 'tlate', at: '2026-03-01T16:00:00.000Z', type: 'payment', orderId: 'o1', kind: 'payment', amount: 9999, method: 'cash' });
  const summary = shiftSummary(s, { from: '2026-03-01T07:00:00.000Z', to: '2026-03-01T15:00:00.000Z' });
  assert.equal(summary.count, 4, 'the late transaction is outside the shift window');
  assert.equal(summary.net, 15000);
  assert.equal(summary.depositNet, 7500);
  assert.equal(summary.byMethod.cash.amount, 25000);
  const handed = apply(s, { propertyId: property, id: 'h1', at: '2026-03-01T15:00:00.000Z', actor: 'reception',
    type: 'shift_handover', shiftTypeId: 'shift-morning', from: '2026-03-01T07:00:00.000Z', to: '2026-03-01T15:00:00.000Z', note: 'float counted' });
  assert.equal(handed.handovers.length, 1);
  assert.equal(handed.handovers[0].summary.net, 15000);
  assert.equal(handed.handovers[0].shiftName, 'Morning');
  assert.equal(handed.handovers[0].businessDate, '2026-03-01');
});

test('handover needs a known shift and a valid window; used shifts cannot be deleted', () => {
  let s = cmd({ type: 'business_date_init', date: '2026-03-01' });
  s = apply(s, { propertyId: property, id: 's1', at: '2026-03-01T06:00:00.000Z', type: 'shift_save', name: 'Morning', start: '07:00', end: '15:00' });
  assert.throws(() => apply(s, { propertyId: property, id: 'h', at: '2026-03-01T15:00:00.000Z', type: 'shift_handover',
    shiftTypeId: 'missing', from: '2026-03-01T07:00:00.000Z', to: '2026-03-01T15:00:00.000Z' }), /scope/);
  assert.throws(() => apply(s, { propertyId: property, id: 'h', at: '2026-03-01T15:00:00.000Z', type: 'shift_handover',
    shiftTypeId: 'shift-morning', from: '2026-03-01T15:00:00.000Z', to: '2026-03-01T07:00:00.000Z' }), /shift_window/);
  s = apply(s, { propertyId: property, id: 'h1', at: '2026-03-01T15:00:00.000Z', type: 'shift_handover',
    shiftTypeId: 'shift-morning', from: '2026-03-01T07:00:00.000Z', to: '2026-03-01T15:00:00.000Z' });
  assert.throws(() => apply(s, { propertyId: property, id: 'd1', at: '2026-03-02T10:00:00.000Z', type: 'shift_delete', shiftId: 'shift-morning' }), /shift_in_use/);
});

test('nextDay crosses month and year boundaries', () => {
  assert.equal(nextDay('2026-02-28'), '2026-03-01');
  assert.equal(nextDay('2024-02-28'), '2024-02-29');
  assert.equal(nextDay('2026-12-31'), '2027-01-01');
});

test('a closed night blocks rewriting a stay but never blocks taking money for it', () => {
  const at = '2026-03-06T10:00:00.000Z';
  const opened = cmd({ type: 'business_date_init', date: '2026-03-06' });
  const created = apply(opened, { propertyId: property, id: 'c-order', at, actor: 'tester', type: 'create',
    guest: 'TEST Historic', productId: 'room', gender: 'any', start: '2026-03-05', end: '2026-03-07', nightly: 10000 });
  // The stay began on a night that is already closed, so rewriting it changes earned revenue.
  assert.throws(() => apply(created, { propertyId: property, id: 'c-edit', at, actor: 'tester', type: 'edit',
    orderId: 'c-order', guest: 'TEST Historic', start: '2026-03-05', end: '2026-03-08', nightly: 10000, source: 'direct' }), /audited/);
  assert.throws(() => apply(created, { propertyId: property, id: 'c-cancel', at, actor: 'tester', type: 'cancel',
    orderId: 'c-order', reason: 'TEST late', finalCharge: 0 }), /audited/);
  // Money moving does not rewrite what the closed night earned, so a receipt still posts.
  const paid = apply(created, { propertyId: property, id: 'c-pay', at, actor: 'tester', type: 'payment',
    orderId: 'c-order', kind: 'payment', amount: 10000, method: 'card' });
  const order = paid.orders.find(o => o.id === 'c-order');
  assert.equal(order.transactions.length, 1);
  assert.equal(order.transactions[0].amount, 10000);
  assert.equal(order.transactions[0].kind, 'payment');
});
