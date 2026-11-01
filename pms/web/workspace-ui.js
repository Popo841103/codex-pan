import { nightAuditExceptions, nextDay } from '../src/demo-store.js';
import { isBoxed } from '../src/inventory-actions.js';
// Visual shell shared by every workspace page. Business actions stay in app.js.
const paths={home:'M3 11 12 3l9 8v10h-6v-7H9v7H3Z',calendar:'M4 5h16v16H4ZM7 2v6m10-6v6M4 10h16m-12 4h2m4 0h2m-8 4h2',channels:'M4 4h6v6H4Zm10 10h6v6h-6ZM7 10v7h7m3-3V7h-7',orders:'M7 4H4v18h16V4h-3M8 2h8v5H8Zm0 10h8m-8 5h8',customers:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m14-17a4 4 0 0 1 0 8m6 9v-2a4 4 0 0 0-3-4M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',stats:'M4 21V3m0 18h18M8 17v-5m5 5V6m5 11V9',settings:'m9 3-1 3-3 1 1 3-3 2 3 2-1 3 3 1 1 3h4l1-3 3-1-1-3 3-2-3-2 1-3-3-1-1-3Zm6 9a3 3 0 1 1-6 0 3 3 0 0 1 6 0',clean:'m4 20 10-10m-3-4 4-4 7 7-4 4Zm-1 8 4 4m-8-1 4 4',audit:'M12 8v5l4 2M3 11a9 9 0 1 1 3 8M3 4v7h7',cash:'M3 6h18v14H3Zm0 4h18m-7 4h7v3h-7Z',message:'M3 3h18v14H9l-5 4v-4H3Zm4 5h10m-10 4h6',headset:'M3 14v-2a9 9 0 0 1 18 0v2M3 12h4v8H3Zm14 0h4v8h-4m2 0v2h-6',help:'M9 8a3 3 0 1 1 5 2c-2 1-2 2-2 3m0 4h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',lock:'M6 10V7a6 6 0 0 1 12 0v3M4 10h16v12H4Zm8 4v4',globe:'M2 12h20M12 2a19 19 0 0 1 0 20 19 19 0 0 1 0-20m10 10a10 10 0 1 1-20 0 10 10 0 0 1 20 0',grid:'M3 3h4v4H3Zm7 0h4v4h-4Zm7 0h4v4h-4ZM3 10h4v4H3Zm7 0h4v4h-4Zm7 0h4v4h-4ZM3 17h4v4H3Zm7 0h4v4h-4Zm7 0h4v4h-4ZM17 17h4v4h-4Z',collapse:'m14 5-7 7 7 7m7-14-7 7 7 7',refresh:'M20 7a9 9 0 1 0 1 8m-1-13v6h-6',logout:'M9 3H3v18h6m6-15 6 6-6 6m-9-6h15',pig:'M19 7h3v9h-3l-2 4h-3v-3H9v3H6l-2-5H2V9l3-4h10l4 2Zm-9-5h4m2 7h.01',single:'M3 10 12 3l9 7M5 9v12h14V9m-10 5 2 2 4-5',summary:'M5 3h14v18H5Zm3 5h8m-8 4h8m-8 4h8',moon:'M15 3a8 8 0 1 0 6 14 9 9 0 0 1-6-14'};
export const icon=name=>`<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]||paths.summary}"/></svg>`;
export const shellWords={zh:{channels:'渠道',customers:'客户',mainOrders:'订单',navCalendar:'日历',navSummary:'房情表',navOverview:'房态表',collapseNavigation:'收起导航',expandNavigation:'展开导航',batchCleaning:'批量置脏/净',batchRoomState:'批量开/关房',today:'今天',todayShort:'今',customerDirectory:'住客资料',customerDirectoryNote:'来自本店现有订单的联系人记录；尚无独立CRM合并和去重审核。',relatedOrders:'关联订单',notConnected:'未连接',readConnection:'刷新连接状态',connectionUnknown:'连接状态尚未读取',channelScope:'渠道连接与消息',channelScopeNote:'NOBEDS作为付费渠道服务；本页从当前门店安全配置读取连接状态，不代表已经完成供应商联调。',messageCapability:'消息能力',manualSource:'手工订单来源',manualSourceNote:'订单来源标签不表示已连接OTA；其他平台消息能力需供应商确认。',notVerified:'尚未完成真实账号验收',openMessages:'打开OTA客人聊天',filterCustomers:'搜索姓名、邮箱、手机号、订单号',noCustomers:'本店暂无住客联系人',customerCount:'联系人记录',closeGroups:'收起',openGroups:'展开',viewInstructions:'查看说明',nightAuditLabel:'夜审',nightAuditUnavailable:'未启用',collapseGroupNote:'点击展开可恢复房型下的全部房号。'},en:{channels:'Channels',customers:'Guests',mainOrders:'Orders',navCalendar:'Calendar',navSummary:'Room summary',navOverview:'Room status',collapseNavigation:'Collapse navigation',expandNavigation:'Expand navigation',batchCleaning:'Bulk dirty / clean',batchRoomState:'Bulk open / close',today:'Today',todayShort:'Now',customerDirectory:'Guest contacts',customerDirectoryNote:'Contacts from existing property bookings; independent CRM merge and deduplication review are not implemented.',relatedOrders:'Related bookings',notConnected:'Not connected',readConnection:'Refresh connection',connectionUnknown:'Connection not read yet',channelScope:'Channel connection and messages',channelScopeNote:'NOBEDS is the paid channel service. Status comes from this property’s private configuration and does not establish a tested integration.',messageCapability:'Messaging capability',manualSource:'Manual booking source',manualSourceNote:'A source label does not connect an OTA. Other platform messaging needs supplier confirmation.',notVerified:'Live account verification incomplete',openMessages:'Open OTA guest inbox',filterCustomers:'Search name, email, phone or booking',noCustomers:'No guest contacts in this property',customerCount:'Contact records',closeGroups:'Collapse',openGroups:'Expand',viewInstructions:'View notes',nightAuditLabel:'Night audit',nightAuditUnavailable:'Not enabled',collapseGroupNote:'Expand to restore all unit rows.'},ms:{channels:'Saluran',customers:'Tetamu',mainOrders:'Pesanan',navCalendar:'Kalendar',navSummary:'Ringkasan bilik',navOverview:'Status bilik',collapseNavigation:'Tutup navigasi',expandNavigation:'Buka navigasi',batchCleaning:'Kotor / bersih pukal',batchRoomState:'Buka / tutup pukal',today:'Hari ini',todayShort:'Kini',customerDirectory:'Kenalan tetamu',customerDirectoryNote:'Kenalan daripada tempahan hartanah. Penggabungan CRM dan semakan pendua belum tersedia.',relatedOrders:'Tempahan berkaitan',notConnected:'Belum disambung',readConnection:'Muat semula sambungan',connectionUnknown:'Status belum dibaca',channelScope:'Sambungan dan mesej saluran',channelScopeNote:'NOBEDS ialah perkhidmatan saluran berbayar. Status konfigurasi bukan bukti integrasi sebenar telah diuji.',messageCapability:'Keupayaan mesej',manualSource:'Sumber manual',manualSourceNote:'Label sumber bukan sambungan OTA. Mesej platform lain perlu pengesahan pembekal.',notVerified:'Akaun sebenar belum disahkan',openMessages:'Buka peti masuk OTA',filterCustomers:'Cari nama, e-mel, telefon atau tempahan',noCustomers:'Tiada kenalan tetamu',customerCount:'Rekod kenalan',closeGroups:'Tutup',openGroups:'Buka',viewInstructions:'Lihat nota',nightAuditLabel:'Audit malam',nightAuditUnavailable:'Belum aktif',collapseGroupNote:'Buka untuk lihat semua unit.'}};
export function navigation(view,t){
 const group=['calendar','overview','tasks','rates'].includes(view)?'rooms':['business','cashflow','comparison','audit','nightAudit','managerDaily','guestLedger','roomCharge','roomBusiness','roomMovement','extraCharge','cancellation','occupants','registration','commission'].includes(view)?'stats':view==='resourcesSettings'?'settings':view;
 const mains=[['home','home','home'],['calendar','roomState','home'],['channels','channels','channels'],['orders','mainOrders','orders'],['customers','customers','customers'],['business','operationalReports','stats'],['resourcesSettings','settings','settings']];
 const section=v=>['calendar','overview','tasks','rates'].includes(v)?'rooms':['business','cashflow','comparison','audit','nightAudit','managerDaily','guestLedger','roomCharge','roomBusiness','roomMovement','extraCharge','cancellation','occupants','registration','commission'].includes(v)?'stats':v==='resourcesSettings'?'settings':v;
 const side={rooms:[['calendar','navCalendar','home'],['rates','rateInventory','cash'],['overview','navSummary','summary'],['tasks','tasks','clean']],orders:[['orders','orders','orders'],['audit','audit','audit']],stats:[['managerDaily','managerDailyReport','stats'],['guestLedger','guestLedger','cash'],['roomCharge','roomChargeDetail','stats'],['roomBusiness','roomBusinessSummary','stats'],['roomMovement','roomMovementLog','audit'],['extraCharge','otherChargeDetail','cash'],['cancellation','cancellationPenaltyDetail','pig'],['occupants','roomOccupantDetail','single'],['registration','registrationRecord','audit'],['commission','commissionDetail','cash'],['comparison','comparison','summary'],['business','businessSummary','stats'],['cashflow','cashflowSummary','cash'],['nightAudit','nightAudit','audit']],settings:[['resourcesSettings','resourcesSettings','settings']],channels:[['channels','channels','channels']],customers:[['customers','customerDirectory','customers']]}[group]||[];
 const buttons=items=>items.map(([id,key,name])=>`<button data-view="${id}" class="${section(id)===group&&items===mains||id===view?'active':''}" ${id===view?'aria-current="page"':''}>${items===mains?'':icon(name)}<span>${t(key)}</span></button>`).join('');
 return {main:buttons(mains),side:buttons(side)};
}
export function customersPage(state,pid,t,esc,query=''){
 const orders=state.orders.filter(o=>o.propertyId===pid),seen=new Map();
 for(const o of orders){const key=JSON.stringify([o.guest,o.email||'',o.phone||'']);if(!seen.has(key))seen.set(key,{guest:o.guest,email:o.email,phone:o.phone,country:o.country,guestLanguage:o.guestLanguage,orders:[]});seen.get(key).orders.push(o);}
 const rows=[...seen.values()].filter(g=>[g.guest,g.email,g.phone,...g.orders.map(o=>o.id)].join(' ').toLocaleLowerCase().includes(query.toLocaleLowerCase()));
 return `<section class="panel directory-panel"><div class="panel-head"><h2>${t('customerDirectory')}</h2><span>${t('customerCount')}: ${rows.length}</span></div><input id="customer-query" class="directory-search" value="${esc(query)}" placeholder="${t('filterCustomers')}" aria-label="${t('filterCustomers')}"><p class="muted">${t('customerDirectoryNote')}</p><div class="table-wrap"><table><thead><tr>${['guest','phone','email','country','guestLanguage','relatedOrders'].map(k=>`<th>${t(k)}</th>`).join('')}</tr></thead><tbody>${rows.map(g=>`<tr><td><strong>${esc(g.guest)}</strong></td><td>${esc(g.phone||'—')}</td><td>${esc(g.email||'—')}</td><td>${esc(g.country||'—')}</td><td>${esc(g.guestLanguage||'—')}</td><td>${g.orders.map(o=>`<button data-open-stay="${esc(o.id)}">${esc(o.start)} · ${t(o.status)}</button>`).join(' ')}</td></tr>`).join('')}</tbody></table></div>${rows.length?'':`<p class="empty">${t('noCustomers')}</p>`}</section>`;
}
export function channelsPage(t,esc,provider,can){return `<section class="panel channel-panel"><div class="panel-head"><h2>${t('channelScope')}</h2><button id="channel-refresh" ${can('guest_read')?'':'disabled'}>${t('readConnection')}</button></div><p>${t('channelScopeNote')}</p><div class="channel-provider"><strong>NOBEDS</strong><span class="badge">${t(provider?provider.configured?'notVerified':'notConnected':'connectionUnknown')}</span><p>${t('messageCapability')}: ${esc(provider?.channels?.map(c=>c==='booking'?'Booking.com':'Airbnb').join(' / ')||'—')}</p><button id="channel-messages" class="primary" ${can('guest_read')?'':'disabled'}>${t('openMessages')}</button></div><h3>${t('manualSource')}</h3><p class="muted">${t('manualSourceNote')}</p></section>`;}

// Night audit, business day and shift handover. Kept in an existing shell module
// because the deployed release install only refreshes files that already exist.
export const nightAuditWords = {
  zh: {
    nightAudit: '夜审', businessDay: '营业日', businessDateUnset: '尚未设定营业日', businessDateUnsetNote: '营业日只能由管理员设定一次，之后仅能通过夜审推进；不能当作可随意修改的日期。',
    setBusinessDate: '设定起始营业日', lastAudit: '上次夜审', neverAudited: '从未执行夜审', auditMode: '模式', manual: '手动', auto: '自动',
    auditExceptions: '待处理异常', required: '必须处理', advisory: '建议处理', noExceptions: '当前营业日没有待处理异常',
    no_show: '应入住未入住', overdue_checkout: '应离店未退房', box_expiring: '订单盒子到期', unsettled_history: '历史未结清',
    runNightAudit: '执行夜审并推进营业日', forceAudit: '仍有必须处理项，需强制并填写原因', auditReason: '强制原因', auditBlocked: '存在必须处理项，请先处理或填写强制原因',
    auditForced: '强制通过', auditHistory: '夜审记录', closedDate: '已审营业日', nextDate: '推进至', blocking: '遗留必须项', exceptions: '异常数',
    shifts: '班次设置', shiftName: '班次名称', shiftStart: '开始', shiftEnd: '结束', addShift: '新增班次', shiftNameHint: '名称唯一且不超过20字符，时间不可重叠',
    shiftOvernight: '跨午夜', deleteShift: '删除', handover: '交接班', handoverShift: '班次', runHandover: '确认交班', handoverNote: '备注',
    handoverHistory: '交班记录', handedBy: '交班人', window: '时段', receipts: '收款笔数', netReceived: '净收款', deposits: '押金净额', noShifts: '尚未配置班次',
    handoverDone: '交班已记录', businessDateNote: '营业日由夜审推进，交班记录归属当前营业日',
    order: '订单', exceptionDate: '发生日期',
    audited: '该日期已被夜审关闭，需要管理员授权后才能修改', business_date: '尚未设定营业日',
    night_audit_exceptions: '存在必须处理的异常，不能直接夜审', shift_name: '班次名称重复',
    shift_overlap: '班次时间与其他班次重叠', shift_window: '交班时间区间无效', shift_in_use: '该班次已有交班记录，不能删除'
  },
  en: {
    nightAudit: 'Night audit', businessDay: 'Business date', businessDateUnset: 'Business date not set', businessDateUnsetNote: 'An administrator sets the business date once; afterwards only a night audit advances it. It is never a freely editable date.',
    setBusinessDate: 'Set opening business date', lastAudit: 'Last audit', neverAudited: 'No audit has run', auditMode: 'Mode', manual: 'Manual', auto: 'Automatic',
    auditExceptions: 'Open exceptions', required: 'Must resolve', advisory: 'Advisory', noExceptions: 'No open exceptions for the current business date',
    no_show: 'Arrival never checked in', overdue_checkout: 'Departure never checked out', box_expiring: 'Order box expiring', unsettled_history: 'History unsettled',
    runNightAudit: 'Run night audit and advance', forceAudit: 'Required items remain; a forced close needs a reason', auditReason: 'Reason', auditBlocked: 'Required items remain: resolve them or record a reason',
    auditForced: 'Forced', auditHistory: 'Audit history', closedDate: 'Date closed', nextDate: 'Advanced to', blocking: 'Required left', exceptions: 'Exceptions',
    shifts: 'Shifts', shiftName: 'Shift name', shiftStart: 'Start', shiftEnd: 'End', addShift: 'Add shift', shiftNameHint: 'Names are unique up to 20 characters and ranges cannot overlap',
    shiftOvernight: 'Overnight', deleteShift: 'Delete', handover: 'Shift handover', handoverShift: 'Shift', runHandover: 'Confirm handover', handoverNote: 'Note',
    handoverHistory: 'Handover records', handedBy: 'Handed over by', window: 'Window', receipts: 'Transactions', netReceived: 'Net received', deposits: 'Deposit net', noShifts: 'No shifts configured yet',
    handoverDone: 'Handover recorded', businessDateNote: 'The business date advances by night audit; handovers belong to the current business date',
    order: 'Booking', exceptionDate: 'Date',
    audited: 'That date is closed by a night audit; only an administrator can change it', business_date: 'No business date has been set',
    night_audit_exceptions: 'Required exceptions remain, so the audit cannot close the day', shift_name: 'That shift name already exists',
    shift_overlap: 'That shift overlaps another shift', shift_window: 'The handover window is invalid', shift_in_use: 'That shift has handover records and cannot be deleted'
  },
  ms: {
    nightAudit: 'Audit malam', businessDay: 'Hari perniagaan', businessDateUnset: 'Hari perniagaan belum ditetapkan', businessDateUnsetNote: 'Pentadbir menetapkan hari perniagaan sekali sahaja; selepas itu hanya audit malam memajukannya. Ia bukan tarikh yang boleh diubah bebas.',
    setBusinessDate: 'Tetapkan hari perniagaan pembukaan', lastAudit: 'Audit terakhir', neverAudited: 'Audit belum pernah dijalankan', auditMode: 'Mod', manual: 'Manual', auto: 'Automatik',
    auditExceptions: 'Pengecualian terbuka', required: 'Wajib diselesaikan', advisory: 'Nasihat', noExceptions: 'Tiada pengecualian untuk hari perniagaan semasa',
    no_show: 'Ketibaan belum daftar masuk', overdue_checkout: 'Keluar belum didaftar', box_expiring: 'Kotak pesanan tamat tempoh', unsettled_history: 'Sejarah belum dijelaskan',
    runNightAudit: 'Jalankan audit malam dan majukan', forceAudit: 'Item wajib masih ada; paksaan perlu sebab', auditReason: 'Sebab', auditBlocked: 'Item wajib masih ada: selesaikan atau catat sebab',
    auditForced: 'Dipaksa', auditHistory: 'Sejarah audit', closedDate: 'Tarikh ditutup', nextDate: 'Dimajukan ke', blocking: 'Wajib tertinggal', exceptions: 'Pengecualian',
    shifts: 'Syif', shiftName: 'Nama syif', shiftStart: 'Mula', shiftEnd: 'Tamat', addShift: 'Tambah syif', shiftNameHint: 'Nama unik sehingga 20 aksara dan masa tidak bertindih',
    shiftOvernight: 'Lepas tengah malam', deleteShift: 'Padam', handover: 'Serahan syif', handoverShift: 'Syif', runHandover: 'Sahkan serahan', handoverNote: 'Catatan',
    handoverHistory: 'Rekod serahan', handedBy: 'Diserahkan oleh', window: 'Tempoh', receipts: 'Transaksi', netReceived: 'Bersih diterima', deposits: 'Bersih deposit', noShifts: 'Syif belum dikonfigurasi',
    handoverDone: 'Serahan direkod', businessDateNote: 'Hari perniagaan dimajukan oleh audit malam; serahan milik hari perniagaan semasa',
    order: 'Tempahan', exceptionDate: 'Tarikh',
    audited: 'Tarikh ini telah ditutup oleh audit malam; hanya pentadbir boleh mengubahnya', business_date: 'Hari perniagaan belum ditetapkan',
    night_audit_exceptions: 'Pengecualian wajib masih ada; audit tidak boleh dijalankan', shift_name: 'Nama syif sudah wujud',
    shift_overlap: 'Masa syif bertindih dengan syif lain', shift_window: 'Tempoh serahan tidak sah', shift_in_use: 'Syif ini mempunyai rekod serahan, tidak boleh dipadam'
  }
};

const rows = (list, t, escape) => list.length ? list.map(entry => `<tr><td>${escape(entry.date)}</td><td>${escape(entry.guest || '—')}</td><td>${escape(t(entry.kind))}</td><td><button data-action="details" data-id="${escape(entry.orderId)}">${escape(entry.orderId.slice(0, 8))}</button></td></tr>`).join('')
  : `<tr><td colspan="4">${escape(t('noExceptions'))}</td></tr>`;

// The business date is authoritative state, not a browser field: it can only move forward through an audit.
export function nightAuditPage(state, propertyId, { t, escape, currency, can, lang }) {
  const businessDate = state.businessDate ?? null;
  const audits = (state.nightAudits || []).slice().sort((a, b) => b.at.localeCompare(a.at));
  const shifts = state.shiftTypes || [];
  const handovers = (state.handovers || []).slice().sort((a, b) => b.at.localeCompare(a.at));
  const exceptions = businessDate ? nightAuditExceptions(state, businessDate, isBoxed) : [];
  const required = exceptions.filter(e => e.severity === 'required');
  const advisory = exceptions.filter(e => e.severity === 'advisory');
  const latest = audits[0] || null;
  const date = (value) => escape(new Date(value).toLocaleString(lang === 'zh' ? 'zh-CN' : lang === 'ms' ? 'ms-MY' : 'en-GB', { timeZone: 'Asia/Kuala_Lumpur' }));
  const head = `<section class="panel"><div class="panel-head"><h2>${escape(t('nightAudit'))}</h2><span class="badge">${escape(businessDate || t('businessDateUnset'))}</span></div>
    <p class="muted">${escape(t('businessDateNote'))}</p>
    ${businessDate ? `<div class="stats"><div class="stat"><span>${escape(t('businessDay'))}</span><strong>${escape(businessDate)}</strong><small>${escape(t('lastAudit'))}: ${latest ? escape(latest.actor) + ' · ' + date(latest.at) : escape(t('neverAudited'))}</small></div>
      ${latest ? `<div class="stat"><span>${escape(t('auditMode'))}</span><strong>${escape(t(latest.mode))}</strong><small>${latest.forced ? escape(t('auditForced')) : escape(t('exceptions') + ': ' + latest.exceptions.length)}</small></div>` : ''}</div>`
    : `<p>${escape(t('businessDateUnsetNote'))}</p>
      ${can('business_date_init') ? `<label>${escape(t('setBusinessDate'))}<input id="business-date-init" type="date" required></label><button id="business-date-save" class="primary">${escape(t('setBusinessDate'))}</button>` : ''}`}
  </section>`;
  const exceptionPanel = businessDate ? `<section class="panel"><div class="panel-head"><h2>${escape(t('auditExceptions'))}</h2><span>${escape(t('required'))}: ${required.length} · ${escape(t('advisory'))}: ${advisory.length}</span></div>
    <h3>${escape(t('required'))}</h3>
    <div class="table-wrap"><table><thead><tr><th>${escape(t('exceptionDate'))}</th><th>${escape(t('guest'))}</th><th>${escape(t('action'))}</th><th>${escape(t('order'))}</th></tr></thead><tbody>${rows(required, t, escape)}</tbody></table></div>
    <h3>${escape(t('advisory'))}</h3>
    <div class="table-wrap"><table><thead><tr><th>${escape(t('exceptionDate'))}</th><th>${escape(t('guest'))}</th><th>${escape(t('action'))}</th><th>${escape(t('order'))}</th></tr></thead><tbody>${rows(advisory, t, escape)}</tbody></table></div>
  </section>
  <section class="panel"><div class="panel-head"><h2>${escape(t('runNightAudit'))}</h2></div>
    ${required.length ? `<p class="muted">${escape(t('forceAudit'))}</p><label>${escape(t('auditReason'))}<input id="audit-reason" maxlength="500" placeholder="${escape(t('auditReason'))}"></label>` : ''}
    <button id="night-audit-run" class="primary" ${can('night_audit') ? '' : 'disabled'}>${escape(t('runNightAudit'))}</button>
    <p id="audit-message" role="status"></p>
  </section>
  <section class="panel"><div class="panel-head"><h2>${escape(t('auditHistory'))}</h2></div>
    <div class="table-wrap"><table><thead><tr><th>${escape(t('closedDate'))}</th><th>${escape(t('nextDate'))}</th><th>${escape(t('time'))}</th><th>${escape(t('actor'))}</th><th>${escape(t('auditMode'))}</th><th>${escape(t('exceptions'))}</th></tr></thead><tbody>${
      audits.length ? audits.map(a => `<tr><td>${escape(a.businessDate)}</td><td>${escape(a.nextDate)}</td><td>${date(a.at)}</td><td>${escape(a.actor)}</td><td>${escape(t(a.mode))}${a.forced ? ' · ' + escape(t('auditForced')) : ''}</td><td>${a.exceptions.length}${a.reason ? ` — ${escape(a.reason)}` : ''}</td></tr>`).join('')
      : `<tr><td colspan="6">${escape(t('neverAudited'))}</td></tr>`}</tbody></table></div>
  </section>` : '';
  const shiftPanel = businessDate ? `<section class="panel"><div class="panel-head"><h2>${escape(t('shifts'))}</h2></div>
    <p class="muted">${escape(t('shiftNameHint'))}</p>
    <div class="table-wrap"><table><thead><tr><th>${escape(t('shiftName'))}</th><th>${escape(t('shiftStart'))}</th><th>${escape(t('shiftEnd'))}</th><th>${escape(t('action'))}</th></tr></thead><tbody>${
      shifts.length ? shifts.map(s => `<tr><td>${escape(s.name)}</td><td>${escape(s.start)}</td><td>${escape(s.end)}${s.end <= s.start ? ' · ' + escape(t('shiftOvernight')) : ''}</td><td>${can('shift_delete') ? `<button data-night-audit="shift-delete" data-shift="${escape(s.id)}">${escape(t('deleteShift'))}</button>` : ''}</td></tr>`).join('')
      : `<tr><td colspan="4">${escape(t('noShifts'))}</td></tr>`}</tbody></table></div>
    ${can('shift_save') ? `<div class="form-row"><label>${escape(t('shiftName'))}<input id="shift-name" maxlength="20"></label><label>${escape(t('shiftStart'))}<input id="shift-start" type="time" value="07:00" required></label><label>${escape(t('shiftEnd'))}<input id="shift-end" type="time" value="15:00" required></label></div><button id="shift-save" class="primary">${escape(t('addShift'))}</button>` : ''}
  </section>
  <section class="panel"><div class="panel-head"><h2>${escape(t('handover'))}</h2></div>
    <div class="form-row"><label>${escape(t('handoverShift'))}<select id="handover-shift">${shifts.map(s => `<option value="${escape(s.id)}">${escape(s.name)} (${escape(s.start)}–${escape(s.end)})</option>`).join('')}</select></label>
    <label>${escape(t('handoverNote'))}<input id="handover-note" maxlength="500"></label></div>
    <button id="handover-run" class="primary" ${can('shift_handover') && shifts.length ? '' : 'disabled'}>${escape(t('runHandover'))}</button>
    <div class="table-wrap"><table><thead><tr><th>${escape(t('businessDay'))}</th><th>${escape(t('handoverShift'))}</th><th>${escape(t('window'))}</th><th>${escape(t('receipts'))}</th><th>${escape(t('netReceived'))}</th><th>${escape(t('deposits'))}</th><th>${escape(t('handedBy'))}</th></tr></thead><tbody>${
      handovers.length ? handovers.map(h => `<tr><td>${escape(h.businessDate)}</td><td>${escape(h.shiftName)}</td><td>${date(h.from)} → ${date(h.to)}</td><td>${h.summary.count}</td><td>${escape(currency(h.summary.net))}</td><td>${escape(currency(h.summary.depositNet))}</td><td>${escape(h.actor)}</td></tr>`).join('')
      : `<tr><td colspan="7">—</td></tr>`}</tbody></table></div>
  </section>` : '';
  return head + exceptionPanel + shiftPanel;
}

// Windows use the property's fixed UTC+8 offset; Malaysia has no daylight saving.
export function handoverWindow(businessDate, shift) {
  const crossesMidnight = shift.end <= shift.start;
  return { from: `${businessDate}T${shift.start}:00+08:00`, to: `${crossesMidnight ? nextDay(businessDate) : businessDate}T${shift.end}:00+08:00` };
}
