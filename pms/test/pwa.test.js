import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const root=new URL('../web/',import.meta.url);
test('PWA manifest is scoped to PMS and includes real install icons',()=>{
 const manifest=JSON.parse(readFileSync(new URL('manifest.webmanifest',root),'utf8'));
 assert.equal(manifest.start_url,'/web/');assert.equal(manifest.scope,'/web/');assert.equal(manifest.display,'standalone');
 for(const icon of manifest.icons){const png=readFileSync(new URL(icon.src,root));assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');const size=Number(icon.sizes.split('x')[0]);assert.equal(png.readUInt32BE(16),size);assert.equal(png.readUInt32BE(20),size);}
});
test('service worker never intercepts API, command, guest or other-site requests',()=>{
 const handlers={};const ctx=vm.createContext({URL,self:{location:{origin:'https://pms.example'},addEventListener:(event,fn)=>handlers[event]=fn},caches:{},fetch:()=>{throw Error('unexpected fetch');}});
 vm.runInContext(readFileSync(new URL('sw.js',root),'utf8'),ctx);
 for(const request of [{method:'GET',mode:'cors',url:'https://pms.example/api/state'},{method:'POST',mode:'cors',url:'https://pms.example/api/commands'},{method:'GET',mode:'navigate',url:'https://pms.example/api/state'},{method:'GET',mode:'navigate',url:'https://cohub.example/web/'}]){
 let intercepted=false;handlers.fetch({request,respondWith:()=>intercepted=true});assert.equal(intercepted,false);
 }
});
test('offline navigation shows public reconnect page without returning cached account data',async()=>{
 const handlers={},offline={public:true};let result,cacheKey;
 const ctx=vm.createContext({URL,Response,self:{location:{origin:'https://pms.example'},addEventListener:(event,fn)=>handlers[event]=fn},caches:{match:async key=>{cacheKey=key;return offline;}},fetch:async()=>{throw Error('offline');}});
 vm.runInContext(readFileSync(new URL('sw.js',root),'utf8'),ctx);
 handlers.fetch({request:{method:'GET',mode:'navigate',url:'https://pms.example/web/'},respondWith:promise=>result=promise});
 assert.equal(await result,offline);assert.equal(cacheKey,'/web/offline.html');
});
