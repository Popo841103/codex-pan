import {randomUUID,createHash} from 'node:crypto';
export class SupportError extends Error {
  constructor(status,code){super(code);this.status=status;}
}
const fail=(status,code)=>{throw new SupportError(status,code);};
const text=(value,max,required=false)=>{
  if(typeof value!=='string'||value.length>max||required&&!value.trim())fail(400,'support_input');
  return value.trim();
};
const categories=['system','calendar','orders','billing','channels','access','other'];
export const supportPermissions=role=>role==='admin'?['support_create','support_reply','support_status','support_contact_save']:['support_create','support_reply','support_status'];
const emptyContact=()=>({name:'',email:'',whatsapp:'',phone:'',hours:'',revision:0});

// A separate durable desk keeps support traffic out of inventory and money transactions.
export class SupportDesk {
  constructor(store){
    this.store=store;this.db=store.db;
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS support_contacts(property_id TEXT PRIMARY KEY REFERENCES properties(id),revision INTEGER NOT NULL,body TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS support_tickets(id TEXT PRIMARY KEY,property_id TEXT NOT NULL REFERENCES properties(id),created_by TEXT NOT NULL REFERENCES users(id),
        title TEXT NOT NULL,category TEXT NOT NULL,priority TEXT NOT NULL,order_id TEXT,context TEXT NOT NULL,status TEXT NOT NULL,revision INTEGER NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS support_tickets_property ON support_tickets(property_id,updated_at);
      CREATE TABLE IF NOT EXISTS support_messages(id TEXT PRIMARY KEY,ticket_id TEXT NOT NULL REFERENCES support_tickets(id),author_id TEXT NOT NULL REFERENCES users(id),author_role TEXT NOT NULL,body TEXT NOT NULL,at TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS support_messages_ticket ON support_messages(ticket_id,at);
      CREATE TABLE IF NOT EXISTS support_receipts(user_id TEXT NOT NULL REFERENCES users(id),request_key TEXT NOT NULL,fingerprint TEXT NOT NULL,response TEXT NOT NULL,PRIMARY KEY(user_id,request_key));
      CREATE TABLE IF NOT EXISTS support_audit(id TEXT PRIMARY KEY,property_id TEXT NOT NULL REFERENCES properties(id),ticket_id TEXT,actor_id TEXT NOT NULL REFERENCES users(id),action TEXT NOT NULL,at TEXT NOT NULL,summary TEXT NOT NULL);
      CREATE TRIGGER IF NOT EXISTS support_messages_no_update BEFORE UPDATE ON support_messages BEGIN SELECT RAISE(ABORT,'support_append_only'); END;
      CREATE TRIGGER IF NOT EXISTS support_messages_no_delete BEFORE DELETE ON support_messages BEGIN SELECT RAISE(ABORT,'support_append_only'); END;
      CREATE TRIGGER IF NOT EXISTS support_audit_no_update BEFORE UPDATE ON support_audit BEGIN SELECT RAISE(ABORT,'support_append_only'); END;
      CREATE TRIGGER IF NOT EXISTS support_audit_no_delete BEFORE DELETE ON support_audit BEGIN SELECT RAISE(ABORT,'support_append_only'); END;
    `);
  }
  actor(user,propertyId){
    const actor=this.db.prepare('SELECT id,username,role FROM users WHERE id=? AND active=1').get(user.id);
    if(!actor)fail(401,'login_required');
    this.store.authorize(actor,propertyId);
    return actor;
  }
  ticket(actor,id,propertyId){
    const ticket=this.db.prepare('SELECT * FROM support_tickets WHERE id=? AND property_id=?').get(id,propertyId);
    if(!ticket||actor.role!=='admin'&&ticket.created_by!==actor.id)fail(404,'support_not_found');
    return ticket;
  }
  contact(propertyId){
    const row=this.db.prepare('SELECT body,revision FROM support_contacts WHERE property_id=?').get(propertyId);
    return row?{...JSON.parse(row.body),revision:row.revision}:emptyContact();
  }
  read(user,propertyId,{ticketId,search='',status='all',offset=0}={}){
    if(typeof propertyId!=='string')fail(400,'support_input');
    const actor=this.actor(user,propertyId),isAgent=actor.role==='admin';
    if(typeof search!=='string'||search.length>100||!['all','open','waiting','resolved'].includes(status)||!Number.isSafeInteger(offset)||offset<0||offset>1000000)fail(400,'support_input');
    const where=['t.property_id=?'],args=[propertyId];
    if(!isAgent){where.push('t.created_by=?');args.push(actor.id);}
    if(status!=='all'){where.push('t.status=?');args.push(status);}
    if(search){where.push('(instr(lower(t.title),lower(?))>0 OR instr(lower(t.id),lower(?))>0)');args.push(search,search);}
    const count=this.db.prepare(`SELECT COUNT(*) n FROM support_tickets t WHERE ${where.join(' AND ')}`).get(...args).n;
    const tickets=this.db.prepare(`SELECT t.*,u.username creator FROM support_tickets t JOIN users u ON u.id=t.created_by WHERE ${where.join(' AND ')} ORDER BY t.updated_at DESC,t.id LIMIT 30 OFFSET ?`).all(...args,offset);
    let selected=null;
    if(ticketId){
      const ticket=this.ticket(actor,ticketId,propertyId);
      const messages=this.db.prepare('SELECT m.*,u.username author FROM support_messages m JOIN users u ON u.id=m.author_id WHERE m.ticket_id=? ORDER BY m.rowid').all(ticketId);
      selected={...ticket,messages};
    }
    return {propertyId,contact:this.contact(propertyId),isAgent,tickets,total:count,offset,hasMore:offset+tickets.length<count,selected};
  }
  command(user,{key,expectedRevision,command}){
    if(typeof key!=='string'||!/^[a-zA-Z0-9_-]{8,100}$/.test(key)||!Number.isSafeInteger(expectedRevision)||expectedRevision<0||!command||typeof command!=='object'||Array.isArray(command)||typeof command.propertyId!=='string')fail(400,'support_input');
    const fingerprint=createHash('sha256').update(JSON.stringify(command)).digest('hex');
    return this.store.transaction(()=>{
      const actor=this.actor(user,command.propertyId),{type,propertyId}=command;
      if(!supportPermissions(actor.role).includes(type))fail(403,'forbidden');
      // Re-authorize visibility even when replaying a previously accepted command.
      let ticket=null;
      if(['support_reply','support_status'].includes(type))ticket=this.ticket(actor,command.ticketId,propertyId);
      if(type==='support_contact_save'&&actor.role!=='admin')fail(403,'forbidden');
      const prior=this.db.prepare('SELECT * FROM support_receipts WHERE user_id=? AND request_key=?').get(actor.id,key);
      if(prior){if(prior.fingerprint!==fingerprint)fail(409,'idempotency_mismatch');return {...JSON.parse(prior.response),replayed:true};}
      const id=randomUUID(),at=new Date().toISOString();let revision,summary={};
      const message=(ticketId,body)=>this.db.prepare('INSERT INTO support_messages VALUES(?,?,?,?,?,?)').run(randomUUID(),ticketId,actor.id,actor.role,text(body,4000,true),at);
      if(type==='support_contact_save'){
        const current=this.contact(propertyId);if(current.revision!==expectedRevision)fail(409,'support_stale');
        const contact={name:text(command.name??'',100),email:text(command.email??'',254),whatsapp:text(command.whatsapp??'',16),phone:text(command.phone??'',16),hours:text(command.hours??'',300)};
        if(contact.email&&!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(contact.email)||['phone','whatsapp'].some(k=>contact[k]&&!/^\+[1-9]\d{7,14}$/.test(contact[k])))fail(400,'support_contact_input');
        revision=current.revision+1;
        this.db.prepare('INSERT INTO support_contacts VALUES(?,?,?) ON CONFLICT(property_id) DO UPDATE SET revision=excluded.revision,body=excluded.body').run(propertyId,revision,JSON.stringify(contact));
        summary={before:current,after:contact};
      }else if(type==='support_create'){
        if(expectedRevision!==0)fail(409,'support_stale');
        const title=text(command.title,150,true),category=command.category,priority=command.priority,orderId=text(command.orderId??'',100),context=text(command.context??'',100);
        if(!categories.includes(category)||!['normal','urgent'].includes(priority))fail(400,'support_input');
        if(orderId){const property=this.db.prepare('SELECT body FROM properties WHERE id=?').get(propertyId);if(!JSON.parse(property.body).orders.some(o=>o.id===orderId&&o.propertyId===propertyId))fail(400,'scope');}
        ticket={id};revision=1;
        this.db.prepare('INSERT INTO support_tickets VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').run(id,propertyId,actor.id,title,category,priority,orderId||null,context,'open',revision,at,at);
        message(id,command.body);summary={status:'open',category,priority,orderId:orderId||null};
      }else{
        if(ticket.revision!==expectedRevision)fail(409,'support_stale');revision=ticket.revision+1;
        let status;
        if(type==='support_reply'){
          if(ticket.status==='resolved')fail(400,'support_closed');
          message(ticket.id,command.body);status=actor.role==='admin'?'waiting':'open';
        }else{
          status=command.status;if(!['resolved','open'].includes(status)||status===ticket.status)fail(400,'support_input');
        }
        this.db.prepare('UPDATE support_tickets SET status=?,revision=?,updated_at=? WHERE id=?').run(status,revision,at,ticket.id);
        summary={before:ticket.status,after:status};
      }
      this.db.prepare('INSERT INTO support_audit VALUES(?,?,?,?,?,?,?)').run(id,propertyId,ticket?.id||null,actor.id,type,at,JSON.stringify(summary));
      const response={id,ticketId:ticket?.id||null,revision};
      this.db.prepare('INSERT INTO support_receipts VALUES(?,?,?,?)').run(actor.id,key,fingerprint,JSON.stringify(response));
      return response;
    });
  }
}
