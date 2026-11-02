import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {Store} from '../server/store.js';

const open=()=>{const store=new Store(':memory:');store.seedTestProperties();return store;};
const adminUser=store=>store.createUser({username:'admin-one',password:'x'.repeat(14),role:'admin',propertyIds:['TEST-KL','TEST-PG']});
const revision=(store,propertyId)=>store.db.prepare('SELECT revision FROM properties WHERE id=?').get(propertyId).revision;
const send=(store,user,command,propertyId='TEST-KL',key=randomUUID())=>
  store.command({id:user.id},{key,expectedRevision:revision(store,propertyId),command:{propertyId,...command}});
const attempt=(store,user,command,propertyId='TEST-KL')=>{
  try{ send(store,user,command,propertyId); return null; }
  catch(e){ return e.status??e.message; }
};
const member=(store,username)=>store.read({id:store.db.prepare('SELECT id FROM users WHERE username=?').get('admin-one').id})
  .members.find(m=>m.username===username);

test('an administrator creates a team member and the change is audited',()=>{
  const store=open(),admin=adminUser(store);
  const result=send(store,admin,{type:'member_save',username:'staff-one',password:'y'.repeat(14),role:'operations',propertyIds:['TEST-KL']});
  assert.equal(result.created,true);
  assert.equal(result.username,'staff-one');
  const row=member(store,'staff-one');
  assert.equal(row.role,'operations');
  assert.deepEqual(row.propertyIds,['TEST-KL']);
  assert.equal(row.active,true);
  const audit=store.read({id:admin.id}).memberAudit;
  assert.equal(audit.length,1);
  assert.equal(audit[0].actor,'admin-one');
  assert.equal(audit[0].target,'staff-one');
  assert.equal(audit[0].created,true);
  assert.equal(audit[0].passwordChanged,true);
  assert.deepEqual(audit[0].previous,null);
  store.close();
});

test('a property role overrides the account role for that property only',()=>{
  const store=open(),admin=adminUser(store);
  send(store,admin,{type:'member_save',username:'staff-one',password:'y'.repeat(14),role:'viewer',propertyIds:['TEST-KL','TEST-PG']});
  send(store,admin,{type:'member_save',username:'staff-one',propertyRoles:{'TEST-KL':'operations'}});
  const staff=store.db.prepare('SELECT * FROM users WHERE username=?').get('staff-one');
  assert.equal(member(store,'staff-one').propertyRoles['TEST-KL'],'operations');
  // memo_save belongs to operations, not to a viewer, so the override is what decides.
  assert.equal(attempt(store,staff,{type:'memo_save',text:'TEST open'}),null,'operations in this property may save the memo');
  assert.equal(attempt(store,staff,{type:'memo_save',text:'TEST open'},'TEST-PG'),403,'the same account stays a viewer in the other property');
  const session=store.publicUser(staff);
  assert.ok(session.allowedActionsByProperty['TEST-KL'].includes('memo_save'));
  assert.ok(!session.allowedActionsByProperty['TEST-PG'].includes('memo_save'));
  assert.ok(!session.allowedActions.includes('memo_save'),'the account role alone still says viewer');
  store.close();
});

test('only an administrator can change team access',()=>{
  const store=open(),admin=adminUser(store);
  send(store,admin,{type:'member_save',username:'ops-one',password:'y'.repeat(14),role:'operations',propertyIds:['TEST-KL']});
  send(store,admin,{type:'member_save',username:'fin-one',password:'y'.repeat(14),role:'finance',propertyIds:['TEST-KL']});
  const ops=store.db.prepare('SELECT * FROM users WHERE username=?').get('ops-one');
  const fin=store.db.prepare('SELECT * FROM users WHERE username=?').get('fin-one');
  assert.equal(attempt(store,ops,{type:'member_save',username:'fin-one',role:'admin'}),403);
  assert.equal(attempt(store,fin,{type:'member_save',username:'ops-one',role:'admin'}),403);
  assert.equal(member(store,'fin-one').role,'finance','nothing changed');
  // A property override never grants team administration either.
  send(store,admin,{type:'member_save',username:'ops-one',propertyRoles:{'TEST-KL':'admin'}});
  assert.equal(attempt(store,ops,{type:'member_save',username:'fin-one',role:'admin'}),403,
    'team access stays with account administrators, not with a property-level admin override');
  store.close();
});

