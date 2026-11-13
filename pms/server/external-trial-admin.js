import { randomBytes } from 'node:crypto';
import { openTrialStore } from './external-trial-runtime.js';
const store=openTrialStore();
try {
  const [command,id,value,flag]=process.argv.slice(2);
  if(command==='list')console.log(JSON.stringify(store.db.prepare('SELECT * FROM trial_applications ORDER BY created_at').all(),null,2));
  else if(command==='approve') {
    const password=randomBytes(24).toString('base64url');
    const account=store.approve(id,{username:value,password});
    console.log(JSON.stringify({...account,initialPassword:password}));
  } else if(command==='feature' && ['on','off'].includes(flag)) {
    store.setFeature(id,value,flag==='on');console.log('Feature updated');
  } else throw Error('Usage: list | approve <application-id> <username> | feature <property-id> <smartLocks|messaging|selfCheckin|website> <on|off>');
} finally {store.close();}
