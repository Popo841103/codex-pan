import {defaultComparisonPeriods} from '../src/financial-reports.js';
import {rateAvailability} from '../src/rate-availability.js';
import {previewCancellation} from '../src/cancellation-policy.js';
import {rateCalendar} from './rate-calendar.js';
import {countryOptions,languageOptions} from './guest-locales.js';
import {financialPage,financialWords,renderFolioHistory,comparisonPage,managerReportPage,guestLedgerPage,roomChargePage,roomBusinessPage,roomMovementPage,extraChargePage,cancellationPenaltyPage,roomOccupantPage,registrationRecordPage,commissionPage,arLedgerPage,arPostForm,arReportsPage,commissionPeriodPanel} from './financial-ui.js';
import {filterOrders,orderTabs} from '../src/order-filters.js';
import {settlementStatus,columns,columnsWords,defaultColumns,loadColumns,saveColumns,columnLabel,renderOrderTable} from './order-columns.js';
import {icon,shellWords,navigation,customersPage,channelsPage,nightAuditWords,nightAuditPage,handoverWindow,teamAccessPage,teamWords,propertySitePage,siteWords,bookingRequestsPage,requestWords,notificationsPage,noticeWords,dataMaintenancePage,cleanupWords} from './workspace-ui.js';
import {checkinWords,createCheckinAdmin} from './checkin-admin-ui.js';
import {communicationWords,createCommunications} from './communication-ui.js';
import { isBoxed, blockType, inventoryState } from '../src/inventory-actions.js';
import { calendarActionWords, bindCalendarActions } from './calendar-actions.js';
import { Backend } from './backend.js';
import { seed, apply, preview, folio } from '../src/demo-store.js';
import { upgradeCatalog, saleResources, typeName } from '../src/catalog.js';
import { catalogWords, catalogPage, bindCatalog } from './catalog-ui.js';
import { dashboardWords, dashboardPage, shortcuts } from './dashboard-ui.js';
import { dashboard, queueOrders, localDay } from '../src/dashboard.js';
import { reservationSummary } from '../src/reservations.js';
import { reservationWords, createComposer } from './reservation-ui.js';
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
let calendarInteractions,communications,selfCheckinUI;
function leaveDialogs(){if(communications?.isBusy()||selfCheckinUI?.isBusy())return false;return (selfCheckinUI?.leave()??true)&&(communications?.leave()??true);}
const key = 'cohub-pms-demo-v1';
let state = seed(), lang = 'zh', propertyId = 'TEST-KL', view = 'home';

const sourceValues=['direct','walkin','booking','airbnb','agoda','tripcom','expedia','traveloka','tiket','bookingengine','chinesesite','rednote','neppan','hostelworld','tujia','vrbo','xiaozhu','temairazu','rakuten','klook','other'];
let calendarGroupsCollapsed=false;
let customerQuery='',channelProvider=null,channelProperty='',navigationCollapsed=false;
let calendarDate='2027-01-10', calendarStatus='all', calendarSource='all';
let displaySource=true, displayBalance=true, displayAvailability=true, compactRows=false;
let calendarSpan=30, calendarProduct='all', calendarGender='all', calendarRoomType='all', calendarQuery='', calendarGroup='product';
const $ = s => document.querySelector(s);
const t = k => words[lang][k] || k;
const escape = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const opts = (values, selected) => values.map(v => `<option value="${escape(v)}" ${selected===v?'selected':''}>${escape(t(v))}</option>`).join('');
const businessDate = () => $('#date').value;
const nextDay = d => new Date(Date.parse(`${d}T00:00:00Z`)+86400000).toISOString().slice(0,10);
function errorText(error) { const map = { dirty:'dirtyError', date:'dateError', guest:'guestError', amount:'amountError', refund:'refundError' }; return t(map[error.message] || (words[lang][error.message] ? error.message : 'conflict')); }
async function refreshShared(){
  state=await backend.state();
  // The catalog page hides its create-property panel for a trial account; the server
  // refuses the command for that origin anyway, so this is display only.
  try{window.__pmsUserOrigin=backend.user?.origin||'staff';}catch{}
  // A fresh installation has no property at all. That is a state to show, not an
  // access failure: throwing here would leave the administrator unable to reach the
  // control that creates the first property.
  if(!state.properties.length){
    propertyId=null;
    if(state.noPropertyYet&&backend.user&&backend.user.role==='admin'){view='resourcesSettings';}
    else throw new Error('emptyAccess');
  }else if(!state.properties.some(p=>p.id===propertyId))propertyId=state.properties[0]?.id;
  render();
}
// Shared mode returns one merged state for every authorized property, so business-day data is per property.
function nightAuditState(){
  return {...state, businessDate:(state.businessDates?state.businessDates[propertyId]:state.businessDate)??null,
    orders:(state.orders||[]).filter(o=>o.propertyId===propertyId),
    nightAudits:(state.nightAudits||[]).filter(a=>a.propertyId===propertyId),
    shiftTypes:(state.shiftTypes||[]).filter(s=>s.propertyId===propertyId),
    handovers:(state.handovers||[]).filter(h=>h.propertyId===propertyId)};
}
async function commit(command) {
  if(writing)throw new Error('busy');
  writing=true;let savedResult;
  try{
    if(backend.shared){
      if(!backend.user)throw new Error('login_required');
      // A transport retry reuses this exact request key; never blindly create a second payment.
      // An explicit date in the command wins; the work date is only a default.
      const payload={propertyId,date:businessDate(),...command}, fingerprint=JSON.stringify(payload);
      if(pendingMutation&&pendingMutation.fingerprint!==fingerprint)throw new Error('uncertain');
      pendingMutation??={key:crypto.randomUUID(),revision:state.revisions[propertyId],fingerprint};
      const {key,revision}=pendingMutation;
      let result;
      try{result=await backend.execute(payload,revision,key);}
      catch(e){
        if(e instanceof TypeError)result=await backend.execute(payload,revision,key);
        else{if(e.status)pendingMutation=null;throw e;}
      }
      savedResult=result;await refreshShared();pendingMutation=null;
    }else{
      const commandId=crypto.randomUUID();const updated=apply(state,{propertyId,id:commandId,at:new Date().toISOString(),date:businessDate(),...command});savedResult={id:commandId};
      try{localStorage.setItem(key,JSON.stringify(updated));}catch{throw new Error('storage');}
      state=updated;render();
    }
    $('#message').textContent=t('saved');return savedResult;
  }catch(e){
    if(e.status)pendingMutation=null;
    if(backend.shared && e.message==='stale_revision')await refreshShared();
    if(e.status===401){backend.user=null;showLogin();}
    throw e;
  }finally{writing=false;}
}

