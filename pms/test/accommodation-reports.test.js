import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nightInventory, roomChargeDetail, roomBusinessSummary, roomMovementLog } from '../src/financial-reports.js';

const P = 'TEST-KL';
// Two private rooms, a suite made of those same two rooms, and a three-bed dorm.
// The suite shares atoms with the rooms, which is exactly where double counting starts.
const resources = [
  { id: 'R1', propertyId: P, productId: 'room', atoms: ['a1'], roomId: 'room1', roomTypeId: 'rt-room', archived: false },
  { id: 'R2', propertyId: P, productId: 'room', atoms: ['a2'], roomId: 'room2', roomTypeId: 'rt-room', archived: false },
  { id: 'S1', propertyId: P, productId: 'suite', atoms: ['a1', 'a2'], roomId: 'suite1', roomTypeId: 'rt-suite', archived: false },
  { id: 'B1', propertyId: P, productId: 'bed', atoms: ['b1'], roomId: 'dorm1', roomTypeId: 'rt-bed', archived: false },
  { id: 'B2', propertyId: P, productId: 'bed', atoms: ['b2'], roomId: 'dorm1', roomTypeId: 'rt-bed', archived: false },
  { id: 'B3', propertyId: P, productId: 'bed', atoms: ['b3'], roomId: 'dorm1', roomTypeId: 'rt-bed', archived: false }
];
const state = extra => ({ resources, roomTypes: [{ id: 'rt-room', propertyId: P, name: 'Private room' }], orders: [], blocks: [], audit: [], ...extra });
const stay = (over, extra = {}) => ({ id: 'o1', propertyId: P, guest: 'TEST Guest', productId: 'room', roomTypeId: 'rt-room',
  source: 'direct', start: '2027-01-10', end: '2027-01-12', nightly: 10000, status: 'confirmed', resourceId: 'R1',
  transactions: [], ...over, ...extra });
const query = over => ({ propertyId: P, from: '2027-01-10', to: '2027-01-11', source: 'all', ...over });

test('supply counts rooms, suites and beds separately', () => {
  const inv = nightInventory(state({}), P, '2027-01-10');
  assert.deepEqual(inv.supply, { room: 2, bed: 3, suite: 1 });
  assert.deepEqual(inv.sold, { room: 0, bed: 0, suite: 0 });
});

test('a sold suite removes its own rooms from supply instead of counting them twice', () => {
  const sold = state({ orders: [stay({ productId: 'suite', roomTypeId: 'rt-suite', resourceId: 'S1', nightly: 30000 })] });
  const inv = nightInventory(sold, P, '2027-01-10');
  assert.equal(inv.sold.suite, 1, 'the suite is sold');
  assert.equal(inv.sold.room, 0, 'the two rooms inside it are not also sold as rooms');
  assert.equal(inv.supply.room, 0, 'rooms inside a sold suite are not sellable that night');
  assert.equal(inv.insideSuite.room, 2);
  assert.equal(inv.supply.bed, 3, 'beds are untouched by a suite sale');
  assert.equal(inv.revenue.suite, 30000);
});

test('maintenance removes a unit from the occupancy denominator', () => {
  const blocked = state({ blocks: [{ id: 'b1', propertyId: P, atoms: ['a2'], start: '2027-01-10', end: '2027-01-12', blockType: 'maintenance' }] });
  const inv = nightInventory(blocked, P, '2027-01-10');
  assert.equal(inv.supply.room, 1, 'only the room that is not under maintenance is sellable');
  assert.equal(inv.outOfService.room, 1);
});

test('a hold blocks selling but stays in the denominator, which is the JOVIAN policy', () => {
  const held = state({ blocks: [{ id: 'b2', propertyId: P, atoms: ['a2'], start: '2027-01-10', end: '2027-01-12', blockType: 'hold' }] });
  const inv = nightInventory(held, P, '2027-01-10');
  assert.equal(inv.supply.room, 2, 'a held room is still counted as sellable capacity');
  assert.equal(inv.outOfService.room, 0);
});

test('ADR, occupancy and RevPAR are reported per product and per night', () => {
  const sold = state({ orders: [stay({})] });
  const report = roomBusinessSummary(sold, query({ dimension: 'date' }));
  const night = report.rows.find(r => r.key === '2027-01-10');
  assert.equal(night.sold, 1);
  assert.equal(night.supplyNights, 6, 'two rooms, three beds and one suite are sellable that night');
  assert.equal(night.revenue, 10000);
  assert.equal(night.adr, 10000);
  assert.equal(night.revpar, 10000 / 6);
  const roomRow = night.byProduct.find(p => p.productId === 'room');
  assert.equal(roomRow.sold, 1);
  assert.equal(roomRow.supplyNights, 2);
  assert.equal(roomRow.occ, 0.5, 'one of two rooms sold');
});

test('a two-night stay is counted once per night, never as one stay', () => {
  const report = roomBusinessSummary(state({ orders: [stay({})] }), query());
  assert.equal(report.rows.length, 2, 'the range has two nights');
  assert.equal(report.totals.sold, 2, 'one room for two nights is two room-nights');
  assert.equal(report.totals.revenue, 20000);
  assert.equal(report.totals.adr, 10000, 'ADR is revenue per sold room-night');
});

test('occupancy is unavailable for the source dimension rather than invented', () => {
  const report = roomBusinessSummary(state({ orders: [stay({ source: 'booking' })] }), query({ dimension: 'source' }));
  const row = report.rows.find(r => r.key === 'booking');
  assert.equal(row.sold, 2);
  assert.equal(row.revenue, 20000);
  assert.equal(row.adr, 10000, 'ADR needs no inventory denominator');
  assert.equal(row.occ, null, 'no channel owns a share of sellable rooms');
  assert.equal(row.revpar, null);
  assert.equal(report.occupancyAvailable, false);
});

