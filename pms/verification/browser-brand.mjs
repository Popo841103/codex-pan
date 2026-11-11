// Local Chromium acceptance only. Uses isolated synthetic SQLite; no live login or writes.
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {randomUUID} from 'node:crypto';
import {Store} from '../server/store.js';
import {makeServer} from '../server/http.js';
const {chromium}=await import(pathToFileURL(process.argv[2]).href);
const store=new Store(':memory:');store.seedTestProperties();const password=randomUUID(),user=store.createUser({username:'synthetic-brand',password,role:'admin',propertyIds:['TEST-KL']});
const date=new Date(Date.now()+8*3600000).toISOString().slice(0,10),end=new Date(Date.parse(date+'T00:00:00Z')+86400000).toISOString().slice(0,10);
const send=c=>store.command(user,{key:randomUUID(),expectedRevision:store.read(user).revisions['TEST-KL'],command:{propertyId:'TEST-KL',...c}});
send({type:'business_date_init',date});send({type:'create',guest:'Synthetic JOVIAN',productId:'room',gender:'any',resourceId:'TEST-KL-R1',start:date,end,nightly:10000});
const server=makeServer(store);await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;let browser;
try{
 browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(12000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/web/',{waitUntil:'networkidle',timeout:15000});
 for(const selector of ['.header-brand img','.header-wordmark','#login-form .login-logo']){
  const logo=page.locator(selector);assert.equal(await logo.getAttribute('alt'),'JOVIAN HOME');
  assert.match(await logo.getAttribute('src'),/^(icon-512|logo)\.png$/);
  assert.ok(await logo.evaluate(n=>n.complete&&n.naturalWidth>0));
 }
 await page.screenshot({path:'/tmp/jovian-official-login.png'});
 await page.locator('#login-form [name=username]').fill('synthetic-brand');await page.locator('#login-form [name=password]').fill(password);await page.locator('#login-form button').click();await page.locator('[data-property="TEST-KL"]').click();
 await page.locator('#global-nav [data-view=calendar]').click();await page.locator('[data-new-order]').waitFor();
 const styles=await page.evaluate(()=>{const style=s=>getComputedStyle(document.querySelector(s));return {primary:style('#new').backgroundColor,ink:style('#new').color,selected:style('#global-nav button.active').color,mark:style('.brand-mark').borderRadius,transform:style('.brand-mark').transform,theme:document.querySelector('[name=theme-color]').content};});
 assert.equal(styles.primary,'rgb(214, 51, 108)');assert.equal(styles.ink,'rgb(255, 255, 255)');assert.equal(styles.selected,'rgb(169, 33, 84)');assert.equal(styles.mark,'0px');assert.equal(styles.transform,'none');assert.equal(styles.theme,'#d6336c');
 await page.screenshot({path:'/tmp/jovian-pink-desktop.png',fullPage:true});
 await page.locator('#new').hover();assert.equal(await page.locator('#new').evaluate(n=>getComputedStyle(n).backgroundColor),'rgb(176, 42, 91)');
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'/tmp/jovian-pink-mobile.png',fullPage:true});
 assert.deepEqual(errors,[]);console.log('Chromium JOVIAN pink passed: primary/hover/white text, selected navigation, official logo images, theme and responsive screenshots; synthetic SQLite only.');
}finally{if(browser)await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));store.close();}
