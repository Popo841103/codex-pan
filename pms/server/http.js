import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { ServiceError } from './store.js';
const root=fileURLToPath(new URL('../',import.meta.url));
export function validatePublicOrigin(value) {
  if(!value)return null;
  let parsed;try{parsed=new URL(value);}catch{throw new Error('PMS_PUBLIC_ORIGIN must be an HTTPS origin');}
  if(parsed.protocol!=='https:'||parsed.username||parsed.password||parsed.pathname!=='/'||parsed.search||parsed.hash)
    throw new Error('PMS_PUBLIC_ORIGIN must be an HTTPS origin without credentials or a path');
  return parsed.origin;
}
export function makeServer(store, { publicOrigin, recovery = null } = {}) {
  publicOrigin=validatePublicOrigin(publicOrigin);
  const secureCookie=publicOrigin ? '; Secure' : '';
  const attempts=new Map();
  const json=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
  const body=async req=>{
    if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))throw new ServiceError(415,'json_required');
    let text='';for await(const chunk of req){text+=chunk;if(Buffer.byteLength(text)>32768)throw new ServiceError(413,'too_large');}
    try{return JSON.parse(text);}catch{throw new ServiceError(400,'invalid_json');}
  };
  const cookie=req=>{const match=/(?:^|;\s*)jovian_session=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie||'');return match?.[1];};
  const server=createServer(async(req,res)=>{
    res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
    res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    try{
      const port=server.address().port;
      const localHosts=[`127.0.0.1:${port}`,`localhost:${port}`];
      const allowed=publicOrigin?[new URL(publicOrigin).host]:localHosts;
      if(req.method==='GET' && req.url==='/healthz' && (allowed.includes(req.headers.host)||localHosts.includes(req.headers.host))){
        store.db.prepare('SELECT 1').get();return json(res,200,{ok:true,service:'jovian-pms',data:'test-only'});
      }
      if(!allowed.includes(req.headers.host))throw new ServiceError(403,'host');
      const origin=publicOrigin||`http://${req.headers.host}`;
      if(req.method!=='GET'&&(req.headers.origin!==origin||req.headers['sec-fetch-site']==='cross-site'))throw new ServiceError(403,'origin');
      const url=new URL(req.url,origin), path=url.pathname;
      if(path==='/api/mode'&&req.method==='GET')return json(res,200,{mode:'shared-development',version:'0.8.0'});
      if(path==='/api/account-recovery'&&req.method==='POST'){
        const attemptKey='recovery|'+req.socket.remoteAddress,now=Date.now();
        for(const [key,value] of attempts)if(value.until<=now)attempts.delete(key);
        if(attempts.size>=10000&&!attempts.has(attemptKey))throw new ServiceError(429,'rate_limited');
        const limit=attempts.get(attemptKey)||{count:0,until:now+15*60*1000};
        if(limit.count>=10)throw new ServiceError(429,'rate_limited');
        limit.count++;attempts.set(attemptKey,limit);
        const data=await body(req);
        const result=store.recoverPassword(recovery,data.token,data.password);
        res.setHeader('Set-Cookie',`jovian_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secureCookie}`);
        return json(res,200,result);
      }
      if(path==='/api/login'&&req.method==='POST'){
        const data=await body(req),now=Date.now(),ip=req.socket.remoteAddress;
        const attemptKey=ip+'|'+String(data.username||'').slice(0,64);
        for(const [key,value] of attempts)if(value.until<=now)attempts.delete(key);
        if(attempts.size>=10000&&!attempts.has(attemptKey))throw new ServiceError(429,'rate_limited');
        const limit=attempts.get(attemptKey)||{count:0,until:now+15*60*1000};
        if(limit.count>=10)throw new ServiceError(429,'rate_limited');
        limit.count++;attempts.set(attemptKey,limit);
        const auth=store.login(data.username,data.password);
        attempts.delete(attemptKey);
        res.setHeader('Set-Cookie',`jovian_session=${auth.token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=28800${secureCookie}`);
        return json(res,200,{user:auth.user,csrf:auth.csrf});
      }
      if(path.startsWith('/api/')){
        const token=cookie(req),session=store.session(token);
        if(req.method==='POST'&&req.headers['x-csrf-token']!==session.csrf)throw new ServiceError(403,'csrf');
        if(path==='/api/session'&&req.method==='GET')return json(res,200,session);
        if(path==='/api/state'&&req.method==='GET')return json(res,200,store.read(session.user));
        if(path==='/api/commands'&&req.method==='POST')return json(res,200,store.command(session.user,await body(req)));
        if(path==='/api/logout'&&req.method==='POST'){
          store.logout(token);res.setHeader('Set-Cookie',`jovian_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secureCookie}`);return json(res,200,{ok:true});
        }
        throw new ServiceError(404,'not_found');
      }
      if(req.method!=='GET')throw new ServiceError(405,'method');
      if(path==='/'){res.writeHead(302,{Location:'/web/'});return res.end();}
      const assets={'/src/inventory-actions.js':'src/inventory-actions.js','/web/calendar-actions.js':'web/calendar-actions.js','/web/':'web/index.html','/web/index.html':'web/index.html','/web/app.js':'web/app.js','/web/style.css':'web/style.css',
        '/web/backend.js':'web/backend.js','/web/recovery.html':'web/recovery.html','/web/recovery.js':'web/recovery.js','/web/pwa.js':'web/pwa.js','/web/sw.js':'web/sw.js',
        '/web/manifest.webmanifest':'web/manifest.webmanifest','/web/offline.html':'web/offline.html',
        '/web/icon-192.png':'web/icon-192.png','/web/icon-512.png':'web/icon-512.png','/web/icon-maskable.png':'web/icon-maskable.png','/src/inventory.js':'src/inventory.js','/src/demo-store.js':'src/demo-store.js','/src/catalog.js':'src/catalog.js','/src/reservations.js':'src/reservations.js','/src/dashboard.js':'src/dashboard.js','/web/dashboard-ui.js':'web/dashboard-ui.js','/web/reservation-ui.js':'web/reservation-ui.js','/web/catalog-ui.js':'web/catalog-ui.js'};
      if(!Object.hasOwn(assets,path))throw new ServiceError(404,'not_found');
      const mime=path.endsWith('.png')?'image/png':path.endsWith('.webmanifest')?'application/manifest+json':path.endsWith('.js')?'text/javascript':path.endsWith('.css')?'text/css':'text/html';
      const content=await readFile(join(root,assets[path]));res.writeHead(200,{'Content-Type':mime+(path.endsWith('.png')?'':'; charset=utf-8'),'Cache-Control':'no-store'});res.end(content);
    }catch(e){json(res,e instanceof ServiceError?e.status:500,{error:e instanceof ServiceError?e.message:'internal_error'});}
  });
  server.requestTimeout=10000;server.headersTimeout=10000;
  return server;
}
