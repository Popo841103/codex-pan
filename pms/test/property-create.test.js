// A new property starts with nothing: no room type, no room, no bed and no booking.
// The system must never assume a layout, because the number of rooms and beds a
// property sells is the operator's to state. Existing properties are never touched.
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Store } from '../server/store.js';

const password = () => randomUUID().replace(/-/g, '');
const newProperty = (over = {}) => ({ type: 'property_create', propertyId: 'NEW-KL', newPropertyId: 'NEW-KL', name: 'TEST New Property', ...over });
const send = (store, user, command, revision = 0, key = randomUUID()) => store.command(user, { key, expectedRevision: revision, command });
const forbidden = e => e.status === 403 && e.message === 'forbidden';

function install(t) {
  const dir = mkdtempSync(join(tmpdir(), 'jovian-new-property-'));
  const store = new Store(join(dir, 'test.sqlite'));
  if (t) t.after(() => { try { store.close(); } catch {} rmSync(dir, { recursive: true, force: true }); });
  // An administrator with no property at all: the state a fresh installation starts in.
  const root = store.createUser({ username: 'test-root', password: password(), role: 'admin', propertyIds: [] });
  return { store, root, dir };
}

test('a fresh installation lets an administrator exist before any property does', () => {
  const { store, root } = install();
  try {
    const state = store.read(root);
    assert.deepEqual(state.properties, [], 'nothing is invented for a brand-new installation');
    assert.equal(state.noPropertyYet, true, 'the workspace states there is no property yet');
    assert.deepEqual(state.orders, []);
    assert.deepEqual(state.resources, []);
    assert.deepEqual(root.propertyIds, []);
  } finally { store.close(); }
});

test('only an administrator may create a property, and nothing is written by a refused attempt', () => {
  const { store, root } = install();
  try {
    // A non-administrator can only hold an existing property, so the refusal is proven
    // on a real operations account rather than on an imaginary one.
    const bootstrap = store.createUser({ username: 'test-boot', password: password(), role: 'admin', propertyIds: [] });
    send(store, bootstrap, newProperty({ propertyId: 'SEED', newPropertyId: 'SEED', name: 'TEST Seed' }));
    const ops = store.createUser({ username: 'test-ops', password: password(), role: 'operations', propertyIds: ['SEED'] });
    const finance = store.createUser({ username: 'test-fin', password: password(), role: 'finance', propertyIds: ['SEED'] });
    const viewer = store.createUser({ username: 'test-view', password: password(), role: 'viewer', propertyIds: ['SEED'] });
    for (const actor of [ops, finance, viewer]) {
      assert.throws(() => send(store, actor, newProperty({ propertyId: 'NEW-KL', newPropertyId: 'NEW-KL' })), forbidden,
        `${actor.username} must not create a property`);
    }
    assert.equal(store.read(root).properties.length, 0, 'a refused create writes no property for anyone');
    assert.equal(store.read(bootstrap).properties.length, 1, 'the one property that was really created is the only one');
    assert.equal(store.read(root).noPropertyYet, true, 'the owner still has no property of their own');
  } finally { store.close(); }
});

test('a new property starts completely empty and the creator holds it at once', () => {
  const { store, root } = install();
  try {
    const result = send(store, root, newProperty({ name: 'CO-HUB Hostel' }));
    assert.equal(result.propertyId, 'NEW-KL');
    const state = store.read(root);
    assert.equal(state.properties.length, 1);
    assert.equal(state.properties[0].id, 'NEW-KL');
    assert.equal(state.properties[0].name, 'CO-HUB Hostel');
    assert.deepEqual(state.roomTypes, [], 'no room type is assumed');
    assert.deepEqual(state.physicalRooms, [], 'no physical room is assumed');
    assert.deepEqual(state.resources, [], 'no bed or sales unit is assumed');
    assert.deepEqual(state.orders, [], 'no booking is assumed');
    assert.deepEqual(state.blocks, []);
    assert.equal(state.revisions['NEW-KL'], 0, 'a new property starts at revision zero');
    assert.equal(store.read(root).properties[0].name, 'CO-HUB Hostel', 'the creator can read it immediately');
    assert.equal(store.propertyRole(root, 'NEW-KL'), 'admin', 'the creator administers the property it just made');
  } finally { store.close(); }
});

