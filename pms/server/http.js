import {CheckinError} from './self-checkin.js';
import {MessagingError} from './nobeds-messages.js';
import {SupportError} from './support.js';
import {createHash} from 'node:crypto';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { ServiceError } from './store.js';
const root=fileURLToPath(new URL('../',import.meta.url));
// The public property site is server-rendered and carries no script at all, so the
// page cannot be used as a foothold and works without JavaScript enabled.
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money = cents => `MYR ${(cents / 100).toFixed(2)}`;
export const siteLanguages = ['zh','en','ms'];
const siteCopy = {
  zh:{checkIn:'\u5165\u4f4f',checkOut:'\u9000\u623f',guests:'\u4eba\u6570',search:'\u67e5\u8be2\u53ef\u8ba2\u623f\u578b',availability:'\u53ef\u8ba2\u623f\u578b',
    available:'\u53ef\u8ba2',soldOut:'\u5df2\u8ba2\u6ee1',fromPerNight:'\u6bcf\u665a\u8d77',stayTotal:'\u5408\u8ba1',nights:'\u665a',
    noPrice:'\u6682\u672a\u516c\u5e03\u4ef7\u683c',noPriceNote:'\u8be5\u623f\u578b\u5728\u6240\u9009\u65e5\u671f\u5185\u6ca1\u6709\u5bf9\u5916\u516c\u5f00\u7684\u4ef7\u683c\uff0c\u8bf7\u76f4\u63a5\u8054\u7cfb\u95e8\u5e97\u3002',
    fits:'\u53ef\u4f4f',tooSmall:'\u4eba\u6570\u8d85\u51fa',contact:'\u8054\u7cfb\u65b9\u5f0f',language:'\u8bed\u8a00',noRooms:'\u8be5\u95e8\u5e97\u6682\u672a\u516c\u5f00\u53ef\u9884\u8ba2\u7684\u623f\u578b\u3002',
    unavailable:'\u6682\u65f6\u65e0\u6cd5\u786e\u8ba4\u5e93\u5b58\uff0c\u8bf7\u76f4\u63a5\u8054\u7cfb\u95e8\u5e97\u3002',badDates:'\u8bf7\u9009\u62e9\u6709\u6548\u7684\u5165\u4f4f\u4e0e\u9000\u623f\u65e5\u671f\uff08\u9000\u623f\u665a\u4e8e\u5165\u4f4f\uff0c\u6700\u591a31\u665a\uff09\u3002',
    badGuests:'\u4eba\u6570\u9700\u4e3a1\u81f320\u4e4b\u95f4\u7684\u6574\u6570\u3002',
    disclaimer:'\u672c\u9875\u9762\u4ec5\u5c55\u793a\u623f\u578b\u4e0e\u53ef\u8ba2\u60c5\u51b5\uff0c\u4e0d\u63d0\u4f9b\u5728\u7ebf\u652f\u4ed8\u6216\u5373\u65f6\u786e\u8ba4\uff1b\u9884\u8ba2\u9700\u8054\u7cfb\u95e8\u5e97\u786e\u8ba4\u540e\u751f\u6548\u3002',
    updated:'\u6700\u8fd1\u66f4\u65b0',
    requestForm:'\u9884\u8ba2\u8bf7\u6c42',requestFormNote:'\u6bcf\u4efd\u8bf7\u6c42\u5bf9\u5e94\u4e00\u95f4\u623f\uff1b\u63d0\u4ea4\u540e\u7531\u95e8\u5e97\u4eba\u5de5\u786e\u8ba4\uff0c\u4e0d\u4f1a\u5373\u65f6\u786e\u8ba4\u6216\u6263\u6b3e\u3002',
    yourName:'\u60a8\u7684\u59d3\u540d',yourContact:'\u8054\u7cfb\u65b9\u5f0f\uff08\u90ae\u7bb1\u6216\u7535\u8bdd\uff09',requestNotes:'\u5907\u6ce8\uff08\u9009\u586b\uff09',
    requestButton:'\u63d0\u4ea4\u9884\u8ba2\u8bf7\u6c42',requestReceived:'\u5df2\u6536\u5230\u60a8\u7684\u8bf7\u6c42',
    requestReference:'\u8bf7\u6c42\u7f16\u53f7',requestReceivedNote:'\u8fd9\u4e0d\u662f\u786e\u8ba4\uff0c\u4e5f\u672a\u6263\u6b3e\uff1b\u95e8\u5e97\u786e\u8ba4\u540e\u4f1a\u901a\u8fc7\u60a8\u7559\u4e0b\u7684\u65b9\u5f0f\u8054\u7cfb\u60a8\u3002',
    requestFailed:'\u8bf7\u6c42\u672a\u80fd\u63d0\u4ea4',requestMissing:'\u8bf7\u586b\u5199\u59d3\u540d\u4e0e\u8054\u7cfb\u65b9\u5f0f\u3002',
    requestUnknown:'\u6240\u9009\u623f\u578b\u5df2\u4e0d\u53ef\u8ba2\uff0c\u8bf7\u91cd\u65b0\u67e5\u8be2\u3002',requestBusy:'\u8bf7\u6c42\u8fc7\u4e8e\u9891\u7e41\uff0c\u8bf7\u7a0d\u540e\u518d\u8bd5\u3002'},
  en:{checkIn:'Check-in',checkOut:'Check-out',guests:'Guests',search:'Check availability',availability:'Available room types',
    available:'available',soldOut:'Sold out',fromPerNight:'from',stayTotal:'Stay total',nights:'nights',
    noPrice:'No published price',noPriceNote:'This room type has no publicly published price for the dates chosen. Please contact the property.',
    fits:'sleeps',tooSmall:'Too many guests',contact:'Contact',language:'Language',noRooms:'This property has not published any bookable room type yet.',
    unavailable:'Availability cannot be confirmed right now. Please contact the property.',badDates:'Choose a valid check-in and check-out (check-out after check-in, up to 31 nights).',
    badGuests:'Guests must be a whole number between 1 and 20.',
    disclaimer:'This page only shows room types and availability. It takes no online payment and gives no instant confirmation; a booking takes effect once the property confirms it.',
    updated:'Last updated',
    requestForm:'Booking request',requestFormNote:'One request is for one room. The property confirms it by hand, so nothing is confirmed or charged straight away.',
    yourName:'Your name',yourContact:'How to reach you (email or phone)',requestNotes:'Notes (optional)',
    requestButton:'Send booking request',requestReceived:'Your request has been received',
    requestReference:'Reference',requestReceivedNote:'This is not a confirmation and nothing has been charged. The property will reach you on the details you left once it confirms the request.',
    requestFailed:'The request could not be sent',requestMissing:'Please give your name and a way to contact you.',
    requestUnknown:'That room type can no longer be requested, so please search again.',requestBusy:'Too many requests were sent, so please try again shortly.'},
  ms:{checkIn:'Daftar masuk',checkOut:'Daftar keluar',guests:'Bilangan tetamu',search:'Semak ketersediaan',availability:'Jenis bilik tersedia',
    available:'tersedia',soldOut:'Habiskan dijual',fromPerNight:'dari',stayTotal:'Jumlah',nights:'malam',
    noPrice:'Tiada harga diterbitkan',noPriceNote:'Jenis bilik ini tiada harga yang diterbitkan untuk tarikh dipilih. Sila hubungi hartanah.',
    fits:'muat',tooSmall:'Terlalu ramai tetamu',contact:'Hubungi',language:'Bahasa',noRooms:'Hartanah ini belum menerbitkan jenis bilik yang boleh ditempah.',
    unavailable:'Ketersediaan tidak dapat disahkan buat masa ini. Sila hubungi hartanah.',badDates:'Pilih tarikh daftar masuk dan keluar yang sah (keluar selepas masuk, sehingga 31 malam).',
    badGuests:'Bilangan tetamu mesti nombor bulat antara 1 dan 20.',
    disclaimer:'Halaman ini hanya memaparkan jenis bilik dan ketersediaan. Tiada pembayaran dalam talian dan tiada pengesahan segera; tempahan berkuat kuasa selepas hartanah mengesahkannya.',
    updated:'Dikemas kini',
    requestForm:'Permintaan tempahan',requestFormNote:'Satu permintaan adalah untuk satu bilik. Hartanah mengesahkannya secara manual, jadi tiada apa disahkan atau dikenakan bayaran serta-merta.',
    yourName:'Nama anda',yourContact:'Cara hubungi anda (e-mel atau telefon)',requestNotes:'Nota (pilihan)',
    requestButton:'Hantar permintaan tempahan',requestReceived:'Permintaan anda telah diterima',
    requestReference:'Rujukan',requestReceivedNote:'Ini bukan pengesahan dan tiada bayaran dikenakan. Hartanah akan menghubungi anda melalui butiran yang anda tinggalkan setelah permintaan disahkan.',
    requestFailed:'Permintaan tidak dapat dihantar',requestMissing:'Sila berikan nama anda dan cara untuk menghubungi anda.',
    requestUnknown:'Jenis bilik itu tidak boleh diminta lagi, sila cari semula.',requestBusy:'Terlalu banyak permintaan dihantar, sila cuba sebentar lagi.'}
};
export function pickSiteLanguage(requested, header) {
  if(siteLanguages.includes(requested))return requested;
  const lower=String(header||'').toLowerCase();
  if(/\bzh\b|zh-/.test(lower))return 'zh';
  if(/\bms\b|ms-|\bmay\b|\bid\b|id-/.test(lower))return 'ms';
  return 'en';
}
const siteText = (value, language) => {
  const map = value && typeof value === 'object' ? value : {};
  return map[language] || map.en || map.zh || map.ms || '';
};
// Availability is only ever shown as what the front desk itself can sell tonight;
// where no published price exists the page says so rather than estimating one.
export function renderPropertySite({ site, availability, language, requested, error, sent, requestError }) {
  const c = siteCopy[language] || siteCopy.en;
  const title = siteText(site.title,language) || site.propertyName;
  const description = siteText(site.description,language);
  const contact = siteText(site.contact,language);
  const note = siteText(site.bookingNote,language);
  const q = requested||{};
  // A request is all this page can honestly take: the guest asks, the property decides,
  // and nothing here charges, holds or confirms a stay.
  const requestForm=type=>{
    if(!availability||type.unknown||type.available===0||!type.fitsGuests)return '';
    return `<form class="request" method="post" action="/sites/${escapeHtml(site.slug)}/request">
     <input type="hidden" name="lang" value="${escapeHtml(language)}">
     <input type="hidden" name="from" value="${escapeHtml(q.from||'')}">
     <input type="hidden" name="to" value="${escapeHtml(q.to||'')}">
     <input type="hidden" name="guests" value="${escapeHtml(q.guests||'1')}">
     <input type="hidden" name="roomType" value="${escapeHtml(type.id)}">
     <label>${escapeHtml(c.yourName)} <input name="name" maxlength="100" required></label>
     <label>${escapeHtml(c.yourContact)} <input name="contact" maxlength="254" required></label>
     <label>${escapeHtml(c.requestNotes)} <textarea name="note" maxlength="2000" rows="2"></textarea></label>
     <button type="submit">${escapeHtml(c.requestButton)}</button>
    </form>`;
  };
  // Only a reference the server itself issued is echoed back, so nothing typed into the
  // address bar can be made to look like a confirmation.
  const reference=/^[0-9A-F]{8}$/.test(String(sent||''))?String(sent):null;
  const failed=requestError==='date_range'?c.badDates:requestError==='guest_count'?c.badGuests:
    ['guest_name','contact'].includes(requestError)?c.requestMissing:requestError==='site_input'?c.requestUnknown:
    requestError==='rate_limited'?c.requestBusy:null;
  const notice=reference?`<p class="notice ok">${escapeHtml(c.requestReceived)} · ${escapeHtml(c.requestReference)} <strong>${escapeHtml(reference)}</strong><br>${escapeHtml(c.requestReceivedNote)}</p>`
    :requestError?`<p class="notice bad">${escapeHtml(c.requestFailed)}${failed?' · '+escapeHtml(failed):''}</p>`:'';
  const switcher = siteLanguages.map(lang=>`<a class="lang${lang===language?' on':''}" href="?lang=${lang}${q.from?`&amp;from=${escapeHtml(q.from)}&amp;to=${escapeHtml(q.to)}&amp;guests=${escapeHtml(q.guests||'1')}`:''}">${lang.toUpperCase()}</a>`).join(' ');
  const form=`<form class="search" method="get" action="">
   <input type="hidden" name="lang" value="${escapeHtml(language)}">
   <label>${escapeHtml(c.checkIn)} <input type="date" name="from" value="${escapeHtml(q.from||'')}" required></label>
   <label>${escapeHtml(c.checkOut)} <input type="date" name="to" value="${escapeHtml(q.to||'')}" required></label>
   <label>${escapeHtml(c.guests)} <input type="number" name="guests" min="1" max="20" value="${escapeHtml(q.guests||'1')}" required></label>
   <button type="submit">${escapeHtml(c.search)}</button>
  </form>`;
  let results='';
  if(error)results=`<p class="error">${escapeHtml(error==='date_range'?c.badDates:c.badGuests)}</p>`;
  else if(availability){
    const rows=availability.roomTypes.map(type=>{
      const name=siteText(type.names,language)||type.id;
      const sold=type.available===0;
      const price=type.total===null?`<span class="none">${escapeHtml(c.noPrice)}</span>`
        :`<span class="price">${escapeHtml(money(type.total))}</span> <span class="muted">${escapeHtml(c.stayTotal)} · ${escapeHtml(c.fromPerNight)} ${escapeHtml(money(type.nightlyFrom))} · ${type.nights} ${escapeHtml(c.nights)}</span>`;
      const stock=type.unknown?`<span class="none">${escapeHtml(c.unavailable)}</span>`
        :sold?`<span class="none">${escapeHtml(c.soldOut)}</span>`:`<span class="stock">${type.available} ${escapeHtml(c.available)}</span>`;
      const capacity=type.fitsGuests?`${escapeHtml(c.fits)} ${type.maxGuests}`:`<span class="none">${escapeHtml(c.tooSmall)}</span>`;
      return `<li class="room${sold||!type.fitsGuests?' off':''}">
       <h3>${escapeHtml(name)}</h3>
       <p class="muted">${escapeHtml(capacity)}</p>
       <p>${stock}</p>
       <p>${price}</p>
       ${type.total===null&&!type.unknown?`<p class="muted">${escapeHtml(c.noPriceNote)}</p>`:''}
       <h4 class="request-head">${escapeHtml(c.requestForm)}</h4>${requestForm(type)}
      </li>`;
    }).join('');
    results=`<h2>${escapeHtml(c.availability)}</h2>`+(rows?`<p class="muted">${escapeHtml(c.requestFormNote)}</p><ul class="rooms">${rows}</ul>`:`<p>${escapeHtml(c.noRooms)}</p>`);
  }
  return `<!doctype html><html lang="${escapeHtml(language)}"><head><meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="robots" content="noindex">
  <title>${escapeHtml(title)}</title>
  <style>body{margin:0;font:16px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,"PingFang SC","Microsoft YaHei",sans-serif;color:#1d2430;background:#f6f7f9}
  header{background:#123a5e;color:#fff;padding:28px 20px}h1{margin:0 0 6px;font-size:26px}.muted{color:#667}
  main{max-width:880px;margin:0 auto;padding:24px 20px 60px}.lang a{color:#cfe0ef;text-decoration:none;margin-right:8px}
  .lang a.on{font-weight:700;text-decoration:underline}
  form.search{display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end;background:#fff;padding:16px;border-radius:10px;box-shadow:0 1px 3px rgba(0,0,0,.08);margin:20px 0}
  form.search label{display:flex;flex-direction:column;font-size:13px;color:#556}
  form.search input{padding:8px;border:1px solid #c9d0da;border-radius:6px;font:inherit}
  form.search button{padding:9px 18px;background:#123a5e;color:#fff;border:0;border-radius:6px;font:inherit;cursor:pointer}
  ul.rooms{list-style:none;padding:0;display:grid;gap:14px;grid-template-columns:repeat(auto-fill,minmax(260px,1fr))}
  ul.rooms li{background:#fff;border-radius:10px;padding:16px;box-shadow:0 1px 3px rgba(0,0,0,.08)}
  ul.rooms li.off{opacity:.62}ul.rooms h3{margin:0 0 6px;font-size:18px}
  .stock{color:#0a7a3d;font-weight:600}.none{color:#8a5a00}.price{font-size:20px;font-weight:700}
  .error{background:#fdecea;border-left:4px solid #c0392b;padding:10px 14px;border-radius:4px}
  footer{border-top:1px solid #dfe3e9;margin-top:32px;padding-top:16px;color:#556;font-size:13px}
  .contact{white-space:pre-wrap;background:#fff;padding:14px;border-radius:10px;box-shadow:0 1px 3px rgba(0,0,0,.08)}
  .notice{padding:12px 14px;border-radius:8px;margin:16px 0}
  .notice.ok{background:#e8f6ec;border-left:4px solid #0a7a3d}
  .notice.bad{background:#fdecea;border-left:4px solid #c0392b}
  .request-head{margin:12px 0 0;font-size:14px;color:#556;text-transform:none}
  form.request{display:grid;gap:8px;margin-top:8px;border-top:1px solid #e6e9ee;padding-top:10px}
  form.request label{display:flex;flex-direction:column;gap:4px;font-size:13px;color:#556}
  form.request input,form.request textarea{padding:7px;border:1px solid #c9d0da;border-radius:6px;font:inherit}
  form.request button{justify-self:start;padding:8px 14px;background:#123a5e;color:#fff;border:0;border-radius:6px;font:inherit;cursor:pointer}</style>
  </head><body>
  <header><h1>${escapeHtml(title)}</h1><p class="lang">${switcher}</p></header>
  <main>
   ${description?`<p>${escapeHtml(description)}</p>`:''}
   ${notice}${form}${results}
   ${note?`<h2>${escapeHtml(c.contact)}</h2><p class="contact">${escapeHtml(note)}</p>`:''}
   ${contact?`<h2>${escapeHtml(c.contact)}</h2><p class="contact">${escapeHtml(contact)}</p>`:''}
   <footer><p>${escapeHtml(c.disclaimer)}</p><p class="muted">${escapeHtml(c.updated)} ${escapeHtml(String(site.updatedAt||'').slice(0,10))}</p></footer>
  </main></body></html>`;
}
export function validatePublicOrigin(value) {
  if(!value)return null;
  let parsed;try{parsed=new URL(value);}catch{throw new Error('PMS_PUBLIC_ORIGIN must be an HTTPS origin');}
  if(parsed.protocol!=='https:'||parsed.username||parsed.password||parsed.pathname!=='/'||parsed.search||parsed.hash)
    throw new Error('PMS_PUBLIC_ORIGIN must be an HTTPS origin without credentials or a path');
  return parsed.origin;
}
export function makeServer(store, { publicOrigin, recovery = null } = {}) {
  publicOrigin=validatePublicOrigin(publicOrigin);
  const secureCookie=publicOrigin ? '; Secure' : '';
  const attempts=new Map();
  const json=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
  const body=async req=>{
    if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))throw new ServiceError(415,'json_required');
    let text='';for await(const chunk of req){text+=chunk;if(Buffer.byteLength(text)>32768)throw new ServiceError(413,'too_large');}
    try{const value=JSON.parse(text);if(!value||typeof value!=='object'||Array.isArray(value))throw Error();return value;}catch{throw new ServiceError(400,'invalid_json');}
  };
  const cookie=req=>{const match=/(?:^|;\s*)jovian_session=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie||'');return match?.[1];};
  // The public site posts an ordinary form, so a request can be sent with scripting off.
  const form=async req=>{
    if(!/^application\/x-www-form-urlencoded(?:;|$)/i.test(req.headers['content-type']||''))throw new ServiceError(415,'form_required');
    let text='';for await(const chunk of req){text+=chunk;if(Buffer.byteLength(text)>8192)throw new ServiceError(413,'too_large');}
    return Object.fromEntries(new URLSearchParams(text));
  };
  const server=createServer(async(req,res)=>{
    res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
    res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    try{
      const port=server.address().port;
      const localHosts=[`127.0.0.1:${port}`,`localhost:${port}`];
      const allowed=publicOrigin?[new URL(publicOrigin).host]:localHosts;
      if(req.method==='GET' && req.url==='/healthz' && (allowed.includes(req.headers.host)||localHosts.includes(req.headers.host))){
        store.db.prepare('SELECT 1').get();return json(res,200,{ok:true,service:'jovian-pms',data:'test-only'});
      }
      if(!allowed.includes(req.headers.host))throw new ServiceError(403,'host');
      const origin=publicOrigin||`http://${req.headers.host}`;
      if(req.method!=='GET'&&(req.headers.origin!==origin||req.headers['sec-fetch-site']==='cross-site'))throw new ServiceError(403,'origin');
      const url=new URL(req.url,origin), path=url.pathname;
      if(path==='/api/mode'&&req.method==='GET')return json(res,200,{mode:'shared-development',version:'0.10.0'});
      if(path==='/api/account-recovery'&&req.method==='POST'){
        const attemptKey='recovery|'+req.socket.remoteAddress,now=Date.now();
        for(const [key,value] of attempts)if(value.until<=now)attempts.delete(key);
        if(attempts.size>=10000&&!attempts.has(attemptKey))throw new ServiceError(429,'rate_limited');
        const limit=attempts.get(attemptKey)||{count:0,until:now+15*60*1000};
        if(limit.count>=10)throw new ServiceError(429,'rate_limited');
        limit.count++;attempts.set(attemptKey,limit);
        const data=await body(req);
        const result=store.recoverPassword(recovery,data.token,data.password);
        res.setHeader('Set-Cookie',`jovian_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secureCookie}`);
        return json(res,200,result);
      }
      if(path==='/api/login'&&req.method==='POST'){
        const data=await body(req),now=Date.now(),ip=req.socket.remoteAddress;
        const attemptKey=ip+'|'+String(data.username||'').slice(0,64);
        for(const [key,value] of attempts)if(value.until<=now)attempts.delete(key);
        if(attempts.size>=10000&&!attempts.has(attemptKey))throw new ServiceError(429,'rate_limited');
        const limit=attempts.get(attemptKey)||{count:0,until:now+15*60*1000};
        if(limit.count>=10)throw new ServiceError(429,'rate_limited');
        limit.count++;attempts.set(attemptKey,limit);
        const auth=store.login(data.username,data.password);
        attempts.delete(attemptKey);
        res.setHeader('Set-Cookie',`jovian_session=${auth.token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=28800${secureCookie}`);
        return json(res,200,{user:auth.user,csrf:auth.csrf});
      }
      if(path.startsWith('/sites/')){
        const parts=path.slice('/sites/'.length).replace(/\/+$/,'').split('/');
        if(parts.length>2)throw new ServiceError(404,'not_found');
        let slug;
        try{ slug=decodeURIComponent(parts[0]); }catch{ throw new ServiceError(404,'not_found'); }
        const language=pickSiteLanguage(url.searchParams.get('lang'),req.headers['accept-language']);
        const requested={from:url.searchParams.get('from')||'',to:url.searchParams.get('to')||'',guests:url.searchParams.get('guests')||'1'};
        // A published site takes no script and no external resource at all.
        res.setHeader('Content-Security-Policy',"default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:; form-action 'self'; frame-ancestors 'none'; base-uri 'none'");
        res.setHeader('X-Robots-Tag','noindex');
        // Posting a request needs no session and no script. It is rate limited by the
        // caller because anyone on the internet can reach it.
        if(parts[1]==='request'){
          if(req.method!=='POST')throw new ServiceError(405,'method');
          const now=Date.now();
          for(const [key,value] of attempts)if(value.until<=now)attempts.delete(key);
          const attemptKey='site-request|'+req.socket.remoteAddress;
          if(attempts.size>=10000&&!attempts.has(attemptKey))throw new ServiceError(429,'rate_limited');
          const limit=attempts.get(attemptKey)||{count:0,until:now+15*60*1000};
          if(limit.count>=20)throw new ServiceError(429,'rate_limited');
          limit.count++;attempts.set(attemptKey,limit);
          const data=await form(req);
          const back=extra=>`/sites/${encodeURIComponent(slug)}?lang=${encodeURIComponent(language)}`+
            `&from=${encodeURIComponent(String(data.from||''))}&to=${encodeURIComponent(String(data.to||''))}`+
            `&guests=${encodeURIComponent(String(data.guests||'1'))}${extra}`;
          let reference=null,code=null;
          try{
            reference=store.submitBookingRequest({slug,roomTypeId:String(data.roomType||''),from:String(data.from||''),
              to:String(data.to||''),guests:String(data.guests||'1'),name:String(data.name||''),contact:String(data.contact||''),
              note:String(data.note||''),language:data.lang}).reference;
          }catch(e){
            if(!(e instanceof ServiceError))throw e;
            code=['date_range','guest_count','guest_name','contact','site_input'].includes(e.message)?e.message:'request_failed';
          }
          // Post/redirect/get: reloading the result never sends the request twice.
          res.writeHead(303,{'Location':back(reference?`&sent=${encodeURIComponent(reference)}`:`&requestError=${encodeURIComponent(code)}`),
            'Cache-Control':'no-store'});
          return res.end();
        }
        if(parts[1]!==undefined)throw new ServiceError(404,'not_found');
        if(req.method!=='GET')throw new ServiceError(405,'method');
        let site;
        try{ site=store.publicSite(slug); }
        catch(e){ throw e instanceof ServiceError?e:new ServiceError(404,'not_found'); }
        let availability=null,code=null;
        if(requested.from&&requested.to){
          try{ availability=store.publicAvailability({slug,...requested}); }
          catch(e){ if(!(e instanceof ServiceError))throw e;
            if(!['date_range','guest_count'].includes(e.message))throw e;
            code=e.message; }
        }
        const html=renderPropertySite({site,availability,language,requested,error:code,
          sent:url.searchParams.get('sent'),requestError:url.searchParams.get('requestError')});
        res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});
        return res.end(html);
      }
      if(path.startsWith('/api/self-checkin/')){
        const auth=/^Bearer ([-_a-zA-Z0-9]{43})$/.exec(req.headers.authorization||'')?.[1];
        if(path==='/api/self-checkin/lookup'&&req.method==='POST'){
          const input=await body(req),now=Date.now();
          for(const [key,value] of attempts)if(value.until<=now)attempts.delete(key);
          const identity='checkin|'+String(input.propertyId||'').slice(0,100)+'|'+String(input.identifier||'').slice(0,100);
          const attemptKey=createHash('sha256').update(identity).digest('hex'),globalKey='checkin-ip|'+req.socket.remoteAddress;
          for(const [key,max] of [[attemptKey,6],[globalKey,120]]){if(attempts.size>=10000&&!attempts.has(key))throw new CheckinError(429,'rate_limited');const limit=attempts.get(key)||{count:0,until:now+15*60*1000};if(limit.count>=max)throw new CheckinError(429,'rate_limited');limit.count++;attempts.set(key,limit);}
          return json(res,200,store.checkin.lookup(input));
        }
        if(path==='/api/self-checkin/session'&&req.method==='GET')return json(res,200,store.checkin.session(auth));
        if(path==='/api/self-checkin/register'&&req.method==='POST')return json(res,200,store.checkin.register(auth,await body(req)));
        if(path==='/api/self-checkin/access'&&req.method==='POST'){await body(req);return json(res,200,await store.checkin.requestAccess(auth));}
        throw new CheckinError(404,'not_found');
      }
      if(path.startsWith('/api/')){
        const token=cookie(req),session=store.session(token);
        if(req.method==='POST'&&req.headers['x-csrf-token']!==session.csrf)throw new ServiceError(403,'csrf');
        if(path==='/api/session'&&req.method==='GET')return json(res,200,session);
        if(path==='/api/guest-messages'&&req.method==='GET')return json(res,200,store.guest.read(session.user,url.searchParams.get('propertyId'),{threadId:url.searchParams.get('threadId')||undefined,search:url.searchParams.get('search')||'',channel:url.searchParams.get('channel')||'all'}));
        if(path==='/api/guest-messages/commands'&&req.method==='POST')return json(res,200,await store.guest.command(session.user,await body(req)));
        if(path==='/api/checkin-admin'&&req.method==='GET')return json(res,200,store.checkin.read(session.user,url.searchParams.get('propertyId')));
        if(path==='/api/checkin-admin/commands'&&req.method==='POST')return json(res,200,store.checkin.command(session.user,await body(req)));
        if(path==='/api/support'&&req.method==='GET')return json(res,200,store.support.read(session.user,url.searchParams.get('propertyId'),{ticketId:url.searchParams.get('ticketId')||undefined,search:url.searchParams.get('search')||'',status:url.searchParams.get('status')||'all',offset:Number(url.searchParams.get('offset')||0)}));
        if(path==='/api/support/commands'&&req.method==='POST')return json(res,200,store.support.command(session.user,await body(req)));
        // The header bell polls this instead of the whole state, so it can notice
        // something arrived without disturbing the page the desk is working on.
        if(path==='/api/notifications'&&req.method==='GET')return json(res,200,store.notificationFeed(session.user));
        if(path==='/api/state'&&req.method==='GET')return json(res,200,store.read(session.user));
        if(path==='/api/commands'&&req.method==='POST')return json(res,200,store.command(session.user,await body(req)));
        if(path==='/api/logout'&&req.method==='POST'){
          store.logout(token);res.setHeader('Set-Cookie',`jovian_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secureCookie}`);return json(res,200,{ok:true});
        }
        throw new ServiceError(404,'not_found');
      }
      if(req.method!=='GET')throw new ServiceError(405,'method');
      if(path==='/'){res.writeHead(302,{Location:'/web/'});return res.end();}
      const assets={'/src/rate-availability.js':'src/rate-availability.js','/src/cancellation-policy.js':'src/cancellation-policy.js','/web/rate-calendar.js':'web/rate-calendar.js','/web/financial-ui.js':'web/financial-ui.js','/src/rates.js':'src/rates.js','/src/rate-dates.js':'src/rate-dates.js','/src/financial-reports.js':'src/financial-reports.js','/src/order-filters.js':'src/order-filters.js','/web/guest-locales.js':'web/guest-locales.js','/web/order-columns.js':'web/order-columns.js','/web/workspace.css':'web/workspace.css','/web/workspace-ui.js':'web/workspace-ui.js','/checkin/':'web/self-checkin.html','/web/self-checkin.js':'web/self-checkin.js','/web/checkin-admin-ui.js':'web/checkin-admin-ui.js','/web/vendor/qrcode.js':'web/vendor/qrcode.js','/web/communication-ui.js':'web/communication-ui.js','/src/inventory-actions.js':'src/inventory-actions.js','/web/calendar-actions.js':'web/calendar-actions.js','/web/':'web/index.html','/web/index.html':'web/index.html','/web/app.js':'web/app.js','/web/style.css':'web/style.css',
        '/web/backend.js':'web/backend.js','/web/recovery.html':'web/recovery.html','/web/recovery.js':'web/recovery.js','/web/pwa.js':'web/pwa.js','/web/sw.js':'web/sw.js',
        '/web/manifest.webmanifest':'web/manifest.webmanifest','/web/offline.html':'web/offline.html',
        '/web/icon-192.png':'web/icon-192.png','/web/icon-512.png':'web/icon-512.png','/web/icon-maskable.png':'web/icon-maskable.png','/src/inventory.js':'src/inventory.js','/src/demo-store.js':'src/demo-store.js','/src/catalog.js':'src/catalog.js','/src/reservations.js':'src/reservations.js','/src/dashboard.js':'src/dashboard.js','/web/dashboard-ui.js':'web/dashboard-ui.js','/web/reservation-ui.js':'web/reservation-ui.js','/web/catalog-ui.js':'web/catalog-ui.js'};
      if(!Object.hasOwn(assets,path))throw new ServiceError(404,'not_found');
      const mime=path.endsWith('.png')?'image/png':path.endsWith('.webmanifest')?'application/manifest+json':path.endsWith('.js')?'text/javascript':path.endsWith('.css')?'text/css':'text/html';
      const content=await readFile(join(root,assets[path]));res.writeHead(200,{'Content-Type':mime+(path.endsWith('.png')?'':'; charset=utf-8'),'Cache-Control':'no-store'});res.end(content);
    }catch(e){json(res,e instanceof ServiceError||e instanceof SupportError||e instanceof MessagingError||e instanceof CheckinError?e.status:500,{error:e instanceof ServiceError||e instanceof SupportError||e instanceof MessagingError||e instanceof CheckinError?e.message:'internal_error'});}
  });
  server.requestTimeout=10000;server.headersTimeout=10000;
  return server;
}
