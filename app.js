const inventory = [
 {group:'women',name:['Single-level capsule','单层胶囊'],qty:['Women only','仅女士'],details:['1.3 × 2 m · Shared bathroom','1.3 × 2 米 · 公共洗手间'],price:100,unit:['capsule','胶囊']},
 {group:'women',name:['Bunk capsule','双层胶囊'],qty:['Women only','仅女士'],details:['1.3 × 2 m · Shared bathroom','1.3 × 2 米 · 公共洗手间'],price:80,unit:['capsule','胶囊']},
 {group:'men',name:['4-bed ensuite dorm','四人宿舍 · 独立卫浴'],qty:['Men only','仅男士'],details:['Bunk beds · Bathroom inside the dorm','上下铺 · 宿舍内独立洗手间'],price:70,unit:['bed','床位']},
 {group:'men',name:['2-bed ensuite dorm','二人宿舍 · 独立卫浴'],qty:['Men only','仅男士'],details:['Bunk beds · Bathroom inside the dorm','上下铺 · 宿舍内独立洗手间'],price:80,unit:['bed','床位']},
 {group:'men',name:['4-bed shared-bath dorm','四人宿舍 · 公共卫浴'],qty:['Men only','仅男士'],details:['Bunk beds · Shared bathroom','上下铺 · 公共洗手间'],price:60,unit:['bed','床位']},
 {group:'men',name:['2-bed shared-bath dorm','二人宿舍 · 公共卫浴'],qty:['Men only','仅男士'],details:['Bunk beds · Shared bathroom','上下铺 · 公共洗手间'],price:60,unit:['bed','床位']},
 {group:'private',name:['Private double room','独立大床房'],qty:['All genders welcome','不限性别'],details:['Private bathroom · Balcony','独立洗手间 · 阳台'],price:150,unit:['room','房间']}
];
let language='en', filter='all';
function renderRooms(){if(!document.querySelector('#rooms'))return;const n=language==='en'?0:language==='zh'?1:2;document.querySelector('#rooms').innerHTML=inventory.filter(r=>filter==='all'||r.group===filter).map((r,i)=>`<article class="room-card ${r.group}"><div class="room-illustration" aria-hidden="true"><span>${r.group==='private'?'↗':r.group==='women'?'◒':'▤'}</span><small>CO-HUB / ${String(inventory.indexOf(r)+1).padStart(2,'0')}</small></div><div class="room-content"><p class="room-qty">${r.qty[n]}</p><h3>${r.name[n]}</h3><p>${r.details[n]}</p><div class="room-price"><strong>RM ${r.price}</strong><span>${n===0?`/ ${r.unit[n]} / night`:n===1?`／${r.unit[n]}／晚`:`/ ${r.unit[n]} / malam`}</span></div><button class="room-details pending" type="button" data-room="${inventory.indexOf(r)}">${n===0?'View room details':n===1?'查看房型详情':'Lihat butiran bilik'}</button><a class="pending room-enquiry" href="${enquiryLink(r)}">${n===0?'Enquire about this room ↗':n===1?'咨询此房型 ↗':'Tanya tentang bilik ini ↗'}</a></div></article>`).join('');}
const malay = {
'BOOK NOW':'TEMPAH SEKARANG','BOOK NOW ↗':'TEMPAH SEKARANG ↗',
'Come as a guest.\\nLeave with a story.':'Datang sebagai tetamu.\\nPulang dengan cerita.',
'Your space to rest. Your place to connect. Hostel, café and craft beer in the heart of Kuala Lumpur.':'Ruang untuk berehat. Tempat untuk berkenalan. Hostel, kafe dan bir kraf di tengah Kuala Lumpur.',
'Our hostel is being prepared. Opening date and reservations will be announced.':'Hostel kami sedang disediakan. Tarikh pembukaan dan tempahan akan diumumkan.',
'Atmosphere illustration · AI-generated':'Ilustrasi suasana · Dijana AI',
'YOUR NEXT STOP':'DESTINASI SETERUSNYA','Make room for a new story.':'Mulakan cerita baharu.',
'DESTINATION':'DESTINASI','CHECK-IN':'DAFTAR MASUK','CHECK-OUT':'DAFTAR KELUAR','GUESTS':'TETAMU','EXPLORE ROOMS ↗':'LIHAT BILIK ↗',
'Explore room types for your planned stay. Live availability, final prices and online booking will be enabled after our booking system is connected.':'Lihat jenis bilik untuk perjalanan anda. Ketersediaan sebenar, harga akhir dan tempahan dalam talian akan tersedia selepas sistem tempahan disambungkan.',

'Stay':'Penginapan','Café & beer':'Kafe & bir','Visit us':'Lokasi',
'A good rest.\\nA great connection.':'Rehat yang lena.\\nKenalan baharu.',
'Your own little space, with a whole world downstairs. Capsules, comfortable beds, coffee and craft beer — all under one roof.':'Ruang rehat peribadi di tingkat atas, tempat bertemu di tingkat bawah. Kapsul, katil selesa, kopi dan bir kraf — semuanya di satu tempat.',
'Find your space ↗':'Pilih penginapan ↗','Just here for coffee? ↓':'Singgah untuk kopi? ↓','Hostel opening date to be announced.':'Tarikh pembukaan hostel akan diumumkan.',
'A little privacy. A lot of possibility.':'Sedikit privasi. Pelbagai kemungkinan.',
'01 / STAY WITH US':'01 / MENGINAP DI SINI','Find your kind of quiet.':'Cari ruang rehat anda.',
'Women’s capsules. Men’s dorms. Private rooms for everyone.':'Kapsul wanita. Dorm lelaki. Bilik persendirian untuk semua.',
'All spaces':'Semua pilihan','Women’s capsules':'Kapsul wanita','Men’s dorms':'Dorm lelaki','Private rooms':'Bilik persendirian',
'Indicative nightly rates, subject to confirmation. Taxes and booking policies will be published before reservations open. Dorms are sold by bed; there is no separate whole-dorm product.':'Kadar indikatif semalam, tertakluk pada pengesahan. Cukai dan polisi tempahan akan dipaparkan sebelum tempahan dibuka. Dorm dijual mengikut katil; tiada pilihan tempahan seluruh dorm yang berasingan.',
'02 / THE GROUND FLOOR':'02 / TINGKAT BAWAH','Come for a coffee.\\nStay for the company.':'Singgah untuk kopi.\\nNikmati kebersamaan.',
'Coffee, food and craft beer. A place for travellers and neighbours to take a seat and share a moment.':'Kopi, makanan dan bir kraf. Tempat untuk pengembara dan jiran duduk bersama dan menikmati masa santai.',
'Explore the menu ↗':'Lihat menu ↗',
'03 / FIND YOUR HUB':'03 / TEMUI KAMI','See you in Kuala Lumpur.':'Jumpa di Kuala Lumpur.',
'Café hours · 09:00–23:30 (Malaysia time)':'Waktu kafe · 09:00–23:30 (waktu Malaysia)',
'Contact us on WhatsApp ↗':'Hubungi melalui WhatsApp ↗','Get directions ↗':'Dapatkan arah ↗',
'Mobile check-in is planned. Instructions will be available once accommodation bookings open.':'Daftar masuk melalui telefon dirancang. Panduan akan tersedia apabila tempahan penginapan dibuka.'
};
const roomMalay = [
 ['Kapsul satu tingkat','Wanita sahaja','1.3 × 2 m · Bilik air berkongsi','kapsul'],
 ['Kapsul dua tingkat','Wanita sahaja','1.3 × 2 m · Bilik air berkongsi','kapsul'],
 ['Dorm 4 katil dengan bilik air','Lelaki sahaja','Katil bertingkat · Bilik air dalam dorm','katil'],
 ['Dorm 2 katil dengan bilik air','Lelaki sahaja','Katil bertingkat · Bilik air dalam dorm','katil'],
 ['Dorm 4 katil, bilik air berkongsi','Lelaki sahaja','Katil bertingkat · Bilik air berkongsi','katil'],
 ['Dorm 2 katil, bilik air berkongsi','Lelaki sahaja','Katil bertingkat · Bilik air berkongsi','katil'],
 ['Bilik persendirian, katil besar','Semua jantina dialu-alukan','Bilik air persendirian · Balkoni','bilik']
];
inventory.forEach((r,i)=>{const m=roomMalay[i];r.name.push(m[0]);r.qty.push(m[1]);r.details.push(m[2]);r.unit.push(m[3]);});

