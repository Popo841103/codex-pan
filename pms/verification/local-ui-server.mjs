import {randomBytes} from 'node:crypto';
import {Store} from '../server/store.js';
import {makeServer} from '../server/http.js';
if(Number(process.versions.node.split('.')[0])<24)throw Error('Node.js 24+ is required');
const store=new Store(':memory:',{selfCheckin:{key:randomBytes(32)}});store.seedTestProperties();store.createUser({username:'local-ui-test',password:'LOCAL-JOVIAN-UI-TEST-ONLY',role:'admin',propertyIds:['TEST-KL','TEST-PG']});
const port=Number(process.env.JOVIAN_UI_TEST_PORT||18014);if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Invalid local test port');
const server=makeServer(store);server.on('error',error=>{console.error('Local test service could not start: '+error.code);store.close();process.exitCode=1;});server.listen(port,'127.0.0.1',()=>{console.log('JOVIAN LOCAL SYNTHETIC UI TEST');console.log('http://127.0.0.1:'+port+'/web/');console.log('Source: '+new URL('../',import.meta.url).pathname);console.log('Username: local-ui-test');console.log('Password: LOCAL-JOVIAN-UI-TEST-ONLY');console.log('Memory-only test data. Close this window to stop. No production database or integrations.');});
process.on('SIGINT',()=>server.close(()=>{store.close();process.exit(0);}));

