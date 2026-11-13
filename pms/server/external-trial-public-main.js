// Public entry for the isolated external trial, run behind an HTTPS reverse proxy.
// Uses only TRIAL_PUBLIC_ORIGIN / TRIAL_PORT; never PMS_DB, PMS_PUBLIC_ORIGIN or production config.
import { makeServer } from './http.js';
import { openTrialStore } from './external-trial-runtime.js';
const publicOrigin=process.env.TRIAL_PUBLIC_ORIGIN;
if(!publicOrigin)throw Error('TRIAL_PUBLIC_ORIGIN (https://host) is required');
const store=openTrialStore();
const server=makeServer(store,{externalTrial:true,publicOrigin});
const port=Number(process.env.TRIAL_PORT||18030);
server.listen(port,'127.0.0.1',()=>console.log(`External trial (public ${publicOrigin}) on 127.0.0.1:${server.address().port}`));
const stop=()=>server.close(()=>{store.close();process.exit(0);});
process.on('SIGINT',stop);process.on('SIGTERM',stop);
