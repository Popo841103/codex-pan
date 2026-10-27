import {readFileSync,lstatSync} from 'node:fs';
export class MessagingError extends Error {constructor(status,code){super(code);this.status=status;}}
const fail=(status,code)=>{throw new MessagingError(status,code);};
export function loadMessagingConfig(path){
  if(!path)return {};
  try{
    const stat=lstatSync(path);if(!stat.isFile()||stat.isSymbolicLink()||(stat.mode&0o077)!==0)throw Error();
    const input=JSON.parse(readFileSync(path,'utf8'));
    if(!input||typeof input!=='object'||Array.isArray(input))throw Error();
    for(const value of Object.values(input)){
      if(!value||!Number.isSafeInteger(value.hotelId)||value.hotelId<1||typeof value.token!=='string'||value.token.length<10||value.token.length>1024||value.token==='api_token'||!Array.isArray(value.channels)||value.channels.some(c=>!['booking','airbnb'].includes(c))||typeof value.sendEnabled!=='boolean')throw Error();
    }
    return input;
  }catch{throw new Error('Invalid PMS_NOBEDS_CONFIG file; credential values are not displayed.');}
}
// Only the documented host and paths are used. Never expose credential-bearing URLs.
export class NobedsMessages {
  constructor(configuration={},fetcher=fetch){this.configuration=configuration;this.fetch=fetcher;}
  config(propertyId){return Object.hasOwn(this.configuration,propertyId)?this.configuration[propertyId]:null;}
  status(propertyId){const c=this.config(propertyId);return {configured:!!c,hotelId:c?.hotelId||null,sendEnabled:!!c?.sendEnabled,channels:c?.channels||[],verified:false};}
  async request(propertyId,route,{method='GET',body,query}={}){
    const config=this.config(propertyId);if(!config)fail(503,'messages_not_connected');
    if(method!=='GET'&&!config.sendEnabled)fail(403,'messages_send_disabled');
    const url=new URL('https://api.nobeds.com/api/'+route+'/'+encodeURIComponent(config.token));
    for(const [name,value] of Object.entries(query||{}))url.searchParams.set(name,String(value));
    let response;
    try{response=await this.fetch(url,{method,redirect:'error',signal:AbortSignal.timeout(15000),headers:{Accept:'application/json',...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});}
    catch{fail(502,method==='GET'?'messages_upstream':'messages_unknown');}
    if(!response.ok){
      if(method!=='GET'&&response.status>=500)fail(502,'messages_unknown');
      fail(502,'messages_rejected');
    }
    if(method!=='GET'){
      // A transport success carrying an explicit error is not acceptance.
      let content;try{content=await response.text();if(content.length>2000000)throw Error();}catch{fail(502,'messages_unknown');}
      if(content.trim().startsWith('{')){let payload;try{payload=JSON.parse(content);}catch{fail(502,'messages_unknown');}
        if(payload.error||payload.success===false||payload.errcode&&payload.errcode!==0)fail(502,'messages_rejected');}
      return {accepted:true}; // Never a delivery receipt.
    }
    try{
      const content=await response.text();if(content.length>2000000)throw Error();return JSON.parse(content);
    }catch{fail(502,'messages_contract');}
  }
  async verifyBooking(propertyId,rid,channel){
    const config=this.config(propertyId);if(!config)fail(503,'messages_not_connected');
    if(!config.channels.includes(channel))fail(400,'messages_channel');
    const rows=await this.request(propertyId,'bookings',{query:{order_id:rid}});
    if(!Array.isArray(rows)||!rows.some(row=>row.order_id===rid&&row.hotel_id===config.hotelId))fail(400,'messages_mapping');
  }
  async list(propertyId,rid){
    const config=this.config(propertyId);if(!config)fail(503,'messages_not_connected');
    const rows=await this.request(propertyId,'messages',{query:{rid}});
    if(!Array.isArray(rows)||rows.length>2000)fail(502,'messages_contract');
    return rows.map(row=>{
      if(!Number.isSafeInteger(row.id)||row.id<1||row.hotel_id!==config.hotelId||row.rid!==rid||typeof row.message!=='string'||row.message.length>20000||typeof (row.reply??'')!=='string'||(row.reply||'').length>20000||typeof row.created_at!=='string'||!Number.isFinite(Date.parse(row.created_at)))fail(502,'messages_contract');
      return {id:String(row.id),incoming:row.message,reply:row.reply||'',at:new Date(row.created_at).toISOString()};
    });
  }
  send(propertyId,rid,body){return this.request(propertyId,'messages',{method:'POST',body:{rid,reply:body}});}
}
