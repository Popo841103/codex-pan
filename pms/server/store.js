import {SelfCheckin,checkinPermissions} from './self-checkin.js';
import {GuestMessages,guestPermissions} from './guest-messages.js';
import {SupportDesk,supportPermissions} from './support.js';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, randomUUID, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import { seed, apply, preview } from '../src/demo-store.js';
import { InventoryConflict } from '../src/inventory.js';
import { upgradeCatalog, saleResources } from '../src/catalog.js';
import { rateAvailability } from '../src/rate-availability.js';
import { localDay } from '../src/dashboard.js';
export class ServiceError extends Error {
  constructor(status, code) { super(code); this.status = status; }
}
const error = (status, code) => { throw new ServiceError(status, code); };
const hash = value => createHash('sha256').update(value).digest('hex');
const stayTypes=['edit','assign','checkin','checkout','cancel','lock'];
const staySnapshot=(body,id)=>{const order=(body?.orders||[]).find(o=>o.id===id);return order?{start:order.start,end:order.end,
  nightly:order.nightly,resourceId:order.resourceId,status:order.status,productId:order.productId,finalCharge:order.finalCharge??null}:null;};

const changedBlocks = (before,after) => {
  const a=new Map(before.map(b=>[b.id,JSON.stringify(b)])),b=new Map(after.map(b=>[b.id,JSON.stringify(b)]));
  return {before:before.filter(row=>b.get(row.id)!==a.get(row.id)),after:after.filter(row=>a.get(row.id)!==b.get(row.id))};
};
const roleTypes = {
  admin: ['settle','reopen_folio','rate_plan_save','rate_plan_archive','rates_bulk_update','box_stays','restore_stays','create_reservation','memo_save','create','assign','edit','lock','payment','cancel','checkin','checkout','clean','block','unblock','bulk_clean','bulk_block','bulk_unblock','room_type_save','physical_room_save','suite_save','resource_update','resource_archive','business_date_init','night_audit','shift_save','shift_delete','shift_handover','member_save','site_save'],
  operations: ['settle','box_stays','restore_stays','create_reservation','memo_save','create','assign','edit','lock','payment','cancel','checkin','checkout','clean','block','unblock','bulk_clean','bulk_block','bulk_unblock','night_audit','shift_handover'],
  finance: ['settle','payment'], viewer: []
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
      CREATE TABLE IF NOT EXISTS member_audit (id TEXT PRIMARY KEY, actor_id TEXT NOT NULL REFERENCES users(id), target_id TEXT NOT NULL REFERENCES users(id),
        action TEXT NOT NULL, at TEXT NOT NULL, summary TEXT NOT NULL);
      CREATE TRIGGER IF NOT EXISTS member_audit_no_update BEFORE UPDATE ON member_audit BEGIN SELECT RAISE(ABORT,'member_audit_append_only'); END;
      CREATE TRIGGER IF NOT EXISTS member_audit_no_delete BEFORE DELETE ON member_audit BEGIN SELECT RAISE(ABORT,'member_audit_append_only'); END;
      -- A published site is public content, so publishing it is recorded like any
      -- other access change: who published what, and what it replaced.
      CREATE TABLE IF NOT EXISTS property_sites (property_id TEXT PRIMARY KEY REFERENCES properties(id),
        slug TEXT UNIQUE, enabled INTEGER NOT NULL DEFAULT 0, body TEXT NOT NULL, updated_at TEXT NOT NULL, updated_by TEXT NOT NULL REFERENCES users(id));
      CREATE TABLE IF NOT EXISTS site_audit (id TEXT PRIMARY KEY, actor_id TEXT NOT NULL REFERENCES users(id), property_id TEXT NOT NULL REFERENCES properties(id),
        action TEXT NOT NULL, at TEXT NOT NULL, summary TEXT NOT NULL);
      CREATE TRIGGER IF NOT EXISTS site_audit_no_update BEFORE UPDATE ON site_audit BEGIN SELECT RAISE(ABORT,'site_audit_append_only'); END;
      CREATE TRIGGER IF NOT EXISTS site_audit_no_delete BEFORE DELETE ON site_audit BEGIN SELECT RAISE(ABORT,'site_audit_append_only'); END;
      CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), csrf TEXT NOT NULL, expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS receipts (user_id TEXT NOT NULL REFERENCES users(id), request_key TEXT NOT NULL, fingerprint TEXT NOT NULL,
        response TEXT NOT NULL, PRIMARY KEY(user_id,request_key));
      CREATE TABLE IF NOT EXISTS claims (property_id TEXT NOT NULL REFERENCES properties(id), atom TEXT NOT NULL, night TEXT NOT NULL,
        owner TEXT NOT NULL, PRIMARY KEY(property_id,atom,night));
      CREATE TABLE IF NOT EXISTS audit (id TEXT PRIMARY KEY, property_id TEXT NOT NULL REFERENCES properties(id), actor_id TEXT NOT NULL REFERENCES users(id),
        action TEXT NOT NULL, at TEXT NOT NULL, revision INTEGER NOT NULL, summary TEXT NOT NULL);
      CREATE TRIGGER IF NOT EXISTS audit_no_update BEFORE UPDATE ON audit BEGIN SELECT RAISE(ABORT,'audit_append_only'); END;
      CREATE TRIGGER IF NOT EXISTS audit_no_delete BEFORE DELETE ON audit BEGIN SELECT RAISE(ABORT,'audit_append_only'); END;`);
    // A property can override the account's role, so one person can run operations
    // in one property and only read in another. Older databases predate the column
    // and are widened here rather than being recreated.
    if(!this.db.prepare('PRAGMA table_info(user_properties)').all().some(c=>c.name==='role'))
      this.db.exec('ALTER TABLE user_properties ADD COLUMN role TEXT');
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
      for(const p of propertyIds)this.db.prepare('INSERT INTO user_properties (user_id,property_id) VALUES(?,?)').run(id,p);
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
  // Everything an account may do comes from one place, so the page that explains
  // permissions and the check that enforces them can never drift apart.
  actionsFor(role){
    const base=roleTypes[role]||[];
    return [...new Set([...base,...supportPermissions(role),...guestPermissions(role),...checkinPermissions(role)])];
  }
  // A property override wins over the account role; with no override the account
  // role applies everywhere it is scoped.
  propertyRole(user,propertyId){
    if(!user)return null;
    const row=this.db.prepare('SELECT role FROM user_properties WHERE user_id=? AND property_id=?').get(user.id,propertyId);
    return row?.role||user.role;
  }
  propertyRoles(user){
    const rows=this.db.prepare('SELECT property_id,role FROM user_properties WHERE user_id=? ORDER BY property_id').all(user.id);
    const out={};
    for(const row of rows)if(row.role)out[row.property_id]=row.role;
    return out;
  }
  publicUser(user) {
    const roles=this.propertyRoles(user);
    const ids=this.db.prepare('SELECT property_id FROM user_properties WHERE user_id=? ORDER BY property_id').all(user.id).map(p=>p.property_id);
    const byProperty={};
    for(const id of ids)byProperty[id]=this.actionsFor(roles[id]||user.role);
    return { id:user.id,username:user.username,role:user.role,allowedActions:this.actionsFor(user.role),
      allowedActionsByProperty:byProperty,propertyRoles:roles,propertyIds:ids };
  }
  // Members are only visible to an administrator, and only inside the properties
  // that administrator is themselves scoped to: an administrator of one property
  // never sees the staff of another.
  visibleMembers(user){
    if(user.role!=='admin')return [];
    return this.db.prepare(`SELECT u.id,u.username,u.role,u.active,
        (SELECT group_concat(property_id) FROM user_properties WHERE user_id=u.id ORDER BY property_id) ids FROM users u
      WHERE EXISTS (SELECT 1 FROM user_properties mine WHERE mine.user_id=? AND mine.property_id IN
        (SELECT property_id FROM user_properties WHERE user_id=u.id)) ORDER BY u.username`).all(user.id)
      .map(row=>({id:row.id,username:row.username,role:row.role,active:!!row.active,
        propertyIds:(row.ids||'').split(',').filter(Boolean),propertyRoles:this.propertyRoles(row)}));
  }
  visibleMemberAudit(user){
    if(user.role!=='admin')return [];
    const scope=this.db.prepare('SELECT property_id FROM user_properties WHERE user_id=?').all(user.id).map(p=>p.property_id);
    return this.db.prepare(`SELECT m.*,a.username actor,t.username target FROM member_audit m
        JOIN users a ON a.id=m.actor_id JOIN users t ON t.id=m.target_id ORDER BY m.at DESC LIMIT 200`).all()
      .filter(row=>{
        const summary=JSON.parse(row.summary);
        return (summary.propertyIds||[]).some(id=>scope.includes(id))||(summary.previous?.propertyIds||[]).some(id=>scope.includes(id));
      })
      .slice(0,100)
      .map(row=>({id:row.id,actor:row.actor,target:row.target,action:row.action,at:row.at,...JSON.parse(row.summary)}));
  }
  // Team access. This writes the user tables, not a property body, so it is handled
  // before the property reducer and never advances a property revision.
  saveMember(actor,command,key,fingerprint){
    if(actor.role!=='admin')error(403,'forbidden');
    const username=command.username;
    if(typeof username!=='string'||!/^[a-zA-Z0-9._-]{3,64}$/.test(username))error(400,'member_input');
    if(actor.username===username)error(400,'member_self');
    const scope=this.db.prepare('SELECT property_id FROM user_properties WHERE user_id=?').all(actor.id).map(p=>p.property_id);
    const inScope=id=>scope.includes(id);
    const cleanIds=value=>{
      if(!Array.isArray(value)||!value.length||new Set(value).size!==value.length||!value.every(id=>typeof id==='string'&&inScope(id)))error(400,'member_scope');
      return value;
    };
    const cleanRoles=value=>{
      if(value===undefined||value===null)return null;
      if(typeof value!=='object'||Array.isArray(value))error(400,'member_input');
      const out={};
      for(const [id,role] of Object.entries(value)){
        if(!inScope(id))error(400,'member_scope');
        if(role!==null&&!Object.hasOwn(roleTypes,role))error(400,'member_input');
        out[id]=role;
      }
      return out;
    };
    const target=this.db.prepare('SELECT * FROM users WHERE username=?').get(username);
    if(target){
      const existing=this.db.prepare('SELECT property_id FROM user_properties WHERE user_id=?').all(target.id).map(p=>p.property_id);
      // An administrator may only reach people who already share a property with them.
      if(!existing.some(id=>inScope(id)))error(403,'member_scope');
    }
    const role=command.role===undefined?null:command.role;
    if(role!==null&&!Object.hasOwn(roleTypes,role))error(400,'member_input');
    const propertyIds=command.propertyIds===undefined?null:cleanIds(command.propertyIds);
    const propertyRoles=cleanRoles(command.propertyRoles);
    const active=command.active===undefined?null:command.active;
    if(active!==null&&typeof active!=='boolean')error(400,'member_input');
    const password=command.password===undefined?null:command.password;
    if(password!==null&&(typeof password!=='string'||password.length<12||password.length>256))error(400,'password_length');
    if(!target&&(password===null||propertyIds===null||role===null))error(400,'member_input');
    // Losing the last active administrator would lock the team out of its own access
    // page, so the change is refused rather than applied and discovered afterwards.
    const demoting=(role!==null&&role!=='admin')||(active===false);
    if(target&&target.role==='admin'&&target.active===1&&demoting){
      const others=this.db.prepare("SELECT 1 FROM users WHERE role='admin' AND active=1 AND id<>?").get(target.id);
      if(!others)error(400,'member_last_admin');
    }
    const prior=this.db.prepare('SELECT * FROM receipts WHERE user_id=? AND request_key=?').get(actor.id,key);
    if(prior){if(prior.fingerprint!==fingerprint)error(409,'idempotency_mismatch');return {...JSON.parse(prior.response),replayed:true};}
    const at=new Date().toISOString(),id=randomUUID();
    const before=target?{role:target.role,active:!!target.active,
      propertyIds:this.db.prepare('SELECT property_id FROM user_properties WHERE user_id=?').all(target.id).map(p=>p.property_id),
      propertyRoles:this.propertyRoles(target)}:null;
    let userId=target?.id;
    if(!target){
      const salt=randomBytes(16).toString('hex'),passwordHash=scryptSync(password,salt,64).toString('hex');
      userId=randomUUID();
      this.db.prepare('INSERT INTO users (id,username,salt,password_hash,role,active) VALUES(?,?,?,?,?,?)').run(userId,username,salt,passwordHash,role,active===false?0:1);
      for(const p of propertyIds)this.db.prepare('INSERT INTO user_properties (user_id,property_id) VALUES(?,?)').run(userId,p);
    }else{
      if(role!==null)this.db.prepare('UPDATE users SET role=? WHERE id=?').run(role,userId);
      if(active!==null)this.db.prepare('UPDATE users SET active=? WHERE id=?').run(active?1:0,userId);
      if(password!==null){
        const salt=randomBytes(16).toString('hex'),passwordHash=scryptSync(password,salt,64).toString('hex');
        this.db.prepare('UPDATE users SET salt=?,password_hash=? WHERE id=?').run(salt,passwordHash,userId);
        // A changed password ends every existing session for that account at once.
        this.db.prepare('DELETE FROM sessions WHERE user_id=?').run(userId);
      }
      if(active===false)this.db.prepare('DELETE FROM sessions WHERE user_id=?').run(userId);
      if(propertyIds!==null){
        const keep=propertyIds.map(()=>'?').join(',');
        this.db.prepare(`DELETE FROM user_properties WHERE user_id=? AND property_id IN (${keep})`).run(userId,...propertyIds);
        for(const p of propertyIds)this.db.prepare('INSERT OR REPLACE INTO user_properties (user_id,property_id,role) VALUES(?,?,NULL)').run(userId,p);
      }
    }
    if(propertyRoles)for(const [p,r] of Object.entries(propertyRoles))
      this.db.prepare('UPDATE user_properties SET role=? WHERE user_id=? AND property_id=?').run(r,userId,p);
    const summary={username,role:role??(before?.role??null),active:active??(before?.active??true),
      propertyIds:propertyIds??(before?.propertyIds??[]),
      propertyRoles:propertyRoles?{...before?.propertyRoles,...propertyRoles}:before?.propertyRoles??{},
      passwordChanged:password!==null,previous:before,created:!target};
    this.db.prepare('INSERT INTO member_audit VALUES(?,?,?,?,?,?)').run(id,actor.id,userId,'member_save',at,JSON.stringify(summary));
    const response={id,username,created:!target};
    this.db.prepare('INSERT INTO receipts VALUES(?,?,?,?)').run(actor.id,key,fingerprint,JSON.stringify(response));
    return response;
  }
  // A published property site is public content. It is stored and audited apart from
  // property state, so publishing never advances a property revision and can never
  // be mixed into the operational audit a night audit or a handover reads.
  siteText(value,max){
    const out={};
    for(const language of ['zh','en','ms']){
      const raw=value&&typeof value[language]==='string'?value[language]:'';
      out[language]=raw.replace(/\s+/g,' ').trim().slice(0,max);
    }
    return out;
  }
  saveSite(actor,command,key,fingerprint){
    const propertyId=command.propertyId;
    // Publishing is administrator-only within the property itself. A property-level
    // admin override does not reach here, because what is published is public.
    if(actor.role!=='admin'||!this.db.prepare('SELECT 1 FROM user_properties WHERE user_id=? AND property_id=?').get(actor.id,propertyId))error(403,'forbidden');
    const slug=command.slug===undefined?null:command.slug;
    if(slug!==null&&(typeof slug!=='string'||!/^[a-z0-9](?:[a-z0-9-]{0,46}[a-z0-9])?$/.test(slug)))error(400,'site_slug');
    const enabled=command.enabled===true;
    if(enabled&&!slug)error(400,'site_slug');
    if(slug){const clash=this.db.prepare('SELECT property_id FROM property_sites WHERE slug=? AND property_id<>?').get(slug,propertyId);if(clash)error(409,'site_slug_taken');}
    const row=this.db.prepare('SELECT * FROM properties WHERE id=?').get(propertyId);
    if(!row)error(404,'not_found');
    const body=upgradeCatalog(JSON.parse(row.body));
    // Only this property's own live room types and rate plans can be published, so a
    // site can never advertise a type or a plan from somewhere else.
    const ids=command.roomTypeIds,codes=command.planCodes;
    if(ids!==undefined&&ids!==null){if(!Array.isArray(ids)||new Set(ids).size!==ids.length)error(400,'site_input');
      for(const id of ids)if(!body.roomTypes.some(t=>t.id===id&&!t.archived))error(400,'site_input');}
    if(codes!==undefined&&codes!==null){if(!Array.isArray(codes)||new Set(codes).size!==codes.length)error(400,'site_input');
      for(const code of codes)if(!(body.ratePlans||[]).some(p=>p.code===code&&!p.archived))error(400,'site_input');}
    const before=this.db.prepare('SELECT * FROM property_sites WHERE property_id=?').get(propertyId);
    const previous=before?{...JSON.parse(before.body),enabled:!!before.enabled,slug:before.slug}:null;
    const blank={zh:'',en:'',ms:''};
    const keep=(value,fallback,max)=>value===undefined||value===null?fallback:this.siteText(value,max);
    const next={title:keep(command.title,previous?.title??blank,120),description:keep(command.description,previous?.description??blank,2000),
      contact:keep(command.contact,previous?.contact??blank,500),bookingNote:keep(command.bookingNote,previous?.bookingNote??blank,500),
      roomTypeIds:ids??previous?.roomTypeIds??[],planCodes:codes??previous?.planCodes??[]};
    const at=new Date().toISOString(),id=randomUUID();
    this.db.prepare(`INSERT INTO property_sites VALUES(?,?,?,?,?,?) ON CONFLICT(property_id) DO UPDATE SET
      slug=excluded.slug,enabled=excluded.enabled,body=excluded.body,updated_at=excluded.updated_at,updated_by=excluded.updated_by`)
      .run(propertyId,slug??before?.slug??null,enabled?1:0,JSON.stringify(next),at,actor.id);
    this.db.prepare('INSERT INTO site_audit VALUES(?,?,?,?,?,?)').run(id,actor.id,propertyId,'site_save',at,
      JSON.stringify({slug:slug??before?.slug??null,enabled,previous,next}));
    const response={id,propertyId,slug:slug??before?.slug??null,enabled};
    this.db.prepare('INSERT INTO receipts VALUES(?,?,?,?)').run(actor.id,key,fingerprint,JSON.stringify(response));
    return response;
  }
  visibleSites(user){
    const scope=this.db.prepare('SELECT property_id FROM user_properties WHERE user_id=?').all(user.id).map(p=>p.property_id);
    return this.db.prepare('SELECT * FROM property_sites').all()
      .filter(row=>scope.includes(row.property_id))
      .map(row=>({propertyId:row.property_id,slug:row.slug,enabled:!!row.enabled,updatedAt:row.updated_at,
        ...JSON.parse(row.body)}));
  }
  visibleSiteAudit(user){
    const scope=this.db.prepare('SELECT property_id FROM user_properties WHERE user_id=?').all(user.id).map(p=>p.property_id);
    // Two entries written in the same millisecond must still come back in the order
    // they happened, so the newest change is never shown as an older one.
    return this.db.prepare(`SELECT s.*,u.username actor FROM site_audit s JOIN users u ON u.id=s.actor_id ORDER BY s.at DESC, s.rowid DESC LIMIT 200`).all()
      .filter(row=>scope.includes(row.property_id))
      .map(row=>{const summary=JSON.parse(row.summary);return {id:row.id,at:row.at,actor:row.actor,propertyId:row.property_id,
        slug:summary.slug,enabled:!!summary.enabled,previous:summary.previous,next:summary.next};});
  }
  // Everything below is public: it answers without a session, and only for a site
  // that has actually been published.
  publicSite(slug){
    if(typeof slug!=='string'||!/^[a-z0-9](?:[a-z0-9-]{0,46}[a-z0-9])?$/.test(slug))error(404,'not_found');
    const row=this.db.prepare('SELECT * FROM property_sites WHERE slug=? AND enabled=1').get(slug);
    if(!row)error(404,'not_found');
    const property=this.db.prepare('SELECT * FROM properties WHERE id=?').get(row.property_id);
    if(!property)error(404,'not_found');
    const body=upgradeCatalog(JSON.parse(property.body)),site=JSON.parse(row.body);
    const types=body.roomTypes.filter(t=>!t.archived&&t.propertyId===row.property_id&&(!site.roomTypeIds.length||site.roomTypeIds.includes(t.id)));
    return {propertyId:row.property_id,slug,enabled:true,updatedAt:row.updated_at,
      propertyName:body.properties.find(p=>p.id===row.property_id)?.name||row.property_id,
      title:site.title,description:site.description,contact:site.contact,bookingNote:site.bookingNote,planCodes:site.planCodes,
      roomTypes:types.map(type=>({id:type.id,names:type.names||{},productId:type.productId,gender:type.gender||'any',
        maxGuests:type.maxGuests||1,
        units:saleResources(body,row.property_id).filter(r=>r.roomTypeId===type.id).length}))};
  }
  // Availability is read from the same inventory the front desk sells from, and a
  // price is only ever reported when a published rate plan actually has one.
  publicAvailability({slug,from,to,guests}={}){
    const site=this.publicSite(slug);
    const valid=day=>typeof day==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(day)&&Number.isFinite(Date.parse(day+'T00:00:00Z'))&&
      new Date(day+'T00:00:00Z').toISOString().slice(0,10)===day;
    if(!valid(from)||!valid(to)||to<=from||(Date.parse(to)-Date.parse(from))/86400000>31)error(400,'date_range');
    const count=Number(guests);if(!Number.isSafeInteger(count)||count<1||count>20)error(400,'guest_count');
    const property=this.db.prepare('SELECT * FROM properties WHERE id=?').get(site.propertyId);
    const body=upgradeCatalog(JSON.parse(property.body));
    const businessDate=body.businessDate||localDay(new Date());
    const nights=[];for(let day=from;day<to;day=new Date(Date.parse(day+'T00:00:00Z')+86400000).toISOString().slice(0,10))nights.push(day);
    const plans=(body.ratePlans||[]).filter(p=>!p.archived&&site.planCodes.includes(p.code));
    const nightlyPrice=(roomTypeId,day)=>{
      let lowest=null;
      for(const plan of plans){
        if(!plan.roomTypeIds.includes(roomTypeId))continue;
        const cell=(body.rateCells||[]).find(c=>c.propertyId===site.propertyId&&c.planCode===plan.code&&c.roomTypeId===roomTypeId&&c.date===day);
        if(!cell||cell.sale==='closed'||!Number.isSafeInteger(cell.amount)||cell.amount<0)continue;
        if(lowest===null||cell.amount<lowest)lowest=cell.amount;
      }
      return lowest;
    };
    const roomTypes=site.roomTypes.map(type=>{
      let available=null,error_=null;
      try{
        for(const day of nights){
          const free=rateAvailability(body,site.propertyId,type.id,day,businessDate);
          available=available===null?free:Math.min(available,free);
        }
      }catch(e){error_='availability_unavailable';}
      const prices=nights.map(day=>nightlyPrice(type.id,day));
      const priced=prices.every(p=>p!==null);
      return {id:type.id,names:type.names,productId:type.productId,maxGuests:type.maxGuests,units:type.units,
        available:error_?null:available,unknown:!!error_,
        fitsGuests:type.maxGuests>=count,
        nightlyFrom:(priced&&prices.length)?Math.min(...prices):null,
        total:(priced&&prices.length)?prices.reduce((n,p)=>n+p,0):null,
        nights:nights.length};
    });
    return {...site,nights:nights.length,from,to,guests:count,businessDate,
      // A price is only trustworthy when every night of the stay actually has one.
      priceKnown:roomTypes.some(t=>t.total!==null),
      roomTypes};
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
    const result={ratePlans:[],rateCells:[],rateChanges:[],version:1,properties:[],resources:[],roomTypes:[],physicalRooms:[],reservations:[],orders:[],blocks:[],audit:[],revisions:{},businessDates:{},nightAudits:[],shiftTypes:[],handovers:[],members:[],memberAudit:[],sites:[],siteAudit:[]};
    for(const id of ids){
      const row=this.db.prepare('SELECT * FROM properties WHERE id=?').get(id);
      const body=upgradeCatalog(JSON.parse(row.body));
      result.businessDates[id]=body.businessDate ?? null;
      result.nightAudits.push(...(body.nightAudits||[]).map(entry=>({...entry,propertyId:id})));
      result.shiftTypes.push(...(body.shiftTypes||[]).map(entry=>({...entry,propertyId:id})));
      result.handovers.push(...(body.handovers||[]).map(entry=>({...entry,propertyId:id})));
      for(const field of ['ratePlans','rateCells','rateChanges','properties','resources','roomTypes','physicalRooms','reservations','orders','blocks'])result[field].push(...body[field].filter(item=>(field==='properties'?item.id:item.propertyId)===id));
      result.revisions[id]=row.revision;
    }
    result.audit=this.db.prepare(`SELECT a.*,u.username actor FROM audit a JOIN users u ON u.id=a.actor_id
      JOIN user_properties p ON p.user_id=? AND p.property_id=a.property_id ORDER BY a.at DESC LIMIT 500`).all(user.id).map(a=>({
        id:a.id,propertyId:a.property_id,type:a.action,at:a.at,actor:a.actor,revision:a.revision,...JSON.parse(a.summary) }));
    result.members=this.visibleMembers(fresh);
    result.memberAudit=this.visibleMemberAudit(fresh);
    result.sites=this.visibleSites(fresh);
    result.siteAudit=this.visibleSiteAudit(fresh);
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
      // Team access is not a property business command: it writes the user tables and
      // is answered here instead of being folded into a property revision.
      if(command.type==='member_save')return this.saveMember(rowUser,command,key,fingerprint);
      // Publishing a property site writes public content, not property state.
      if(command.type==='site_save')return this.saveSite(rowUser,command,key,fingerprint);
      // A property override decides what this account may do here, not its account role.
      const effectiveRole=this.propertyRole(rowUser,propertyId);
      if(command.type==='create_reservation'&&command.mode==='checkin'&&!roleTypes[effectiveRole].includes('checkin'))error(403,'forbidden');
      // Rewriting nights already closed by a night audit stays an administrator-only override.
      if(command.auditOverride===true&&rowUser.role!=='admin')error(403,'forbidden');
      if(!roleTypes[effectiveRole].includes(command.type))error(403,'forbidden');
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
      const summary={...(cmd.type==='create_reservation'?{reservationId:cmd.id,stayIds:next.reservations.find(r=>r.id===cmd.id).stayIds}:{}),orderId:cmd.type==='create'?cmd.id:cmd.orderId||null,
        ...(stayTypes.includes(cmd.type)?{stayChange:{before:staySnapshot(before,cmd.orderId),after:staySnapshot(next,cmd.orderId),reason:typeof cmd.reason==='string'?cmd.reason.trim():null}}:{}),
        ...(cmd.type==='create'?{stayChange:{before:null,after:staySnapshot(next,cmd.id),reason:null}}:{}),resourceId:cmd.resourceId||null,
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
