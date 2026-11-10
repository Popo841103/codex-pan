import {SelfCheckin,checkinPermissions} from './self-checkin.js';
import {GuestMessages,guestPermissions} from './guest-messages.js';
import {SupportDesk,supportPermissions} from './support.js';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, randomUUID, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import { seed, apply, preview, folio, nightAuditExceptions, severityOf, severityRank, cleanNoticeLevels, cleanNoticeRules, escalateSeverity, reminderForAccount } from '../src/demo-store.js';
export { severityOf } from '../src/demo-store.js';
import { InventoryConflict } from '../src/inventory.js';
import { upgradeCatalog, saleResources } from '../src/catalog.js';
import { rateAvailability } from '../src/rate-availability.js';
import { localDay } from '../src/dashboard.js';
import { isBoxed } from '../src/inventory-actions.js';
export class ServiceError extends Error {
  constructor(status, code) { super(code); this.status = status; }
}
const error = (status, code) => { throw new ServiceError(status, code); };
const hash = value => createHash('sha256').update(value).digest('hex');
const stayTypes=['undo_checkin','undo_checkout','restore_cancel','edit','assign','checkin','checkout','cancel','lock'];
// Defaults and override validation live in src/demo-store.js, which both the shared
// backend and the desk page import, so a level can never mean one thing in the list
// and another in the settings form. The list is read by what is waiting on a person:
// somebody who should be here comes first, housekeeping comes last.
const staySnapshot=(body,id)=>{const order=(body?.orders||[]).find(o=>o.id===id);return order?{start:order.start,end:order.end,
  nightly:order.nightly,resourceId:order.resourceId,status:order.status,productId:order.productId,finalCharge:order.finalCharge??null,charge:folio(order).charge}:null;};

