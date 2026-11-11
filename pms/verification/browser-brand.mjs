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
 if(process.argv.includes('--icons'))for(const [name,size,maskable] of [['icon-192.png',192,false],['icon-512.png',512,false],['icon-maskable.png',512,true]]){
  const data=await page.evaluate(({size,maskable})=>{const c=document.createElement('canvas');c.width=c.height=size;const x=c.getContext('2d'),rose=getComputedStyle(document.documentElement).getPropertyValue('--brand-primary').trim();x.fillStyle=maskable?rose:'#fff8fa';x.fillRect(0,0,size,size);x.fillStyle=rose;x.beginPath();x.arc(size/2,size/2,size*.43,0,Math.PI*2);x.fill();x.strokeStyle='white';x.lineWidth=size*.012;x.beginPath();x.arc(size/2,size/2,size*.37,0,Math.PI*2);x.stroke();x.fillStyle='white';x.font=`bold ${size*.57}px Georgia,serif`;x.textAlign='center';x.textBaseline='middle';x.fillText('J',size/2,size*.53);return c.toDataURL('image/png').split(',')[1];},{size,maskable});writeFileSync(new URL('../web/'+name,import.meta.url),Buffer.from(data,'base64'));
 }
 await page.locator('#login-form [name=username]').fill('synthetic-brand');await page.locator('#login-form [name=password]').fill(password);await page.locator('#login-form button').click();await page.locator('[data-property="TEST-KL"]').click();
 await page.locator('#global-nav [data-view=calendar]').click();await page.locator('[data-new-order]').waitFor();
 const styles=await page.evaluate(()=>{const style=s=>getComputedStyle(document.querySelector(s));return {primary:style('#new').backgroundColor,ink:style('#new').color,selected:style('#global-nav button.active').color,mark:style('.brand-mark').borderRadius,transform:style('.brand-mark').transform,theme:document.querySelector('[name=theme-color]').content};});
 assert.equal(styles.primary,'rgb(214, 51, 108)');assert.equal(styles.ink,'rgb(255, 255, 255)');assert.equal(styles.selected,'rgb(169, 33, 84)');assert.equal(styles.mark,'50%');assert.equal(styles.transform,'none');assert.equal(styles.theme,'#d6336c');
 await page.screenshot({path:'/tmp/jovian-pink-desktop.png',fullPage:true});
 await page.locator('#new').hover();assert.equal(await page.locator('#new').evaluate(n=>getComputedStyle(n).backgroundColor),'rgb(176, 42, 91)');
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'/tmp/jovian-pink-mobile.png',fullPage:true});
 assert.deepEqual(errors,[]);console.log('Chromium JOVIAN pink passed: primary/hover/white text, selected navigation, round monogram, theme and responsive screenshots; synthetic SQLite only.');
}finally{if(browser)await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));store.close();}
