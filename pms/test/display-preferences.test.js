import test from 'node:test';
import assert from 'node:assert/strict';
import { apply, seed, preview } from '../src/demo-store.js';
import { Store } from '../server/store.js';
const propertyId='TEST-KL';
const write=(state,preferences)=>apply(state,{type:'display_preferences_save',propertyId,preferences,id:'test-settings',at:'2027-01-01T00:00:00Z'});
test('scoped display settings merge without changing the inventory plan',()=>{
  const state=seed();
  const roomId=state.physicalRooms.find(room=>room.propertyId===propertyId).id;
  const groups=[{id:'g1',name:'Synthetic',roomIds:[roomId]}];
  const next=write(state,{groups,groupOrder:['g1'],roomOrder:[roomId]});
  const saved=write(next,{payments:[{id:'cash',enabled:false}],channels:[{id:'direct',enabled:true}],advanceCard:{enabled:true,minutes:1440}});
  const preferences=saved.properties.find(p=>p.id===propertyId).displayPreferences;
  assert.deepEqual(preferences.groups,groups);
  assert.deepEqual(preferences.advanceCard,{enabled:true,minutes:1440});
  assert.deepEqual(preview(saved,propertyId),preview(state,propertyId));
  assert.deepEqual(saved.properties.filter(p=>p.id!==propertyId),state.properties.filter(p=>p.id!==propertyId));
  assert.deepEqual(write(saved,{advanceCard:{enabled:false,minutes:99}}).properties.find(p=>p.id===propertyId).displayPreferences.advanceCard,{enabled:false,minutes:0});
});
test('invalid group memberships, order IDs and settings are rejected atomically',()=>{
  const state=seed();
  const local=state.physicalRooms.find(r=>r.propertyId===propertyId).id;
  for(const bad of [
    {groups:[{id:'g',name:'Group',roomIds:['another-property-room']}]},
    {groups:[{id:'g',name:'Group',roomIds:[local]},{id:'g2',name:'Other',roomIds:[local]}]},
    {roomOrder:[local,local]}, {groupOrder:['missing']},
    {payments:[{id:'new-provider',enabled:true}]}, {channels:[{id:'direct',enabled:1}]},
    {advanceCard:{enabled:true,minutes:1441}}, {advanceCard:{enabled:true,minutes:1.5}},
    {unexpected:true}
  ]) assert.throws(()=>write(state,bad),/input/);
  assert.equal(state.properties.find(p=>p.id===propertyId).displayPreferences,undefined);
});
test('only authorized property roles can write display preferences',()=>{
  const store=new Store(':memory:');
  try {
    store.seedTestProperties();
    const admin=store.createUser({username:'test-settings-admin',password:'synthetic-pass-123',role:'admin',propertyIds:[propertyId]});
    const operator=store.createUser({username:'test-settings-ops',password:'synthetic-pass-456',role:'operations',propertyIds:[propertyId]});
    const command={type:'display_preferences_save',propertyId,preferences:{advanceCard:{enabled:true,minutes:30}}};
    assert.throws(()=>store.command(operator,{key:'test-settings-denied',expectedRevision:0,command}),{status:403});
    store.command(admin,{key:'test-settings-saved',expectedRevision:0,command});
    const state=store.read(admin);
    assert.deepEqual(state.properties[0].displayPreferences.advanceCard,{enabled:true,minutes:30});
    assert.equal(state.revisions[propertyId],1);
    assert.equal(state.audit[0].type,'display_preferences_save');
  } finally {store.close();}
});
