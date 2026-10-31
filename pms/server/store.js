import {SelfCheckin,checkinPermissions} from './self-checkin.js';
import {GuestMessages,guestPermissions} from './guest-messages.js';
import {SupportDesk,supportPermissions} from './support.js';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, randomUUID, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import { seed, apply, preview } from '../src/demo-store.js';
import { InventoryConflict } from '../src/inventory.js';
import { upgradeCatalog } from '../src/catalog.js';
export class ServiceError extends Error {
  constructor(status, code) { super(code); this.status = status; }
}
const error = (status, code) => { throw new ServiceError(status, code); };
const hash = value => createHash('sha256').update(value).digest('hex');
const changedBlocks = (before,after) => {
  const a=new Map(before.map(b=>[b.id,JSON.stringify(b)])),b=new Map(after.map(b=>[b.id,JSON.stringify(b)]));
  return {before:before.filter(row=>b.get(row.id)!==a.get(row.id)),after:after.filter(row=>a.get(row.id)!==b.get(row.id))};
};
const roleTypes = {
  admin: ['rate_plan_save','rates_bulk_update','box_stays','restore_stays','create_reservation','memo_save','create','assign','edit','lock','payment','cancel','checkin','checkout','clean','block','unblock','bulk_clean','bulk_block','bulk_unblock','room_type_save','physical_room_save','suite_save','resource_update','resource_archive'],
  operations: ['box_stays','restore_stays','create_reservation','memo_save','create','assign','edit','lock','payment','cancel','checkin','checkout','clean','block','unblock','bulk_clean','bulk_block','bulk_unblock'],
  finance: ['payment'], viewer: []
};
export class Store {
  constructor(path,{messagesAdapter,selfCheckin={}}={}) {
    this.db = new DatabaseSync(path);
    // Persistent triggers reject writes from an older runtime after a code rollback.
    // Registration belongs to this connection; old code cannot accidentally inherit it.
    this.db.function('jovian_writer_generation', { deterministic: true }, () => 9);
    this.db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS schema_version (version INTEGER PRIMARY KEY);
      INSERT OR IGNORE INTO schema_version VALUES(1);
      CREATE TABLE IF NOT EXISTS properties (id TEXT PRIMARY KEY, revision INTEGER NOT NULL, body TEXT NOT NULL);
      CREATE TRIGGER IF NOT EXISTS properties_runtime_guard BEFORE UPDATE OF body ON properties
        WHEN jovian_writer_generation() < 6 BEGIN SELECT RAISE(ABORT,'incompatible_runtime'); END;
      CREATE TRIGGER IF NOT EXISTS properties_runtime_guard_v7 BEFORE UPDATE OF body ON properties
        WHEN jovian_writer_generation() < 7 BEGIN SELECT RAISE(ABORT,'incompatible_runtime'); END;
      CREATE TRIGGER IF NOT EXISTS properties_runtime_guard_v8 BEFORE UPDATE OF body ON properties
        WHEN jovian_writer_generation() < 8 BEGIN SELECT RAISE(ABORT,'incompatible_runtime'); END;
      CREATE TRIGGER IF NOT EXISTS properties_runtime_guard_v9 BEFORE UPDATE OF body ON properties
        WHEN jovian_writer_generation() < 9 BEGIN SELECT RAISE(ABORT,'incompatible_runtime'); END;
      CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, salt TEXT NOT NULL, password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('admin','operations','finance','viewer')), active INTEGER NOT NULL DEFAULT 1);
      CREATE TABLE IF NOT EXISTS user_properties (user_id TEXT NOT NULL REFERENCES users(id), property_id TEXT NOT NULL REFERENCES properties(id),
        PRIMARY KEY(user_id,property_id));
      CREATE TABLE IF NOT EXISTS used_recovery_tokens (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), used_at TEXT NOT NULL);
      CREATE TRIGGER IF NOT EXISTS recovery_no_delete BEFORE DELETE ON used_recovery_tokens BEGIN SELECT RAISE(ABORT,'recovery_append_only'); END;
      CREATE TRIGGER IF NOT EXISTS recovery_no_update BEFORE UPDATE ON used_recovery_tokens BEGIN SELECT RAISE(ABORT,'recovery_append_only'); END;
      CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), csrf TEXT NOT NULL, expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS receipts (user_id TEXT NOT NULL REFERENCES users(id), request_key TEXT NOT NULL, fingerprint TEXT NOT NULL,
        response TEXT NOT NULL, PRIMARY KEY(user_id,request_key));
      CREATE TABLE IF NOT EXISTS claims (property_id TEXT NOT NULL REFERENCES properties(id), atom TEXT NOT NULL, night TEXT NOT NULL,
        owner TEXT NOT NULL, PRIMARY KEY(property_id,atom,night));
      CREATE TABLE IF NOT EXISTS audit (id TEXT PRIMARY KEY, property_id TEXT NOT NULL REFERENCES properties(id), actor_id TEXT NOT NULL REFERENCES users(id),
        action TEXT NOT NULL, at TEXT NOT NULL, revision INTEGER NOT NULL, summary TEXT NOT NULL);
      CREATE TRIGGER IF NOT EXISTS audit_no_update BEFORE UPDATE ON audit BEGIN SELECT RAISE(ABORT,'audit_append_only'); END;
      CREATE TRIGGER IF NOT EXISTS audit_no_delete BEFORE DELETE ON audit BEGIN SELECT RAISE(ABORT,'audit_append_only'); END;`);
    this.support=new SupportDesk(this);
    this.guest=new GuestMessages(this,messagesAdapter);
    this.checkin=new SelfCheckin(this,selfCheckin);
  }
  close() { this.db.close(); }
  transaction(fn) {
    this.db.exec('BEGIN IMMEDIATE');
    try { const value = fn(); this.db.exec('COMMIT'); return value; }
    catch (e) { this.db.exec('ROLLBACK'); throw e; }
  }
  seedTestProperties() {
    return this.transaction(() => {
      const s = seed();
      for (const p of s.properties) {
        const body = { ...s, properties: [p], resources: s.resources.filter(r=>r.propertyId===p.id),
          roomTypes:s.roomTypes.filter(r=>r.propertyId===p.id),physicalRooms:s.physicalRooms.filter(r=>r.propertyId===p.id),orders: [], blocks: [], audit: [] };
        this.db.prepare('INSERT OR IGNORE INTO properties VALUES (?,0,?)').run(p.id, JSON.stringify(body));
      }
    });
  }
  createUser({ username, password, role, propertyIds }) {
    if (!/^[a-zA-Z0-9._-]{3,64}$/.test(username||'') || typeof password !== 'string' || password.length<12 || password.length>256 ||
      !Object.hasOwn(roleTypes,role) || !Array.isArray(propertyIds) || !propertyIds.length || new Set(propertyIds).size!==propertyIds.length) error(400,'user_input');
    const salt=randomBytes(16).toString('hex'), passwordHash=scryptSync(password,salt,64).toString('hex');
    return this.transaction(()=>{
      if(this.db.prepare('SELECT 1 FROM users WHERE username=?').get(username)) error(409,'username_taken');
      for(const p of propertyIds) if(!this.db.prepare('SELECT 1 FROM properties WHERE id=?').get(p)) error(400,'scope');
      const id=randomUUID();
      this.db.prepare('INSERT INTO users (id,username,salt,password_hash,role) VALUES(?,?,?,?,?)').run(id,username,salt,passwordHash,role);
      for(const p of propertyIds)this.db.prepare('INSERT INTO user_properties VALUES(?,?)').run(id,p);
      return {id,username,role,propertyIds};
    });
  }
  login(username,password) {
    if(typeof username!=='string'||typeof password!=='string'||username.length>64||password.length>256)error(401,'credentials');
    const user=this.db.prepare('SELECT * FROM users WHERE username=? AND active=1').get(username);
    const candidate=scryptSync(password,user?.salt||'00000000000000000000000000000000',64);
    if(!user||!timingSafeEqual(candidate,Buffer.from(user.password_hash,'hex')))error(401,'credentials');
    const token=randomBytes(32).toString('hex'), csrf=randomBytes(32).toString('hex');
    this.db.prepare('DELETE FROM sessions WHERE expires<?').run(Date.now());
    this.db.prepare('INSERT INTO sessions VALUES(?,?,?,?)').run(hash(token),user.id,csrf,Date.now()+8*60*60*1000);
    return { token, csrf, user:this.publicUser(user) };
  }
  recoverPassword(config, token, password, now=Date.now()) {
    const denied=()=>error(400,'recovery_invalid');
    if(!config || typeof token!=='string' || !/^[a-f0-9]{64}$/.test(token) ||
      typeof config.id!=='string' || !/^[a-zA-Z0-9_-]{8,100}$/.test(config.id) ||
      typeof config.username!=='string' || typeof config.tokenHash!=='string' || !/^[a-f0-9]{64}$/.test(config.tokenHash) ||
      !Number.isSafeInteger(config.issuedAt) || !Number.isSafeInteger(config.expiresAt) ||
      config.expiresAt<=config.issuedAt || config.expiresAt-config.issuedAt>86400000 || now<config.issuedAt || now>=config.expiresAt ||
      !timingSafeEqual(Buffer.from(hash(token),'hex'),Buffer.from(config.tokenHash,'hex')))denied();
    if(typeof password!=='string'||password.length<12||password.length>256)error(400,'password_length');
    return this.transaction(()=>{
      const user=this.db.prepare("SELECT * FROM users WHERE username=? AND role='admin' AND active=1").get(config.username);
      if(!user || this.db.prepare('SELECT 1 FROM used_recovery_tokens WHERE id=?').get(config.id))denied();
      const salt=randomBytes(16).toString('hex'),passwordHash=scryptSync(password,salt,64).toString('hex');
      this.db.prepare('UPDATE users SET salt=?,password_hash=? WHERE id=?').run(salt,passwordHash,user.id);
      this.db.prepare('DELETE FROM sessions WHERE user_id=?').run(user.id);
      this.db.prepare('INSERT INTO used_recovery_tokens VALUES(?,?,?)').run(config.id,user.id,new Date(now).toISOString());
      return {ok:true,username:user.username};
    });
  }
  publicUser(user) {
    return { id:user.id,username:user.username,role:user.role,allowedActions:[...roleTypes[user.role],...supportPermissions(user.role),...guestPermissions(user.role),...checkinPermissions(user.role)],
      propertyIds:this.db.prepare('SELECT property_id FROM user_properties WHERE user_id=? ORDER BY property_id').all(user.id).map(p=>p.property_id) };
  }
  session(token) {
    if(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token))error(401,'login_required');
    const row=this.db.prepare(`SELECT u.*,s.csrf FROM sessions s JOIN users u ON u.id=s.user_id WHERE token_hash=? AND expires>? AND u.active=1`).get(hash(token),Date.now());
    if(!row)error(401,'login_required');
    return {user:this.publicUser(row),csrf:row.csrf};
  }
  logout(token) { this.db.prepare('DELETE FROM sessions WHERE token_hash=?').run(hash(token)); }
  authorize(user,propertyId) {
    // Always re-read authorization, including on idempotency retries.
    if(!this.db.prepare('SELECT 1 FROM users WHERE id=? AND active=1').get(user.id)||
       !this.db.prepare('SELECT 1 FROM user_properties WHERE user_id=? AND property_id=?').get(user.id,propertyId))error(403,'forbidden');
  }
  read(user) {
    const fresh=this.db.prepare('SELECT * FROM users WHERE id=? AND active=1').get(user.id);
    if(!fresh)error(401,'login_required');
    const ids=this.publicUser(fresh).propertyIds;
    const result={ratePlans:[],rateCells:[],rateChanges:[],version:1,properties:[],resources:[],roomTypes:[],physicalRooms:[],reservations:[],orders:[],blocks:[],audit:[],revisions:{}};
    for(const id of ids){
      const row=this.db.prepare('SELECT * FROM properties WHERE id=?').get(id);
      const body=upgradeCatalog(JSON.parse(row.body));
      for(const field of ['ratePlans','rateCells','rateChanges','properties','resources','roomTypes','physicalRooms','reservations','orders','blocks'])result[field].push(...body[field].filter(item=>(field==='properties'?item.id:item.propertyId)===id));
      result.revisions[id]=row.revision;
    }
    result.audit=this.db.prepare(`SELECT a.*,u.username actor FROM audit a JOIN users u ON u.id=a.actor_id
      JOIN user_properties p ON p.user_id=? AND p.property_id=a.property_id ORDER BY a.at DESC LIMIT 500`).all(user.id).map(a=>({
        id:a.id,propertyId:a.property_id,type:a.action,at:a.at,actor:a.actor,revision:a.revision,...JSON.parse(a.summary) }));
    return result;
  }
  command(user,{key,expectedRevision,command},{beforeApply}={}) {
    if(typeof key!=='string'||!/^[a-zA-Z0-9_-]{8,100}$/.test(key)||!command||typeof command!=='object'||Array.isArray(command)||
       !Number.isSafeInteger(expectedRevision)||expectedRevision<0)error(400,'input');
    if (['create','edit','block','bulk_block','bulk_unblock'].includes(command.type)) {
      const {start,end}=command;
      const valid=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(Date.parse(value+'T00:00:00Z')).toISOString().slice(0,10)===value;
      if(!valid(start)||!valid(end)||end<=start||(Date.parse(end)-Date.parse(start))/86400000>366)error(400,'date_range');
    }
    const fingerprint=hash(JSON.stringify(command));
    return this.transaction(()=>{
      const rowUser=this.db.prepare('SELECT * FROM users WHERE id=? AND active=1').get(user.id);
      if(!rowUser)error(401,'login_required');
      const propertyId=command.propertyId;
      if(typeof propertyId!=='string')error(400,'input');
      this.authorize(user,propertyId);
      if(command.type==='create_reservation'&&command.mode==='checkin'&&!roleTypes[rowUser.role].includes('checkin'))error(403,'forbidden');
      if(!roleTypes[rowUser.role].includes(command.type))error(403,'forbidden');
      const prior=this.db.prepare('SELECT * FROM receipts WHERE user_id=? AND request_key=?').get(user.id,key);
      if(prior){if(prior.fingerprint!==fingerprint)error(409,'idempotency_mismatch');return {...JSON.parse(prior.response),replayed:true};}
      const row=this.db.prepare('SELECT * FROM properties WHERE id=?').get(propertyId);
      if(row.revision!==expectedRevision)error(409,'stale_revision');
      // Never accept browser-created timestamps, command IDs or an actor identity.
      const cmd={...command,id:randomUUID(),at:new Date().toISOString(),actor:rowUser.username};
      const before=upgradeCatalog(JSON.parse(row.body));
      let next;
      if(beforeApply)beforeApply(before);
      try{ next=apply(before,cmd); }
      catch(e){ if(e instanceof InventoryConflict)error(409,'inventory_conflict');error(400,e.message||'input'); }
      this.checkin.onOrderChange(before,next);
      // Database occupancy constraints include internal, unassigned reservations.
      this.db.prepare('DELETE FROM claims WHERE property_id=?').run(propertyId);
      const insert=this.db.prepare('INSERT INTO claims VALUES(?,?,?,?)');
      const add=(atoms,start,end,owner)=>{
        for(let day=start;day<end;day=new Date(Date.parse(day+'T00:00:00Z')+86400000).toISOString().slice(0,10))
          for(const atom of atoms)insert.run(propertyId,atom,day,owner);
      };
      for(const p of preview(next,propertyId))add(p.atoms,p.start,p.end,p.demandId);
      // Overlapping operational blocks are allowed, but cannot overlap a reservation.
      for(const b of next.blocks)for(let day=b.start;day<b.end;day=new Date(Date.parse(day+'T00:00:00Z')+86400000).toISOString().slice(0,10))for(const atom of b.atoms){
        const prior=this.db.prepare('SELECT owner FROM claims WHERE property_id=? AND atom=? AND night=?').get(propertyId,atom,day);
        if(prior&&!prior.owner.startsWith('block:'))error(409,'inventory_conflict');
        if(!prior)insert.run(propertyId,atom,day,`block:${b.id}`);
      }
      const revision=row.revision+1;
      next.audit=[]; // Durable audit is stored separately, never trusted from the browser.
      this.db.prepare('UPDATE properties SET revision=?,body=? WHERE id=?').run(revision,JSON.stringify(next),propertyId);
      const catalogEntity = body => cmd.type==='room_type_save' ? body.roomTypes.find(t=>t.id===(cmd.roomTypeId||cmd.id)) :
        cmd.type==='physical_room_save' ? body.physicalRooms.find(r=>r.id===(cmd.physicalRoomId||`${cmd.id}-space`)) :
        body.resources.find(r=>r.id===(cmd.resourceId||cmd.id));
      const summary={...(cmd.type==='create_reservation'?{reservationId:cmd.id,stayIds:next.reservations.find(r=>r.id===cmd.id).stayIds}:{}),orderId:cmd.type==='create'?cmd.id:cmd.orderId||null,resourceId:cmd.resourceId||null,
        ...(cmd.roomTypeId?{roomTypeId:cmd.roomTypeId}:{}),
        ...(cmd.physicalRoomId?{physicalRoomId:cmd.physicalRoomId}:{}),
        ...(['room_type_save','physical_room_save','suite_save','resource_update','resource_archive'].includes(cmd.type)?{catalogChange:{
          before:catalogEntity(before)||null,after:catalogEntity(next)||null}}:{}),
        ...(cmd.resourceIds?{resourceIds:cmd.resourceIds,cleaning:cmd.cleaning||null,start:cmd.start||null,end:cmd.end||null}:{}),
        ...(['box_stays','restore_stays'].includes(cmd.type)?{stayIds:cmd.orderIds,inventoryChange:{before:before.orders.filter(o=>cmd.orderIds.includes(o.id)).map(o=>({id:o.id,inventoryStatus:o.inventoryStatus||'reserved',resourceId:o.resourceId})),after:next.orders.filter(o=>cmd.orderIds.includes(o.id)).map(o=>({id:o.id,inventoryStatus:o.inventoryStatus,resourceId:o.resourceId})),reason:cmd.reason}}:{}),
        ...(['block','unblock','bulk_block','bulk_unblock'].includes(cmd.type)?{blockChange:changedBlocks(before.blocks,next.blocks)}:{}),
        fields:Object.keys(command).filter(k=>!['type','propertyId'].includes(k)),
        ...(cmd.type==='payment'?{kind:cmd.kind,amount:cmd.amount,method:cmd.method}:{})};
      this.db.prepare('INSERT INTO audit VALUES(?,?,?,?,?,?,?)').run(cmd.id,propertyId,user.id,cmd.type,cmd.at,revision,JSON.stringify(summary));
      const response={id:cmd.id,propertyId,revision};
      this.db.prepare('INSERT INTO receipts VALUES(?,?,?,?)').run(user.id,key,fingerprint,JSON.stringify(response));
      return response;
    });
  }
}
