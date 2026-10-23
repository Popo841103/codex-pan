import { readFileSync, mkdirSync } from 'node:fs';
import { dirname,resolve } from 'node:path';
import { Store } from './store.js';
import { makeServer,validatePublicOrigin } from './http.js';
const publicOrigin=validatePublicOrigin(process.env.PMS_PUBLIC_ORIGIN);
const path=resolve(process.env.PMS_DB || '.data/jovian.sqlite');
mkdirSync(dirname(path),{recursive:true,mode:0o700});
const store=new Store(path);
if(!store.db.prepare('SELECT count(*) n FROM users WHERE active=1').get().n){store.close();console.error('No users configured. Run npm run setup first.');process.exit(1);}
let recovery=null;
try{recovery=JSON.parse(readFileSync(new URL('./account-recovery.json',import.meta.url),'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
const server=makeServer(store,{publicOrigin,recovery});
const port=Number(process.env.PMS_PORT||8010);
server.listen(port,'127.0.0.1',()=>console.log(`JOVIAN PMS test service: ${publicOrigin||'http://127.0.0.1:'+server.address().port}/web/`));
const stop=()=>server.close(()=>{store.close();process.exit(0);});
process.on('SIGINT',stop);process.on('SIGTERM',stop);
