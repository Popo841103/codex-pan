// Local only: never creates accounts or requests on a deployed service.
// node pms/verification/browser-origin.mjs /path/to/playwright/index.mjs
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { Store } from '../server/store.js';
import { makeServer } from '../server/http.js';
const {chromium}=await import(pathToFileURL(process.argv[2]).href);
const store=new Store(':memory:');store.seedTestProperties();
const admin=store.createUser({username:'browser-admin',password:randomUUID(),role:'admin',propertyIds:['TEST-KL']});
store.command(admin,{key:randomUUID(),expectedRevision:0,command:{type:'site_save',propertyId:'TEST-KL',slug:'browser-site',enabled:true,title:{en:'Synthetic'},roomTypeIds:[],planCodes:[]}});
const server=makeServer(store);await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base=`http://127.0.0.1:${server.address().port}`;
let browser;
try{
 browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
 const page=await browser.newPage();
 const posts=[];page.on('request',req=>{if(req.method()==='POST')posts.push(req);});
 const submit=async(selector,path,status)=>{
  const response=page.waitForResponse(r=>r.url().startsWith(base+path)&&r.request().method()==='POST');
  await page.locator(selector).click();assert.equal((await response).status(),status);await page.waitForLoadState();
 };
 await page.goto(base+'/signup?lang=en');
 // Reproduce the original browser behavior without changing the server.
 await page.evaluate(()=>{const meta=document.createElement('meta');meta.name='referrer';meta.content='no-referrer';document.head.append(meta);});
 const fill=async()=>{for(const [name,value] of Object.entries({username:'chromium-owner',password:'synthetic-password-123',confirm:'synthetic-password-123',store:'CHROME-TRIAL',storeName:'Chromium Synthetic'}))await page.locator(`[name="${name}"]`).fill(value);};
 await fill();await submit('form button','/signup',403);
 assert.equal((await posts.at(-1).allHeaders()).origin,'null');
 await page.goto(base+'/signup?lang=en');await fill();await submit('form button','/signup',303);
 assert.equal(new URL(page.url()).pathname,'/web/');
 assert.ok(store.db.prepare("SELECT 1 FROM users WHERE username='chromium-owner'").get());
 await page.goto(base+'/sites/browser-site?lang=en&from=2027-09-01&to=2027-09-02&guests=1');
 const form=page.locator('form.request').first();await form.locator('[name="name"]').fill('Synthetic');await form.locator('[name="contact"]').fill('synthetic@example.invalid');
 await submit('form.request >> nth=0 >> button[type=submit]','/sites/browser-site/request',303);
 await page.waitForURL('**/sites/browser-site?**sent=*');
 const reference=new URL(page.url()).searchParams.get('sent');assert.match(reference,/^[A-F0-9]{8}$/);
 for(const action of ['lookup','withdraw']){
  await page.locator('.manage-form [name="reference"]').fill(reference);await page.locator('.manage-form [name="contact"]').fill('synthetic@example.invalid');
  await submit(`.manage-form button[value="${action}"]`,'/sites/browser-site/manage',200);
  assert.ok(await page.locator('.managed').count());
 }
 // Recovery and self-checkin contain document-level policies too; ensure their
 // JSON requests carry an actual origin even with those meta policies applied.
 for(const path of ['/web/','/web/recovery.html','/web/self-checkin.html']){
  await page.goto(base+path);
  assert.equal(await page.evaluate(async()=>{const r=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'chromium-owner',password:'synthetic-password-123'})});return r.status;}),200);
 }
 for(const req of posts.slice(1)){
  const headers=await req.allHeaders();assert.equal(headers.origin,base);assert.equal(headers['sec-fetch-site'],'same-origin');
 }
 console.log(JSON.stringify({browser:await browser.version(),localOnly:true,noReferrerOriginNullRejected:true,signup:303,request:303,lookup:200,withdraw:200,jsonFromStaffRecoverySelfCheckin:200,postCount:posts.length}));
}finally{await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r));store.close();}
