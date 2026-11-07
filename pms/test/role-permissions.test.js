// A property can define its own roles, the way the reference product's Account Role page
// works: name a role, tick the modules and actions it carries, then hand it to an account.
// The built-in four roles stay exactly as they were, so nothing an existing account may do
// changes; a custom role is only ever the list of actions that was ticked for it.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {Store, actionModules, allActions} from '../server/store.js';

const open=()=>{const store=new Store(':memory:');store.seedTestProperties();return store;};
const adminUser=store=>store.createUser({username:'admin-one',password:'x'.repeat(14),role:'admin',propertyIds:['TEST-KL','TEST-PG']});
const revision=(store,propertyId)=>store.db.prepare('SELECT revision FROM properties WHERE id=?').get(propertyId).revision;
const send=(store,user,command,propertyId='TEST-KL',key=randomUUID())=>
  store.command({id:user.id},{key,expectedRevision:revision(store,propertyId),command:{propertyId,...command}});
const attempt=(store,user,command,propertyId='TEST-KL')=>{
  try{ send(store,user,command,propertyId); return null; }
  catch(e){ return e.status??e.message; }
};
const login=store=>store.read({id:store.db.prepare("SELECT id FROM users WHERE username='admin-one'").get().id});

test('every grantable action sits in exactly one module, and the module list covers them all',()=>{
  const seen=[];
  for(const [module,actions] of Object.entries(actionModules)){
    assert.ok(actions.length>0,`${module} must list at least one action`);
    for(const action of actions){
      assert.ok(allActions.includes(action),`${action} is offered by the role page but is not a known action`);
      seen.push(action);
    }
  }
  assert.equal(new Set(seen).size,seen.length,'an action may not appear in two modules');
  assert.deepEqual([...seen].sort(),[...allActions].sort(),
    'the settings matrix must offer every action the server enforces, so nobody can hold an action the page never shows');
});

test('a property-defined role carries exactly the actions ticked for it',()=>{
  const store=open(),admin=adminUser(store);
  try{
    const created=send(store,admin,{type:'role_save',name:'Night desk',actions:['checkin','checkout','payment']});
    assert.equal(created.created,true);
    assert.match(created.id,/^role-/);
    const listed=login(store).roles.find(r=>r.id===created.id);
    assert.equal(listed.name,'Night desk');
    assert.deepEqual(listed.actions,['checkin','checkout','payment'],
      'a custom role implies nothing: no subsystem defaults are added behind the administrator');
    // The action has to be real, and the name has to be usable.
    assert.equal(attempt(store,admin,{type:'role_save',name:'Broken',actions:['not_an_action']}),400);
    assert.equal(attempt(store,admin,{type:'role_save',name:'',actions:[]}),400);
    assert.equal(attempt(store,admin,{type:'role_save',name:'Night desk',actions:['clean']}),409,'the name is taken in this property');
    assert.equal(attempt(store,admin,{type:'role_save',name:'Duplicated',actions:['clean','clean']}),400);
  } finally{ store.close(); }
});

test('a member holding a custom role may do the ticked actions and nothing else',()=>{
  const store=open(),admin=adminUser(store);
  try{
    const role=send(store,admin,{type:'role_save',name:'Notice editor',actions:['notice_severity_save']});
    send(store,admin,{type:'member_save',username:'desk-one',password:'y'.repeat(14),role:'viewer',propertyIds:['TEST-KL']});
    send(store,admin,{type:'member_save',username:'desk-one',propertyRoles:{'TEST-KL':role.id}});
    const desk=store.db.prepare("SELECT * FROM users WHERE username='desk-one'").get();
    assert.deepEqual(store.permissionsFor(desk,'TEST-KL'),['notice_severity_save']);
    assert.deepEqual(store.permissionsFor(desk,'TEST-PG'),[],'the role belongs to one property only');
    // Ticked: the setting can be saved. Not ticked: the operation is refused.
    assert.equal(attempt(store,desk,{type:'notice_severity_save',levels:{}}),null);
    assert.equal(attempt(store,desk,{type:'create',start:'2026-12-01',end:'2026-12-03'}),403);
    assert.equal(attempt(store,desk,{type:'member_save',username:'desk-one',propertyRoles:{'TEST-KL':null}}),403,
      'handing out roles needs member_save, which this role does not carry');
    // The account row itself stays with account administrators.
    const keeper=send(store,admin,{type:'role_save',name:'Team lead',actions:['member_save']});
    send(store,admin,{type:'member_save',username:'desk-one',propertyRoles:{'TEST-KL':keeper.id}});
    send(store,admin,{type:'member_save',username:'desk-two',password:'y'.repeat(14),role:'viewer',propertyIds:['TEST-KL']});
    assert.equal(attempt(store,desk,{type:'member_save',username:'desk-two',role:'admin'}),403,
      'a property role can reassign roles here but never rewrite the shared account');
    assert.equal(attempt(store,desk,{type:'member_save',username:'desk-two',propertyRoles:{'TEST-KL':null}}),null,
      'what it can do is hand out roles inside this property');
  } finally{ store.close(); }
});

