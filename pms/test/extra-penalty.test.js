import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extraChargeDetail, cancellationPenaltyDetail, policySnapshot } from '../src/financial-reports.js';

const P = 'TEST-KL';
const resources = [
  { id: 'R1', propertyId: P, productId: 'room', atoms: ['a1'], roomId: 'room1', label: 'R01', roomTypeId: 'rt-room', archived: false },
  { id: 'B1', propertyId: P, productId: 'bed', atoms: ['b1'], roomId: 'dorm1', label: 'D1 · B1', roomTypeId: 'rt-bed', archived: false }
];
const base = extra => ({ resources, roomTypes: [{ id: 'rt-room', propertyId: P, name: 'Private room' }], orders: [], blocks: [], audit: [], ...extra });
const stay = (over = {}, extra = {}) => ({ id: 'o1', propertyId: P, guest: 'TEST Guest', productId: 'room', roomTypeId: 'rt-room',
  source: 'direct', start: '2027-01-10', end: '2027-01-12', nightly: 10000, status: 'confirmed', resourceId: 'R1',
  transactions: [], ...over, ...extra });
const query = over => ({ propertyId: P, from: '2027-01-10', to: '2027-01-11', source: 'all', ...over });
const extra = (over = {}) => ({ kind: 'charge', name: 'TEST extra', quantity: 1, unitAmount: 3000, businessDate: '2027-01-10', ...over });

test('extras and discounts are listed separately and never netted inside one row', () => {
  const order = stay({ extraCharges: [extra(), extra({ kind: 'discount', name: 'TEST coupon', unitAmount: 1000 })] });
  const report = extraChargeDetail(base({ orders: [order] }), query());
  assert.equal(report.rows.length, 2);
  const rows = report.rows;
  assert.equal(rows.find(r => r.kind === 'charge').amount, 3000, 'a charge adds to the bill');
  assert.equal(rows.find(r => r.kind === 'discount').amount, -1000, 'a discount is reported as a negative line, not as a positive charge');
  assert.equal(report.totals.charge, 3000);
  assert.equal(report.totals.discount, 1000);
  assert.equal(report.totals.net, 2000, 'the net is charges less discounts');
  assert.equal(report.totals.count, 2);
});

test('extra charges are cut on their own business date, not on the stay date', () => {
  const order = stay({ extraCharges: [extra({ businessDate: '2027-01-11' }), extra({ name: 'TEST other', businessDate: '2027-01-20' })] });
  const report = extraChargeDetail(base({ orders: [order] }), query());
  assert.equal(report.rows.length, 1, 'only the line earned inside the range is reported');
  assert.equal(report.rows[0].date, '2027-01-11');
  assert.deepEqual(report.daily, [{ date: '2027-01-11', amount: 3000 }]);
});

test('an extra without a business date is unallocated rather than pushed onto the stay date', () => {
  const order = stay({ extraCharges: [extra({ businessDate: null })] });
  const report = extraChargeDetail(base({ orders: [order] }), query());
  assert.equal(report.rows.length, 0);
  assert.equal(report.unallocated.length, 1);
  assert.equal(report.unallocated[0].reason, 'posting_date_missing');
  assert.equal(report.totals.net, 0, 'it is not added to the period total');
});

test('extras of a cancelled stay are superseded by the final charge instead of counted twice', () => {
  const cancelled = stay({ status: 'cancelled', finalCharge: 5000, cancelBusinessDate: '2027-01-10',
    extraCharges: [extra()] });
  const report = extraChargeDetail(base({ orders: [cancelled] }), query());
  assert.equal(report.rows.length, 0);
  assert.equal(report.superseded, 1, 'the page can say how many stays were replaced by a final charge');
  const live = stay({ id: 'o2', finalCharge: 7000, extraCharges: [extra()] });
  assert.equal(extraChargeDetail(base({ orders: [live] }), query()).superseded, 1, 'a final charge supersedes extras even when not cancelled');
});

test('extras are summarised by name with their own quantities and counts', () => {
  const orders = [stay({ id: 'o1', extraCharges: [extra({ quantity: 2 })] }),
    stay({ id: 'o2', extraCharges: [extra({ quantity: 3 }), extra({ name: 'TEST coupon', kind: 'discount', unitAmount: 500 })] })];
  const report = extraChargeDetail(base({ orders }), query());
  const named = report.names.find(n => n.name === 'TEST extra');
  assert.equal(named.quantity, 5, 'quantities add within a name');
  assert.equal(named.chargeCount, 2);
  assert.equal(named.charge, 15000);
  assert.equal(named.discountCount, 0, 'a discount under another name stays in its own bucket');
  assert.equal(report.names.find(n => n.name === 'TEST coupon').discount, 500);
});

test('the source filter and the property scope both apply to extras', () => {
  const orders = [stay({ source: 'booking', extraCharges: [extra()] }),
    stay({ id: 'o2', source: 'direct', extraCharges: [extra()] }),
    stay({ id: 'o3', propertyId: 'OTHER', extraCharges: [extra()] })];
  const report = extraChargeDetail(base({ orders }), query({ source: 'booking' }));
  assert.equal(report.rows.length, 1);
  assert.equal(report.rows[0].source, 'booking');
});

