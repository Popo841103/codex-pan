import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seed, apply } from '../src/demo-store.js';
import { dailyOperations, guestLedger, managerDailyReport, orderChargeLines, orderBalanceAt } from '../src/financial-reports.js';

const property = 'TEST-KL';
const at = '2027-01-11T04:00:00.000Z'; // 12:00 in Kuala Lumpur on 2027-01-11

// A two-night stay earning one night before and one night on the reported day, with a
// deposit that must never be counted as revenue.
const stay = { id: 'stay', propertyId: property, guest: 'TEST Stay', source: 'booking', roomTypeId: 'ROOM-A',
  start: '2027-01-10', end: '2027-01-12', status: 'checked_in',
  nightlyRates: [{ date: '2027-01-10', amount: 10000 }, { date: '2027-01-11', amount: 10000 }],
  transactions: [{ id: 't1', kind: 'payment', method: 'card', amount: 10000, at: '2027-01-10T02:00:00.000Z' },
                 { id: 't2', kind: 'deposit_in', method: 'cash', amount: 5000, at: '2027-01-10T02:00:00.000Z' }] };
// A cancellation penalty that happened on a night we know.
const penaltyDated = { id: 'pen-dated', propertyId: property, guest: 'TEST Penalty', source: 'direct',
  start: '2027-01-11', end: '2027-01-13', status: 'cancelled', finalCharge: 3000, cancelBusinessDate: '2027-01-11',
  transactions: [] };
// A cancellation penalty recorded before the business date existed, so its night is unknown.
const penaltyUndated = { id: 'pen-undated', propertyId: property, guest: 'TEST Legacy', source: 'direct',
  start: '2027-01-11', end: '2027-01-13', status: 'cancelled', finalCharge: 2000, transactions: [] };
// A guest who paid more than they owe.
const overpaid = { id: 'over', propertyId: property, guest: 'TEST Over', source: 'walkin',
  start: '2027-01-09', end: '2027-01-10', status: 'checked_out',
  nightlyRates: [{ date: '2027-01-09', amount: 4000 }],
  transactions: [{ id: 't3', kind: 'payment', method: 'cash', amount: 6500, at: '2027-01-09T02:00:00.000Z' }] };

const state = (extra = []) => ({ orders: [stay, penaltyDated, penaltyUndated, overpaid, ...extra] });
const query = over => ({ propertyId: property, date: '2027-01-11', ...over });

test('the daily report rebuilds the closing balance from the opening balance and the day movements', () => {
  const r = dailyOperations(state(), query());
  // The opening balance covers every charge and receipt before the reported day, so it
  // includes the short stay that ended on the ninth.
  assert.equal(r.opening.charge, 14000);
  assert.equal(r.opening.paid, 16500);
  assert.equal(r.opening.deposit, 5000);
  assert.equal(r.opening.due, -2500, 'the overpaid stay was already owed money back');

  assert.equal(r.charges.room, 10000, 'the night earned on the reported day');
  assert.equal(r.charges.cancellation, 3000, 'a penalty whose night is known belongs to that night');
  assert.equal(r.charges.total, 13000);

  assert.equal(r.settlements.net, 0, 'no money moved on the reported day');
  assert.equal(r.settlements.depositNet, 0);

  assert.equal(r.closing.charge, 27000);
  assert.equal(r.closing.paid, 16500);
  assert.equal(r.closing.deposit, 5000, 'deposits are held, never earned');
  assert.equal(r.closing.due, 10500);

  assert.deepEqual(r.expected, { charge: 27000, paid: 16500, deposit: 5000 });
  assert.equal(r.balanced, true);
});

test('a charge with no business date is reported as unallocated instead of being placed on a convenient day', () => {
  const r = dailyOperations(state(), query());
  assert.equal(r.charges.total, 13000);
  assert.equal(r.unallocated.length, 1);
  assert.equal(r.unallocated[0].amount, 2000);
  assert.equal(r.unallocated[0].orderId, 'pen-undated');
  assert.equal(r.unallocated[0].reason, 'posting_date_missing');
  assert.equal(orderChargeLines(penaltyUndated).lines.length, 0);
});

