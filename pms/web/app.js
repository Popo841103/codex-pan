import { Backend } from './backend.js';
import { seed, apply, preview, folio } from '../src/demo-store.js';
const words = {
 zh: { overview:'房态总览', orders:'订单管理', tasks:'清洁与维修', audit:'操作记录', local:'本地测试模式', team:'开发 · 运营 · 现场协作', test:'测试工作区', notice:'全部为合成数据，不代表实际房型库存。未连接 OTA、支付或生产系统。', date:'模拟营业日期', new:'＋ 新建测试订单', footer:'仅当前浏览器保存 · 请勿录入真实客人资料', total:'销售单位', booked:'当晚已订', available:'当晚可售', pending:'待分配', units:'房间 / 床位', rooms:'独立房间', beds:'宿舍床位', guest:'测试客人', product:'销售类型', gender:'分区资格', arrival:'入住日期', departure:'退房日期', group:'强制同房组编号（选填）', single:'每次创建一间或一床，相同组编号强制同房。房费与收付均为测试记录，不处理真实资金。', save:'确认测试订单', room:'房间', bed:'床位', female:'女士', male:'男士', any:'不限 / 未指定', clean:'已清洁', dirty:'待清洁', blocked:'维修停用', busy:'已预订', free:'可用', confirmed:'待入住', checked_in:'在住', checked_out:'已退房', assign:'分配 / 换床', checkin:'办理入住', checkout:'办理退房', finish:'完成清洁', block:'停用当日', unblock:'解除停用', empty:'暂无记录，创建一笔测试订单开始。', status:'状态', allocation:'已分配资源', action:'操作', saved:'测试操作已保存', noResource:'请选择资源', search:'搜索客人或订单', conflict:'库存、分区、同房或连续住宿条件不满足。', scope:'门店或资源不匹配。', state:'当前状态不能执行此操作。', occupied:'该资源仍有在住客人。', dateError:'请使用入住区间内日期入住；退房请将模拟日期设为订单离店日期。', input:'请检查输入。', dirtyError:'目标资源尚未清洁。', time:'操作时间', create:'新建订单', cleanAction:'完成清洁', blockAction:'维修停用', snapshot:'本地演示 · 非实时库存', storage:'浏览器保存失败，操作未提交。', guestError:'请填写测试客人姓名。', duplicate:'订单编号重复。' },
 en: { overview:'Property overview', orders:'Reservations', tasks:'Housekeeping', audit:'Activity log', local:'Local test mode', team:'Development · Operations · On-site', test:'TEST WORKSPACE', notice:'Synthetic data only. No live inventory, OTA, payments or production connection.', date:'Simulated business date', new:'+ Test reservation', footer:'Saved in this browser only · Do not enter real guest data', total:'Sales units', booked:'Booked tonight', available:'Available tonight', pending:'Unassigned', units:'Rooms / Beds', rooms:'Private rooms', beds:'Dormitory beds', guest:'Test guest', product:'Product', gender:'Zone eligibility', arrival:'Arrival', departure:'Departure', group:'Required same-room group (optional)', single:'One room or bed per reservation. Matching group IDs require the same room. Charges and payments are test records only.', save:'Confirm test reservation', room:'Room', bed:'Bed', female:'Female', male:'Male', any:'Any / unspecified', clean:'Clean', dirty:'Needs cleaning', blocked:'Out of service', busy:'Reserved', free:'Available', confirmed:'Expected', checked_in:'In house', checked_out:'Checked out', assign:'Assign / move', checkin:'Check in', checkout:'Check out', finish:'Mark clean', block:'Block this date', unblock:'Remove block', empty:'No records yet. Create a test reservation to begin.', status:'Status', allocation:'Assigned resource', action:'Actions', saved:'Test operation saved', noResource:'Choose resource', search:'Search guest or reservation', conflict:'Inventory, zone, same-room or continuous-stay constraint failed.', scope:'Property or resource mismatch.', state:'Action unavailable in current state.', occupied:'A guest is still occupying this resource.', dateError:'Check in within the stay; set the simulated date to departure for checkout.', input:'Check your input.', dirtyError:'Target resource needs cleaning.', time:'Time', create:'Create reservation', cleanAction:'Mark clean', blockAction:'Maintenance block', snapshot:'Local demo · Not live inventory', storage:'Browser storage failed. Operation not committed.', guestError:'Enter a test guest name.', duplicate:'Duplicate reservation ID.' },
 ms: { overview:'Gambaran hartanah', orders:'Tempahan', tasks:'Pembersihan', audit:'Log aktiviti', local:'Mod ujian setempat', team:'Pembangunan · Operasi · Pasukan tapak', test:'RUANG KERJA UJIAN', notice:'Data rekaan sahaja. Tiada sambungan inventori sebenar, OTA, bayaran atau produksi.', date:'Tarikh operasi simulasi', new:'+ Tempahan ujian', footer:'Disimpan dalam pelayar ini sahaja · Jangan masukkan data tetamu sebenar', total:'Unit jualan', booked:'Ditempah malam ini', available:'Tersedia malam ini', pending:'Belum ditetapkan', units:'Bilik / Katil', rooms:'Bilik persendirian', beds:'Katil asrama', guest:'Tetamu ujian', product:'Produk', gender:'Kelayakan zon', arrival:'Ketibaan', departure:'Berlepas', group:'Kumpulan wajib sebilik (pilihan)', single:'Satu bilik atau katil setiap tempahan. ID kumpulan sama mesti sebilik. Caj dan bayaran ialah rekod ujian sahaja.', save:'Sahkan tempahan ujian', room:'Bilik', bed:'Katil', female:'Wanita', male:'Lelaki', any:'Bebas / tidak ditetapkan', clean:'Bersih', dirty:'Perlu dibersihkan', blocked:'Tidak beroperasi', busy:'Ditempah', free:'Tersedia', confirmed:'Dijangka tiba', checked_in:'Menginap', checked_out:'Sudah keluar', assign:'Tetapkan / pindah', checkin:'Daftar masuk', checkout:'Daftar keluar', finish:'Tandakan bersih', block:'Sekat tarikh ini', unblock:'Buang sekatan', empty:'Tiada rekod. Cipta tempahan ujian untuk bermula.', status:'Status', allocation:'Unit ditetapkan', action:'Tindakan', saved:'Tindakan ujian disimpan', noResource:'Pilih unit', search:'Cari tetamu atau tempahan', conflict:'Syarat inventori, zon, sebilik atau penginapan berterusan gagal.', scope:'Hartanah atau unit tidak sepadan.', state:'Tindakan tidak tersedia untuk status ini.', occupied:'Tetamu masih menggunakan unit ini.', dateError:'Daftar masuk dalam tempoh penginapan; gunakan tarikh berlepas untuk daftar keluar.', input:'Semak input.', dirtyError:'Unit sasaran belum bersih.', time:'Masa', create:'Cipta tempahan', cleanAction:'Tandakan bersih', blockAction:'Sekatan penyelenggaraan', snapshot:'Demo setempat · Bukan inventori langsung', storage:'Simpanan pelayar gagal. Tindakan tidak disimpan.', guestError:'Masukkan nama tetamu ujian.', duplicate:'ID tempahan berulang.' }
};
const more = {
zh:{calendar:'多日房态',details:'订单详情',nightly:'每晚房费（MYR）',source:'订单来源',notes:'运营备注',direct:'直接预订',walkin:'现场散客',booking:'Booking.com',airbnb:'Airbnb',agoda:'Agoda',other:'其他',due:'待收 / 负数为待退款',charge:'住宿费用',paid:'住宿净实收',deposit:'押金余额',edit:'修改 / 续住',payment:'记录收款',refund:'记录退款',deposit_in:'收押金',deposit_out:'退押金',kind:'记录类型',amount:'金额（MYR）',method:'收付方式',cash:'现金',bank:'银行转账',card:'银行卡',ota:'OTA代收',record:'保存记录',transactions:'收付记录',cancelled:'已取消',cancel:'取消订单',reason:'取消原因',finalCharge:'取消后最终住宿费用（MYR）',cancelNote:'取消释放库存，不会自动退款。收退款须单独记录；最终费用按已确认政策填写。',locked:'房间已锁定，先解锁再换房。',lock:'锁定 / 解锁房间',lockedLabel:'已锁定',amountError:'请输入有效金额，最多两位小数。',refundError:'退款或退押金超过现有余额。',balance:'请先处理房费余额、超收退款和押金，再退房。',provisional:'内部预留，尚未人工分配',timelineHint:'点击空格建单，点击订单查看详情。虚线为内部预留；尚无拖拽和历史换床时间段视图。',emptyCell:'新建预订',close:'关闭',apply:'保存修改',financialNote:'仅记录测试收付，不扣款、不退款、不向OTA发送信息。',roomLocked:'已锁定房间',export:'导出测试订单CSV',unassigned:'未分配',dateError:'入住限住宿区间；退房请将模拟日期设为离店日。'},
en:{calendar:'Reservation calendar',details:'Reservation details',nightly:'Nightly room rate (MYR)',source:'Booking source',notes:'Operations notes',direct:'Direct',walkin:'Walk-in',booking:'Booking.com',airbnb:'Airbnb',agoda:'Agoda',other:'Other',due:'Due / negative means refund owed',charge:'Accommodation charge',paid:'Net room payments',deposit:'Deposit held',edit:'Edit / extend stay',payment:'Record payment',refund:'Record refund',deposit_in:'Receive deposit',deposit_out:'Return deposit',kind:'Record type',amount:'Amount (MYR)',method:'Payment method',cash:'Cash',bank:'Bank transfer',card:'Card',ota:'Collected by OTA',record:'Save record',transactions:'Payment records',cancelled:'Cancelled',cancel:'Cancel reservation',reason:'Cancellation reason',finalCharge:'Final accommodation charge after cancellation (MYR)',cancelNote:'Cancellation releases inventory but does not refund money. Record refunds separately; use the agreed cancellation policy.',locked:'Room locked. Unlock before moving.',lock:'Lock / unlock room',lockedLabel:'Locked',amountError:'Enter a valid amount with up to two decimals.',refundError:'Refund exceeds available paid or deposit balance.',balance:'Resolve room balance, refunds and deposit before checkout.',provisional:'Internal hold; not assigned by staff',timelineHint:'Click a free cell to reserve; click a booking for details. Dashed cells are internal holds. No drag-and-drop or historical room-move segments yet.',emptyCell:'New reservation',close:'Close',apply:'Save changes',financialNote:'Test records only. No real charge, refund or OTA messages.',roomLocked:'Room locked',export:'Export test reservations CSV',unassigned:'Unassigned'},
ms:{calendar:'Kalendar tempahan',details:'Butiran tempahan',nightly:'Kadar semalam (MYR)',source:'Sumber tempahan',notes:'Nota operasi',direct:'Terus',walkin:'Walk-in',booking:'Booking.com',airbnb:'Airbnb',agoda:'Agoda',other:'Lain-lain',due:'Baki / negatif bermakna perlu pulangan',charge:'Caj penginapan',paid:'Bayaran bersih',deposit:'Deposit dipegang',edit:'Edit / lanjut penginapan',payment:'Rekod bayaran',refund:'Rekod pulangan',deposit_in:'Terima deposit',deposit_out:'Pulangkan deposit',kind:'Jenis rekod',amount:'Amaun (MYR)',method:'Kaedah bayaran',cash:'Tunai',bank:'Pindahan bank',card:'Kad',ota:'Dikutip OTA',record:'Simpan rekod',transactions:'Rekod bayaran',cancelled:'Dibatalkan',cancel:'Batalkan tempahan',reason:'Sebab pembatalan',finalCharge:'Caj akhir selepas pembatalan (MYR)',cancelNote:'Pembatalan melepaskan inventori, bukan memulangkan wang. Rekod pulangan secara berasingan mengikut polisi.',locked:'Bilik dikunci. Buka kunci sebelum pindah.',lock:'Kunci / buka kunci bilik',lockedLabel:'Dikunci',amountError:'Masukkan amaun sah dengan maksimum dua perpuluhan.',refundError:'Pulangan melebihi baki bayaran atau deposit.',balance:'Selesaikan baki, pulangan dan deposit sebelum daftar keluar.',provisional:'Pegangan dalaman; belum ditetapkan staf',timelineHint:'Klik petak kosong untuk tempahan, klik tempahan untuk butiran. Garis putus ialah pegangan dalaman. Belum menyokong seret atau sejarah pindah mengikut masa.',emptyCell:'Tempahan baharu',close:'Tutup',apply:'Simpan perubahan',financialNote:'Rekod ujian sahaja. Tiada caj, pulangan atau mesej OTA sebenar.',roomLocked:'Bilik dikunci',export:'Eksport tempahan ujian CSV',unassigned:'Belum ditetapkan'}
};
for(const language of Object.keys(more)) Object.assign(words[language],more[language]);
const backend=new Backend();
let writing=false, pendingMutation=null;
const key = 'cohub-pms-demo-v1';
let state = seed(), lang = 'zh', propertyId = 'TEST-KL', view = 'calendar';

