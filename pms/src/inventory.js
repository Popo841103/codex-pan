// Pure test-environment planner. Production writes require database transactions.
export class InventoryConflict extends Error {}
const fail = message => { throw new InventoryConflict(message); };
const overlaps = (a, b) => {
  if (!(a.start < b.end && b.start < a.end)) return false;
  // Only explicitly timed hourly bookings may share a local day. Legacy stays,
  // overnight accommodation and operational blocks keep the full-day boundary.
  if (a.hourly?.inventoryPolicy==='hour_slots' && b.hourly?.inventoryPolicy==='hour_slots')
    return a.hourly.startTime < b.hourly.endTime && b.hourly.startTime < a.hourly.endTime;
  return true;
};
const shares = (a, b) => a.atoms.some(atom => b.atoms.includes(atom));
function validateInterval(item) {
  for (const value of [item.start, item.end]) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) fail('Invalid business date');
    const time = Date.parse(`${value}T00:00:00Z`);
    if (!Number.isFinite(time) || new Date(time).toISOString().slice(0, 10) !== value) fail('Invalid business date');
  }
  if(item.hourly?.inventoryPolicy==='hour_slots'){
    const h=item.hourly;
    if(!/^([01]\d|2[0-3]):00$/.test(h.startTime)||!/^([01]\d|2[0-3]|24):00$/.test(h.endTime)||h.startTime>=h.endTime||h.usageDate!==item.start||Date.parse(item.end)-Date.parse(item.start)!==86400000)fail('Invalid hourly interval');
  }
  if (item.start >= item.end) fail('Stay must contain at least one night');
}
// Each demand is a single room or bed for a continuous stay. Shared physical atoms
// make whole-dorm and individual-bed products mutually exclusive.
export function planInventory({ propertyId, resources, demands, blocks = [] }) {
  if (!propertyId) fail('Property required');
  const ids = new Set();
  for (const r of resources) {
    if (!r.id || ids.has(r.id)) fail('Duplicate or missing resource');
    ids.add(r.id);
    if (r.propertyId !== propertyId || (!r.roomId && r.productId !== 'suite') || !r.productId || !Array.isArray(r.atoms) ||
        !r.atoms.length || new Set(r.atoms).size !== r.atoms.length) fail('Invalid resource scope');
  }
  const demandIds = new Set();
  for (const d of demands) {
    validateInterval(d);
    if (!d.id || demandIds.has(d.id) || d.propertyId !== propertyId || !d.productId) fail('Invalid demand scope');
    demandIds.add(d.id);
  }
  for (const b of blocks) {
    validateInterval(b);
    if (b.propertyId !== propertyId || !Array.isArray(b.atoms) || !b.atoms.length ||
        b.atoms.some(atom => !resources.some(r => r.atoms.includes(atom)))) fail('Invalid block scope');
  }
  const candidates = new Map(demands.map(d => [d.id, resources.filter(r =>
    !r.archived && r.productId === d.productId && (!d.roomTypeId || r.roomTypeId === d.roomTypeId) && (!d.fixedResourceId || r.id === d.fixedResourceId) &&
    (!r.gender || r.gender === 'any' || r.gender === d.gender) &&
    !blocks.some(b => overlaps(d, b) && shares(r, b))
  ).sort((a, b) => a.id.localeCompare(b.id))]));
  const pending = [...demands].sort((a, b) => candidates.get(a.id).length - candidates.get(b.id).length || a.id.localeCompare(b.id));
  const chosen = [];
  let attempts = 0;
  function search(index) {
    if (index === pending.length) return true;
    if (++attempts > 100000) fail('Planning limit reached; manual review required');
    const demand = pending[index];
    for (const resource of candidates.get(demand.id)) {
      if (chosen.some(x => (overlaps(demand, x.demand) && shares(resource, x.resource)) ||
          (demand.sameRoomGroup && demand.sameRoomGroup === x.demand.sameRoomGroup && (!resource.roomId || resource.roomId !== x.resource.roomId)))) continue;
      chosen.push({ demand, resource });
      if (search(index + 1)) return true;
      chosen.pop();
    }
    return false;
  }
  if (!search(0)) fail('No continuous allocation satisfies inventory constraints');
  return chosen.map(({ demand, resource }) => ({ demandId: demand.id, resourceId: resource.id,
    roomId: resource.roomId, atoms: [...resource.atoms], start: demand.start, end: demand.end, ...(demand.hourly?{hourly:demand.hourly}:{}) }));
}