test('creating a property is audited as an empty starter, without inventing inventory', () => {
  const { store, root } = install();
  try {
    send(store, root, newProperty());
    const entry = store.read(root).audit.find(a => a.type === 'property_create');
    assert(entry, 'the creation is in the append-only audit');
    assert.equal(entry.propertyId, 'NEW-KL');
    assert.equal(entry.actor, 'test-root');
    assert.equal(entry.name, 'TEST New Property');
    assert.equal(entry.starterInventory, 'empty', 'the audit says the property started with nothing');
  } finally { store.close(); }
});

test('a property name and code are validated, and a taken code is refused', () => {
  const { store, root } = install();
  try {
    for (const bad of ['', '   ', 'x'.repeat(81)]) {
      assert.throws(() => send(store, root, newProperty({ name: bad })), e => e.status === 400 && e.message === 'property_input',
        `reject name ${JSON.stringify(bad).slice(0, 12)}`);
    }
    for (const code of ['', 'a', 'x'.repeat(41), 'has space', 'bad/../code', '中文代码']) {
      assert.throws(() => send(store, root, newProperty({ newPropertyId: code, propertyId: code })), e => e.status === 400 && e.message === 'property_input',
        `reject code ${JSON.stringify(code)}`);
    }
    assert.deepEqual(store.read(root).properties, [], 'no rejected attempt leaves a property behind');
    send(store, root, newProperty());
    assert.throws(() => send(store, root, newProperty({ name: 'Second try' })), e => e.status === 409 && e.message === 'property_exists');
    assert.equal(store.read(root).properties.length, 1);
    assert.equal(store.read(root).properties[0].name, 'TEST New Property', 'the existing property is not overwritten');
  } finally { store.close(); }
});

test('creating a property is idempotent by request key', () => {
  const { store, root } = install();
  try {
    const key = randomUUID();
    const first = send(store, root, newProperty(), 0, key);
    assert.equal(first.replayed, undefined);
    const replay = send(store, root, newProperty(), 0, key);
    assert.equal(replay.replayed, true);
    assert.equal(store.read(root).properties.length, 1, 'a replayed request never creates a second property');
    assert.throws(() => send(store, root, newProperty({ name: 'Different' }), 0, key),
      e => e.status === 409 && e.message === 'idempotency_mismatch');
  } finally { store.close(); }
});

test('a new property survives closing and reopening, still empty', (t) => {
  const { store, root, dir } = install(t);
  send(store, root, newProperty());
  store.close();
  const reader = new Store(join(dir, 'test.sqlite'));
  try {
    const state = reader.read(root);
    assert.equal(state.properties[0].id, 'NEW-KL');
    assert.deepEqual(state.resources, [], 'the empty layout is persisted as empty, not re-seeded');
    assert.deepEqual(state.roomTypes, []);
    assert.deepEqual(state.orders, []);
  } finally { reader.close(); }
});

test('existing properties are never altered by creating a new one', () => {
  const store = new Store(':memory:');
  try {
    store.seedTestProperties();
    const admin = store.createUser({ username: 'test-admin', password: password(), role: 'admin', propertyIds: ['TEST-KL', 'TEST-PG'] });
    const before = store.read(admin);
    const beforeRevision = before.revisions['TEST-KL'];
    send(store, admin, newProperty({ propertyId: 'EXTRA', newPropertyId: 'EXTRA', name: 'TEST Extra' }));
    const after = store.read(admin);
    assert.equal(after.properties.length, before.properties.length + 1);
    assert.equal(after.revisions['TEST-KL'], beforeRevision, 'the existing property revision is untouched');
    assert.equal(after.resources.filter(r => r.propertyId === 'TEST-KL').length, before.resources.filter(r => r.propertyId === 'TEST-KL').length,
      'an existing layout is left exactly as it was');
    assert.deepEqual(after.resources.filter(r => r.propertyId === 'EXTRA'), [], 'and the new property is still empty');
  } finally { store.close(); }
});

