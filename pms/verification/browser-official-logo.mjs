// Read-only local/live branding acceptance: no login, POST or business operations.
// node pms/verification/browser-official-logo.mjs /path/to/playwright/index.mjs [base URL]
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const {chromium}=await import(pathToFileURL(process.argv[2]).href);
const base=process.argv[3]||'https://pms.jovianhome.com';
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 await page.route('**/*',route=>route.request().method()==='GET'?route.continue():route.abort());
 await page.goto(base+'/web/',{waitUntil:'networkidle'});
 await page.locator('#login-dialog[open]').waitFor();
 for(const [selector,filename] of [['.header-brand img','icon-512.png'],['.header-wordmark','logo.png'],['#login-form .login-logo','logo.png']]){
  const img=page.locator(selector);assert.equal(await img.getAttribute('src'),filename);assert.equal(await img.getAttribute('alt'),'JOVIAN HOME');assert.ok(await img.evaluate(n=>n.complete&&n.naturalWidth>0));
 }
 const files={};
 for(const name of ['logo.png','icon-192.png','icon-512.png','icon-maskable.png']){
  const response=await page.request.get(base+'/web/'+name);assert.equal(response.status(),200);const data=await response.body();assert.deepEqual(data,readFileSync(new URL('../web/'+name,import.meta.url)));files[name]=createHash('sha256').update(data).digest('hex');
 }
 const favicon=await page.request.get(base+'/favicon.ico');assert.equal(favicon.status(),200);assert.deepEqual(await favicon.body(),readFileSync(new URL('../web/icon-192.png',import.meta.url)));
 await page.screenshot({path:'/tmp/jovian-official-live-login.png'});
 await page.goto(base+'/web/offline.html');await page.context().setOffline(true);await page.reload();assert.ok(await page.locator('img[alt="JOVIAN HOME"]').evaluate(n=>n.complete&&n.naturalWidth>0));await page.context().setOffline(false);
 console.log(JSON.stringify({base,checkedAt:new Date().toISOString(),headerLoginImages:true,offlineEmbeddedLogo:true,favicon:true,files},null,2));
}finally{await browser.close();}
