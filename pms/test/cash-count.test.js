// A shift handover may count the till. The expected figure is only payments less
// refunds; deposits are a liability held separately. A short or over till is never
// silently written off: an administrator records a reason, and the original
// counted / expected / variance figures stay on the record.
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Store } from '../server/store.js';
import { seed, apply, shiftSummary } from '../src/demo-store.js';

const pid = 'TEST-KL', other = 'TEST-PG';
const at = '2027-01-10T10:00:00.000Z';
const from = '2027-01-10T07:00:00.000Z', to = '2027-01-10T15:00:00.000Z';
const applyTo = (state, command) => apply(state, { propertyId: pid, id: 'c-' + randomUUID(), at, actor: 'tester', ...command });
const handover = (over = {}) => ({ type: 'shift_handover', shiftTypeId: 'shift-morning', from, to, note: '', ...over });

function localState() {
  let s = applyTo(seed(), { type: 'business_date_init', date: '2027-01-10' });
  s = applyTo(s, { type: 'shift_save', name: 'Morning', start: '07:00', end: '15:00' });
  return s;
}

test('expected till cash is payments less refunds, split by method, never deposits', () => {
  const s = { orders: [{ transactions: [
    { at: '2027-01-10T08:00:00.000Z', kind: 'payment', amount: 20000, method: 'cash' },
    { at: '2027-01-10T09:00:00.000Z', kind: 'refund', amount: 5000, method: 'cash' },
    { at: '2027-01-10T10:00:00.000Z', kind: 'payment', amount: 7000, method: 'card' },
    { at: '2027-01-10T11:00:00.000Z', kind: 'deposit_in', amount: 10000, method: 'cash' },
    { at: '2027-01-10T12:00:00.000Z', kind: 'deposit_out', amount: 2500, method: 'cash' },
    { at: '2027-01-10T16:00:00.000Z', kind: 'payment', amount: 9999, method: 'cash' }
  ] }] };
  const summary = shiftSummary(s, { from, to });
  assert.equal(summary.count, 5, 'the transaction outside the shift window is excluded');
  assert.equal(summary.net, 22000);
  assert.equal(summary.depositNet, 7500);
  assert.equal(summary.byMethod.cash.amount, 37500, 'the existing byMethod figure is unchanged');
  assert.deepEqual(summary.cashExpectedByMethod, { cash: 15000, card: 7000 });
  assert.equal(summary.cashExpectedTotal, 22000);
  assert.equal(summary.cashExpectedTotal, summary.net, 'expected cash equals net room receipts');
});

test('an empty shift expects no cash rather than inventing a zero handover', () => {
  const summary = shiftSummary({ orders: [] }, { from, to });
  assert.equal(summary.cashExpectedTotal, 0);
  assert.deepEqual(summary.cashExpectedByMethod, {});
  assert.equal(summary.depositNet, 0);
});

test('a handover without a counted total keeps the old record shape exactly', () => {
  let s = localState();
  s = applyTo(s, { ...handover(), actor: 'reception' });
  assert.equal(s.handovers.length, 1);
  assert.equal('cashCount' in s.handovers[0], false, 'no guessed zero and no new field');
  assert.deepEqual(Object.keys(s.handovers[0]).sort(),
    ['actor', 'at', 'businessDate', 'from', 'id', 'note', 'shiftName', 'shiftTypeId', 'summary', 'to'].sort());
  assert.equal(s.handovers[0].summary.cashExpectedTotal, 0);
});

test('a counted till records the counted, expected and variance figures', () => {
  let s = localState();
  s = applyTo(s, handover({ countedCash: 22000 }));
  assert.deepEqual(s.handovers[0].cashCount,
    { counted: 22000, expected: 0, variance: 22000, status: 'pending', approval: null });
  const balanced = applyTo(localState(), handover({ countedCash: 0 }));
  assert.equal(balanced.handovers[0].cashCount.status, 'balanced');
  assert.equal(balanced.handovers[0].cashCount.approval, null);
});

