import test from 'node:test';
import assert from 'node:assert/strict';
import { planInventory, InventoryConflict } from '../src/inventory.js';
const bed = (id, roomId = 'dorm', gender = 'any') => ({ id, roomId, gender, propertyId: 'TEST', productId: 'bed', atoms: [id] });
const demand = (id, extra = {}) => ({ id, propertyId: 'TEST', productId: 'bed', start: '2027-01-10', end: '2027-01-12', ...extra });
const plan = (resources, demands, blocks = []) => planInventory({ propertyId: 'TEST', resources, demands, blocks });
test('unassigned demands consume capacity', () => {
  assert.equal(plan([bed('a')], [demand('1')]).length, 1);
  assert.throws(() => plan([bed('a')], [demand('1'), demand('2')]), InventoryConflict);
});
test('checkout date is exclusive', () => {
  assert.equal(plan([bed('a')], [demand('1'), demand('2', { start: '2027-01-12', end: '2027-01-13' })]).length, 2);
});
test('whole dorm conflicts with its beds', () => {
  const whole = { id: 'whole', roomId: 'dorm', propertyId: 'TEST', productId: 'whole', atoms: ['a', 'b'] };
  assert.throws(() => plan([bed('a'), bed('b'), whole], [demand('1'), demand('2', { productId: 'whole' })]), InventoryConflict);
});
test('daily spare capacity does not guarantee a continuous bed', () => {
  const blocks = [{ propertyId: 'TEST', atoms: ['a'], start: '2027-01-10', end: '2027-01-11' },
    { propertyId: 'TEST', atoms: ['b'], start: '2027-01-11', end: '2027-01-12' }];
  assert.throws(() => plan([bed('a'), bed('b')], [demand('1')], blocks), InventoryConflict);
});
test('hard same-room group cannot be silently split', () => {
  const ds = [demand('1', { sameRoomGroup: 'g' }), demand('2', { sameRoomGroup: 'g' })];
  assert.throws(() => plan([bed('a', 'x'), bed('b', 'y')], ds), InventoryConflict);
  assert.equal(plan([bed('a'), bed('b')], ds).length, 2);
});
test('gender and fixed allocations constrain planning', () => {
  assert.throws(() => plan([bed('a', 'dorm', 'female')], [demand('1', { gender: 'male' })]), InventoryConflict);
  assert.throws(() => plan([bed('a'), bed('b')], [demand('1', { fixedResourceId: 'a' }), demand('2', { fixedResourceId: 'a' })]), InventoryConflict);
});
test('cross-store input, invalid dates and duplicate demands rejected', () => {
  assert.throws(() => plan([{ ...bed('a'), propertyId: 'OTHER' }], []), InventoryConflict);
  assert.throws(() => plan([bed('a')], [demand('1', { start: '2027-02-30' })]), InventoryConflict);
  assert.throws(() => plan([bed('a')], [demand('1'), demand('1')]), InventoryConflict);
});
test('flexible demand leaves the only eligible bed for constrained demand', () => {
  const result = plan([bed('a'), bed('b', 'dorm', 'female')], [demand('1', { gender: 'female' }), demand('2', { gender: 'male' })]);
  assert.equal(result.find(x => x.demandId === '2').resourceId, 'a');
});