const sourceValues=['direct','walkin','booking','airbnb','agoda','tripcom','other'];
let calendarDate='2027-01-10', calendarStatus='all', calendarSource='all';
let displaySource=true, displayBalance=true, displayAvailability=true, compactRows=false;
let calendarSpan=30, calendarProduct='all', calendarGender='all', calendarQuery='', calendarGroup='product';
const $ = s => document.querySelector(s);
const t = k => words[lang][k] || k;
const escape = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const opts = (values, selected) => values.map(v => `<option value="${escape(v)}" ${selected===v?'selected':''}>${escape(t(v))}</option>`).join('');
const businessDate = () => $('#date').value;
const nextDay = d => new Date(Date.parse(`${d}T00:00:00Z`)+86400000).toISOString().slice(0,10);
function errorText(error) { const map = { dirty:'dirtyError', date:'dateError', guest:'guestError', amount:'amountError', refund:'refundError' }; return t(map[error.message] || (words[lang][error.message] ? error.message : 'conflict')); }
async function refreshShared(){
  state=await backend.state();
  if(!state.properties.length)throw new Error('emptyAccess');
  if(!state.properties.some(p=>p.id===propertyId))propertyId=state.properties[0]?.id;
  render();
}
async function commit(command) {
  if(writing)throw new Error('busy');
  writing=true;
  try{
    if(backend.shared){
      if(!backend.user)throw new Error('login_required');
      // A transport retry reuses this exact request key; never blindly create a second payment.
      const payload={...command,propertyId,date:businessDate()}, fingerprint=JSON.stringify(payload);
      if(pendingMutation&&pendingMutation.fingerprint!==fingerprint)throw new Error('uncertain');
      pendingMutation??={key:crypto.randomUUID(),revision:state.revisions[propertyId],fingerprint};
      const {key,revision}=pendingMutation;
      let result;
      try{result=await backend.execute(payload,revision,key);}
      catch(e){
        if(e instanceof TypeError)result=await backend.execute(payload,revision,key);
        else{if(e.status)pendingMutation=null;throw e;}
      }
      await refreshShared();pendingMutation=null;
    }else{
      const updated=apply(state,{...command,propertyId,id:crypto.randomUUID(),at:new Date().toISOString(),date:businessDate()});
      try{localStorage.setItem(key,JSON.stringify(updated));}catch{throw new Error('storage');}
      state=updated;render();
    }
    $('#message').textContent=t('saved');
  }catch(e){
    if(e.status)pendingMutation=null;
    if(backend.shared && e.message==='stale_revision')await refreshShared();
    if(e.status===401){backend.user=null;showLogin();}
    throw e;
  }finally{writing=false;}
}