function enquiryLink(room){return 'enquiry.html?type=stay&room='+inventory.indexOf(room);}
let selectedRoom=null;
const dialog=document.querySelector('#room-dialog');
function renderRoomDetail(){
 const room=inventory[selectedRoom],n=language==='en'?0:language==='zh'?1:2;
 const note=n===0?'Our hostel is under renovation. Reservations are not open. Rates are indicative; final rates, taxes and policies will be announced before bookings open.':n===1?'青旅装修筹备中，暂不接受预订。展示价格仅供参考，最终房价、税费与政策将在开放预订前公布。':'Hostel sedang dalam pengubahsuaian. Tempahan belum dibuka. Kadar adalah indikatif; kadar akhir, cukai dan polisi akan diumumkan sebelum tempahan dibuka.';
 document.querySelector('#room-dialog-content').innerHTML=`<p class="eyebrow">CO-HUB / COMING SOON</p><h2 id="room-dialog-title">${room.name[n]}</h2><p>${room.qty[n]}</p><p>${room.details[n]}</p><div class="room-price"><strong>RM ${room.price}</strong><span>${n===0?`/ ${room.unit[n]} / night`:n===1?`／${room.unit[n]}／晚`:`/ ${room.unit[n]} / malam`}</span></div><p class="footnote">${note}</p><a class="button" href="${enquiryLink(room)}">${n===0?'Ask about our upcoming hostel ↗':n===1?'咨询青旅筹备信息 ↗':'Tanya tentang hostel akan datang ↗'}</a>`;
}
document.querySelector('#language').addEventListener('change',event=>{language=event.target.value;document.documentElement.lang=language==='zh'?'zh-Hans':language;document.querySelectorAll('[data-en]').forEach(el=>{const value=language==='ms'?(el.dataset.ms||malay[el.dataset.en]):el.dataset[language];el.textContent=(value||el.dataset.en).replaceAll('\\n','\n');});renderRooms();if(selectedRoom!==null)renderRoomDetail();});
document.querySelectorAll('[data-filter]').forEach(button=>{button.setAttribute('aria-pressed',button.dataset.filter==='all');button.addEventListener('click',()=>{filter=button.dataset.filter;document.querySelectorAll('[data-filter]').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',b===button);});renderRooms();});});
document.querySelector('#rooms')?.addEventListener('click',event=>{const button=event.target.closest('[data-room]');if(!button)return;selectedRoom=Number(button.dataset.room);renderRoomDetail();dialog.showModal();});
document.querySelector('#dialog-close')?.addEventListener('click',()=>dialog.close());
dialog?.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
dialog?.addEventListener('close',()=>{selectedRoom=null;});
renderRooms();

const heroVideo=document.querySelector('#hero-video');
const videoToggle=document.querySelector('#video-toggle');
if(heroVideo&&videoToggle){
  heroVideo.muted=true;
  function videoLabel(playing){
    videoToggle.dataset.en=playing?'Pause background video':'Play background video';
    videoToggle.dataset.zh=playing?'暂停背景视频':'播放背景视频';
    videoToggle.dataset.ms=playing?'Jeda video latar':'Mainkan video latar';
    videoToggle.textContent=videoToggle.dataset[language];
    videoToggle.setAttribute('aria-pressed',String(playing));
  }
  async function startVideo(){
    if(!heroVideo.getAttribute('src'))heroVideo.src=heroVideo.dataset.src;
    try{await heroVideo.play();videoLabel(true);}catch{videoLabel(false);}
  }
  heroVideo.addEventListener('pause',()=>videoLabel(false));
  heroVideo.addEventListener('playing',()=>videoLabel(true));
  heroVideo.addEventListener('error',()=>{heroVideo.style.display='none';videoToggle.hidden=true;});
  videoToggle.addEventListener('click',()=>{if(heroVideo.paused)startVideo();else heroVideo.pause();});
  if(!matchMedia('(prefers-reduced-motion: reduce)').matches&&!navigator.connection?.saveData)startVideo();
}
