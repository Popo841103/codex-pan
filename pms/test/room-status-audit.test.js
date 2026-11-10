import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {apply} from '../src/demo-store.js';
import {Store} from '../server/store.js';

test('room-status audit keeps the affected dates and original note after a partial opening',()=>{
  const store=new Store(':memory:');
  try{
    store.seedTestProperties();
    const user=store.createUser({username:'synthetic-room-audit',password:randomUUID(),role:'admin',propertyIds:['TEST-KL']});
    const propertyId='TEST-KL',resourceId='TEST-KL-R1';
    const run=(type,fields)=>store.command(user,{key:randomUUID(),expectedRevision:store.read(user).revisions[propertyId],command:{type,propertyId,...fields}});
    const blocked=run('bulk_block',{resourceIds:[resourceId],start:'2027-01-15',end:'2027-01-19',blockType:'out_of_service',reason:'Synthetic maintenance'});
    const opened=run('bulk_unblock',{resourceIds:[resourceId],start:'2027-01-16',end:'2027-01-18',blockIds:[blocked.id]});
    const dirty=run('bulk_clean',{resourceIds:[resourceId],cleaning:'dirty'});
    const clean=run('clean',{resourceId});
    const audit=store.read(user).audit;
    const entry=(id)=>audit.find(row=>row.id===id).roomStatusRows[0];
    assert.deepEqual([blocked,opened,dirty,clean].map(({id})=>entry(id).action),['out_of_service','open','dirty','clean']);
    assert.deepEqual([entry(blocked.id).start,entry(blocked.id).end],['2027-01-15','2027-01-19']);
    assert.deepEqual([entry(opened.id).start,entry(opened.id).end],['2027-01-16','2027-01-18']);
    assert.equal(entry(opened.id).note,'Synthetic maintenance');
    assert.equal(entry(dirty.id).start,null);
    assert.equal(entry(dirty.id).resourceId,resourceId);
    assert(entry(clean.id).roomLabel);
    assert.equal(audit.find(row=>row.id===opened.id).actor,user.username);
  }finally{store.close();}
});

test('all five room-log actions agree in demo and shared stores without rewriting history',()=>{
  const store=new Store(':memory:');
  try {
    store.seedTestProperties();
    const actor=store.createUser({username:'synthetic-log-parity',password:randomUUID(),role:'admin',propertyIds:['TEST-KL']});
    const propertyId='TEST-KL',resourceId='TEST-KL-R1';
    let demo=store.read(actor);
    const cases=[
      {type:'bulk_block',resourceIds:[resourceId],start:'2027-02-01',end:'2027-02-02',blockType:'maintenance',reason:'Synthetic block'},
      {type:'bulk_unblock',resourceIds:[resourceId],start:'2027-02-01',end:'2027-02-02'},
      {type:'clean',resourceId},
      {type:'bulk_clean',resourceIds:[resourceId],cleaning:'dirty'},
      {type:'bulk_block',resourceIds:[resourceId],start:'2027-02-01',end:'2027-02-02',blockType:'out_of_service',reason:'Synthetic OOS'}
    ];
    const actions=[];
    for(const fields of cases){
      const previous=structuredClone(store.read(actor).audit);
      const command={...fields,propertyId,id:randomUUID(),at:'2027-01-31T16:05:00Z',actor:actor.username};
      const result=store.command(actor,{key:randomUUID(),expectedRevision:store.read(actor).revisions[propertyId],command});
      const current=store.read(actor).audit;
      const actual=current.find(e=>e.id===result.id);
      demo=apply(demo,{...command,id:actual.id,at:actual.at,actor:actual.actor});
      assert.deepEqual(actual.roomStatusRows,demo.audit.find(e=>e.id===actual.id).roomStatusRows);
      for(const event of previous)assert.deepEqual(current.find(e=>e.id===event.id),event);
      actions.push(actual.roomStatusRows[0].action);
    }
    assert.deepEqual(actions,['blocked','open','clean','dirty','out_of_service']);
  } finally {store.close();}
});