test('an administrator cannot reach a member who shares no property with them',()=>{
  const store=open(),admin=adminUser(store);
  const other=store.createUser({username:'other-admin',password:'z'.repeat(14),role:'admin',propertyIds:['TEST-PG']});
  send(store,other,{type:'member_save',username:'pg-staff',password:'y'.repeat(14),role:'viewer',propertyIds:['TEST-PG']},'TEST-PG');
  const scoped=store.createUser({username:'kl-admin',password:'z'.repeat(14),role:'admin',propertyIds:['TEST-KL']});
  assert.equal(attempt(store,scoped,{type:'member_save',username:'pg-staff',role:'admin'}),403);
  assert.equal(store.read({id:scoped.id}).members.some(m=>m.username==='pg-staff'),false,
    'the other property staff are not listed at all');
  assert.equal(store.read({id:scoped.id}).memberAudit.length,0,'nor are their audit entries');
  store.close();
});

test('team changes refuse properties outside the administrator scope',()=>{
  const store=open(),admin=adminUser(store);
  const scoped=store.createUser({username:'kl-admin',password:'z'.repeat(14),role:'admin',propertyIds:['TEST-KL']});
  assert.equal(attempt(store,scoped,{type:'member_save',username:'staff-one',password:'y'.repeat(14),role:'viewer',propertyIds:['TEST-PG']}),400);
  assert.equal(attempt(store,admin,{type:'member_save',username:'staff-one',password:'y'.repeat(14),role:'viewer',propertyIds:['TEST-KL','NOWHERE']}),400);
  assert.equal(attempt(store,admin,{type:'member_save',username:'staff-one',password:'y'.repeat(14),role:'ghost',propertyIds:['TEST-KL']}),400);
  assert.equal(attempt(store,admin,{type:'member_save',username:'ab',password:'y'.repeat(14),role:'viewer',propertyIds:['TEST-KL']}),400,'a too-short username is refused');
  assert.equal(attempt(store,admin,{type:'member_save',username:'staff-one',password:'short',role:'viewer',propertyIds:['TEST-KL']}),400,'a short password is refused');
  store.close();
});

test('nobody edits their own access through this page',()=>{
  const store=open(),admin=adminUser(store);
  assert.equal(attempt(store,admin,{type:'member_save',username:'admin-one',role:'viewer'}),400);
  assert.equal(attempt(store,admin,{type:'member_save',username:'admin-one',active:false}),400);
  assert.equal(member(store,'admin-one').role,'admin');
  store.close();
});

test('the last active administrator cannot be demoted or disabled',()=>{
  const store=open(),admin=adminUser(store);
  assert.equal(attempt(store,admin,{type:'member_save',username:'admin-one',role:'viewer'}),400,'self changes are refused first');
  const second=store.createUser({username:'second-admin',password:'z'.repeat(14),role:'admin',propertyIds:['TEST-KL']});
  assert.equal(attempt(store,admin,{type:'member_save',username:'second-admin',role:'operations'}),null,'one of two administrators can be demoted');
  send(store,admin,{type:'member_save',username:'second-admin',role:'admin'});
  assert.equal(attempt(store,admin,{type:'member_save',username:'second-admin',active:false}),null,'one of two can be disabled');
  assert.equal(attempt(store,admin,{type:'member_save',username:'second-admin',role:'admin',active:true}),null,'and restored');
  store.close();
});

test('disabling a member ends their sessions and blocks their login immediately',()=>{
  const store=open(),admin=adminUser(store);
  send(store,admin,{type:'member_save',username:'staff-one',password:'y'.repeat(14),role:'operations',propertyIds:['TEST-KL']});
  const {token}=store.login('staff-one','y'.repeat(14));
  assert.ok(store.session(token).user.username==='staff-one');
  send(store,admin,{type:'member_save',username:'staff-one',active:false});
  assert.throws(()=>store.session(token),/login_required/,'an existing session stops working');
  assert.throws(()=>store.login('staff-one','y'.repeat(14)),/credentials/);
  send(store,admin,{type:'member_save',username:'staff-one',active:true});
  assert.ok(store.login('staff-one','y'.repeat(14)).token,'and can be restored');
  store.close();
});

