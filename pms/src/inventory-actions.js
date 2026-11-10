// Operational holds and the order box are inventory rules, not payment events.
export const isBoxed = order => order.inventoryStatus === 'boxed';
export const inventoryState = order => ['cancelled','checked_out'].includes(order.status) ? 'released' : isBoxed(order) ? 'boxed' : 'reserved';
export const occupiesInventory = order => !isBoxed(order) && !['cancelled', 'checked_out'].includes(order.status);
export const blockType = block => block.blockType || 'maintenance'; // legacy blocks
export const excludesCapacity = block => blockType(block) !== 'hold';

export function operationalBlock(command) {
  const kind = command.blockType ?? 'maintenance';
  const reason = command.reason ?? '';
  if (!['maintenance', 'out_of_service', 'hold'].includes(kind) || typeof reason !== 'string' || reason.length > 200) throw new Error('block_input');
  return {blockType:kind, reason:reason.trim(), createdAt:command.at, createdBy:command.actor || 'local'};
}

export function changeOrderBox(state, command, preview) {
  const ids = command.orderIds;
  if (!Array.isArray(ids) || !ids.length || ids.length > 30 || new Set(ids).size !== ids.length) throw new Error('input');
  const orders = ids.map(id => state.orders.find(o => o.id === id && o.propertyId === command.propertyId));
  if (orders.some(o => !o)) throw new Error('scope');
  if (orders.some(o => o.status !== 'confirmed' || o.locked)) throw new Error('box_state');
  const boxing = command.type === 'box_stays';
  if(boxing&&orders.some(o=>o.folioClosed||o.splitBills||o.arMoves?.length||o.folioTransfers?.length))throw new Error('box_state');
  if (orders.some(o => isBoxed(o) === boxing)) throw new Error('box_state');
  const reason = command.reason;
  if (typeof reason !== 'string' || !reason.trim() || reason.length > 200 || !boxing && typeof command.autoAssign !== 'boolean') throw new Error('box_input');
  for (const order of orders) {
    order.inventoryHistory ??= [];
    order.inventoryHistory.push({action:boxing ? 'boxed' : 'restored', fromResourceId:order.resourceId,
      at:command.at, actor:command.actor || 'local', reason:reason.trim()});
    order.inventoryStatus = boxing ? 'boxed' : 'reserved';
    // Restoring reserves the room type again. It does not silently promise the old room.
    order.resourceId = null;
  }
  const plan = preview(state, command.propertyId); // entire batch must be feasible
  if (!boxing && command.autoAssign) for (const order of orders) {
    order.resourceId = plan.find(p => p.demandId === order.id).resourceId;
  }
  for (const order of orders) order.inventoryHistory.at(-1).toResourceId = order.resourceId;
}