test('the guest ledger separates what is owed, what was overpaid and what deposit is held', () => {
  const r = guestLedger(state(), query());
  assert.equal(r.rows.length, 3, 'a stay with no money movement at all is not listed');

  const owed = r.rows.find(x => x.orderId === 'stay');
  assert.equal(owed.outstanding, 10000);
  assert.equal(owed.overpaid, 0);
  assert.equal(owed.depositHeld, 5000);

  const over = r.rows.find(x => x.orderId === 'over');
  assert.equal(over.due, -2500);
  assert.equal(over.outstanding, 0);
  assert.equal(over.overpaid, 2500, 'money owed back to the guest is never netted against revenue');

  assert.equal(r.buckets.outstanding.count, 2);
  assert.equal(r.buckets.outstanding.amount, 13000);
  assert.equal(r.buckets.overpaid.count, 1);
  assert.equal(r.buckets.overpaid.amount, 2500);
  assert.equal(r.buckets.depositHeld.count, 1);
  assert.equal(r.buckets.depositHeld.amount, 5000);
  assert.equal(r.buckets.settled.count, 0);
  assert.equal(r.totals.due, 10500);
});

test('a stay that owes nothing and holds no deposit counts as settled and not as outstanding', () => {
  // Paid in full with the deposit returned: only then is a stay settled. A stay that
  // still holds a deposit is not settled, because the money is still owed back.
  const settled = { ...stay, id: 'clean', transactions: [{ id: 't1', kind: 'payment', method: 'card', amount: 10000, at: '2027-01-10T02:00:00.000Z' }, { id: 't9', kind: 'payment', method: 'card', amount: 10000, at: '2027-01-11T02:00:00.000Z' }] };
  const r = guestLedger({ orders: [settled] }, query());
  assert.equal(r.rows[0].due, 0);
  assert.equal(r.rows[0].depositHeld, 0);
  assert.equal(r.buckets.settled.count, 1);
  assert.equal(r.buckets.outstanding.count, 0);
  assert.equal(r.buckets.overpaid.count, 0);
});

test('the manager report compares the same day last month and last year without mixing receipts into revenue', () => {
  const r = managerDailyReport(state(), query());
  assert.equal(r.date, '2027-01-11');
  assert.equal(r.periods.month.date, '2026-12-11');
  assert.equal(r.periods.year.date, '2026-01-11');
  assert.equal(r.current.charges.total, 13000);
  // Nothing happened on either comparison day, so the growth figures must be stated as
  // a delta with no percentage rather than invented from a zero base.
  assert.equal(r.changes.month.charges.delta, 13000);
  assert.equal(r.changes.month.charges.percent, null);
  assert.equal(r.changes.year.charges.percent, null);
  // A stay earning the same night last month gives the percentage a real base to divide by.
  const comparable = managerDailyReport({ orders: [stay, { ...stay, id: 'last-month', nightlyRates: [{ date: '2026-12-11', amount: 5000 }], transactions: [] }] }, query());
  assert.equal(comparable.changes.month.charges.now, 10000);
  assert.equal(comparable.changes.month.charges.was, 5000);
  assert.equal(comparable.changes.month.charges.delta, 5000);
  assert.equal(comparable.changes.month.charges.percent, 100);
});

test('operating counts stay separate from money and never imply a checked-in guest list', () => {
  const r = dailyOperations(state(), query());
  assert.equal(r.metrics.arrivals, 0, 'cancelled stays are not due arrivals');
  assert.equal(r.metrics.inHouse, 1);
  assert.equal(r.metrics.departures, 0);
});

test('an unset business date is reported rather than replaced with the system clock', () => {
  const r = dailyOperations(state(), query());
  assert.equal(r.businessDate, null);
  assert.equal(r.businessDateSet, false);
  const trusted = dailyOperations({ ...state(), businessDate: '2027-01-11' }, query());
  assert.equal(trusted.businessDateSet, true);
  const shared = dailyOperations({ ...state(), businessDates: { [property]: '2027-01-11' } }, query());
  assert.equal(shared.businessDateSet, true, 'the shared backend stores the date per property');
});

