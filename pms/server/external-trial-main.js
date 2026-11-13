import { makeServer } from './http.js';
import { openTrialStore } from './external-trial-runtime.js';
const store=openTrialStore();
const server=makeServer(store,{externalTrial:true});
const port=Number(process.env.TRIAL_PORT||8020);
server.listen(port,'127.0.0.1',()=>console.log(`External trial: http://127.0.0.1:${server.address().port}/web/`));
const stop=()=>server.close(()=>{store.close();process.exit(0);});
process.on('SIGINT',stop);process.on('SIGTERM',stop);
