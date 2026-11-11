import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
const web=new URL('../web/',import.meta.url);
const css=readFileSync(new URL('style.css',web),'utf8');
const tokens=Object.fromEntries([...css.matchAll(/--brand-([a-z]+):(#[a-f0-9]{6})(?=[;}])/g)].map(m=>[m[1],m[2]]));
const rgb=hex=>{const v=hex.slice(1);return [0,2,4].map(i=>parseInt(v.slice(i,i+2),16)/255);};
const luminance=hex=>rgb(hex).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4).reduce((a,n,i)=>a+n*[.2126,.7152,.0722][i],0);
const contrast=(a,b)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
test('JOVIAN pink palette supports AA text on buttons, links, tabs, selections and muted labels',()=>{
 for(const [fg,bg] of [['#ffffff',tokens.primary],['#ffffff',tokens.hover],[tokens.link,'#ffffff'],[tokens.link,tokens.tint],[tokens.ink,tokens.selected],[tokens.muted,tokens.canvas],[tokens.focus,'#ffffff']])assert.ok(contrast(fg,bg)>=4.5,`${fg} on ${bg}: ${contrast(fg,bg)}`);
 const manifest=JSON.parse(readFileSync(new URL('manifest.webmanifest',web),'utf8'));assert.equal(manifest.theme_color,tokens.primary);assert.ok(readFileSync(new URL('index.html',web),'utf8').includes(`name="theme-color" content="${tokens.primary}"`));
});
test('deployed styles and inline markup contain no old blue accent family',()=>{
 const sources=readdirSync(web).filter(n=>/\.(css|html|js|webmanifest)$/.test(n)).map(n=>[n,readFileSync(new URL(n,web),'utf8')]);
 sources.push(['server/http.js',readFileSync(new URL('../server/http.js',import.meta.url),'utf8')]);
 for(const [name,text] of sources)for(const m of text.matchAll(/#([a-f0-9]{6})(?![a-f0-9])/gi)){
  const [r,g,b]=rgb(m[0]),hi=Math.max(r,g,b),lo=Math.min(r,g,b),d=hi-lo,l=(hi+lo)/2;if(!d)continue;
  const sat=d/(1-Math.abs(2*l-1));let h=(hi===r?(g-b)/d+(g<b?6:0):hi===g?(b-r)/d+2:(r-g)/d+4)/6;
  assert.ok(!(h>.48&&h<.77&&sat>.16),`${name}: old blue ${m[0]}`);
 }
});
