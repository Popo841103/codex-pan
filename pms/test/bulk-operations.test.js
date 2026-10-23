import test from 'node:test';
import assert from 'node:assert/strict';
import {seed,apply,preview} from '../src/demo-store.js';
import {Store} from '../server/store.js';
const command=(type,extra={})=>({type,propertyId:'TEST-KL',id:'test-action',at:'2027-01-10T08:00:00Z',date:'2027-01-10',...extra});
const book=(s,extra={})=>apply(s,command('create',{id:'reservation',guest:'TEST guest',productId:'room',gender:'any',start:'2027-01-10',end:'2027-01-12',resourceId:'TEST-KL-R1',...extra}));
test('bulk cleaning is scoped, rejects mixed in-house selection and leaves input unchanged',()=>{
 let s=book(seed());s=apply(s,command('checkin',{orderId:'reservation'}));const before=JSON.stringify(s);
 assert.throws(()=>apply(s,command('bulk_clean',{resourceIds:['TEST-KL-R2','TEST-KL-R1'],cleaning:'dirty'})),/occupied/);
 assert.equal(JSON.stringify(s),before);
 assert.throws(()=>apply(s,command('bulk_clean',{resourceIds:['TEST-KL-R2','TEST-PG-R1'],cleaning:'dirty'})),/scope/);
 assert.throws(()=>apply(s,command('bulk_clean',{resourceIds:['TEST-KL-R2','TEST-KL-R2'],cleaning:'dirty'})),/input/);
 const next=apply(s,command('bulk_clean',{resourceIds:['TEST-KL-R2','TEST-KL-R3'],cleaning:'dirty'}));
 assert.equal(next.resources.find(r=>r.id==='TEST-KL-R2').cleaning,'dirty');assert.equal(next.resources.find(r=>r.id==='TEST-KL-R3').cleaning,'dirty');
});
test('bulk release splits intervals and preserves unselected atoms',()=>{
 let s=apply(seed(),command('bulk_block',{resourceIds:['TEST-KL-R1','TEST-KL-R2'],start:'2027-01-10',end:'2027-01-15',reason:'TEST repair'}));
 s=apply(s,command('bulk_unblock',{id:'release',resourceIds:['TEST-KL-R1'],start:'2027-01-11',end:'2027-01-13'}));
 assert.equal(s.blocks.length,3);
 assert(s.blocks.some(b=>b.atoms.includes('TEST-KL-R2')&&b.start==='2027-01-10'&&b.end==='2027-01-15'));
 assert(s.blocks.some(b=>b.atoms.includes('TEST-KL-R1')&&b.end==='2027-01-11'));
 assert(s.blocks.some(b=>b.atoms.includes('TEST-KL-R1')&&b.start==='2027-01-13'));
 preview(s,'TEST-KL');
 assert.throws(()=>apply(s,command('bulk_block',{resourceIds:['TEST-KL-R3'],start:'2027-02-30',end:'2027-03-05'})),/date_range/);
});
test('bulk blocked dates conflict atomically with fixed reservations and never evict overdue guests',()=>{
 let s=book(seed());const before=JSON.stringify(s);
 assert.throws(()=>apply(s,command('bulk_block',{resourceIds:['TEST-KL-R2','TEST-KL-R1'],start:'2027-01-11',end:'2027-01-14'})));
 assert.equal(JSON.stringify(s),before);
 s=apply(s,command('checkin',{orderId:'reservation'}));
 assert.throws(()=>apply(s,command('bulk_block',{resourceIds:['TEST-KL-R1'],start:'2027-01-15',end:'2027-01-16'})),/occupied/);
});
test('bulk commands use one transaction, receipt and audit event; finance cannot run them',()=>{
 const store=new Store(':memory:');try{
 store.seedTestProperties();const admin=store.createUser({username:'test-admin',password:'test-password-only',role:'admin',propertyIds:['TEST-KL']});
 const finance=store.createUser({username:'test-finance',password:'test-password-only',role:'finance',propertyIds:['TEST-KL']});
 const request={key:'bulk-request-001',expectedRevision:0,command:command('bulk_block',{resourceIds:['TEST-KL-R1','TEST-KL-R2'],start:'2027-01-10',end:'2027-01-13'})};
 const result=store.command(admin,request);assert.equal(store.command(admin,request).replayed,true);
 const state=store.read(admin);assert.equal(state.revisions['TEST-KL'],1);assert.equal(state.blocks.length,1);assert.equal(state.audit.length,1);assert.equal(state.audit[0].resourceIds.length,2);
 assert.throws(()=>store.command(finance,{...request,key:'finance-request'}),/forbidden/);
 assert.equal(store.db.prepare('SELECT COUNT(*) n FROM claims').get().n,6);
 const before=JSON.stringify(store.read(admin));
 assert.throws(()=>store.command(admin,{key:'invalid-request',expectedRevision:1,command:command('bulk_clean',{resourceIds:['TEST-KL-R3','TEST-PG-R1'],cleaning:'dirty'})}),/scope/);
 assert.equal(JSON.stringify(store.read(admin)),before);assert.ok(result.id);
 }finally{store.close();}
});
test('guest metadata, manual reference, custom color and Trip.com persist without implying a live channel',()=>{
 const s=book(seed(),{source:'tripcom',email:'test@example.invalid',phone:'TEST ONLY',color:'blue',channelOrderId:'TEST-REF'});
 assert.equal(s.orders[0].source,'tripcom');assert.equal(s.orders[0].color,'blue');assert.equal(s.orders[0].channelOrderId,'TEST-REF');
 assert.throws(()=>book(seed(),{color:'url(javascript:bad)'}),/input/);
 const next=apply(s,command('edit',{orderId:'reservation',guest:'TEST updated',start:'2027-01-10',end:'2027-01-12',nightly:0,source:'tripcom'}));
 assert.equal(next.orders[0].email,'test@example.invalid');assert.equal(next.orders[0].color,'blue');
});
