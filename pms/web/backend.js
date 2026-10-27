export class Backend {
  shared=false; user=null; csrf=null;
  constructor(fetcher=(...args)=>fetch(...args)){this.fetch=fetcher;}
  async request(path, options={}) {
    const response=await this.fetch(path,{credentials:'same-origin',...options});
    const data=await response.json();
    if(!response.ok){const error=new Error(data.error||'server_error');error.status=response.status;throw error;}
    return data;
  }
  async connect(){
    const response=await this.fetch('/api/mode',{credentials:'same-origin'});
    if(response.status===404)return; // Explicit legacy static-server mode only.
    if(!response.ok)throw new Error('connection');
    const info=await response.json();if(info.mode!=='shared-development')throw new Error('connection');
    this.shared=true;
    try{const auth=await this.request('/api/session');this.user=auth.user;this.csrf=auth.csrf;}
    catch(e){if(e.status!==401)throw e;}
  }
  async login(username,password){const auth=await this.request('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password})});this.user=auth.user;this.csrf=auth.csrf;}
  async state(){return this.request('/api/state');}
  async execute(command,revision,key){return this.request('/api/commands',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':this.csrf},body:JSON.stringify({key,expectedRevision:revision,command})});}
  async communications(kind,propertyId,options={}){const query=new URLSearchParams({propertyId,...Object.fromEntries(Object.entries(options).filter(([,v])=>v!==undefined&&v!==null))});return this.request('/api/'+kind+'?'+query);}
  async communicate(kind,request){return this.request('/api/'+kind+'/commands',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':this.csrf},body:JSON.stringify(request)});}
  async logout(){await this.request('/api/logout',{method:'POST',headers:{'X-CSRF-Token':this.csrf}});this.user=null;this.csrf=null;}
}