test('the desk can fill a new empty property with its own room types and beds', () => {
  const { store, root } = install();
  try {
    send(store, root, newProperty());
    // The back office names a new room type by its three names, not by an id: the
    // backend mints the id and answers with it, and the desk uses that answer to
    // attach rooms. Reading the id back is what the browser does too.
    const rev = () => store.read(root).revisions['NEW-KL'];
    const mine = () => store.read(root).roomTypes.filter(r => r.propertyId === 'NEW-KL');
    const saveType = (names, productId, maxGuests, sortOrder) =>
      send(store, root, { type: 'room_type_save', propertyId: 'NEW-KL', productId, gender: 'any',
        maxGuests, sortOrder, names }, rev());
    saveType({ zh: '大床房', en: 'Queen room', ms: 'Bilik queen' }, 'room', 2, 1);
    saveType({ zh: '混住床位', en: 'Mixed bed', ms: 'Katil campur' }, 'bed', 1, 2);
    const privateType = mine().find(t => t.names.zh === '大床房');
    const mixedType = mine().find(t => t.names.zh === '混住床位');
    assert.ok(privateType && mixedType, 'both room types were saved');
    assert.ok(privateType.id && mixedType.id, 'each saved room type has an id the desk can use');
    assert.equal(new Set([privateType.id, mixedType.id]).size, 2, 'two room types never share an id');
    send(store, root, { type: 'physical_room_save', propertyId: 'NEW-KL', id: 'NEW-KL-A101', label: 'A-101',
      floor: '1', roomTypeId: privateType.id, kind: 'room' }, rev());
    send(store, root, { type: 'physical_room_save', propertyId: 'NEW-KL', id: 'NEW-KL-D1', label: 'Dorm 1',
      floor: '2', roomTypeId: mixedType.id, kind: 'dorm', bedLabels: ['B1', 'B2', 'B3'] }, rev());
    const state = store.read(root);
    assert.equal(state.roomTypes.filter(r => r.propertyId === 'NEW-KL').length, 2);
    assert.deepEqual(state.physicalRooms.filter(r => r.propertyId === 'NEW-KL').map(r => r.label).sort(), ['A-101', 'Dorm 1']);
    const units = state.resources.filter(r => r.propertyId === 'NEW-KL');
    assert.equal(units.length, 4, 'one room plus three beds, exactly what was entered and nothing more');
    assert.equal(units.filter(u => u.productId === 'bed').length, 3);
    assert.equal(units.filter(u => u.productId === 'room').length, 1);
    assert.deepEqual(units.map(u => u.label).sort(), ['A-101', 'Dorm 1 · B1', 'Dorm 1 · B2', 'Dorm 1 · B3'],
      'the bed labels are exactly the ones typed in, with nothing added');
    assert.equal(units.every(u => u.cleaning === 'dirty'), true, 'new units still need cleaning before check-in');
  } finally { store.close(); }
});

test('a property created empty reports no honest inventory rather than a zero-room layout', () => {
  const { store, root } = install();
  try {
    send(store, root, newProperty());
    const state = store.read(root);
    const mine = state.resources.filter(r => r.propertyId === 'NEW-KL');
    assert.equal(mine.length, 0);
    // With nothing configured there is nothing to sell, and the calendar must say so
    // instead of presenting a property that sells zero rooms as a valid layout.
    assert.equal(state.roomTypes.filter(r => r.propertyId === 'NEW-KL').length, 0);
  } finally { store.close(); }
});
