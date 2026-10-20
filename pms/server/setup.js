import { mkdirSync, readFileSync, existsSync } from 'node:fs';
import { dirname,resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';
import { Store } from './store.js';
if(process.argv.includes('--check')){
  const path=resolve(process.env.PMS_DB||'.data/jovian.sqlite');
  if(!existsSync(path))process.exit(1);
  const db=new Store(path);const count=db.db.prepare('SELECT count(*) n FROM users WHERE active=1').get().n;db.close();process.exit(count?0:1);
}
let values;
if(!process.stdin.isTTY) values=JSON.parse(readFileSync(0,'utf8'));
else{
  let muted=false;const output=new Writable({write(chunk,encoding,done){if(!muted)process.stdout.write(chunk);done();}});
  const rl=createInterface({input:process.stdin,output,terminal:true});
  const username=await rl.question('Username (3-64 letters/numbers): ');
  process.stdout.write('Password (12+ characters, hidden): ');muted=true;
  const password=await rl.question('');muted=false;process.stdout.write('\n');
  const role=(await rl.question('Role [admin/operations/finance/viewer]: ')).trim();
  const scope=await rl.question('Test stores, comma separated [TEST-KL,TEST-PG]: ');
  const propertyIds=(scope.trim()||'TEST-KL,TEST-PG').split(',').map(s=>s.trim());
  rl.close();values={username,password,role,propertyIds};
}
const path=resolve(process.env.PMS_DB||'.data/jovian.sqlite');mkdirSync(dirname(path),{recursive:true,mode:0o700});
const store=new Store(path);
try{store.seedTestProperties();const user=store.createUser(values);console.log(`Created ${user.username} (${user.role}) for ${user.propertyIds.join(', ')}. Test data only.`);}
catch(e){console.error(`Setup failed: ${e.message}`);process.exitCode=1;}
finally{store.close();}