test('changing a password signs the member out everywhere and keeps the audit honest',()=>{
  const store=open(),admin=adminUser(store);
  send(store,admin,{type:'member_save',username:'staff-one',password:'y'.repeat(14),role:'operations',propertyIds:['TEST-KL']});
  const {token}=store.login('staff-one','y'.repeat(14));
  send(store,admin,{type:'member_save',username:'staff-one',password:'w'.repeat(14)});
  assert.throws(()=>store.session(token),/login_required/,'the old session is gone');
  assert.ok(store.login('staff-one','w'.repeat(14)).token,'the new password works');
  const audit=store.read({id:admin.id}).memberAudit;
  assert.equal(audit[0].passwordChanged,true);
  assert.equal(audit[0].role,'operations','an omitted role is not silently cleared');
  assert.deepEqual(audit[0].propertyIds,['TEST-KL'],'nor is the property scope');
  assert.equal(audit[0].previous.role,'operations');
  store.close();
});

test('a repeated team change replays instead of applying twice',()=>{
  const store=open(),admin=adminUser(store);
  const key=randomUUID();
  const first=send(store,admin,{type:'member_save',username:'staff-one',password:'y'.repeat(14),role:'operations',propertyIds:['TEST-KL']},'TEST-KL',key);
  const second=send(store,admin,{type:'member_save',username:'staff-one',password:'y'.repeat(14),role:'operations',propertyIds:['TEST-KL']},'TEST-KL',key);
  assert.equal(second.replayed,true);
  assert.equal(second.id,first.id);
  assert.equal(store.read({id:admin.id}).memberAudit.length,1,'one audit entry, not two');
  assert.throws(()=>send(store,admin,{type:'member_save',username:'staff-one',role:'admin'},'TEST-KL',key),/idempotency_mismatch/);
  store.close();
});

test('members and their audit trail stay hidden from everyone else',()=>{
  const store=open(),admin=adminUser(store);
  send(store,admin,{type:'member_save',username:'staff-one',password:'y'.repeat(14),role:'operations',propertyIds:['TEST-KL']});
  const staff=store.db.prepare('SELECT * FROM users WHERE username=?').get('staff-one');
  const state=store.read({id:staff.id});
  assert.deepEqual(state.members,[]);
  assert.deepEqual(state.memberAudit,[]);
  store.close();
});

test('the team page escapes account text and offers no form to anyone who cannot use it',async()=>{
 const {teamAccessPage}=await import('../web/workspace-ui.js');
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const base={members:[{id:'u1',username:'<staff>',role:'operations',active:true,propertyIds:['P'],propertyRoles:{P:'admin'}},
   {id:'u2',username:'self-one',role:'admin',active:true,propertyIds:['P'],propertyRoles:{}}],
  memberAudit:[{id:'a1',actor:'<admin>',target:'<staff>',role:'operations',active:true,propertyIds:['P'],passwordChanged:true,created:true,at:'2027-01-01T00:00:00.000Z'}],
  properties:[{id:'P',name:'<property>'}],propertyId:'P',user:{username:'self-one'},escape:esc,t:k=>k};
 const editable=teamAccessPage({...base,can:()=>true});
 assert.match(editable,/&lt;staff&gt;/,'member names are escaped like any other guest text');
 assert.match(editable,/&lt;property&gt;/,'property names are escaped too');
 assert.doesNotMatch(editable,/<staff>/);assert.doesNotMatch(editable,/<property>/);assert.doesNotMatch(editable,/<script>/);
 assert.match(editable,/data-member-apply="&lt;staff&gt;"/,'the editable row is keyed by the escaped account name');
 assert.match(editable,/memberSelf/,'the signed-in account is not given an editable row');
 assert.doesNotMatch(editable,/data-member-apply="self-one"/);
 assert.match(editable,/id="member-new"/,'an administrator can add a member');
 assert.match(editable,/&lt;admin&gt;/,'the audit trail shows who changed what');
 const readOnly=teamAccessPage({...base,members:[],memberAudit:[],can:()=>false});
 assert.match(readOnly,/teamReadOnly/,'everyone else is told why the page is read only');
 assert.doesNotMatch(readOnly,/id="member-new"/,'and gets no form that the server would refuse');
 assert.doesNotMatch(readOnly,/data-member-apply/);
});
