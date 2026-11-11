import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
const web=new URL('../web/',import.meta.url);
const css=readFileSync(new URL('style.css',web),'utf8');
const tokens=Object.fromEntries([...css.matchAll(/--brand-([a-z]+):(#[a-f0-9]{6})(?=[;}])/g)].map(m=>[m[1],m[2]]));
const rgb=hex=>{const v=hex.slice(1);return [0,2,4].map(i=>parseInt(v.slice(i,i+2),16)/255);};
const luminance=hex=>rgb(hex).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4).reduce((a,n,i)=>a+n*[.2126,.7152,.0722][i],0);
const contrast=(a,b)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
test('shared brand tokens match the approved eye-care sage palette',()=>{
 const expected={primary:'#3f6a58',hover:'#335648',link:'#335c4c',tint:'#d7e6db',soft:'#f5f8f4',selected:'#c4dbd0',focus:'#2c4a3e',border:'#c5d6ce',ink:'#243830',muted:'#52685f',canvas:'#eef4ea',shadow:'#24383026'};
 for(const [name,value] of Object.entries(expected))assert.ok(css.includes(`--brand-${name}:${value}`),name);
});
test('JOVIAN sage palette supports AA text on buttons, links, tabs, selections and muted labels',()=>{
 for(const [fg,bg] of [['#ffffff',tokens.primary],['#ffffff',tokens.hover],[tokens.link,'#ffffff'],[tokens.link,tokens.tint],[tokens.ink,tokens.selected],[tokens.muted,tokens.canvas],[tokens.focus,'#ffffff']])assert.ok(contrast(fg,bg)>=4.5,`${fg} on ${bg}: ${contrast(fg,bg)}`);
 const manifest=JSON.parse(readFileSync(new URL('manifest.webmanifest',web),'utf8'));assert.equal(manifest.theme_color,tokens.primary);assert.ok(readFileSync(new URL('index.html',web),'utf8').includes(`name="theme-color" content="${tokens.primary}"`));
});
test('deployed styles and inline markup contain no old blue accent family',()=>{
 const sources=readdirSync(web).filter(n=>/\.(css|html|js|webmanifest)$/.test(n)).map(n=>[n,readFileSync(new URL(n,web),'utf8')]);
 sources.push(['server/http.js',readFileSync(new URL('../server/http.js',import.meta.url),'utf8')]);
 for(const [name,text] of sources)for(const m of text.matchAll(/#([a-f0-9]{6})(?![a-f0-9])/gi)){
  const [r,g,b]=rgb(m[0]),hi=Math.max(r,g,b),lo=Math.min(r,g,b),d=hi-lo,l=(hi+lo)/2;if(!d)continue;
  const sat=d/(1-Math.abs(2*l-1));let h=(hi===r?(g-b)/d+(g<b?6:0):hi===g?(b-r)/d+2:(r-g)/d+4)/6;
  assert.ok(!(h>.52&&h<.77&&sat>.16),`${name}: old blue ${m[0]}`);
 }
});

test('product styles and theme metadata contain no retired teal or rose palette',()=>{
 const retired=['0f766e','115e59','0b5f58','ccfbf1','f0fdfa','99f6e4','134e4a','b6e3de','4d6b67','f4fbfa','134e4a26','d6336c','b02a5b','a92154','fce4ec','fff5f8','f7c3d6','92234e','e7c9d4','fff8fa','4a163026'];
 for(const name of readdirSync(web).filter(n=>/\.(css|html|svg|js|webmanifest)$/.test(n))){
  const text=readFileSync(new URL(name,web),'utf8').toLowerCase();
  for(const hex of retired)assert.ok(!text.includes('#'+hex),name+': retired '+hex);
 }
});
