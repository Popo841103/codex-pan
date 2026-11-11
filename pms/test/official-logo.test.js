import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Store} from '../server/store.js';
import {makeServer} from '../server/http.js';
test('official full logo and favicon are public without exposing server files',async()=>{
 const store=new Store(':memory:'),server=makeServer(store);await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{
  const base=`http://127.0.0.1:${server.address().port}`;
  for(const [path,file] of [['/web/logo.png','logo.png'],['/favicon.ico','icon-192.png']]){
   const response=await fetch(base+path);assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),'image/png');assert.deepEqual(Buffer.from(await response.arrayBuffer()),readFileSync(new URL('../web/'+file,import.meta.url)));
  }
  assert.equal((await fetch(base+'/server/http.js')).status,404);
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));store.close();}
});