test('a counted total must be one non-negative whole number of minor units', () => {
  const s = localState();
  for (const countedCash of [-1, 1.5, 100000001, NaN, Infinity, '500', null, true, {}]) {
    assert.throws(() => applyTo(s, handover({ countedCash })), /cash_count/, `reject ${String(countedCash)}`);
  }
  assert.equal(s.handovers.length, 0, 'a rejected count never writes a handover');
  assert.equal(applyTo(s, handover({ countedCash: 100000000 })).handovers.length, 1, 'the upper bound is allowed');
});

test('a variance approval needs a reason, an existing pending count and a real handover', () => {
  let s = applyTo(localState(), handover({ countedCash: 500 }));
  const id = s.handovers[0].id;
  assert.throws(() => applyTo(s, { type: 'cash_variance_approve', handoverId: id }), /input/);
  assert.throws(() => applyTo(s, { type: 'cash_variance_approve', handoverId: id, reason: '   ' }), /input/);
  assert.throws(() => applyTo(s, { type: 'cash_variance_approve', handoverId: id, reason: 'x'.repeat(501) }), /input/);
  assert.throws(() => applyTo(s, { type: 'cash_variance_approve', handoverId: 'missing', reason: 'checked' }), /scope/);
  const uncounted = applyTo(localState(), handover());
  assert.throws(() => applyTo(uncounted, { type: 'cash_variance_approve', handoverId: uncounted.handovers[0].id, reason: 'checked' }), /scope/);
  const balanced = applyTo(localState(), handover({ countedCash: 0 }));
  assert.throws(() => applyTo(balanced, { type: 'cash_variance_approve', handoverId: balanced.handovers[0].id, reason: 'checked' }), /cash_variance_decided/);
});

test('an administrator approval keeps the discrepancy readable and cannot be repeated', () => {
  let s = applyTo(localState(), handover({ countedCash: 500 }));
  const id = s.handovers[0].id;
  const before = JSON.stringify(s.handovers[0].cashCount);
  s = applyTo(s, { type: 'cash_variance_approve', handoverId: id, reason: '  float returned by the guest  ' });
  const cash = s.handovers[0].cashCount;
  assert.equal(cash.counted, 500);
  assert.equal(cash.expected, 0);
  assert.equal(cash.variance, 500, 'the original discrepancy is never rewritten');
  assert.equal(cash.status, 'approved');
  assert.deepEqual(cash.approval, { at, actor: 'tester', reason: 'float returned by the guest' });
  assert.equal(JSON.parse(before).status, 'pending');
  assert.throws(() => applyTo(s, { type: 'cash_variance_approve', handoverId: id, reason: 'again' }), /cash_variance_decided/);
  assert.equal(s.handovers.length, 1, 'an approval never creates another handover');
});

function fixture() {
  const store = new Store(':memory:');
  store.seedTestProperties();
  const user = (role, propertyIds = [pid, other]) => store.createUser({
    username: 'test-cash-' + role + '-' + randomUUID().slice(0, 6), password: 'test-password-only', role, propertyIds });
  return { store, admin: user('admin'), ops: user('operations'), finance: user('finance'), viewer: user('viewer') };
}
const req = (type, command = {}, revision = 0, key = randomUUID()) =>
  ({ key, expectedRevision: revision, command: { type, propertyId: pid, ...command } });
const rev = (f, id = pid) => f.store.read(f.admin).revisions[id];
const run = (f, actor, type, command = {}, id = pid) =>
  f.store.command(actor, { key: randomUUID(), expectedRevision: f.store.read(f.admin).revisions[id],
    command: { type, propertyId: id, ...command } });
const forbidden = e => e.status === 403 && e.message === 'forbidden';
const counted = (f, id = pid) => run(f, f.ops, 'shift_handover',
  { shiftTypeId: 'shift-morning', from, to, note: 'TEST float', countedCash: 500 }, id);
function prepared(f) {
  run(f, f.admin, 'business_date_init', { date: '2027-01-10' });
  run(f, f.admin, 'shift_save', { name: 'Morning', start: '07:00', end: '15:00' });
}

