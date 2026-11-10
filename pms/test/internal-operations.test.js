import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import {mkdtempSync,writeFileSync,readFileSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {backup} from 'node:sqlite';
import {spawnSync} from 'node:child_process';
import {Store} from '../server/store.js';
import {apply,seed,scopedReminder,operationsReports,reminderForAccount} from '../src/demo-store.js';
import {readPublicListing,publicAddress,renderPropertySite} from '../server/http.js';
import {sealBackupDirectory,restoreBackupDirectory,rotateBackupDirectory} from '../server/self-checkin.js';
const pid='TEST-KL';
const local=(s,type,extra={})=>apply(s,{type,propertyId:pid,id:randomUUID(),actor:'alice',at:'2027-02-01T00:00:00Z',...extra});
function setup(){const store=new Store(':memory:');store.seedTestProperties();const admin=store.createUser({username:'alice',password:'synthetic-password',role:'admin',propertyIds:[pid]});const ops=store.createUser({username:'staff',password:'synthetic-password',role:'operations',propertyIds:[pid]});const other=store.createUser({username:'other',password:'synthetic-password',role:'admin',propertyIds:['TEST-PG']});
 const send=(u,type,extra={})=>store.command(u,{key:randomUUID(),expectedRevision:store.read(u).revisions[pid]??0,command:{type,propertyId:pid,...extra}});send(admin,'business_date_init',{date:'2027-02-01'});return {store,admin,ops,other,send};}
test('staff notices preserve originals, withdrawal owner and property scope, and append audit in both engines',()=>{
 const {store,admin,ops,other,send}=setup();try{
 let s={...seed(),businessDate:'2027-02-01'};
 const text='TEST internal notice';s=local(s,'notice_send',{text});const original=structuredClone(s.staffNotices[0]);
 assert.throws(()=>local(s,'notice_withdraw',{actor:'staff',noticeId:original.id,reason:'test'}),/scope/);
 s=local(s,'notice_withdraw',{noticeId:original.id,reason:'TEST mistake'});assert.deepEqual(s.staffNotices[0],original);assert.equal(s.noticeWithdrawals.length,1);
 const sent=send(admin,'notice_send',{text});assert.throws(()=>send(ops,'notice_withdraw',{noticeId:sent.id,reason:'TEST'}),/scope/);
 assert.throws(()=>send(other,'notice_send',{text}),/forbidden|scope/);send(admin,'notice_withdraw',{noticeId:sent.id,reason:'TEST mistake'});
 assert.equal(store.read(admin).staffNotices[0].text,text);assert.equal(store.read(admin).noticeWithdrawals[0].noticeId,sent.id);assert.equal(store.read(other).staffNotices.length,0);
 assert.equal(store.read(admin).audit[0].internalChange.batchChange.recordId,store.read(admin).noticeWithdrawals[0].id);
 assert.throws(()=>send(admin,'notice_withdraw',{noticeId:sent.id,reason:'again'}),/scope/);
 const privateNotice=send(admin,'notice_send',{text:'TEST recipient only',recipient:'alice'});assert(!store.read(ops).staffNotices.some(n=>n.id===privateNotice.id));assert(!store.read(ops).notifications.some(n=>n.id===privateNotice.id));
 }finally{store.close();}
});
test('account and shift rules only raise matched notices; newest scoped setting supersedes history',()=>{
 let s=local(seed(),'shift_save',{name:'TEST shift',start:'08:00',end:'16:00'});const shiftId=s.shiftTypes[0].id;
 s=local(s,'notice_scope_save',{kind:'rooms_to_clean',level:'urgent',username:'alice',shiftId});
 const n={propertyId:pid,kind:'rooms_to_clean',severity:'routine'};
 assert.equal(reminderForAccount(s,n,'alice','2027-03-01T01:00:00Z').severity,'urgent');assert.equal(reminderForAccount(s,n,'alice','2027-03-01T10:00:00Z').severity,'routine');
 assert.equal(scopedReminder(s,n,{username:'alice',shiftId}).severity,'urgent');assert.equal(scopedReminder(s,n,{username:'other',shiftId}).severity,'routine');assert.equal(scopedReminder(s,n,{username:'alice',shiftId:'other'}).severity,'routine');
 s=local(s,'notice_scope_save',{kind:'rooms_to_clean',level:'attention',username:'alice',shiftId});assert.equal(s.noticeScopes.length,2);assert.equal(scopedReminder(s,n,{username:'alice',shiftId}).severity,'attention');
});
test('rate history freezes expected cents, commission close freezes both and corrections report in current business date',()=>{
 let s={...seed(),businessDate:'2027-01-15'};
 s=local(s,'commission_rate_save',{source:'booking',percent:15,effectiveFrom:'2027-01-01'});
 s=local(s,'create',{id:'stay',guest:'TEST',source:'booking',productId:'room',gender:'any',start:'2027-01-14',end:'2027-01-15',nightly:10001});
 s=local(s,'commission_save',{orderId:'stay',amount:1550,reference:'INV',settled:true});assert.equal(s.orders[0].commission.expected.amount,1500);
 s=local(s,'commission_rate_save',{source:'booking',percent:20,effectiveFrom:'2027-01-16'});
 s={...s,businessDate:'2027-02-01'};s=local(s,'commission_close_month',{month:'2027-01'});const snapshot=structuredClone(s.commissionPeriods);
 assert.equal(snapshot[0].entries[0].expected.amount,1500);
 assert.throws(()=>local(s,'commission_rate_save',{source:'booking',percent:1,effectiveFrom:'2027-01-17'}),/commission_period/);
 s=local(s,'commission_save',{orderId:'stay',amount:1400,reference:'CREDIT',settled:true,correction:true,note:'TEST credit'});assert.deepEqual(s.commissionPeriods,snapshot);
 const report=operationsReports(s,pid,'2027-01-01','2027-01-31');assert.equal(report.channel[0].variance,50);assert.equal(operationsReports(s,pid,'2027-02-01','2027-02-01').channel[0].actual,-150);
});
test('new settings are administrator-only and isolated; reducer and durable state agree',()=>{
 const {store,admin,ops,other,send}=setup();try{
 const commands=[['commission_rate_save',{source:'agoda',percent:12.25,effectiveFrom:'2027-02-01'}],['listing_draft_save',{url:'https://example.com/listing',title:'TEST draft',photos:[],capacity:null,description:'TEST',confirmed:true}]];
 for(const [type,payload] of commands){assert.throws(()=>send(ops,type,payload),/forbidden/);send(admin,type,payload);}
 const state=store.read(admin);assert.equal(state.commissionRates[0].percent,12.25);assert.equal(state.listingDrafts[0].status,'draft');assert.equal(store.read(other).listingDrafts.length,0);assert.equal(state.orders.length,0);
 assert.throws(()=>send(admin,'listing_draft_save',{url:'https://example.com/a',title:'X',confirmed:false}),/input/);
 }finally{store.close();}
});
test('listing extraction uses fixtures only, respects robots and retains missing fields honestly',async()=>{
 const html='<title>TEST public room</title><meta property="og:image" content="https://example.com/a.jpg"><script type="application/ld+json">{"@type":"HotelRoom","occupancy":{"maxValue":3},"description":"TEST description"}</script>';
 const reads=[];const read=async url=>{reads.push(url);return url.endsWith('/robots.txt')?'User-agent: *\nDisallow: /private':html;};
 const row=await readPublicListing('https://example.com/room',read);assert.equal(row.title,'TEST public room');assert.equal(row.capacity,3);assert.equal(row.photos.length,1);assert.equal(reads.length,2);
 await assert.rejects(()=>readPublicListing('https://example.com/private',read),/robots/);
 await assert.rejects(()=>readPublicListing('https://example.com/room',async()=>{throw Error('unreadable');}));
 const empty=await readPublicListing('https://example.com/empty',async()=> '');assert.equal(empty.status,'no_verified_fields');assert.equal(empty.capacity,null);
 for(const address of ['127.0.0.1','10.0.0.1','169.254.169.254','172.16.0.1','192.168.1.1','::1','::ffff:127.0.0.1','100.64.0.1'])assert.equal(publicAddress(address),false);
 assert.equal(publicAddress('8.8.8.8'),true);
});
test('photo content and room descriptions survive shared reads and public rendering without executing markup',()=>{
 const {store,admin,send}=setup();try{
 const type=store.read(admin).roomTypes.find(t=>t.propertyId===pid);const payload={roomTypeId:type.id,photos:['https://example.com/b.jpg','https://example.com/a.jpg'],cover:'https://example.com/a.jpg',descriptions:{zh:'TEST 中文',en:'<script>TEST</script>',ms:'TEST bilik'}};
 send(admin,'booking_content_save',payload);send(admin,'site_save',{slug:'test-content',enabled:true,title:{en:'TEST'},roomTypeIds:[],planCodes:[]});
 const site=store.publicSite('test-content');assert.deepEqual(site.roomTypes[0].photos,payload.photos);
 const availability=store.publicAvailability({slug:'test-content',from:'2027-02-02',to:'2027-02-03',guests:1});
 const html=renderPropertySite({site,availability,language:'en',requested:{from:'2027-02-02',to:'2027-02-03',guests:1}});
 assert(html.indexOf('a.jpg')<html.indexOf('b.jpg'));assert(html.includes('&lt;script&gt;TEST&lt;/script&gt;'));assert(!html.includes('<script>TEST'));
 assert.equal(store.read(admin).contentHistory.length,1);assert.throws(()=>send(admin,'booking_content_save',{...payload,photos:['javascript:alert(1)']}),/input/);
 }finally{store.close();}
});
test('one multi-type guest request is pending and acceptance creates all stays atomically',()=>{
 const {store,admin,send}=setup();try{
 send(admin,'site_save',{slug:'test-multi',enabled:true,title:{en:'TEST'},roomTypeIds:[],planCodes:[]});const types=store.publicSite('test-multi').roomTypes.filter(t=>t.units>0).slice(0,2);assert.equal(types.length,2);
 const input={slug:'test-multi',selections:types.map(t=>({roomTypeId:t.id,rooms:1})),from:'2027-04-01',to:'2027-04-02',guests:1,name:'TEST multi',contact:'test@example.com',language:'ms'};
 const request=store.submitBookingRequest(input);assert.equal(request.status,'pending');assert.equal(store.read(admin).orders.length,0);
 send(admin,'booking_request_decision',{requestId:request.id,decision:'accept'});const orders=store.read(admin).orders;assert.equal(orders.length,2);assert.deepEqual(new Set(orders.map(o=>o.roomTypeId)),new Set(types.map(t=>t.id)));
 const before=store.read(admin).bookingRequests.length;assert.throws(()=>store.submitBookingRequest({...input,selections:[...input.selections,input.selections[0]]}),/room_count/);assert.equal(store.read(admin).bookingRequests.length,before);
 }finally{store.close();}
});
test('reminder reports use recorded business date, never Malaysia timestamp day',()=>{
 let s={...seed(),businessDate:'2027-01-31'};s=local(s,'notice_send',{text:'TEST',at:'2027-02-01T18:00:00Z'});
 assert.equal(operationsReports(s,pid,'2027-01-31','2027-01-31').reminders.length,1);assert.equal(operationsReports(s,pid,'2027-02-02','2027-02-02').reminders.length,0);
});
test('encrypted backup, rotation and original database plus key restore drill',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'pms-backup-drill-')),source=join(dir,'backup'),restored=join(dir,'restored'),oldCopy=join(dir,'old-copy');
 const {mkdirSync,cpSync}=await import('node:fs');mkdirSync(source);const key=randomBytes(32),newKey=randomBytes(32),keyPath=join(dir,'original.key');writeFileSync(keyPath,key,{mode:0o600});
 const store=new Store(join(dir,'source.sqlite'));try{
 store.seedTestProperties();store.checkin.key=key;const encrypted=store.checkin.crypt({name:'TEST SYNTHETIC'},'TEST');store.db.exec('CREATE TABLE restore_probe (payload TEXT)');store.db.prepare('INSERT INTO restore_probe VALUES(?)').run(encrypted);
 await backup(store.db,join(source,'database.sqlite'));writeFileSync(join(source,'self-checkin.key'),key,{mode:0o600});
 const result=sealBackupDirectory(source,key);assert.equal(result.files,2);assert.equal(existsSync(join(source,'database.sqlite')),false);assert(!readFileSync(join(source,'jovian-backup.sealed'),'utf8').includes('TEST SYNTHETIC'));
 cpSync(source,oldCopy,{recursive:true});assert.throws(()=>restoreBackupDirectory(source,join(dir,'bad'),randomBytes(32)),/authentication/);assert(!existsSync(join(dir,'bad')));
 rotateBackupDirectory(source,key,newKey);assert.throws(()=>restoreBackupDirectory(source,join(dir,'wrong-old'),key),/authentication/);restoreBackupDirectory(source,restored,[key,newKey]);assert.deepEqual(readFileSync(join(restored,'self-checkin.key')),key);
 const recovered=new Store(join(restored,'database.sqlite'));try{recovered.checkin.key=readFileSync(join(restored,'self-checkin.key'));assert.deepEqual(recovered.checkin.decrypt(recovered.db.prepare('SELECT payload FROM restore_probe').get().payload,'TEST'),{name:'TEST SYNTHETIC'});}finally{recovered.close();}
 const cli=spawnSync(process.execPath,['server/self-checkin.js','backup-restore',oldCopy,keyPath,join(dir,'cli-restore')],{cwd:new URL('../',import.meta.url),encoding:'utf8'});assert.equal(cli.status,0,cli.stderr);assert(existsSync(join(dir,'cli-restore','database.sqlite')));
 const corrupt=JSON.parse(readFileSync(join(source,'jovian-backup.sealed')));corrupt.epoch='tampered';writeFileSync(join(source,'jovian-backup.sealed'),JSON.stringify(corrupt));assert.throws(()=>restoreBackupDirectory(source,join(dir,'tampered'),newKey),/authentication/);
 }finally{store.close();rmSync(dir,{recursive:true,force:true});}
});
test('all new state changes match the shared reducer and preserve orders and financial records',()=>{
 const {store,admin,send}=setup();try{
 const commands=[['notice_scope_save',{username:'alice',kind:'rooms_to_clean',level:'urgent'}],['notice_send',{text:'TEST parity'}],['commission_rate_save',{source:'tripcom',percent:12.5,effectiveFrom:'2027-02-01'}],['listing_draft_save',{title:'TEST room draft',url:'https://example.com/room',capacity:3,photos:[],confirmed:true}],['booking_content_save',{roomTypeId:store.read(admin).roomTypes.find(r=>r.propertyId===pid).id,photos:['https://example.com/1.jpg'],descriptions:{zh:'TEST',en:'TEST',ms:'TEST'}}]];
 for(const [type,payload] of commands){
  const before=JSON.parse(store.db.prepare('SELECT body FROM properties WHERE id=?').get(pid).body);const result=send(admin,type,payload);const audit=store.read(admin).audit.find(a=>a.id===result.id);
  const localNext=apply(before,{type,propertyId:pid,...payload,id:result.id,at:audit.at,actor:admin.username});
  const durable=JSON.parse(store.db.prepare('SELECT body FROM properties WHERE id=?').get(pid).body);
  localNext.audit=[];assert.deepEqual(durable,localNext);assert.deepEqual(durable.orders,before.orders);
 }
 assert.equal(store.notificationFeed(admin).items.some(n=>n.kind==='staff_notice'),true);
 const notice=store.read(admin).staffNotices[0];send(admin,'notification_read',{notificationId:notice.id});assert(store.read(admin).notifications.find(n=>n.id===notice.id).readAt);
 const report=operationsReports(store.read(admin),pid,'2027-02-01','2027-02-01');assert.equal(report.reminders.length,1);
 }finally{store.close();}
});