function can(action){if(!backend.shared)return true;const scoped=backend.user?.allowedActionsByProperty?.[propertyId];return !!(scoped||backend.user?.allowedActions||[]).includes(action);}
function button(action, id, label) { return `<button ${action!=='details'&&!can(action==='release-unit'?'bulk_unblock':action)?'disabled':''} data-action="${action}" data-id="${escape(id)}">${escape(t(label||action))}</button>`; }
function render() {
  state=upgradeCatalog(state);
  $('#session-label').textContent=backend.shared ? (backend.user ? backend.user.username+' · '+backend.user.role : t('login')) : t('local');
  $('#new').disabled=!can('create_reservation');
  $('#guest-messages').disabled=!can('guest_read');
  $('#self-checkin').disabled=!can('sc_read');
  calendarInteractions?.reset();
  document.body.dataset.view=view;
  $('#logout').hidden=!backend.user;
  $('#refresh').hidden=!backend.user;$('#refresh').title=t('refresh');$('#refresh').setAttribute('aria-label',t('refresh'));
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-t]').forEach(el => el.textContent = t(el.dataset.t));
  $('#title').textContent = t(view);
  const menu=navigation(view,t);$('#nav').innerHTML=menu.side;$('#global-nav').innerHTML=menu.main;
  document.body.classList.toggle('navigation-collapsed',navigationCollapsed);
  $('#collapse-navigation').setAttribute('aria-expanded',String(!navigationCollapsed));
  $('#collapse-navigation [data-t]').textContent=t(navigationCollapsed?'expandNavigation':'collapseNavigation');
  document.querySelectorAll('[data-ui-icon]').forEach(node=>{if(!node.querySelector('svg'))node.insertAdjacentHTML('afterbegin',icon(node.dataset.uiIcon));if(node.tagName==='BUTTON'){node.title=node.textContent.trim();node.setAttribute('aria-label',node.title);}});
  $('#new').title=t('new');$('#new').setAttribute('aria-label',t('new'));
  $('#property').innerHTML = state.properties.map(p=>`<option value="${p.id}" ${p.id===propertyId?'selected':''}>${p.name}</option>`).join('');
  $('#product').innerHTML = opts(['room','bed','suite'], $('#product').value);
  $('#gender').innerHTML = opts(['any','female','male'], $('#gender').value);
  updateOrderTypes();
  const source=$('#order-form [name=source]');if(source)source.innerHTML=opts(sourceValues,source.value);
  const date = businessDate();
  // A freshly created property has nothing to plan for, and an administrator with no
  // property at all has no scope to plan in. Both must render, not throw: the empty
  // property is exactly the page where the operator types their own rooms.
  const noScope = !propertyId || !state.properties.some(p=>p.id===propertyId);
  const resources = noScope ? [] : saleResources(state,propertyId).sort((a,b)=>a.sortOrder-b.sortOrder||a.label.localeCompare(b.label,undefined,{numeric:true}));
  const orders = state.orders.filter(o=>o.propertyId===propertyId);
  const plan = noScope ? [] : preview(state,propertyId);
  const active = plan.filter(p=>p.start<=date && p.end>date);
  const blocked = state.blocks.filter(b=>b.propertyId===propertyId && b.start<=date && b.end>date);
  const available = resources.filter(r=>!active.some(p=>p.atoms.some(a=>r.atoms.includes(a))) && !blocked.some(b=>b.atoms.some(a=>r.atoms.includes(a)))).length;
  const stat = (label,n,sub) => `<div class="stat"><span>${t(label)}</span><strong>${n}</strong><small>${escape(sub)}</small></div>`;
  const stats = `<div class="stats">${stat('total',resources.length,t('salesAlternatives'))}${stat('booked',active.length,date)}${stat('available',available,t('salesAlternatives'))}${stat('unassigned',orders.filter(o=>o.status==='confirmed'&&!isBoxed(o)&&!o.resourceId).length,t('allocation'))}</div>`;
  if(view==='home') { const scoped=nightAuditState();$('#content').innerHTML=dashboardPage(state,propertyId,date,lang,t,currency,can,{items:homeShortcuts(),memoText:memoDrafts.get(propertyId),businessDate:scoped.businessDate,lastAudit:(scoped.nightAudits||[]).slice().sort((a,b)=>b.at.localeCompare(a.at))[0]||null}); }
  else if(['business','cashflow','comparison','managerDaily','guestLedger','roomCharge','roomBusiness','roomMovement','extraCharge','cancellation','occupants','registration','commission','arLedger','arReports'].includes(view)) { $('#content').innerHTML=financialSummary(view); }
  else if(view==='nightAudit') { $('#content').innerHTML=nightAuditPage(nightAuditState(),propertyId,{t,escape,currency,can,lang}); }
  else if(view==='customers') { $('#content').innerHTML=customersPage(state,propertyId,t,escape,customerQuery); }
  else if(view==='channels') { $('#content').innerHTML=channelsPage(t,escape,channelProperty===propertyId?channelProvider:null,can)+`<button data-rates-open>${rateLabel('房价管理','Rate management','Pengurusan kadar')}</button>`; }
  else if(view==='resourcesSettings') { $('#content').innerHTML=catalogPage(state,propertyId,lang,t,can); }
  else if(view==='teamAccess') { $('#content').innerHTML=teamAccessPage({members:state.members||[],memberAudit:state.memberAudit||[],properties:state.properties,propertyId,user:backend.user,can,t,escape,roles:state.roles||[]}); }
  else if(view==='propertySite') { $('#content').innerHTML=propertySitePage({sites:state.sites||[],siteAudit:state.siteAudit||[],roomTypes:state.roomTypes,ratePlans:state.ratePlans,propertyId,can,t,escape}); }
   else if(view==='notifications') { $('#content').innerHTML=notificationsPage({notifications:state.notifications||[],noticeSettings:state.noticeSettings||[],noticeSettingsAudit:state.noticeSettingsAudit||[],noticeRules:state.noticeRules||[],noticeRulesAudit:state.noticeRulesAudit||[],properties:state.properties,propertyId,can,t,escape}); }
 else if(view==='bookingRequests') { $('#content').innerHTML=bookingRequestsPage({requests:state.bookingRequests||[],events:state.bookingRequestEvents||[],roomTypes:state.roomTypes,propertyId,can,t,escape,currency}); }
 else if(view==='dataCleanup') { $('#content').innerHTML=dataMaintenancePage({orders:state.orders,reservations:state.reservations||[],propertyId,can,t,escape}); }
  else if(view==='rates'){const from=ratePageDates.get(propertyId)||businessDate();$('#content').innerHTML='<section class="panel"><p>'+rateLabel('可售量按每日及房型独立计算，整套与床位不能相加；跨日连续库存以提交校验为准。','Availability is per day and type; suites and beds cannot be added together. Continuous stays are validated on submission.','Ketersediaan mengikut hari dan jenis; suite dan katil tidak boleh dijumlah. Penginapan berterusan disemak semasa hantar.')+'</p><div class="panel-head"><h2>'+t('rateInventory')+'</h2><button data-rates-open>'+rateLabel('批量更新与计划管理','Bulk updates and plans','Kemas kini pukal dan pelan')+'</button></div><label>'+rateLabel('日历开始日期','Calendar start','Tarikh mula kalendar')+'<input id="rate-page-date" type="date" value="'+escape(from)+'" required></label>'+rateCalendar(state,{propertyId,start:from,currency,t,availability:(id,day)=>rateAvailability(state,propertyId,id,day,businessDate())})+'</section>';}
  else if(view==='calendar') { $('#content').innerHTML = calendar(resources,orders,plan,calendarDate); } else if(view==='overview' || view==='tasks') {
    $('#content').innerHTML = (view==='overview'?stats:'') + ['room','bed','suite'].map(product=>`<section class="panel"><div class="panel-head"><h2>${t(product==='room'?'rooms':product==='bed'?'beds':'suite')}</h2><span class="muted">${resources.filter(r=>r.productId===product).length} ${t(product)}</span></div><div class="grid">${resources.filter(r=>r.productId===product).map(r=>{
      const b = blocked.find(b=>b.atoms.some(a=>r.atoms.includes(a)));
      const busy = active.some(p=>p.atoms.some(a=>r.atoms.includes(a))); 
      const status = b?'blocked':r.cleaning==='dirty'?'dirty':busy?'busy':'free';
      const control = view==='tasks' ? (r.cleaning==='dirty'?button('clean',r.id,'finish'):'') + (b?button('release-unit',r.id,'unblock'):button('block',r.id,'block')) : '';
      return `<div class="resource ${status}"><strong>${escape(r.label)}</strong><small>${t(r.gender)}</small><span class="badge ${status==='dirty'?'warn':''}">${t(status)}</span><div>${control}</div></div>`;
    }).join('')}</div></section>`).join('');
  } else if(view==='orders') {
    $('#content').innerHTML=reservationList();
  } else {
    $('#content').innerHTML = `<section class="panel"><h2>${t('audit')}</h2><div class="table-wrap"><table><thead><tr><th>${t('time')}</th><th>${t('action')}</th><th>ID</th></tr></thead><tbody>${state.audit.filter(a=>a.propertyId===propertyId).map(a=>`<tr><td>${escape(new Date(a.at).toLocaleString(lang==='zh'?'zh-CN':lang==='ms'?'ms-MY':'en-GB',{timeZone:'Asia/Kuala_Lumpur'}))}</td><td>${t(a.type==='clean'?'cleanAction':a.type==='block'?'blockAction':a.type)}</td><td>${escape((a.orderId||a.resourceId||a.id).slice(0,20))}<small>${escape(a.actor||'')}</small></td></tr>`).join('')}</tbody></table></div><p class="muted">${t('footer')}</p></section>`;
  }
  updateBell();
}
const extraFields = document.createElement('div');
extraFields.innerHTML = `<div class="form-row"><label><span data-t="nightly"></span><input name="nightly" type="number" min="0" max="1000000" step="0.01" value="0" required></label><label><span data-t="source"></span><select name="source">${opts(sourceValues)}</select></label></div><div class="form-row"><label><span data-t="email"></span><input name="email" type="email" maxlength="254"></label><label><span data-t="phone"></span><input name="phone" maxlength="40"></label></div><label><span data-t="notes"></span><textarea name="notes" maxlength="2048"></textarea></label>`;
$('#order-form .muted').before(extraFields);
const roomTypeField=document.createElement('label');
roomTypeField.innerHTML='<span data-t="selectType"></span><select name="roomTypeId" id="order-room-type" required></select>';
$('#order-form .form-row').after(roomTypeField);
function updateOrderTypes(selected){
  const picker=$('#order-room-type');if(!picker)return;
  const current=selected??picker.value;
  picker.innerHTML=state.roomTypes.filter(type=>type.propertyId===propertyId&&type.productId===$('#product').value&&saleResources(state,propertyId).some(r=>r.roomTypeId===type.id)).map(type=>`<option value="${escape(type.id)}" ${type.id===current?'selected':''}>${escape(typeName(type,lang,t(type.productId)+' · '+t(type.gender)))}</option>`).join('');
  const type=state.roomTypes.find(type=>type.id===picker.value);
  if(type?.gender!=='any'&&type)$('#gender').value=type.gender;
}
$('#product').onchange=()=>{delete $('#order-form').dataset.resourceId;updateOrderTypes();};
$('#order-room-type').onchange=()=>{const resource=state.resources.find(r=>r.id===$('#order-form').dataset.resourceId);if(resource&&resource.roomTypeId!==$('#order-room-type').value)delete $('#order-form').dataset.resourceId;updateOrderTypes();};
$('.header-brand').onclick=e=>{e.preventDefault();view='home';render();};
function goView(next){if(!leaveDialogs())return;view=next;render();if(view==='channels')loadChannelStatus();}
$('#global-nav').onclick=e=>{const b=e.target.closest('[data-view]');if(b)goView(b.dataset.view);};
$('#nav').onclick=e=>{const b=e.target.closest('[data-view]');if(b)goView(b.dataset.view);};
$('#collapse-navigation').onclick=()=>{navigationCollapsed=!navigationCollapsed;render();};
async function loadChannelStatus(){const pid=propertyId;if(!backend.shared||!can('guest_read'))return;try{const data=await backend.communications('guest-messages',pid);if(propertyId!==pid)return;channelProvider=data.provider;channelProperty=pid;if(view==='channels')render();}catch(error){if(propertyId===pid)$('#message').textContent=errorText(error);}}
$('#content').addEventListener('click',async e=>{
  if(e.target.closest('#new-property-save')){
    const name=($('#new-property-name')?.value||'').trim();
    const code=($('#new-property-id')?.value||'').trim();
    // The code becomes an internal identifier and part of the public web address, so it
    // is checked here before it is sent and can never be edited afterwards.
    if(!name||!/^[A-Za-z0-9_-]{2,40}$/.test(code)){$('#message').textContent=t('property_input');return;}
    try{
      await backend.execute({type:'property_create',propertyId:code,newPropertyId:code,name},0,crypto.randomUUID());
      propertyId=code;view='resourcesSettings';
      await refreshShared();
      $('#message').textContent=t('saved');
    }catch(error){$('#message').textContent=errorText(error);}
    return;
  }
  if(e.target.closest('#business-date-save')){
    const value=$('#business-date-init')?.value;
    if(!/^\d{4}-\d{2}-\d{2}$/.test(value||'')){$('#message').textContent=t('dateError');return;}
    try{await commit({type:'business_date_init',date:value});}catch(error){$('#message').textContent=errorText(error);}return;
  }
  if(e.target.closest('#night-audit-run')){
    // The reason box is only rendered while required exceptions remain, so it decides the forced flag.
    const forced=Boolean($('#audit-reason')),reason=$('#audit-reason')?.value||'';
    try{await commit({type:'night_audit',force:forced,reason});}catch(error){$('#message').textContent=errorText(error);}return;
  }
  if(e.target.closest('#shift-save')){
    const name=$('#shift-name')?.value.trim()||'';
    if(!name){$('#message').textContent=t('guestError');return;}
    try{await commit({type:'shift_save',name,start:$('#shift-start').value,end:$('#shift-end').value});}
    catch(error){$('#message').textContent=errorText(error);}return;
  }
  const cashApprove=e.target.closest('[data-cash-approve]');
  if(cashApprove){
    const id=cashApprove.dataset.cashApprove;
    if(!window.confirm(t('cashApproveConfirm')))return;
    try{await commit({type:'cash_variance_approve',handoverId:id,reason:$('#cash-reason-'+id)?.value||''});}
    catch(error){$('#message').textContent=errorText(error);}return;
  }
  const drop=e.target.closest('[data-night-audit="shift-delete"]');
  if(drop){try{await commit({type:'shift_delete',shiftId:drop.dataset.shift});}catch(error){$('#message').textContent=errorText(error);}return;}
  if(e.target.closest('#handover-run')){
    const shiftId=$('#handover-shift')?.value,current=nightAuditState(),shift=current.shiftTypes.find(s=>s.id===shiftId);
    if(!shift||!current.businessDate){$('#message').textContent=t('shift_window');return;}
    const {from,to}=handoverWindow(current.businessDate,shift);
    const cashRaw=String($('#handover-cash')?.value??'').trim();
    const command={type:'shift_handover',shiftTypeId:shiftId,from,to,note:$('#handover-note')?.value||''};
    if(cashRaw!==''){
      if(!/^\d+(\.\d{1,2})?$/.test(cashRaw)){$('#message').textContent=t('cash_count');return;}
      command.countedCash=toMinor(cashRaw);
    }
    try{await commit(command);}
    catch(error){$('#message').textContent=errorText(error);}return;
  }
});
$('#content').addEventListener('click',e=>{if(e.target.closest('#channel-refresh'))loadChannelStatus();if(e.target.closest('#channel-messages'))$('#guest-messages').click();});
$('#content').addEventListener('change',e=>{if(e.target.id==='customer-query'){customerQuery=e.target.value;render();}});
$('#language').onchange=e=>{if(!leaveDialogs()){e.target.value=lang;$('#message').textContent=t('busy');return;}lang=e.target.value;$('#message').textContent='';render();};
function switchProperty(id){
  // Choosing a property in the picker is a plain choice, not a save: the picker is
  // closing on its own, so nothing in it can be lost by switching.
  $('#property-dialog').close();
  if(!leaveDialogs()){$('#message').textContent=t('busy');return false;}
  if(composer.isOpen()){$('#message').textContent=t('draftOpen');return false;}
  if(writing||pendingMutation){$('#message').textContent=t('uncertain');return false;}
  if(!state.properties.some(p=>p.id===id))return false;
  propertyId=id;view='home';calendarQuery='';calendarProduct='all';calendarGender='all';calendarRoomType='all';calendarStatus='all';calendarSource='all';
  $('#utility-dialog').close();$('#order-dialog').close();$('#detail-dialog').close();$('#message').textContent='';render();return true;
}
// The select itself is re-rendered on every render, so the listener has to survive it:
// without that the property chosen in the switch never reaches switchProperty().
document.addEventListener('change',e=>{if(e.target.id==='property')if(!switchProperty(e.target.value))render();});
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
$('#date').onchange=()=>{if(!$('#date').value)$('#date').value=localDay(new Date().toISOString());calendarDate=businessDate();render();};
$('#new').onclick=()=>composer.open();
$('#close').onclick=()=>$('#order-dialog').close();
$('#order-form').onsubmit=async e=>{e.preventDefault();try{await commit({type:'create',...Object.fromEntries(new FormData(e.target)),nightly:toMinor(e.target.elements.nightly.value),resourceId:e.target.dataset.resourceId||null});$('#order-dialog').close();}catch(error){$('#form-error').textContent=errorText(error);}};
$('#content').onclick=async e=>{
  const b=e.target.closest('[data-action]');if(!b)return;
  const {action:type,id}=b.dataset;if(type==='details'){openDetail(id);return;}if(['release-unit','block'].includes(type)){try{calendarInteractions[type==='block'?'block':'release']({resourceId:id,start:businessDate(),end:nextDay(businessDate())});}catch(error){$('#message').textContent=errorText(error);}return;}let command={type};
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
  const eligible=resources.filter(r=>(calendarProduct==='all'||r.productId===calendarProduct)&&(calendarGender==='all'||r.gender===calendarGender)&&(calendarRoomType==='all'||r.roomTypeId===calendarRoomType));
  const groupOf=r=>calendarGroup==='room'?(r.roomId||r.id):(r.roomTypeId||r.productId+'-'+r.gender);
  const labelOf=r=>calendarGroup==='room'?(state.physicalRooms?.find(room=>room.id===r.roomId)?.label||r.label):typeName(state.roomTypes?.find(type=>type.id===r.roomTypeId),lang,r.roomTypeName||t(r.productId)+' · '+t(r.gender));
  const visible=eligible.filter(r=>!calendarQuery&&calendarStatus==='all'&&calendarSource==='all'||orders.some(o=>matches(o)&&plan.some(p=>p.demandId===o.id&&p.resourceId===r.id))||calendarStatus==='all'&&calendarSource==='all'&&r.label.toLowerCase().includes(calendarQuery.toLowerCase())).sort((a,b)=>(state.roomTypes?.find(t=>t.id===a.roomTypeId)?.sortOrder||0)-(state.roomTypes?.find(t=>t.id===b.roomTypeId)?.sortOrder||0)||groupOf(a).localeCompare(groupOf(b),undefined,{numeric:true})||a.sortOrder-b.sortOrder||a.label.localeCompare(b.label,undefined,{numeric:true}));
  const queue=orders.filter(o=>o.status==='confirmed'&&!isBoxed(o)&&!o.resourceId&&matches(o)&&(calendarProduct==='all'||o.productId===calendarProduct)&&(calendarGender==='all'||o.gender===calendarGender)&&(calendarRoomType==='all'||o.roomTypeId===calendarRoomType));
  const select=(id,title,values,current)=>`<label class="compact-label">${t(title)}<select id="${id}">${values.map(v=>`<option value="${v}" ${v===current?'selected':''}>${t(v)}</option>`).join('')}</select></label>`;
  const collapsed=typeof calendarGroupsCollapsed==='boolean'&&calendarGroupsCollapsed;
  const groupCounts=new Map();visible.forEach(r=>groupCounts.set(groupOf(r),(groupCounts.get(groupOf(r))||0)+1));
  let lastGroup=null;
  const rows=visible.map(r=>{
    const group=groupOf(r), heading=lastGroup!==group?`<th class="type-cell" rowspan="${groupCounts.get(group)}" scope="rowgroup">${escape(labelOf(r))}</th>`:'';lastGroup=group;
    if(collapsed)return heading?`<tr class="collapsed-calendar-group">${heading.replace(/rowspan="[0-9]+"/,'rowspan="1"')}<th class="unit-cell">${groupCounts.get(group)}</th><td colspan="${days.length}"><button data-collapse-rooms>${t('openGroups')}</button></td></tr>`:'';
    let cells='';
    for(let i=0;i<days.length;){
      const d=days[i],reservation=plan.find(p=>p.resourceId===r.id&&p.start<=d&&p.end>d);
      const order=orders.find(o=>o.id===reservation?.demandId);
      const block=state.blocks.find(b=>b.propertyId===propertyId&&b.start<=d&&b.end>d&&b.atoms.some(a=>r.atoms.includes(a)));
      // A sibling resource can share atoms with this row (whole dorm vs a bed).
      const shared=!order&&plan.some(p=>p.start<=d&&p.end>d&&p.atoms.some(a=>r.atoms.includes(a)));
      if(order){
        let span=1;while(i+span<days.length&&days[i+span]<reservation.end)span++;
        cells+=`<td colspan="${span}"><button class="calendar-booking ${order.resourceId?'':'provisional'} ${order.status} color-${escape(order.color||'default')}" data-action="details" data-id="${escape(order.id)}" title="${escape(order.guest+' · '+order.start+' → '+order.end+' · '+t(order.status))}"><strong>${order.start<date?'◀ ':''}${escape(order.guest)} ${order.locked?'🔒':''}</strong><small>${displaySource?escape(t(order.source||'direct')):''}${order.end>nextDay(days.at(-1))?' ▶':''}</small>${displayBalance&&folio(order).due>0?`<span class="booking-balance" title="${escape(t('due')+': '+currency(folio(order).due))}">●<span class="sr-only">${currency(folio(order).due)}</span></span>`:''}</button></td>`;i+=span;
      }else if(block||shared){cells+=block?`<td class="calendar-block"><button class="calendar-block-button block-${blockType(block)}" data-block-cell="${escape(r.id)}" data-day="${d}" title="${escape(block.reason||t(blockType(block)))}"><span aria-hidden="true">⊖</span>${t(blockType(block))}</button></td>`:`<td class="calendar-block">${t('sharedOccupied')}</td>`;i++;}
      else{cells+=`<td><button class="calendar-empty" ${can('create_reservation')||can('bulk_block')?'':'disabled'} data-cell="${escape(r.id)}" data-day="${d}" aria-label="${escape(r.label+' '+d+' '+t('emptyCell'))}">＋</button></td>`;i++;}
    }
    return `<tr>${heading}<th class="unit-cell ${r.cleaning==='dirty'?'unit-dirty':''}" scope="row"><strong>${escape(r.label)}</strong><small title="${t(r.cleaning)}">${r.cleaning==='dirty'?'✦':''}<span class="sr-only">${t(r.cleaning)}</span></small></th>${cells}</tr>`;
  }).join('');
  const counts=(product,d)=>eligible.filter(r=>r.productId===product&&!plan.some(p=>p.start<=d&&p.end>d&&p.atoms.some(a=>r.atoms.includes(a)))&&!state.blocks.some(b=>b.propertyId===propertyId&&b.start<=d&&b.end>d&&b.atoms.some(a=>r.atoms.includes(a)))).length;
  const weekday=d=>new Intl.DateTimeFormat(lang==='zh'?'zh-CN':lang==='ms'?'ms-MY':'en-GB',{weekday:'short',timeZone:'UTC'}).format(new Date(d+'T00:00:00Z'));
  return `<section class="panel calendar-panel"><div class="calendar-controls"><div class="calendar-mode"><button data-cal-view="calendar" class="selected">${t('navCalendar')}</button><button data-cal-view="overview">${t('singleDay')}</button></div><input id="calendar-search" value="${escape(calendarQuery)}" placeholder="${t('calendarSearch')}" aria-label="${t('calendarSearch')}"><button data-cal-tool="bulk" data-bulk-mode="dirty">${t('batchCleaning')}</button><button data-cal-tool="bulk" data-bulk-mode="block">${t('batchRoomState')}</button></div><div class="calendar-actions"><button data-cal-view="overview">${t('overview')}</button><button data-cal-tool="quick">${t('quickOrder')}</button><button data-cal-tool="queue">${t('unassignedQueue')} (${queue.length})</button><button data-cal-tool="box">${t('boxTitle')} (${orders.filter(isBoxed).filter(o=>o.status==='confirmed').length})</button><button data-range-toggle aria-pressed="false">${t('selectRange')}</button><button data-cal-tool="display">${t('displaySettings')}</button><button data-cal-view="audit">${t('audit')}</button><button data-cal-tool="legend">${t('legend')}</button><button id="export">${t('export')}</button><details class="calendar-guide"><summary>${t('viewInstructions')}</summary><p>${t('rangeHint')}</p><p>${t('holdExplanation')}</p></details></div><details class="calendar-filters" ${calendarQuery||calendarProduct!=='all'||calendarGender!=='all'||calendarRoomType!=='all'||calendarStatus!=='all'||calendarSource!=='all'?'open':''}><summary>${t('filters')}</summary><div class="calendar-toolbar">${select('calendar-product','product',['all','room','bed','suite'],calendarProduct)}<label class="compact-label">${t('roomTypes')}<select id="calendar-room-type"><option value="all">${t('all')}</option>${(state.roomTypes||[]).filter(type=>type.propertyId===propertyId).sort((a,b)=>a.sortOrder-b.sortOrder).map(type=>`<option value="${escape(type.id)}" ${type.id===calendarRoomType?'selected':''}>${escape(typeName(type,lang,t(type.productId)+' · '+t(type.gender)))}</option>`).join('')}</select></label>${select('calendar-gender','gender',['all','female','male','any'],calendarGender)}${select('calendar-status','status',['all','confirmed','checked_in'],calendarStatus)}${select('calendar-source','source',['all',...sourceValues],calendarSource)}<button data-cal-tool="reset">${t('resetFilters')}</button></div></details><div class="calendar-wrap"><table class="calendar ${compactRows?'compact':''}" data-span="${calendarSpan}"><colgroup><col class="type-column"><col class="resource-column">${days.map(()=>'<col class="day-column">').join('')}</colgroup><thead><tr><th colspan="2" class="calendar-date-cell"><div><input id="calendar-date" type="date" value="${date}" aria-label="${t('viewStart')}" required><button data-cal-tool="today" title="${t('backToBusiness')}">${t('todayShort')}</button></div><div class="calendar-date-navigation"><button data-calendar-step="-1" aria-label="${t('previous')}">‹</button><span>${date.slice(5)} - ${days.at(-1).slice(5)}</span><button data-calendar-step="1" aria-label="${t('next')}">›</button></div></th>${days.map(d=>`<th class="date-heading ${d===businessDate()?'business-day':''} ${[5,6].includes(new Date(d+'T00:00:00Z').getUTCDay())?'weekend':''}"><span class="unassigned-count" title="${t('unassignedQueue')}">${queue.filter(o=>o.start<=d&&o.end>d).length}</span><span>${d===businessDate()?t('today'):d.slice(5).replace('-','/')+'('+weekday(d)+')'}</span></th>`).join('')}</tr>${displayAvailability?`<tr class="availability"><th class="type-cell"><button data-filter-toggle>${t('filters')} ▽</button></th><th class="unit-cell"><button data-collapse-rooms aria-expanded="${!collapsed}">${t(collapsed?'openGroups':'closeGroups')} ${collapsed?'⌄':'⌃'}</button></th>${days.map(d=>`<th title="${t('room')} / ${t('bed')} / ${t('suite')}">${counts('room',d)} / ${counts('bed',d)} / ${counts('suite',d)}</th>`).join('')}</tr>`:''}</thead><tbody>${rows}</tbody></table></div>${visible.length?'':`<p>${t('noMatchingResources')}</p>`}<details id="calendar-queue"><summary>${t('unassignedQueue')} (${queue.length})</summary><p class="muted">${t('holdExplanation')}</p><div class="calendar-queue">${queue.map(o=>`<button data-action="details" data-id="${escape(o.id)}">${escape(o.guest)} · ${o.start} → ${o.end} · ${t(o.productId)}</button>`).join('')||t('empty')}</div></details></section>`;
}