test('an unassigned stay is reported separately instead of being counted as a room', () => {
  const report = roomBusinessSummary(state({ orders: [stay({ resourceId: null })] }), query());
  assert.equal(report.totals.sold, 2, 'the stay still takes inventory and earns revenue');
  assert.equal(report.unassignedNights, 2, 'but it has not been given a unit yet');
  assert.equal(report.rows[0].unassigned, 1);
});

test('room charge detail lists every earned night with its own rate', () => {
  const order = stay({ nightlyRates: [{ date: '2027-01-10', amount: 10000 }, { date: '2027-01-11', amount: 12000 }], channelOrderId: 'CH-1' });
  const detail = roomChargeDetail(state({ orders: [order] }), query());
  assert.equal(detail.rows.length, 2);
  assert.deepEqual(detail.rows.map(r => r.amount), [10000, 12000]);
  assert.equal(detail.total, 22000);
  assert.equal(detail.rows[0].channelOrderId, 'CH-1');
  assert.equal(detail.rows[0].roomTypeName, 'Private room');
  assert.equal(detail.adr, 11000, 'ADR is the average of the earned nights');
});

test('cancellation penalties are not reported as room charges', () => {
  const cancelled = stay({ status: 'cancelled', finalCharge: 5000, cancelBusinessDate: '2027-01-10', nightlyRates: null });
  const detail = roomChargeDetail(state({ orders: [cancelled] }), query());
  assert.equal(detail.rows.length, 0, 'a penalty is not a room night');
  assert.equal(detail.total, 0);
});

test('movements are classified and carry the before and after state', () => {
  const orders = [stay({ id: 'o1' })];
  const audit = [
    { id: 'a1', propertyId: P, type: 'edit', orderId: 'o1', at: '2027-01-11T02:00:00.000Z', actor: 'front-desk',
      stayChange: { before: { start: '2027-01-10', end: '2027-01-12', nightly: 10000, resourceId: 'R1', status: 'confirmed', productId: 'room', finalCharge: null },
        after: { start: '2027-01-10', end: '2027-01-11', nightly: 10000, resourceId: 'R1', status: 'confirmed', productId: 'room', finalCharge: null }, reason: null } },
    { id: 'a2', propertyId: P, type: 'assign', orderId: 'o1', at: '2027-01-11T03:00:00.000Z', actor: 'front-desk',
      stayChange: { before: { start: '2027-01-10', end: '2027-01-11', nightly: 10000, resourceId: 'R1', status: 'confirmed', productId: 'room', finalCharge: null },
        after: { start: '2027-01-10', end: '2027-01-11', nightly: 10000, resourceId: 'R2', status: 'confirmed', productId: 'room', finalCharge: null }, reason: null } },
    { id: 'a3', propertyId: P, type: 'cancel', orderId: 'o1', at: '2027-01-11T04:00:00.000Z', actor: 'manager',
      stayChange: { before: { start: '2027-01-10', end: '2027-01-11', nightly: 10000, resourceId: 'R2', status: 'confirmed', productId: 'room', finalCharge: null },
        after: { start: '2027-01-10', end: '2027-01-11', nightly: 10000, resourceId: 'R2', status: 'cancelled', productId: 'room', finalCharge: 8000 }, reason: 'TEST no show' } }
  ];
  const order = orders[0];
  order.finalCharge = 8000;
  const log = roomMovementLog(state({ orders, audit }), query());
  assert.equal(log.rows.length, 3);
  const [cancel, move, edit] = log.rows;
  assert.equal(edit.movement, 'early_departure', 'leaving earlier than booked is named');
  assert.equal(edit.beforeEnd, '2027-01-12');
  assert.equal(edit.afterEnd, '2027-01-11');
  assert.equal(move.movement, 'room_change', 'moving to another room is named');
  assert.equal(move.beforeRoom, 'R1');
  assert.equal(move.afterRoom, 'R2');
  assert.equal(cancel.movement, 'cancel');
  assert.equal(cancel.penalty, 8000, 'the penalty is shown with the cancellation');
  assert.equal(cancel.reason, 'TEST no show');
  assert.equal(cancel.actor, 'manager', 'who made the change is recorded');
  assert.deepEqual(log.counts, { early_departure: 1, room_change: 1, cancel: 1 });
});

test('a movement log only covers the range and the property asked for', () => {
  const audit = [
    { id: 'a1', propertyId: P, type: 'create', orderId: 'o1', at: '2027-01-09T02:00:00.000Z', actor: 'x' },
    { id: 'a2', propertyId: P, type: 'create', orderId: 'o2', at: '2027-01-10T02:00:00.000Z', actor: 'x' },
    { id: 'a3', propertyId: 'OTHER', type: 'create', orderId: 'o3', at: '2027-01-10T02:00:00.000Z', actor: 'x' }
  ];
  const log = roomMovementLog(state({ audit }), query());
  assert.equal(log.rows.length, 1, 'yesterday and another property are excluded');
  assert.equal(log.rows[0].orderId, 'o2');
});

test('reports refuse an invalid range instead of silently widening it', () => {
  assert.throws(() => roomBusinessSummary(state({}), query({ from: '2027-01-12', to: '2027-01-10' })), /report_input/);
  assert.throws(() => roomBusinessSummary(state({}), { propertyId: P, from: '2027-01-10', to: '2027-01-11', dimension: 'channel' }), /report_input/);
  assert.throws(() => roomMovementLog(state({}), query({ from: 'nonsense', to: '2027-01-11' })), /report_input/);
});