test('the shared backend stores the count, and the durable audit keeps the figures without a guest name', f => {
  const { store, admin, ops } = fixture();
  try {
    prepared({ store, admin, ops });
    const result = counted({ store, admin, ops });
    assert.equal(typeof result.revision, 'number');
    const handovers = store.read(admin).handovers;
    assert.equal(handovers.length, 1);
    assert.deepEqual(handovers[0].cashCount,
      { counted: 500, expected: 0, variance: 500, status: 'pending', approval: null });
    const audit = store.read(admin).audit;
    const entry = audit.find(a => a.type === 'shift_handover');
    assert(entry, 'the handover is audited');
    assert.deepEqual(entry.handoverCash, { counted: 500, expected: 0 });
    assert.ok(Array.isArray(entry.fields) && entry.fields.includes('countedCash'), 'the request fields are recorded');
    assert.equal(JSON.stringify(entry).includes('Guest'), false);
  } finally { store.close(); }
});

test('a handover without a count writes no cash figures into the audit', f => {
  const { store, admin, ops } = fixture();
  try {
    prepared({ store, admin, ops });
    run({ store, admin, ops }, ops, 'shift_handover',
      { shiftTypeId: 'shift-morning', from, to, note: 'TEST uncounted' });
    const entry = store.read(admin).audit.find(a => a.type === 'shift_handover');
    assert.equal('handoverCash' in entry, false);
    assert.equal('cashCount' in store.read(admin).handovers[0], false);
  } finally { store.close(); }
});

test('only an administrator may approve a variance, and the reason is durable', f => {
  const f0 = fixture();
  try {
    prepared(f0);
    counted(f0);
    const id = f0.store.read(f0.admin).handovers[0].id;
    for (const actor of [f0.ops, f0.finance, f0.viewer]) {
      assert.throws(() => run(f0, actor, 'cash_variance_approve', { handoverId: id, reason: 'checked' }), forbidden,
        `${actor.username} must not approve a till variance`);
    }
    assert.equal(f0.store.read(f0.admin).handovers[0].cashCount.status, 'pending',
      'failed approvals never change the record');
    const result = run(f0, f0.admin, 'cash_variance_approve', { handoverId: id, reason: 'TEST float returned' });
    assert.equal(typeof result.revision, 'number');
    const cash = f0.store.read(f0.admin).handovers[0].cashCount;
    assert.equal(cash.status, 'approved');
    assert.equal(cash.variance, 500);
    assert.equal(cash.counted, 500);
    assert.equal(cash.approval.actor, f0.admin.username);
    assert.equal(cash.approval.reason, 'TEST float returned');
    const entry = f0.store.read(f0.admin).audit.find(a => a.type === 'cash_variance_approve');
    assert.equal(entry.handoverId, id);
    assert.equal(entry.variance, 500);
    assert.equal(entry.reason, 'TEST float returned');
    assert.equal(JSON.stringify(entry).includes('Guest'), false, 'the audit never carries a guest name');
  } finally { f0.store.close(); }
});

test('a variance approval is idempotent and stays scoped to its own property', f => {
  const f0 = fixture();
  try {
    prepared(f0);
    run(f0, f0.admin, 'business_date_init', { date: '2027-01-10' }, other);
    run(f0, f0.admin, 'shift_save', { name: 'Morning', start: '07:00', end: '15:00' }, other);
    counted(f0);
    counted(f0, other);
    const mine = f0.store.read(f0.admin).handovers.find(h => h.propertyId === pid);
    const theirs = f0.store.read(f0.admin).handovers.find(h => h.propertyId === other);
    assert.equal(theirs.cashCount.status, 'pending');
    assert.throws(() => run(f0, f0.admin, 'cash_variance_approve', { handoverId: theirs.id, reason: 'wrong property' }),
      e => e.status === 400 && e.message === 'scope', 'a KL command cannot reach a PG handover');
    const key = randomUUID();
    const first = f0.store.command(f0.admin, req('cash_variance_approve', { handoverId: mine.id, reason: 'TEST checked' }, rev(f0), key));
    assert.equal(typeof first.revision, 'number');
    const replay = f0.store.command(f0.admin, req('cash_variance_approve', { handoverId: mine.id, reason: 'TEST checked' }, rev(f0), key));
    assert.equal(replay.replayed, true);
    assert.equal(f0.store.read(f0.admin).audit.filter(a => a.type === 'cash_variance_approve').length, 1);
    assert.equal(f0.store.read(f0.admin).handovers.find(h => h.propertyId === other).cashCount.status, 'pending');
  } finally { f0.store.close(); }
});
