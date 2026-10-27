import {randomUUID,createHash} from 'node:crypto';
import {MessagingError,NobedsMessages} from './nobeds-messages.js';
const fail=(status,code)=>{throw new MessagingError(status,code);};
const text=(value,max,required=false)=>{if(typeof value!=='string'||value.length>max||required&&!value.trim())fail(400,'messages_input');return value.trim();};
export const guestPermissions=role=>['admin','operations'].includes(role)?['guest_read','guest_sync','guest_send','guest_note','guest_handled',...(role==='admin'?['guest_bind','guest_reconcile']:[])]:[];
const digest=value=>createHash('sha256').update(value).digest('hex');
export class GuestMessages {
  constructor(store,adapter=new NobedsMessages()){
    this.store=store;this.db=store.db;this.adapter=adapter;
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ota_threads(id TEXT PRIMARY KEY,property_id TEXT NOT NULL REFERENCES properties(id),hotel_id INTEGER NOT NULL,rid INTEGER NOT NULL,
        order_id TEXT NOT NULL,channel TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 1,last_sync TEXT,last_error TEXT,last_handled_seq INTEGER NOT NULL DEFAULT 0,UNIQUE(property_id,rid));
      CREATE TABLE IF NOT EXISTS ota_messages(id TEXT PRIMARY KEY,thread_id TEXT NOT NULL REFERENCES ota_threads(id),provider_key TEXT NOT NULL,direction TEXT NOT NULL,body TEXT NOT NULL,at TEXT NOT NULL,imported_at TEXT NOT NULL,UNIQUE(thread_id,provider_key,direction));
      CREATE TABLE IF NOT EXISTS ota_notes(id TEXT PRIMARY KEY,thread_id TEXT NOT NULL REFERENCES ota_threads(id),author_id TEXT NOT NULL REFERENCES users(id),body TEXT NOT NULL,at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS ota_outgoing(id TEXT PRIMARY KEY,thread_id TEXT NOT NULL REFERENCES ota_threads(id),author_id TEXT NOT NULL REFERENCES users(id),body TEXT NOT NULL,status TEXT NOT NULL,started_at TEXT NOT NULL,updated_at TEXT NOT NULL,resolution TEXT);
      CREATE TABLE IF NOT EXISTS ota_receipts(user_id TEXT NOT NULL REFERENCES users(id),request_key TEXT NOT NULL,fingerprint TEXT NOT NULL,response TEXT NOT NULL,PRIMARY KEY(user_id,request_key));
      CREATE TABLE IF NOT EXISTS ota_audit(id TEXT PRIMARY KEY,thread_id TEXT NOT NULL,actor_id TEXT,action TEXT NOT NULL,at TEXT NOT NULL,summary TEXT NOT NULL);
      CREATE TRIGGER IF NOT EXISTS ota_messages_no_delete BEFORE DELETE ON ota_messages BEGIN SELECT RAISE(ABORT,'messages_append_only'); END;
      CREATE TRIGGER IF NOT EXISTS ota_messages_no_update BEFORE UPDATE ON ota_messages BEGIN SELECT RAISE(ABORT,'messages_append_only'); END;
      CREATE TRIGGER IF NOT EXISTS ota_notes_no_delete BEFORE DELETE ON ota_notes BEGIN SELECT RAISE(ABORT,'messages_append_only'); END;
      CREATE TRIGGER IF NOT EXISTS ota_notes_no_update BEFORE UPDATE ON ota_notes BEGIN SELECT RAISE(ABORT,'messages_append_only'); END;
      CREATE TRIGGER IF NOT EXISTS ota_audit_no_delete BEFORE DELETE ON ota_audit BEGIN SELECT RAISE(ABORT,'messages_append_only'); END;
      CREATE TRIGGER IF NOT EXISTS ota_audit_no_update BEFORE UPDATE ON ota_audit BEGIN SELECT RAISE(ABORT,'messages_append_only'); END;
    `);
  }
  actor(user,propertyId,action='guest_read'){
    const actor=this.db.prepare('SELECT id,role,username FROM users WHERE id=? AND active=1').get(user.id);
    if(!actor)fail(401,'login_required');this.store.authorize(actor,propertyId);
    if(!guestPermissions(actor.role).includes(action))fail(403,'forbidden');return actor;
  }
  thread(id,propertyId){const row=this.db.prepare('SELECT * FROM ota_threads WHERE id=? AND property_id=?').get(id,propertyId);if(!row)fail(404,'messages_not_found');return row;}
  order(id,propertyId){const property=this.db.prepare('SELECT body FROM properties WHERE id=?').get(propertyId);const order=property&&JSON.parse(property.body).orders.find(o=>o.id===id&&o.propertyId===propertyId);if(!order)fail(400,'messages_mapping');return order;}
  audit(threadId,actor,action,summary){this.db.prepare('INSERT INTO ota_audit VALUES(?,?,?,?,?,?)').run(randomUUID(),threadId,actor?.id||null,action,new Date().toISOString(),JSON.stringify(summary));}
  checkedMapping(thread){
    const order=this.order(thread.order_id,thread.property_id),config=this.adapter.config(thread.property_id);
    if(!config)fail(503,'messages_not_connected');
    if(config.hotelId!==thread.hotel_id||!config.channels.includes(thread.channel)||order.source!==thread.channel)fail(400,'messages_mapping');
    return order;
  }
  expireSending(propertyId){
    const rows=this.db.prepare("SELECT o.id,o.thread_id FROM ota_outgoing o JOIN ota_threads t ON t.id=o.thread_id WHERE t.property_id=? AND o.status='sending' AND o.started_at<?").all(propertyId,new Date(Date.now()-120000).toISOString());
    if(rows.length)this.store.transaction(()=>{for(const row of rows){const changed=this.db.prepare("UPDATE ota_outgoing SET status='unknown',updated_at=? WHERE id=? AND status='sending'").run(new Date().toISOString(),row.id).changes;if(changed)this.audit(row.thread_id,null,'send_uncertain',{outgoingId:row.id});}});
  }
  read(user,propertyId,{threadId,search='',channel='all'}={}){
    this.actor(user,propertyId);this.expireSending(propertyId);
    if(typeof search!=='string'||search.length>100||!['all','booking','airbnb'].includes(channel))fail(400,'messages_input');
    const threads=this.db.prepare('SELECT * FROM ota_threads WHERE property_id=? ORDER BY COALESCE(last_sync,\'\') DESC,id').all(propertyId).map(thread=>{
      const order=this.order(thread.order_id,propertyId);const unread=this.db.prepare("SELECT COUNT(*) n FROM ota_messages WHERE thread_id=? AND direction='in' AND rowid>?").get(thread.id,thread.last_handled_seq).n;
      return {...thread,guest:order.guest,start:order.start,end:order.end,unread};
    }).filter(t=>(channel==='all'||t.channel===channel)&&(!search||(t.guest+' '+t.rid+' '+t.order_id).toLowerCase().includes(search.toLowerCase())));
    let selected=null;
    if(threadId){const thread=this.thread(threadId,propertyId);selected={...thread,order:this.order(thread.order_id,propertyId),messages:this.db.prepare('SELECT * FROM ota_messages WHERE thread_id=? ORDER BY at,rowid').all(threadId),
      notes:this.db.prepare('SELECT n.*,u.username author FROM ota_notes n JOIN users u ON u.id=n.author_id WHERE thread_id=? ORDER BY n.rowid').all(threadId),
      outgoing:this.db.prepare('SELECT o.*,u.username author FROM ota_outgoing o JOIN users u ON u.id=o.author_id WHERE thread_id=? ORDER BY o.rowid').all(threadId)};}
    return {propertyId,provider:this.adapter.status(propertyId),threads,selected};
  }
  replay(actor,key,fingerprint){
    const row=this.db.prepare('SELECT * FROM ota_receipts WHERE user_id=? AND request_key=?').get(actor.id,key);if(!row)return null;
    if(row.fingerprint!==fingerprint)fail(409,'idempotency_mismatch');const response=JSON.parse(row.response);
    if(response.outgoingId)response.status=this.db.prepare('SELECT status FROM ota_outgoing WHERE id=?').get(response.outgoingId)?.status;
    return {...response,replayed:true};
  }
  async command(user,{key,expectedRevision,command}){
    if(typeof key!=='string'||!/^[a-zA-Z0-9_-]{8,100}$/.test(key)||!Number.isSafeInteger(expectedRevision)||expectedRevision<0||!command||typeof command!=='object'||Array.isArray(command)||typeof command.propertyId!=='string')fail(400,'messages_input');
    const {type,propertyId}=command,actor=this.actor(user,propertyId,type),fingerprint=digest(JSON.stringify(command));
    if(type!=='guest_bind')this.thread(command.threadId,propertyId);
    const replay=this.replay(actor,key,fingerprint);if(replay)return replay;
    if(type==='guest_bind'){
      if(!Number.isSafeInteger(command.rid)||command.rid<1||command.verified!==true)fail(400,'messages_mapping');
      const order=this.order(command.orderId,propertyId);if(!['booking','airbnb'].includes(command.channel)||order.source!==command.channel)fail(400,'messages_channel');
      await this.adapter.verifyBooking(propertyId,command.rid,command.channel);
    }
    if(type==='guest_sync'){
      const thread=this.thread(command.threadId,propertyId);this.checkedMapping(thread);
      let rows;
      try{rows=await this.adapter.list(propertyId,thread.rid);}catch(error){
        const code=error instanceof MessagingError?error.message:'messages_upstream';
        this.db.prepare('UPDATE ota_threads SET last_error=? WHERE id=?').run(code,thread.id);throw new MessagingError(502,code);
      }
      return this.store.transaction(()=>{
        const freshActor=this.actor(user,propertyId,type),fresh=this.thread(thread.id,propertyId);
        const prior=this.replay(freshActor,key,fingerprint);if(prior)return prior;
        if(fresh.revision!==expectedRevision)fail(409,'messages_stale');this.checkedMapping(fresh);
        const at=new Date().toISOString();let imported=0;
        for(const row of rows)for(const [direction,body] of [['in',row.incoming],['out_sync',row.reply]])if(body){
          const providerKey=row.id+':'+digest(body);
          imported+=this.db.prepare('INSERT OR IGNORE INTO ota_messages VALUES(?,?,?,?,?,?,?)').run(randomUUID(),fresh.id,providerKey,direction,body,row.at,at).changes;
        }
        this.db.prepare('UPDATE ota_threads SET revision=revision+1,last_sync=?,last_error=NULL WHERE id=?').run(at,fresh.id);
        this.audit(fresh.id,freshActor,type,{imported});const response={threadId:fresh.id,revision:fresh.revision+1,imported};
        this.db.prepare('INSERT INTO ota_receipts VALUES(?,?,?,?)').run(actor.id,key,fingerprint,JSON.stringify(response));return response;
      });
    }
    const response=this.store.transaction(()=>{
      const freshActor=this.actor(user,propertyId,type),prior=this.replay(freshActor,key,fingerprint);if(prior)return prior;
      const at=new Date().toISOString(),id=randomUUID();let thread,revision;
      if(type==='guest_bind'){
        if(expectedRevision!==0)fail(409,'messages_stale');
        const config=this.adapter.config(propertyId),order=this.order(command.orderId,propertyId);
        if(!config||order.source!==command.channel)fail(400,'messages_mapping');
        if(this.db.prepare('SELECT 1 FROM ota_threads WHERE property_id=? AND (rid=? OR order_id=?)').get(propertyId,command.rid,command.orderId))fail(409,'messages_duplicate');
        this.db.prepare('INSERT INTO ota_threads(id,property_id,hotel_id,rid,order_id,channel) VALUES(?,?,?,?,?,?)').run(id,propertyId,config.hotelId,command.rid,command.orderId,command.channel);thread={id};revision=1;
      }else{
        thread=this.thread(command.threadId,propertyId);if(thread.revision!==expectedRevision)fail(409,'messages_stale');revision=thread.revision+1;
        if(type==='guest_note')this.db.prepare('INSERT INTO ota_notes VALUES(?,?,?,?,?)').run(id,thread.id,actor.id,text(command.body,4000,true),at);
        else if(type==='guest_handled'){
          const latest=this.db.prepare('SELECT MAX(rowid) n FROM ota_messages WHERE thread_id=?').get(thread.id).n||0;
          this.db.prepare('UPDATE ota_threads SET last_handled_seq=? WHERE id=?').run(latest,thread.id);
        }else if(type==='guest_send'){
          this.checkedMapping(thread);if(!this.adapter.config(propertyId).sendEnabled)fail(403,'messages_send_disabled');
          if(command.confirmed!==true)fail(400,'messages_confirmation');
          if(this.db.prepare("SELECT 1 FROM ota_outgoing WHERE thread_id=? AND status IN ('sending','unknown')").get(thread.id))fail(409,'messages_pending');
          this.db.prepare('INSERT INTO ota_outgoing VALUES(?,?,?,?,?,?,?,NULL)').run(id,thread.id,actor.id,text(command.body,4000,true),'sending',at,at);
        }else if(type==='guest_reconcile'){
          if(!['confirmed_in_ota','confirmed_not_sent'].includes(command.status)||command.confirmed!==true)fail(400,'messages_input');
          const outgoing=this.db.prepare("SELECT * FROM ota_outgoing WHERE id=? AND thread_id=? AND status='unknown'").get(command.outgoingId,thread.id);if(!outgoing)fail(400,'messages_input');
          this.db.prepare('UPDATE ota_outgoing SET status=?,resolution=?,updated_at=? WHERE id=?').run(command.status,text(command.reason,1000,true),at,outgoing.id);
        }else fail(400,'messages_input');
        this.db.prepare('UPDATE ota_threads SET revision=? WHERE id=?').run(revision,thread.id);
      }
      this.audit(thread.id,freshActor,type,{revision,...(type==='guest_send'?{outgoingId:id}:{}),...(type==='guest_reconcile'?{outgoingId:command.outgoingId,status:command.status,reason:command.reason}:{})});
      const result={threadId:thread.id,revision,...(type==='guest_send'?{outgoingId:id,status:'sending'}:{})};
      this.db.prepare('INSERT INTO ota_receipts VALUES(?,?,?,?)').run(actor.id,key,fingerprint,JSON.stringify(result));return result;
    });
    if(type==='guest_send'&&!response.replayed){
      const thread=this.thread(response.threadId,propertyId),outgoing=this.db.prepare('SELECT * FROM ota_outgoing WHERE id=?').get(response.outgoingId);let status;
      try{await this.adapter.send(propertyId,thread.rid,outgoing.body);status='provider_accepted';}
      catch(error){status=error instanceof MessagingError&&['messages_rejected','messages_send_disabled','messages_not_connected'].includes(error.message)?'failed':'unknown';}
      this.store.transaction(()=>{this.db.prepare('UPDATE ota_outgoing SET status=?,updated_at=? WHERE id=?').run(status,new Date().toISOString(),outgoing.id);this.audit(thread.id,actor,'send_result',{outgoingId:outgoing.id,status});});
      response.status=status;
    }
    return response;
  }
}