test('a role in use cannot be deleted, and deleting it is audited',()=>{
  const store=open(),admin=adminUser(store);
  try{
    const role=send(store,admin,{type:'role_save',name:'Weekend',actions:['clean']});
    send(store,admin,{type:'member_save',username:'cleaner',password:'y'.repeat(14),role:'viewer',propertyIds:['TEST-KL']});
    send(store,admin,{type:'member_save',username:'cleaner',propertyRoles:{'TEST-KL':role.id}});
    assert.equal(attempt(store,admin,{type:'role_delete',roleId:role.id}),409,'somebody still holds it');
    send(store,admin,{type:'member_save',username:'cleaner',propertyRoles:{'TEST-KL':null}});
    assert.equal(send(store,admin,{type:'role_delete',roleId:role.id}).deleted,true);
    assert.equal(login(store).roles.some(r=>r.id===role.id),false);
    const audit=store.db.prepare("SELECT action,summary FROM member_audit WHERE action IN ('role_save','role_delete') ORDER BY rowid").all();
    assert.deepEqual(audit.map(a=>a.action),['role_save','role_delete']);
    assert.equal(JSON.parse(audit[0].summary).propertyIds[0],'TEST-KL','an access change is readable from the property it touched');
    assert.deepEqual(JSON.parse(audit[1].summary).actions,['clean']);
  } finally{ store.close(); }
});

test('extra permissions ride on top of a role, but never above the giver own access',()=>{
  const store=open(),admin=adminUser(store);
  try{
    send(store,admin,{type:'member_save',username:'fin-one',password:'y'.repeat(14),role:'finance',propertyIds:['TEST-KL']});
    const fin=store.db.prepare("SELECT * FROM users WHERE username='fin-one'").get();
    assert.deepEqual(store.permissionsFor(fin,'TEST-KL').sort(),['commission_save','payment','settle','settle_bill','settle_split','settle_undo','settle_unsplit','support_create','support_reply','support_status'],
      'finance keeps the ticket desk it always had');
    const granted=send(store,admin,{type:'member_permission_save',username:'fin-one',actions:['settle','commission_save','rate_plan_save']});
    assert.deepEqual(granted.actions,['commission_save','rate_plan_save','settle']);
    // The extra grant is listed with the member, so the page edits what is stored.
    const listed=store.read({id:admin.id}).members.find(m=>m.username==='fin-one');
    assert.deepEqual((listed.extraPermissions['TEST-KL']||[]).sort(),['commission_save','rate_plan_save','settle']);
    assert.deepEqual(store.permissionsFor(fin,'TEST-KL').sort(),['commission_save','payment','rate_plan_save','settle','settle_bill','settle_split','settle_undo','settle_unsplit','support_create','support_reply','support_status'],
      'the extra grant adds to the role instead of replacing it');
    // An operator holding member_permission_save can only pass on actions it holds itself.
    const lead=send(store,admin,{type:'role_save',name:'Access lead',actions:['member_permission_save','payment']});
    send(store,admin,{type:'member_save',username:'lead-one',password:'y'.repeat(14),role:'viewer',propertyIds:['TEST-KL']});
    send(store,admin,{type:'member_save',username:'lead-one',propertyRoles:{'TEST-KL':lead.id}});
    const leadUser=store.db.prepare("SELECT * FROM users WHERE username='lead-one'").get();
    assert.equal(attempt(store,leadUser,{type:'member_permission_save',username:'fin-one',actions:['settle']}),403,
      'it may not hand out an action it does not hold');
    assert.equal(attempt(store,leadUser,{type:'member_permission_save',username:'fin-one',actions:['payment']}),null);
    assert.equal(attempt(store,leadUser,{type:'member_permission_save',username:'nobody',actions:[]}),404);
    assert.deepEqual(store.permissionsFor(fin,'TEST-KL').sort(),['commission_save','payment','settle','settle_bill','settle_split','settle_undo','settle_unsplit','support_create','support_reply','support_status'],
      'the grant replaces the previous one, so the earlier rate_plan_save is gone and the role is untouched');
  } finally{ store.close(); }
});

test('the built-in roles keep the access they always had',()=>{
  const store=open(),admin=adminUser(store);
  try{
    assert.ok(store.actionsFor('admin').includes('role_save'));
    assert.deepEqual(store.actionsFor('viewer').sort(),['support_create','support_reply','support_status'],
      'a viewer never settles money, but the ticket desk stays open to everybody');
    assert.deepEqual(store.actionsFor('finance').sort(),['commission_save','payment','settle','settle_bill','settle_split','settle_undo','settle_unsplit','support_create','support_reply','support_status']);
    assert.equal(store.actionsFor('operations').includes('role_save'),false);
    // An operations account still cannot reach access management, and a viewer still
    // cannot settle, exactly as before roles could be defined per property.
    send(store,admin,{type:'member_save',username:'ops-one',password:'y'.repeat(14),role:'operations',propertyIds:['TEST-KL']});
    const ops=store.db.prepare("SELECT * FROM users WHERE username='ops-one'").get();
    assert.equal(attempt(store,ops,{type:'role_save',name:'Sneaky',actions:['settle']}),403);
    assert.equal(attempt(store,ops,{type:'member_save',username:'ops-one',role:'admin'}),403);
  } finally{ store.close(); }
});
