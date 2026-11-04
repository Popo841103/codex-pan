import { nightAuditExceptions, nextDay, noticeKinds, noticeLevels, noticeDefaults, severityOf } from '../src/demo-store.js';
import { isBoxed } from '../src/inventory-actions.js';
// Visual shell shared by every workspace page. Business actions stay in app.js.
const paths={home:'M3 11 12 3l9 8v10h-6v-7H9v7H3Z',calendar:'M4 5h16v16H4ZM7 2v6m10-6v6M4 10h16m-12 4h2m4 0h2m-8 4h2',channels:'M4 4h6v6H4Zm10 10h6v6h-6ZM7 10v7h7m3-3V7h-7',orders:'M7 4H4v18h16V4h-3M8 2h8v5H8Zm0 10h8m-8 5h8',customers:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m14-17a4 4 0 0 1 0 8m6 9v-2a4 4 0 0 0-3-4M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',stats:'M4 21V3m0 18h18M8 17v-5m5 5V6m5 11V9',settings:'m9 3-1 3-3 1 1 3-3 2 3 2-1 3 3 1 1 3h4l1-3 3-1-1-3 3-2-3-2 1-3-3-1-1-3Zm6 9a3 3 0 1 1-6 0 3 3 0 0 1 6 0',clean:'m4 20 10-10m-3-4 4-4 7 7-4 4Zm-1 8 4 4m-8-1 4 4',audit:'M12 8v5l4 2M3 11a9 9 0 1 1 3 8M3 4v7h7',cash:'M3 6h18v14H3Zm0 4h18m-7 4h7v3h-7Z',message:'M3 3h18v14H9l-5 4v-4H3Zm4 5h10m-10 4h6',headset:'M3 14v-2a9 9 0 0 1 18 0v2M3 12h4v8H3Zm14 0h4v8h-4m2 0v2h-6',help:'M9 8a3 3 0 1 1 5 2c-2 1-2 2-2 3m0 4h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',lock:'M6 10V7a6 6 0 0 1 12 0v3M4 10h16v12H4Zm8 4v4',globe:'M2 12h20M12 2a19 19 0 0 1 0 20 19 19 0 0 1 0-20m10 10a10 10 0 1 1-20 0 10 10 0 0 1 20 0',bell:'M12 3a6 6 0 0 1 6 6c0 5 2 6 2 6H4s2-1 2-6a6 6 0 0 1 6-6Zm-2 14a2 2 0 0 0 4 0',grid:'M3 3h4v4H3Zm7 0h4v4h-4Zm7 0h4v4h-4ZM3 10h4v4H3Zm7 0h4v4h-4Zm7 0h4v4h-4ZM3 17h4v4H3Zm7 0h4v4h-4Zm7 0h4v4h-4ZM17 17h4v4h-4Z',collapse:'m14 5-7 7 7 7m7-14-7 7 7 7',refresh:'M20 7a9 9 0 1 0 1 8m-1-13v6h-6',logout:'M9 3H3v18h6m6-15 6 6-6 6m-9-6h15',pig:'M19 7h3v9h-3l-2 4h-3v-3H9v3H6l-2-5H2V9l3-4h10l4 2Zm-9-5h4m2 7h.01',single:'M3 10 12 3l9 7M5 9v12h14V9m-10 5 2 2 4-5',summary:'M5 3h14v18H5Zm3 5h8m-8 4h8m-8 4h8',moon:'M15 3a8 8 0 1 0 6 14 9 9 0 0 1-6-14'};
export const icon=name=>`<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]||paths.summary}"/></svg>`;
export const shellWords={zh:{channels:'渠道',customers:'客户',mainOrders:'订单',navCalendar:'日历',navSummary:'房情表',navOverview:'房态表',collapseNavigation:'收起导航',expandNavigation:'展开导航',batchCleaning:'批量置脏/净',batchRoomState:'批量开/关房',today:'今天',todayShort:'今',customerDirectory:'住客资料',customerDirectoryNote:'来自本店现有订单的联系人记录；尚无独立CRM合并和去重审核。',relatedOrders:'关联订单',notConnected:'未连接',readConnection:'刷新连接状态',connectionUnknown:'连接状态尚未读取',channelScope:'渠道连接与消息',channelScopeNote:'NOBEDS作为付费渠道服务；本页从当前门店安全配置读取连接状态，不代表已经完成供应商联调。',messageCapability:'消息能力',manualSource:'手工订单来源',manualSourceNote:'订单来源标签不表示已连接OTA；其他平台消息能力需供应商确认。',notVerified:'尚未完成真实账号验收',openMessages:'打开OTA客人聊天',filterCustomers:'搜索姓名、邮箱、手机号、订单号',noCustomers:'本店暂无住客联系人',customerCount:'联系人记录',closeGroups:'收起',openGroups:'展开',viewInstructions:'查看说明',nightAuditLabel:'夜审',nightAuditUnavailable:'未启用',collapseGroupNote:'点击展开可恢复房型下的全部房号。'},en:{channels:'Channels',customers:'Guests',mainOrders:'Orders',navCalendar:'Calendar',navSummary:'Room summary',navOverview:'Room status',collapseNavigation:'Collapse navigation',expandNavigation:'Expand navigation',batchCleaning:'Bulk dirty / clean',batchRoomState:'Bulk open / close',today:'Today',todayShort:'Now',customerDirectory:'Guest contacts',customerDirectoryNote:'Contacts from existing property bookings; independent CRM merge and deduplication review are not implemented.',relatedOrders:'Related bookings',notConnected:'Not connected',readConnection:'Refresh connection',connectionUnknown:'Connection not read yet',channelScope:'Channel connection and messages',channelScopeNote:'NOBEDS is the paid channel service. Status comes from this property’s private configuration and does not establish a tested integration.',messageCapability:'Messaging capability',manualSource:'Manual booking source',manualSourceNote:'A source label does not connect an OTA. Other platform messaging needs supplier confirmation.',notVerified:'Live account verification incomplete',openMessages:'Open OTA guest inbox',filterCustomers:'Search name, email, phone or booking',noCustomers:'No guest contacts in this property',customerCount:'Contact records',closeGroups:'Collapse',openGroups:'Expand',viewInstructions:'View notes',nightAuditLabel:'Night audit',nightAuditUnavailable:'Not enabled',collapseGroupNote:'Expand to restore all unit rows.'},ms:{channels:'Saluran',customers:'Tetamu',mainOrders:'Pesanan',navCalendar:'Kalendar',navSummary:'Ringkasan bilik',navOverview:'Status bilik',collapseNavigation:'Tutup navigasi',expandNavigation:'Buka navigasi',batchCleaning:'Kotor / bersih pukal',batchRoomState:'Buka / tutup pukal',today:'Hari ini',todayShort:'Kini',customerDirectory:'Kenalan tetamu',customerDirectoryNote:'Kenalan daripada tempahan hartanah. Penggabungan CRM dan semakan pendua belum tersedia.',relatedOrders:'Tempahan berkaitan',notConnected:'Belum disambung',readConnection:'Muat semula sambungan',connectionUnknown:'Status belum dibaca',channelScope:'Sambungan dan mesej saluran',channelScopeNote:'NOBEDS ialah perkhidmatan saluran berbayar. Status konfigurasi bukan bukti integrasi sebenar telah diuji.',messageCapability:'Keupayaan mesej',manualSource:'Sumber manual',manualSourceNote:'Label sumber bukan sambungan OTA. Mesej platform lain perlu pengesahan pembekal.',notVerified:'Akaun sebenar belum disahkan',openMessages:'Buka peti masuk OTA',filterCustomers:'Cari nama, e-mel, telefon atau tempahan',noCustomers:'Tiada kenalan tetamu',customerCount:'Rekod kenalan',closeGroups:'Tutup',openGroups:'Buka',viewInstructions:'Lihat nota',nightAuditLabel:'Audit malam',nightAuditUnavailable:'Belum aktif',collapseGroupNote:'Buka untuk lihat semua unit.'}};
export function navigation(view,t){
 const group=['calendar','overview','tasks','rates'].includes(view)?'rooms':['business','cashflow','comparison','audit','nightAudit','managerDaily','guestLedger','roomCharge','roomBusiness','roomMovement','extraCharge','cancellation','occupants','registration','commission'].includes(view)?'stats':['notifications','resourcesSettings','teamAccess','propertySite','bookingRequests','dataCleanup'].includes(view)?'settings':view;
 const mains=[['home','home','home'],['calendar','roomState','home'],['channels','channels','channels'],['orders','mainOrders','orders'],['customers','customers','customers'],['business','operationalReports','stats'],['resourcesSettings','settings','settings']];
 const section=v=>['calendar','overview','tasks','rates'].includes(v)?'rooms':['business','cashflow','comparison','audit','nightAudit','managerDaily','guestLedger','roomCharge','roomBusiness','roomMovement','extraCharge','cancellation','occupants','registration','commission'].includes(v)?'stats':['notifications','resourcesSettings','teamAccess','propertySite','bookingRequests','dataCleanup'].includes(v)?'settings':v;
 const side={rooms:[['calendar','navCalendar','home'],['rates','rateInventory','cash'],['overview','navSummary','summary'],['tasks','tasks','clean']],orders:[['orders','orders','orders'],['audit','audit','audit']],stats:[['managerDaily','managerDailyReport','stats'],['guestLedger','guestLedger','cash'],['roomCharge','roomChargeDetail','stats'],['roomBusiness','roomBusinessSummary','stats'],['roomMovement','roomMovementLog','audit'],['extraCharge','otherChargeDetail','cash'],['cancellation','cancellationPenaltyDetail','pig'],['occupants','roomOccupantDetail','single'],['registration','registrationRecord','audit'],['commission','commissionDetail','cash'],['comparison','comparison','summary'],['business','businessSummary','stats'],['cashflow','cashflowSummary','cash'],['nightAudit','nightAudit','audit']],settings:[['notifications','notifications','bell'],['resourcesSettings','resourcesSettings','settings'],['teamAccess','teamAccess','lock'],['propertySite','propertySite','globe'],['bookingRequests','bookingRequests','message'],['dataCleanup','dataMaintenance','refresh']],channels:[['channels','channels','channels']],customers:[['customers','customerDirectory','customers']]}[group]||[];
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

// Team access. Roles are shown as what they actually allow, and the page never
// claims more than the server enforces: a property override is displayed per
// property, and an account can never edit itself here.
export function teamAccessPage({members=[],memberAudit=[],properties=[],propertyId,user,can,t,escape}) {
 const esc=escape||(v=>String(v??''));
 const editable=can('member_save');
 const roles=[['admin','role_admin'],['operations','role_operations'],['finance','role_finance'],['viewer','role_viewer']];
 const propertyName=id=>properties.find(p=>p.id===id)?.name||id;
 const scopeCell=m=>`<td>${m.propertyIds.map(id=>`${esc(propertyName(id))}${m.propertyRoles[id]?` <small>(${esc(t('role_'+m.propertyRoles[id]))})</small>`:''}`).join(' · ')||'—'}</td>`;
 const rows=members.map(m=>{
  const self=user&&m.username===user.username;
  if(self)return `<tr><th>${esc(m.username)}</th><td>${esc(t('role_'+m.role))}</td>${scopeCell(m)}<td>${esc(t(m.active?'memberEnabled':'memberDisabled'))}</td><td colspan="3" class="muted">${esc(t('memberSelf'))}</td></tr>`;
  return `<tr><th>${esc(m.username)}</th>
   <td><select data-member-role="${esc(m.username)}">${roles.map(([id,word])=>`<option value="${esc(id)}" ${id===m.role?'selected':''}>${esc(t(word))}</option>`).join('')}</select></td>
   ${scopeCell(m)}
   <td><select data-member-property-role="${esc(m.username)}"><option value="" ${m.propertyRoles[propertyId]?'':'selected'}>${esc(t('role_account'))}</option>${roles.map(([id,word])=>`<option value="${esc(id)}" ${m.propertyRoles[propertyId]===id?'selected':''}>${esc(t(word))}</option>`).join('')}</select></td>
   <td><select data-member-active="${esc(m.username)}"><option value="true" ${m.active?'selected':''}>${esc(t('memberEnabled'))}</option><option value="false" ${m.active?'':'selected'}>${esc(t('memberDisabled'))}</option></select></td>
   <td><input type="password" data-member-password="${esc(m.username)}" autocomplete="new-password" minlength="12" placeholder="${esc(t('memberPasswordHint'))}"></td>
   <td><button data-member-apply="${esc(m.username)}">${esc(t('save'))}</button></td></tr>`;
 }).join('');
 const newForm=editable?`<h3>${esc(t('memberNew'))}</h3>
  <form id="member-new" class="order-filters">
   <label>${esc(t('memberUsername'))}<input name="username" required minlength="3" maxlength="64" autocomplete="off"></label>
   <label>${esc(t('memberNewPassword'))}<input name="password" type="password" required minlength="12" autocomplete="new-password"></label>
   <label>${esc(t('memberRole'))}<select name="role">${roles.map(([id,word])=>`<option value="${esc(id)}">${esc(t(word))}</option>`).join('')}</select></label>
   <label>${esc(t('memberProperties'))}<select name="properties" multiple required>${properties.map(p=>`<option value="${esc(p.id)}" ${p.id===propertyId?'selected':''}>${esc(p.name)}</option>`).join('')}</select></label>
   <button class="primary">${esc(t('memberCreate'))}</button>
  </form>`:'';
 const table=`<div class="table-wrap"><table><thead><tr>${['memberUsername','memberRole','memberProperties','memberPropertyRole','memberState','memberPassword','actions'].map(h=>`<th>${esc(t(h))}</th>`).join('')}</tr></thead><tbody>${rows||`<tr><td colspan="7">${esc(t('empty'))}</td></tr>`}</tbody></table></div>`;
 const audit=memberAudit.length?`<h3>${esc(t('memberAuditTitle'))}</h3><div class="table-wrap"><table><thead><tr>${['time','createdBy','memberTarget','memberRole','memberProperties','memberState'].map(h=>`<th>${esc(t(h))}</th>`).join('')}</tr></thead><tbody>${memberAudit.map(a=>`<tr><td>${esc(a.at)}</td><td>${esc(a.actor)}</td><td>${esc(a.target)}</td><td>${esc(t('role_'+a.role))}</td><td>${esc((a.propertyIds||[]).map(propertyName).join(' · ')||'—')}</td><td>${esc(t(a.active?'memberEnabled':'memberDisabled'))}${a.passwordChanged?' · '+esc(t('memberPasswordChanged')):''}${a.created?' · '+esc(t('memberCreated')):''}</td></tr>`).join('')}</tbody></table></div>`:'';
 const rolesTable=`<h3>${esc(t('memberRolesTitle'))}</h3><div class="table-wrap"><table><tbody>${roles.map(([id,word])=>`<tr><th>${esc(t(word))}</th><td>${esc(t('roleDesc_'+id))}</td></tr>`).join('')}</tbody></table></div>`;
 return `<section class="panel"><div class="panel-head"><h2>${esc(t('teamAccess'))}</h2></div>
  <p class="muted">${esc(t('teamAccessNote'))}</p>
  ${editable?'':`<p class="muted">${esc(t('teamReadOnly'))}</p>`}
  ${rolesTable}${newForm}<h3>${esc(t('memberList'))}</h3>${table}${audit}</section>`;
}

export const teamWords={
 zh:{teamAccess:'团队与权限',teamAccessNote:'账号角色是该成员在所有门店的默认权限；门店角色只在该门店生效并覆盖账号角色。只有账号管理员可以修改成员，且只能管理与其共享门店的成员；不能修改自己，也不会停用最后一位管理员。',
  teamReadOnly:'只有账号管理员可以查看和修改团队权限。',
  memberList:'成员',memberNew:'新增成员',memberCreate:'创建成员',memberUsername:'账号',memberRole:'账号角色',
  memberNewPassword:'初始密码（至少12位）',memberPassword:'重置密码',memberPasswordHint:'留空表示不改密码',
  memberProperties:'门店范围',memberPropertyRole:'本店角色',memberState:'状态',memberEnabled:'启用',memberDisabled:'停用',
  memberSelf:'本人账号，不能在此修改',memberPasswordChanged:'已改密码',memberCreated:'新建',memberTarget:'对象',
  memberRolesTitle:'角色说明',memberAuditTitle:'最近权限变更',actions:'操作',
  role_admin:'管理员',role_operations:'运营',role_finance:'财务',role_viewer:'只读',role_account:'跟随账号角色',
  roleDesc_admin:'房价与资源设置、成员与权限、夜审、交班、以及全部日常操作。',
  roleDesc_operations:'房态、订单、分房、入住退房、收款、清洁与关房、夜审与交班；不含房价、资源和成员设置。',
  roleDesc_finance:'结账与收款记录；不含房态、房价和成员设置。',
  roleDesc_viewer:'仅查看，不能写入任何业务数据。',
  member_input:'请检查账号、密码长度、角色与门店范围。',member_scope:'只能管理与你共享门店的成员，且门店必须在你的权限范围内。',
  member_self:'不能在此修改自己的权限。',member_last_admin:'至少保留一位启用的管理员。',password_length:'密码至少12位。'},
 en:{teamAccess:'Team & access',teamAccessNote:'The account role is the default everywhere; a property role applies to that property only and overrides it. Only account administrators can change members, only inside properties they share with them, never themselves, and never the last administrator.',
  teamReadOnly:'Only account administrators can view and change team access.',
  memberList:'Members',memberNew:'Add a member',memberCreate:'Create member',memberUsername:'Account',memberRole:'Account role',
  memberNewPassword:'Initial password (12 characters or more)',memberPassword:'Reset password',memberPasswordHint:'Leave blank to keep the password',
  memberProperties:'Properties',memberPropertyRole:'Role in this property',memberState:'State',memberEnabled:'Active',memberDisabled:'Disabled',
  memberSelf:'Your own account cannot be changed here',memberPasswordChanged:'password changed',memberCreated:'created',memberTarget:'Member',
  memberRolesTitle:'What each role allows',memberAuditTitle:'Recent access changes',actions:'Actions',
  role_admin:'Administrator',role_operations:'Operations',role_finance:'Finance',role_viewer:'Read only',role_account:'Use account role',
  roleDesc_admin:'Rates and resources, members and access, night audit, shift handovers, and every day-to-day operation.',
  roleDesc_operations:'Room state, bookings, assignment, check-in and check-out, receipts, cleaning and blocking, night audit and handovers. No rates, resources or member settings.',
  roleDesc_finance:'Settlement and receipt records only. No room state, rates or member settings.',
  roleDesc_viewer:'Read only. Cannot write any business data.',
  member_input:'Check the account, password length, role and property scope.',member_scope:'You can only manage members who share a property with you, inside properties you can reach.',
  member_self:'Your own access cannot be changed here.',member_last_admin:'At least one active administrator must remain.',password_length:'The password needs at least 12 characters.'},
 ms:{teamAccess:'Pasukan & akses',teamAccessNote:'Peranan akaun ialah lalai di semua hartanah; peranan hartanah hanya berkuat kuasa di hartanah itu dan mengatasinya. Hanya pentadbir akaun boleh menukar ahli, hanya dalam hartanah yang dikongsi, tidak pernah diri sendiri, dan tidak pernah pentadbir terakhir.',
  teamReadOnly:'Hanya pentadbir akaun boleh melihat dan menukar akses pasukan.',
  memberList:'Ahli',memberNew:'Tambah ahli',memberCreate:'Cipta ahli',memberUsername:'Akaun',memberRole:'Peranan akaun',
  memberNewPassword:'Kata laluan awal (12 aksara atau lebih)',memberPassword:'Tetap semula kata laluan',memberPasswordHint:'Biarkan kosong untuk kekalkan kata laluan',
  memberProperties:'Hartanah',memberPropertyRole:'Peranan di hartanah ini',memberState:'Status',memberEnabled:'Aktif',memberDisabled:'Dinyahaktif',
  memberSelf:'Akaun sendiri tidak boleh diubah di sini',memberPasswordChanged:'kata laluan ditukar',memberCreated:'dicipta',memberTarget:'Ahli',
  memberRolesTitle:'Apa yang setiap peranan benarkan',memberAuditTitle:'Perubahan akses terkini',actions:'Tindakan',
  role_admin:'Pentadbir',role_operations:'Operasi',role_finance:'Kewangan',role_viewer:'Baca sahaja',role_account:'Ikut peranan akaun',
  roleDesc_admin:'Kadar dan sumber, ahli dan akses, audit malam, serahan syif, serta semua operasi harian.',
  roleDesc_operations:'Status bilik, tempahan, penetapan, daftar masuk dan keluar, terimaan, pembersihan dan sekatan, audit malam dan serahan. Tiada kadar, sumber atau tetapan ahli.',
  roleDesc_finance:'Penyelesaian dan rekod terimaan sahaja. Tiada status bilik, kadar atau tetapan ahli.',
  roleDesc_viewer:'Baca sahaja. Tidak boleh menulis sebarang data perniagaan.',
  member_input:'Semak akaun, panjang kata laluan, peranan dan skop hartanah.',member_scope:'Anda hanya boleh mengurus ahli yang berkongsi hartanah dengan anda, dalam hartanah yang boleh anda capai.',
  member_self:'Akses sendiri tidak boleh diubah di sini.',member_last_admin:'Sekurang-kurangnya seorang pentadbir aktif mesti kekal.',password_length:'Kata laluan perlu sekurang-kurangnya 12 aksara.'}
};

// Property site. The page publishes a read-only public page for one property. It
// never claims a booking was taken: no payment is connected and nothing is emailed,
// so the site shows room types and availability and leaves the booking to a person.
export function propertySitePage({sites=[],siteAudit=[],roomTypes=[],ratePlans=[],propertyId,propertyName='',can,t,escape}) {
 const esc=escape||(v=>String(v??''));
 const editable=can('site_save');
 const site=sites.find(s=>s.propertyId===propertyId)||null;
 const languages=[['zh','langZh'],['en','langEn'],['ms','langMs']];
 const textField=(name,label,max)=>`<label class="site-text">${esc(t(label))}<span class="muted">${esc(t(name+'Hint'))}</span>${
   languages.map(([lang])=>`<input data-site-text="${esc(name)}" data-site-lang="${lang}" maxlength="${max}"
     placeholder="${esc(lang.toUpperCase())}" value="${esc(site?.[name]?.[lang]||'')}" ${editable?'':'disabled'}>`).join('')}</label>`;
 const typeOptions=roomTypes.filter(r=>!r.archived).map(r=>`<option value="${esc(r.id)}" ${(site?.roomTypeIds||[]).includes(r.id)?'selected':''} ${
   (site?.roomTypeIds||[]).includes(r.id)?'':'data-off'}>${esc(r.names?.[Object.keys(r.names||{})[0]]||r.id)}</option>`).join('');
 const planOptions=ratePlans.filter(p=>!p.archived).map(p=>`<option value="${esc(p.code)}" ${(site?.planCodes||[]).includes(p.code)?'selected':''}>${
   esc(typeof p.name==='string'?p.name:p.code)}</option>`).join('');
 const url=site?.slug?`${typeof location==='undefined'?'':location.origin}/sites/${esc(site.slug)}`:'';
 const form=`<form id="site-form" class="order-filters">
  <label>${esc(t('siteSlug'))}<input name="slug" value="${esc(site?.slug||'')}" pattern="[a-z0-9][a-z0-9-]{0,46}[a-z0-9]"
    placeholder="kl-bukit-bintang" ${editable?'':'disabled'}></label>
  <label>${esc(t('siteEnabled'))}<select name="enabled" ${editable?'':'disabled'}>
   <option value="false" ${site?.enabled?'':'selected'}>${esc(t('siteDraft'))}</option>
   <option value="true" ${site?.enabled?'selected':''}>${esc(t('sitePublished'))}</option></select></label>
  ${textField('title','siteTitle',120)}${textField('description','siteDescription',2000)}
  ${textField('contact','siteContact',500)}${textField('bookingNote','siteBookingNote',500)}
  <label>${esc(t('siteRoomTypes'))}<select name="roomTypes" multiple ${editable?'':'disabled'}>${typeOptions}</select></label>
  <label>${esc(t('sitePlans'))}<select name="plans" multiple ${editable?'':'disabled'}>${planOptions}</select></label>
  ${editable?`<button class="primary">${esc(t('save'))}</button>`:''}
 </form>`;
 const audit=siteAudit.length?`<h3>${esc(t('siteAuditTitle'))}</h3><div class="table-wrap"><table><thead><tr>${['time','createdBy','slug','siteState'].map(h=>`<th>${esc(t(h))}</th>`).join('')}</tr></thead><tbody>${
   siteAudit.map(a=>`<tr><td>${esc(a.at)}</td><td>${esc(a.actor)}</td><td>${esc(a.slug||'—')}</td><td>${
     esc(t(a.enabled?'sitePublished':'siteDraft'))}</td></tr>`).join('')}</tbody></table></div>`:'';
 return `<section class="panel"><div class="panel-head"><h2>${esc(t('propertySite'))}</h2></div>
  <p class="muted">${esc(t('siteNote'))}</p>
  ${site?.slug?`<p>${esc(t('siteUrl'))} <a href="/sites/${esc(site.slug)}" target="_blank" rel="noopener">${esc(url)}</a>${
    site.enabled?'':` <strong>${esc(t('siteNotLive'))}</strong>`}</p>`:`<p class="muted">${esc(t('siteNoSlug'))}</p>`}
  ${editable?'':`<p class="muted">${esc(t('siteReadOnly'))}</p>`}
  ${form}${audit}</section>`;
}

export const siteWords={
 zh:{propertySite:'\u95e8\u5e97\u7f51\u7ad9',siteNote:'\u53d1\u5e03\u540e\u4f1a\u751f\u6210\u4e00\u4e2a\u516c\u5f00\u53ea\u8bfb\u9875\u9762\uff0c\u5c55\u793a\u623f\u578b\u4e0e\u53ef\u8ba2\u60c5\u51b5\u3002\u7cfb\u7edf\u672a\u63a5\u5165\u5728\u7ebf\u652f\u4ed8\uff0c\u4e5f\u4e0d\u4f1a\u81ea\u52a8\u53d1\u4fe1\uff0c\u6240\u4ee5\u9875\u9762\u4e0d\u63a5\u53d7\u5728\u7ebf\u4e0b\u5355\uff0c\u9884\u8ba2\u4ecd\u9700\u4eba\u5de5\u8054\u7cfb\u786e\u8ba4\u3002',
  siteSlug:'\u7f51\u5740\u6807\u8bc6\uff08\u5c0f\u5199\u5b57\u6bcd\u3001\u6570\u5b57\u4e0e\u8fde\u5b57\u7b26\uff09',siteEnabled:'\u53d1\u5e03\u72b6\u6001',siteDraft:'\u8349\u7a3f',sitePublished:'\u5df2\u53d1\u5e03',
  siteTitle:'\u7ad9\u70b9\u6807\u9898',titleHint:'\u4e09\u79cd\u8bed\u8a00\u5404\u586b\u4e00\u884c',siteDescription:'\u7b80\u4ecb',descriptionHint:'\u5c55\u793a\u5728\u9875\u9762\u9876\u90e8',
  siteContact:'\u8054\u7cfb\u65b9\u5f0f',contactHint:'\u7535\u8bdd\u3001\u90ae\u7bb1\u6216\u5176\u4ed6\u8054\u7cfb\u65b9\u5f0f',siteBookingNote:'\u9884\u8ba2\u8bf4\u660e',bookingNoteHint:'\u544a\u8bc9\u5ba2\u4eba\u5982\u4f55\u5b8c\u6210\u9884\u8ba2',
  siteRoomTypes:'\u5bf9\u5916\u5c55\u793a\u7684\u623f\u578b\uff08\u4e0d\u9009\u5219\u5c55\u793a\u5168\u90e8\uff09',sitePlans:'\u5bf9\u5916\u516c\u5f00\u7684\u4ef7\u8ba1\u5212\uff08\u4e0d\u9009\u5219\u4e0d\u663e\u793a\u4ef7\u683c\uff09',
  siteUrl:'\u516c\u5f00\u5730\u5740',siteNoSlug:'\u5c1a\u672a\u8bbe\u7f6e\u7f51\u5740\u6807\u8bc6\uff0c\u9875\u9762\u8fd8\u4e0d\u4f1a\u5bf9\u5916\u5f00\u653e\u3002',siteNotLive:'\u5f53\u524d\u4e3a\u8349\u7a3f\uff0c\u5916\u90e8\u65e0\u6cd5\u8bbf\u95ee\u3002',
  siteReadOnly:'\u53ea\u6709\u672c\u95e8\u5e97\u7684\u7ba1\u7406\u5458\u53ef\u4ee5\u53d1\u5e03\u7f51\u7ad9\u3002',siteAuditTitle:'\u6700\u8fd1\u53d1\u5e03\u8bb0\u5f55',
  langZh:'\u4e2d\u6587',langEn:'English',langMs:'Bahasa Melayu',slug:'\u7f51\u5740\u6807\u8bc6',
  site_slug:'\u7f51\u5740\u6807\u8bc6\u53ea\u80fd\u4f7f\u7528\u5c0f\u5199\u5b57\u6bcd\u3001\u6570\u5b57\u4e0e\u8fde\u5b57\u7b26\uff0c\u4e14\u4e0d\u80fd\u4e0e\u5176\u4ed6\u95e8\u5e97\u91cd\u590d\u3002',
  site_input:'\u8bf7\u68c0\u67e5\u6240\u9009\u7684\u623f\u578b\u4e0e\u4ef7\u8ba1\u5212\u662f\u5426\u5c5e\u4e8e\u672c\u95e8\u5e97\u3002'},
 en:{propertySite:'Property site',siteNote:'Publishing creates a public read-only page showing room types and availability. No online payment is connected and nothing is sent automatically, so the site takes no booking: a reservation still has to be confirmed by a person.',
  siteSlug:'Address slug (lower-case letters, digits and hyphens)',siteEnabled:'Publication',siteDraft:'Draft',sitePublished:'Published',
  siteTitle:'Site title',titleHint:'One line per language',siteDescription:'Introduction',descriptionHint:'Shown at the top of the page',
  siteContact:'Contact details',contactHint:'Phone, email or anything else a guest can reach',siteBookingNote:'Booking note',bookingNoteHint:'Tell guests how to complete a booking',
  siteRoomTypes:'Room types shown (leave empty to show all)',sitePlans:'Rate plans published (leave empty to show no price)',
  siteUrl:'Public address',siteNoSlug:'No address slug set yet, so the page is not reachable from outside.',siteNotLive:'Currently a draft, so it cannot be opened from outside.',
  siteReadOnly:'Only an administrator of this property can publish the site.',siteAuditTitle:'Recent publishing activity',
  langZh:'Chinese',langEn:'English',langMs:'Malay',slug:'Address slug',
  site_slug:'The slug may only use lower-case letters, digits and hyphens, and must not be reused by another property.',
  site_input:'Check that the room types and rate plans you selected belong to this property.'},
 ms:{propertySite:'Laman hartanah',siteNote:'Penerbitan menghasilkan halaman awam baca sahaja yang memaparkan jenis bilik dan ketersediaan. Tiada pembayaran dalam talian disambungkan dan tiada apa dihantar secara automatik, jadi laman ini tidak mengambil tempahan: tempahan masih perlu disahkan oleh seseorang.',
  siteSlug:'Slug alamat (huruf kecil, nombor dan sengkang)',siteEnabled:'Penerbitan',siteDraft:'Draf',sitePublished:'Diterbitkan',
  siteTitle:'Tajuk laman',titleHint:'Satu baris bagi setiap bahasa',siteDescription:'Pengenalan',descriptionHint:'Dipaparkan di bahagian atas halaman',
  siteContact:'Butiran hubungan',contactHint:'Telefon, e-mel atau apa-apa yang boleh dicapai tetamu',siteBookingNote:'Nota tempahan',bookingNoteHint:'Beritahu tetamu cara melengkapkan tempahan',
  siteRoomTypes:'Jenis bilik dipaparkan (kosongkan untuk papar semua)',sitePlans:'Pelan kadar diterbitkan (kosongkan untuk tiada harga)',
  siteUrl:'Alamat awam',siteNoSlug:'Tiada slug alamat ditetapkan, jadi halaman tidak boleh dicapai dari luar.',siteNotLive:'Masih draf, jadi tidak boleh dibuka dari luar.',
  siteReadOnly:'Hanya pentadbir hartanah ini boleh menerbitkan laman.',siteAuditTitle:'Aktiviti penerbitan terkini',
  langZh:'Cina',langEn:'Inggeris',langMs:'Melayu',slug:'Slug alamat',
  site_slug:'Slug hanya boleh menggunakan huruf kecil, nombor dan sengkang, dan tidak boleh digunakan semula oleh hartanah lain.',
  site_input:'Semak bahawa jenis bilik dan pelan kadar yang dipilih milik hartanah ini.'}
};

// Data maintenance. Clearing test bookings is destructive and irreversible, so the
// page counts what would go first, names the exact rule it uses, and a real booking
// can only be caught if someone types its name.
export function dataMaintenancePage({orders=[],reservations=[],propertyId,can,t,escape}) {
 const esc=escape||(v=>String(v??''));
 const editable=can('purge_test_orders');
 const prefix='TEST';
 const match=String(prefix).toUpperCase();
 const doomed=orders.filter(o=>o.propertyId===propertyId&&String(o.guest||'').toUpperCase().startsWith(match));
 const kept=orders.filter(o=>o.propertyId===propertyId).length-doomed.length;
 const preview=doomed.length?`<div class="table-wrap"><table><thead><tr>${['guest','movementStart','movementEnd','stayStatus'].map(h=>`<th>${esc(t(h))}</th>`).join('')}</tr></thead><tbody>${
   doomed.slice(0,50).map(o=>`<tr><td>${esc(o.guest)}</td><td>${esc(o.start)}</td><td>${esc(o.end)}</td><td>${esc(
     t('status_'+(o.status||''))||o.status||'')}</td></tr>`).join('')}</tbody></table></div>${
   doomed.length>50?`<p class="muted">${esc(t('cleanupMore'))} ${doomed.length-50}</p>`:''}`:`<p class="muted">${esc(t('cleanupNone'))}</p>`;
 return `<section class="panel"><div class="panel-head"><h2>${esc(t('dataMaintenance'))}</h2></div>
  <p class="muted">${esc(t('cleanupNote'))}</p>
  <p>${esc(t('cleanupRule'))} <strong>${esc(prefix)}</strong></p>
  <p><strong>${esc(t('cleanupWillDelete'))}</strong> ${doomed.length} · <strong>${esc(t('cleanupWillKeep'))}</strong> ${kept}</p>
  ${preview}
  ${editable?`<form id="cleanup-form" class="order-filters">
   <label>${esc(t('cleanupPrefix'))}<input name="prefix" data-cleanup-prefix value="${esc(prefix)}" maxlength="20" required></label>
  </form>
  <p><button type="button" class="danger" data-cleanup-run ${doomed.length?'':'disabled'}>${esc(t('cleanupRun'))}</button></p>`:`<p class="muted">${esc(t('cleanupReadOnly'))}</p>`}
  <p class="muted">${esc(t('cleanupIrreversible'))}</p></section>`;
}

export const cleanupWords={
 zh:{dataMaintenance:'\u6570\u636e\u7ef4\u62a4',cleanupNote:'\u6e05\u7a7a\u6d4b\u8bd5\u8ba2\u5355\u4f1a\u628a\u8ba2\u5355\u76f4\u63a5\u5220\u9664\uff0c\u800c\u4e0d\u662f\u53d6\u6d88\u5b83\u4eec\uff0c\u6240\u4ee5\u4e0d\u4f1a\u5728\u8d26\u76ee\u91cc\u7559\u4e0b\u4e00\u6279\u5df2\u53d6\u6d88\u7684\u8425\u6536\u3002\u95e8\u5e97\u3001\u623f\u578b\u3001\u623f\u4ef7\u4e0e\u771f\u5b9e\u8ba2\u5355\u4e00\u5f8b\u4fdd\u7559\u3002',
  cleanupRule:'\u5339\u914d\u89c4\u5219\uff1a\u5bbe\u5ba2\u540d\u79f0\u4ee5\u4e0b\u5217\u524d\u7f00\u5f00\u5934\uff08\u4e0d\u533a\u5206\u5927\u5c0f\u5199\uff09',cleanupWillDelete:'\u5c06\u5220\u9664',cleanupWillKeep:'\u5c06\u4fdd\u7559',
  cleanupNone:'\u5f53\u524d\u6ca1\u6709\u7b26\u5408\u8be5\u524d\u7f00\u7684\u8ba2\u5355\u3002',cleanupMore:'\u8fd8\u6709',cleanupPrefix:'\u5bbe\u5ba2\u540d\u79f0\u524d\u7f00',
  cleanupRun:'\u6e05\u7a7a\u8fd9\u4e9b\u8ba2\u5355',cleanupReadOnly:'\u53ea\u6709\u672c\u95e8\u5e97\u7684\u7ba1\u7406\u5458\u53ef\u4ee5\u6e05\u7a7a\u6d4b\u8bd5\u8ba2\u5355\u3002',
  cleanupIrreversible:'\u5220\u9664\u4e0d\u53ef\u6062\u590d\uff1b\u6bcf\u4e00\u7b14\u88ab\u5220\u9664\u7684\u8ba2\u5355\u90fd\u4f1a\u8bb0\u5f55\u5728\u5ba1\u8ba1\u91cc\uff08\u5bbe\u5ba2\u540d\u3001\u65e5\u671f\u4e0e\u72b6\u6001\uff09\u3002',
  nothing_to_purge:'\u6ca1\u6709\u7b26\u5408\u8be5\u524d\u7f00\u7684\u8ba2\u5355\uff0c\u672a\u505a\u4efb\u4f55\u6539\u52a8\u3002',cleanupConfirm:'\u786e\u5b9a\u8981\u5220\u9664\u8fd9\u4e9b\u8ba2\u5355\u5417\uff1f\u6b64\u64cd\u4f5c\u4e0d\u53ef\u6062\u590d\u3002'},
 en:{dataMaintenance:'Data maintenance',cleanupNote:'Clearing test bookings deletes them outright instead of cancelling them, so it leaves no cancelled revenue behind in the accounts. Properties, room types, rates and real bookings are all kept.',
  cleanupRule:'Matching rule: the guest name begins with this prefix (case-insensitive)',cleanupWillDelete:'Will delete',cleanupWillKeep:'Will keep',
  cleanupNone:'Nothing currently matches that prefix.',cleanupMore:'more',cleanupPrefix:'Guest name prefix',
  cleanupRun:'Delete these bookings',cleanupReadOnly:'Only an administrator of this property can clear test bookings.',
  cleanupIrreversible:'Deletion cannot be undone. Every booking removed is listed in the audit with its guest name, dates and state.',
  nothing_to_purge:'Nothing matched that prefix, so nothing was changed.',cleanupConfirm:'Delete these bookings? This cannot be undone.'},
 ms:{dataMaintenance:'Penyelenggaraan data',cleanupNote:'Mengosongkan tempahan ujian memadamnya terus dan bukannya membatalkannya, jadi tiada hasil yang dibatalkan tertinggal dalam akaun. Hartanah, jenis bilik, kadar dan tempahan sebenar semuanya dikekalkan.',
  cleanupRule:'Peraturan padanan: nama tetamu bermula dengan awalan ini (tidak kira huruf besar atau kecil)',cleanupWillDelete:'Akan dipadam',cleanupWillKeep:'Akan dikekalkan',
  cleanupNone:'Tiada yang sepadan dengan awalan itu sekarang.',cleanupMore:'lagi',cleanupPrefix:'Awalan nama tetamu',
  cleanupRun:'Padam tempahan ini',cleanupReadOnly:'Hanya pentadbir hartanah ini boleh mengosongkan tempahan ujian.',
  cleanupIrreversible:'Pemadaman tidak boleh dibuat asal. Setiap tempahan yang dipadam disenaraikan dalam audit bersama nama tetamu, tarikh dan status.',
  nothing_to_purge:'Tiada yang sepadan dengan awalan itu, jadi tiada apa diubah.',cleanupConfirm:'Padam tempahan ini? Ini tidak boleh dibuat asal.'}
};

// Booking requests raised from a published site. Accepting one is what turns it into a
// stay, so until someone does, nothing is booked, charged or held, and the quoted
// figure is only what the site showed the guest at the moment they asked.
export function bookingRequestsPage({requests=[],events=[],roomTypes=[],propertyId,can,t,escape,currency}) {
 const esc=escape||(v=>String(v??''));
 const money=currency||(v=>String(v??''));
 const editable=can('booking_request_decision');
 const mine=requests.filter(r=>r.propertyId===propertyId);
 const pending=mine.filter(r=>r.status==='pending').length;
 const typeName=id=>{const type=roomTypes.find(r=>r.id===id);return type?(type.names&&Object.values(type.names).find(Boolean))||type.id:id;};
 const statusKey=r=>r.withdrawnAt?'requestWithdrawn':({pending:'requestPending',accepted:'requestAccepted',declined:'requestDeclined'}[r.status]||r.status);
 const actionKey=action=>({submit:'requestSubmitted',accept:'requestAccepted',decline:'requestDeclined',withdraw:'requestWithdrawn'}[action]||action);
 const quote=r=>r.quotedTotal===null||r.quotedTotal===undefined
   ?`<span class="muted">${esc(t('requestNoQuote'))}</span>`:esc(money(r.quotedTotal));
 const cell=(r,key)=>esc({time:String(r.createdAt||'').slice(0,16).replace('T',' '),guest:r.guest,contact:r.contact,
   start:r.start,end:r.end,roomType:typeName(r.roomTypeId),guests:r.guests,rooms:r.rooms||1}[key]??'');
 const rows=mine.map(r=>{
   const action=r.status!=='pending'?'':editable?`<button type="button" data-request-accept="${esc(r.id)}">${esc(t('requestAccept'))}</button>
     <input data-request-reason="${esc(r.id)}" maxlength="500" placeholder="${esc(t('requestReason'))}" aria-label="${esc(t('requestReason'))}">
     <button type="button" data-request-decline="${esc(r.id)}">${esc(t('requestDecline'))}</button>`
     :`<span class="muted">${esc(t('requestReadOnly'))}</span>`;
   const outcome=r.withdrawnAt?esc(t('requestGuestWithdrawn')):r.status==='accepted'
     ?(r.orderId?`<button type="button" data-open-stay="${esc(r.orderId)}">${esc(t('requestOrder'))}</button>`
       :esc(t('requestAccepted'))):r.status==='declined'?esc(r.decisionNote||''):'';
   return `<tr><td>${cell(r,'time')}</td><td><strong>${cell(r,'guest')}</strong></td><td>${cell(r,'contact')}</td>
    <td>${cell(r,'start')}</td><td>${cell(r,'end')}</td><td>${cell(r,'roomType')}</td><td>${cell(r,'guests')}</td>
    <td>${cell(r,'rooms')}</td><td>${quote(r)}</td><td>${esc(t(statusKey(r)))}</td><td>${action}${outcome?` ${outcome}`:''}</td></tr>`;
  }).join('');
 const history=events.length?`<h3>${esc(t('requestEvents'))}</h3><div class="table-wrap"><table><thead><tr>${['time','createdBy','requestStatus','requestReason'].map(h=>`<th>${esc(t(h))}</th>`).join('')}</tr></thead><tbody>${
   events.slice(0,50).map(e=>`<tr><td>${esc(String(e.at||'').slice(0,16).replace('T',' '))}</td><td>${esc(e.actor)}</td><td>${
     esc(t(actionKey(e.action)))}</td><td>${esc(e.reason||'')}</td></tr>`).join('')}</tbody></table></div>`:'';
 return `<section class="panel"><div class="panel-head"><h2>${esc(t('bookingRequests'))}</h2><span>${esc(t('requestAwaiting'))}: ${pending}</span></div>
  <p class="muted">${esc(t('requestsNote'))}</p>
  <p class="muted">${esc(t('requestsPriceNote'))}</p>
  <p class="muted">${esc(t('requestReasonNote'))}</p>
  ${mine.length?`<div class="table-wrap"><table><thead><tr>${['requestTime','requestGuest','requestContact','requestStart','requestEnd','requestRoomType','requestGuests','requestRooms','requestQuote','requestStatus','requestActions'].map(h=>`<th>${esc(t(h))}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>`
    :`<p class="empty">${esc(t('requestsNone'))}</p>`}
  ${editable?'':`<p class="muted">${esc(t('requestReadOnly'))}</p>`}
  ${history}</section>`;
}

export const requestWords={
 zh:{bookingRequests:'预订请求',requestAwaiting:'待确认',
  requestsNote:'来自已发布门店网站的请求。接受后才会生成订单并占用库存；系统未接入在线支付，接受不等于收款，款项仍在前台按实际收取。',
  requestsPriceNote:'显示的价格是客人提交时按公布房价算出的参考值。若当时没有公布价格，订单会以零房价建立，需要前台补充房价。',
  requestTime:'提交时间',requestGuest:'客人',requestContact:'联系方式',requestStart:'入住',requestEnd:'退房',requestRoomType:'房型',
  requestGuests:'人数',requestRooms:'房间数',requestWithdrawn:'已撤回',requestGuestWithdrawn:'客人自行撤回',requestReasonNote:'拒绝时填写的原因会原样展示给客人查询自己的请求，请勿写入内部信息。',requestQuote:'提交时报价',requestStatus:'状态',requestActions:'处理',
  requestPending:'待确认',requestAccepted:'已接受',requestDeclined:'已拒绝',requestSubmitted:'已提交',
  requestNoQuote:'无公布价格',requestAccept:'接受并生成订单',requestDecline:'拒绝',requestReason:'拒绝原因',requestOrder:'查看订单',
  requestReadOnly:'只有本门店的操作员及以上可以处理预订请求。',requestsNone:'本门店暂无来自网站的预订请求。',requestEvents:'最近处理记录',
  requestConfirm:'接受后会立即生成订单并占用库存，确定继续吗？',
  request_state:'这条请求已经处理过了，请刷新后查看结果。',request_input:'请指定接受或拒绝。',request_reason:'拒绝必须填写原因。'},
 en:{bookingRequests:'Booking requests',requestAwaiting:'Awaiting a decision',
  requestsNote:'Requests raised from the published property site. Only accepting one creates a booking and takes inventory. No online payment is connected, so accepting is not taking money: payment is still taken at the desk as usual.',
  requestsPriceNote:'The price shown is what the site quoted when the guest asked. Where no price was published then, the booking is created at zero and the rate has to be filled in at the desk.',
  requestTime:'Asked at',requestGuest:'Guest',requestContact:'Contact',requestStart:'Arrival',requestEnd:'Departure',requestRoomType:'Room type',
  requestGuests:'Guests',requestRooms:'Rooms',requestWithdrawn:'Withdrawn',requestGuestWithdrawn:'Withdrawn by the guest',requestReasonNote:'The reason given when declining is shown to the guest looking up their request, so do not put internal notes there.',requestQuote:'Quoted when asked',requestStatus:'Status',requestActions:'Decision',
  requestPending:'Awaiting a decision',requestAccepted:'Accepted',requestDeclined:'Declined',requestSubmitted:'Submitted',
  requestNoQuote:'No published price',requestAccept:'Accept and create the booking',requestDecline:'Decline',requestReason:'Reason',requestOrder:'Open booking',
  requestReadOnly:'Only an operator or an administrator of this property can decide on booking requests.',requestsNone:'No booking request has reached this property yet.',requestEvents:'Recent decisions',
  requestConfirm:'Accepting creates the booking at once and takes the inventory. Continue?',
  request_state:'That request has already been decided, so refresh and check the result.',request_input:'Say whether the request is accepted or declined.',request_reason:'Declining needs a reason.'},
 ms:{bookingRequests:'Permintaan tempahan',requestAwaiting:'Menunggu keputusan',
  requestsNote:'Permintaan daripada laman hartanah yang diterbitkan. Hanya menerima mencipta tempahan dan mengambil inventori. Tiada pembayaran dalam talian disambungkan, jadi menerima bukan mengambil wang: bayaran masih diambil di kaunter seperti biasa.',
  requestsPriceNote:'Harga yang ditunjukkan ialah apa yang laman sebut harga semasa tetamu meminta. Jika tiada harga diterbitkan ketika itu, tempahan dicipta pada sifar dan kadar perlu diisi di kaunter.',
  requestTime:'Diminta pada',requestGuest:'Tetamu',requestContact:'Hubungan',requestStart:'Daftar masuk',requestEnd:'Daftar keluar',requestRoomType:'Jenis bilik',
  requestGuests:'Bilangan tetamu',requestRooms:'Bilik',requestWithdrawn:'Ditarik balik',requestGuestWithdrawn:'Ditarik balik oleh tetamu',requestReasonNote:'Sebab semasa menolak ditunjukkan kepada tetamu yang menyemak permintaan, jangan tulis nota dalaman di situ.',requestQuote:'Sebut harga semasa diminta',requestStatus:'Status',requestActions:'Keputusan',
  requestPending:'Menunggu keputusan',requestAccepted:'Diterima',requestDeclined:'Ditolak',requestSubmitted:'Dihantar',
  requestNoQuote:'Tiada harga diterbitkan',requestAccept:'Terima dan cipta tempahan',requestDecline:'Tolak',requestReason:'Sebab',requestOrder:'Buka tempahan',
  requestReadOnly:'Hanya operator atau pentadbir hartanah ini boleh membuat keputusan tentang permintaan tempahan.',requestsNone:'Belum ada permintaan tempahan untuk hartanah ini.',requestEvents:'Keputusan terkini',
  requestConfirm:'Menerima akan mencipta tempahan serta-merta dan mengambil inventori. Teruskan?',
  request_state:'Permintaan itu sudah diputuskan, sila muat semula dan semak hasilnya.',request_input:'Nyatakan sama ada permintaan diterima atau ditolak.',request_reason:'Menolak memerlukan sebab.'}
};
// What the system wants a person to notice. These are raised inside JOVIAN only: with no
// email, SMS or push connected, nothing is delivered anywhere, so a notice is seen by
// signing in. It points at the work and never does the work itself.
export function notificationsPage({notifications=[],properties=[],propertyId,noticeSettings=[],noticeSettingsAudit=[],can=()=>false,t,escape}) {
 const esc=escape||(v=>String(v??''));
 const propertyName=id=>properties.find(p=>p.id===id)?.name||id;
 // Only this property's notices are acted on from here. Reading one belonging to
 // another property would have to be sent against that property's revision, so the
 // count of those is shown and the list stays where it can be dealt with.
 const mine=notifications.filter(n=>n.propertyId===propertyId);
 const unread=mine.filter(n=>!n.readAt).length;
 const other=notifications.filter(n=>!n.readAt&&n.propertyId!==propertyId).length;
 const kindKey=kind=>({booking_request:'noticeBookingRequest',no_show:'noticeNoShow',overdue_checkout:'noticeOverdue',
  unassigned_arrival:'noticeUnassigned',rooms_to_clean:'noticeCleaning',request_waiting:'noticeWaiting',checkin_review:'noticeCheckinReview'}[kind]||kind);
 // A guest standing outside the door is not the same as a room needing cleaning. The
 // level is what the list is ordered by, so the person reading it sees people first.
 const level=n=>n.severity==='urgent'?'severityUrgent':n.severity==='routine'?'severityRoutine':'severityAttention';
 const rank=n=>n.severity||'attention';
 // A stored notice repeats what was asked for; a standing one names what is still wrong.
 const detail=n=>{
   if(n.kind==='booking_request')return `${esc(n.guest||'')} · ${esc(n.from||'')} → ${esc(n.to||'')} · ${esc(n.nights??'')} ${esc(t('nights'))}${n.quotedTotal?' · '+esc(t('requestQuote')):''}`;
   if(n.kind==='no_show')return `${esc(n.guest||'')} · ${esc(t('noticeDue'))} ${esc(n.date||'')}`;
   if(n.kind==='overdue_checkout')return `${esc(n.guest||'')} · ${esc(t('noticeDue'))} ${esc(n.date||'')}`;
   if(n.kind==='unassigned_arrival')return `${esc(n.guest||'')} · ${esc(n.date||'')}`;
   if(n.kind==='rooms_to_clean')return `${esc(n.count??0)} ${esc(t('noticeRoomsUnit'))}`;
   if(n.kind==='request_waiting')return `${esc(n.guest||'')} · ${esc(t('noticeWaitingNote'))}`;
   if(n.kind==='checkin_review')return `${esc(n.guest||'')} · ${esc(t('noticeCheckinReviewNote'))}`;
   return esc(t(kindKey(n.kind)));
 };
 // Where the work actually is: an order opens its own details, cleaning opens the task
 // board, and a request opens the queue. None of them decides anything by itself.
 const action=n=>{
   if(n.kind==='booking_request'||n.kind==='request_waiting')return n.requestId?`<button type="button" data-notice-open="${esc(n.requestId)}">${esc(t('noticeOpen'))}</button>`:'';
   if(n.kind==='rooms_to_clean')return `<button type="button" data-notice-view="tasks">${esc(t('noticeOpen'))}</button>`;
   // Identity handed in and waiting on a person: the review page is where it is checked.
   if(n.kind==='checkin_review')return `<button type="button" data-notice-view="checkin">${esc(t('noticeOpen'))}</button>`;
   return n.orderId?`<button type="button" data-open-stay="${esc(n.orderId)}">${esc(t('noticeOpenOrder'))}</button>`:'';
 };
 const rows=mine.map(n=>`<tr class="${n.readAt?'':'unread'} sev-${esc(rank(n))}"><td>${esc(n.due??String(n.at||'').slice(0,16).replace('T',' '))}</td>
   <td><span class="sev sev-${esc(rank(n))}">${esc(t(level(n)))}</span></td>
   <td>${esc(t(kindKey(n.kind)))}</td><td>${detail(n)}</td><td>${esc(propertyName(n.propertyId))}</td>
   <td>${esc(t(n.readAt?'noticeRead':'noticeUnread'))}</td>
   <td>${action(n)}${n.readAt?'':`<button type="button" data-notice-read="${esc(n.id)}">${esc(t('noticeMarkRead'))}</button>`}</td></tr>`).join('');
 // A property may decide that housekeeping matters more to it than a late arrival,
 // or the other way round. Only the levels it actually changed are stored, so leaving
 // one at the default keeps following the system rule rather than freezing an old one.
 const levelKey=l=>l==='urgent'?'severityUrgent':l==='routine'?'severityRoutine':'severityAttention';
 const editable=can('notice_severity_save');
 const setting=(noticeSettings||[]).find(s=>s.propertyId===propertyId);
 const levels=setting?.levels||{};
 const levelRows=noticeKinds.map(kind=>{
   const fallback=severityOf(kind),chosen=levels[kind];
   const options=`<option value="default" ${chosen?'':'selected'}>${esc(t('noticeLevelDefault'))} · ${esc(t(levelKey(fallback)))}</option>`+
     noticeLevels.map(l=>`<option value="${l}" ${chosen===l?'selected':''}>${esc(t(levelKey(l)))}</option>`).join('');
   return `<tr><td>${esc(t(kindKey(kind)))}</td><td>${esc(t(levelKey(fallback)))}</td>
     <td><select name="${esc(kind)}" data-notice-level ${editable?'':'disabled'}>${options}</select></td></tr>`;
 }).join('');
 const levelAudit=(noticeSettingsAudit||[]).filter(a=>a.propertyId===propertyId).slice(0,10).map(a=>{
   const changed=noticeKinds.filter(k=>(a.previous?.[k]??null)!==(a.next?.[k]??null))
     .map(k=>`${esc(t(kindKey(k)))}: ${esc(a.previous?.[k]?t(levelKey(a.previous[k])):t('noticeLevelDefault'))} → ${esc(a.next?.[k]?t(levelKey(a.next[k])):t('noticeLevelDefault'))}`).join('; ');
   return `<tr><td>${esc(a.at)}</td><td>${esc(a.actor)}</td><td>${changed||'—'}</td></tr>`;
 }).join('');
 return `<section class="panel"><div class="panel-head"><h2>${esc(t('notifications'))}</h2><span>${esc(t('noticeUnreadCount'))}: ${unread}</span></div>
  <p class="muted">${esc(t('noticeNote'))}</p>
  <p class="muted">${esc(t('noticeStandingNote'))}</p>
  ${other?`<p class="muted">${esc(t('noticeOtherProperty'))}: ${other}</p>`:''}
  ${mine.length?`<div class="table-wrap"><table><thead><tr>${['time','noticeSeverity','noticeKind','noticeDetail','noticeProperty','noticeState','noticeActions'].map(h=>`<th>${esc(t(h))}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>`
    :`<p class="empty">${esc(t('noticeNone'))}</p>`}
  <p class="muted">${esc(t('noticeSeverityNote'))}</p>
  ${unread?`<div class="actions"><button type="button" data-notice-all>${esc(t('noticeMarkAllRead'))}</button></div>`:''}</section>
  <section class="panel"><div class="panel-head"><h2>${esc(t('noticeLevelTitle'))}</h2>${setting?`<span>${esc(t('noticeLevelChanged'))}: ${esc(setting.updatedBy)} · ${esc(setting.updatedAt)}</span>`:''}</div>
   <p class="muted">${esc(t('noticeLevelNote'))}</p>
   <form id="notice-severity-form" class="notice-settings">
    <div class="table-wrap"><table><thead><tr>${['noticeKind','noticeLevelBuiltIn','noticeLevelProperty'].map(h=>`<th>${esc(t(h))}</th>`).join('')}</tr></thead><tbody>${levelRows}</tbody></table></div>
    ${editable?`<button class="primary">${esc(t('noticeLevelSave'))}</button>`:`<p class="muted">${esc(t('noticeLevelReadOnly'))}</p>`}
   </form>
   ${levelAudit?`<h3>${esc(t('noticeLevelAudit'))}</h3><div class="table-wrap"><table><thead><tr>${['time','createdBy','noticeLevelChange'].map(h=>`<th>${esc(t(h))}</th>`).join('')}</tr></thead><tbody>${levelAudit}</tbody></table></div>`:''}
  </section>`;
}

export const noticeWords={
 zh:{notifications:'提醒',noticeUnreadCount:'未读',noticeNote:'提醒只在系统内出现：没有连接邮件、短信或推送，不会发给任何人，登录后才能看到。提醒只指向需要处理的事，不会替你处理。',
  noticeOtherProperty:'其它门店的未读',noticeKind:'类型',noticeDetail:'内容',noticeProperty:'门店',noticeState:'状态',noticeActions:'操作',
  noticeUnread:'未读',noticeRead:'已读',noticeOpen:'前往处理',noticeMarkRead:'标记已读',noticeMarkAllRead:'把当前门店全部标为已读',
  noticeBookingRequest:'新的网站预订请求',noticeNone:'暂时没有提醒。',nights:'晚',requestQuote:'含报价',
  noticeNoShow:'应入住未入住',noticeOverdue:'应离店未退房',noticeUnassigned:'今日到店未分房',noticeCleaning:'待清洁房',
  noticeWaiting:'预订请求等待过久',noticeDue:'到期日',noticeRoomsUnit:'间待清洁',noticeWaitingNote:'已等待超过一天',
  noticeLevelTitle:'提醒级别设置',noticeLevelNote:'门店可以自己决定每类提醒排在哪里：把待清洁房设为紧急，或把某类到店提醒设为常规，只影响本店。留空（系统默认）会跟随当前系统规则，不会把旧默认值冻结在设置里。级别只改变列表顺序与标签，不改变提醒是否产生、未读数量，也不替任何人处理事情。',noticeLevelBuiltIn:'系统默认',noticeLevelProperty:'本店级别',noticeLevelDefault:'系统默认',noticeLevelSave:'保存级别',noticeLevelReadOnly:'只有本店管理员可以调整提醒级别。',noticeLevelAudit:'最近的级别调整',noticeLevelChange:'改动',noticeLevelChanged:'最近修改',noticeSeverity:'级别',severityUrgent:'紧急',severityAttention:'需处理',severityRoutine:'常规',noticeCheckinReview:'自助登记待核验',noticeCheckinReviewNote:'已提交身份资料，等待人工核验',noticeSeverityNote:'默认排序按级别：该来的客人、该走的客人、未分房的到店和等待核验的登记排在最前，待清洁房排在最后。本店可在下方调整每类的级别。',noticeOpenOrder:'打开订单',noticeStandingNote:'下面这些是当前仍未处理的事实，不是事件：一旦处理完，它们会自己消失。',
  notice_read_failed:'标记已读失败，请稍后再试。',notifications_polling:'提醒每约一分钟自动检查一次，不刷新你正在操作的页面。'},
 en:{notifications:'Notifications',noticeUnreadCount:'Unread',noticeNote:'Notices stay inside JOVIAN: no email, SMS or push is connected, so nothing is sent to anyone and they are only seen by signing in. A notice points at the work; it never does the work.',
  noticeOtherProperty:'Unread in other properties',noticeKind:'Type',noticeDetail:'Detail',noticeProperty:'Property',noticeState:'State',noticeActions:'Actions',
  noticeUnread:'Unread',noticeRead:'Read',noticeOpen:'Go to it',noticeMarkRead:'Mark read',noticeMarkAllRead:'Mark everything in this property read',
  noticeBookingRequest:'New booking request from the site',noticeNone:'Nothing to notify you about.',nights:'nights',requestQuote:'quoted',
  noticeNoShow:'Arrival that never arrived',noticeOverdue:'Departure that never left',noticeUnassigned:'Arriving today, no room yet',
  noticeCleaning:'Rooms needing cleaning',noticeWaiting:'Booking request left waiting',noticeDue:'Due',noticeRoomsUnit:'to clean',
  noticeWaitingNote:'waiting for more than a day',noticeLevelTitle:'Notice priority settings',noticeLevelNote:'A property decides where each kind of notice sits: make cleaning urgent, or make an arrival routine. It only affects this property. Leaving one at the system default keeps following the current rule instead of freezing an old default into a setting. A level changes the order and the label only: it does not change whether a notice is raised, the unread count, or do any of the work.',noticeLevelBuiltIn:'System default',noticeLevelProperty:'This property',noticeLevelDefault:'System default',noticeLevelSave:'Save priorities',noticeLevelReadOnly:'Only an administrator of this property can change notice priorities.',noticeLevelAudit:'Recent priority changes',noticeLevelChange:'Change',noticeLevelChanged:'Last changed',noticeSeverity:'Priority',severityUrgent:'Urgent',severityAttention:'Attention',severityRoutine:'Routine',noticeCheckinReview:'Registration waiting for review',noticeCheckinReviewNote:'identity details submitted, waiting for a person to check them',noticeSeverityNote:'By default the list is ordered by priority: guests who should have arrived or left, arrivals with no room, and registrations waiting for review come first; rooms needing cleaning come last. This property can change each level below.',noticeOpenOrder:'Open booking',
  noticeStandingNote:'These are facts still standing rather than things that happened. Once one is dealt with it disappears by itself.',
  notice_read_failed:'Marking as read failed, so please try again.',notifications_polling:'Notices are checked about once a minute. The page you are working on is not reloaded.'},
 ms:{notifications:'Pemberitahuan',noticeUnreadCount:'Belum dibaca',noticeNote:'Pemberitahuan kekal dalam JOVIAN: tiada e-mel, SMS atau push disambungkan, jadi tiada apa dihantar dan hanya kelihatan selepas log masuk. Ia menunjuk kepada kerja, bukan melakukannya.',
  noticeOtherProperty:'Belum dibaca di hartanah lain',noticeKind:'Jenis',noticeDetail:'Butiran',noticeProperty:'Hartanah',noticeState:'Status',noticeActions:'Tindakan',
  noticeUnread:'Belum dibaca',noticeRead:'Dibaca',noticeOpen:'Pergi ke situ',noticeMarkRead:'Tanda dibaca',noticeMarkAllRead:'Tandakan semua di hartanah ini sebagai dibaca',
  noticeBookingRequest:'Permintaan tempahan baharu dari laman',noticeNone:'Tiada pemberitahuan.',nights:'malam',requestQuote:'ada sebut harga',
  noticeNoShow:'Ketibaan yang tidak tiba',noticeOverdue:'Berlepas yang tidak keluar',noticeUnassigned:'Tiba hari ini, belum ada bilik',
  noticeCleaning:'Bilik perlu dibersihkan',noticeWaiting:'Permintaan tempahan terbiar',noticeDue:'Tarikh akhir',noticeRoomsUnit:'perlu dibersih',
  noticeWaitingNote:'menunggu lebih daripada sehari',noticeLevelTitle:'Tetapan keutamaan pemberitahuan',noticeLevelNote:'Hartanah boleh menentukan kedudukan setiap jenis pemberitahuan: jadikan pembersihan mendesak, atau ketibaan sesuatu rutin. Ia hanya memberi kesan kepada hartanah ini. Biarkan pada lalai sistem untuk terus mengikut peraturan semasa, bukan membeku nilai lama. Keutamaan hanya mengubah susunan dan label: ia tidak mengubah sama ada pemberitahuan dijana, bilangan belum dibaca, atau melakukan sebarang kerja.',noticeLevelBuiltIn:'Lalai sistem',noticeLevelProperty:'Hartanah ini',noticeLevelDefault:'Lalai sistem',noticeLevelSave:'Simpan keutamaan',noticeLevelReadOnly:'Hanya pentadbir hartanah ini boleh mengubah keutamaan pemberitahuan.',noticeLevelAudit:'Perubahan keutamaan terkini',noticeLevelChange:'Perubahan',noticeLevelChanged:'Terakhir diubah',noticeSeverity:'Keutamaan',severityUrgent:'Mendesak',severityAttention:'Perhatian',severityRoutine:'Rutin',noticeCheckinReview:'Pendaftaran menunggu semakan',noticeCheckinReviewNote:'butiran identiti dihantar, menunggu semakan oleh kakitangan',noticeSeverityNote:'Secara lalai senarai mengikut keutamaan: tetamu yang sepatutnya tiba atau keluar, ketibaan tanpa bilik, dan pendaftaran menunggu semakan di hadapan; bilik perlu dibersihkan di akhir. Hartanah ini boleh menukar setiap tahap di bawah.',noticeOpenOrder:'Buka tempahan',
  noticeStandingNote:'Ini fakta yang masih berlaku, bukan peristiwa. Setelah selesai ia hilang dengan sendirinya.',
  notice_read_failed:'Menanda dibaca gagal, sila cuba lagi.',notifications_polling:'Pemberitahuan diperiksa kira-kira setiap minit. Halaman yang sedang digunakan tidak dimuat semula.'}
};
