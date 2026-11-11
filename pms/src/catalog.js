// Additive upgrade of existing test data. Never reseed or change physical atom IDs.
export class CatalogError extends Error {}
const fail = code => { throw new CatalogError(code); };
const label = (value, max = 100) => {
  if (typeof value !== 'string' || !value.trim() || value.length > max) fail('catalog_input');
  return value.trim();
};
const integer = (value, max) => {
  if (!Number.isSafeInteger(value) || value < 0 || value > max) fail('catalog_input');
  return value;
};
export const overlapsAtoms = (a, b) => a.atoms.some(atom => b.atoms.includes(atom));
export function upgradeCatalog(state) {
  const next = structuredClone(state);
  next.roomTypes ??= [];
  next.ratePlans ??= []; next.rateCells ??= []; next.rateChanges ??= [];
  next.physicalRooms ??= [];
  next.reservations ??= [];
  for (const resource of next.resources) {
    resource.archived ??= false;
    resource.sortOrder ??= 0;
    resource.roomTypeId ??= `${resource.propertyId}-legacy-${resource.productId}-${resource.gender || 'any'}`;
    if (!next.roomTypes.some(type => type.id === resource.roomTypeId && type.propertyId === resource.propertyId)) {
      next.roomTypes.push({ id: resource.roomTypeId, propertyId: resource.propertyId,
        names: { zh: resource.roomTypeName || '', en: resource.roomTypeName || '', ms: resource.roomTypeName || '' },
        productId: resource.productId, gender: resource.gender || 'any', maxGuests: resource.productId === 'bed' ? 1 : 2,
        sortOrder: 0, legacy: true });
    }
    if (resource.productId !== 'suite' && !next.physicalRooms.some(room => room.id === resource.roomId && room.propertyId === resource.propertyId)) {
      const siblings = next.resources.filter(r => r.roomId === resource.roomId && r.propertyId === resource.propertyId && r.productId !== 'suite');
      next.physicalRooms.push({ id: resource.roomId, propertyId: resource.propertyId,
        label: resource.productId === 'bed' ? resource.roomId : resource.label,
        kind: resource.productId === 'bed' ? 'dorm' : 'room', floor: '',
        atoms: [...new Set(siblings.flatMap(r => r.atoms))] });
    }
  }
  return next;
}
export function typeName(type, language, fallback) {
  return type?.names?.[language] || type?.names?.en || type?.names?.zh || type?.names?.ms || fallback;
}
// A retired child unit cannot be sold again through a composed suite.
export function saleResources(state, propertyId) {
  return state.resources.filter(r => r.propertyId === propertyId && !r.archived &&
    (r.productId !== 'suite' || !state.resources.some(child => child.propertyId === propertyId &&
      child.productId !== 'suite' && child.archived && overlapsAtoms(r, child))));
}
export function isClean(state, resource) {
  return resource.cleaning === 'clean' && !state.resources.some(child => child.propertyId === resource.propertyId &&
    child.productId !== 'suite' && overlapsAtoms(resource, child) && child.cleaning !== 'clean');
}
export function setCleaning(state, resource, cleaning) {
  // Dirty a suite's components as well. Cleaning a single child does not certify the whole suite.
  for (const child of state.resources.filter(r => r.propertyId === resource.propertyId && overlapsAtoms(r, resource))) {
    if (cleaning === 'dirty' || child.id === resource.id || resource.productId === 'suite' && child.productId !== 'suite') child.cleaning = cleaning;
  }
}
export function configureCatalog(state, command) {
  const { type, propertyId } = command;
  const localType = id => state.roomTypes.find(t => t.id === id && t.propertyId === propertyId);
  const localResource = id => state.resources.find(r => r.id === id && r.propertyId === propertyId);
  const localRoom = id => state.physicalRooms.find(r => r.id === id && r.propertyId === propertyId);
  const active = state.orders.filter(o => o.propertyId === propertyId && !['cancelled', 'checked_out'].includes(o.status));
  const unique = (items, name, id) => {
    if (items.some(item => item.propertyId === propertyId && item.id !== id && item.label.toLocaleLowerCase() === name.toLocaleLowerCase())) fail('catalog_duplicate');
  };
  if (type === 'room_type_save') {
    const old = command.roomTypeId ? localType(command.roomTypeId) : null;
    if (command.roomTypeId && !old) fail('scope');
    const fallback = ['zh','en','ms'].map(l=>command.names?.[l]).find(v=>typeof v==='string'&&v.trim());
    const names = Object.fromEntries(['zh', 'en', 'ms'].map(language => [language, label((typeof command.names?.[language]==='string'?command.names[language].trim():command.names?.[language]) || fallback)]));
    if (!['room', 'bed', 'suite'].includes(command.productId) || !['any', 'female', 'male'].includes(command.gender)) fail('catalog_input');
    const maxGuests = integer(command.maxGuests, 100);
    if (!maxGuests || command.productId === 'bed' && maxGuests !== 1) fail('catalog_input');
    if (old && (old.productId !== command.productId || old.gender !== command.gender)) fail('catalog_immutable');
    if (state.roomTypes.some(t => t.propertyId === propertyId && t.id !== old?.id && ['zh', 'en', 'ms'].some(l => t.names[l]?.toLocaleLowerCase() === names[l].toLocaleLowerCase()))) fail('catalog_duplicate');
    const values = { names, maxGuests, sortOrder: integer(command.sortOrder ?? 0, 100000) };
    if (old) Object.assign(old, values, { legacy: false });
    else state.roomTypes.push({ id: command.id, propertyId, productId: command.productId, gender: command.gender, ...values });
    if(!old&&command.defaultRate!==undefined){
      const defaultAmount=integer(command.defaultRate,100000000);let n=1;while(state.ratePlans.some(p=>p.propertyId===propertyId&&p.code==='D'+n))n++;
      const code='D'+n;if(code.length>8)fail('catalog_input');
      state.ratePlans.push({propertyId,code,name:names.en+' · Default',roomTypeIds:[command.id],kind:'independent',defaultAmount,cancellationPolicy:{kind:'manual'}});
      state.roomTypes.find(t=>t.id===command.id).defaultRatePlanCode=code;
    }
  } else if (type === 'physical_room_save') {
    const old = command.physicalRoomId ? localRoom(command.physicalRoomId) : null;
    if (command.physicalRoomId && !old) fail('scope');
    const name = label(command.label, 60), floor = typeof command.floor === 'string' && command.floor.length <= 40 ? command.floor.trim() : fail('catalog_input');
    unique(state.physicalRooms, name, old?.id);
    if (old) {
      // Topology cannot be edited in place: it could rewrite existing occupancy/history.
      if (command.kind !== old.kind || command.bedLabels !== undefined || command.roomTypeId !== undefined) fail('catalog_immutable');
      old.label = name; old.floor = floor;
      return;
    }
    const roomType = localType(command.roomTypeId);
    if (!roomType || !['room', 'dorm'].includes(command.kind) || roomType.productId !== (command.kind === 'dorm' ? 'bed' : 'room')) fail('scope');
    let beds = null;
    if (command.kind === 'dorm') {
      if (!Array.isArray(command.bedLabels) || !command.bedLabels.length || command.bedLabels.length > 100) fail('catalog_input');
      beds = command.bedLabels.map(v => label(v, 40));
      if (new Set(beds.map(v => v.toLocaleLowerCase())).size !== beds.length) fail('catalog_duplicate');
    }
    const roomId = `${command.id}-space`, atoms = (beds || [name]).map((_, i) => `${command.id}-atom-${i + 1}`);
    state.physicalRooms.push({ id: roomId, propertyId, label: name, floor, kind: command.kind, atoms });
    for (const [i, unit] of (beds || [name]).entries()) {
      state.resources.push({ id: `${command.id}-unit-${i + 1}`, propertyId, roomId, roomTypeId: roomType.id,
        productId: roomType.productId, gender: roomType.gender, label: beds ? `${name} · ${unit}` : name,
        atoms: [atoms[i]], cleaning: 'dirty', archived: false, sortOrder: i });
    }
  } else if (type === 'suite_save') {
    const roomType = localType(command.roomTypeId);
    if (!roomType || roomType.productId !== 'suite') fail('scope');
    if (!Array.isArray(command.roomIds) || !command.roomIds.length || command.roomIds.length > 100 || new Set(command.roomIds).size !== command.roomIds.length) fail('catalog_input');
    const rooms = command.roomIds.map(localRoom);
    if (rooms.some(r => !r)) fail('scope');
    const atoms = [...new Set(rooms.flatMap(r => r.atoms))];
    const children = state.resources.filter(r => r.propertyId === propertyId && r.productId !== 'suite' && r.atoms.some(a => atoms.includes(a)));
    if (children.some(r => r.archived || r.gender !== 'any' && r.gender !== roomType.gender)) fail('catalog_composition');
    const name = label(command.label, 100);
    unique(state.resources, name);
    state.resources.push({ id: command.id, propertyId, roomId: null, componentRoomIds: rooms.map(r => r.id),
      roomTypeId: roomType.id, label: name, productId: 'suite', gender: roomType.gender,
      atoms, cleaning: 'dirty', archived: false, sortOrder: integer(command.sortOrder ?? 0, 100000) });
  } else if (type === 'resource_update') {
    const resource = localResource(command.resourceId);
    if (!resource) fail('scope');
    const name = label(command.label, 100);
    unique(state.resources, name, resource.id);
    const roomType = localType(command.roomTypeId);
    if (!roomType || roomType.productId !== resource.productId || roomType.gender !== resource.gender) fail('scope');
    if (roomType.id !== resource.roomTypeId && active.some(o => o.resourceId === resource.id)) fail('catalog_in_use');
    resource.label = name; resource.sortOrder = integer(command.sortOrder ?? 0, 100000); resource.roomTypeId = roomType.id;
  } else if (type === 'resource_archive') {
    const resource = localResource(command.resourceId);
    if (!resource) fail('scope');
    if (typeof command.archived !== 'boolean') fail('catalog_input');
    if (command.archived && active.some(o => {
      const assigned = localResource(o.resourceId);
      return assigned && (assigned.id === resource.id || assigned.productId === 'suite' && overlapsAtoms(assigned, resource));
    })) fail('catalog_in_use');
    resource.archived = command.archived;
  } else fail('catalog_input');
}