test('cancellation penalties are listed with the booking they replaced', () => {
  const order = stay({ status: 'cancelled', finalCharge: 4000, cancelBusinessDate: '2027-01-10',
    cancelReason: 'TEST no show', nightlyRates: [{ date: '2027-01-10', amount: 10000 }, { date: '2027-01-11', amount: 12000 }],
    extraCharges: [extra()], transactions: [{ id: 't1', kind: 'payment', amount: 1000, method: 'cash', at: '2027-01-10T02:00:00.000Z' }] });
  const report = cancellationPenaltyDetail(base({ orders: [order] }), query());
  assert.equal(report.rows.length, 1);
  const [row] = report.rows;
  assert.equal(row.penalty, 4000);
  assert.equal(row.booked, 25000, 'the booking value is the room nights plus the extras');
  assert.equal(row.bookedRoom, 22000);
  assert.equal(row.bookedExtras, 3000);
  assert.equal(row.share, 4000 / 25000, 'the penalty is shown as a share of what was booked');
  assert.equal(row.received, 1000, 'what was already received is shown so it is not chased twice');
  assert.equal(row.reason, 'TEST no show');
  assert.equal(report.total, 4000);
  assert.equal(report.count, 1);
});

test('a penalty is cut on the business date the cancellation happened', () => {
  const order = stay({ status: 'cancelled', finalCharge: 4000, cancelBusinessDate: '2027-01-11' });
  const inside = cancellationPenaltyDetail(base({ orders: [order] }), query());
  assert.equal(inside.rows.length, 1);
  const outside = cancellationPenaltyDetail(base({ orders: [stay({ status: 'cancelled', finalCharge: 9000, cancelBusinessDate: '2027-01-20' })] }), query());
  assert.equal(outside.rows.length, 0, 'a penalty from another day does not appear in this range');
  assert.equal(outside.total, 0);
});

test('a penalty without a business date stays unallocated', () => {
  const order = stay({ status: 'cancelled', finalCharge: 4000 });
  const report = cancellationPenaltyDetail(base({ orders: [order] }), query());
  assert.equal(report.rows.length, 0);
  assert.equal(report.unallocated.length, 1);
  assert.equal(report.total, 0, 'it is never added to a period by guesswork');
});

test('a free cancellation and a stay that is not cancelled are not penalties', () => {
  const orders = [stay({ status: 'cancelled', finalCharge: 0, cancelBusinessDate: '2027-01-10' }), stay({ id: 'o2' })];
  const report = cancellationPenaltyDetail(base({ orders }), query());
  assert.equal(report.rows.length, 1, 'a zero penalty is still listed so free cancellations stay visible');
  assert.equal(report.total, 0);
  assert.equal(report.rows[0].penalty, 0);
});

test('penalties group by channel and the actor who cancelled is recorded', () => {
  const orders = [
    stay({ id: 'o1', status: 'cancelled', finalCharge: 4000, cancelBusinessDate: '2027-01-10', source: 'booking' }),
    stay({ id: 'o2', status: 'cancelled', finalCharge: 1000, cancelBusinessDate: '2027-01-10', source: 'booking' }),
    stay({ id: 'o3', status: 'cancelled', finalCharge: 2000, cancelBusinessDate: '2027-01-10', source: 'direct' })];
  const audit = [{ id: 'a1', propertyId: P, type: 'cancel', orderId: 'o1', at: '2027-01-10T03:00:00.000Z', actor: 'manager' }];
  const report = cancellationPenaltyDetail(base({ orders, audit }), query());
  assert.equal(report.rows.find(r => r.orderId === 'o1').actor, 'manager');
  assert.equal(report.rows.find(r => r.orderId === 'o2').actor, null, 'no actor means it is left blank, not invented');
  const booking = report.sources.find(s => s.source === 'booking');
  assert.deepEqual([booking.count, booking.penalty], [2, 5000]);
  assert.equal(report.sources.length, 2);
});

test('the stored policy is reported as a snapshot, never recomputed into a fee', () => {
  const partial = policySnapshot({ cancellationPolicy: { kind: 'partial', percent: 5000, basis: 'total' }, start: '2027-01-10' });
  assert.equal(partial.kind, 'partial');
  assert.equal(partial.percent, 5000);
  assert.equal(partial.basis, 'total');
  assert.equal(partial.deadline, null);
  // Malaysia is fixed at UTC+8 and the deadline is a local hotel deadline, not a UTC instant.
  const flexible = policySnapshot({ cancellationPolicy: { kind: 'flexible', percent: 10000, basis: 'firstNight', days: 2, time: '18:00' }, start: '2027-01-10' });
  assert.equal(flexible.deadline, '2027-01-08T18:00:00+08:00');
  const missing = policySnapshot({ start: '2027-01-10' });
  assert.equal(missing.kind, null, 'a stay without a stored policy says so instead of guessing one');
  assert.equal(policySnapshot({ cancellationPolicy: { kind: 'nonsense' } }).kind, null);
});

test('the policy snapshot reaches the penalty row', () => {
  const order = stay({ status: 'cancelled', finalCharge: 4000, cancelBusinessDate: '2027-01-10',
    cancellationPolicy: { kind: 'nonrefundable' } });
  const report = cancellationPenaltyDetail(base({ orders: [order] }), query());
  assert.equal(report.rows[0].policy.kind, 'nonrefundable');
});

test('reports refuse an invalid range instead of silently widening it', () => {
  assert.throws(() => extraChargeDetail(base({}), query({ from: '2027-01-12', to: '2027-01-10' })), /report_input/);
  assert.throws(() => cancellationPenaltyDetail(base({}), query({ from: 'nonsense', to: '2027-01-11' })), /report_input/);
  assert.throws(() => cancellationPenaltyDetail(base({}), { propertyId: '', from: '2027-01-10', to: '2027-01-11' }), /report_input/);
});

test('malformed money stops the report instead of producing a total', () => {
  const order = stay({ extraCharges: [extra({ unitAmount: 1.5 })] });
  assert.throws(() => extraChargeDetail(base({ orders: [order] }), query()), /report_amount/);
});