function can(action){return !backend.shared||!!backend.user?.allowedActions.includes(action);}
function button(action, id, label) { return `<button ${action!=='details'&&!can(action)?'disabled':''} data-action="${action}" data-id="${escape(id)}">${escape(t(label||action))}</button>`; }
function render() {
  $('#session-label').textContent=backend.shared ? (backend.user ? backend.user.username+' · '+backend.user.role : t('login')) : t('local');
  $('#new').disabled=!can('create');
  $('#logout').hidden=!backend.user;
  $('#refresh').hidden=!backend.user;$('#refresh').title=t('refresh');$('#refresh').setAttribute('aria-label',t('refresh'));
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-t]').forEach(el => el.textContent = t(el.dataset.t));
  $('#title').textContent = t(view);
  $('#nav').innerHTML = ['calendar','overview','orders','tasks','audit'].map((k,i) => `<button data-view="${k}" class="${view===k?'active':''}"><span>0${i+1}</span>${t(k)}</button>`).join('');
  $('#property').innerHTML = state.properties.map(p=>`<option value="${p.id}" ${p.id===propertyId?'selected':''}>${p.name}</option>`).join('');
  $('#product').innerHTML = opts(['room','bed'], $('#product').value);
  $('#gender').innerHTML = opts(['any','female','male'], $('#gender').value);
  const source=$('#order-form [name=source]');if(source)source.innerHTML=opts(sourceValues,source.value);
  const date = businessDate();
  const resources = state.resources.filter(r=>r.propertyId===propertyId);
  const orders = state.orders.filter(o=>o.propertyId===propertyId);
  const plan = preview(state,propertyId);
  const active = plan.filter(p=>p.start<=date && p.end>date);
  const blocked = state.blocks.filter(b=>b.propertyId===propertyId && b.start<=date && b.end>date);
  const available = resources.filter(r=>!active.some(p=>p.resourceId===r.id) && !blocked.some(b=>b.atoms.some(a=>r.atoms.includes(a)))).length;
  const stat = (label,n,sub) => `<div class="stat"><span>${t(label)}</span><strong>${n}</strong><small>${escape(sub)}</small></div>`;
  const stats = `<div class="stats">${stat('total',resources.length,t('units'))}${stat('booked',active.length,date)}${stat('available',available,t('snapshot'))}${stat('pending',orders.filter(o=>o.status==='confirmed'&&!o.resourceId).length,t('allocation'))}</div>`;
  if(view==='calendar') { $('#content').innerHTML = stats + calendar(resources,orders,plan,calendarDate); } else if(view==='overview' || view==='tasks') {
    $('#content').innerHTML = (view==='overview'?stats:'') + ['room','bed'].map(product=>`<section class="panel"><div class="panel-head"><h2>${t(product==='room'?'rooms':'beds')}</h2><span class="muted">${resources.filter(r=>r.productId===product).length} ${t(product)}</span></div><div class="grid">${resources.filter(r=>r.productId===product).map(r=>{
      const b = blocked.find(b=>b.atoms.some(a=>r.atoms.includes(a)));
      const busy = active.some(p=>p.resourceId===r.id);
      const status = b?'blocked':r.cleaning==='dirty'?'dirty':busy?'busy':'free';
      const control = view==='tasks' ? (r.cleaning==='dirty'?button('clean',r.id,'finish'):'') + (b?button('unblock',b.id,'unblock'):button('block',r.id,'block')) : '';
      return `<div class="resource ${status}"><strong>${escape(r.label)}</strong><small>${t(r.gender)}</small><span class="badge ${status==='dirty'?'warn':''}">${t(status)}</span><div>${control}</div></div>`;
    }).join('')}</div></section>`).join('');
  } else if(view==='orders') {
    $('#content').innerHTML = `<section class="panel"><div class="panel-head"><h2>${t('orders')} <span class="muted">${orders.length}</span></h2><input id="search" class="search" placeholder="${t('search')}" aria-label="${t('search')}"></div><div class="table-wrap"><table><thead><tr>${['guest','arrival','status','allocation','action'].map(k=>`<th>${t(k)}</th>`).join('')}</tr></thead><tbody>${orders.map(o=>`<tr data-search="${escape((o.guest+' '+o.id).toLowerCase())}"><td>${escape(o.guest)}<small>${escape(o.id.slice(0,8))} · ${t(o.productId)}</small></td><td>${o.start}<small>→ ${o.end}</small></td><td><span class="badge">${t(o.status)}</span><small>${t('due')}: ${currency(folio(o).due)}</small></td><td>${escape(resources.find(r=>r.id===o.resourceId)?.label || '—')}</td><td><div class="actions">${button('details',o.id,'details')}${!['checked_out','cancelled'].includes(o.status)?`<select data-target="${o.id}" aria-label="${t('allocation')}"><option value="">${t('noResource')}</option>${resources.filter(r=>r.productId===o.productId).map(r=>`<option value="${r.id}" ${r.id===o.resourceId?'selected':''}>${escape(r.label)} · ${t(r.gender)}</option>`).join('')}</select>${button('assign',o.id)}${button(o.status==='confirmed'?'checkin':'checkout',o.id)}`:''}</div></td></tr>`).join('')}</tbody></table>${orders.length?'':`<div class="empty">${t('empty')}</div>`}</div></section>`;
    $('#search').oninput = e => document.querySelectorAll('tr[data-search]').forEach(row=>row.hidden=!row.dataset.search.includes(e.target.value.toLowerCase()));
  } else {
    $('#content').innerHTML = `<section class="panel"><h2>${t('audit')}</h2><div class="table-wrap"><table><thead><tr><th>${t('time')}</th><th>${t('action')}</th><th>ID</th></tr></thead><tbody>${state.audit.filter(a=>a.propertyId===propertyId).map(a=>`<tr><td>${escape(new Date(a.at).toLocaleString(lang==='zh'?'zh-CN':lang==='ms'?'ms-MY':'en-GB',{timeZone:'Asia/Kuala_Lumpur'}))}</td><td>${t(a.type==='clean'?'cleanAction':a.type==='block'?'blockAction':a.type)}</td><td>${escape((a.orderId||a.resourceId||a.id).slice(0,20))}<small>${escape(a.actor||'')}</small></td></tr>`).join('')}</tbody></table></div><p class="muted">${t('footer')}</p></section>`;
  }
}
const extraFields = document.createElement('div');
extraFields.innerHTML = `<div class="form-row"><label><span data-t="nightly"></span><input name="nightly" type="number" min="0" max="1000000" step="0.01" value="0" required></label><label><span data-t="source"></span><select name="source">${opts(sourceValues)}</select></label></div><div class="form-row"><label><span data-t="email"></span><input name="email" type="email" maxlength="254"></label><label><span data-t="phone"></span><input name="phone" maxlength="40"></label></div><label><span data-t="notes"></span><textarea name="notes" maxlength="2000"></textarea></label>`;
$('#order-form .muted').before(extraFields);
$('#nav').onclick = e => { const b=e.target.closest('[data-view]'); if(b){view=b.dataset.view;render();} };
$('#language').onchange=e=>{lang=e.target.value;$('#message').textContent='';render();};
function switchProperty(id){
  if(writing||pendingMutation){$('#message').textContent=t('uncertain');return false;}
  if(!state.properties.some(p=>p.id===id))return false;
  propertyId=id;view='calendar';calendarQuery='';calendarProduct='all';calendarGender='all';calendarStatus='all';calendarSource='all';
  $('#utility-dialog').close();$('#order-dialog').close();$('#detail-dialog').close();$('#message').textContent='';render();return true;
}
$('#property').onchange=e=>{if(!switchProperty(e.target.value))render();};
$('#choose-property').onclick=()=>showPropertyPicker();
function showPropertyPicker(){
  if(writing||pendingMutation){$('#message').textContent=t('uncertain');return;}
  const labels={zh:['选择酒店','选择本次要管理的酒店','进入后台'],en:['Choose hotel','Select a hotel to manage','Open dashboard'],ms:['Pilih hotel','Pilih hotel untuk diurus','Buka papan pemuka']}[lang];
  $('#property-picker-title').textContent=labels[0];$('#property-picker-note').textContent=labels[1];
  $('#property-cards').innerHTML=state.properties.map(p=>`<button data-property="${escape(p.id)}"><strong>${escape(p.name)}</strong><small>${escape(p.id)}</small><span>${labels[2]} →</span></button>`).join('');
  if(!$('#property-dialog').open)$('#property-dialog').showModal();
}
$('#property-dialog').addEventListener('cancel',e=>e.preventDefault());
$('#property-cards').onclick=e=>{const card=e.target.closest('[data-property]');if(card&&switchProperty(card.dataset.property))$('#property-dialog').close();};
$('#date').onchange=()=>{if(!$('#date').value)$('#date').value='2027-01-10';calendarDate=businessDate();render();};
$('#new').onclick=()=>{const f=$('#order-form');f.reset();delete f.dataset.resourceId;f.elements.start.value=businessDate();f.elements.end.value=nextDay(businessDate());$('#form-error').textContent='';$('#order-dialog').showModal();};
$('#close').onclick=()=>$('#order-dialog').close();
$('#order-form').onsubmit=async e=>{e.preventDefault();try{await commit({type:'create',...Object.fromEntries(new FormData(e.target)),nightly:toMinor(e.target.elements.nightly.value),resourceId:e.target.dataset.resourceId||null});$('#order-dialog').close();}catch(error){$('#form-error').textContent=errorText(error);}};
$('#content').onclick=async e=>{
  const b=e.target.closest('[data-action]');if(!b)return;
  const {action:type,id}=b.dataset;if(type==='details'){openDetail(id);return;}let command={type};
  if(['assign','checkin','checkout'].includes(type))command.orderId=id;
  if(type==='assign')command.resourceId=document.querySelector(`[data-target="${id}"]`).value;
  if(type==='clean'||type==='block')command.resourceId=id;
  if(type==='block'){command.start=businessDate();command.end=nextDay(businessDate());}
  if(type==='unblock')command.blockId=id;
  try{await commit(command);}catch(error){$('#message').textContent=errorText(error);}
};

