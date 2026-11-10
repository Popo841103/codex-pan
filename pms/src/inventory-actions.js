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

/** Snapshot the affected inventory without altering previous audit records. */
export function roomStatusRows(before,after,command){
  const {type,propertyId}=command;
  const kinds=['block','unblock','bulk_block','bulk_unblock','clean','bulk_clean'];
  if(!kinds.includes(type))return [];
  const scoped=after.resources.filter(r=>r.propertyId===propertyId);
  const single=scoped.filter(r=>r.id===command.resourceId);
  const selected=Array.isArray(command.resourceIds)?scoped.filter(r=>command.resourceIds.includes(r.id)):single;
  const hits=(resources,block)=>resources.filter(r=>r.atoms.some(atom=>block.atoms.includes(atom)));
  const row=(r,action,start=null,end=null,note='')=>{
    const room=after.physicalRooms.find(x=>x.id===r.roomId&&x.propertyId===propertyId);
    const roomType=after.roomTypes.find(x=>x.id===r.roomTypeId&&x.propertyId===propertyId);
    return {resourceId:r.id,roomLabel:room?.label||r.label,roomTypeId:r.roomTypeId,roomTypeNames:roomType?.names||{},action,start,end,note};
  };
  if(type==='clean'||type==='bulk_clean')return selected.map(r=>row(r,type==='clean'?'clean':command.cleaning));
  if(type==='block'||type==='bulk_block'){
    const block=after.blocks.find(b=>b.id===command.id&&b.propertyId===propertyId);
    return block?hits(selected,block).map(r=>row(r,blockType(block)==='out_of_service'?'out_of_service':'blocked',block.start,block.end,block.reason||'')):[];
  }
  if(type==='unblock'){
    const block=before.blocks.find(b=>b.id===command.blockId&&b.propertyId===propertyId);
    return block?hits(scoped,block).map(r=>row(r,'open',block.start,block.end,block.reason||'')):[];
  }
  return before.blocks.filter(b=>b.propertyId===propertyId&&(!command.blockIds||command.blockIds.includes(b.id))&&b.start<command.end&&b.end>command.start)
    .flatMap(b=>hits(selected,b).map(r=>row(r,'open',b.start>command.start?b.start:command.start,b.end<command.end?b.end:command.end,b.reason||'')));
}