$('#content').addEventListener('change',e=>{
  if(e.target.id==='calendar-span')calendarSpan=Number(e.target.value);
  else if(e.target.id==='calendar-product')calendarProduct=e.target.value;
  else if(e.target.id==='calendar-room-type')calendarRoomType=e.target.value;
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
  const fields=()=>['email','phone','country','guestLanguage','channelOrderId'].map(name=>{const directory=name==='country'?countryOptions(lang):name==='guestLanguage'?languageOptions(lang):null;const listId='edit-'+name+'-directory';return `<label>${t(name)}<input name="${name}" value="${escape(o[name]||'')}" maxlength="${name==='email'?254:name==='channelOrderId'?100:name==='country'?80:40}" ${directory?'list="'+listId+'"':''}>${directory?'<datalist id="'+listId+'">'+directory.map(item=>'<option value="'+escape(item.value)+'" label="'+escape(item.label+' · '+item.english)+'"></option>').join('')+'</datalist>':''}</label>`;}).join('');
  const editForm=`<details class="edit-section"><summary>${t('edit')}</summary>${o.nightlyRates?`<p class="muted">${t('snapshotEdit')}</p>`:''}<form id="edit-form"><label>${t('guest')}<input name="guest" value="${escape(o.guest)}" maxlength="100" required></label><div class="form-row"><label>${t('arrival')}<input name="start" type="date" value="${o.start}" required></label><label>${t('departure')}<input name="end" type="date" value="${o.end}" required></label></div><div class="form-row"><label>${t('nightly')}<input name="nightly" type="number" step="0.01" min="0" max="1000000" value="${(o.nightly||0)/100}" required></label><label>${t('source')}<select name="source">${opts(sourceValues,o.source||'direct')}</select></label></div><div class="guest-fields">${fields()}${(o.occupants||[]).map((p,i)=>`<label>${t('occupantName')} ${i+1}<input name="occupant_${i}" value="${escape(p.name)}" maxlength="100"></label>`).join('')}</div><label>${t('notes')}<textarea name="notes" maxlength="2048">${escape(o.notes||'')}</textarea></label><label>${t('channelNotes')}<textarea name="channelNotes" maxlength="2000">${escape(o.channelNotes||'')}</textarea></label><label>${t('specialColor')}<select name="color">${opts(['','peach','blue','green','violet'],o.color||'')}</select></label><button class="primary" ${!finished&&!o.folioClosed&&can('edit')?'':'disabled'}>${t('apply')}</button></form></details>`;
  const allocation=!finished&&!isBoxed(o)?`<section class="calendar-allocation"><h3>${t('allocation')}</h3><select id="detail-resource" aria-label="${t('allocation')}"><option value="">${t('noResource')}</option>${saleResources(state,propertyId).filter(r=>r.productId===o.productId&&(!o.roomTypeId||r.roomTypeId===o.roomTypeId)).map(r=>`<option value="${escape(r.id)}" ${r.id===o.resourceId?'selected':''}>${escape(r.label)} · ${t(r.gender)} · ${t(r.cleaning)}</option>`).join('')}</select><button id="detail-assign" ${can('assign')&&!o.locked?'':'disabled'}>${t('assign')}</button><button id="toggle-lock" ${can('lock')&&o.resourceId?'':'disabled'}>${t(o.locked?'unlockRoom':'lockRoom')}</button></section>`:'';
  const basic=`<section><div class="panel-head"><h2>${escape(o.guest)}</h2><span class="badge">${t(o.source||'direct')} · ${t(o.status)} · ${t(inventoryState(o))}</span></div><dl class="guest-info">${['email','phone','country','guestLanguage'].map(name=>`<div><dt>${t(name)}</dt><dd>${escape(o[name]||'—')}</dd></div>`).join('')}</dl><div class="folio-grid">${[['charge',f.charge],['paid',f.paid],['due',f.due],...(f.transferred?[['ar_post',f.transferred]]:[]),['deposit',f.deposit]].map(([k,v])=>`<div><span>${t(k)}</span><strong>${currency(v)}</strong></div>`).join('')}</div><section class="stay-card"><h3>${t('stayInfo')}</h3><strong>${escape(resource?.label||t('unassigned'))}</strong><p>${o.start} → ${o.end} · ${f.nights} ${t('nights')}</p><p>${t('nightly')}: ${currency(o.nightly||0)} · ${t(o.status)}</p></section>${allocation}<h3>${t('channelNotes')}</h3><p class="text-block">${escape(o.channelNotes||'—')}</p><h3>${t('notes')}</h3><p class="text-block">${escape(o.notes||'—')}</p>${o.reservationId?`<button id="back-reservation">${t('backReservation')}</button><h3>${t('occupants')}</h3><p>${(o.occupants||[]).map(p=>escape(p.name||'—')+' · '+t(p.gender)).join(' / ')}</p><details><summary>${t('dailyRates')}</summary><div class="table-wrap"><table><tbody>${(o.nightlyRates||[]).map(r=>`<tr><td>${r.date}</td><td>${currency(r.amount)}</td></tr>`).join('')}</tbody></table></div></details><h3>${t('extraCharge')}</h3>${(o.extraCharges||[]).map(r=>`<p>${escape(r.name)} · ${r.quantity} × ${currency(r.unitAmount)} ${r.kind==='discount'?'−':'+'}</p>`).join('')}`:''}${editForm}<dl class="order-meta"><dt>ID</dt><dd>${escape(o.id)}</dd><dt>${t('createdAt')}</dt><dd>${escape(o.createdAt||'—')}</dd><dt>${t('createdBy')}</dt><dd>${escape(o.createdBy||'—')}</dd></dl></section>`;
  const closing='<section><h3>'+t(o.folioClosed?'folioClosed':'folioOpen')+'</h3>'+ (o.folioClosed?'<form id="reopen-folio-form"><label>'+t('folioReopenReason')+'<input name="reason" required maxlength="500"></label><label><input name="confirmed" type="checkbox" required>'+t('reopenConfirm')+'</label><button '+(can('reopen_folio')?'':'disabled')+'>'+t('reopenFolio')+'</button></form>':'<form id="settle-form"><p>'+t('settleNote')+'</p><label><input name="confirmed" type="checkbox" required>'+t('settleConfirm')+'</label><button '+(can('settle')&&f.due===0&&f.deposit===0?'':'disabled')+'>'+t('settle')+'</button></form>')+'</section>';
  const bill=`${can('ar_post')&&can('ar_report_view')?arPostForm(state,o,{t,currency,totals:f}):''}${o.splitBills||(!o.folioClosed&&can("settle_split"))?splitBillPanel(o,f):""}${o.splitBills?"":closing}<div class="folio-grid">${[['charge',f.charge],['paid',f.paid],['due',f.due],...(f.transferred?[['ar_post',f.transferred]]:[]),['deposit',f.deposit]].map(([k,v])=>`<div><span>${t(k)}</span><strong>${currency(v)}</strong></div>`).join('')}</div><p class="muted">${t('billExplanation')}</p><form id="payment-form">${o.splitBills?`<label>${t("splitBill")}<select name="billId"><option value="">—</option>${o.splitBills.filter(b=>!b.closedBy).map(b=>`<option value="${escape(b.id)}">${escape(b.label)}</option>`).join("")}</select></label>`:""}<h3>${t('transactions')}</h3><p class="muted">${t('financialNote')}</p><div class="form-row"><label>${t('kind')}<select name="kind">${opts(['payment','refund','deposit_in','deposit_out'])}</select></label><label>${t('amount')}<input name="amount" type="number" min="0.01" max="1000000" step="0.01" required></label></div><div class="form-row"><label>${t('method')}<select name="method">${opts(['cash','bank','card','ota'])}</select></label><label>${t('notes')}<input name="note" maxlength="500"></label></div><label>${t('reference')}<input name="reference" maxlength="100"></label><button class="primary" ${can('payment')&&!o.folioClosed?'':'disabled'}>${t('record')}</button></form><div class="table-wrap"><table><thead><tr>${['time','kind','amount','method','notes'].map(k=>`<th>${t(k)}</th>`).join('')}</tr></thead><tbody>${(o.transactions||[]).map(p=>`<tr><td>${escape(p.at.slice(0,16))} UTC</td><td>${t(p.kind)}</td><td>${currency(p.amount)}</td><td>${t(p.method)}</td><td>${escape(p.note||'')}<small>${escape(p.reference||'')}</small></td></tr>`).join('')}</tbody></table></div>`;
  const logs=state.audit.filter(a=>a.propertyId===propertyId&&(a.orderId===id||a.stayIds?.includes(id)));
  const audit=`${renderFolioHistory(o,{t,currency})}<p class="muted">${t('auditLimit')}</p><div class="table-wrap"><table><thead><tr><th>${t('time')}</th><th>${t('action')}</th><th>${t('createdBy')}</th></tr></thead><tbody>${logs.map(a=>`<tr><td>${escape(a.at)}</td><td>${escape(t(a.type))}</td><td>${escape(a.actor||'local')}</td></tr>`).join('')}</tbody></table></div><h3>${t('inventoryHistory')}</h3><ul>${(o.inventoryHistory||[]).map(h=>`<li>${escape(h.at)} · ${t(h.action==='boxed'?'boxed':'reserved')} · ${escape(h.actor)} · ${escape(h.reason)}</li>`).join('')}</ul><h3>${t('assign')}</h3><ul>${(o.history||[]).map(h=>`<li>${escape(h.from||'—')} → ${escape(h.to)} · ${escape(h.at||'')}</li>`).join('')}</ul>`;
  const channel=`<h3>${t('channelInfo')}</h3><dl class="order-meta"><dt>${t('source')}</dt><dd>${escape(t(o.source||'direct'))}</dd><dt>${t('channelOrderId')}</dt><dd>${escape(o.channelOrderId||'—')}</dd></dl><p class="muted">${t('channelNotConnected')}</p><h3>${t('channelNotes')}</h3><p class="text-block">${escape(o.channelNotes||'—')}</p>`;
  let policyPreview='';try{const preview=previewCancellation(o,new Date().toISOString());policyPreview='<p>'+escape(rateLabel('订单政策快照','Booked policy snapshot','Polisi tempahan'))+': '+escape(o.cancellationPolicy?.kind||'manual')+' · '+(preview.fee===null?escape(rateLabel('人工核定费用','Manually confirm fee','Sahkan caj manual')):escape(currency(preview.fee)))+(preview.deadline?' · '+escape(preview.deadline):'')+'</p><p class="muted">'+escape(rateLabel('仅房费政策预览；附加消费需另核定，不会自动取消、收款或退款。','Room-fee policy preview only; confirm extras separately. No automatic cancellation, charge or refund.','Pratonton polisi caj bilik sahaja; semak caj tambahan berasingan. Tiada pembatalan atau bayaran automatik.'))+'</p>';}catch{policyPreview='<p>'+escape(rateLabel('政策预览不可用，请人工核定。','Policy preview unavailable; confirm manually.','Pratonton polisi tiada; sahkan manual.'))+'</p>';}
  const cancellation=o.status==='confirmed'&&!o.folioClosed?`<details><summary>${t('cancel')}</summary><form id="cancel-form">${policyPreview}<p class="muted">${t('cancelNote')}</p><label>${t('reason')}<input name="reason" required maxlength="500"></label><label>${t('finalCharge')}<input name="finalCharge" type="number" min="0" max="1000000" step="0.01" required></label><button ${can('cancel')?'':'disabled'}>${t('cancel')}</button></form></details>`:'';
  $('#detail-body').innerHTML=`<div class="detail-head"><div role="tablist" aria-label="${t('details')}">${[['details','details'],['bill','billInfo'],['audit','audit'],['channel','channelInfo']].map(([key,label])=>`<button role="tab" id="detail-tab-${key}" aria-selected="${key===detailTab}" aria-controls="detail-panel" data-detail-tab="${key}" tabindex="${key===detailTab?0:-1}">${t(label)}</button>`).join('')}</div><button id="detail-close" aria-label="${t('close')}">×</button></div><div id="detail-error" role="alert"></div><div class="detail-scroll" id="detail-panel" role="tabpanel" aria-labelledby="detail-tab-${detailTab}">${{details:basic,bill,audit,channel}[detailTab]}${detailTab==='details'?cancellation:''}</div><div class="detail-footer"><button data-detail-go="details">${t('edit')}</button><button data-detail-go="bill">${t('billInfo')}</button>${!finished&&!isBoxed(o)?button(o.status==='confirmed'?'checkin':'checkout',id):''}${o.status==='confirmed'?`<button id="detail-box" ${can(isBoxed(o)?'restore_stays':'box_stays')&&!o.locked?'':'disabled'}>${t(isBoxed(o)?'restore_stays':'box_stays')}</button>`:''}<button id="print-order">${t('print')}</button></div>`;
  $('#detail-close').onclick=()=>$('#detail-dialog').close();
  const act=async command=>{try{await commit({...command,orderId:id});openDetail(id);}catch(e){$('#detail-error').textContent=errorText(e);}};
  $('#detail-body').onclick=e=>{
    const tab=e.target.closest('[data-detail-tab]'),go=e.target.closest('[data-detail-go]'),action=e.target.closest('[data-action]');
    if(tab||go){detailTab=(tab||go).dataset[tab?'detailTab':'detailGo'];openDetail(id);if(tab)$(`#detail-tab-${detailTab}`).focus();else if(detailTab==='details')$('#edit-form')?.closest('details')?.setAttribute('open','');}
    if(action)act({type:action.dataset.action});
    if(e.target.closest('#print-order'))window.print();
  };
  $('#detail-body').onkeydown=e=>{const tab=e.target.closest('[data-detail-tab]');if(!tab||!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const tabs=['details','bill','audit','channel'];detailTab=e.key==='Home'?tabs[0]:e.key==='End'?tabs.at(-1):tabs[(tabs.indexOf(detailTab)+(e.key==='ArrowRight'?1:3))%4];openDetail(id);$(`#detail-tab-${detailTab}`).focus();};
  if($('#detail-box'))$('#detail-box').onclick=()=>openBoxAction([id],isBoxed(o)?'restore_stays':'box_stays',()=>openDetail(id));
  if($('#back-reservation'))$('#back-reservation').onclick=()=>openReservation(o.reservationId);
  if($('#detail-assign'))$('#detail-assign').onclick=()=>act({type:'assign',resourceId:$('#detail-resource').value});
  if($('#edit-form'))$('#edit-form').onsubmit=e=>{e.preventDefault();try{const values=Object.fromEntries(new FormData(e.target));act({type:'edit',...values,nightly:toMinor(values.nightly),...(o.occupants?{occupants:o.occupants.map((p,i)=>({...p,name:values['occupant_'+i]}))}:{})});}catch(e){$('#detail-error').textContent=errorText(e);}};
  if($('#payment-form'))$('#payment-form').onsubmit=e=>{e.preventDefault();try{const values=Object.fromEntries(new FormData(e.target));act({type:'payment',...values,amount:toMinor(values.amount)});}catch(e){$('#detail-error').textContent=errorText(e);}};
  if($('#toggle-lock'))$('#toggle-lock').onclick=()=>act({type:'lock'});
  if ($('#split-form')) {
    const form = $('#split-form');
    $('#split-add').onclick = () => {
      if (form.querySelectorAll('[data-split-row]').length < 20) $('#split-rows').insertAdjacentHTML('beforeend', splitBillRow());
    };
    form.onsubmit = e => {
      e.preventDefault();
      try {
        const bills = [...form.querySelectorAll('[data-split-row]')].map(row => ({
          label:row.querySelector('[name="label"]').value,
          charge:toMinor(row.querySelector('[name="charge"]').value),
          paid:toMinor(row.querySelector('[name="paid"]').value)
        }));
        act({type:'settle_split',bills});
      } catch (error) { $('#detail-error').textContent=errorText(error); }
    };
  }
  $('#detail-body').querySelectorAll('[data-split-command]').forEach(form => {
    form.onsubmit = e => {
      e.preventDefault();
      act({type:form.dataset.splitCommand,billId:form.dataset.billId,reason:new FormData(form).get('reason')});
    };
  });
  if ($('#ar-post-form')) $('#ar-post-form').onsubmit=e=>{
    e.preventDefault();
    act({type:'ar_post',...Object.fromEntries(new FormData(e.target))});
  };
  if($('#settle-form'))$('#settle-form').onsubmit=e=>{e.preventDefault();act({type:'settle'});};
  if($('#reopen-folio-form'))$('#reopen-folio-form').onsubmit=e=>{e.preventDefault();act({type:'reopen_folio',reason:new FormData(e.target).get('reason')});};
  if($('#cancel-form'))$('#cancel-form').onsubmit=e=>{e.preventDefault();try{const values=Object.fromEntries(new FormData(e.target));act({type:'cancel',...values,finalCharge:toMinor(values.finalCharge)});}catch(e){$('#detail-error').textContent=errorText(e);}};
  if(!$('#detail-dialog').open)$('#detail-dialog').showModal();
}
function openUtility(title,html){if(communications?.isBusy()||selfCheckinUI?.isBusy())throw Error('busy');delete $('#utility-dialog').dataset.communication;$('#utility-title').textContent=t(title);$('#utility-body').innerHTML=html;$('#utility-error').textContent='';if(!$('#utility-dialog').open)$('#utility-dialog').showModal();}
$('#utility-close').onclick=()=>{if($('#utility-dialog').dataset.communication){if(!leaveDialogs())$('#utility-error').textContent=t('busy');}else $('#utility-dialog').close();};
$('#utility-dialog').addEventListener('cancel',event=>{if($('#utility-dialog').dataset.communication){event.preventDefault();if(!leaveDialogs())$('#utility-error').textContent=t('busy');}});
$('#utility-dialog').addEventListener('close',()=>calendarInteractions?.reset());
$('#content').addEventListener('click',e=>{
  if(e.target.closest('[data-filter-toggle]')){const filters=$('.calendar-filters');filters.open=!filters.open;return;}
  if(e.target.closest('[data-collapse-rooms]')){calendarGroupsCollapsed=!calendarGroupsCollapsed;render();return;}
  const target=e.target.closest('[data-cal-tool]'),nav=e.target.closest('[data-cal-view]');
  if(nav){view=nav.dataset.calView;render();return;}
  if(!target)return;const tool=target.dataset.calTool;
  if(tool==='box'){showOrderBox();return;}
  if(tool==='quick'){$('#new').click();return;}
  if(tool==='queue'){$('#calendar-queue').open=true;$('#calendar-queue').scrollIntoView({block:'nearest'});return;}
  if(tool==='today'){calendarDate=businessDate();render();return;}
  if(tool==='reset'){calendarProduct='all';calendarGender='all';calendarRoomType='all';calendarQuery='';calendarStatus='all';calendarSource='all';render();return;}
  if(tool==='legend'){
    openUtility('legend',`<p>${t('legendExplanation')}</p><ul class="legend-list"><li><span class="legend-swatch confirmed"></span>${t('confirmed')}</li><li><span class="legend-swatch checked_in"></span>${t('checked_in')}</li><li><span class="legend-swatch provisional"></span>${t('provisional')}</li><li><span class="legend-swatch blocked"></span>${t('blocked')}</li><li>🔒 ${t('lockedLabel')}</li></ul><p>${t('holdExplanation')}</p><p>${t('colorExplanation')}</p>`);return;
  }
  if(tool==='display'){
    openUtility('displaySettings',`<form id="display-form"><label>${t('windowDays')}<select name="span">${[7,14,30].map(n=>`<option ${calendarSpan===n?'selected':''}>${n}</option>`).join('')}</select></label><label>${t('groupBy')}<select name="group"><option value="product" ${calendarGroup==='product'?'selected':''}>${t('salesGroup')}</option><option value="room" ${calendarGroup==='room'?'selected':''}>${t('physicalRoom')}</option></select></label>${[['source',displaySource,'source'],['balance',displayBalance,'due'],['availability',displayAvailability,'dailyAvailable'],['compact',compactRows,'compactRows']].map(([name,checked,label])=>`<label class="check-label"><input type="checkbox" name="${name}" ${checked?'checked':''}>${t(label)}</label>`).join('')}<button class="primary">${t('apply')}</button></form>`);
    $('#display-form').onsubmit=e=>{e.preventDefault();const f=e.target.elements;calendarSpan=Number(f.span.value);calendarGroup=f.group.value;displaySource=f.source.checked;displayBalance=f.balance.checked;displayAvailability=f.availability.checked;compactRows=f.compact.checked;render();$('#utility-dialog').close();};return;
  }
  if(tool==='bulk'){
    const resources=saleResources(state,propertyId);
    openUtility('batchOperations',`<form id="bulk-form"><p class="muted">${t('bulkExplanation')}</p><label>${t('action')}<select name="operation"><option value="dirty">${t('markDirty')}</option><option value="clean">${t('finish')}</option><option value="block">${t('closeRooms')}</option><option value="unblock">${t('openRooms')}</option></select></label><div class="form-row"><label>${t('arrival')}<input type="date" name="start" value="${calendarDate}" required></label><label>${t('departure')}<input type="date" name="end" value="${nextDay(calendarDate)}" required></label></div><p class="muted">${t('bulkDateExplanation')}</p><label>${t('reason')}<input name="reason" maxlength="200"></label><label>${t('blockType')}<select name="blockType">${['out_of_service','maintenance','hold'].map(k=>`<option value="${k}">${t(k)}</option>`).join('')}</select></label><p class="muted">${t('blockPolicy')}</p><label class="check-label"><input id="bulk-all" type="checkbox">${t('selectAll')}</label><div class="bulk-resources">${resources.map(r=>`<label class="check-label"><input type="checkbox" name="resource" value="${escape(r.id)}">${escape(r.label)} · ${t(r.productId)} · ${t(r.cleaning)}</label>`).join('')}</div><label class="check-label"><input type="checkbox" name="confirmed" required>${t('confirmBulk')}</label><button class="primary" ${can('bulk_clean')?'':'disabled'}>${t('apply')}</button></form>`);
    if(target.dataset.bulkMode)$('#bulk-form [name=operation]').value=target.dataset.bulkMode;
    $('#bulk-all').onchange=e=>$('#bulk-form').querySelectorAll('[name=resource]').forEach(c=>c.checked=e.target.checked);
    $('#bulk-form').onsubmit=async e=>{e.preventDefault();const f=e.target,button=f.querySelector('button'),data=new FormData(f),op=data.get('operation');const command={type:op==='block'?'bulk_block':op==='unblock'?'bulk_unblock':'bulk_clean',resourceIds:data.getAll('resource'),start:data.get('start'),end:data.get('end'),reason:data.get('reason'),blockType:data.get('blockType'),cleaning:op};button.disabled=true;try{await commit(command);$('#utility-dialog').close();}catch(err){$('#utility-error').textContent=errorText(err);}finally{button.disabled=!can('bulk_clean');}};
  }
});

// Calendar actions are delegated so changing dates does not discard bindings.
$('#content').addEventListener('click',e=>{
 if(e.target.closest('#export')){
   const rows=[['ID','Guest','Source','Arrival','Departure','Status','Resource','Charge_MYR','NetPaid_MYR','Due_MYR','Deposit_MYR'],...state.orders.filter(o=>o.propertyId===propertyId).map(o=>{const f=folio(o);return[o.id,o.guest,o.source||'direct',o.start,o.end,o.status,o.resourceId||'',f.charge/100,f.paid/100,f.due/100,f.deposit/100];})];
   const csv='\uFEFF'+rows.map(row=>row.map(v=>'"'+String(v).replace(/^[=+@\-]/,"'$&").replaceAll('"','""')+'"').join(',')).join('\r\n');
   const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.download=`JOVIAN-TEST-${propertyId}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
 }
});

for(const [language,values] of Object.entries({
zh:{login:'登录 JOVIAN',username:'账号',password:'密码',loginButton:'登录',logout:'退出登录',refresh:'刷新共享数据',shared:'共享开发模式',sharedFooter:'测试数据库保存 · 未连接生产渠道或门锁',credentials:'账号或密码不正确。',forbidden:'没有此门店或操作的权限。',login_required:'会话已过期，请重新登录。',stale_revision:'其他操作员已更新数据，已刷新，请核对后重新操作。',inventory_conflict:'库存冲突：无法满足分区、同房或连续住宿要求。',rate_limited:'登录尝试过多，请15分钟后重试。',csrf:'会话校验失败，请重新登录。',connection:'服务连接失败，请检查服务后重试。',busy:'正在保存，请稍候。',emptyAccess:'账号未分配门店，请联系管理员。',signupDone:'注册成功，请登录试用账号：',signupDoneStore:'注册成功，请登录；你的门店代码是：',uncertain:'上次保存结果待确认，请保持原内容重试或核对记录，勿重复录入收付款。',date_range:'住宿或停用日期需有效，且每次不超过366晚。'},
en:{login:'Sign in to JOVIAN',username:'Username',password:'Password',loginButton:'Sign in',logout:'Sign out',refresh:'Refresh shared data',shared:'Shared development mode',sharedFooter:'Test database · No live channels or locks',credentials:'Invalid username or password.',forbidden:'Property or action not permitted.',login_required:'Session expired. Sign in again.',stale_revision:'Another operator updated this property. Refreshed; review and retry.',inventory_conflict:'Inventory constraints cannot be satisfied.',rate_limited:'Too many attempts. Retry in 15 minutes.',csrf:'Session check failed. Sign in again.',connection:'Connection failed. Check the server and retry.',busy:'Saving. Please wait.',emptyAccess:'No assigned property. Contact the administrator.',signupDone:'Signed up. Sign in with your trial account:',signupDoneStore:'Signed up. Sign in; your store code is:',uncertain:'Previous save is uncertain. Retry unchanged or verify records before recording another payment.',date_range:'Use valid dates, up to 366 nights per operation.'},
ms:{login:'Log masuk JOVIAN',username:'Nama pengguna',password:'Kata laluan',loginButton:'Log masuk',logout:'Log keluar',refresh:'Muat semula data kongsi',shared:'Mod pembangunan berkongsi',sharedFooter:'Pangkalan data ujian · Tiada saluran atau kunci sebenar',credentials:'Nama pengguna atau kata laluan salah.',forbidden:'Hartanah atau tindakan tidak dibenarkan.',login_required:'Sesi tamat. Log masuk semula.',stale_revision:'Data dikemas kini oleh staf lain. Semak dan cuba semula.',inventory_conflict:'Syarat inventori tidak dapat dipenuhi.',rate_limited:'Terlalu banyak cubaan. Cuba selepas 15 minit.',csrf:'Semakan sesi gagal. Log masuk semula.',connection:'Sambungan gagal. Semak pelayan dan cuba semula.',busy:'Sedang menyimpan. Sila tunggu.',emptyAccess:'Tiada hartanah ditetapkan. Hubungi pentadbir.',signupDone:'Berjaya daftar. Log masuk dengan akaun percubaan anda:',signupDoneStore:'Berjaya daftar. Log masuk; kod kedai anda:',uncertain:'Simpanan belum pasti. Cuba semula tanpa ubah atau semak rekod sebelum bayaran lain.',date_range:'Gunakan tarikh sah sehingga 366 malam setiap tindakan.'}
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
$('#logout').onclick=async()=>{if(!leaveDialogs()){$('#message').textContent=t('busy');return;}try{await backend.logout();state=seed();memoDrafts.clear();composer.close();$('#detail-dialog').close();$('#order-dialog').close();$('#property-dialog').close();$('#utility-dialog').close();showLogin();}catch(e){$('#message').textContent=errorText(e);}};
for(const [language,values] of Object.entries({
 zh:{'':'使用默认色',all:'全部',tripcom:'Trip.com',previous:'上一段',next:'下一段',singleDay:'单日房态',quickOrder:'快速下单',orderBox:'待分房预订',displaySettings:'显示设置',legend:'图例说明',batchOperations:'批量清洁／开关房',viewStart:'日历开始日期',backToBusiness:'回到营业日期',calendarSearch:'姓名、邮箱、手机、订单号、备注',filters:'筛选',resetFilters:'重置筛选',salesGroup:'销售分组',dailyAvailable:'独立可售（房／床／整套）',sharedOccupied:'共用空间已占',noMatchingResources:'没有符合筛选的房间或床位。',holdExplanation:'未人工分配的订单已占用内部预留容量，以虚线显示；不是额外可售库存。',stayInfo:'住宿信息',nights:'晚',email:'邮箱',phone:'手机号码',country:'国家／地区',guestLanguage:'客人语言',channelOrderId:'渠道订单号（手工参考）',channelNotes:'渠道备注（手工记录）',specialColor:'订单特殊色',peach:'浅橙',blue:'浅蓝',green:'浅绿',violet:'浅紫',createdAt:'创建时间',createdBy:'操作员',lockRoom:'锁定房间',unlockRoom:'解锁房间',billInfo:'账单信息',channelInfo:'渠道信息',print:'打印当前标签',billExplanation:'住宿费用、净实收和押金分别核算。这里是测试收付记录，未连接银行或会计总账；取消不自动退款。',auditLimit:'仅显示本账号可见的最近500条门店记录中与此单有关的操作；换房操作记录不代表按日期分段库存。',channelNotConnected:'尚未接通渠道。来源、渠道号和备注均为本系统记录，不表示已同步或收到OTA款项。',legendExplanation:'以下为JOVIAN当前图例；SmartOrder完整图例尚未验证。订单状态以文字和边框标识，底色可另行指定。',colorExplanation:'订单特殊色只用于标记，不改变入住、付款或库存状态。',windowDays:'显示天数',groupBy:'分组方式',physicalRoom:'物理房间',compactRows:'紧凑行高',bulkExplanation:'仅修改勾选的测试房床，整批成功或整批回退。存在在住客人时拒绝清洁变更及关房，不会挤掉已分配预订。',bulkDateExplanation:'日期区间只用于开关房；结束日期不包含在内。置脏净修改的是当前清洁状态。',markDirty:'置脏',closeRooms:'停用房床',openRooms:'开放所选日期',selectAll:'选择本店全部房床',confirmBulk:'确认执行所选测试操作',bulk_clean:'批量置脏净',bulk_block:'批量停用',bulk_unblock:'批量开放'},
 en:{'':'Default color',all:'All',tripcom:'Trip.com',previous:'Previous',next:'Next',singleDay:'Single day',quickOrder:'Quick reservation',orderBox:'Unassigned reservations',displaySettings:'Display settings',legend:'Legend',batchOperations:'Bulk cleaning / blocks',viewStart:'Calendar starts',backToBusiness:'Business date',calendarSearch:'Name, email, phone, reference or notes',filters:'Filters',resetFilters:'Reset filters',salesGroup:'Sales group',dailyAvailable:'Available individually (rooms / beds / suites)',sharedOccupied:'Shared space occupied',noMatchingResources:'No matching rooms or beds.',holdExplanation:'Unassigned reservations already consume internal capacity. Dashed holds are not extra availability.',stayInfo:'Accommodation',nights:'nights',email:'Email',phone:'Phone',country:'Country / region',guestLanguage:'Guest language',channelOrderId:'Channel reference (manual)',channelNotes:'Channel notes (manual)',specialColor:'Reservation color',peach:'Peach',blue:'Blue',green:'Green',violet:'Violet',createdAt:'Created',createdBy:'Operator',lockRoom:'Lock room',unlockRoom:'Unlock room',billInfo:'Billing',channelInfo:'Channel information',print:'Print current tab',billExplanation:'Accommodation, net payments and deposits are separate. Test records only; no banking or general ledger connection. Cancellation does not refund automatically.',auditLimit:'Related entries from the latest 500 property events visible to this account. Move logs do not represent dated allocation segments.',channelNotConnected:'No channel connection. Source, reference and notes are local records, not proof of synchronization or OTA settlement.',legendExplanation:'Current JOVIAN legend. SmartOrder’s full legend is unverified. Text and borders indicate state; the fill may be customized.',colorExplanation:'Custom color does not change occupancy, payment or inventory state.',windowDays:'Visible days',groupBy:'Group by',physicalRoom:'Physical room',compactRows:'Compact rows',bulkExplanation:'Selected test units only. All changes commit or roll back together. In-house units reject cleaning changes and blocks; fixed reservations are never displaced.',bulkDateExplanation:'Dates apply only to blocks / releases, excluding the end date. Cleaning changes the current state.',markDirty:'Mark dirty',closeRooms:'Block units',openRooms:'Release selected dates',selectAll:'Select all property units',confirmBulk:'Confirm selected test action',bulk_clean:'Bulk cleaning',bulk_block:'Bulk block',bulk_unblock:'Bulk release'},
 ms:{'':'Warna lalai',all:'Semua',tripcom:'Trip.com',previous:'Sebelumnya',next:'Seterusnya',singleDay:'Satu hari',quickOrder:'Tempahan pantas',orderBox:'Tempahan belum ditetapkan',displaySettings:'Tetapan paparan',legend:'Petunjuk',batchOperations:'Pembersihan / sekatan pukal',viewStart:'Mula kalendar',backToBusiness:'Tarikh operasi',calendarSearch:'Nama, e-mel, telefon, rujukan atau nota',filters:'Penapis',resetFilters:'Tetap semula penapis',salesGroup:'Kumpulan jualan',dailyAvailable:'Tersedia sendiri (bilik / katil / suite)',sharedOccupied:'Ruang kongsi diduduki',noMatchingResources:'Tiada bilik atau katil sepadan.',holdExplanation:'Tempahan belum ditetapkan telah menggunakan kapasiti dalaman. Pegangan putus bukan kapasiti tambahan.',stayInfo:'Maklumat penginapan',nights:'malam',email:'E-mel',phone:'Telefon',country:'Negara / wilayah',guestLanguage:'Bahasa tetamu',channelOrderId:'Rujukan saluran (manual)',channelNotes:'Nota saluran (manual)',specialColor:'Warna tempahan',peach:'Pic',blue:'Biru',green:'Hijau',violet:'Ungu',createdAt:'Dicipta',createdBy:'Pengendali',lockRoom:'Kunci bilik',unlockRoom:'Buka kunci bilik',billInfo:'Maklumat bil',channelInfo:'Maklumat saluran',print:'Cetak tab semasa',billExplanation:'Caj, bayaran bersih dan deposit diasingkan. Rekod ujian sahaja; tiada sambungan bank atau lejar am. Pembatalan tidak memulangkan wang secara automatik.',auditLimit:'Rekod berkaitan daripada 500 aktiviti hartanah terkini yang boleh dilihat akaun ini. Log pindah bukan segmen penetapan bertarikh.',channelNotConnected:'Tiada sambungan saluran. Sumber, rujukan dan nota ialah rekod setempat, bukan bukti penyegerakan atau penyelesaian OTA.',legendExplanation:'Petunjuk JOVIAN semasa. Petunjuk penuh SmartOrder belum disahkan. Teks dan sempadan menunjukkan status; warna latar boleh diubah.',colorExplanation:'Warna khas tidak mengubah status penginapan, bayaran atau inventori.',windowDays:'Bilangan hari',groupBy:'Kumpul mengikut',physicalRoom:'Bilik fizikal',compactRows:'Baris padat',bulkExplanation:'Unit ujian dipilih sahaja. Semua perubahan berjaya atau dibatalkan bersama. Unit yang diduduki menolak perubahan pembersihan dan sekatan; tempahan tetap tidak dipindah.',bulkDateExplanation:'Tarikh hanya untuk sekatan / pelepasan, tidak termasuk tarikh akhir. Pembersihan mengubah keadaan semasa.',markDirty:'Tanda kotor',closeRooms:'Sekat unit',openRooms:'Buka tarikh dipilih',selectAll:'Pilih semua unit hartanah',confirmBulk:'Sahkan tindakan ujian dipilih',bulk_clean:'Pembersihan pukal',bulk_block:'Sekatan pukal',bulk_unblock:'Pelepasan pukal'}
}))Object.assign(words[language],values);
for(const language of Object.keys(words))Object.assign(words[language],catalogWords[language],calendarActionWords[language],communicationWords[language],checkinWords[language],nightAuditWords[language]);
Object.assign(words.zh,{salesAlternatives:'独立销售选项，整套与子房不可相加'});
Object.assign(words.en,{salesAlternatives:'Sales alternatives; suites share component capacity'});
Object.assign(words.ms,{salesAlternatives:'Pilihan jualan; suite berkongsi kapasiti komponen'});
bindCatalog({root:$('#content'),getState:()=>state,getProperty:()=>propertyId,getLanguage:()=>lang,t,can,openUtility,commit,closeUtility:()=>$('#utility-dialog').close(),errorText,getUtility:()=>$('#utility-dialog')});
for(const language of Object.keys(words))Object.assign(words[language],{expedia:'Expedia',traveloka:'Traveloka',tiket:'Tiket.com',bookingengine:'Booking Engine',chinesesite:'Chinese Site',rednote:'RedNote',neppan:'NEPPAN',hostelworld:'HostelWorld',tujia:'TuJia',vrbo:'Vrbo',xiaozhu:'XiaoZhu',temairazu:'Temairazu',rakuten:'Rakuten Travel',klook:'Klook'},dashboardWords[language],reservationWords[language],{business:dashboardWords[language].businessSummary,cashflow:dashboardWords[language].cashflowSummary});
Object.assign(words.zh,{openBalances:'尚待分别结清的住宿项（房费和押金不能互抵）',reference:'交易参考号（手工）'});Object.assign(words.en,{openBalances:'Stays with unsettled balances; deposits do not offset room charges',reference:'Transaction reference (manual)'});Object.assign(words.ms,{openBalances:'Penginapan berbaki; deposit tidak menolak caj bilik',reference:'Rujukan transaksi (manual)'});
Object.assign(words.zh,{new:'＋ 新增订单',snapshotEdit:'修改统一每晚价会重设本项逐夜价格；仅改备注或入住人会保留已有逐夜价格。'});Object.assign(words.en,{new:'+ New reservation',snapshotEdit:'Changing the flat nightly rate resets nightly prices. Notes and occupant edits preserve existing nightly prices.'});Object.assign(words.ms,{new:'+ Tempahan baharu',snapshotEdit:'Mengubah kadar tetap menetapkan semula harga semalam. Nota dan penghuni mengekalkan harga sedia ada.'});
function openBoxAction(ids,action,onDone=showOrderBox) {
  const stays=ids.map(id=>state.orders.find(o=>o.id===id&&o.propertyId===propertyId));
  if(!ids.length||stays.some(o=>!o)){ $('#message').textContent=t('scope');return; }
  $('#detail-dialog').close();
  openUtility(action,`<form id="box-action-form"><p>${t('boxNote')}</p><div class="table-wrap"><table><thead><tr>${['guest','allocation','arrival','departure','charge','deposit'].map(k=>`<th>${t(k)}</th>`).join('')}</tr></thead><tbody>${stays.map(o=>`<tr><td>${escape(o.guest)}</td><td>${escape(state.resources.find(r=>r.id===o.resourceId)?.label||t(isBoxed(o)?'boxed':'unassigned'))}</td><td>${o.start}</td><td>${o.end}</td><td>${currency(folio(o).charge)}</td><td>${currency(folio(o).deposit)}</td></tr>`).join('')}</tbody></table></div><label>${t('reason')}<textarea name="reason" required maxlength="200"></textarea></label>${action==='restore_stays'?`<label class="check-label"><input type="checkbox" name="autoAssign">${t('restoreAssign')}</label>`:''}<label class="check-label"><input type="checkbox" name="confirmed" required>${t('boxConfirm')}</label><button class="primary" ${can(action)?'':'disabled'}>${t(action)}</button></form>`);
  $('#box-action-form').onsubmit=async event=>{event.preventDefault();const form=event.target,controls=[...form.querySelectorAll('input,button,textarea')].map(node=>[node,node.disabled]);const command={type:action,orderIds:ids,reason:form.elements.reason.value,autoAssign:form.elements.autoAssign?.checked||false};controls.forEach(([node])=>node.disabled=true);try{await commit(command);$('#utility-dialog').close();onDone();}catch(error){$('#utility-error').textContent=errorText(error);}finally{controls.forEach(([node,disabled])=>node.disabled=disabled);}};
}
function showOrderBox() {
  const stays=state.orders.filter(o=>o.propertyId===propertyId&&o.status==='confirmed'&&isBoxed(o));
  openUtility('boxTitle',`<p>${t('boxNote')}</p><form id="box-selection-form"><div class="table-wrap"><table><thead><tr><th>${t('selection')}</th>${['guest','arrival','departure','charge','action'].map(k=>`<th>${t(k)}</th>`).join('')}</tr></thead><tbody>${stays.map(o=>`<tr><td><input name="orderId" type="checkbox" value="${escape(o.id)}" aria-label="${escape(o.guest+' '+o.start)}"></td><td>${escape(o.guest)}</td><td>${o.start}</td><td>${o.end}</td><td>${currency(folio(o).charge)}</td><td><button type="button" data-open-stay="${escape(o.id)}">${t('details')}</button></td></tr>`).join('')}</tbody></table></div>${stays.length?`<button class="primary" ${can('restore_stays')?'':'disabled'}>${t('restore_stays')}</button>`:`<p>${t('boxEmpty')}</p>`}</form>`);
  $('#box-selection-form').onsubmit=event=>{event.preventDefault();const ids=new FormData(event.target).getAll('orderId');if(!ids.length){$('#utility-error').textContent=t('input');return;}openBoxAction(ids,'restore_stays');};
}
const memoDrafts=new Map();
let orderQuery='',orderStatus='all',orderSource='all',orderInventory='all',orderSettlement='all',orderFrom='',orderTo='',orderDateType='created',orderTab='all';
function homeShortcuts(){
  try{const saved=JSON.parse(localStorage.getItem(`jovian-shortcuts-${backend.user?.id||'local'}-${propertyId}`));if(Array.isArray(saved)&&saved.length&&new Set(saved).size===saved.length&&saved.every(id=>shortcuts.some(r=>r[0]===id)))return saved;}catch{}
  return shortcuts.map(r=>r[0]);
}
function openReservation(id){
  const parent=state.reservations.find(r=>r.id===id&&r.propertyId===propertyId);if(!parent)return;
  const summary=reservationSummary(state,parent,folio);$('#detail-dialog').close();
  openUtility('reservationDetails',`<h3>${escape(parent.guest)}</h3><p>${t(parent.bookingKind)} ${escape(parent.companyName||'')}</p><p>${t('reservationNo')}: ${escape(parent.id)}</p><div class="folio-grid">${Object.entries(summary.totals).map(([key,value])=>`<div><span>${t(key)}</span><strong>${currency(value)}</strong></div>`).join('')}</div><div class="actions">${['box_stays','restore_stays'].map(action=>`<button data-parent-box="${action}" ${can(action)&&summary.stays.some(o=>o.status==='confirmed'&&!o.locked&&isBoxed(o)===(action==='restore_stays'))?'':'disabled'}>${t(action)}</button>`).join('')}</div><h3>${t('partialState')}</h3><p>${t('openBalances')}: ${summary.unsettledStays}</p><p>${Object.entries(summary.counts).map(([key,value])=>`${t(key)}: ${value}`).join(' · ')}</p>${summary.stays.map(stay=>`<section class="stay-card"><div class="panel-head"><strong>${escape(state.resources.find(r=>r.id===stay.resourceId)?.label||t('unassigned'))}</strong><button data-open-stay="${escape(stay.id)}">${t('details')}</button></div><p>${stay.start} ${escape(stay.arrivalTime||'15:00')} → ${stay.end} ${escape(stay.departureTime||'12:00')} · ${t(stay.status)} · ${t(inventoryState(stay))}</p><p>${t('guestCount')}: ${(stay.adults||1)+(stay.children||0)+(stay.infants||0)} · ${t('charge')}: ${currency(folio(stay).charge)} · ${t('due')}: ${currency(folio(stay).due)}</p></section>`).join('')}<h3>${t('reminders')}</h3><p class="muted">${t('reminderNote')}</p>${parent.reminders.map(r=>`<p>${escape(r.when)} · ${escape(r.text)}</p>`).join('')}`);
  $('#utility-body').querySelectorAll('[data-parent-box]').forEach(button=>button.onclick=()=>{const action=button.dataset.parentBox;const ids=summary.stays.filter(o=>o.status==='confirmed'&&!o.locked&&isBoxed(o)===(action==='restore_stays')).map(o=>o.id);openBoxAction(ids,action,()=>openReservation(id));});
}
function reservationList(){
  const all=state.orders.filter(o=>o.propertyId===propertyId),parents=state.reservations.filter(r=>r.propertyId===propertyId);
  const groups=[...parents.map(r=>({id:r.id,parent:true,guest:r.guest,stays:all.filter(o=>r.stayIds.includes(o.id))})),...all.filter(o=>!o.reservationId).map(o=>({id:o.id,parent:false,guest:o.guest,stays:[o]}))];
  const matched=new Set(filterOrders(state,propertyId,businessDate(),{tab:orderTab,query:orderQuery,status:orderStatus,source:orderSource,inventory:orderInventory,from:orderFrom,to:orderTo,dateType:orderDateType}).map(o=>o.id));
  const visible=groups.filter(group=>group.stays.some(o=>matched.has(o.id))&&(orderSettlement==='all'||settlementStatus(group)===orderSettlement));
  const ignoreListDates=['arrivals','departures','created','boxed'].includes(orderTab);
  const selectedColumns=loadColumns(localStorage,backend.user?.id,propertyId);
  return `<section class="panel"><div class="panel-head"><h2>${t('orders')} · ${visible.length}</h2><button data-order-columns>${t('columnSettings')}</button></div><div class="order-tabs" role="tablist">${orderTabs.map(id=>`<button role="tab" aria-selected="${orderTab===id}" data-order-tab="${id}">${t(id)}</button>`).join('')}</div><div class="order-filters"><label>${t('settlement')}<select id="order-settlement">${opts(['all','folioOpen','folioPartial','folioClosed'],orderSettlement)}</select></label><label>${t('inventoryState')}<select id="order-inventory">${opts(['all','reserved','boxed','released'],orderInventory)}</select></label><label>${t('search')}<input id="order-query" value="${escape(orderQuery)}" maxlength="200"></label><label>${t('status')}<select id="order-status">${opts(['all','confirmed','checked_in','checked_out','cancelled'],orderStatus)}</select></label><label>${t('source')}<select id="order-source">${opts(['all',...sourceValues],orderSource)}</select></label><label>${t('date')}<select id="order-date-type" ${ignoreListDates?'disabled':''}><option value="start" ${orderDateType==='start'?'selected':''}>${t('arrival')}</option><option value="end" ${orderDateType==='end'?'selected':''}>${t('departure')}</option><option value="created" ${orderDateType==='created'?'selected':''}>${t('createdAt')}</option><option value="overlap" ${orderDateType==='overlap'?'selected':''}>${t('stayInfo')}</option></select></label><label>${t('arrival')}<input id="order-from" ${ignoreListDates?'disabled':''} type="date" value="${orderFrom}"></label><label>${t('departure')}<input id="order-to" ${ignoreListDates?'disabled':''} type="date" value="${orderTo}"></label></div>${renderOrderTable(visible,selectedColumns,{lang,folio,currency,t,resources:state.resources})}${visible.length?'':`<p class="empty">${t('empty')}</p>`}</section>`;
}
const financeFilters=new Map();
const arSelection=new Map();
function financialSummary(kind){
 if(kind==='arReports'){
  const date=state.businessDates?.[propertyId]||businessDate();
  return arReportsPage(state,{propertyId,from:date.slice(0,7)+'-01',to:date,...financeFilters.get(propertyId+'|'+kind),t,currency,can});
 }
 if(kind==='arLedger')return arLedgerPage(state,{propertyId,selected:arSelection.get(propertyId),t,currency,can});
 const key=propertyId+'|'+kind;
 if(kind==='managerDaily'||kind==='guestLedger'){
  const filters=financeFilters.get(key)||{date:businessDate(),source:'all'};
  const options={propertyId,date:filters.date,source:filters.source,sources:sourceValues,t,currency,lang};
  return kind==='managerDaily'?managerReportPage(state,options):guestLedgerPage(state,options);
 }
 if(['roomCharge','roomBusiness','roomMovement','extraCharge','cancellation','occupants','registration','commission'].includes(kind)){
  const filters=financeFilters.get(key)||{from:businessDate(),to:businessDate(),source:'all',dimension:'date',basis:'arrival'};
  const options={propertyId,from:filters.from,to:filters.to,source:filters.source,sources:sourceValues,t,currency,lang};
  if(kind==='roomCharge')return roomChargePage(state,options);
  if(kind==='roomBusiness')return roomBusinessPage(state,{...options,dimension:filters.dimension});
  if(kind==='roomMovement')return roomMovementPage(state,{...options,movement:filters.movement||'all'});
  if(kind==='extraCharge')return extraChargePage(state,options);
  if(kind==='cancellation')return cancellationPenaltyPage(state,options);
  if(kind==='occupants')return roomOccupantPage(state,{...options,basis:filters.basis||'arrival'});
  if(kind==='registration')return registrationRecordPage(state,{...options,basis:filters.basis||'arrival'});
  return commissionPeriodPanel(state,{...options,can})+commissionPage(state,{...options,can});
 }
 if(kind==='comparison'){
  if(!financeFilters.has(key)){const defaults=defaultComparisonPeriods(businessDate(),businessDate());financeFilters.set(key,{source:'all',...Object.fromEntries(Object.entries(defaults).flatMap(([period,dates])=>[[period+'From',dates.from],[period+'To',dates.to]]))});}
  const filters=financeFilters.get(key),periods=Object.fromEntries(['current','month','year'].map(period=>[period,{from:filters[period+'From'],to:filters[period+'To']}]));
  return comparisonPage(state,{propertyId,periods,source:filters.source,sources:sourceValues,t,currency});
 }
 const filters=financeFilters.get(key)||{from:businessDate(),to:businessDate(),source:'all'};
 return financialPage(state,{kind,propertyId,...filters,sources:sourceValues,lang,t,currency});
}
$('#content').addEventListener('change',event=>{const field=event.target.dataset.financeFilter;
if(!field||!['from','to','date','source','dimension','movement','basis','transactionKind','method','operator','arReport','currentFrom','currentTo','monthFrom','monthTo','yearFrom','yearTo'].includes(field))return;const key=propertyId+'|'+view;const date=view==='arReports'?(state.businessDates?.[propertyId]||businessDate()):businessDate();const filters=financeFilters.get(key)||{from:view==='arReports'?date.slice(0,7)+'-01':date,to:date,source:'all'};financeFilters.set(key,{...filters,[field]:event.target.value});render();});


// Team access. A new member and a change to an existing one go through the same
// audited server command, so nothing here can grant a role the server would refuse.
$('#content').addEventListener('submit',async event=>{
  if(event.target.id!=='member-new')return;
  event.preventDefault();
  const data=new FormData(event.target),propertyIds=[...new Set(data.getAll('properties').filter(Boolean))];
  try{await commit({type:'member_save',username:String(data.get('username')||'').trim(),password:String(data.get('password')||''),role:String(data.get('role')||''),propertyIds});render();}
  catch(error){$('#message').textContent=errorText(error);}
});
// Roles. A role is saved as the exact set of ticked actions, so the page and the
// server agree on what a role allows without either side keeping a second list.
$('#content').addEventListener('submit',async event=>{
  const form=event.target;
  if(form.id!=='role-new'&&!form.dataset.roleForm&&!form.dataset.permsForm)return;
  if(form.dataset.permsForm){
    if(!backend.shared){$('#message').textContent=t('teamSharedOnly');return;}
    event.preventDefault();
    const actions=[...new Set([...new FormData(form).getAll('actions').filter(Boolean)])];
    const button=form.querySelector('button.primary');
    if(button)button.disabled=true;
    try{
      await commit({type:'member_permission_save',username:form.dataset.permsForm,actions});
      render();
    }catch(error){$('#message').textContent=errorText(error);}
    finally{if(button)button.disabled=false;}
    return;
  }
  event.preventDefault();
  if(!backend.shared){$('#message').textContent=t('teamSharedOnly');return;}
  const data=new FormData(form),actions=[...new Set(data.getAll('actions').filter(Boolean))];
  const name=String(data.get('name')||'').trim();
  const button=form.querySelector('button.primary');
  if(button)button.disabled=true;
  try{
    await commit({type:'role_save',...(form.dataset.roleForm?{roleId:form.dataset.roleForm}:{}),name,actions});
    render();
  }catch(error){$('#message').textContent=errorText(error);}
  finally{if(button)button.disabled=false;}
});
$('#content').addEventListener('click',async event=>{
  const drop=event.target.closest('[data-role-delete]');
  if(!drop)return;
  event.preventDefault();
  if(!confirm(t('roleDeleteConfirm')))return;
  if(!backend.shared){$('#message').textContent=t('teamSharedOnly');return;}
  drop.disabled=true;
  try{ await commit({type:'role_delete',roleId:drop.dataset.roleDelete}); render(); }
  catch(error){$('#message').textContent=errorText(error);drop.disabled=false;}
});
$('#content').addEventListener('submit',async event=>{
  if(event.target.id!=='site-form')return;
  event.preventDefault();
  const form=event.target;
  // Three languages are collected per field, so a missing language is stored as an
  // empty string rather than silently reusing another language.
  const texts={};
  for(const input of form.querySelectorAll('[data-site-text]')){
    const name=input.dataset.siteText;
    (texts[name]??={})[input.dataset.siteLang]=input.value.trim();
  }
  try{
    await commit({type:'site_save',slug:form.elements.slug.value.trim()||null,enabled:form.elements.enabled.value==='true',
      ...texts,roomTypeIds:[...form.elements.roomTypes.selectedOptions].map(o=>o.value),
      planCodes:[...form.elements.plans.selectedOptions].map(o=>o.value)});
    render();
  }catch(error){$('#message').textContent=errorText(error);}
});
// A property's notice priorities are a setting rather than a business command. The
// form carries every known kind, and 'default' means follow the current system rule.
$('#content').addEventListener('submit',async event=>{
  if(event.target.id!=='notice-severity-form')return;
  event.preventDefault();
  const levels={};
  for(const select of event.target.querySelectorAll('[data-notice-level]'))levels[select.name]=select.value;
  try{await commit({type:'notice_severity_save',levels});render();}
  catch(error){$('#message').textContent=errorText(error);}
});
// A conditional rule is a setting too. The count is left empty to disable that kind;
// only a whole-number threshold and a known level are ever sent, and the shared
// backend validates them again so the desk cannot invent a rule of its own.
$('#content').addEventListener('submit',async event=>{
  if(event.target.id!=='notice-rule-form')return;
  event.preventDefault();
  const rules={};
  for(const input of event.target.querySelectorAll('[data-notice-rule-at-least]')){
    const kind=input.dataset.noticeRuleAtLeast;
    const raw=String(input.value||'').trim();
    if(!raw){rules[kind]='default';continue;}
    const level=event.target.querySelector(`[data-notice-rule-level="${kind}"]`)?.value||'urgent';
    rules[kind]={atLeast:Number(raw),level};
  }
  try{await commit({type:'notice_rule_save',rules});render();}
  catch(error){$('#message').textContent=errorText(error);}
});
// A channel commission is a real figure read off an invoice, never a calculated rate.
$('#content').addEventListener('submit',async event=>{
  if(event.target.id==='commission-close-form'){
    event.preventDefault();
    try{await commit({type:'commission_close_month',month:new FormData(event.target).get('month')});}
    catch(error){$('#message').textContent=errorText(error);}
    return;
  }
  if(event.target.id!=='commission-form')return;
  event.preventDefault();
  const form=event.target;
  try{
    await commit({type:'commission_save',orderId:form.elements.orderId.value,
      amount:toMinor(form.elements.amount.value),reference:form.elements.reference.value.trim(),
      note:form.elements.note.value.trim(),settled:form.elements.settled.checked});
    render();
  }catch(error){$('#message').textContent=errorText(error);}
});
$('#content').addEventListener('click',async event=>{
  // Clearing test bookings is destructive: the page asks before writing anything, and
  // only stays whose guest name starts with the prefix given are removed.
  const runButton=event.target.closest('[data-cleanup-run]');
  if(runButton){
    event.preventDefault();
    if(!confirm(t('cleanupConfirm')))return;
    const input=$('#content [data-cleanup-prefix]');
    runButton.disabled=true;
    try{ await commit({type:'purge_test_orders',prefix:(input?.value||'').trim()||'TEST'});render(); }
    catch(error){$('#message').textContent=errorText(error);runButton.disabled=false;}
    return;
  }
  const button=event.target.closest('[data-member-apply]');if(!button)return;
  const username=button.dataset.memberApply;
  const pick=(attr,key)=>[...document.querySelectorAll(`#content [data-member-${attr}]`)].find(node=>node.dataset[key]===username);
  const password=pick('password','memberPassword')?.value||'';
  const propertyRole=pick('property-role','memberPropertyRole')?.value||'';
  button.disabled=true;
  try{
    await commit({type:'member_save',username,role:pick('role','memberRole')?.value,active:pick('active','memberActive')?.value!=='false',
      propertyRoles:{[propertyId]:propertyRole||null},...(password?{password}:{})});
    render();
  }catch(error){$('#message').textContent=errorText(error);}
  finally{button.disabled=false;}
});
// Booking requests raised from the published site. Accepting one is what creates the
// booking, so it is confirmed first and then taken through the ordinary command path;
// declining only records why and never touches inventory.
$('#content').addEventListener('click',async event=>{
  const accept=event.target.closest('[data-request-accept]');
  if(accept){
    event.preventDefault();
    if(!confirm(t('requestConfirm')))return;
    accept.disabled=true;
    try{ await commit({type:'booking_request_decision',requestId:accept.dataset.requestAccept,decision:'accept'});render(); }
    catch(error){$('#message').textContent=errorText(error);accept.disabled=false;}
    return;
  }
  const decline=event.target.closest('[data-request-decline]');
  if(!decline)return;
  event.preventDefault();
  const reason=document.querySelector(`#content [data-request-reason="${decline.dataset.requestDecline}"]`);
  decline.disabled=true;
  try{ await commit({type:'booking_request_decision',requestId:decline.dataset.requestDecline,decision:'decline',reason:(reason?.value||'').trim()});render(); }
  catch(error){$('#message').textContent=errorText(error);decline.disabled=false;}
});

function showQueue(queue){
  const orders=queueOrders(state,propertyId,businessDate(),queue),n=new Set(orders.map(o=>o.reservationId||o.id)).size;
  openUtility(queue,`<p>${t('orders')}: ${n} · ${t('stays')}: ${orders.length} · ${t('guestCount')}: ${orders.reduce((n,o)=>n+(o.adults||1)+(o.children||0)+(o.infants||0),0)}</p><div class="table-wrap"><table><thead><tr>${['guest','allocation','arrival','departure','status','due','action'].map(k=>`<th>${t(k)}</th>`).join('')}</tr></thead><tbody>${orders.map(o=>`<tr><td>${escape(o.guest)}</td><td>${escape(state.resources.find(r=>r.id===o.resourceId)?.label||t('unassigned'))}</td><td>${o.start}</td><td>${o.end}</td><td>${t(o.status)}</td><td>${currency(folio(o).due)}</td><td><button data-open-stay="${escape(o.id)}">${t('details')}</button></td></tr>`).join('')}</tbody></table></div>${orders.length?'':`<p>${t('queueEmpty')}</p>`}`);
}
$('#content').addEventListener('change',event=>{const map={'order-settlement':v=>orderSettlement=v,'order-inventory':v=>orderInventory=v,'order-query':v=>orderQuery=v,'order-status':v=>orderStatus=v,'order-source':v=>orderSource=v,'order-date-type':v=>orderDateType=v,'order-from':v=>orderFrom=v,'order-to':v=>orderTo=v};if(map[event.target.id]){map[event.target.id](event.target.value);render();}});
$('#content').addEventListener('input',event=>{if(event.target.id==='home-memo')memoDrafts.set(propertyId,event.target.value);});
function openLinkedRecord(event){const stay=event.target.closest('[data-open-stay]'),parent=event.target.closest('[data-open-reservation]');if(stay){$('#utility-dialog').close();openDetail(stay.dataset.openStay);}if(parent)openReservation(parent.dataset.openReservation);}
$('#content').addEventListener('click',openLinkedRecord);$('#utility-body').addEventListener('click',openLinkedRecord);
$('#content').addEventListener('click',async event=>{
  const target=event.target.closest('[data-home]'),queue=event.target.closest('[data-home-queue]');if(queue){showQueue(queue.dataset.homeQueue);return;}if(!target)return;
  const action=target.dataset.home;
  if(['calendar','overview','orders'].includes(action)){view=action;render();return;}
  if(['business','cashflow','nightAudit'].includes(action)){view=action;render();return;}
  if(action==='room-summary'){const data=dashboard(state,propertyId,businessDate());openUtility('propertySummary',`<div class="table-wrap"><table><thead><tr><th>${t('product')}</th><th>${t('capacity')}</th><th>${t('sold')}</th></tr></thead><tbody>${['room','bed'].map(k=>`<tr><td>${t(k)}</td><td>${data.today[k].available}</td><td>${data.today[k].sold}</td></tr>`).join('')}</tbody></table></div><p>${t('statisticsNote')}</p>`);return;}
  if(action==='save-memo'){const text=$('#home-memo').value;target.disabled=true;try{await commit({type:'memo_save',text});memoDrafts.delete(propertyId);render();}catch(error){$('#memo-status').textContent=errorText(error);target.disabled=!can('memo_save');}return;}
  if(action==='configure'){
    const selected=new Set(homeShortcuts()),order=[...selected,...shortcuts.map(s=>s[0]).filter(id=>!selected.has(id))];
    function form(){openUtility('commonFunctions',`<p>${t('shortcutsNote')}</p><form id="shortcut-form">${order.map((id,i)=>`<div class="shortcut-config"><label class="check-label"><input type="checkbox" name="shortcut" value="${id}" ${selected.has(id)?'checked':''}>${t(shortcuts.find(s=>s[0]===id)[1])}</label><button type="button" data-move="${i}" data-direction="-1" ${i===0?'disabled':''}>${t('moveUp')}</button><button type="button" data-move="${i}" data-direction="1" ${i===order.length-1?'disabled':''}>${t('moveDown')}</button></div>`).join('')}<button class="primary">${t('apply')}</button></form>`);
      $('#shortcut-form').onchange=event=>{if(event.target.checked)selected.add(event.target.value);else selected.delete(event.target.value);};
      $('#shortcut-form').onclick=event=>{const b=event.target.closest('[data-move]');if(!b)return;const i=Number(b.dataset.move),j=i+Number(b.dataset.direction);[order[i],order[j]]=[order[j],order[i]];form();};
      $('#shortcut-form').onsubmit=event=>{event.preventDefault();const items=new FormData(event.target).getAll('shortcut');if(!items.length){$('#utility-error').textContent=t('minimumOne');return;}try{localStorage.setItem(`jovian-shortcuts-${backend.user?.id||'local'}-${propertyId}`,JSON.stringify(items));$('#utility-dialog').close();render();}catch{$('#utility-error').textContent=t('storage');}};
    }form();
  }
});
calendarInteractions=bindCalendarActions({root:$('#content'),getState:()=>state,getProperty:()=>propertyId,getPlan:()=>preview(state,propertyId),businessDate,t,can,commit,openUtility,closeUtility:()=>$('#utility-dialog').close(),openComposer:options=>composer.open(options),errorText});
const composer=createComposer({getState:()=>state,getProperty:()=>propertyId,getLanguage:()=>lang,businessDate,t,can,commit,currency,onSaved:id=>{if(id)openReservation(id);},sources:sourceValues});
communications=createCommunications({backend,getProperty:()=>propertyId,getState:()=>state,getLanguage:()=>lang,getContext:()=>view,can,t,openUtility,closeUtility:()=>$('#utility-dialog').close(),errorText});
selfCheckinUI=createCheckinAdmin({backend,getProperty:()=>propertyId,getState:()=>state,can,t,openUtility,closeUtility:()=>$('#utility-dialog').close(),errorText,toMinor});
$('#technical-support').onclick=()=>{if(!selfCheckinUI.leave())return;communications.openSupport();};$('#guest-messages').onclick=()=>{if(!selfCheckinUI.leave())return;communications.openMessages();};$('#help-center').onclick=()=>{if(!selfCheckinUI.leave())return;communications.openHelp();};$('#self-checkin').onclick=()=>{if(leaveDialogs())selfCheckinUI.open();};
for(const language of Object.keys(words))Object.assign(words[language],shellWords[language],teamWords[language],siteWords[language],requestWords[language],noticeWords[language],cleanupWords[language]);
Object.assign(words.zh,{calendar:'日历',orders:'住宿订单',overview:'房情表',new:'新增订单',guest:'姓名',details:'详细信息',source:'渠道',guestLanguage:'偏好语言',channelOrderId:'渠道订单号',notes:'备注',propertySummary:'房情表',singleDay:'单日',businessSummary:'房费总览',memo:'备忘录',created:'今日新办',exceptions:'异常订单',pending:'待处理退款',print:'打印'});

function openOrderColumns(){
 const selected=loadColumns(localStorage,backend.user?.id,propertyId);
 const order=[...selected,...columns.map(c=>c.id).filter(id=>!selected.includes(id))];
 openUtility('columnSettings',`<form id="order-columns-form"><p>${t('columnsNote')}</p><div class="actions"><button type="button" data-columns-all>${t('allColumns')}</button><button type="button" data-columns-reset>${t('resetColumns')}</button></div><div class="order-column-options">${order.map(id=>`<label class="check-label"><input type="checkbox" name="column" value="${id}" ${selected.includes(id)?'checked':''}>${escape(columnLabel(id,lang))}</label>`).join('')}</div><button class="primary">${t('columnsApply')}</button></form>`);
 const form=$('#order-columns-form');
 form.onclick=event=>{if(event.target.closest('[data-columns-all]'))form.querySelectorAll('[name=column]').forEach(n=>n.checked=true);if(event.target.closest('[data-columns-reset]'))form.querySelectorAll('[name=column]').forEach(n=>n.checked=defaultColumns.includes(n.value));};
 form.onsubmit=event=>{event.preventDefault();const values=new FormData(form).getAll('column');if(!values.length){$('#utility-error').textContent=t('columnsMinimum');return;}try{saveColumns(localStorage,backend.user?.id,propertyId,values);$('#utility-dialog').close();render();}catch{$('#utility-error').textContent=t('storage');}};
}
$('#content').addEventListener('click',event=>{if(event.target.closest('[data-order-columns]'))openOrderColumns();});
for(const language of Object.keys(words))Object.assign(words[language],columnsWords[language]);

Object.assign(words.zh,{boxed:'订单盒子',deletedResource:'房型/房间已删除'});Object.assign(words.en,{boxed:'Order box',deletedResource:'Deleted room / type'});Object.assign(words.ms,{boxed:'Kotak tempahan',deletedResource:'Bilik / jenis dipadam'});
$('#content').addEventListener('click',event=>{const button=event.target.closest('[data-order-tab]');if(button){orderTab=button.dataset.orderTab;render();}});
for(const language of Object.keys(words))Object.assign(words[language],financialWords[language]);
async function boot(){
  calendarDate=localDay(new Date().toISOString());$('#date').value=calendarDate;
  // A trial signup lands here after a redirect from the plain form: the account and its
  // empty store already exist, so the login dialog just needs to say so.
  const params=new URLSearchParams(window.location?.search||'');
  if(params.get('signup')){
    try{
      const key=params.get('store')?'signupDoneStore':'signupDone';
      $('#login-error').textContent=(words[lang]?.[key]||'')+' '+params.get('signup')+(params.get('store')?` (${params.get('store')})`:'');
    }catch{}
    window.history?.replaceState(null,'',window.location.pathname);
  }
  try{
    await backend.connect();
    if(backend.shared){
      for(const language of Object.keys(words)){words[language].local=words[language].shared;words[language].footer=words[language].sharedFooter;}
      if(!backend.user){showLogin();return;}
      await refreshShared();document.body.classList.remove('auth-pending');showPropertyPicker();
    }else{
      try{const saved=JSON.parse(localStorage.getItem(key));if(saved?.version===1&&Array.isArray(saved.audit)){saved.properties.forEach(p=>preview(saved,p.id));state=upgradeCatalog(saved);}}catch{}
      render();document.body.classList.remove('auth-pending');showPropertyPicker();
    }
  }catch(e){$('#message').textContent=t('connection');document.body.classList.remove('auth-pending');}
}
await boot();


function rateLabel(zh,en,ms){return ({zh,en,ms})[lang]||en;}
function openRates(){
 const types=state.roomTypes.filter(r=>r.propertyId===propertyId&&!r.archived),plans=(state.ratePlans||[]).filter(r=>r.propertyId===propertyId);
 const typeOptions=types.map(r=>'<option value="'+escape(r.id)+'">'+escape(typeName(r,lang,r.id))+'</option>').join('');
 openUtility('rateManagement','<h3>'+rateLabel('价格计划列表','Rate plans','Senarai pelan')+'</h3><div class="table-wrap"><table><tbody>'+plans.map(p=>'<tr><td>'+escape(p.code)+'</td><td>'+escape(p.name)+'</td><td>'+escape(p.kind==='derived'?rateLabel('派生','Derived','Terbitan'):rateLabel('独立','Independent','Bebas'))+'</td><td>'+escape(p.parentCode||'—')+'</td><td>'+escape(p.archived?rateLabel('已归档','Archived','Diarkib'):rateLabel('启用','Active','Aktif'))+'</td></tr>').join('')+'</tbody></table></div><form id="rate-archive-form"><label>'+rateLabel('归档计划','Archive plan','Arkib pelan')+'<select name="planCode">'+plans.filter(p=>!p.archived).map(p=>'<option value="'+escape(p.code)+'">'+escape(p.name)+'</option>').join('')+'</select></label><label><input name="confirmed" type="checkbox" required>'+rateLabel('确认归档；保留历史及已有订单','Confirm archive; history and booked orders remain','Sahkan arkib; sejarah dan tempahan dikekalkan')+'</label><button '+(can('rate_plan_archive')?'':'disabled')+'>'+rateLabel('归档','Archive','Arkib')+'</button></form><form id="rate-plan-form"><h3>'+rateLabel('新增价格计划','New rate plan','Pelan kadar baharu')+'</h3><label>'+rateLabel('编码（字母数字，最多8位）','Code (alphanumeric, max 8)','Kod (maksimum 8)')+'<input name="code" required pattern="[A-Za-z0-9]{1,8}" maxlength="8"></label><label>'+rateLabel('名称','Name','Nama')+'<input name="name" required maxlength="100"></label><label>'+rateLabel('房型','Room type','Jenis bilik')+'<select name="roomTypeId">'+typeOptions+'</select></label><label>'+rateLabel('独立父计划（空白为独立价）','Independent parent (blank creates independent plan)','Pelan induk (kosong untuk bebas)')+'<select name="parentCode"><option value="">—</option>'+plans.filter(p=>p.kind==="independent"&&!p.archived).map(p=>'<option value="'+escape(p.code)+'">'+escape(p.name)+'</option>').join('')+'</select></label><label>'+rateLabel('派生规则','Derivation rule','Peraturan terbitan')+'<select name="adjustmentMode"><option value="delta">MYR</option><option value="percent">%</option></select></label><label>'+rateLabel('加减值（负数减少）','Adjustment (negative reduces)','Pelarasan (negatif kurang)')+'<input name="adjustment" type="number" step="0.01" value="0" required></label><label>'+rateLabel('取消政策','Cancellation policy','Polisi pembatalan')+'<select name="policyKind"><option value="inherit">'+rateLabel('沿用父政策／人工核定','Inherit parent / manual','Ikut induk / manual')+'</option><option value="free">'+rateLabel('免费取消','Free cancellation','Pembatalan percuma')+'</option><option value="nonrefundable">'+rateLabel('不可退款','Non-refundable','Tidak boleh dipulangkan')+'</option><option value="partial">'+rateLabel('部分退款','Partially refundable','Sebahagian boleh dipulangkan')+'</option><option value="flexible">'+rateLabel('灵活取消','Flexible cancellation','Pembatalan fleksibel')+'</option></select></label><label>'+rateLabel('罚金百分比','Penalty percentage','Peratus penalti')+'<input name="policyPercent" type="number" min="0" max="100" step="0.01" value="0"></label><label>'+rateLabel('免费截止：入住前天数','Free deadline: days before arrival','Tarikh akhir percuma: hari sebelum tiba')+'<input name="policyDays" type="number" min="0" max="730" step="1" value="0"></label><label>'+rateLabel('截止时刻（马来西亚）','Deadline time (Malaysia)','Masa akhir (Malaysia)')+'<input name="policyTime" type="time" value="15:00"></label><label>'+rateLabel('灵活罚金基数','Flexible penalty basis','Asas penalti fleksibel')+'<select name="policyBasis"><option value="total">'+rateLabel('总房费','Total room fees','Jumlah caj bilik')+'</option><option value="firstNight">'+rateLabel('首晚房费','First night','Malam pertama')+'</option></select></label><button '+(can('rate_plan_save')?'':'disabled')+'>'+rateLabel('创建计划','Create plan','Cipta pelan')+'</button></form><form id="rate-bulk-form"><h3>'+rateLabel('批量固定价','Bulk fixed price','Harga tetap pukal')+'</h3><label>'+rateLabel('价格计划','Rate plan','Pelan kadar')+'<select name="planCode">'+plans.filter(p=>p.kind==='independent'&&!p.archived).map(p=>'<option value="'+escape(p.code)+'">'+escape(p.name)+'</option>').join('')+'</select></label><label>'+rateLabel('房型','Room type','Jenis bilik')+'<select name="roomTypeId">'+typeOptions+'</select></label><label>'+t('arrival')+'<input name="from" type="date" required></label><label>'+t('departure')+'<input name="to" type="date" required></label><div id="extra-rate-ranges"></div><button type="button" data-add-rate-range>＋'+rateLabel('添加日期区间','Add date range','Tambah julat tarikh')+'</button><label>'+rateLabel('调整模式','Adjustment mode','Mod pelarasan')+'<select name="priceMode"><option value="fixed">'+rateLabel('固定金额','Fixed price','Harga tetap')+'</option><option value="delta">'+rateLabel('当前价加减金额','Amount adjustment','Pelarasan amaun')+'</option><option value="percent">'+rateLabel('当前价加减百分比','Percentage adjustment','Pelarasan peratus')+'</option></select></label><label>'+rateLabel('金额MYR／百分比%（负数表示减少）','MYR / % (negative reduces)','MYR / % (negatif mengurangkan)')+'<input name="amount" type="number" min="-1000000" max="1000000" step="0.01" required></label><label>'+rateLabel('销售','Sales','Jualan')+'<select name="sale"><option value="unchanged">'+rateLabel('不修改','Unchanged','Kekal')+'</option><option value="open">'+rateLabel('允许','Open','Buka')+'</option><option value="closed">'+rateLabel('停售','Closed','Tutup')+'</option></select></label><fieldset><legend>'+rateLabel('适用星期','Weekdays','Hari minggu')+'</legend>'+[1,2,3,4,5,6,7].map(n=>'<label><input type="checkbox" name="weekday" value="'+n+'" checked>'+escape(new Intl.DateTimeFormat(lang,{weekday:'short',timeZone:'UTC'}).format(new Date(Date.UTC(2027,0,3+n))))+'</label>').join('')+'</fieldset><label>'+rateLabel('最短住宿（空白不修改，0清除）','Minimum nights (blank keeps, 0 clears)','Malam minimum (kosong kekal, 0 padam)')+'<input name="minStay" type="number" min="0" max="366" step="1"></label><label>'+rateLabel('最长住宿（空白不修改，0清除）','Maximum nights (blank keeps, 0 clears)','Malam maksimum (kosong kekal, 0 padam)')+'<input name="maxStay" type="number" min="0" max="366" step="1"></label>'+['cta','ctd'].map(k=>'<label>'+ (k==='cta'?rateLabel('抵达限制','Arrival restriction','Sekatan ketibaan'):rateLabel('离店限制','Departure restriction','Sekatan berlepas'))+'<select name="'+k+'"><option value="">'+rateLabel('不修改','Unchanged','Kekal')+'</option><option value="true">'+rateLabel('禁止','Prohibit','Larang')+'</option><option value="false">'+rateLabel('允许','Allow','Benarkan')+'</option></select></label>').join('')+'<label><input name="confirmed" type="checkbox" required>'+rateLabel('确认更新以上日期范围（含首尾日期）','Confirm inclusive date range update','Sahkan kemas kini julat termasuk hujung')+'</label><button '+(can('rates_bulk_update')&&plans.length?'':'disabled')+'>'+t('apply')+'</button></form>');

 $('#utility-body').insertAdjacentHTML('beforeend','<h3>'+rateLabel('14天房价日历','14-day rate calendar','Kalendar kadar 14 hari')+'</h3><p>'+rateLabel('—表示未设价；0/0表示未设最短/最长限制；CTA/CTD的×表示禁止抵达/离店。停售不等于库存售罄。','— means no price; 0/0 means no min/max restriction; CTA/CTD × prohibits arrival/departure. Closed sales do not mean sold out.','— bermakna tiada harga; 0/0 tiada had min/maks; CTA/CTD × melarang tiba/berlepas. Tutup jualan bukan habis bilik.')+'</p>'+rateCalendar(state,{propertyId,start:businessDate(),currency,t,availability:(id,day)=>rateAvailability(state,propertyId,id,day,businessDate())}));
 const changes=(state.rateChanges||[]).filter(r=>r.propertyId===propertyId).slice(-100).reverse();
 $('#utility-body').insertAdjacentHTML('beforeend','<h3>'+rateLabel('最近100条价格变更','Latest 100 rate changes','100 perubahan kadar terkini')+'</h3><div class="table-wrap"><table><thead><tr>'+[rateLabel('价格日期','Rate date','Tarikh kadar'),rateLabel('计划 / 房型','Plan / room type','Pelan / jenis bilik'),rateLabel('原值','Before','Sebelum'),rateLabel('新值','After','Selepas'),rateLabel('操作人 / 时间 / 批次','Actor / time / batch','Pelaku / masa / kelompok')].map(h=>'<th>'+escape(h)+'</th>').join('')+'</tr></thead><tbody>'+changes.map(r=>'<tr><td>'+escape(r.after.date)+'</td><td>'+escape(r.after.planCode)+' / '+escape(typeName(types.find(t=>t.id===r.after.roomTypeId)||{},lang,r.after.roomTypeId))+'</td><td>'+rateHistoryValue(r.before)+'</td><td>'+rateHistoryValue(r.after)+'</td><td>'+escape(r.actor||'—')+'<small>'+escape(r.at||'—')+'</small><small>'+escape(r.batchId||'—')+'</small></td></tr>').join('')+'</tbody></table></div>');
 $('#rate-archive-form').onsubmit=async e=>{e.preventDefault();const v=Object.fromEntries(new FormData(e.target));try{await commit({type:'rate_plan_archive',planCode:v.planCode});openRates();}catch(err){$('#utility-error').textContent=errorText(err);}};
 $('#rate-plan-form').onsubmit=async e=>{e.preventDefault();const v=Object.fromEntries(new FormData(e.target));try{await commit({type:'rate_plan_save',code:v.code,name:v.name,roomTypeIds:[v.roomTypeId],...(v.policyKind!=='inherit'?{cancellationPolicy:{kind:v.policyKind,percent:toMinor(v.policyPercent||'0'),days:Number(v.policyDays),time:v.policyTime,basis:v.policyBasis}}:{}),...(v.parentCode?{parentCode:v.parentCode,adjustmentMode:v.adjustmentMode,adjustment:(v.adjustment.startsWith('-')?-1:1)*toMinor(v.adjustment.replace(/^[-+]/,''))}:{})});openRates();}catch(err){$('#utility-error').textContent=errorText(err);}};
 $('#rate-bulk-form').onclick=e=>{if(!e.target.closest('[data-add-rate-range]'))return;const target=$('#extra-rate-ranges');if(target.children.length>=19){$('#utility-error').textContent=rateLabel('最多20段日期','Up to 20 date ranges','Maksimum 20 julat');return;}target.insertAdjacentHTML('beforeend','<div class="form-row"><label>'+rateLabel('开始日期','From','Mula')+'<input name="extraFrom" type="date" required></label><label>'+rateLabel('结束日期','To','Akhir')+'<input name="extraTo" type="date" required></label></div>');};
 $('#rate-bulk-form').onsubmit=async e=>{e.preventDefault();const v=Object.fromEntries(new FormData(e.target));try{await commit({type:'rates_bulk_update',planCode:v.planCode,roomTypeIds:[v.roomTypeId],ranges:[{from:v.from,to:v.to},...new FormData(e.target).getAll('extraFrom').map((from,i)=>({from,to:new FormData(e.target).getAll('extraTo')[i]}))],weekdays:new FormData(e.target).getAll('weekday').map(Number),priceMode:v.priceMode,amount:(v.amount.startsWith('-')?-1:1)*toMinor(v.amount.replace(/^[-+]/,'')),sale:v.sale,...Object.fromEntries(['minStay','maxStay'].filter(k=>v[k]!=='').map(k=>[k,Number(v[k])])),...Object.fromEntries(['cta','ctd'].filter(k=>v[k]!=='').map(k=>[k,v[k]==='true']))});openRates();}catch(err){$('#utility-error').textContent=errorText(err);}};
}
$('#content').addEventListener('click',e=>{if(e.target.closest('[data-rates-open]'))openRates();});

Object.assign(words.zh,{rateManagement:'房价管理'});Object.assign(words.en,{rateManagement:'Rate management'});Object.assign(words.ms,{rateManagement:'Pengurusan kadar'});

function rateHistoryValue(row){if(!row)return '—';return escape(currency(row.amount))+' · '+escape(row.sale)+' · '+escape(rateLabel('最短/最长','Min/max','Min/maks'))+': '+escape(row.minStay||0)+'/'+escape(row.maxStay||0)+' · CTA: '+escape(row.cta?'×':'✓')+' · CTD: '+escape(row.ctd?'×':'✓');}

Object.assign(words.zh,{open:'允许销售',closed:'停售'});Object.assign(words.en,{open:'Open for sale',closed:'Closed to sale'});Object.assign(words.ms,{open:'Dibuka untuk jualan',closed:'Ditutup untuk jualan'});

const ratePageDates=new Map();
$('#content').addEventListener('change',e=>{if(e.target.id==='rate-page-date'&&e.target.validity.valid&&e.target.value){ratePageDates.set(propertyId,e.target.value);render();}});
Object.assign(words.zh,{rates:'房价房量',rateInventory:'房价房量'});Object.assign(words.en,{rates:'Rates and availability',rateInventory:'Rates and availability'});Object.assign(words.ms,{rates:'Kadar dan ketersediaan',rateInventory:'Kadar dan ketersediaan'});

Object.assign(words.zh,{settlement:"结账状态",folioPartial:"部分结账",folioClosed:'已结账',folioOpen:'未结账',settle:'确认结账',settleNote:'房费和押金分别结清后才能结账；结账后修改账务需管理员重开。',settleConfirm:'确认该住宿项已核对结清',reopenFolio:'重开账单',reopenConfirm:'确认重开并保留审计记录',folio_closed:'账单已结账，需管理员重开后修改。'});Object.assign(words.en,{settlement:"Settlement status",folioPartial:"Partially settled",folioClosed:'Settled',folioOpen:'Not settled',settle:'Settle folio',settleNote:'Room balance and deposits must both be cleared. Financial changes require administrator reopening.',settleConfirm:'Confirm this stay has been reconciled',reopenFolio:'Reopen folio',reopenConfirm:'Confirm reopening with audit history',folio_closed:'Folio is settled. Ask an administrator to reopen it.'});Object.assign(words.ms,{settlement:"Status penyelesaian",folioPartial:"Sebahagian selesai",folioClosed:'Diselesaikan',folioOpen:'Belum diselesaikan',settle:'Selesaikan folio',settleNote:'Baki bilik dan deposit mesti selesai. Pentadbir perlu membuka semula untuk perubahan.',settleConfirm:'Sahkan penginapan telah disemak',reopenFolio:'Buka semula folio',reopenConfirm:'Sahkan buka semula dengan rekod audit',folio_closed:'Folio selesai. Pentadbir perlu buka semula.'});


Object.assign(words.zh,{"folioHistory":"结账与重开记录","folioHistoryEmpty":"尚无结账记录；旧账单不会自动标记为已结账。"});
Object.assign(words.en,{"folioHistory":"Settlement and reopening history","folioHistoryEmpty":"No settlement records. Legacy folios are not automatically closed."});
Object.assign(words.ms,{"folioHistory":"Sejarah penyelesaian dan pembukaan semula","folioHistoryEmpty":"Tiada rekod penyelesaian. Folio lama tidak ditutup secara automatik."});
Object.assign(words.zh,{"folioReopenReason":"重开原因","reopen_folio":"重开账单"});
Object.assign(words.en,{"folioReopenReason":"Reopening reason","reopen_folio":"Reopen folio"});
Object.assign(words.ms,{"folioReopenReason":"Sebab buka semula","reopen_folio":"Buka semula folio"});
$('#content').addEventListener('click',event=>{const button=event.target.closest('[data-compare-drill]');if(!button||view!=='comparison')return;const kind=button.dataset.compareDrill,period=button.dataset.period;if(!['business','cashflow'].includes(kind)||!['current','month','year'].includes(period))return;const filters=financeFilters.get(propertyId+'|comparison');if(!filters)return;financeFilters.set(propertyId+'|'+kind,{from:filters[period+'From'],to:filters[period+'To'],source:filters.source,dimension:'date',transactionKind:'all',method:'all',operator:'all'});goView(kind);});

// The notice bell. It only reports: the count is the number of notices still unread for
// this account across every property it is scoped to, and nothing is ever sent to anyone.
function updateBell(count){
  const bell=$('#notifications');if(!bell)return;
  const unread=count??(state.notifications||[]).filter(n=>!n.readAt).length;
  if(unread>0){bell.dataset.count=String(unread);bell.setAttribute('aria-label',t('notifications')+' · '+unread+' · '+t('noticeUnread'));}
  else{delete bell.dataset.count;bell.setAttribute('aria-label',t('notifications'));}
}
$('#notifications').onclick=()=>goView('notifications');
$('#content').addEventListener('click',async event=>{
  const one=event.target.closest('[data-notice-read]');
  if(one){one.disabled=true;try{await commit({type:'notification_read',notificationId:one.dataset.noticeRead});}catch(e){$('#message').textContent=errorText(e);one.disabled=false;}return;}
  const all=event.target.closest('[data-notice-all]');
  if(all){all.disabled=true;try{await commit({type:'notification_read',all:true});}catch(e){$('#message').textContent=errorText(e);all.disabled=false;}return;}
  const board=event.target.closest('[data-notice-view]');
  // The review page is a dialog rather than a view, so a notice about identity details
  // waiting on a person opens it the same way the header button does.
  if(board){if(board.dataset.noticeView==='checkin'){if(leaveDialogs())selfCheckinUI?.open();}else goView(board.dataset.noticeView);return;}
  const open=event.target.closest('[data-notice-open]');
  if(!open)return;
  // A notice points at the work rather than doing it, so it opens the page where the
  // request is decided and leaves the decision to a person.
  goView('bookingRequests');
});
// Something can arrive while the desk is working elsewhere. The whole state is not pulled
// for this: the count alone is checked, and it only reloads when the count changed, so an
// open page is not disturbed for nothing. A failed check is left silent on purpose.
let noticeCount=null;
const noticePoll=setInterval(async ()=>{
  // Never reload underneath someone mid-task: a dialog that is busy keeps its page.
  if(!backend.shared||!backend.user||writing||communications?.isBusy()||selfCheckinUI?.isBusy())return;
  try{
    const feed=await backend.notifications();
    // The first pass only learns the count, so a reload happens on a real change.
    if(noticeCount===null){noticeCount=feed.unread;return;}
    if(feed.unread===noticeCount)return;
    noticeCount=feed.unread;
    await refreshShared();
  }catch(e){}
},60000);
// Outside a browser this timer would keep the process alive; in a browser it is a plain
// number and this does nothing.
noticePoll?.unref?.();

function splitBillRow() {
  return '<div data-split-row class="form-row">'+
    '<label>'+t('splitBill')+'<input name="label" required maxlength="120"></label>'+
    '<label>'+t('charge')+'<input name="charge" type="number" step=".01" min="0" required></label>'+
    '<label>'+t('paid')+'<input name="paid" type="number" step=".01" min="0" value="0" required></label></div>';
}
function splitBillPanel(order, totals) {
  if (!order.splitBills) return '<details><summary>'+t('settle_split')+'</summary><form id="split-form"><p>'+t('splitNote')+'</p><div id="split-rows">'+splitBillRow()+splitBillRow()+'</div><button id="split-add" type="button">+ '+t('splitBill')+'</button> <button>'+t('settle_split')+'</button></form></details>';
  const action = (type,billId,enabled,reason=false) => '<form data-split-command="'+type+'" data-bill-id="'+escape(billId||'')+'">'+
    (reason?'<label>'+t('folioReopenReason')+'<input name="reason" required maxlength="500"></label>':'')+
    '<button '+(enabled&&can(type)?'':'disabled')+'>'+t(type)+'</button></form>';
  const rows=order.splitBills.map(bill=>'<tr><td>'+escape(bill.label)+'</td><td>'+currency(bill.charge)+'</td><td>'+currency(bill.paid)+(bill.arAmount?'<small>'+escape(t('ar_post'))+' · '+currency(bill.arAmount)+'</small>':'')+'</td><td>'+currency(bill.charge-bill.paid-(bill.arAmount||0))+'</td><td>'+t(bill.closedBy?'folioClosed':'folioOpen')+'</td><td>'+
    (bill.closedBy?action('settle_undo',bill.id,true,true):action('settle_bill',bill.id,bill.charge===bill.paid&&totals.deposit===0))+'</td></tr>').join('');
  return '<section><h3>'+t('splitBill')+'</h3><div class="table-wrap"><table><thead><tr>'+['splitBill','charge','paid','due','status','action'].map(key=>'<th>'+t(key)+'</th>').join('')+'</tr></thead><tbody>'+rows+'</tbody></table></div>'+
    action('settle_unsplit',null,order.splitBills.every(b=>!b.closedBy),true)+'</section>';
}

Object.assign(words.zh,{"settle_split":"拆账","settle_bill":"子账单结账","settle_undo":"撤销子账单结账","settle_unsplit":"撤销拆账","splitBill":"子账单","splitNote":"各账单的费用和已收款分别加总为当前账页金额。押金仍单独核算。","bill_total":"分配金额与账页总额不符。","bill_state":"当前账单状态不允许此操作。"});
Object.assign(words.en,{"settle_split":"Split bills","settle_bill":"Settle bill","settle_undo":"Reverse bill settlement","settle_unsplit":"Undo split","splitBill":"Bill","splitNote":"Allocate the full charge and receipts across bills. Deposits remain separate.","bill_total":"Allocations must match the folio totals.","bill_state":"This bill state does not allow the action."});
Object.assign(words.ms,{"settle_split":"Pecah bil","settle_bill":"Selesaikan bil","settle_undo":"Balikkan penyelesaian bil","settle_unsplit":"Batal pecahan","splitBill":"Bil","splitNote":"Agihkan semua caj dan terimaan. Deposit kekal berasingan.","bill_total":"Agihan mesti sepadan dengan jumlah folio.","bill_state":"Status bil tidak membenarkan tindakan ini."});
$('#content').addEventListener('change',e=>{
  if (view==='arLedger' && e.target.id==='ar-select') {
    arSelection.set(propertyId,e.target.value);
    render();
  }
});
$('#content').addEventListener('submit',async e=>{
  const type=e.target.dataset.arCommand;
  if(!type || (view==='arReports'?type!=='ar_close_month':view!=='arLedger'))return;
  e.preventDefault();
  try {
    const data=new FormData(e.target);
    const command={type,...Object.fromEntries([...data].filter(([key])=>!key.startsWith('allocation:')&&key!=='manual'))};
    if(type==='ar_adjust')command.amount=toMinor(command.amount);
    if(type==='ar_write_off'){
      command.amount=toMinor(command.amount);
      if(data.has('manual'))command.allocations=[...data]
        .filter(([key,value])=>key.startsWith('allocation:')&&Number(value)>0)
        .map(([key,value])=>({itemId:key.slice(11),amount:toMinor(value)}));
    }
    await commit(command);
  }catch(error){$('#ar-error').textContent=errorText(error);}
});