test('cancelling a stay posts the penalty to the business date the cancellation happened on', () => {
  const cmd = command => apply(undefined, command);
  const opened = apply(seed(), { propertyId: property, id: 'c-init', at, type: 'business_date_init', date: '2027-01-11' });
  assert.equal(opened.businessDate, '2027-01-11');
  const created = apply(opened, { propertyId: property, id: 'c-create', at, type: 'create', guest: 'TEST Cancel', productId: 'room', gender: 'any', start: '2027-01-11', end: '2027-01-13', nightly: 9000 });
  const cancelled = apply(created, { propertyId: property, id: 'c-cancel', at, type: 'cancel', orderId: 'c-create', reason: 'TEST penalty', finalCharge: 3000 });
  const order = cancelled.orders.find(o => o.id === 'c-create');
  assert.equal(order.cancelBusinessDate, '2027-01-11');
  assert.equal(order.status, 'cancelled');
  const r = dailyOperations(cancelled, query());
  assert.equal(r.charges.cancellation, 3000);
  assert.equal(r.unallocated.length, 0);
});

test('a cancellation before any business date existed stays unallocated rather than being backdated', () => {
  const created = apply(seed(), { propertyId: property, id: 'c-create', at, type: 'create', guest: 'TEST Early', productId: 'room', gender: 'any', start: '2027-01-11', end: '2027-01-13', nightly: 9000 });
  const cancelled = apply(created, { propertyId: property, id: 'c-cancel', at, type: 'cancel', orderId: 'c-create', reason: 'TEST early', finalCharge: 1500 });
  assert.equal(cancelled.orders.find(o => o.id === 'c-create').cancelBusinessDate, undefined);
  const r = dailyOperations(cancelled, query());
  assert.equal(r.charges.cancellation, 0);
  assert.equal(r.unallocated[0].amount, 1500);
});

test('balances are cut on the same instant for charges and receipts and reject bad scopes', () => {
  const balance = orderBalanceAt(stay, '2027-01-11');
  assert.equal(balance.charge, 20000);
  assert.equal(balance.paid, 10000);
  assert.equal(orderBalanceAt(stay, '2027-01-11', false).charge, 10000, 'exclusive cut drops the day itself');
  for (const q of [{ ...query(), propertyId: '' }, { ...query(), date: '2027-02-30' }, { ...query(), date: undefined }]) {
    assert.throws(() => dailyOperations(state(), q), /report_input/);
    assert.throws(() => guestLedger(state(), q), /report_input/);
  }
});

test('reports never mutate the state they read', () => {
  const source = state();
  const before = JSON.stringify(source);
  dailyOperations(source, query());
  guestLedger(source, query());
  managerDailyReport(source, query());
  assert.equal(JSON.stringify(source), before);
});

test('a ledger amount that is not a safe integer stops the report instead of rounding it', () => {
  const bad = { ...stay, id: 'bad', nightlyRates: [{ date: '2027-01-11', amount: 0.5 }] };
  assert.throws(() => dailyOperations({ orders: [bad] }, query()), /report_amount/);
  const negative = { ...stay, id: 'neg', transactions: [{ kind: 'payment', amount: -100, at: '2027-01-11T02:00:00.000Z' }] };
  assert.throws(() => dailyOperations({ orders: [negative] }, query()), /report_amount/);
});

 test('business-date prepayment and hourly revenue reconcile without mixing the cash day',()=>{
 const order={...stay,hourly:{hours:2},nightlyRates:[{date:'2027-01-11',amount:6000}],transactions:[{kind:'payment',amount:12000,businessDate:'2027-01-11',at:'2026-11-11T04:00:00Z'}]};
 const r=dailyOperations({orders:[order]},query());
 assert.equal(r.charges.room,6000);assert.equal(r.charges.extras,0);assert.equal(r.settlements.net,12000);assert.equal(r.closing.due,-6000);assert.equal(r.balanced,true);
 assert.equal(dailyOperations({orders:[order]},query({date:'2028-01-11'})).metrics.inHouse,0);
 });