function currency(value) { return new Intl.NumberFormat(lang==='zh'?'zh-MY':lang==='ms'?'ms-MY':'en-MY',{style:'currency',currency:'MYR'}).format(value/100); }
function toMinor(value) {
  if(!/^\d+(\.\d{1,2})?$/.test(String(value)))throw new Error('amountError');
  const [whole,decimal='']=String(value).split('.');
  const result=Number(whole)*100+Number(decimal.padEnd(2,'0'));
  if(!Number.isSafeInteger(result)||result>100000000)throw new Error('amountError');
  return result;
}
function calendar(resources,orders,plan,date) {
  const days=Array.from({length:calendarSpan},(_,i)=>new Date(Date.parse(date+'T00:00:00Z')+i*86400000).toISOString().slice(0,10));
  const matches=o=>(calendarStatus==='all'||o.status===calendarStatus)&&(calendarSource==='all'||o.source===calendarSource)&&(!calendarQuery||[o.guest,o.id,o.email,o.phone,o.notes,o.channelOrderId].join(' ').toLowerCase().includes(calendarQuery.toLowerCase()));
  const eligible=resources.filter(r=>(calendarProduct==='all'||r.productId===calendarProduct)&&(calendarGender==='all'||r.gender===calendarGender));
  const groupOf=r=>calendarGroup==='room'?r.roomId:(r.roomTypeId||r.productId+'-'+r.gender);
  const labelOf=r=>calendarGroup==='room'?r.roomId:(r.roomTypeName||t(r.productId)+' · '+t(r.gender));
  const visible=eligible.filter(r=>!calendarQuery&&calendarStatus==='all'&&calendarSource==='all'||orders.some(o=>matches(o)&&plan.some(p=>p.demandId===o.id&&p.resourceId===r.id))||calendarStatus==='all'&&calendarSource==='all'&&r.label.toLowerCase().includes(calendarQuery.toLowerCase())).sort((a,b)=>groupOf(a).localeCompare(groupOf(b),undefined,{numeric:true})||a.label.localeCompare(b.label,undefined,{numeric:true}));
  const queue=orders.filter(o=>o.status==='confirmed'&&!o.resourceId&&matches(o)&&(calendarProduct==='all'||o.productId===calendarProduct)&&(calendarGender==='all'||o.gender===calendarGender));
  const select=(id,title,values,current)=>`<label class="compact-label">${t(title)}<select id="${id}">${values.map(v=>`<option value="${v}" ${v===current?'selected':''}>${t(v)}</option>`).join('')}</select></label>`;
  const groupCounts=new Map();visible.forEach(r=>groupCounts.set(groupOf(r),(groupCounts.get(groupOf(r))||0)+1));
  let lastGroup=null;
  const rows=visible.map(r=>{
    const group=groupOf(r), heading=lastGroup!==group?`<th class="type-cell" rowspan="${groupCounts.get(group)}" scope="rowgroup">${escape(labelOf(r))}</th>`:'';lastGroup=group;
    let cells='';
    for(let i=0;i<days.length;){
      const d=days[i],reservation=plan.find(p=>p.resourceId===r.id&&p.start<=d&&p.end>d);
      const order=orders.find(o=>o.id===reservation?.demandId);
      const block=state.blocks.find(b=>b.propertyId===propertyId&&b.start<=d&&b.end>d&&b.atoms.some(a=>r.atoms.includes(a)));
      // A sibling resource can share atoms with this row (whole dorm vs a bed).
      const shared=!order&&plan.some(p=>p.start<=d&&p.end>d&&p.atoms.some(a=>r.atoms.includes(a)));
      if(order){
        let span=1;while(i+span<days.length&&days[i+span]<reservation.end)span++;
        cells+=`<td colspan="${span}"><button class="calendar-booking ${order.resourceId?'':'provisional'} ${order.status} color-${escape(order.color||'default')}" data-action="details" data-id="${escape(order.id)}" title="${escape(order.guest+' · '+order.start+' → '+order.end+' · '+t(order.status))}"><strong>${order.start<date?'◀ ':''}${escape(order.guest)} ${order.locked?'🔒':''}</strong><small>${displaySource?escape(t(order.source||'direct'))+' · ':''}${t(order.status)}${displayBalance?' · '+currency(folio(order).due):''}${order.end>nextDay(days.at(-1))?' ▶':''}</small></button></td>`;i+=span;
      }else if(block||shared){cells+=`<td class="calendar-block" title="${escape(block?.reason||t(shared?'sharedOccupied':'blocked'))}">${t(shared?'sharedOccupied':'blocked')}</td>`;i++;}
      else{cells+=`<td><button class="calendar-empty" ${can('create')?'':'disabled'} data-cell="${escape(r.id)}" data-day="${d}" aria-label="${escape(r.label+' '+d+' '+t('emptyCell'))}">＋</button></td>`;i++;}
    }
    return `<tr>${heading}<th class="unit-cell" scope="row"><strong>${escape(r.label)}</strong><small>${t(r.cleaning)}${r.cleaning==='dirty'?' ◒':''}</small></th>${cells}</tr>`;
  }).join('');
  const counts=(product,d)=>eligible.filter(r=>r.productId===product&&!plan.some(p=>p.start<=d&&p.end>d&&p.atoms.some(a=>r.atoms.includes(a)))&&!state.blocks.some(b=>b.propertyId===propertyId&&b.start<=d&&b.end>d&&b.atoms.some(a=>r.atoms.includes(a)))).length;
  return `<section class="panel calendar-panel"><div class="calendar-actions"><button data-cal-view="calendar" class="${view==='calendar'?'selected':''}">${t('calendar')}</button><button data-cal-view="overview">${t('singleDay')}</button><button data-cal-tool="quick">${t('quickOrder')}</button><button data-cal-tool="queue">${t('orderBox')} (${queue.length})</button><button data-cal-tool="display">${t('displaySettings')}</button><button data-cal-tool="legend">${t('legend')}</button><button data-cal-tool="bulk">${t('batchOperations')}</button><button data-cal-view="audit">${t('audit')}</button><button id="export">${t('export')}</button></div><div class="calendar-toolbar"><button data-calendar-step="-1" aria-label="${t('previous')}">←</button><label class="compact-label">${t('viewStart')}<input id="calendar-date" type="date" value="${date}" required></label><button data-cal-tool="today">${t('backToBusiness')}</button><button data-calendar-step="1" aria-label="${t('next')}">→</button><input id="calendar-search" value="${escape(calendarQuery)}" placeholder="${t('calendarSearch')}" aria-label="${t('calendarSearch')}"></div><details class="calendar-filters" ${calendarQuery||calendarProduct!=='all'||calendarGender!=='all'||calendarStatus!=='all'||calendarSource!=='all'?'open':''}><summary>${t('filters')}</summary><div class="calendar-toolbar">${select('calendar-product','product',['all','room','bed'],calendarProduct)}${select('calendar-gender','gender',['all','female','male','any'],calendarGender)}${select('calendar-status','status',['all','confirmed','checked_in'],calendarStatus)}${select('calendar-source','source',['all',...sourceValues],calendarSource)}<button data-cal-tool="reset">${t('resetFilters')}</button></div></details><p class="muted">${t('timelineHint')}</p><div class="calendar-wrap"><table class="calendar ${compactRows?'compact':''}" data-span="${calendarSpan}"><colgroup><col class="type-column"><col class="resource-column">${days.map(()=>'<col class="day-column">').join('')}</colgroup><thead><tr><th class="type-cell">${t('salesGroup')}</th><th class="unit-cell">${date} → ${days.at(-1)}</th>${days.map(d=>`<th class="${d===businessDate()?'business-day':''}">${d.slice(5)}<small>${new Intl.DateTimeFormat(lang==='zh'?'zh-CN':lang==='ms'?'ms-MY':'en-GB',{weekday:'short',timeZone:'UTC'}).format(new Date(d+'T00:00:00Z'))}</small></th>`).join('')}</tr>${displayAvailability?`<tr class="availability"><th class="type-cell">${t('dailyAvailable')}</th><th class="unit-cell">${t('room')} / ${t('bed')}</th>${days.map(d=>`<th>${counts('room',d)} / ${counts('bed',d)}</th>`).join('')}</tr>`:''}</thead><tbody>${rows}</tbody></table></div>${visible.length?'':`<p>${t('noMatchingResources')}</p>`}<details id="calendar-queue"><summary>${t('orderBox')} (${queue.length})</summary><p class="muted">${t('holdExplanation')}</p><div class="calendar-queue">${queue.map(o=>`<button data-action="details" data-id="${escape(o.id)}">${escape(o.guest)} · ${o.start} → ${o.end} · ${t(o.productId)}</button>`).join('')||t('empty')}</div></details></section>`;
}

