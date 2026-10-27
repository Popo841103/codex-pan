import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync, backup } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { Store } from '../server/store.js';

test('upgrade keeps existing accounts, sessions, orders, receipts and revision; snapshot is consistent', async () => {
  const dir=mkdtempSync(join(tmpdir(),'jovian-upgrade-')),path=join(dir,'test.sqlite'),snapshot=join(dir,'backup.sqlite');
  let store=new Store(path);
  try {
    store.seedTestProperties();
    const admin=store.createUser({username:'test-upgrade-admin',password:'test-password-only',role:'admin',propertyIds:['TEST-KL']});
    const request={key:randomUUID(),expectedRevision:0,command:{type:'create',propertyId:'TEST-KL',guest:'TEST upgrade guest',productId:'room',gender:'any',start:'2027-01-10',end:'2027-01-12',nightly:1000}};
    const receipt=store.command(admin,request),login=store.login(admin.username,'test-password-only');
    // A legacy-shaped persisted body: derive configuration only when the new code reads it.
    const body=JSON.parse(store.db.prepare('SELECT body FROM properties WHERE id=?').get('TEST-KL').body);
    delete body.roomTypes;delete body.physicalRooms;body.resources.forEach(r=>{delete r.roomTypeId;delete r.archived;delete r.sortOrder;});
    store.db.prepare('UPDATE properties SET body=? WHERE id=?').run(JSON.stringify(body),'TEST-KL');
    const rows=()=>Object.fromEntries(['properties','users','user_properties','sessions','receipts','claims','audit'].map(table=>[table,store.db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all()]));
    const before=rows();await backup(store.db,snapshot);store.close();store=new Store(path);
    assert.deepEqual(rows(),before);assert.equal(store.session(login.token).user.id,admin.id);
    assert.equal(store.command(admin,request).id,receipt.id);
    const state=store.read(admin);assert.equal(state.orders.length,1);assert.equal(state.revisions['TEST-KL'],1);assert(state.roomTypes.length>0);
    const db=new DatabaseSync(snapshot,{readOnly:true});try {
      assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check,'ok');
      for(const [table,expected] of Object.entries(before))assert.deepEqual(db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all(),expected);
    }finally{db.close();}
  }finally{store.close();rmSync(dir,{recursive:true,force:true});}
});

test('rollback connections cannot write incompatible state and failed writes preserve claims', () => {
  const dir=mkdtempSync(join(tmpdir(),'jovian-rollback-')),path=join(dir,'test.sqlite'),current=new Store(path);
  let old;
  try {
    current.seedTestProperties();
    const admin=current.createUser({username:'test-rollback-admin',password:'test-password-only',role:'admin',propertyIds:['TEST-KL']});
    const result=current.command(admin,{key:randomUUID(),expectedRevision:0,command:{type:'create',propertyId:'TEST-KL',guest:'TEST protected',productId:'room',gender:'any',resourceId:'TEST-KL-R1',start:'2027-01-10',end:'2027-01-12'}});
    const before=current.read(admin);
    old=new DatabaseSync(path);
    // Simulate a pre-upgrade process which already has an open connection.
    // Health/read operations survive; its normal UPDATE cannot prepare without the new function.
    assert.equal(old.prepare('SELECT 1 AS ok').get().ok,1);
    const row=old.prepare('SELECT body,revision FROM properties WHERE id=?').get('TEST-KL');
    old.exec('BEGIN IMMEDIATE');
    try { old.prepare('DELETE FROM claims WHERE property_id=?').run('TEST-KL');
      assert.throws(()=>old.prepare('UPDATE properties SET revision=?,body=? WHERE id=?').run(row.revision+1,row.body,'TEST-KL'),/jovian_writer_generation/);
    }finally{old.exec('ROLLBACK');}
    assert.deepEqual(current.read(admin),before);
    assert.equal(current.db.prepare('SELECT COUNT(*) AS n FROM claims WHERE owner=?').get(result.id).n,2);
    // A future older runtime that registers its own lower generation is also rejected.
    for(const generation of [5,6,7]){
      old.function('jovian_writer_generation',{deterministic:true},()=>generation);
      assert.throws(()=>old.prepare('UPDATE properties SET body=? WHERE id=?').run(row.body,'TEST-KL'),/incompatible_runtime/);
    }
    current.command(admin,{key:randomUUID(),expectedRevision:1,command:{type:'resource_archive',propertyId:'TEST-KL',resourceId:'TEST-KL-R2',archived:true}});
    assert.equal(current.read(admin).resources.find(r=>r.id==='TEST-KL-R2').archived,true);
  }finally{old?.close();current.close();rmSync(dir,{recursive:true,force:true});}
});
