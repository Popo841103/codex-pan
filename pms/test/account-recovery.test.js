import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,randomUUID,createHash} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Store} from '../server/store.js';
import {makeServer} from '../server/http.js';
const oldPassword='TEST old password 123',newPassword='TEST new password 456';
function fixture(t,path=':memory:'){
 const store=new Store(path);store.seedTestProperties();
 const user=store.createUser({username:'test-admin',password:oldPassword,role:'admin',propertyIds:['TEST-KL']});
 const token=randomBytes(32).toString('hex'),now=Date.now();
 const config={id:randomUUID(),username:'test-admin',tokenHash:createHash('sha256').update(token).digest('hex'),issuedAt:now-1000,expiresAt:now+3600000};
 t.after(()=>{try{store.close();}catch{}});return {store,user,token,config,now};
}
test('one-time recovery preserves property data, revokes sessions and changes only the target password',t=>{
 const {store,user,token,config}=fixture(t);
 store.command(user,{key:randomUUID(),expectedRevision:0,command:{type:'create',propertyId:'TEST-KL',guest:'TEST only',productId:'room',gender:'any',start:'2027-01-10',end:'2027-01-12'}});
 const other=store.createUser({username:'test-other',password:oldPassword,role:'operations',propertyIds:['TEST-KL']});
 const oldSession=store.login('test-admin',oldPassword),otherSession=store.login(other.username,oldPassword),before=store.read(user);
 assert.deepEqual(store.recoverPassword(config,token,newPassword),{ok:true,username:'test-admin'});
 assert.deepEqual(store.read(user),before);
 assert.throws(()=>store.login('test-admin',oldPassword),/credentials/);
 assert.throws(()=>store.session(oldSession.token),/login_required/);
 assert.equal(store.login('test-admin',newPassword).user.id,user.id);
 assert.equal(store.session(otherSession.token).user.id,other.id);
 assert.throws(()=>store.recoverPassword(config,token,'ANOTHER TEST password'),/recovery_invalid/);
});
test('invalid, expired, future, disabled or oversized recovery grants do not change the account',t=>{
 const {store,token,config,now}=fixture(t);
 for(const candidate of [null,{...config,expiresAt:now-1},{...config,issuedAt:now+1},{...config,expiresAt:config.issuedAt+86400001},{...config,username:'missing'}])assert.throws(()=>store.recoverPassword(candidate,token,newPassword,now),/recovery_invalid/);
 assert.throws(()=>store.recoverPassword(config,'0'.repeat(64),newPassword,now),/recovery_invalid/);
 assert.throws(()=>store.recoverPassword(config,token,'short',now),/password_length/);
 assert.ok(store.login('test-admin',oldPassword));
 assert.ok(store.recoverPassword(config,token,newPassword,now));
});
test('used grants remain consumed after database reopen and cannot be deleted or updated',t=>{
 const folder=mkdtempSync(join(tmpdir(),'pms-recovery-test-'));
 const path=join(folder,'test.sqlite'),{store,token,config}=fixture(t,path);
 store.recoverPassword(config,token,newPassword);store.close();
 const reopened=new Store(path);
 t.after(()=>{try{reopened.close();}finally{rmSync(folder,{recursive:true,force:true});}});
 assert.throws(()=>reopened.recoverPassword(config,token,'REPLAY TEST password'),/recovery_invalid/);
 assert.throws(()=>reopened.db.prepare('DELETE FROM used_recovery_tokens').run(),/recovery_append_only/);
 assert.throws(()=>reopened.db.prepare("UPDATE used_recovery_tokens SET used_at='x'").run(),/recovery_append_only/);
 assert.ok(reopened.login('test-admin',newPassword));
});
test('HTTP recovery requires the exact origin, does not expose config, and keeps anonymous inventory protected',async t=>{
 const {store,token,config}=fixture(t),server=makeServer(store,{recovery:config});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 t.after(()=>new Promise(resolve=>{server.closeAllConnections();server.close(resolve);}));
 const base='http://127.0.0.1:'+server.address().port;
 const post=(body,origin=base)=>fetch(base+'/api/account-recovery',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
 assert.equal((await fetch(base+'/server/account-recovery.json')).status,404);
 assert.equal((await fetch(base+'/api/state')).status,401);
 assert.equal((await post({token,password:newPassword},'https://evil.example')).status,403);
 const response=await post({token,password:newPassword});assert.equal(response.status,200);assert.deepEqual(await response.json(),{ok:true,username:'test-admin'});
 assert.match(response.headers.get('set-cookie'),/Max-Age=0/);
 assert.equal((await fetch(base+'/api/state')).status,401);
 assert.equal((await post({token,password:newPassword})).status,400);
});
test('HTTP recovery attempts are bounded independently of login',async t=>{
 const {store,token,config}=fixture(t),server=makeServer(store,{recovery:config});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 t.after(()=>new Promise(resolve=>{server.closeAllConnections();server.close(resolve);}));
 const base='http://127.0.0.1:'+server.address().port;
 for(let i=0;i<10;i++)assert.equal((await fetch(base+'/api/account-recovery',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({token:'bad',password:newPassword})})).status,400);
 assert.equal((await fetch(base+'/api/account-recovery',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({token,password:newPassword})})).status,429);
 assert.equal((await fetch(base+'/api/login',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({username:'test-admin',password:oldPassword})})).status,200);
});
