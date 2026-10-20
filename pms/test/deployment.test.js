import test from 'node:test';
import assert from 'node:assert/strict';
import { request } from 'node:http';
import { randomBytes,randomUUID } from 'node:crypto';
import { Store } from '../server/store.js';
import { makeServer,validatePublicOrigin } from '../server/http.js';
const origin='https://pms-test.example.com';
test('public origin must be HTTPS, without credentials/path/query/fragment',()=>{
 assert.equal(validatePublicOrigin(undefined),null);assert.equal(validatePublicOrigin(origin+'/'),origin);
 for(const input of ['http://pms-test.example.com','https://user:pass@example.com','https://example.com/path','https://example.com/?secret=x','https://example.com/#x','bad'])assert.throws(()=>validatePublicOrigin(input));
});
test('HTTPS reverse proxy: secure sessions, exact host/origin and independent login limits',async t=>{
 const store=new Store(':memory:');store.seedTestProperties();const password=randomBytes(20).toString('hex');
 for(const username of ['test-one','test-two'])store.createUser({username,password,role:'operations',propertyIds:['TEST-KL']});
 const server=makeServer(store,{publicOrigin:origin});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 t.after(()=>new Promise(resolve=>{server.closeAllConnections();server.close(()=>{store.close();resolve();});}));
 const port=server.address().port;
 const send=(path,method='GET',body,headers={})=>new Promise((resolve,reject)=>{
  const req=request({host:'127.0.0.1',port,path,method,headers:{Host:'pms-test.example.com',Origin:origin,'Content-Type':'application/json',...headers}},res=>{
   let data='';res.on('data',chunk=>data+=chunk);res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,data:JSON.parse(data)}));
  });req.on('error',reject);if(body)req.write(JSON.stringify(body));req.end();
 });
 let response=await send('/healthz','GET',null,{Host:`127.0.0.1:${port}`});assert.equal(response.status,200);
 response=await send('/api/mode','GET',null,{Host:`127.0.0.1:${port}`});assert.equal(response.status,403);
 response=await send('/api/mode','GET',null,{Host:'evil.example.com','X-Forwarded-Host':'pms-test.example.com'});assert.equal(response.status,403);
 response=await send('/api/login','POST',{username:'test-one',password},{Origin:'http://pms-test.example.com','X-Forwarded-Proto':'https'});assert.equal(response.status,403);
 response=await send('/api/login','POST',{username:'test-one',password});assert.equal(response.status,200);
 const cookie=response.headers['set-cookie'][0].split(';')[0],csrf=response.data.csrf;
 assert.match(response.headers['set-cookie'][0],/; Secure/);
 response=await send('/api/commands','POST',{key:randomUUID(),expectedRevision:0,command:{type:'create',propertyId:'TEST-KL',guest:'TEST Deployment',productId:'room',gender:'any',start:'2027-01-10',end:'2027-01-12'}},{Cookie:cookie,'X-CSRF-Token':csrf});assert.equal(response.status,200);
 response=await send('/api/logout','POST',null,{Cookie:cookie,'X-CSRF-Token':csrf});assert.equal(response.status,200);assert.match(response.headers['set-cookie'][0],/; Secure/);
 for(let i=0;i<10;i++){response=await send('/api/login','POST',{username:'test-one',password:'wrong'});assert.equal(response.status,401);}
 response=await send('/api/login','POST',{username:'test-one',password});assert.equal(response.status,429);
 response=await send('/api/login','POST',{username:'test-two',password});assert.equal(response.status,200);
});