$('#content').addEventListener('change',e=>{
  if(e.target.id==='calendar-span')calendarSpan=Number(e.target.value);
  else if(e.target.id==='calendar-product')calendarProduct=e.target.value;
  else if(e.target.id==='calendar-gender')calendarGender=e.target.value;
  else if(e.target.id==='calendar-group')calendarGroup=e.target.value;
  else if(e.target.id==='calendar-search')calendarQuery=e.target.value;
  else if(e.target.id==='calendar-status')calendarStatus=e.target.value;
  else if(e.target.id==='calendar-source')calendarSource=e.target.value;
  else if(e.target.id==='calendar-date'){if(!e.target.value)return;calendarDate=e.target.value;}
  else return;
  render();
});
$('#content').addEventListener('click',e=>{
  const control=e.target.closest('[data-calendar-step]');if(!control)return;
  calendarDate=new Date(Date.parse(calendarDate+'T00:00:00Z')+Number(control.dataset.calendarStep)*calendarSpan*86400000).toISOString().slice(0,10);render();
});

let detailTab='details', detailId=null;
function openDetail(id) {
  const o=state.orders.find(o=>o.id===id&&o.propertyId===propertyId);if(!o)return;
  if(detailId!==id){detailId=id;detailTab='details';}
  const f=folio(o),finished=['checked_out','cancelled'].includes(o.status),resource=state.resources.find(r=>r.id===o.resourceId);
  const fields=()=>['email','phone','country','guestLanguage','channelOrderId'].map(name=>`<label>${t(name)}<input name="${name}" value="${escape(o[name]||'')}" maxlength="${name==='email'?254:name==='channelOrderId'?100:name==='country'?80:40}"></label>`).join('');
  const editForm=`<details class="edit-section"><summary>${t('edit')}</summary><form id="edit-form"><label>${t('guest')}<input name="guest" value="${escape(o.guest)}" maxlength="100" required></label><div class="form-row"><label>${t('arrival')}<input name="start" type="date" value="${o.start}" required></label><label>${t('departure')}<input name="end" type="date" value="${o.end}" required></label></div><div class="form-row"><label>${t('nightly')}<input name="nightly" type="number" step="0.01" min="0" max="1000000" value="${(o.nightly||0)/100}" required></label><label>${t('source')}<select name="source">${opts(sourceValues,o.source||'direct')}</select></label></div><div class="guest-fields">${fields()}</div><label>${t('notes')}<textarea name="notes" maxlength="2000">${escape(o.notes||'')}</textarea></label><label>${t('channelNotes')}<textarea name="channelNotes" maxlength="2000">${escape(o.channelNotes||'')}</textarea></label><label>${t('specialColor')}<select name="color">${opts(['','peach','blue','green','violet'],o.color||'')}</select></label><button class="primary" ${!finished&&can('edit')?'':'disabled'}>${t('apply')}</button></form></details>`;
  const allocation=!finished?`<section class="calendar-allocation"><h3>${t('allocation')}</h3><select id="detail-resource" aria-label="${t('allocation')}"><option value="">${t('noResource')}</option>${state.resources.filter(r=>r.propertyId===propertyId&&r.productId===o.productId).map(r=>`<option value="${escape(r.id)}" ${r.id===o.resourceId?'selected':''}>${escape(r.label)} · ${t(r.gender)} · ${t(r.cleaning)}</option>`).join('')}</select><button id="detail-assign" ${can('assign')&&!o.locked?'':'disabled'}>${t('assign')}</button><button id="toggle-lock" ${can('lock')&&o.resourceId?'':'disabled'}>${t(o.locked?'unlockRoom':'lockRoom')}</button></section>`:'';
  const basic=`<section><div class="panel-head"><h2>${escape(o.guest)}</h2><span class="badge">${t(o.source||'direct')} · ${t(o.status)}</span></div><dl class="guest-info">${['email','phone','country','guestLanguage'].map(name=>`<div><dt>${t(name)}</dt><dd>${escape(o[name]||'—')}</dd></div>`).join('')}</dl><div class="folio-grid">${[['charge',f.charge],['paid',f.paid],['due',f.due],['deposit',f.deposit]].map(([k,v])=>`<div><span>${t(k)}</span><strong>${currency(v)}</strong></div>`).join('')}</div><section class="stay-card"><h3>${t('stayInfo')}</h3><strong>${escape(resource?.label||t('unassigned'))}</strong><p>${o.start} → ${o.end} · ${f.nights} ${t('nights')}</p><p>${t('nightly')}: ${currency(o.nightly||0)} · ${t(o.status)}</p></section>${allocation}<h3>${t('channelNotes')}</h3><p class="text-block">${escape(o.channelNotes||'—')}</p><h3>${t('notes')}</h3><p class="text-block">${escape(o.notes||'—')}</p>${editForm}<dl class="order-meta"><dt>ID</dt><dd>${escape(o.id)}</dd><dt>${t('createdAt')}</dt><dd>${escape(o.createdAt||'—')}</dd><dt>${t('createdBy')}</dt><dd>${escape(o.createdBy||'—')}</dd></dl></section>`;
  const bill=`<div class="folio-grid">${[['charge',f.charge],['paid',f.paid],['due',f.due],['deposit',f.deposit]].map(([k,v])=>`<div><span>${t(k)}</span><strong>${currency(v)}</strong></div>`).join('')}</div><p class="muted">${t('billExplanation')}</p><form id="payment-form"><h3>${t('transactions')}</h3><p class="muted">${t('financialNote')}</p><div class="form-row"><label>${t('kind')}<select name="kind">${opts(['payment','refund','deposit_in','deposit_out'])}</select></label><label>${t('amount')}<input name="amount" type="number" min="0.01" max="1000000" step="0.01" required></label></div><div class="form-row"><label>${t('method')}<select name="method">${opts(['cash','bank','card','ota'])}</select></label><label>${t('notes')}<input name="note" maxlength="500"></label></div><button class="primary" ${can('payment')?'':'disabled'}>${t('record')}</button></form><div class="table-wrap"><table><thead><tr>${['time','kind','amount','method','notes'].map(k=>`<th>${t(k)}</th>`).join('')}</tr></thead><tbody>${(o.transactions||[]).map(p=>`<tr><td>${escape(p.at.slice(0,16))} UTC</td><td>${t(p.kind)}</td><td>${currency(p.amount)}</td><td>${t(p.method)}</td><td>${escape(p.note||'')}</td></tr>`).join('')}</tbody></table></div>`;
  const logs=state.audit.filter(a=>a.propertyId===propertyId&&a.orderId===id);
  const audit=`<p class="muted">${t('auditLimit')}</p><div class="table-wrap"><table><thead><tr><th>${t('time')}</th><th>${t('action')}</th><th>${t('createdBy')}</th></tr></thead><tbody>${logs.map(a=>`<tr><td>${escape(a.at)}</td><td>${escape(t(a.type))}</td><td>${escape(a.actor||'local')}</td></tr>`).join('')}</tbody></table></div><h3>${t('assign')}</h3><ul>${(o.history||[]).map(h=>`<li>${escape(h.from||'—')} → ${escape(h.to)} · ${escape(h.at||'')}</li>`).join('')}</ul>`;
  const channel=`<h3>${t('channelInfo')}</h3><dl class="order-meta"><dt>${t('source')}</dt><dd>${escape(t(o.source||'direct'))}</dd><dt>${t('channelOrderId')}</dt><dd>${escape(o.channelOrderId||'—')}</dd></dl><p class="muted">${t('channelNotConnected')}</p><h3>${t('channelNotes')}</h3><p class="text-block">${escape(o.channelNotes||'—')}</p>`;
  const cancellation=o.status==='confirmed'?`<details><summary>${t('cancel')}</summary><form id="cancel-form"><p class="muted">${t('cancelNote')}</p><label>${t('reason')}<input name="reason" required maxlength="500"></label><label>${t('finalCharge')}<input name="finalCharge" type="number" min="0" max="1000000" step="0.01" required></label><button ${can('cancel')?'':'disabled'}>${t('cancel')}</button></form></details>`:'';
  $('#detail-body').innerHTML=`<div class="detail-head"><div role="tablist" aria-label="${t('details')}">${[['details','details'],['bill','billInfo'],['audit','audit'],['channel','channelInfo']].map(([key,label])=>`<button role="tab" id="detail-tab-${key}" aria-selected="${key===detailTab}" aria-controls="detail-panel" data-detail-tab="${key}" tabindex="${key===detailTab?0:-1}">${t(label)}</button>`).join('')}</div><button id="detail-close" aria-label="${t('close')}">×</button></div><div id="detail-error" role="alert"></div><div class="detail-scroll" id="detail-panel" role="tabpanel" aria-labelledby="detail-tab-${detailTab}">${{details:basic,bill,audit,channel}[detailTab]}${detailTab==='details'?cancellation:''}</div><div class="detail-footer"><button data-detail-go="details">${t('edit')}</button><button data-detail-go="bill">${t('billInfo')}</button>${!finished?button(o.status==='confirmed'?'checkin':'checkout',id):''}<button id="print-order">${t('print')}</button></div>`;
  $('#detail-close').onclick=()=>$('#detail-dialog').close();
  const act=async command=>{try{await commit({...command,orderId:id});openDetail(id);}catch(e){$('#detail-error').textContent=errorText(e);}};
  $('#detail-body').onclick=e=>{
    const tab=e.target.closest('[data-detail-tab]'),go=e.target.closest('[data-detail-go]'),action=e.target.closest('[data-action]');
    if(tab||go){detailTab=(tab||go).dataset[tab?'detailTab':'detailGo'];openDetail(id);if(tab)$(`#detail-tab-${detailTab}`).focus();else if(detailTab==='details')$('#edit-form')?.closest('details')?.setAttribute('open','');}
    if(action)act({type:action.dataset.action});
    if(e.target.closest('#print-order'))window.print();
  };
  $('#detail-body').onkeydown=e=>{const tab=e.target.closest('[data-detail-tab]');if(!tab||!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const tabs=['details','bill','audit','channel'];detailTab=e.key==='Home'?tabs[0]:e.key==='End'?tabs.at(-1):tabs[(tabs.indexOf(detailTab)+(e.key==='ArrowRight'?1:3))%4];openDetail(id);$(`#detail-tab-${detailTab}`).focus();};
  if($('#detail-assign'))$('#detail-assign').onclick=()=>act({type:'assign',resourceId:$('#detail-resource').value});
  if($('#edit-form'))$('#edit-form').onsubmit=e=>{e.preventDefault();try{const values=Object.fromEntries(new FormData(e.target));act({type:'edit',...values,nightly:toMinor(values.nightly)});}catch(e){$('#detail-error').textContent=errorText(e);}};
  if($('#payment-form'))$('#payment-form').onsubmit=e=>{e.preventDefault();try{const values=Object.fromEntries(new FormData(e.target));act({type:'payment',...values,amount:toMinor(values.amount)});}catch(e){$('#detail-error').textContent=errorText(e);}};
  if($('#toggle-lock'))$('#toggle-lock').onclick=()=>act({type:'lock'});
  if($('#cancel-form'))$('#cancel-form').onsubmit=e=>{e.preventDefault();try{const values=Object.fromEntries(new FormData(e.target));act({type:'cancel',...values,finalCharge:toMinor(values.finalCharge)});}catch(e){$('#detail-error').textContent=errorText(e);}};
  if(!$('#detail-dialog').open)$('#detail-dialog').showModal();
}
function openUtility(title,html){$('#utility-title').textContent=t(title);$('#utility-body').innerHTML=html;$('#utility-error').textContent='';if(!$('#utility-dialog').open)$('#utility-dialog').showModal();}
$('#utility-close').onclick=()=>$('#utility-dialog').close();
$('#content').addEventListener('click',e=>{
  const target=e.target.closest('[data-cal-tool]'),nav=e.target.closest('[data-cal-view]');
  if(nav){view=nav.dataset.calView;render();return;}
  if(!target)return;const tool=target.dataset.calTool;
  if(tool==='quick'){$('#new').click();return;}
  if(tool==='queue'){$('#calendar-queue').open=true;$('#calendar-queue').scrollIntoView({block:'nearest'});return;}
  if(tool==='today'){calendarDate=businessDate();render();return;}
  if(tool==='reset'){calendarProduct='all';calendarGender='all';calendarQuery='';calendarStatus='all';calendarSource='all';render();return;}
  if(tool==='legend'){
    openUtility('legend',`<p>${t('legendExplanation')}</p><ul class="legend-list"><li><span class="legend-swatch confirmed"></span>${t('confirmed')}</li><li><span class="legend-swatch checked_in"></span>${t('checked_in')}</li><li><span class="legend-swatch provisional"></span>${t('provisional')}</li><li><span class="legend-swatch blocked"></span>${t('blocked')}</li><li>🔒 ${t('lockedLabel')}</li></ul><p>${t('holdExplanation')}</p><p>${t('colorExplanation')}</p>`);return;
  }
  if(tool==='display'){
    openUtility('displaySettings',`<form id="display-form"><label>${t('windowDays')}<select name="span">${[7,14,30].map(n=>`<option ${calendarSpan===n?'selected':''}>${n}</option>`).join('')}</select></label><label>${t('groupBy')}<select name="group"><option value="product" ${calendarGroup==='product'?'selected':''}>${t('salesGroup')}</option><option value="room" ${calendarGroup==='room'?'selected':''}>${t('physicalRoom')}</option></select></label>${[['source',displaySource,'source'],['balance',displayBalance,'due'],['availability',displayAvailability,'dailyAvailable'],['compact',compactRows,'compactRows']].map(([name,checked,label])=>`<label class="check-label"><input type="checkbox" name="${name}" ${checked?'checked':''}>${t(label)}</label>`).join('')}<button class="primary">${t('apply')}</button></form>`);
    $('#display-form').onsubmit=e=>{e.preventDefault();const f=e.target.elements;calendarSpan=Number(f.span.value);calendarGroup=f.group.value;displaySource=f.source.checked;displayBalance=f.balance.checked;displayAvailability=f.availability.checked;compactRows=f.compact.checked;render();$('#utility-dialog').close();};return;
  }
  if(tool==='bulk'){
    const resources=state.resources.filter(r=>r.propertyId===propertyId);
    openUtility('batchOperations',`<form id="bulk-form"><p class="muted">${t('bulkExplanation')}</p><label>${t('action')}<select name="operation"><option value="dirty">${t('markDirty')}</option><option value="clean">${t('finish')}</option><option value="block">${t('closeRooms')}</option><option value="unblock">${t('openRooms')}</option></select></label><div class="form-row"><label>${t('arrival')}<input type="date" name="start" value="${calendarDate}" required></label><label>${t('departure')}<input type="date" name="end" value="${nextDay(calendarDate)}" required></label></div><p class="muted">${t('bulkDateExplanation')}</p><label>${t('reason')}<input name="reason" maxlength="500"></label><label class="check-label"><input id="bulk-all" type="checkbox">${t('selectAll')}</label><div class="bulk-resources">${resources.map(r=>`<label class="check-label"><input type="checkbox" name="resource" value="${escape(r.id)}">${escape(r.label)} · ${t(r.productId)} · ${t(r.cleaning)}</label>`).join('')}</div><label class="check-label"><input type="checkbox" name="confirmed" required>${t('confirmBulk')}</label><button class="primary" ${can('bulk_clean')?'':'disabled'}>${t('apply')}</button></form>`);
    $('#bulk-all').onchange=e=>$('#bulk-form').querySelectorAll('[name=resource]').forEach(c=>c.checked=e.target.checked);
    $('#bulk-form').onsubmit=async e=>{e.preventDefault();const f=e.target,button=f.querySelector('button'),data=new FormData(f),op=data.get('operation');const command={type:op==='block'?'bulk_block':op==='unblock'?'bulk_unblock':'bulk_clean',resourceIds:data.getAll('resource'),start:data.get('start'),end:data.get('end'),reason:data.get('reason'),cleaning:op};button.disabled=true;try{await commit(command);$('#utility-dialog').close();}catch(err){$('#utility-error').textContent=errorText(err);}finally{button.disabled=!can('bulk_clean');}};
  }
});

// Calendar actions are delegated so changing dates does not discard bindings.
$('#content').addEventListener('click',e=>{
 const cell=e.target.closest('[data-cell]');
 if(cell&&!cell.disabled&&can('create')){$('#new').click();const f=$('#order-form');f.elements.start.value=cell.dataset.day;f.elements.end.value=nextDay(cell.dataset.day);f.elements.productId.value=state.resources.find(r=>r.id===cell.dataset.cell).productId;f.dataset.resourceId=cell.dataset.cell;}
 if(e.target.closest('#export')){
   const rows=[['ID','Guest','Source','Arrival','Departure','Status','Resource','Charge_MYR','NetPaid_MYR','Due_MYR','Deposit_MYR'],...state.orders.filter(o=>o.propertyId===propertyId).map(o=>{const f=folio(o);return[o.id,o.guest,o.source||'direct',o.start,o.end,o.status,o.resourceId||'',f.charge/100,f.paid/100,f.due/100,f.deposit/100];})];
   const csv='\uFEFF'+rows.map(row=>row.map(v=>'"'+String(v).replace(/^[=+@\-]/,"'$&").replaceAll('"','""')+'"').join(',')).join('\r\n');
   const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.download=`JOVIAN-TEST-${propertyId}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
 }
});

for(const [language,values] of Object.entries({
zh:{login:'登录 JOVIAN',username:'账号',password:'密码',loginButton:'登录',logout:'退出登录',refresh:'刷新共享数据',shared:'共享开发模式',sharedFooter:'测试数据库保存 · 未连接生产渠道或门锁',credentials:'账号或密码不正确。',forbidden:'没有此门店或操作的权限。',login_required:'会话已过期，请重新登录。',stale_revision:'其他操作员已更新数据，已刷新，请核对后重新操作。',inventory_conflict:'库存冲突：无法满足分区、同房或连续住宿要求。',rate_limited:'登录尝试过多，请15分钟后重试。',csrf:'会话校验失败，请重新登录。',connection:'服务连接失败，请检查服务后重试。',busy:'正在保存，请稍候。',emptyAccess:'账号未分配门店，请联系管理员。',uncertain:'上次保存结果待确认，请保持原内容重试或核对记录，勿重复录入收付款。',date_range:'住宿或停用日期需有效，且每次不超过366晚。'},
en:{login:'Sign in to JOVIAN',username:'Username',password:'Password',loginButton:'Sign in',logout:'Sign out',refresh:'Refresh shared data',shared:'Shared development mode',sharedFooter:'Test database · No live channels or locks',credentials:'Invalid username or password.',forbidden:'Property or action not permitted.',login_required:'Session expired. Sign in again.',stale_revision:'Another operator updated this property. Refreshed; review and retry.',inventory_conflict:'Inventory constraints cannot be satisfied.',rate_limited:'Too many attempts. Retry in 15 minutes.',csrf:'Session check failed. Sign in again.',connection:'Connection failed. Check the server and retry.',busy:'Saving. Please wait.',emptyAccess:'No assigned property. Contact the administrator.',uncertain:'Previous save is uncertain. Retry unchanged or verify records before recording another payment.',date_range:'Use valid dates, up to 366 nights per operation.'},
ms:{login:'Log masuk JOVIAN',username:'Nama pengguna',password:'Kata laluan',loginButton:'Log masuk',logout:'Log keluar',refresh:'Muat semula data kongsi',shared:'Mod pembangunan berkongsi',sharedFooter:'Pangkalan data ujian · Tiada saluran atau kunci sebenar',credentials:'Nama pengguna atau kata laluan salah.',forbidden:'Hartanah atau tindakan tidak dibenarkan.',login_required:'Sesi tamat. Log masuk semula.',stale_revision:'Data dikemas kini oleh staf lain. Semak dan cuba semula.',inventory_conflict:'Syarat inventori tidak dapat dipenuhi.',rate_limited:'Terlalu banyak cubaan. Cuba selepas 15 minit.',csrf:'Semakan sesi gagal. Log masuk semula.',connection:'Sambungan gagal. Semak pelayan dan cuba semula.',busy:'Sedang menyimpan. Sila tunggu.',emptyAccess:'Tiada hartanah ditetapkan. Hubungi pentadbir.',uncertain:'Simpanan belum pasti. Cuba semula tanpa ubah atau semak rekod sebelum bayaran lain.',date_range:'Gunakan tarikh sah sehingga 366 malam setiap tindakan.'}
}))Object.assign(words[language],values);
function showLogin(){
  document.body.classList.add('auth-pending');
  for(const el of $('#login-dialog').querySelectorAll('[data-t]'))el.textContent=t(el.dataset.t);
  if(!$('#login-dialog').open)$('#login-dialog').showModal();
}
$('#login-language').onchange=e=>{lang=e.target.value;$('#language').value=lang;showLogin();};
$('#login-dialog').addEventListener('cancel',e=>e.preventDefault());
$('#login-form').onsubmit=async e=>{
  e.preventDefault();const button=$('#login-form button');button.disabled=true;
  try{
    await backend.login(e.target.elements.username.value,e.target.elements.password.value);
    e.target.elements.password.value='';
    await refreshShared();$('#login-dialog').close();document.body.classList.remove('auth-pending');$('#login-error').textContent='';showPropertyPicker();
  }catch(error){$('#login-error').textContent=t(error.message)||t('connection');}
  finally{button.disabled=false;}
};
$('#refresh').onclick=async()=>{try{await refreshShared();}catch(e){$('#message').textContent=errorText(e);if(e.status===401)showLogin();}};
$('#logout').onclick=async()=>{try{await backend.logout();state=seed();$('#detail-dialog').close();$('#order-dialog').close();$('#property-dialog').close();$('#utility-dialog').close();showLogin();}catch(e){$('#message').textContent=errorText(e);}};
for(const [language,values] of Object.entries({
 zh:{'':'使用默认色',all:'全部',tripcom:'Trip.com',previous:'上一段',next:'下一段',singleDay:'单日房态',quickOrder:'快速下单',orderBox:'待分房订单盒子',displaySettings:'显示设置',legend:'图例说明',batchOperations:'批量清洁／开关房',viewStart:'日历开始日期',backToBusiness:'回到营业日期',calendarSearch:'姓名、邮箱、手机、订单号、备注',filters:'筛选',resetFilters:'重置筛选',salesGroup:'销售分组',dailyAvailable:'当晚空余（房／床）',sharedOccupied:'共用空间已占',noMatchingResources:'没有符合筛选的房间或床位。',holdExplanation:'未人工分配的订单已占用内部预留容量，以虚线显示；不是额外可售库存。',stayInfo:'住宿信息',nights:'晚',email:'邮箱',phone:'手机号码',country:'国家／地区',guestLanguage:'客人语言',channelOrderId:'渠道订单号（手工参考）',channelNotes:'渠道备注（手工记录）',specialColor:'订单特殊色',peach:'浅橙',blue:'浅蓝',green:'浅绿',violet:'浅紫',createdAt:'创建时间',createdBy:'操作员',lockRoom:'锁定房间',unlockRoom:'解锁房间',billInfo:'账单信息',channelInfo:'渠道信息',print:'打印当前标签',billExplanation:'住宿费用、净实收和押金分别核算。这里是测试收付记录，未连接银行或会计总账；取消不自动退款。',auditLimit:'仅显示本账号可见的最近500条门店记录中与此单有关的操作；换房操作记录不代表按日期分段库存。',channelNotConnected:'尚未接通渠道。来源、渠道号和备注均为本系统记录，不表示已同步或收到OTA款项。',legendExplanation:'以下为JOVIAN当前图例；SmartOrder完整图例尚未验证。订单状态以文字和边框标识，底色可另行指定。',colorExplanation:'订单特殊色只用于标记，不改变入住、付款或库存状态。',windowDays:'显示天数',groupBy:'分组方式',physicalRoom:'物理房间',compactRows:'紧凑行高',bulkExplanation:'仅修改勾选的测试房床，整批成功或整批回退。存在在住客人时拒绝清洁变更及关房，不会挤掉已分配预订。',bulkDateExplanation:'日期区间只用于开关房；结束日期不包含在内。置脏净修改的是当前清洁状态。',markDirty:'置脏',closeRooms:'停用房床',openRooms:'开放所选日期',selectAll:'选择本店全部房床',confirmBulk:'确认执行所选测试操作',bulk_clean:'批量置脏净',bulk_block:'批量停用',bulk_unblock:'批量开放'},
 en:{'':'Default color',all:'All',tripcom:'Trip.com',previous:'Previous',next:'Next',singleDay:'Single day',quickOrder:'Quick reservation',orderBox:'Unassigned reservations',displaySettings:'Display settings',legend:'Legend',batchOperations:'Bulk cleaning / blocks',viewStart:'Calendar starts',backToBusiness:'Business date',calendarSearch:'Name, email, phone, reference or notes',filters:'Filters',resetFilters:'Reset filters',salesGroup:'Sales group',dailyAvailable:'Free tonight (rooms / beds)',sharedOccupied:'Shared space occupied',noMatchingResources:'No matching rooms or beds.',holdExplanation:'Unassigned reservations already consume internal capacity. Dashed holds are not extra availability.',stayInfo:'Accommodation',nights:'nights',email:'Email',phone:'Phone',country:'Country / region',guestLanguage:'Guest language',channelOrderId:'Channel reference (manual)',channelNotes:'Channel notes (manual)',specialColor:'Reservation color',peach:'Peach',blue:'Blue',green:'Green',violet:'Violet',createdAt:'Created',createdBy:'Operator',lockRoom:'Lock room',unlockRoom:'Unlock room',billInfo:'Billing',channelInfo:'Channel information',print:'Print current tab',billExplanation:'Accommodation, net payments and deposits are separate. Test records only; no banking or general ledger connection. Cancellation does not refund automatically.',auditLimit:'Related entries from the latest 500 property events visible to this account. Move logs do not represent dated allocation segments.',channelNotConnected:'No channel connection. Source, reference and notes are local records, not proof of synchronization or OTA settlement.',legendExplanation:'Current JOVIAN legend. SmartOrder’s full legend is unverified. Text and borders indicate state; the fill may be customized.',colorExplanation:'Custom color does not change occupancy, payment or inventory state.',windowDays:'Visible days',groupBy:'Group by',physicalRoom:'Physical room',compactRows:'Compact rows',bulkExplanation:'Selected test units only. All changes commit or roll back together. In-house units reject cleaning changes and blocks; fixed reservations are never displaced.',bulkDateExplanation:'Dates apply only to blocks / releases, excluding the end date. Cleaning changes the current state.',markDirty:'Mark dirty',closeRooms:'Block units',openRooms:'Release selected dates',selectAll:'Select all property units',confirmBulk:'Confirm selected test action',bulk_clean:'Bulk cleaning',bulk_block:'Bulk block',bulk_unblock:'Bulk release'},
 ms:{'':'Warna lalai',all:'Semua',tripcom:'Trip.com',previous:'Sebelumnya',next:'Seterusnya',singleDay:'Satu hari',quickOrder:'Tempahan pantas',orderBox:'Tempahan belum ditetapkan',displaySettings:'Tetapan paparan',legend:'Petunjuk',batchOperations:'Pembersihan / sekatan pukal',viewStart:'Mula kalendar',backToBusiness:'Tarikh operasi',calendarSearch:'Nama, e-mel, telefon, rujukan atau nota',filters:'Penapis',resetFilters:'Tetap semula penapis',salesGroup:'Kumpulan jualan',dailyAvailable:'Kosong malam ini (bilik / katil)',sharedOccupied:'Ruang kongsi diduduki',noMatchingResources:'Tiada bilik atau katil sepadan.',holdExplanation:'Tempahan belum ditetapkan telah menggunakan kapasiti dalaman. Pegangan putus bukan kapasiti tambahan.',stayInfo:'Maklumat penginapan',nights:'malam',email:'E-mel',phone:'Telefon',country:'Negara / wilayah',guestLanguage:'Bahasa tetamu',channelOrderId:'Rujukan saluran (manual)',channelNotes:'Nota saluran (manual)',specialColor:'Warna tempahan',peach:'Pic',blue:'Biru',green:'Hijau',violet:'Ungu',createdAt:'Dicipta',createdBy:'Pengendali',lockRoom:'Kunci bilik',unlockRoom:'Buka kunci bilik',billInfo:'Maklumat bil',channelInfo:'Maklumat saluran',print:'Cetak tab semasa',billExplanation:'Caj, bayaran bersih dan deposit diasingkan. Rekod ujian sahaja; tiada sambungan bank atau lejar am. Pembatalan tidak memulangkan wang secara automatik.',auditLimit:'Rekod berkaitan daripada 500 aktiviti hartanah terkini yang boleh dilihat akaun ini. Log pindah bukan segmen penetapan bertarikh.',channelNotConnected:'Tiada sambungan saluran. Sumber, rujukan dan nota ialah rekod setempat, bukan bukti penyegerakan atau penyelesaian OTA.',legendExplanation:'Petunjuk JOVIAN semasa. Petunjuk penuh SmartOrder belum disahkan. Teks dan sempadan menunjukkan status; warna latar boleh diubah.',colorExplanation:'Warna khas tidak mengubah status penginapan, bayaran atau inventori.',windowDays:'Bilangan hari',groupBy:'Kumpul mengikut',physicalRoom:'Bilik fizikal',compactRows:'Baris padat',bulkExplanation:'Unit ujian dipilih sahaja. Semua perubahan berjaya atau dibatalkan bersama. Unit yang diduduki menolak perubahan pembersihan dan sekatan; tempahan tetap tidak dipindah.',bulkDateExplanation:'Tarikh hanya untuk sekatan / pelepasan, tidak termasuk tarikh akhir. Pembersihan mengubah keadaan semasa.',markDirty:'Tanda kotor',closeRooms:'Sekat unit',openRooms:'Buka tarikh dipilih',selectAll:'Pilih semua unit hartanah',confirmBulk:'Sahkan tindakan ujian dipilih',bulk_clean:'Pembersihan pukal',bulk_block:'Sekatan pukal',bulk_unblock:'Pelepasan pukal'}
}))Object.assign(words[language],values);
async function boot(){
  try{
    await backend.connect();
    if(backend.shared){
      for(const language of Object.keys(words)){words[language].local=words[language].shared;words[language].footer=words[language].sharedFooter;}
      if(!backend.user){showLogin();return;}
      await refreshShared();document.body.classList.remove('auth-pending');showPropertyPicker();
    }else{
      try{const saved=JSON.parse(localStorage.getItem(key));if(saved?.version===1&&Array.isArray(saved.audit)){saved.properties.forEach(p=>preview(saved,p.id));state=saved;}}catch{}
      render();document.body.classList.remove('auth-pending');showPropertyPicker();
    }
  }catch(e){$('#message').textContent=t('connection');document.body.classList.remove('auth-pending');}
}
await boot();