const changedBlocks = (before,after) => {
  const a=new Map(before.map(b=>[b.id,JSON.stringify(b)])),b=new Map(after.map(b=>[b.id,JSON.stringify(b)]));
  return {before:before.filter(row=>b.get(row.id)!==a.get(row.id)),after:after.filter(row=>a.get(row.id)!==b.get(row.id))};
};
const roleTypes = {
  admin: ['display_preferences_save','commission_close_month','ar_adjust','ar_undo_adjust','ar_close_month','ar_report_view','ar_account_save','ar_post','ar_write_off','ar_undo_write_off','ar_transfer','ar_undo_post','settle_split','settle_bill','settle_undo','settle_unsplit','transfer_folio_credit','undo_reservation_payment','payment_reservation','settle_reservation','settle','reopen_folio','rate_plan_save','rate_plan_archive','rates_bulk_update','box_stays','restore_stays','create_reservation','memo_save','create','assign','edit','lock','payment','cancel','checkin','checkout','clean','block','unblock','bulk_clean','bulk_block','bulk_unblock','room_type_save','physical_room_save','suite_save','resource_update','resource_archive','business_date_init','night_audit','night_audit_handle_all','shift_save','shift_delete','shift_handover','shift_mode_save','cash_variance_approve','member_save','role_save','role_delete','member_permission_save','site_save','notice_severity_save','notice_rule_save','purge_test_orders','booking_request_decision','commission_save'],
  operations: ['settle','box_stays','restore_stays','create_reservation','memo_save','create','assign','edit','lock','payment','cancel','checkin','checkout','clean','block','unblock','bulk_clean','bulk_block','bulk_unblock','night_audit','night_audit_handle_all','shift_handover','booking_request_decision'],
  finance: ['ar_adjust','ar_undo_adjust','ar_report_view','ar_account_save','ar_post','ar_write_off','ar_undo_write_off','ar_transfer','ar_undo_post','settle_split','settle_bill','settle_undo','settle_unsplit','transfer_folio_credit','undo_reservation_payment','payment_reservation','settle_reservation','settle','payment','commission_save'], viewer: []
};
// A role is a set of actions, exactly like the reference product's Account Role page:
// an operator ticks what the role may do, then hands the role to an account. The
// groups below exist so the settings page can draw that matrix module by module;
// they are a view of the flat action list, never a second source of truth.
export const actionModules = {
  reservations: ['create_reservation','create','edit','assign','lock','memo_save','cancel','box_stays','restore_stays','booking_request_decision'],
  frontDesk: ['checkin','checkout'],
  housekeeping: ['clean','block','unblock','bulk_clean','bulk_block','bulk_unblock'],
  money: ['commission_close_month','ar_adjust','ar_undo_adjust','ar_close_month','ar_report_view','ar_account_save','ar_post','ar_write_off','ar_undo_write_off','ar_transfer','ar_undo_post','settle_split','settle_bill','settle_undo','settle_unsplit','transfer_folio_credit','undo_reservation_payment','payment_reservation','settle_reservation','settle','reopen_folio','payment','cash_variance_approve','commission_save'],
  catalog: ['display_preferences_save','room_type_save','physical_room_save','suite_save','resource_update','resource_archive','rate_plan_save','rate_plan_archive','rates_bulk_update'],
  operationsDay: ['business_date_init','night_audit','night_audit_handle_all','shift_save','shift_delete','shift_handover','shift_mode_save'],
  access: ['member_save','role_save','role_delete','member_permission_save'],
  site: ['site_save'],
  notice: ['notice_severity_save','notice_rule_save'],
  data: ['purge_test_orders'],
  guest: ['guest_read','guest_sync','guest_send','guest_note','guest_handled','guest_bind','guest_reconcile'],
  selfCheckin: ['sc_read','sc_invite','sc_revoke','sc_review','sc_document','sc_checkin','sc_policy_save','sc_purge_identity'],
  support: ['support_create','support_reply','support_status','support_contact_save']
};
// The whole catalogue is derived from the built-in administrator set, so an action
// can never be grantable through a custom role without also being known here.
export const allActions = [...new Set([...roleTypes.admin, ...supportPermissions('admin'), ...guestPermissions('admin'), ...checkinPermissions('admin')])];
const rolePrefix = 'role-';
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
      -- A published site collects a request, never a booking: it is stored for the front
      -- desk to decide on, and nothing is charged, confirmed or held until then.
      CREATE TABLE IF NOT EXISTS booking_requests (id TEXT PRIMARY KEY, property_id TEXT NOT NULL REFERENCES properties(id),
        slug TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('pending','accepted','declined')),
        guest_name TEXT NOT NULL, contact TEXT NOT NULL, stay_from TEXT NOT NULL, stay_to TEXT NOT NULL,
        guests INTEGER NOT NULL, rooms INTEGER NOT NULL DEFAULT 1, room_type_id TEXT NOT NULL, note TEXT NOT NULL, language TEXT NOT NULL,
        quoted_total INTEGER, quoted_nightly TEXT, created_at TEXT NOT NULL,
        decided_at TEXT, decided_by TEXT REFERENCES users(id), decision_note TEXT, reservation_id TEXT, order_id TEXT,
        withdrawn_at TEXT);
      CREATE INDEX IF NOT EXISTS booking_requests_property ON booking_requests(property_id,status,created_at);
      CREATE TABLE IF NOT EXISTS booking_request_events (id TEXT PRIMARY KEY, request_id TEXT NOT NULL, actor TEXT NOT NULL,
        action TEXT NOT NULL, at TEXT NOT NULL, summary TEXT NOT NULL);
      CREATE TRIGGER IF NOT EXISTS booking_request_events_no_update BEFORE UPDATE ON booking_request_events BEGIN SELECT RAISE(ABORT,'booking_request_events_append_only'); END;
      CREATE TRIGGER IF NOT EXISTS booking_request_events_no_delete BEFORE DELETE ON booking_request_events BEGIN SELECT RAISE(ABORT,'booking_request_events_append_only'); END;
      -- Something happened that a person has to know about. A notification points at it;
      -- it never acts on it. Nothing here is sent anywhere: no email, no SMS, no push,
      -- because no delivery channel is connected, so these are only seen by signing in.
      CREATE TABLE IF NOT EXISTS notifications (id TEXT PRIMARY KEY, property_id TEXT NOT NULL REFERENCES properties(id),
        user_id TEXT NOT NULL REFERENCES users(id), kind TEXT NOT NULL, at TEXT NOT NULL, summary TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS notifications_user ON notifications(user_id,at DESC);
      CREATE TRIGGER IF NOT EXISTS notifications_no_update BEFORE UPDATE ON notifications BEGIN SELECT RAISE(ABORT,'notifications_append_only'); END;
      -- Read state is a separate append-only row, so reading never rewrites the notice
      -- and there is no way to quietly undo having seen something.
      CREATE TABLE IF NOT EXISTS notification_reads (notification_id TEXT NOT NULL, user_id TEXT NOT NULL, at TEXT NOT NULL,
        PRIMARY KEY(notification_id,user_id));
      CREATE TRIGGER IF NOT EXISTS notification_reads_no_update BEFORE UPDATE ON notification_reads BEGIN SELECT RAISE(ABORT,'notification_reads_append_only'); END;
      CREATE TRIGGER IF NOT EXISTS notification_reads_no_delete BEFORE DELETE ON notification_reads BEGIN SELECT RAISE(ABORT,'notification_reads_append_only'); END;
      -- How much each kind of notice matters is a property's own choice. It is a
      -- setting, not business state, so it lives apart from the property body and
      -- never advances a revision someone else is working to. Only the overrides
      -- are stored: a level left at the default follows the system rule.
      CREATE TABLE IF NOT EXISTS notice_settings (property_id TEXT PRIMARY KEY REFERENCES properties(id),
        body TEXT NOT NULL, updated_at TEXT NOT NULL, updated_by TEXT NOT NULL REFERENCES users(id));
      CREATE TABLE IF NOT EXISTS notice_settings_audit (id TEXT PRIMARY KEY, actor_id TEXT NOT NULL REFERENCES users(id),
        property_id TEXT NOT NULL REFERENCES properties(id), at TEXT NOT NULL, summary TEXT NOT NULL);
      CREATE TRIGGER IF NOT EXISTS notice_settings_audit_no_update BEFORE UPDATE ON notice_settings_audit BEGIN SELECT RAISE(ABORT,'notice_settings_audit_append_only'); END;
      CREATE TRIGGER IF NOT EXISTS notice_settings_audit_no_delete BEFORE DELETE ON notice_settings_audit BEGIN SELECT RAISE(ABORT,'notice_settings_audit_append_only'); END;
      -- A conditional rule is also a property's own choice, not business state. It says
      -- how big a standing fact must be before the list reads it as more urgent. Like the
      -- priority setting it is stored and audited apart from the property body, so
      -- changing it never advances a revision somebody else is working to.
      CREATE TABLE IF NOT EXISTS notice_rules (property_id TEXT PRIMARY KEY REFERENCES properties(id),
        body TEXT NOT NULL, updated_at TEXT NOT NULL, updated_by TEXT NOT NULL REFERENCES users(id));
      CREATE TABLE IF NOT EXISTS notice_rules_audit (id TEXT PRIMARY KEY, actor_id TEXT NOT NULL REFERENCES users(id),
        property_id TEXT NOT NULL REFERENCES properties(id), at TEXT NOT NULL, summary TEXT NOT NULL);
      CREATE TRIGGER IF NOT EXISTS notice_rules_audit_no_update BEFORE UPDATE ON notice_rules_audit BEGIN SELECT RAISE(ABORT,'notice_rules_audit_append_only'); END;
      CREATE TRIGGER IF NOT EXISTS notice_rules_audit_no_delete BEFORE DELETE ON notice_rules_audit BEGIN SELECT RAISE(ABORT,'notice_rules_audit_append_only'); END;
      CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), csrf TEXT NOT NULL, expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS receipts (user_id TEXT NOT NULL REFERENCES users(id), request_key TEXT NOT NULL, fingerprint TEXT NOT NULL,
        response TEXT NOT NULL, PRIMARY KEY(user_id,request_key));
      CREATE TABLE IF NOT EXISTS claims (property_id TEXT NOT NULL REFERENCES properties(id), atom TEXT NOT NULL, night TEXT NOT NULL,
        owner TEXT NOT NULL, PRIMARY KEY(property_id,atom,night));
      CREATE TABLE IF NOT EXISTS audit (id TEXT PRIMARY KEY, property_id TEXT NOT NULL REFERENCES properties(id), actor_id TEXT NOT NULL REFERENCES users(id),
        action TEXT NOT NULL, at TEXT NOT NULL, revision INTEGER NOT NULL, summary TEXT NOT NULL);
      CREATE TRIGGER IF NOT EXISTS audit_no_update BEFORE UPDATE ON audit BEGIN SELECT RAISE(ABORT,'audit_append_only'); END;
      CREATE TRIGGER IF NOT EXISTS audit_no_delete BEFORE DELETE ON audit BEGIN SELECT RAISE(ABORT,'audit_append_only'); END;`);
    // Access is modelled the way the reference product does it: a property owns named
    // roles, each role is a list of actions, and an account either takes a role or is
    // granted extra actions on top. Roles live beside the built-in four rather than
    // replacing them, so existing accounts keep exactly the access they had.
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS role_definitions (property_id TEXT NOT NULL REFERENCES properties(id), id TEXT NOT NULL,
        name TEXT NOT NULL, actions TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
        updated_by TEXT NOT NULL REFERENCES users(id), PRIMARY KEY(property_id,id));
      CREATE TABLE IF NOT EXISTS member_permissions (user_id TEXT NOT NULL REFERENCES users(id),
        property_id TEXT NOT NULL REFERENCES properties(id), action TEXT NOT NULL,
        granted_by TEXT NOT NULL REFERENCES users(id), granted_at TEXT NOT NULL, PRIMARY KEY(user_id,property_id,action));`);
    // A property can override the account's role, so one person can run operations
    // in one property and only read in another. Older databases predate the column
    // and are widened here rather than being recreated.
    if(!this.db.prepare('PRAGMA table_info(user_properties)').all().some(c=>c.name==='role'))
      this.db.exec('ALTER TABLE user_properties ADD COLUMN role TEXT');
    // Requests gained a room count and a guest-side withdrawal marker after the first
    // release. Older databases are widened here; the status column keeps its original
    // three values, so a withdrawal is a declined request with its own marker rather
    // than a reason to rebuild the table and rewrite existing data.
    const requestColumns=this.db.prepare('PRAGMA table_info(booking_requests)').all().map(c=>c.name);
    if(!requestColumns.includes('selections'))this.db.exec('ALTER TABLE booking_requests ADD COLUMN selections TEXT');
    if(!requestColumns.includes('rooms'))this.db.exec('ALTER TABLE booking_requests ADD COLUMN rooms INTEGER NOT NULL DEFAULT 1');
    if(!requestColumns.includes('withdrawn_at'))this.db.exec('ALTER TABLE booking_requests ADD COLUMN withdrawn_at TEXT');
    // Self-serve signups must never be able to grow past one store, but they are still
    // administrators of their own property. The origin column marks where an account
    // came from without inventing a new role or rebuilding the users table.
    if(!this.db.prepare('PRAGMA table_info(users)').all().some(c=>c.name==='origin'))
      this.db.exec("ALTER TABLE users ADD COLUMN origin TEXT NOT NULL DEFAULT 'staff'");
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
      !Object.hasOwn(roleTypes,role) || !Array.isArray(propertyIds) || new Set(propertyIds).size!==propertyIds.length) error(400,'user_input');
    // Every role still needs at least one property, except an administrator setting up a
    // fresh installation: there is no property to grant yet, and they must be able to log
    // in to create the first one. Nothing is readable with an empty scope.
    if(!propertyIds.length&&role!=='admin')error(400,'user_input');
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
  // A role held in a property may be one of the four built-ins or a role this property
  // defined itself. Only the built-ins carry subsystem defaults; a custom role is
  // exactly the list of actions that was ticked for it, nothing implied.
  actionsForRole(role,propertyId){
    if(Object.hasOwn(roleTypes,role))return this.actionsFor(role);
    if(typeof role!=='string'||!role.startsWith(rolePrefix))return [];
    const row=this.db.prepare('SELECT actions FROM role_definitions WHERE property_id=? AND id=?').get(propertyId,role);
    if(!row)return [];
    try{ const list=JSON.parse(row.actions); return Array.isArray(list)?list.filter(action=>allActions.includes(action)):[]; }
    catch{ return []; }
  }
  // What the account may actually do here: its role in this property, plus any single
  // actions granted to it on top of that role.
  permissionsFor(user,propertyId){
    if(!user||typeof propertyId!=='string')return [];
    // Holding a role means holding it somewhere: without membership in this property
    // the account has no access here, whatever its account-level role says.
    if(!this.db.prepare('SELECT 1 FROM user_properties WHERE user_id=? AND property_id=?').get(user.id,propertyId))return [];
    const granted=this.db.prepare('SELECT action FROM member_permissions WHERE user_id=? AND property_id=?').all(user.id,propertyId).map(r=>r.action);
    return [...new Set([...this.actionsForRole(this.propertyRole(user,propertyId),propertyId),...granted])];
  }
  roleExists(propertyId,roleId){
    if(Object.hasOwn(roleTypes,roleId))return true;
    return !!this.db.prepare('SELECT 1 FROM role_definitions WHERE property_id=? AND id=?').get(propertyId,roleId);
  }
  // Roles are listed with their actions so the settings page can draw the same matrix
  // an administrator edits, and so an account can be shown where its access comes from.
  visibleRoles(user){
    const ids=this.db.prepare('SELECT property_id FROM user_properties WHERE user_id=? ORDER BY property_id').all(user.id).map(p=>p.property_id);
    if(!ids.length)return [];
    const keep=ids.map(()=>'?').join(',');
    return this.db.prepare(`SELECT * FROM role_definitions WHERE property_id IN (${keep}) ORDER BY property_id,name`).all(...ids)
      .map(row=>({propertyId:row.property_id,id:row.id,name:row.name,actions:this.actionsForRole(row.id,row.property_id),
        createdAt:row.created_at,updatedAt:row.updated_at}));
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
    for(const id of ids)byProperty[id]=this.permissionsFor(user,id);
    return { id:user.id,username:user.username,role:user.role,origin:user.origin||'staff',allowedActions:this.actionsFor(user.role),
      allowedActionsByProperty:byProperty,propertyRoles:roles,propertyIds:ids };
  }
  // Members are only visible to an administrator, and only inside the properties
  // that administrator is themselves scoped to: an administrator of one property
  // never sees the staff of another.
  // Access management follows the same rule as every other module: the action that
  // opens the page is member_save, held either through a built-in role or a role this
  // property defined itself. An account without it sees no team at all.
  manageScope(user){
    const ids=this.db.prepare('SELECT property_id FROM user_properties WHERE user_id=? ORDER BY property_id').all(user.id).map(p=>p.property_id);
    return ids.filter(id=>this.permissionsFor(user,id).includes('member_save'));
  }
  visibleMembers(user){
    const scope=this.manageScope(user);
    if(!scope.length)return [];
    const keep=scope.map(()=>'?').join(',');
    // Extra grants are listed with the member so the page can edit the set that is
    // actually stored, not a guess rebuilt from the role it rides on.
    const grants={};
    for(const g of this.db.prepare(`SELECT user_id,property_id,action FROM member_permissions WHERE property_id IN (${keep}) ORDER BY action`).all(...scope)){
      (grants[g.user_id]??={})[g.property_id]??=[];grants[g.user_id][g.property_id].push(g.action);
    }
    return this.db.prepare(`SELECT u.id,u.username,u.role,u.active,
        (SELECT group_concat(property_id) FROM user_properties WHERE user_id=u.id ORDER BY property_id) ids FROM users u
      WHERE EXISTS (SELECT 1 FROM user_properties p WHERE p.user_id=u.id AND p.property_id IN (${keep})) ORDER BY u.username`).all(...scope)
      .map(row=>({id:row.id,username:row.username,role:row.role,active:!!row.active,
        propertyIds:(row.ids||'').split(',').filter(Boolean),propertyRoles:this.propertyRoles(row),
        extraPermissions:grants[row.id]||{}}));
  }
  visibleMemberAudit(user){
    const scope=this.manageScope(user);
    if(!scope.length)return [];
    return this.db.prepare(`SELECT m.*,a.username actor,t.username target FROM member_audit m
        JOIN users a ON a.id=m.actor_id JOIN users t ON t.id=m.target_id ORDER BY m.at DESC LIMIT 200`).all()
      .filter(row=>{
        const summary=JSON.parse(row.summary);
        return (summary.propertyIds||[]).some(id=>scope.includes(id))||(summary.previous?.propertyIds||[]).some(id=>scope.includes(id));
      })
      .slice(0,100)
      .map(row=>({id:row.id,actor:row.actor,target:row.target,action:row.action,at:row.at,...JSON.parse(row.summary)}));
  }
  // Creating a property cannot go through authorize(): the account does not hold the
  // property yet, which is the whole point. It is limited to an active administrator and
  // gives them the property at once, so a brand-new property is usable without a second
  // step. The body starts genuinely empty: no room type, no room, no bed, no order. The
  // layout is the operator's to describe, and inventing one would silently decide how
  // many rooms a property sells.
  createProperty(actor,command,key,fingerprint){
    if(actor.role!=='admin')error(403,'forbidden');
    // A trial account exists to try one store. Growing past it would turn the open
    // signup into free multi-tenant hosting, so it is refused here where the session
    // is already resolved, not merely hidden in the page.
    if(actor.origin==='trial')error(403,'forbidden');
    const id=typeof command.newPropertyId==='string'?command.newPropertyId.trim():'';
    if(!/^[a-zA-Z0-9_-]{2,40}$/.test(id))error(400,'property_input');
    const name=typeof command.name==='string'?command.name.trim():'';
    if(!name||name.length>80)error(400,'property_input');
    const prior=this.db.prepare('SELECT * FROM receipts WHERE user_id=? AND request_key=?').get(actor.id,key);
    if(prior){if(prior.fingerprint!==fingerprint)error(409,'idempotency_mismatch');return {...JSON.parse(prior.response),replayed:true};}
    if(this.db.prepare('SELECT 1 FROM properties WHERE id=?').get(id))error(409,'property_exists');
    const body={version:1,properties:[{id,name}],resources:[],roomTypes:[],physicalRooms:[],ratePlans:[],rateCells:[],
      orders:[],blocks:[],audit:[],notifications:[],noticeSettings:[],noticeRules:[],businessDate:null,
      nightAudits:[],shiftTypes:[],handovers:[]};
    this.db.prepare('INSERT INTO properties VALUES(?,0,?)').run(id,JSON.stringify(body));
    this.db.prepare('INSERT INTO user_properties (user_id,property_id) VALUES(?,?)').run(actor.id,id);
    this.db.prepare('INSERT INTO audit VALUES(?,?,?,?,?,?,?)').run(randomUUID(),id,actor.id,'property_create',new Date().toISOString(),0,
      JSON.stringify({propertyId:id,name,createdBy:actor.username,starterInventory:'empty'}));
    const response={id,propertyId:id,revision:0};
    this.db.prepare('INSERT INTO receipts VALUES(?,?,?,?)').run(actor.id,key,fingerprint,JSON.stringify(response));
    return response;
  }
  // A trial account is created by a stranger on the open internet, so it is validated
  // here rather than by a session, and its powers stop at its own single property.
  // The store is created with the same empty body as property_create: nothing is
  // invented about how many rooms it has. The cap keeps the shared test database from
  // being filled by a loop; reaching it is a service decision, not a user error.
  static trialStoreCap = 500;
  signup({username,password,propertyId,name}){
    if(typeof username!=='string'||!/^[a-zA-Z0-9._-]{3,64}$/.test(username))error(400,'signup_input');
    if(typeof password!=='string'||password.length<12||password.length>256)error(400,'password_length');
    if(typeof propertyId!=='string'||!/^[a-zA-Z0-9_-]{2,40}$/.test(propertyId))error(400,'signup_input');
    if(typeof name!=='string'||!name.trim()||name.trim().length>80)error(400,'signup_input');
    const storeId=propertyId.trim(),storeName=name.trim();
    if(this.db.prepare("SELECT COUNT(*) n FROM users WHERE origin='trial'").get().n>=Store.trialStoreCap)error(403,'signup_closed');
    return this.transaction(()=>{
      if(this.db.prepare('SELECT 1 FROM users WHERE username=?').get(username))error(409,'username_taken');
      if(this.db.prepare('SELECT 1 FROM properties WHERE id=?').get(storeId))error(409,'property_exists');
      const salt=randomBytes(16).toString('hex'),passwordHash=scryptSync(password,salt,64).toString('hex');
      const userId=randomUUID();
      this.db.prepare("INSERT INTO users (id,username,salt,password_hash,role,active,origin) VALUES(?,?,?,?,'admin',1,'trial')").run(userId,username,salt,passwordHash);
      const body={version:1,properties:[{id:storeId,name:storeName}],resources:[],roomTypes:[],physicalRooms:[],ratePlans:[],rateCells:[],
        orders:[],blocks:[],audit:[],notifications:[],noticeSettings:[],noticeRules:[],businessDate:null,
        nightAudits:[],shiftTypes:[],handovers:[]};
      this.db.prepare('INSERT INTO properties VALUES(?,0,?)').run(storeId,JSON.stringify(body));
      this.db.prepare('INSERT INTO user_properties (user_id,property_id) VALUES(?,?)').run(userId,storeId);
      this.db.prepare('INSERT INTO audit VALUES(?,?,?,?,?,?,?)').run(randomUUID(),storeId,userId,'property_create',new Date().toISOString(),0,
        JSON.stringify({propertyId:storeId,name:storeName,createdBy:username,starterInventory:'empty',origin:'trial'}));
      return {username,propertyId:storeId};
    });
  }
  // Team access. This writes the user tables, not a property body, so it is handled
  // before the property reducer and never advances a property revision.
  saveMember(actor,command,key,fingerprint){
    if(!this.permissionsFor(actor,command.propertyId).includes('member_save'))error(403,'forbidden');
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
        // A property may hand out one of its own roles, not only the built-in four.
        if(role!==null&&!this.roleExists(id,role))error(400,'member_input');
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
    // A property-defined role may hold member_save and hand out roles inside this
    // property, but the account row itself (its system role, password, existence) is
    // shared by every property this person touches and stays with account administrators.
    if(actor.role!=='admin'&&(role!==null||password!==null||active!==null||propertyIds!==null||!target))error(403,'forbidden');
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
      // A member created by a trial administrator inherits the trial origin, otherwise
      // an invited "admin" could simply create a second property and defeat the cap.
      this.db.prepare('INSERT INTO users (id,username,salt,password_hash,role,active,origin) VALUES(?,?,?,?,?,?,?)').run(userId,username,salt,passwordHash,role,active===false?0:1,actor.origin||'staff');
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
  // A role is a name plus the actions ticked for it. Editing a role changes what every
  // account holding it may do here, which is why it is audited like a membership change
  // and why the roles in use cannot simply be deleted out from under those accounts.
  saveRole(actor,command,key,fingerprint){
    const propertyId=command.propertyId;
    if(!this.permissionsFor(actor,propertyId).includes('role_save'))error(403,'forbidden');
    const name=typeof command.name==='string'?command.name.replace(/\s+/g,' ').trim():'';
    if(name.length<1||name.length>40)error(400,'role_input');
    if(!Array.isArray(command.actions)||command.actions.length>allActions.length||
      new Set(command.actions).size!==command.actions.length||
      !command.actions.every(action=>typeof action==='string'&&allActions.includes(action)))error(400,'role_input');
    const actions=[...command.actions].sort();
    const roleId=command.roleId===undefined||command.roleId===null?null:String(command.roleId);
    const existing=roleId===null?null:this.db.prepare('SELECT * FROM role_definitions WHERE property_id=? AND id=?').get(propertyId,roleId);
    if(roleId!==null&&!existing)error(404,'not_found');
    if(roleId!==null&&Object.hasOwn(roleTypes,roleId))error(400,'role_input');
    const sameName=this.db.prepare('SELECT id FROM role_definitions WHERE property_id=? AND name=?').get(propertyId,name);
    if(sameName&&sameName.id!==existing?.id)error(409,'role_name_taken');
    if(!existing&&this.db.prepare('SELECT COUNT(*) n FROM role_definitions WHERE property_id=?').get(propertyId).n>=50)error(403,'role_limit');
    const prior=this.db.prepare('SELECT * FROM receipts WHERE user_id=? AND request_key=?').get(actor.id,key);
    if(prior){if(prior.fingerprint!==fingerprint)error(409,'idempotency_mismatch');return {...JSON.parse(prior.response),replayed:true};}
    const at=new Date().toISOString(),id=existing?existing.id:`${rolePrefix}${randomUUID()}`;
    const before=existing?{name:existing.name,actions:this.actionsForRole(existing.id,propertyId)}:null;
    if(existing)this.db.prepare('UPDATE role_definitions SET name=?,actions=?,updated_at=?,updated_by=? WHERE property_id=? AND id=?')
      .run(name,JSON.stringify(actions),at,actor.id,propertyId,id);
    else this.db.prepare('INSERT INTO role_definitions VALUES(?,?,?,?,?,?,?)').run(propertyId,id,name,JSON.stringify(actions),at,at,actor.id);
    this.db.prepare('INSERT INTO member_audit VALUES(?,?,?,?,?,?)').run(randomUUID(),actor.id,actor.id,'role_save',at,
      JSON.stringify({propertyIds:[propertyId],roleId:id,name,actions,previous:before}));
    const response={id,name,actions,created:!existing};
    this.db.prepare('INSERT INTO receipts VALUES(?,?,?,?)').run(actor.id,key,fingerprint,JSON.stringify(response));
    return response;
  }
  // A role that somebody still holds is refused rather than silently stripping that
  // person of every action the role carried.
  deleteRole(actor,command,key,fingerprint){
    const propertyId=command.propertyId;
    if(!this.permissionsFor(actor,propertyId).includes('role_delete'))error(403,'forbidden');
    const row=this.db.prepare('SELECT * FROM role_definitions WHERE property_id=? AND id=?').get(propertyId,command.roleId);
    if(!row)error(404,'not_found');
    const holders=this.db.prepare('SELECT COUNT(*) n FROM user_properties WHERE property_id=? AND role=?').get(propertyId,row.id).n;
    if(holders)error(409,'role_in_use');
    const prior=this.db.prepare('SELECT * FROM receipts WHERE user_id=? AND request_key=?').get(actor.id,key);
    if(prior){if(prior.fingerprint!==fingerprint)error(409,'idempotency_mismatch');return {...JSON.parse(prior.response),replayed:true};}
    const at=new Date().toISOString();
    const actions=this.actionsForRole(row.id,propertyId);
    this.db.prepare('DELETE FROM role_definitions WHERE property_id=? AND id=?').run(propertyId,row.id);
    this.db.prepare('INSERT INTO member_audit VALUES(?,?,?,?,?,?)').run(randomUUID(),actor.id,actor.id,'role_delete',at,
      JSON.stringify({propertyIds:[propertyId],roleId:row.id,name:row.name,actions}));
    const response={id:row.id,deleted:true};
    this.db.prepare('INSERT INTO receipts VALUES(?,?,?,?)').run(actor.id,key,fingerprint,JSON.stringify(response));
    return response;
  }
  // The reference product lets an account carry a role *and* a few extra permissions.
  // The same is offered here, but nobody can hand out an action they do not hold
  // themselves, so an extra grant can never be a way to climb past one's own role.
  saveMemberPermissions(actor,command,key,fingerprint){
    const propertyId=command.propertyId;
    const mine=this.permissionsFor(actor,propertyId);
    if(!mine.includes('member_permission_save'))error(403,'forbidden');
    const target=this.db.prepare('SELECT * FROM users WHERE username=?').get(command.username);
    if(!target||!this.db.prepare('SELECT 1 FROM user_properties WHERE user_id=? AND property_id=?').get(target.id,propertyId))error(404,'not_found');
    if(!Array.isArray(command.actions)||command.actions.length>allActions.length||
      new Set(command.actions).size!==command.actions.length||
      !command.actions.every(action=>typeof action==='string'&&allActions.includes(action)))error(400,'member_input');
    if(command.actions.some(action=>!mine.includes(action)))error(403,'forbidden');
    const prior=this.db.prepare('SELECT * FROM receipts WHERE user_id=? AND request_key=?').get(actor.id,key);
    if(prior){if(prior.fingerprint!==fingerprint)error(409,'idempotency_mismatch');return {...JSON.parse(prior.response),replayed:true};}
    const at=new Date().toISOString();
    const before=this.db.prepare('SELECT action FROM member_permissions WHERE user_id=? AND property_id=? ORDER BY action').all(target.id,propertyId).map(r=>r.action);
    this.db.prepare('DELETE FROM member_permissions WHERE user_id=? AND property_id=?').run(target.id,propertyId);
    for(const action of [...command.actions].sort())
      this.db.prepare('INSERT INTO member_permissions VALUES(?,?,?,?,?)').run(target.id,propertyId,action,actor.id,at);
    this.db.prepare('INSERT INTO member_audit VALUES(?,?,?,?,?,?)').run(randomUUID(),actor.id,target.id,'member_permission_save',at,
      JSON.stringify({propertyIds:[propertyId],username:target.username,actions:[...command.actions].sort(),previous:before}));
    const response={username:target.username,actions:[...command.actions].sort()};
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
    // Publishing is decided by the site_save action within the property itself, so a
    // property-defined role can be trusted with it without becoming an administrator.
    if(!this.permissionsFor(actor,propertyId).includes('site_save')||!this.db.prepare('SELECT 1 FROM user_properties WHERE user_id=? AND property_id=?').get(actor.id,propertyId))error(403,'forbidden');
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
  // Requests raised from a published site. They are read like any other operational
  // list: only the properties this account is scoped to, never another property's mail.
  visibleBookingRequests(user){
    const scope=this.db.prepare('SELECT property_id FROM user_properties WHERE user_id=?').all(user.id).map(p=>p.property_id);
    // Undecided requests are the ones someone has to act on, so they come first.
    const rank=status=>({pending:0,accepted:1,declined:2}[status]??3);
    return this.db.prepare('SELECT * FROM booking_requests').all()
      .filter(row=>scope.includes(row.property_id))
      .sort((a,b)=>rank(a.status)-rank(b.status)||(a.created_at<b.created_at?1:a.created_at>b.created_at?-1:0))
      .map(row=>({id:row.id,propertyId:row.property_id,slug:row.slug,status:row.status,guest:row.guest_name,contact:row.contact,
        start:row.stay_from,end:row.stay_to,guests:row.guests,rooms:row.selections?JSON.parse(row.selections).reduce((n,r)=>n+r.rooms,0):row.rooms||1,
        selections:row.selections?JSON.parse(row.selections):null,roomTypeId:row.room_type_id,note:row.note,language:row.language,
        quotedTotal:row.quoted_total??null,quotedNightly:row.quoted_nightly?JSON.parse(row.quoted_nightly):null,
        createdAt:row.created_at,decidedAt:row.decided_at,decidedBy:row.decided_by,decisionNote:row.decision_note,
        withdrawnAt:row.withdrawn_at||null,reservationId:row.reservation_id,orderId:row.order_id}));
  }
  visibleBookingRequestEvents(user){
    const scope=this.db.prepare('SELECT property_id FROM user_properties WHERE user_id=?').all(user.id).map(p=>p.property_id);
    // Same-millisecond entries still come back in the order they happened, and a
    // request submitted by the public has no account to name.
    return this.db.prepare(`SELECT e.*,r.property_id property_id,u.username username FROM booking_request_events e
      JOIN booking_requests r ON r.id=e.request_id LEFT JOIN users u ON u.id=e.actor
      ORDER BY e.at DESC, e.rowid DESC LIMIT 200`).all()
      .filter(row=>scope.includes(row.property_id))
      .map(row=>({id:row.id,requestId:row.request_id,actor:row.actor==='public'?'public':(row.username||row.actor),
        action:row.action,at:row.at,...JSON.parse(row.summary)}));
  }
  // Accepting a request rewrites it into the reservation it becomes, so the booking a
  // guest asked for is taken through the same inventory, revision and audit rules as
  // one taken at the desk. The price used is the one that was quoted, never a new one.
  // A notice is only raised for the people who can actually act on it, so nobody is
  // woken by something they have no way to deal with. It is stored, never delivered:
  // with no email, SMS or push connected, it is seen by signing in and not before.
  notifyProperty(propertyId,kind,summary,{action=null}={}){
    const at=new Date().toISOString();
    const people=this.db.prepare('SELECT u.* FROM users u JOIN user_properties p ON p.user_id=u.id WHERE u.active=1 AND p.property_id=?').all(propertyId);
    let raised=0;
    for(const person of people){
      if(action&&!this.actionsFor(this.propertyRole(person,propertyId)).includes(action))continue;
      this.db.prepare('INSERT INTO notifications VALUES(?,?,?,?,?,?)').run(randomUUID(),propertyId,person.id,kind,at,JSON.stringify(summary));
      raised++;
    }
    return raised;
  }
  // A property's own priority for each kind of notice. It is a setting, not business
  // state: it is stored and audited apart from the property body, so changing it never
  // advances a revision somebody else is working to. Only explicit overrides are kept,
  // so a level left at the default keeps following the current system rule.
  saveNoticeSettings(actor,command,key,fingerprint){
    const propertyId=command.propertyId;
    // An administrator of this property decides how its list is read. A property-level
    // role override counts here exactly as it does for every other action.
    if(!this.permissionsFor(actor,propertyId).includes('notice_severity_save'))error(403,'forbidden');
    const levels=cleanNoticeLevels(command.levels);
    if(!levels)error(400,'notice_levels');
    const prior=this.db.prepare('SELECT * FROM receipts WHERE user_id=? AND request_key=?').get(actor.id,key);
    if(prior){if(prior.fingerprint!==fingerprint)error(409,'idempotency_mismatch');return {...JSON.parse(prior.response),replayed:true};}
    const before=this.db.prepare('SELECT * FROM notice_settings WHERE property_id=?').get(propertyId);
    const previous=before?JSON.parse(before.body):{};
    const at=new Date().toISOString(),id=randomUUID();
    this.db.prepare(`INSERT INTO notice_settings VALUES(?,?,?,?) ON CONFLICT(property_id) DO UPDATE SET
      body=excluded.body,updated_at=excluded.updated_at,updated_by=excluded.updated_by`)
      .run(propertyId,JSON.stringify(levels),at,actor.id);
    this.db.prepare('INSERT INTO notice_settings_audit VALUES(?,?,?,?,?)').run(id,actor.id,propertyId,at,
      JSON.stringify({previous,next:levels}));
    const response={id,propertyId,levels};
    this.db.prepare('INSERT INTO receipts VALUES(?,?,?,?)').run(actor.id,key,fingerprint,JSON.stringify(response));
    return response;
  }
  visibleNoticeSettings(user){
    const scope=this.db.prepare('SELECT property_id FROM user_properties WHERE user_id=?').all(user.id).map(p=>p.property_id);
    return this.db.prepare('SELECT * FROM notice_settings').all().filter(row=>scope.includes(row.property_id))
      .map(row=>({propertyId:row.property_id,levels:JSON.parse(row.body),updatedAt:row.updated_at,updatedBy:row.updated_by}));
  }
  visibleNoticeSettingsAudit(user){
    const scope=this.db.prepare('SELECT property_id FROM user_properties WHERE user_id=?').all(user.id).map(p=>p.property_id);
    return this.db.prepare(`SELECT a.*,u.username actor FROM notice_settings_audit a JOIN users u ON u.id=a.actor_id
      ORDER BY a.at DESC, a.rowid DESC LIMIT 200`).all()
      .filter(row=>scope.includes(row.property_id))
      .map(row=>{const summary=JSON.parse(row.summary);return {id:row.id,at:row.at,actor:row.actor,
        propertyId:row.property_id,previous:summary.previous,next:summary.next};});
  }
  // The same shape as the priority setting, for the conditional rules. An administrator
  // of this property decides them; nothing about a rule is business state, so it is
  // answered from here and never advances a revision or raises a notice of its own.
  saveNoticeRules(actor,command,key,fingerprint){
    const propertyId=command.propertyId;
    if(!this.permissionsFor(actor,propertyId).includes('notice_rule_save'))error(403,'forbidden');
    const rules=cleanNoticeRules(command.rules);
    if(!rules)error(400,'notice_rules');
    const prior=this.db.prepare('SELECT * FROM receipts WHERE user_id=? AND request_key=?').get(actor.id,key);
    if(prior){if(prior.fingerprint!==fingerprint)error(409,'idempotency_mismatch');return {...JSON.parse(prior.response),replayed:true};}
    const before=this.db.prepare('SELECT * FROM notice_rules WHERE property_id=?').get(propertyId);
    const previous=before?JSON.parse(before.body):{};
    const at=new Date().toISOString(),id=randomUUID();
    this.db.prepare(`INSERT INTO notice_rules VALUES(?,?,?,?) ON CONFLICT(property_id) DO UPDATE SET
      body=excluded.body,updated_at=excluded.updated_at,updated_by=excluded.updated_by`)
      .run(propertyId,JSON.stringify(rules),at,actor.id);
    this.db.prepare('INSERT INTO notice_rules_audit VALUES(?,?,?,?,?)').run(id,actor.id,propertyId,at,
      JSON.stringify({previous,next:rules}));
    const response={id,propertyId,rules};
    this.db.prepare('INSERT INTO receipts VALUES(?,?,?,?)').run(actor.id,key,fingerprint,JSON.stringify(response));
    return response;
  }
  visibleNoticeRules(user){
    const scope=this.db.prepare('SELECT property_id FROM user_properties WHERE user_id=?').all(user.id).map(p=>p.property_id);
    return this.db.prepare('SELECT * FROM notice_rules').all().filter(row=>scope.includes(row.property_id))
      .map(row=>({propertyId:row.property_id,rules:JSON.parse(row.body),updatedAt:row.updated_at,updatedBy:row.updated_by}));
  }
  visibleNoticeRulesAudit(user){
    const scope=this.db.prepare('SELECT property_id FROM user_properties WHERE user_id=?').all(user.id).map(p=>p.property_id);
    return this.db.prepare(`SELECT a.*,u.username actor FROM notice_rules_audit a JOIN users u ON u.id=a.actor_id
      ORDER BY a.at DESC, a.rowid DESC LIMIT 200`).all()
      .filter(row=>scope.includes(row.property_id))
      .map(row=>{const summary=JSON.parse(row.summary);return {id:row.id,at:row.at,actor:row.actor,
        propertyId:row.property_id,previous:summary.previous,next:summary.next};});
  }
  // Only the notices addressed to this account, and only for properties it is scoped to.
  // Stored events and standing facts are put together here so the desk sees one list.
  visibleNotifications(user){
    const scope=this.db.prepare('SELECT property_id FROM user_properties WHERE user_id=?').all(user.id).map(p=>p.property_id);
    const reads=new Map(this.db.prepare('SELECT notification_id id,at FROM notification_reads WHERE user_id=?').all(user.id).map(r=>[r.id,r.at]));
    const stored=this.db.prepare('SELECT * FROM notifications WHERE user_id=? ORDER BY at DESC LIMIT 500').all(user.id)
      .filter(row=>scope.includes(row.property_id))
      .map(row=>({id:row.id,propertyId:row.property_id,kind:row.kind,at:row.at,...JSON.parse(row.summary)}));
    // An override and a conditional rule both belong to the property that raised the
    // notice, so one property's choice can never reorder another property's list. The
    // rule is applied after the base level, and can only raise a standing fact towards
    // the top when that fact has grown large enough to warrant it.
    const overrides=new Map(this.visibleNoticeSettings(user).map(s=>[s.propertyId,s.levels]));
    const rules=new Map(this.visibleNoticeRules(user).map(s=>[s.propertyId,s.rules]));
    const staff=scope.flatMap(pid=>{const b=JSON.parse(this.db.prepare('SELECT body FROM properties WHERE id=?').get(pid).body);return (b.staffNotices||[]).filter(n=>(!n.recipient||n.recipient===user.username||n.actor===user.username)&&!(b.noticeWithdrawals||[]).some(w=>w.noticeId===n.id)).map(n=>({...n,kind:'staff_notice'}));});
    const all=[...staff,...stored,...this.derivedNotifications(user)].map(n=>{
      const base=severityOf(n.kind,overrides.get(n.propertyId));
      const severity=escalateSeverity(n.kind,base,n.magnitude,rules.get(n.propertyId));
      const body=JSON.parse(this.db.prepare('SELECT body FROM properties WHERE id=?').get(n.propertyId).body);
      return reminderForAccount(body,{...n,readAt:reads.get(n.id)??null,severity,escalated:severity!==base},user.username);
    });
    // What is waiting on a person comes first, then what they have not seen, then the
    // newest. A guest standing outside the door outranks a room that needs cleaning, and
    // notices from the same moment keep a stable order. A property may change that order.
    return all.sort((a,b)=>severityRank[a.severity]-severityRank[b.severity]||(a.readAt?1:0)-(b.readAt?1:0)||(a.at<b.at?1:a.at>b.at?-1:0)||(a.id<b.id?-1:1));
  }
  // Notices that are not events but facts still standing: a guest who should have arrived,
  // one who should have left, a room nobody has been given. They are worked out from the
  // property each time instead of being stored, so one that has been dealt with disappears
  // by itself rather than lingering as a message about something already done. Only
  // required night-audit exceptions are raised; advisory ones would only add noise.
  derivedNotifications(user){
    const scope=this.db.prepare('SELECT property_id FROM user_properties WHERE user_id=?').all(user.id).map(p=>p.property_id);
    const isDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value);
    const today=localDay(new Date().toISOString());
    const out=[];
    for(const propertyId of scope){
      const row=this.db.prepare('SELECT * FROM properties WHERE id=?').get(propertyId);
      if(!row)continue;
      const body=upgradeCatalog(JSON.parse(row.body));
      const on=body.businessDate;
      const orders=(body.orders||[]).filter(o=>o.propertyId===propertyId);
      // The same rule as a stored notice: only somebody who can act on it is told.
      const allowed=action=>this.actionsFor(this.propertyRole(user,propertyId)).includes(action);
      const add=(kind,action,notice)=>{
        if(!allowed(action))return;
        out.push({id:`derived:${kind}:${notice.orderId||notice.requestId||propertyId}:${notice.due}`,kind,propertyId,
          at:`${notice.due}T00:00:00.000Z`,...notice});
      };
      if(isDate(on)){
        for(const item of nightAuditExceptions({orders},on,o=>isBoxed(o))){
          if(item.kind==='no_show')add('no_show','edit',{orderId:item.orderId,guest:item.guest,due:item.date,date:item.date});
          else if(item.kind==='overdue_checkout')add('overdue_checkout','edit',{orderId:item.orderId,guest:item.guest,due:item.date,date:item.date});
        }
        // Arriving today with no room yet: as things stand they cannot be let in.
        for(const order of orders.filter(o=>o.status==='confirmed'&&!o.resourceId&&!isBoxed(o)&&o.start<=on&&o.end>on))
          add('unassigned_arrival','assign',{orderId:order.id,guest:order.guest,due:on,date:on});
        const dirty=saleResources(body,propertyId).filter(r=>r.cleaning==='dirty').length;
        if(dirty)add('rooms_to_clean','clean',{due:on,date:on,count:dirty,magnitude:dirty});
      }
      // A request nobody has answered is the one thing the site itself cannot chase.
      // The magnitude is how many are being left waiting at once, so a property can
      // say that a growing backlog deserves to be read sooner than a single one.
      const waiting=this.db.prepare("SELECT * FROM booking_requests WHERE property_id=? AND status='pending'").all(propertyId)
        .filter(request=>Date.now()-Date.parse(request.created_at)>=24*60*60*1000);
      for(const request of waiting)
        add('request_waiting','booking_request_decision',{requestId:request.id,guest:request.guest_name,due:today,date:today,
          magnitude:waiting.length});
      // Somebody has handed in their identity details and is standing behind a person's
      // decision: until it is reviewed they cannot be let in, and nothing is sent to
      // anybody to say so. Approved or rejected, the fact stops and so does the notice.
      // Self-registration switched off means nobody is waiting on it any more.
      if(this.checkin?.policy(propertyId).enabled){
        const pending=this.db.prepare("SELECT * FROM sc_grants WHERE property_id=? AND status='active' AND review='pending' AND submission IS NOT NULL").all(propertyId)
          .filter(grant=>orders.some(o=>o.id===grant.order_id));
        for(const grant of pending){
          const order=orders.find(o=>o.id===grant.order_id);
          add('checkin_review','sc_review',{orderId:order.id,grantId:grant.id,guest:order.guest,due:today,date:today,
            magnitude:pending.length});
        }
      }
    }
    return out;
  }
  // A small feed for the bell in the header: how much is still unread, and the newest
  // few. Polling this is cheap next to reading the whole state, so the desk can be told
  // something arrived without reloading the page they are working on.
  notificationFeed(user){
    // The account is read from the table rather than taken on trust, so what may be done
    // here is decided by the stored role and not by whatever the caller passed in.
    const fresh=this.db.prepare('SELECT * FROM users WHERE id=? AND active=1').get(user?.id);
    if(!fresh)error(401,'login_required');
    const all=this.visibleNotifications(fresh);
    return {unread:all.filter(n=>!n.readAt).length,items:all.slice(0,20)};
  }
  // Reading is personal and changes nothing else: no revision moves, no inventory is
  // touched, and the notice itself is never rewritten.
  readNotifications(actor,command,key,fingerprint){
    const prior=this.db.prepare('SELECT * FROM receipts WHERE user_id=? AND request_key=?').get(actor.id,key);
    if(prior){if(prior.fingerprint!==fingerprint)error(409,'idempotency_mismatch');return {...JSON.parse(prior.response),replayed:true};}
    const propertyId=command.propertyId;
    const read=new Set(this.db.prepare('SELECT notification_id id FROM notification_reads WHERE user_id=?').all(actor.id).map(r=>r.id));
    // A standing fact has no stored row, so its id is only readable if this account is
    // actually being shown it: anything else is answered as absent.
    const factual=new Set(this.visibleNotifications(actor).filter(n=>n.propertyId===propertyId).map(n=>n.id));
    let ids;
    if(command.all===true){
      const stored=this.db.prepare('SELECT id FROM notifications WHERE user_id=? AND property_id=?').all(actor.id,propertyId)
        .map(r=>r.id).filter(id=>!read.has(id));
      ids=[...new Set([...stored,...[...factual].filter(id=>!read.has(id))])];
    }
    else{
      const single=this.db.prepare('SELECT * FROM notifications WHERE id=?').get(command.notificationId);
      // A notice addressed to somebody else is not readable, and is treated as absent.
      if(single){if(single.user_id!==actor.id||single.property_id!==propertyId)error(404,'not_found');}
      else if(!factual.has(command.notificationId))error(404,'not_found');
      ids=[command.notificationId];
    }
    const at=new Date().toISOString();
    for(const id of ids)this.db.prepare('INSERT OR IGNORE INTO notification_reads VALUES(?,?,?)').run(id,actor.id,at);
    const response={read:ids.length,propertyId};
    this.db.prepare('INSERT INTO receipts VALUES(?,?,?,?)').run(actor.id,key,fingerprint,JSON.stringify(response));
    return response;
  }
  bookingRequestCommand(row){
    const property=this.db.prepare('SELECT * FROM properties WHERE id=?').get(row.property_id);
    const body=upgradeCatalog(JSON.parse(property.body));
    const type=body.roomTypes.find(t=>t.id===row.room_type_id);
    if(!type||type.archived)error(409,'site_input');
    const days=[];for(let day=row.stay_from;day<row.stay_to;day=new Date(Date.parse(day+'T00:00:00Z')+86400000).toISOString().slice(0,10))days.push(day);
    const quoted=row.quoted_nightly?JSON.parse(row.quoted_nightly):null;
    const rates=quoted&&quoted.length===days.length?days.map((date,i)=>({date,amount:quoted[i]})):null;
    const email=/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.contact);
    const longContact=!email&&row.contact.length>40?`Contact: ${row.contact}`:'';
    const roomCount=Math.min(30,Math.max(1,Number(row.rooms)||1));
    // Every room gets its own stay, so accepting a request for several rooms goes
    // through exactly the same inventory and folio rules as any other multi-room stay.
    const stay=()=>({productId:type.productId,roomTypeId:type.id,gender:'any',start:row.stay_from,end:row.stay_to,group:'',
      nightly:rates?rates[0].amount:0,...(rates?{nightlyRates:rates}:{}),
      adults:row.guests,children:0,infants:0,
      occupants:Array.from({length:row.guests},()=>({name:'',gender:type.gender==='any'?'any':type.gender}))});
    return {type:'create_reservation',propertyId:row.property_id,bookingRequestId:row.id,
      mode:'reserve',bookingKind:'individual',autoAssign:false,source:'bookingengine',
      guest:row.guest_name,notes:[row.note,longContact,roomCount>1?`${roomCount} rooms requested`:'']
        .filter(Boolean).join(' — ').slice(0,2048),
      date:body.businessDate||localDay(new Date()),
      ...(email?{email:row.contact}:row.contact.length<=40?{phone:row.contact}:{}),
      stays:row.selections?JSON.parse(row.selections).flatMap(line=>{
        const selected=body.roomTypes.find(t=>t.id===line.roomTypeId&&!t.archived);if(!selected)error(409,'site_input');
        return Array.from({length:line.rooms},()=>({...stay(),roomTypeId:selected.id,productId:selected.productId,gender:selected.gender||'any',occupants:Array.from({length:row.guests},()=>({name:'',gender:selected.gender||'any'})),
          nightly:line.nightly?.[0]??0,nightlyRates:line.nightly?days.map((date,i)=>({date,amount:line.nightly[i]})):undefined}));
      }):Array.from({length:roomCount},stay)};
  }
  // Declining keeps the request and the reason together: no inventory is touched, no
  // revision moves, and what the guest asked for stays on the record.
  decideBookingRequest(actor,command,key,fingerprint){
    const propertyId=command.propertyId;
    const row=this.db.prepare('SELECT * FROM booking_requests WHERE id=?').get(command.requestId);
    if(!row||row.property_id!==propertyId)error(404,'not_found');
    // Replaying the same key answers from the receipt first, so a retry never looks
    // like a refusal just because the first attempt already decided the request.
    const prior=this.db.prepare('SELECT * FROM receipts WHERE user_id=? AND request_key=?').get(actor.id,key);
    if(prior){if(prior.fingerprint!==fingerprint)error(409,'idempotency_mismatch');return {...JSON.parse(prior.response),replayed:true};}
    if(row.status!=='pending')error(409,'request_state');
    if(command.decision!=='decline')error(400,'request_input');
    const reason=String(command.reason??'').trim();
    if(!reason||reason.length>500)error(400,'request_reason');
    const at=new Date().toISOString(),id=randomUUID();
    const changed=this.db.prepare(`UPDATE booking_requests SET status=?,decided_at=?,decided_by=?,decision_note=? WHERE id=? AND status='pending'`)
      .run('declined',at,actor.id,reason,row.id);
    if(!changed.changes)error(409,'request_state');
    this.db.prepare('INSERT INTO booking_request_events VALUES(?,?,?,?,?,?)').run(id,row.id,actor.id,'decline',at,
      JSON.stringify({reason,actor:actor.username,guest:row.guest_name,from:row.stay_from,to:row.stay_to}));
    const response={id,requestId:row.id,propertyId,status:'declined'};
    this.db.prepare('INSERT INTO receipts VALUES(?,?,?,?)').run(actor.id,key,fingerprint,JSON.stringify(response));
    return response;
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
        photos:type.photos||[],cover:type.cover||'',descriptions:type.descriptions||{},roomDescriptions:body.physicalRooms.filter(r=>r.propertyId===row.property_id&&body.resources.some(unit=>unit.roomId===r.id&&unit.roomTypeId===type.id&&!unit.archived)&&!r.archived).map(r=>({label:r.label,descriptions:r.descriptions||{}})),
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
      return {...type,id:type.id,names:type.names,productId:type.productId,maxGuests:type.maxGuests,units:type.units,
        available:error_?null:available,unknown:!!error_,
        fitsGuests:type.maxGuests>=count,
        nightlyFrom:(priced&&prices.length)?Math.min(...prices):null,
        total:(priced&&prices.length)?prices.reduce((n,p)=>n+p,0):null,
        nightly:priced?prices:null,
        nights:nights.length};
    });
    return {...site,nights:nights.length,from,to,guests:count,businessDate,
      // A price is only trustworthy when every night of the stay actually has one.
      priceKnown:roomTypes.some(t=>t.total!==null),
      roomTypes};
  }
  // What a published site collects instead of a booking. It answers without a session,
  // stores the request as undecided, and quotes without charging, holding or
  // confirming anything: only the front desk can turn it into a stay.
  submitBookingRequest({slug,roomTypeId,from,to,guests,rooms=1,name,contact,note,language,selections}={}){
    if(selections!==undefined){
      if(!Array.isArray(selections)||!selections.length||selections.length>8||new Set(selections.map(r=>r.roomTypeId)).size!==selections.length)error(400,'room_count');
      const site=this.publicAvailability({slug,from,to,guests});
      const lines=selections.map(r=>{
        const quote=site.roomTypes.find(t=>t.id===r.roomTypeId),n=Number(r.rooms);
        if(!quote||!Number.isSafeInteger(n)||n<1||n>8||!quote.fitsGuests||quote.productId==='bed'&&Number(guests)!==1||Number.isSafeInteger(quote.available)&&n>quote.available)error(400,'room_count');
        return {roomTypeId:r.roomTypeId,rooms:n,nightly:quote.nightly,total:quote.total==null?null:quote.total*n};
      });
      if(lines.reduce((sum,r)=>sum+r.rooms,0)>8)error(400,'room_count');
      return this.transaction(()=>{
        const result=this.submitBookingRequest({slug,roomTypeId:lines[0].roomTypeId,rooms:lines[0].rooms,from,to,guests,name,contact,note,language});
        const total=lines.some(r=>r.total===null)?null:lines.reduce((sum,r)=>sum+r.total,0);
        this.db.prepare('UPDATE booking_requests SET selections=?,quoted_total=? WHERE id=?').run(JSON.stringify(lines),total,result.id);
        this.db.prepare('INSERT INTO booking_request_events VALUES(?,?,?,?,?,?)').run(randomUUID(),result.id,'public','selection',new Date().toISOString(),JSON.stringify({selections:lines}));
        return {...result,rooms:lines.reduce((sum,r)=>sum+r.rooms,0),quotedTotal:total,selections:lines};
      });
    }
    const site=this.publicSite(slug);
    const type=site.roomTypes.find(t=>t.id===roomTypeId);
    if(!type)error(400,'site_input');
    const valid=day=>typeof day==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(day)&&Number.isFinite(Date.parse(day+'T00:00:00Z'))&&
      new Date(day+'T00:00:00Z').toISOString().slice(0,10)===day;
    if(!valid(from)||!valid(to)||to<=from||(Date.parse(to)-Date.parse(from))/86400000>31)error(400,'date_range');
    const count=Number(guests);if(!Number.isSafeInteger(count)||count<1||count>20)error(400,'guest_count');
    // Capacity is checked now instead of at the desk, so a request that could never be
    // accepted is not queued for someone to reject by hand.
    if(count>type.maxGuests||type.productId==='bed'&&count!==1)error(400,'guest_count');
    const roomCount=Number(rooms??1);if(!Number.isSafeInteger(roomCount)||roomCount<1||roomCount>8)error(400,'room_count');
    const guestName=String(name??'').replace(/\s+/g,' ').trim();
    if(!guestName||guestName.length>100)error(400,'guest_name');
    const contactText=String(contact??'').replace(/\s+/g,' ').trim();
    if(!contactText||contactText.length>254)error(400,'contact');
    // Notes are the one free-text field a bot fills with links. Three is already more
    // than a guest arranging a stay needs, and refusing it writes nothing at all.
    if((String(note??'').match(/https?:\/\//gi)||[]).length>3)error(400,'site_input');
    const noteText=String(note??'').trim().slice(0,2000);
    const lang=['zh','en','ms'].includes(language)?language:'en';
    const quote=this.publicAvailability({slug,from,to,guests:count}).roomTypes.find(t=>t.id===roomTypeId);
    // A request for more rooms than are free could never be accepted, so it is refused
    // here rather than left for somebody to reject by hand. A single room keeps the
    // original behaviour: asking when nothing is free is still recorded, and it is
    // the desk's acceptance that runs out of inventory. An unknown availability is
    // left alone because the desk still has to decide it.
    if(roomCount>1&&quote&&Number.isSafeInteger(quote.available)&&roomCount>quote.available)error(400,'room_count');
    const quotedTotal=quote?.total==null?null:quote.total*roomCount;
    const nights=Math.round((Date.parse(to)-Date.parse(from))/86400000);
    const id=randomUUID(),at=new Date().toISOString();
    this.db.prepare(`INSERT INTO booking_requests
      (id,property_id,slug,status,guest_name,contact,stay_from,stay_to,guests,rooms,room_type_id,note,language,
       quoted_total,quoted_nightly,created_at,decided_at,decided_by,decision_note,reservation_id,order_id,withdrawn_at)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .run(id,site.propertyId,slug,'pending',guestName,contactText,from,to,count,roomCount,roomTypeId,noteText,lang,
        quotedTotal,quote?.nightly?JSON.stringify(quote.nightly):null,at,null,null,null,null,null,null);
    this.db.prepare('INSERT INTO booking_request_events VALUES(?,?,?,?,?,?)').run(randomUUID(),id,'public','submit',at,
      JSON.stringify({slug,roomTypeId,from,to,guests:count,rooms:roomCount,nights,quotedTotal,language:lang}));
    // The desk has no other way to learn a request arrived, so the people who can decide
    // on one are told here. Without this the request simply waits, unseen.
    this.notifyProperty(site.propertyId,'booking_request',{requestId:id,slug,guest:guestName,from,to,nights,guests:count,
      rooms:roomCount,roomTypeId,quotedTotal},{action:'booking_request_decision'});
    return {id,reference:id.slice(0,8).toUpperCase(),status:'pending',nights,rooms:roomCount,quotedTotal,
      quotedNightly:quote?.nightly??null};
  }
  // A reference is short enough to guess, so it is not a secret. Looking a request up
  // or withdrawing it also asks for the exact contact details left with it, so one
  // guest can neither read nor cancel another's request. Only public facts are returned:
  // no account, no internal audit note, no other guest.
  normalizeContact(value){return String(value??'').trim().toLowerCase().replace(/\s+/g,'');}
  findBookingRequest({slug,reference,contact}={}){
    const ref=String(reference??'').trim().toUpperCase();
    if(!/^[0-9A-F]{8}$/.test(ref))error(404,'site_input');
    const row=this.db.prepare('SELECT * FROM booking_requests WHERE slug=? AND substr(upper(id),1,8)=?').get(slug,ref);
    const contactKey=this.normalizeContact(contact);
    if(!contactKey||!row||this.normalizeContact(row.contact)!==contactKey)error(404,'site_input');
    return row;
  }
  lookupBookingRequest(input){
    const row=this.findBookingRequest(input);
    const property=this.db.prepare('SELECT body FROM properties WHERE id=?').get(row.property_id);
    const type=property?upgradeCatalog(JSON.parse(property.body)).roomTypes.find(t=>t.id===row.room_type_id):null;
    return {reference:String(row.id).slice(0,8).toUpperCase(),status:row.status,withdrawn:!!row.withdrawn_at,
      start:row.stay_from,end:row.stay_to,guests:row.guests,rooms:row.selections?JSON.parse(row.selections).reduce((n,r)=>n+r.rooms,0):row.rooms||1,
      roomType:type?.names||{},roomTypeId:row.room_type_id,quotedTotal:row.quoted_total??null,
      createdAt:row.created_at,decidedAt:row.decided_at,
      decisionNote:row.withdrawn_at?null:(row.decision_note||null),
      canWithdraw:row.status==='pending'};
  }
  withdrawBookingRequest(input){
    const row=this.findBookingRequest(input);
    if(row.status!=='pending'||row.withdrawn_at)error(409,'request_state');
    const at=new Date().toISOString();
    // The status column keeps its original three values, so a guest withdrawal is a
    // declined request with its own marker and an append-only event. No table is
    // rebuilt, no booking is touched and no business revision moves.
    const changed=this.db.prepare(`UPDATE booking_requests SET status='declined',decided_at=?,decided_by=NULL,
      decision_note='withdrawn_by_guest',withdrawn_at=? WHERE id=? AND status='pending'`).run(at,at,row.id);
    if(!changed.changes)error(409,'request_state');
    this.db.prepare('INSERT INTO booking_request_events VALUES(?,?,?,?,?,?)').run(randomUUID(),row.id,'guest','withdraw',at,
      JSON.stringify({reference:String(row.id).slice(0,8).toUpperCase(),from:row.stay_from,to:row.stay_to,rooms:row.rooms||1}));
    return this.lookupBookingRequest(input);
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
    // An administrator with no property yet still needs to load the workspace to reach
    // the control that creates the first one. Nothing is disclosed: with no property
    // scope there is no property row to read, and every command still needs authorize().
    if(fresh.role==='admin'&&!this.db.prepare('SELECT 1 FROM user_properties WHERE user_id=?').get(user.id))
      return {ratePlans:[],rateCells:[],rateChanges:[],version:1,properties:[],resources:[],roomTypes:[],physicalRooms:[],
        reservations:[],orders:[],blocks:[],audit:[],revisions:{},businessDates:{},nightAudits:[],shiftTypes:[],handovers:[],
        members:this.visibleMembers(fresh),memberAudit:this.visibleMemberAudit(fresh),roles:[],sites:[],siteAudit:[],
        bookingRequests:[],bookingRequestEvents:[],notifications:[],noticeSettings:[],noticeSettingsAudit:[],
        noticeRules:[],noticeRulesAudit:[],noPropertyYet:true};
    const ids=this.publicUser(fresh).propertyIds;
    const result={commissionPeriods:[],arPeriods:[],arAccounts:[],arItems:[],arEvents:[],ratePlans:[],rateCells:[],rateChanges:[],version:1,properties:[],resources:[],roomTypes:[],physicalRooms:[],reservations:[],orders:[],blocks:[],audit:[],revisions:{},businessDates:{},nightAudits:[],shiftTypes:[],handovers:[],members:[],memberAudit:[],roles:[],sites:[],siteAudit:[],bookingRequests:[],bookingRequestEvents:[],notifications:[],noticeSettings:[],noticeSettingsAudit:[],noticeRules:[],noticeRulesAudit:[]};
    for(const id of ids){
      const row=this.db.prepare('SELECT * FROM properties WHERE id=?').get(id);
      const body=upgradeCatalog(JSON.parse(row.body));
      if (this.permissionsFor(fresh,id).includes('ar_report_view')) {
        for (const field of ['arAccounts','arItems','arEvents','arPeriods']) result[field].push(...(body[field]||[]).filter(item=>item.propertyId===id));
      }
      const allowed=this.permissionsFor(fresh,id);
      if(allowed.includes('commission_save')||allowed.includes('commission_close_month')) result.commissionPeriods.push(...(body.commissionPeriods||[]).filter(entry=>entry.propertyId===id));
      result.businessDates[id]=body.businessDate ?? null;
      result.nightAudits.push(...(body.nightAudits||[]).map(entry=>({...entry,propertyId:id})));
      result.shiftTypes.push(...(body.shiftTypes||[]).map(entry=>({...entry,propertyId:id})));
      result.handovers.push(...(body.handovers||[]).map(entry=>({...entry,propertyId:id})));
      const visibleNotice=n=>fresh.role==='admin'||!n.recipient||n.recipient===fresh.username||n.actor===fresh.username;
      for(const field of ['directoryHistory','customerTagHistory','memoHistory','noticeScopes','staffNotices','noticeWithdrawals','commissionRates','listingDrafts','contentHistory']){
        result[field]??=[];result[field].push(...(body[field]||[]).filter(r=>r.propertyId===id&&
          (field!=='staffNotices'||visibleNotice(r))&&(field!=='noticeWithdrawals'||(body.staffNotices||[]).some(n=>n.id===r.noticeId&&visibleNotice(n)))));
      }
      for(const field of ['ratePlans','rateCells','rateChanges','properties','resources','roomTypes','physicalRooms','reservations','orders','blocks'])result[field].push(...body[field].filter(item=>(field==='properties'?item.id:item.propertyId)===id));
      result.revisions[id]=row.revision;
    }
    result.audit=this.db.prepare(`SELECT a.*,u.username actor FROM audit a JOIN users u ON u.id=a.actor_id
      JOIN user_properties p ON p.user_id=? AND p.property_id=a.property_id ORDER BY a.at DESC LIMIT 500`).all(user.id).map(a=>({
        id:a.id,propertyId:a.property_id,type:a.action,at:a.at,actor:a.actor,revision:a.revision,...JSON.parse(a.summary) }));
    result.members=this.visibleMembers(fresh);
    result.memberAudit=this.visibleMemberAudit(fresh);
    result.roles=this.visibleRoles(fresh);
    result.sites=this.visibleSites(fresh);
    result.siteAudit=this.visibleSiteAudit(fresh);
    result.bookingRequests=this.visibleBookingRequests(fresh);
    result.bookingRequestEvents=this.visibleBookingRequestEvents(fresh);
    result.notifications=this.visibleNotifications(fresh);
    result.noticeSettings=this.visibleNoticeSettings(fresh);
    result.noticeSettingsAudit=this.visibleNoticeSettingsAudit(fresh);
    result.noticeRules=this.visibleNoticeRules(fresh);
    result.noticeRulesAudit=this.visibleNoticeRulesAudit(fresh);
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
      // A new property is created before authorize(): the caller cannot hold a property
      // that does not exist yet. createProperty() re-checks the administrator role itself.
      if(command.type==='property_create')return this.createProperty(rowUser,command,key,fingerprint);
      this.authorize(user,propertyId);
      let requestRow=null;
      // Team access is not a property business command: it writes the user tables and
      // is answered here instead of being folded into a property revision.
      if(command.type==='member_save')return this.saveMember(rowUser,command,key,fingerprint);
      // Roles and single-action grants are access control too: they write the user
      // tables, are audited with the other access changes, and never touch a revision.
      if(command.type==='role_save')return this.saveRole(rowUser,command,key,fingerprint);
      if(command.type==='role_delete')return this.deleteRole(rowUser,command,key,fingerprint);
      if(command.type==='member_permission_save')return this.saveMemberPermissions(rowUser,command,key,fingerprint);
      // Publishing a property site writes public content, not property state.
      if(command.type==='site_save')return this.saveSite(rowUser,command,key,fingerprint);
      // A property's choice of notice priority, and of the conditional rules that raise
      // a big enough fact, are settings rather than property business commands. They are
      // answered here so neither ever advances a revision someone else is using.
      if(command.type==='notice_severity_save')return this.saveNoticeSettings(rowUser,command,key,fingerprint);
      if(command.type==='notice_rule_save')return this.saveNoticeRules(rowUser,command,key,fingerprint);
      // Marking a notice read is personal housekeeping, not a property business command:
      // it is answered here so it never advances a revision someone else is working to.
      if(command.type==='notification_read')return this.readNotifications(rowUser,command,key,fingerprint);
      // Deciding a booking request. Declining only records why, so it is answered here;
      // accepting is rewritten into the reservation it becomes, so the guest's stay is
      // taken through the same inventory, revision and audit rules as any other.
      if(command.type==='booking_request_decision'){
        requestRow=this.db.prepare('SELECT * FROM booking_requests WHERE id=?').get(command.requestId);
        if(!requestRow||requestRow.property_id!==propertyId)error(404,'not_found');
        if(command.decision==='decline')return this.decideBookingRequest(rowUser,command,key,fingerprint);
        if(command.decision!=='accept')error(400,'request_input');
        // A withdrawn or already decided request must never become a second booking.
        // The update at the end is guarded by status='pending', but by then an order
        // would already exist, so the state has to be checked before rewriting it.
        if(requestRow.status!=='pending'||requestRow.withdrawn_at)error(409,'request_state');
        command=this.bookingRequestCommand(requestRow);
      }
      // A property override decides what this account may do here, not its account role.
      // The override may name a built-in role or one this property defined itself.
      const allowed=this.permissionsFor(rowUser,propertyId);
      const batchAdmin=['directory_entry_save','customer_tag_set','commission_close_month','notice_scope_save','commission_rate_save','listing_draft_save','booking_content_save'];
      if(batchAdmin.includes(command.type)&&rowUser.role!=='admin')error(403,'forbidden');
      if(['notice_scope_save','notice_send'].includes(command.type)){const account=command.username||command.recipient;if(account&&!this.db.prepare('SELECT 1 FROM users u JOIN user_properties p ON p.user_id=u.id WHERE u.username=? AND p.property_id=? AND u.active=1').get(account,propertyId))error(400,'scope');}
      if(command.type==='commission_save'&&command.correction===true&&!allowed.includes('commission_close_month'))error(403,'forbidden');
      if(command.type==='create_reservation'&&command.mode==='checkin'&&!allowed.includes('checkin'))error(403,'forbidden');
      // Rewriting nights already closed by a night audit stays an administrator-only override.
      if(command.auditOverride===true&&rowUser.role!=='admin')error(403,'forbidden');
      if(!allowed.includes(({directory_entry_save:'room_type_save',customer_tag_set:'room_type_save',notice_scope_save:'notice_rule_save',commission_rate_save:'commission_close_month',listing_draft_save:'room_type_save',booking_content_save:'site_save',notice_send:'memo_save',notice_withdraw:'memo_save',undo_checkin:'checkin',undo_checkout:'checkout',restore_cancel:'cancel'})[command.type]||command.type)||command.type.startsWith('ar_')&&!allowed.includes('ar_report_view'))error(403,'forbidden');
      const prior=this.db.prepare('SELECT * FROM receipts WHERE user_id=? AND request_key=?').get(user.id,key);
      if(prior){if(prior.fingerprint!==fingerprint)error(409,'idempotency_mismatch');return {...JSON.parse(prior.response),replayed:true};}
      // A request is decided once. Replaying the same key answers from the receipt above;
      // a fresh attempt on one that is already answered is refused.
      if(requestRow&&requestRow.status!=='pending')error(409,'request_state');
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
      const localAudit=next.audit[0];
      next.audit=[]; // Durable audit is stored separately, never trusted from the browser.
      this.db.prepare('UPDATE properties SET revision=?,body=? WHERE id=?').run(revision,JSON.stringify(next),propertyId);
      const catalogEntity = body => cmd.type==='room_type_save' ? body.roomTypes.find(t=>t.id===(cmd.roomTypeId||cmd.id)) :
        cmd.type==='physical_room_save' ? body.physicalRooms.find(r=>r.id===(cmd.physicalRoomId||`${cmd.id}-space`)) :
        body.resources.find(r=>r.id===(cmd.resourceId||cmd.id));
      const created=cmd.type==='create_reservation'?next.reservations.find(r=>r.id===cmd.id):null;
      const summary={...(created?{reservationId:cmd.id,stayIds:created.stayIds}:{}),
        ...(cmd.bookingRequestId?{bookingRequestId:cmd.bookingRequestId}:{}),
        // A purge is destructive, so the audit keeps what was removed: which stays, whose
        // names, which nights and what state they were in. The orders themselves are gone.
        ...(cmd.type==='purge_test_orders'?{purged:before.orders.filter(o=>!next.orders.some(n=>n.id===o.id))
          .map(o=>({id:o.id,guest:o.guest,start:o.start,end:o.end,status:o.status,reservationId:o.reservationId||null})),
          prefix:typeof cmd.prefix==='string'?cmd.prefix:null}:{}),orderId:cmd.type==='create'?cmd.id:cmd.orderId||null,
        ...(stayTypes.includes(cmd.type)?{stayChange:{before:staySnapshot(before,cmd.orderId),after:staySnapshot(next,cmd.orderId),reason:typeof cmd.reason==='string'?cmd.reason.trim():null}}:{}),
        ...(cmd.type==='create'?{stayChange:{before:null,after:staySnapshot(next,cmd.id),reason:null}}:{}),resourceId:cmd.resourceId||null,
        ...(cmd.roomTypeId?{roomTypeId:cmd.roomTypeId}:{}),
        ...(cmd.physicalRoomId?{physicalRoomId:cmd.physicalRoomId}:{}),
        ...(['room_type_save','physical_room_save','suite_save','resource_update','resource_archive'].includes(cmd.type)?{catalogChange:{
          before:catalogEntity(before)||null,after:catalogEntity(next)||null}}:{}),
        ...(cmd.resourceIds?{resourceIds:cmd.resourceIds,cleaning:cmd.cleaning||null,start:cmd.start||null,end:cmd.end||null}:{}),
        ...(['box_stays','restore_stays'].includes(cmd.type)?{stayIds:cmd.orderIds,inventoryChange:{before:before.orders.filter(o=>cmd.orderIds.includes(o.id)).map(o=>({id:o.id,inventoryStatus:o.inventoryStatus||'reserved',resourceId:o.resourceId})),after:next.orders.filter(o=>cmd.orderIds.includes(o.id)).map(o=>({id:o.id,inventoryStatus:o.inventoryStatus,resourceId:o.resourceId})),reason:cmd.reason}}:{}),
        ...(['block','unblock','bulk_block','bulk_unblock'].includes(cmd.type)?{blockChange:changedBlocks(before.blocks,next.blocks)}:{}),
        ...(['notice_scope_save','notice_send','notice_withdraw','commission_rate_save','listing_draft_save','booking_content_save'].includes(cmd.type)?{internalChange:localAudit,recordId:cmd.id}:{}),
        fields:Object.keys(command).filter(k=>!['type','propertyId'].includes(k)),
        ...(['directory_entry_save','customer_tag_set'].includes(cmd.type)?{directoryChange:localAudit.directoryChange}:{}),
        ...(cmd.type==='memo_save'?{memoChange:localAudit.memoChange}:{}),
        ...(cmd.type==='payment'?{kind:cmd.kind,amount:cmd.amount,method:cmd.method}:{}),
        ...(cmd.type.startsWith('ar_')?{arEventId:cmd.id}:{}),
        ...(cmd.type==='shift_mode_save'?{handoverMode:cmd.mode}:{}),
        ...(cmd.type==='night_audit_handle_all'?{handledAuditOrders:localAudit?.handledAuditOrders}:{}),
        ...(localAudit?.roomStatusRows?.length?{roomStatusRows:localAudit.roomStatusRows}:{}),
        ...(cmd.type==='ar_close_month'&&cmd.periodId===undefined?{arPeriod:{month:cmd.month,id:cmd.id}}:{}),
        ...(cmd.type==='ar_close_month'&&cmd.periodId!==undefined?{arCorrection:next.arEvents.find(event=>event.id===cmd.id)}:{}),
        ...(['settle_split','settle_bill','settle_undo','settle_unsplit'].includes(cmd.type)?{billEvent:next.orders.find(o=>o.id===cmd.orderId)?.folioEvents?.at(-1)}:{}),
        ...(cmd.type==='transfer_folio_credit'?{reservationId:cmd.reservationId,fromId:cmd.fromId,toId:cmd.toId,amount:next.orders.find(o=>o.id===cmd.toId)?.folioTransfers?.at(-1)?.amount,reverses:cmd.reverses,reason:cmd.reason.trim()}:{}),
        ...(cmd.type==='undo_reservation_payment'?{reservationId:cmd.reservationId,reversesBatchId:cmd.batchId,reason:cmd.reason.trim()}:{}),
        ...(cmd.type==='payment_reservation'?{reservationId:cmd.reservationId,amount:cmd.amount,method:cmd.method,allocations:cmd.allocations.map(({orderId,amount})=>({orderId,amount}))}:{}),
        ...(cmd.type==='settle_reservation'?{reservationId:cmd.reservationId,settledStayIds:next.orders.filter(o=>o.folioEvents?.at(-1)?.batchId===cmd.id).map(o=>o.id)}:{}),
        ...(cmd.type==='commission_close_month'?{commissionPeriod:{id:cmd.id,month:cmd.month}}:{}),
        ...(cmd.type==='commission_save'&&cmd.correction===true?{commissionCorrection:next.orders.find(o=>o.id===cmd.orderId)?.commissionCorrections?.at(-1)}:{}),
        ...(cmd.type==='commission_save'?{commissionChange:{before:before.orders.find(o=>o.id===cmd.orderId)?.commission||null,after:next.orders.find(o=>o.id===cmd.orderId)?.commission||null}}:{}),
        // A handover's cash count and a variance approval are business facts, so the
        // durable audit keeps the figures and the reason. It never carries a guest name.
        ...(cmd.type==='shift_handover'&&cmd.countedCash!==undefined?{handoverCash:{counted:cmd.countedCash,expected:next.handovers.find(h=>h.id===cmd.id)?.cashCount?.expected??null}}:{}),
        ...(cmd.type==='cash_variance_approve'?{handoverId:cmd.handoverId,variance:next.handovers.find(h=>h.id===cmd.handoverId)?.cashCount?.variance??null,reason:cmd.reason}:{})};
      this.db.prepare('INSERT INTO audit VALUES(?,?,?,?,?,?,?)').run(cmd.id,propertyId,user.id,cmd.type,cmd.at,revision,JSON.stringify(summary));
      if(requestRow){
        const stayIds=created?.stayIds||[];
        this.db.prepare(`UPDATE booking_requests SET status='accepted',decided_at=?,decided_by=?,reservation_id=?,order_id=? WHERE id=? AND status='pending'`)
          .run(cmd.at,user.id,cmd.id,stayIds[0]||null,requestRow.id);
        this.db.prepare('INSERT INTO booking_request_events VALUES(?,?,?,?,?,?)').run(randomUUID(),requestRow.id,user.id,'accept',cmd.at,
          JSON.stringify({actor:rowUser.username,reservationId:cmd.id,orderId:stayIds[0]||null,guest:requestRow.guest_name,
            from:requestRow.stay_from,to:requestRow.stay_to}));
      }
      const response={id:cmd.id,propertyId,revision,...(requestRow?{bookingRequestId:requestRow.id,requestStatus:'accepted'}:{})};
      this.db.prepare('INSERT INTO receipts VALUES(?,?,?,?)').run(user.id,key,fingerprint,JSON.stringify(response));
      return response;
    });
  }
}
