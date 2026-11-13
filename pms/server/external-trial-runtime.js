import { loadOrCreateGuestKey } from './self-checkin.js';
import { mkdirSync, existsSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { ExternalTrialStore } from './external-trial-store.js';

// Never honor PMS_DB, production origin, recovery or integration environment values.
export function openTrialStore() {
  const directory=fileURLToPath(new URL('../.external-trial/',import.meta.url));
  mkdirSync(directory,{recursive:true,mode:0o700});
  const marker=join(directory,'EXTERNAL_TRIAL_ONLY');
  if(!existsSync(marker)) {
    if(readdirSync(directory).length)throw Error('Refusing an unmarked data directory');
    writeFileSync(marker,'external-trial-v1\n',{mode:0o600,flag:'wx'});
  }
  if(readFileSync(marker,'utf8')!=='external-trial-v1\n')throw Error('Invalid trial marker');
  const database=join(directory,'trial.sqlite');
  const key=loadOrCreateGuestKey(join(directory,'self-checkin.key'),{allowCreate:!existsSync(database)});
  const store=new ExternalTrialStore(database);
  store.checkin.key=key;
  return store;
}
