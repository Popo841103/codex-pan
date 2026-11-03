import {randomBytes,randomUUID,randomInt,createHash,createHmac,createCipheriv,createDecipheriv} from 'node:crypto';
import {readFileSync,writeFileSync,lstatSync} from 'node:fs';
import {folio} from '../src/demo-store.js';
import {isBoxed} from '../src/inventory-actions.js';
import {isClean,overlapsAtoms} from '../src/catalog.js';
export class CheckinError extends Error {constructor(status,code){super(code);this.status=status;}}
const fail=(status,code)=>{throw new CheckinError(status,code);};
const sha=value=>createHash('sha256').update(value).digest('hex');
const text=(value,max,required=false)=>{if(typeof value!=='string'||value.length>max||required&&!value.trim())fail(400,'checkin_input');return value.trim();};
const doc=value=>text(value,30,true).replace(/[ -]/g,'').toUpperCase();
const count=order=>(order.adults||1)+(order.children||0)+(order.infants||0);
const signature=order=>sha(JSON.stringify([order.id,order.propertyId,order.resourceId,order.start,order.end,order.arrivalTime||'15:00',order.departureTime||'12:00',count(order)]));
export const checkinPermissions=role=>['admin','operations'].includes(role)?['sc_read','sc_invite','sc_revoke','sc_review','sc_document',...(role==='admin'?['sc_policy_save']:[])]:[];
export function loadOrCreateGuestKey(path,{allowCreate=true}={}){
  if(!allowCreate){try{lstatSync(path);}catch{throw new Error('Existing encrypted guest data requires its original guest data key.');}}
  try{writeFileSync(path,randomBytes(32),{flag:'wx',mode:0o600});}catch(error){if(error.code!=='EEXIST')throw new Error('Guest data key could not be created.');}
  const stat=lstatSync(path);if(!stat.isFile()||stat.isSymbolicLink()||(stat.mode&0o077)!==0)throw new Error('Guest data key must be a private regular file.');
  const key=readFileSync(path);if(key.length!==32)throw new Error('Guest data key has an invalid length.');return key;
}
const disconnected={status:()=>({provider:'tthotel',connected:false,tested:false}),provision:async()=>fail(503,'checkin_lock_offline')};
const defaults=()=>({enabled:false,requirePayment:true,requiredDeposit:0,registrationMode:'all',instructions:'',revision:0});
export class SelfCheckin {
  constructor(store,{key=null,clock=()=>Date.now(),accessProvider=disconnected}={}){
    if(key!==null&&(!Buffer.isBuffer(key)||key.length!==32))throw Error('Invalid guest data key');
    this.store=store;this.db=store.db;this.key=key;this.clock=clock;this.access=accessProvider;
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sc_policies(property_id TEXT PRIMARY KEY REFERENCES properties(id),revision INTEGER NOT NULL,body TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS sc_grants(id TEXT PRIMARY KEY,property_id TEXT NOT NULL REFERENCES properties(id),order_id TEXT NOT NULL,creator_id TEXT NOT NULL REFERENCES users(id),token_hash TEXT UNIQUE NOT NULL,code_hash TEXT NOT NULL,
        expires_at INTEGER NOT NULL,status TEXT NOT NULL,revision INTEGER NOT NULL,submission TEXT,document_hashes TEXT,review TEXT NOT NULL,reviewer_id TEXT,approved_sig TEXT,created_at TEXT NOT NULL,rejection_reason TEXT);
      CREATE TABLE IF NOT EXISTS sc_sessions(token_hash TEXT PRIMARY KEY,grant_id TEXT NOT NULL REFERENCES sc_grants(id),expires_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS sc_receipts(user_id TEXT NOT NULL REFERENCES users(id),request_key TEXT NOT NULL,fingerprint TEXT NOT NULL,response TEXT NOT NULL,PRIMARY KEY(user_id,request_key));
      CREATE TABLE IF NOT EXISTS sc_access(id TEXT PRIMARY KEY,grant_id TEXT NOT NULL REFERENCES sc_grants(id),order_sig TEXT NOT NULL,status TEXT NOT NULL,pin TEXT,external_id TEXT,reason TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,UNIQUE(grant_id,order_sig));
      CREATE TABLE IF NOT EXISTS sc_audit(id TEXT PRIMARY KEY,property_id TEXT NOT NULL,grant_id TEXT,actor_id TEXT,action TEXT NOT NULL,at TEXT NOT NULL,summary TEXT NOT NULL);
      CREATE TRIGGER IF NOT EXISTS sc_audit_no_update BEFORE UPDATE ON sc_audit BEGIN SELECT RAISE(ABORT,'checkin_append_only'); END;
      CREATE TRIGGER IF NOT EXISTS sc_audit_no_delete BEFORE DELETE ON sc_audit BEGIN SELECT RAISE(ABORT,'checkin_append_only'); END;
    `);
    // Why a registration was sent back is kept with it, so the guest is told what to
    // correct instead of being left staring at a refusal. Older databases predate the
    // column and are widened here rather than being recreated.
    if(!this.db.prepare('PRAGMA table_info(sc_grants)').all().some(c=>c.name==='rejection_reason'))
      this.db.exec('ALTER TABLE sc_grants ADD COLUMN rejection_reason TEXT');
  }
  now(){return this.clock();}
  actor(user,pid,action){const actor=this.db.prepare('SELECT id,role,username FROM users WHERE id=? AND active=1').get(user.id);if(!actor)fail(401,'login_required');this.store.authorize(actor,pid);if(!checkinPermissions(actor.role).includes(action))fail(403,'forbidden');return actor;}
  policy(pid){const row=this.db.prepare('SELECT * FROM sc_policies WHERE property_id=?').get(pid);return row?{...JSON.parse(row.body),revision:row.revision}:defaults();}
  body(pid){const row=this.db.prepare('SELECT body FROM properties WHERE id=?').get(pid);if(!row)fail(400,'scope');return JSON.parse(row.body);}
  order(grant,body=this.body(grant.property_id)){const order=body.orders.find(o=>o.id===grant.order_id&&o.propertyId===grant.property_id);if(!order)fail(400,'checkin_unavailable');return order;}
  grant(id,pid){const grant=this.db.prepare('SELECT * FROM sc_grants WHERE id=? AND property_id=?').get(id,pid);if(!grant)fail(404,'checkin_not_found');return grant;}
  crypt(value,aad){if(!this.key)fail(503,'checkin_key_missing');const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',this.key,iv);cipher.setAAD(Buffer.from(aad));const encrypted=Buffer.concat([cipher.update(JSON.stringify(value)),cipher.final()]);return JSON.stringify([iv.toString('base64'),cipher.getAuthTag().toString('base64'),encrypted.toString('base64')]);}
  decrypt(value,aad){if(!this.key)fail(503,'checkin_key_missing');try{const [iv,tag,data]=JSON.parse(value).map(v=>Buffer.from(v,'base64')),cipher=createDecipheriv('aes-256-gcm',this.key,iv);cipher.setAAD(Buffer.from(aad));cipher.setAuthTag(tag);return JSON.parse(Buffer.concat([cipher.update(data),cipher.final()]).toString());}catch{fail(503,'checkin_data_unavailable');}}
  documentHash(value){if(!this.key)fail(503,'checkin_key_missing');return createHmac('sha256',this.key).update('document:'+doc(value)).digest('hex');}
  audit(pid,id,actor,action,summary={}){this.db.prepare('INSERT INTO sc_audit VALUES(?,?,?,?,?,?,?)').run(randomUUID(),pid,id||null,actor?.id||null,action,new Date(this.now()).toISOString(),JSON.stringify(summary));}
  times(order){return {start:Date.parse(order.start+'T'+(order.arrivalTime||'15:00')+':00+08:00'),end:Date.parse(order.end+'T'+(order.departureTime||'12:00')+':00+08:00')};}
  valid(grant){if(!grant||grant.status!=='active'||grant.expires_at<=this.now()||!this.policy(grant.property_id).enabled)fail(401,'checkin_unavailable');const order=this.order(grant);if(!['confirmed','checked_in'].includes(order.status)||isBoxed(order))fail(401,'checkin_unavailable');return grant;}
  auth(token){if(typeof token!=='string'||!/^[-_a-zA-Z0-9]{43}$/.test(token))fail(401,'checkin_unavailable');let grant=this.db.prepare('SELECT * FROM sc_grants WHERE token_hash=?').get(sha(token));if(!grant){const session=this.db.prepare('SELECT * FROM sc_sessions WHERE token_hash=? AND expires_at>?').get(sha(token),this.now());if(session)grant=this.db.prepare('SELECT * FROM sc_grants WHERE id=?').get(session.grant_id);}return this.valid(grant);}
  conditions(grant,body=this.body(grant.property_id)){
    const order=this.order(grant,body),policy=this.policy(grant.property_id),resource=body.resources.find(r=>r.id===order.resourceId),times=this.times(order),reasons=[];
    if(!policy.enabled||!['confirmed','checked_in'].includes(order.status)||isBoxed(order))reasons.push('checkin_unavailable');
    const reviewer=grant.reviewer_id&&this.db.prepare("SELECT 1 FROM users u JOIN user_properties p ON p.user_id=u.id WHERE u.id=? AND u.active=1 AND u.role IN ('admin','operations') AND p.property_id=?").get(grant.reviewer_id,grant.property_id);
    if(grant.review!=='approved'||grant.approved_sig!==signature(order)||!reviewer)reasons.push('checkin_review_pending');
    if(this.now()<times.start||this.now()>=times.end)reasons.push('checkin_time');
    if(policy.requirePayment&&folio(order).due>0)reasons.push('checkin_payment');
    if(folio(order).deposit<policy.requiredDeposit)reasons.push('checkin_deposit');
    if(!resource||resource.archived)reasons.push('checkin_assignment');
    else{
      if(!isClean(body,resource))reasons.push('checkin_cleaning');
      if(body.blocks.some(b=>b.propertyId===grant.property_id&&b.start<order.end&&b.end>order.start&&b.atoms.some(a=>resource.atoms.includes(a))))reasons.push('checkin_blocked');
      if(body.orders.some(o=>o.id!==order.id&&o.status==='checked_in'&&body.resources.some(r=>r.id===o.resourceId&&overlapsAtoms(r,resource))))reasons.push('checkin_occupied');
    }
    if(grant.review==='approved'&&grant.submission){
      const people=this.decrypt(grant.submission,grant.id+':people');
      if(people.length<(policy.registrationMode==='all'?count(order):1))reasons.push('checkin_people');
      const names=Array.from({length:count(order)},(_,i)=>people[i]?.name||order.occupants?.[i]?.name||'');
      if(names.some(name=>!name))reasons.push('checkin_people');
    }
    return {order,policy,resource,times,reasons};
  }
  read(user,pid){this.actor(user,pid,'sc_read');const grants=this.db.prepare('SELECT * FROM sc_grants WHERE property_id=? ORDER BY rowid DESC').all(pid).map(grant=>{
    const {order,reasons}=this.conditions(grant);const people=grant.submission?this.decrypt(grant.submission,grant.id+':people'):[];
    return {id:grant.id,orderId:order.id,guest:order.guest,revision:grant.revision,status:grant.status,review:grant.review,expiresAt:grant.expires_at,registered:people.length,required:this.policy(pid).registrationMode==='all'?count(order):1,
      rejectionReason:grant.review==='rejected'?grant.rejection_reason||null:null,
      people:people.map(person=>({name:person.name,documentType:person.documentType,documentLast4:person.documentNumber.slice(-4)})),reasons,access:this.db.prepare('SELECT id,status,reason FROM sc_access WHERE grant_id=? ORDER BY rowid DESC').all(grant.id)};
  });return {propertyId:pid,policy:this.policy(pid),lock:this.access.status(pid),encryptionReady:!!this.key,grants};}
  command(user,{key,expectedRevision,command}){
    if(typeof key!=='string'||!/^[a-zA-Z0-9_-]{8,100}$/.test(key)||!Number.isSafeInteger(expectedRevision)||expectedRevision<0||!command||typeof command.propertyId!=='string')fail(400,'checkin_input');
    const {propertyId:pid,type}=command,actor=this.actor(user,pid,type),fingerprint=sha(JSON.stringify(command));
    return this.store.transaction(()=>{
      const prior=this.db.prepare('SELECT * FROM sc_receipts WHERE user_id=? AND request_key=?').get(actor.id,key);
      if(prior){if(prior.fingerprint!==fingerprint)fail(409,'idempotency_mismatch');const stored=JSON.parse(prior.response),response=stored.sealed?this.decrypt(stored.sealed,actor.id+':'+key):stored;if(response.grantId){const existing=this.grant(response.grantId,pid);if(type==='sc_invite')this.valid(existing);}return {...response,replayed:true};}
      let response;
      if(type==='sc_policy_save'){
        const current=this.policy(pid);if(current.revision!==expectedRevision)fail(409,'checkin_stale');
        if(typeof command.enabled!=='boolean'||typeof command.requirePayment!=='boolean'||!['all','one_per_stay'].includes(command.registrationMode)||!Number.isSafeInteger(command.requiredDeposit)||command.requiredDeposit<0||command.requiredDeposit>100000000)fail(400,'checkin_input');
        const next={enabled:command.enabled,requirePayment:command.requirePayment,requiredDeposit:command.requiredDeposit,registrationMode:command.registrationMode,instructions:text(command.instructions??'',3000)};
        this.db.prepare('INSERT INTO sc_policies VALUES(?,?,?) ON CONFLICT(property_id) DO UPDATE SET revision=excluded.revision,body=excluded.body').run(pid,current.revision+1,JSON.stringify(next));
        this.audit(pid,null,actor,type,{before:current,after:next});response={revision:current.revision+1};
      }else if(type==='sc_invite'){
        if(!this.key)fail(503,'checkin_key_missing');if(!this.policy(pid).enabled)fail(400,'checkin_disabled');if(expectedRevision!==0)fail(409,'checkin_stale');
        const order=this.order({order_id:command.orderId,property_id:pid}),end=this.times(order).end;if(!['confirmed','checked_in'].includes(order.status)||isBoxed(order)||end<=this.now())fail(400,'checkin_unavailable');
        const id=randomUUID(),token=randomBytes(32).toString('base64url'),accessCode=randomBytes(12).toString('hex'),expiry=Math.min(end,this.now()+30*86400000);
        const old=this.db.prepare("SELECT id FROM sc_grants WHERE property_id=? AND order_id=? AND status='active'").all(pid,order.id);
        for(const previous of old){this.db.prepare("UPDATE sc_grants SET status='revoked',revision=revision+1 WHERE id=?").run(previous.id);this.db.prepare("UPDATE sc_access SET status='revoke_pending',pin=NULL,reason='invite_replaced' WHERE grant_id=? AND status IN ('active','provisioning','unknown')").run(previous.id);}
        this.db.prepare('INSERT INTO sc_grants VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(id,pid,order.id,actor.id,sha(token),sha(accessCode),expiry,'active',1,null,null,'unsubmitted',null,null,new Date(this.now()).toISOString(),null);
        this.audit(pid,id,actor,type,{orderId:order.id});
        // Retry credentials are sealed; neither receipts nor audit contain plaintext tokens.
        response={grantId:id,revision:1,token,accessCode,expiresAt:expiry};
      }else{
        const grant=this.grant(command.grantId,pid);if(grant.revision!==expectedRevision)fail(409,'checkin_stale');
        if(type==='sc_document'){
          text(command.reason,500,true);this.audit(pid,grant.id,actor,type,{reason:command.reason});return {grantId:grant.id,people:grant.submission?this.decrypt(grant.submission,grant.id+':people'):[]};
        }
        if(type==='sc_revoke'){
          text(command.reason,500,true);this.db.prepare("UPDATE sc_grants SET status='revoked',revision=revision+1 WHERE id=?").run(grant.id);
          this.db.prepare("UPDATE sc_access SET status='revoke_pending',pin=NULL,reason='invite_revoked' WHERE grant_id=? AND status IN ('active','provisioning','unknown')").run(grant.id);
        }else if(type==='sc_review'){
          if(grant.status!=='active'||!grant.submission||!['approved','rejected'].includes(command.review))fail(400,'checkin_input');
          const reason=text(command.reason,500,true),order=this.order(grant),people=this.decrypt(grant.submission,grant.id+':people'),required=this.policy(pid).registrationMode==='all'?count(order):1;
          if(command.review==='approved'&&people.length<required)fail(400,'checkin_people');
          // A refusal is only useful to the guest if it says what to put right, so the
          // reason is stored with the registration and shown on their own page.
          this.db.prepare('UPDATE sc_grants SET review=?,reviewer_id=?,approved_sig=?,rejection_reason=?,revision=revision+1 WHERE id=?').run(command.review,actor.id,command.review==='approved'?signature(order):null,command.review==='rejected'?reason:null,grant.id);
        }else fail(400,'checkin_input');
        this.audit(pid,grant.id,actor,type,{review:command.review||null,reason:command.reason});response={grantId:grant.id,revision:grant.revision+1};
      }
      this.db.prepare('INSERT INTO sc_receipts VALUES(?,?,?,?)').run(actor.id,key,fingerprint,JSON.stringify(type==='sc_invite'?{sealed:this.crypt(response,actor.id+':'+key)}:response));return response;
    });
  }
  lookup({propertyId,identifier,accessCode}){
    let grant;try{const code=text(accessCode,100,true).toLowerCase();grant=this.db.prepare("SELECT * FROM sc_grants WHERE property_id=? AND code_hash=? AND status='active'").get(text(propertyId,100,true),sha(code));this.valid(grant);const order=this.order(grant),value=text(identifier,100,true);
      const matches=value===order.id||value===order.channelOrderId||grant.review==='approved'&&JSON.parse(grant.document_hashes||'[]').includes(this.documentHash(value));if(!matches)throw Error();
    }catch{fail(400,'checkin_lookup');}
    const token=randomBytes(32).toString('base64url');this.db.prepare('INSERT INTO sc_sessions VALUES(?,?,?)').run(sha(token),grant.id,Math.min(grant.expires_at,this.now()+3600000));return {token};
  }
  session(token){const grant=this.auth(token),{order,resource,reasons,policy,times}=this.conditions(grant),lock=this.access.status(grant.property_id),job=this.db.prepare('SELECT * FROM sc_access WHERE grant_id=? AND order_sig=?').get(grant.id,signature(order));
    const active=job?.status==='active'&&!reasons.length;return {grantId:grant.id,revision:grant.revision,propertyName:this.body(grant.property_id).properties.find(p=>p.id===grant.property_id)?.name,guest:order.guest,start:order.start,end:order.end,review:grant.review,registrationMode:policy.registrationMode,requiredPeople:policy.registrationMode==='all'?count(order):1,
      registeredPeople:grant.submission?this.decrypt(grant.submission,grant.id+':people').length:0,reasons,
      // A refusal the guest can read: why they were sent back, not just that they were.
      rejectionReason:grant.review==='rejected'?grant.rejection_reason||null:null,
      room:!reasons.length?resource?.label:null,instructions:!reasons.length?policy.instructions:'',lock:{connected:lock.connected,tested:lock.tested},accessStatus:job?.status||(!lock.connected?'not_connected':'not_requested'),canRequestAccess:!reasons.length&&lock.connected&&lock.tested,
      ...(active?{pin:this.decrypt(job.pin,job.id+':pin'),validFrom:times.start,validUntil:times.end}:{})};}
  register(token,{revision,people,consent}){
    const grant=this.auth(token);if(!this.key)fail(503,'checkin_key_missing');if(consent!==true||!Number.isSafeInteger(revision)||!Array.isArray(people)||!people.length||people.length>20)fail(400,'checkin_input');
    const order=this.order(grant),required=this.policy(grant.property_id).registrationMode==='all'?count(order):1;
    if(people.length!==required)fail(400,'checkin_people');
    const normalized=people.map(person=>{if(!['passport','identity'].includes(person?.documentType))fail(400,'checkin_input');const number=doc(person.documentNumber);if(!/^[A-Z0-9]{5,30}$/.test(number))fail(400,'checkin_document');return {name:text(person.name,100,true),documentType:person.documentType,documentNumber:number};});
    return this.store.transaction(()=>{
      const fresh=this.auth(token);if(fresh.revision!==revision)fail(409,'checkin_stale');
      if(this.db.prepare("SELECT 1 FROM sc_access WHERE grant_id=? AND status IN ('active','provisioning','unknown')").get(fresh.id))fail(400,'checkin_access_pending');
      this.db.prepare("UPDATE sc_grants SET submission=?,document_hashes=?,review='pending',reviewer_id=NULL,approved_sig=NULL,rejection_reason=NULL,revision=revision+1 WHERE id=?").run(this.crypt(normalized,fresh.id+':people'),JSON.stringify(normalized.map(p=>this.documentHash(p.documentNumber))),fresh.id);
      this.audit(fresh.property_id,fresh.id,null,'guest_registration',{people:normalized.length});return this.session(token);
    });
  }
  onOrderChange(before,next){
    const current=new Map(next.orders.map(order=>[order.id,order]));
    for(const order of before.orders){const updated=current.get(order.id);if(!updated)continue;
      if(signature(order)===signature(updated)&&order.status===updated.status&&isBoxed(order)===isBoxed(updated))continue;
      const grants=this.db.prepare("SELECT id FROM sc_grants WHERE order_id=? AND property_id=? AND status='active'").all(order.id,order.propertyId);
      for(const grant of grants){
        if(signature(order)!==signature(updated))this.db.prepare("UPDATE sc_grants SET review=CASE WHEN submission IS NULL THEN 'unsubmitted' ELSE 'pending' END,approved_sig=NULL,rejection_reason=NULL,revision=revision+1 WHERE id=?").run(grant.id);
        if(signature(order)!==signature(updated)||['cancelled','checked_out'].includes(updated.status)||isBoxed(updated))this.db.prepare("UPDATE sc_access SET status='revoke_pending',pin=NULL,reason='order_changed' WHERE grant_id=? AND status IN ('active','provisioning','unknown')").run(grant.id);
      }
    }
  }
  async requestAccess(token){
    let grant=this.auth(token),checks=this.conditions(grant);if(checks.reasons.length)fail(400,checks.reasons[0]);const provider=this.access.status(grant.property_id);
    if(!provider.connected||!provider.tested)fail(503,'checkin_lock_offline');
    let job=this.db.prepare('SELECT * FROM sc_access WHERE grant_id=? AND order_sig=?').get(grant.id,signature(checks.order));if(job)return this.session(token);
    const id=randomUUID(),pin=String(randomInt(100000,1000000)),at=new Date(this.now()).toISOString(),sig=signature(checks.order);
    this.store.transaction(()=>{grant=this.auth(token);checks=this.conditions(grant);if(checks.reasons.length)fail(400,checks.reasons[0]);this.db.prepare('INSERT INTO sc_access VALUES(?,?,?,?,?,?,?,?,?)').run(id,grant.id,sig,'provisioning',this.crypt(pin,id+':pin'),null,null,at,at);this.audit(grant.property_id,grant.id,null,'access_requested',{accessId:id});});
    let result;try{result=await this.access.provision({propertyId:grant.property_id,resourceId:checks.order.resourceId,from:checks.times.start,until:checks.times.end,pin,requestId:id});}catch{this.db.prepare("UPDATE sc_access SET status='unknown',reason='provider_uncertain',updated_at=? WHERE id=? AND status='provisioning'").run(new Date(this.now()).toISOString(),id);return this.session(token);}
    if(result?.deviceConfirmed===true&&typeof result.externalId==='string'&&result.externalId){
      try{
        const freshGrant=this.auth(token),freshOrder=this.order(freshGrant);
        if(freshOrder.status==='confirmed'){
          const reviewer=this.db.prepare('SELECT id FROM users WHERE id=? AND active=1').get(freshGrant.reviewer_id);if(!reviewer)fail(400,'checkin_review_pending');
          this.store.command(reviewer,{key:'sc-'+id,expectedRevision:this.db.prepare('SELECT revision FROM properties WHERE id=?').get(grant.property_id).revision,command:{type:'checkin',propertyId:grant.property_id,orderId:freshOrder.id,date:new Date(this.now()+8*3600000).toISOString().slice(0,10)}},{beforeApply:body=>{
            const latest=this.auth(token),latestChecks=this.conditions(latest,body);if(latestChecks.reasons.length||signature(latestChecks.order)!==sig)fail(400,'checkin_unavailable');
            const people=this.decrypt(latest.submission,latest.id+':people');latestChecks.order.roomTypeId??=latestChecks.resource.roomTypeId;latestChecks.order.occupants=Array.from({length:count(latestChecks.order)},(_,i)=>({name:people[i]?.name||latestChecks.order.occupants?.[i]?.name||'',gender:latestChecks.order.occupants?.[i]?.gender||latestChecks.order.gender}));
          }});
        }
      }catch{this.db.prepare("UPDATE sc_access SET status='revoke_pending',pin=NULL,external_id=?,reason='checkin_update_failed' WHERE id=?").run(result.externalId,id);return this.session(token);}
    }
    this.store.transaction(()=>{
      const fresh=this.db.prepare('SELECT * FROM sc_grants WHERE id=?').get(grant.id),order=this.order(fresh),record=this.db.prepare('SELECT * FROM sc_access WHERE id=?').get(id);
      if(fresh.status!=='active'||signature(order)!==sig||record.status!=='provisioning'||this.conditions(fresh).reasons.length){this.db.prepare("UPDATE sc_access SET status='revoke_pending',pin=NULL,external_id=?,reason='conditions_changed' WHERE id=?").run(result?.externalId||null,id);return;}
      if(result?.deviceConfirmed!==true||typeof result.externalId!=='string'||!result.externalId){this.db.prepare("UPDATE sc_access SET status='unknown',reason='device_unconfirmed' WHERE id=?").run(id);return;}
      this.db.prepare("UPDATE sc_access SET status='active',external_id=?,updated_at=? WHERE id=?").run(result.externalId,new Date(this.now()).toISOString(),id);this.audit(grant.property_id,grant.id,null,'access_device_confirmed',{accessId:id});
    });return this.session(token);
  }
}
