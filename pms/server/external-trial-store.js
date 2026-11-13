import { Store, ServiceError, actionModules } from './store.js';
import { randomUUID } from 'node:crypto';

export const contact = '9jk558xy@mail.grokbot.com';
export const premium = Object.freeze({
  smartLocks: ['smart_lock_connect','smart_lock_bind','smart_lock_remove','smart_lock_settings','smart_lock_passcodes'],
  messaging: actionModules.guest,
  selfCheckin: actionModules.selfCheckin,
  website: actionModules.site,
});
const denied = (status, code) => { throw new ServiceError(status, code); };

// Only the dedicated external-trial entry point constructs this store.
export class ExternalTrialStore extends Store {
  constructor(path) {
    super(path);
    this.db.exec(`CREATE TABLE IF NOT EXISTS trial_applications (
      id TEXT PRIMARY KEY, company TEXT NOT NULL, email TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending', created_at TEXT NOT NULL, account TEXT);
      CREATE TABLE IF NOT EXISTS trial_features (
      property_id TEXT NOT NULL REFERENCES properties(id), feature TEXT NOT NULL,
      PRIMARY KEY(property_id,feature));`);
  }
  transaction(fn) {
    if(!this.db.isTransaction)return super.transaction(fn);
    const name='trial_'+randomUUID().replaceAll('-','');
    this.db.exec(`SAVEPOINT ${name}`);
    try {const result=fn();this.db.exec(`RELEASE ${name}`);return result;}
    catch(error){this.db.exec(`ROLLBACK TO ${name}; RELEASE ${name}`);throw error;}
  }
  signup() { denied(403, 'approval_required'); }
  createUser() { denied(403, 'approval_required'); }
  seedTestProperties() { denied(403, 'trial_seed_disabled'); }
  applyForTrial({company,email}) {
    if(typeof company !== 'string' || !company.trim() || company.trim().length > 80 ||
      typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) denied(400,'application_input');
    if(this.db.prepare('SELECT COUNT(*) n FROM trial_applications').get().n >= 5000) denied(429,'application_limit');
    const id=randomUUID();
    this.db.prepare('INSERT INTO trial_applications(id,company,email,created_at) VALUES(?,?,?,?)')
      .run(id,company.trim(),email,new Date().toISOString());
    return {id,status:'pending'};
  }
  // Local operator command only; there is deliberately no HTTP approval endpoint.
  approve(id,{username,password}) {
    // super.signup owns its transaction; the outer transaction makes the complete
    // approval atomic, including its account, scope, and application status.
    return this.transaction(()=>{
      const application=this.db.prepare('SELECT * FROM trial_applications WHERE id=?').get(id);
      if(!application || application.status!=='pending') denied(409,'application_state');
      const result=super.signup({username,password,propertyId:'trial-'+randomUUID().slice(0,12),name:application.company});
      this.db.prepare("UPDATE trial_applications SET status='approved',account=? WHERE id=?").run(username,id);
      return result;
    });
  }
  setFeature(propertyId,feature,enabled) {
    if(!Object.hasOwn(premium,feature)) denied(400,'feature_input');
    if(enabled)this.db.prepare('INSERT OR IGNORE INTO trial_features VALUES(?,?)').run(propertyId,feature);
    else this.db.prepare('DELETE FROM trial_features WHERE property_id=? AND feature=?').run(propertyId,feature);
  }
  hasFeature(propertyId,feature) {
    return !!this.db.prepare('SELECT 1 FROM trial_features WHERE property_id=? AND feature=?').get(propertyId,feature);
  }
  permissionsFor(user,propertyId) {
    const actions=super.permissionsFor(user,propertyId);
    // Exactly one company account; tenant admins cannot create or grant accounts.
    const locked=new Set(actionModules.access);
    for(const [feature,list] of Object.entries(premium))if(!this.hasFeature(propertyId,feature))for(const a of list)locked.add(a);
    return actions.filter(a=>!locked.has(a));
  }
  command(user,input,options) {
    const c=input?.command;
    if(c?.type==='property_create' || actionModules.access.includes(c?.type))denied(403,'company_account_only');
    if(c?.propertyId){
      this.authorize(user,c.propertyId);
      for(const [feature,actions] of Object.entries(premium))if(actions.includes(c.type)&&!this.hasFeature(c.propertyId,feature))denied(403,'feature_application_required');
    }
    return super.command(user,input,options);
  }
  guardRoute(user,path,propertyId) {
    const feature=path.startsWith('/api/smart-lock')?'smartLocks':path.startsWith('/api/guest-messages')?'messaging':path.startsWith('/api/checkin-admin')?'selfCheckin':null;
    if(!feature)return;
    this.authorize(user,propertyId);
    if(!this.hasFeature(propertyId,feature))denied(403,'feature_application_required');
  }
}
