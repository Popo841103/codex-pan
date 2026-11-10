import { nightAuditExceptions, nextDay, noticeKinds, noticeLevels, noticeDefaults, noticeRuleKinds, severityOf } from '../src/demo-store.js';
import { isBoxed } from '../src/inventory-actions.js';
// Visual shell shared by every workspace page. Business actions stay in app.js.
const paths={home:'M3 11 12 3l9 8v10h-6v-7H9v7H3Z',calendar:'M4 5h16v16H4ZM7 2v6m10-6v6M4 10h16m-12 4h2m4 0h2m-8 4h2',channels:'M4 4h6v6H4Zm10 10h6v6h-6ZM7 10v7h7m3-3V7h-7',orders:'M7 4H4v18h16V4h-3M8 2h8v5H8Zm0 10h8m-8 5h8',customers:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m14-17a4 4 0 0 1 0 8m6 9v-2a4 4 0 0 0-3-4M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',stats:'M4 21V3m0 18h18M8 17v-5m5 5V6m5 11V9',settings:'m9 3-1 3-3 1 1 3-3 2 3 2-1 3 3 1 1 3h4l1-3 3-1-1-3 3-2-3-2 1-3-3-1-1-3Zm6 9a3 3 0 1 1-6 0 3 3 0 0 1 6 0',clean:'m4 20 10-10m-3-4 4-4 7 7-4 4Zm-1 8 4 4m-8-1 4 4',audit:'M12 8v5l4 2M3 11a9 9 0 1 1 3 8M3 4v7h7',cash:'M3 6h18v14H3Zm0 4h18m-7 4h7v3h-7Z',message:'M3 3h18v14H9l-5 4v-4H3Zm4 5h10m-10 4h6',headset:'M3 14v-2a9 9 0 0 1 18 0v2M3 12h4v8H3Zm14 0h4v8h-4m2 0v2h-6',help:'M9 8a3 3 0 1 1 5 2c-2 1-2 2-2 3m0 4h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',lock:'M6 10V7a6 6 0 0 1 12 0v3M4 10h16v12H4Zm8 4v4',globe:'M2 12h20M12 2a19 19 0 0 1 0 20 19 19 0 0 1 0-20m10 10a10 10 0 1 1-20 0 10 10 0 0 1 20 0',bell:'M12 3a6 6 0 0 1 6 6c0 5 2 6 2 6H4s2-1 2-6a6 6 0 0 1 6-6Zm-2 14a2 2 0 0 0 4 0',grid:'M3 3h4v4H3Zm7 0h4v4h-4Zm7 0h4v4h-4ZM3 10h4v4H3Zm7 0h4v4h-4Zm7 0h4v4h-4ZM3 17h4v4H3Zm7 0h4v4h-4Zm7 0h4v4h-4ZM17 17h4v4h-4Z',collapse:'m14 5-7 7 7 7m7-14-7 7 7 7',refresh:'M20 7a9 9 0 1 0 1 8m-1-13v6h-6',logout:'M9 3H3v18h6m6-15 6 6-6 6m-9-6h15',pig:'M19 7h3v9h-3l-2 4h-3v-3H9v3H6l-2-5H2V9l3-4h10l4 2Zm-9-5h4m2 7h.01',single:'M3 10 12 3l9 7M5 9v12h14V9m-10 5 2 2 4-5',summary:'M5 3h14v18H5Zm3 5h8m-8 4h8m-8 4h8',moon:'M15 3a8 8 0 1 0 6 14 9 9 0 0 1-6-14'};
export const icon=name=>`<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]||paths.summary}"/></svg>`;
export const shellWords={zh:{channels:'渠道',customers:'客户',mainOrders:'订单',navCalendar:'日历',navSummary:'房情表',navOverview:'房态表',collapseNavigation:'收起导航',expandNavigation:'展开导航',batchCleaning:'批量置脏/净',batchRoomState:'批量开/关房',today:'今天',todayShort:'今',customerDirectory:'住客资料',customerDirectoryNote:'来自本店现有订单的联系人记录；尚无独立CRM合并和去重审核。',relatedOrders:'关联订单',notConnected:'未连接',readConnection:'刷新连接状态',connectionUnknown:'连接状态尚未读取',channelScope:'渠道连接与消息',channelScopeNote:'NOBEDS作为付费渠道服务；本页从当前门店安全配置读取连接状态，不代表已经完成供应商联调。',messageCapability:'消息能力',manualSource:'手工订单来源',manualSourceNote:'订单来源标签不表示已连接OTA；其他平台消息能力需供应商确认。',notVerified:'尚未完成真实账号验收',openMessages:'打开OTA客人聊天',filterCustomers:'搜索姓名、邮箱、手机号、订单号',noCustomers:'本店暂无住客联系人',customerCount:'联系人记录',closeGroups:'收起',openGroups:'展开',viewInstructions:'查看说明',nightAuditLabel:'夜审',nightAuditUnavailable:'未启用',collapseGroupNote:'点击展开可恢复房型下的全部房号。'},en:{channels:'Channels',customers:'Guests',mainOrders:'Orders',navCalendar:'Calendar',navSummary:'Room summary',navOverview:'Room status',collapseNavigation:'Collapse navigation',expandNavigation:'Expand navigation',batchCleaning:'Bulk dirty / clean',batchRoomState:'Bulk open / close',today:'Today',todayShort:'Now',customerDirectory:'Guest contacts',customerDirectoryNote:'Contacts from existing property bookings; independent CRM merge and deduplication review are not implemented.',relatedOrders:'Related bookings',notConnected:'Not connected',readConnection:'Refresh connection',connectionUnknown:'Connection not read yet',channelScope:'Channel connection and messages',channelScopeNote:'NOBEDS is the paid channel service. Status comes from this property’s private configuration and does not establish a tested integration.',messageCapability:'Messaging capability',manualSource:'Manual booking source',manualSourceNote:'A source label does not connect an OTA. Other platform messaging needs supplier confirmation.',notVerified:'Live account verification incomplete',openMessages:'Open OTA guest inbox',filterCustomers:'Search name, email, phone or booking',noCustomers:'No guest contacts in this property',customerCount:'Contact records',closeGroups:'Collapse',openGroups:'Expand',viewInstructions:'View notes',nightAuditLabel:'Night audit',nightAuditUnavailable:'Not enabled',collapseGroupNote:'Expand to restore all unit rows.'},ms:{channels:'Saluran',customers:'Tetamu',mainOrders:'Pesanan',navCalendar:'Kalendar',navSummary:'Ringkasan bilik',navOverview:'Status bilik',collapseNavigation:'Tutup navigasi',expandNavigation:'Buka navigasi',batchCleaning:'Kotor / bersih pukal',batchRoomState:'Buka / tutup pukal',today:'Hari ini',todayShort:'Kini',customerDirectory:'Kenalan tetamu',customerDirectoryNote:'Kenalan daripada tempahan hartanah. Penggabungan CRM dan semakan pendua belum tersedia.',relatedOrders:'Tempahan berkaitan',notConnected:'Belum disambung',readConnection:'Muat semula sambungan',connectionUnknown:'Status belum dibaca',channelScope:'Sambungan dan mesej saluran',channelScopeNote:'NOBEDS ialah perkhidmatan saluran berbayar. Status konfigurasi bukan bukti integrasi sebenar telah diuji.',messageCapability:'Keupayaan mesej',manualSource:'Sumber manual',manualSourceNote:'Label sumber bukan sambungan OTA. Mesej platform lain perlu pengesahan pembekal.',notVerified:'Akaun sebenar belum disahkan',openMessages:'Buka peti masuk OTA',filterCustomers:'Cari nama, e-mel, telefon atau tempahan',noCustomers:'Tiada kenalan tetamu',customerCount:'Rekod kenalan',closeGroups:'Tutup',openGroups:'Buka',viewInstructions:'Lihat nota',nightAuditLabel:'Audit malam',nightAuditUnavailable:'Belum aktif',collapseGroupNote:'Buka untuk lihat semua unit.'}};
export function navigation(view,t){
 const group=view==='parityWorkspace'?'stats':['calendar','overview','tasks','rates'].includes(view)?'rooms':['business','cashflow','comparison','audit','nightAudit','managerDaily','guestLedger','roomCharge','roomBusiness','roomMovement','extraCharge','cancellation','occupants','registration','commission','arLedger','arReports'].includes(view)?'stats':['operationsDisplay','bookingEngineSetup','nightAuditSettings','notifications','resourcesSettings','teamAccess','propertySite','bookingRequests','dataCleanup'].includes(view)?'settings':view;
 const mains=[['home','home','home'],['calendar','roomState','home'],['channels','channels','channels'],['orders','mainOrders','orders'],['customers','customers','customers'],['business','operationalReports','stats'],['resourcesSettings','settings','settings']];
 const section=v=>['calendar','overview','tasks','rates'].includes(v)?'rooms':['business','cashflow','comparison','audit','nightAudit','managerDaily','guestLedger','roomCharge','roomBusiness','roomMovement','extraCharge','cancellation','occupants','registration','commission','arLedger','arReports'].includes(v)?'stats':['operationsDisplay','bookingEngineSetup','nightAuditSettings','notifications','resourcesSettings','teamAccess','propertySite','bookingRequests','dataCleanup'].includes(v)?'settings':v;
 const side={rooms:[['parityWorkspace','parityWorkspace','summary'],['calendar','navCalendar','home'],['rates','rateInventory','cash'],['overview','navSummary','summary'],['tasks','tasks','clean']],orders:[['orders','orders','orders'],['audit','audit','audit']],stats:[['parityWorkspace','parityWorkspace','summary'],['arReports','arReports','stats'],['arLedger','arLedger','cash'],['managerDaily','managerDailyReport','stats'],['guestLedger','guestLedger','cash'],['roomCharge','roomChargeDetail','stats'],['roomBusiness','roomBusinessSummary','stats'],['roomMovement','roomMovementLog','audit'],['extraCharge','otherChargeDetail','cash'],['cancellation','cancellationPenaltyDetail','pig'],['occupants','roomOccupantDetail','single'],['registration','registrationRecord','audit'],['commission','commissionDetail','cash'],['comparison','comparison','summary'],['business','businessSummary','stats'],['cashflow','cashflowSummary','cash']],settings:[['operationsDisplay','operationsDisplay','settings'],['bookingEngineSetup','bookingEngineSetup','globe'],['nightAuditSettings','nightAuditSettings','audit'],['notifications','notifications','bell'],['resourcesSettings','resourcesSettings','settings'],['teamAccess','teamAccess','lock'],['propertySite','propertySite','globe'],['bookingRequests','bookingRequests','message'],['dataCleanup','dataMaintenance','refresh']],channels:[['parityWorkspace','parityWorkspace','summary'],['channels','channels','channels']],customers:[['parityWorkspace','parityWorkspace','summary'],['customers','customerDirectory','customers']]}[group]||[];
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
    cashStatus: '现金盘点', cashCount: '实点现金（MYR）', cashCountNote: '只核对本班收款减退款的净现金；押金是负债，单独列示、不计入抽屉现金。留空表示本班不盘点，系统不会替你填 0。',
    cashExpected: '期望净现金', cashVariance: '差异', cashNotCounted: '未盘点', cashBalanced: '已平', cashPending: '待管理员审批', cashApproved: '已审批',
    cashApprove: '审批差异', cashApproveReason: '审批原因／处理说明', cashApproveConfirm: '确认审批这笔现金差异？审批后不可撤销，实点与期望金额仍会原样保留。', cashApprovedBy: '审批人',
    cash_count: '请填写有效的实点金额（非负、最多两位小数）。', cash_variance_decided: '这笔差异已经处理，不能重复审批。',
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
    cashStatus: 'Cash count', cashCount: 'Cash counted (MYR)', cashCountNote: 'Reconcile the shift net cash only: payments less refunds. Deposits are a liability shown separately, never till cash. Leave blank to skip the count; the system never fills in a zero for you.',
    cashExpected: 'Expected net cash', cashVariance: 'Variance', cashNotCounted: 'Not counted', cashBalanced: 'Balanced', cashPending: 'Awaiting administrator approval', cashApproved: 'Approved',
    cashApprove: 'Approve variance', cashApproveReason: 'Reason / how it was handled', cashApproveConfirm: 'Approve this cash variance? This cannot be undone; the counted and expected amounts stay on the record.', cashApprovedBy: 'Approved by',
    cash_count: 'Enter a valid counted amount (non-negative, at most two decimals).', cash_variance_decided: 'This variance has already been decided and cannot be approved again.',
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
    cashStatus: 'Kiraan tunai', cashCount: 'Tunai dikira (MYR)', cashCountNote: 'Semak tunai bersih syif sahaja: kutipan tolak bayaran balik. Deposit adalah liabiliti yang disenaraikan berasingan, bukan wang dalam laci. Kosongkan untuk tidak mengira; sistem tidak akan mengisi sifar bagi anda.',
    cashExpected: 'Tunai bersih dijangka', cashVariance: 'Perbezaan', cashNotCounted: 'Belum dikira', cashBalanced: 'Seimbang', cashPending: 'Menunggu kelulusan pentadbir', cashApproved: 'Diluluskan',
    cashApprove: 'Lulus perbezaan', cashApproveReason: 'Sebab / cara dikendalikan', cashApproveConfirm: 'Lulus perbezaan tunai ini? Tindakan ini tidak boleh dibatalkan; jumlah dikira dan dijangka kekal pada rekod.', cashApprovedBy: 'Diluluskan oleh',
    cash_count: 'Masukkan jumlah dikira yang sah (bukan negatif, maksud dua perpuluhan).', cash_variance_decided: 'Perbezaan ini sudah diputuskan dan tidak boleh diluluskan semula.',
    order: 'Tempahan', exceptionDate: 'Tarikh',
    audited: 'Tarikh ini telah ditutup oleh audit malam; hanya pentadbir boleh mengubahnya', business_date: 'Hari perniagaan belum ditetapkan',
    night_audit_exceptions: 'Pengecualian wajib masih ada; audit tidak boleh dijalankan', shift_name: 'Nama syif sudah wujud',
    shift_overlap: 'Masa syif bertindih dengan syif lain', shift_window: 'Tempoh serahan tidak sah', shift_in_use: 'Syif ini mempunyai rekod serahan, tidak boleh dipadam'
  }
};

const rows = (list, t, escape) => list.length ? list.map(entry => `<tr><td>${escape(entry.date)}</td><td>${escape(entry.guest || '—')}</td><td>${escape(t(entry.kind))}${entry.severity==='required'?`<small>${escape(t(entry.kind==='no_show'?'auditArrivalActions':'auditDepartureActions'))}</small>`:''}</td><td><button data-action="details" data-id="${escape(entry.orderId)}">${escape(entry.orderId.slice(0, 8))}</button></td></tr>`).join('')
  : `<tr><td colspan="4">${escape(t('noExceptions'))}</td></tr>`;

// The business date is authoritative state, not a browser field: it can only move forward through an audit.
export function nightAuditPage(state, propertyId, { t, escape, currency, can, lang, settings=false }) {
  const businessDate = state.businessDate ?? null;
  const handoverMode=state.properties?.find(row=>row.id===propertyId)?.handoverMode||'shift';
  const audits = (state.nightAudits || []).slice().sort((a, b) => b.at.localeCompare(a.at));
  const shifts = state.shiftTypes || [];
  const handovers = (state.handovers || []).slice().sort((a, b) => b.at.localeCompare(a.at));
  const exceptions = businessDate ? nightAuditExceptions(state, businessDate, isBoxed) : [];
  const required = exceptions.filter(e => e.severity === 'required');
  const advisory = exceptions.filter(e => e.severity === 'advisory');
  const latest = audits[0] || null;
  const date = (value) => escape(new Date(value).toLocaleString(lang === 'zh' ? 'zh-CN' : lang === 'ms' ? 'ms-MY' : 'en-GB', { timeZone: 'Asia/Kuala_Lumpur' }));
  const head = `<section class="panel" ${settings?'data-night-audit-settings':'data-night-audit-workbench'}><div class="panel-head"><h2>${escape(t(settings?'nightAuditSettings':'nightAudit'))}</h2><span class="badge">${escape(businessDate || t('businessDateUnset'))}</span></div>
    <p class="muted">${escape(t('businessDateNote'))}</p>
    ${businessDate ? `<div class="stats"><div class="stat"><span>${escape(t('businessDay'))}</span><strong>${escape(businessDate)}</strong><small>${escape(t('lastAudit'))}: ${latest ? escape(latest.actor) + ' · ' + date(latest.at) : escape(t('neverAudited'))}</small></div>
      ${latest ? `<div class="stat"><span>${escape(t('auditMode'))}</span><strong>${escape(t(latest.mode))}</strong><small>${latest.forced ? escape(t('auditForced')) : escape(t('exceptions') + ': ' + latest.exceptions.length)}</small></div>` : ''}</div>`
    : `<p>${escape(t('businessDateUnsetNote'))}</p>
      ${settings&&can('business_date_init') ? `<label>${escape(t('setBusinessDate'))}<input id="business-date-init" type="date" required></label><button id="business-date-save" class="primary">${escape(t('setBusinessDate'))}</button>` : ''}`}
  </section>`;
  const exceptionPanel = businessDate ? `<section class="panel"><div class="panel-head"><h2>${escape(t('auditExceptions'))}</h2><span>${escape(t('required'))}: ${required.length} · ${escape(t('advisory'))}: ${advisory.length}</span></div>
    <h3>${escape(t('required'))}</h3>
    <div class="table-wrap"><table><thead><tr><th>${escape(t('exceptionDate'))}</th><th>${escape(t('guest'))}</th><th>${escape(t('action'))}</th><th>${escape(t('order'))}</th></tr></thead><tbody>${rows(required, t, escape)}</tbody></table></div>
    <h3>${escape(t('excludedFromAudit'))}</h3>
    <div class="table-wrap"><table><thead><tr><th>${escape(t('exceptionDate'))}</th><th>${escape(t('guest'))}</th><th>${escape(t('action'))}</th><th>${escape(t('order'))}</th></tr></thead><tbody>${rows(advisory, t, escape)}</tbody></table></div>
  </section>
  <section class="panel"><div class="panel-head"><h2>${escape(t('runNightAudit'))}</h2></div>
    ${required.length ? `<p class="muted">${escape(t('forceAudit'))}</p><label>${escape(t('auditReason'))}<input id="audit-reason" maxlength="500" placeholder="${escape(t('auditReason'))}"></label>` : ''}
    ${required.length&&can('night_audit_handle_all')?`<button id="night-audit-handle-all">${escape(t('handleAuditAll'))}</button><p>${escape(t('handleAuditNote'))}</p>`:''}
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
    <label>${escape(t('handoverNote'))}<input id="handover-note" maxlength="500"></label>
    <label>${escape(t('cashCount'))}<input id="handover-cash" type="number" min="0" max="1000000" step="0.01" placeholder="${escape(t('cashNotCounted'))}"></label></div>
    <p class="muted">${escape(t('cashCountNote'))}</p>
    <button id="handover-run" class="primary" ${can('shift_handover') && shifts.length ? '' : 'disabled'}>${escape(t('runHandover'))}</button>
    <div class="table-wrap"><table><thead><tr><th>${escape(t('businessDay'))}</th><th>${escape(t('handoverShift'))}</th><th>${escape(t('window'))}</th><th>${escape(t('receipts'))}</th><th>${escape(t('netReceived'))}</th><th>${escape(t('deposits'))}</th><th>${escape(t('cashStatus'))}</th><th>${escape(t('handedBy'))}</th><th>${escape(t('action'))}</th></tr></thead><tbody>${
      handovers.length ? handovers.map(h => {
        const cash = h.cashCount;
        const status = cash ? t(cash.status === 'balanced' ? 'cashBalanced' : cash.status === 'pending' ? 'cashPending' : 'cashApproved') : t('cashNotCounted');
        const detail = cash ? `${escape(t('cashExpected'))}: ${escape(currency(cash.expected))} · ${escape(t('cashCount'))}: ${escape(currency(cash.counted))} · ${escape(t('cashVariance'))}: ${escape(currency(cash.variance))}<small>${escape(status)}</small>${cash.approval ? `<small>${escape(t('cashApprovedBy'))}: ${escape(cash.approval.actor)} · ${escape(cash.approval.reason)}</small>` : ''}` : `<span class="muted">${escape(t('cashNotCounted'))}</span>`;
        const approve = cash && cash.status === 'pending' && can('cash_variance_approve')
          ? `<input id="cash-reason-${escape(h.id)}" maxlength="500" placeholder="${escape(t('cashApproveReason'))}"><button data-cash-approve="${escape(h.id)}">${escape(t('cashApprove'))}</button>` : '';
        return `<tr><td>${escape(h.businessDate)}</td><td>${escape(h.shiftName)}</td><td>${date(h.from)} → ${date(h.to)}</td><td>${h.summary.count}</td><td>${escape(currency(h.summary.net))}${h.summary.arNet?'<small>'+escape(t('arLedger'))+' · '+escape(currency(h.summary.arNet))+'</small>':''}</td><td>${escape(currency(h.summary.depositNet))}</td><td>${detail}</td><td>${escape(h.actor)}</td><td>${approve}</td></tr>`;
      }).join('')
      : `<tr><td colspan="9">—</td></tr>`}</tbody></table></div>
  </section>` : '';
  const settingsPanel=`<section class="panel"><p>${escape(t('auditMode'))} · ${escape(t('manual'))}</p>
    <label>${escape(t('handoverMethod'))}<select id="handover-mode" ${can('shift_mode_save')?'':'disabled'}>
      ${['shift','shift_person'].map(mode=>`<option value="${mode}" ${mode===handoverMode?'selected':''}>${escape(t(mode==='shift'?'handoverByShift':'handoverByPerson'))}</option>`).join('')}
    </select></label>${can('shift_mode_save')?`<button id="handover-mode-save">${escape(t('apply'))}</button>`:''}</section>`;
  return settings ? head+settingsPanel : head+'<p><button data-night-audit-settings-link>'+escape(t('nightAuditSettings'))+'</button></p>'+exceptionPanel+shiftPanel;
}

// Windows use the property's fixed UTC+8 offset; Malaysia has no daylight saving.
export function handoverWindow(businessDate, shift) {
  const crossesMidnight = shift.end <= shift.start;
  return { from: `${businessDate}T${shift.start}:00+08:00`, to: `${crossesMidnight ? nextDay(businessDate) : businessDate}T${shift.end}:00+08:00` };
}

// Team access. Roles are shown as what they actually allow, and the page never
// claims more than the server enforces: a property override is displayed per
// property, and an account can never edit itself here.
// The same grouping the server uses for its own action list. The settings page draws
// one column of ticks per module; a DOM check compares this list with what the server
// enforces, so the page can never drift into offering an action nobody checks.
export const permissionModules = {
 reservations: ['create_reservation','create','edit','assign','lock','memo_save','cancel','box_stays','restore_stays','booking_request_decision'],
 frontDesk: ['checkin','checkout'],
 housekeeping: ['clean','block','unblock','bulk_clean','bulk_block','bulk_unblock'],
 money: ['commission_close_month','ar_adjust','ar_undo_adjust','ar_close_month','ar_report_view','ar_account_save','ar_post','ar_write_off','ar_undo_write_off','ar_transfer','ar_undo_post','settle_split','settle_bill','settle_undo','settle_unsplit','transfer_folio_credit','undo_reservation_payment','payment_reservation','settle_reservation','settle','reopen_folio','payment','cash_variance_approve','commission_save'],
 catalog: ['display_preferences_save','room_type_save','physical_room_save','suite_save','resource_update','resource_archive','rate_plan_save','rate_plan_archive','rates_bulk_update'],
 operationsDay: ['business_date_init','night_audit','night_audit_handle_all','shift_save','shift_delete','shift_handover','shift_mode_save'],
 access: ['member_save','role_save','role_delete','member_permission_save'],
 site: ['site_save'],
 notice: ['notice_severity_save','notice_rule_save'],
 data: ['purge_test_orders'],
 guest: ['guest_read','guest_sync','guest_send','guest_note','guest_handled','guest_bind','guest_reconcile'],
 selfCheckin: ['sc_read','sc_invite','sc_revoke','sc_review','sc_document','sc_checkin','sc_policy_save','sc_purge_identity'],
 support: ['support_create','support_reply','support_status','support_contact_save']
};
export function teamAccessPage({members=[],memberAudit=[],properties=[],propertyId,user,can,t,escape,roles=[]}) {
 const esc=escape||(v=>String(v??''));
 const editable=can('member_save');
 const builtin=[['admin','role_admin'],['operations','role_operations'],['finance','role_finance'],['viewer','role_viewer']];
 // A role belongs to a property, so only this property's roles are offered here.
 const custom=roles.filter(r=>r.propertyId===propertyId);
 const roleName=id=>{
  const hit=builtin.find(([key])=>key===id);
  if(hit)return t(hit[1]);
  return custom.find(r=>r.id===id)?.name||String(id??'');
 };
 const roleOptions=[...builtin.map(([id,word])=>[id,t(word)]),...custom.map(r=>[r.id,r.name])];
 const canRoles=can('role_save'),canDeleteRole=can('role_delete');
 const propertyName=id=>properties.find(p=>p.id===id)?.name||id;
 const scopeCell=m=>`<td>${m.propertyIds.map(id=>`${esc(propertyName(id))}${m.propertyRoles[id]?` <small>(${esc(roleName(m.propertyRoles[id]))})</small>`:''}`).join(' · ')||'—'}</td>`;
 const rows=members.map(m=>{
  const self=user&&m.username===user.username;
  if(self)return `<tr><th>${esc(m.username)}</th><td>${esc(roleName(m.role))}</td>${scopeCell(m)}<td>${esc(t(m.active?'memberEnabled':'memberDisabled'))}</td><td colspan="3" class="muted">${esc(t('memberSelf'))}</td></tr>`;
  return `<tr><th>${esc(m.username)}</th>
   <td><select data-member-role="${esc(m.username)}">${roleOptions.map(([id,label])=>`<option value="${esc(id)}" ${id===m.role?'selected':''}>${esc(label)}</option>`).join('')}</select></td>
   ${scopeCell(m)}
   <td><select data-member-property-role="${esc(m.username)}"><option value="" ${m.propertyRoles[propertyId]?'':'selected'}>${esc(t('role_account'))}</option>${roleOptions.map(([id,label])=>`<option value="${esc(id)}" ${m.propertyRoles[propertyId]===id?'selected':''}>${esc(label)}</option>`).join('')}</select></td>
   <td><select data-member-active="${esc(m.username)}"><option value="true" ${m.active?'selected':''}>${esc(t('memberEnabled'))}</option><option value="false" ${m.active?'':'selected'}>${esc(t('memberDisabled'))}</option></select></td>
   <td><input type="password" data-member-password="${esc(m.username)}" autocomplete="new-password" minlength="12" placeholder="${esc(t('memberPasswordHint'))}"></td>
   <td><button data-member-apply="${esc(m.username)}">${esc(t('save'))}</button></td></tr>`;
 }).join('');
 const newForm=editable?`<h3>${esc(t('memberNew'))}</h3>
  <form id="member-new" class="order-filters">
   <label>${esc(t('memberUsername'))}<input name="username" required minlength="3" maxlength="64" autocomplete="off"></label>
   <label>${esc(t('memberNewPassword'))}<input name="password" type="password" required minlength="12" autocomplete="new-password"></label>
   <label>${esc(t('memberRole'))}<select name="role">${builtin.map(([id,word])=>`<option value="${esc(id)}">${esc(t(word))}</option>`).join('')}</select></label>
   <label>${esc(t('memberProperties'))}<select name="properties" multiple required>${properties.map(p=>`<option value="${p.id}" ${p.id===propertyId?'selected':''}>${esc(p.name)}</option>`).join('')}</select></label>
   <button class="primary">${esc(t('memberCreate'))}</button>
  </form>`:'';
 const table=`<div class="table-wrap"><table><thead><tr>${['memberUsername','memberRole','memberProperties','memberPropertyRole','memberState','memberPassword','actions'].map(h=>`<th>${esc(t(h))}</th>`).join('')}</tr></thead><tbody>${rows||`<tr><td colspan="7">${esc(t('empty'))}</td></tr>`}</tbody></table></div>`;
 const audit=memberAudit.length?`<h3>${esc(t('memberAuditTitle'))}</h3><div class="table-wrap"><table><thead><tr>${['time','createdBy','memberTarget','memberRole','memberProperties','memberState'].map(h=>`<th>${esc(t(h))}</th>`).join('')}</tr></thead><tbody>${memberAudit.map(a=>`<tr><td>${esc(a.at)}</td><td>${esc(a.actor)}</td><td>${esc(a.target)}</td><td>${esc(a.action==='role_save'||a.action==='role_delete'?t('memberRole'):roleName(a.role))}</td><td>${esc((a.propertyIds||[]).map(propertyName).join(' · ')||'—')}</td><td>${esc(t(a.active?'memberEnabled':'memberDisabled'))}${a.passwordChanged?' · '+esc(t('memberPasswordChanged')):''}${a.created?' · '+esc(t('memberCreated')):''}${a.action==='role_save'||a.action==='role_delete'?' · '+esc(a.name||a.roleId||''):''}</td></tr>`).join('')}</tbody></table></div>`:'';
 // The matrix is the same list of actions the server enforces; a role is exactly what
 // is ticked here, so the page can never offer an action the server would refuse.
 const matrix=selected=>{
  const has=new Set(selected);
  return `<div class="perm-matrix">${Object.entries(permissionModules).map(([module,actions])=>`
   <fieldset class="perm-group"><legend>${esc(t('mod_'+module))}</legend>
    ${actions.map(action=>`<label class="perm-item"><input type="checkbox" name="actions" value="${esc(action)}" ${has.has(action)?'checked':''} ${canRoles?'':'disabled'}>
     <span>${esc(t('act_'+action))}</span></label>`).join('')}
   </fieldset>`).join('')}</div>`;
 };
 const roleSummary=r=>{
  const names=r.actions.map(a=>t('act_'+a));
  return `${r.actions.length} · ${esc(names.slice(0,4).join(' / '))}${names.length>4?' …':''}`;
 };
 const roleTable=`<div class="table-wrap"><table><thead><tr>${['roleName','roleWhatItAllows','actions'].map(h=>`<th>${esc(t(h))}</th>`).join('')}</tr></thead><tbody>
  ${builtin.map(([id,word])=>`<tr><th>${esc(t(word))}</th><td>${esc(t('roleDesc_'+id))}</td><td class="muted">${esc(t('roleBuiltin'))}</td></tr>`).join('')}
  ${custom.map(r=>`<tr><th>${esc(r.name)}</th><td>${roleSummary(r)}</td><td>${canDeleteRole?`<button class="danger" data-role-delete="${esc(r.id)}">${esc(t('delete'))}</button>`:`<span class="muted">${esc(t('roleReadOnly'))}</span>`}</td></tr>`).join('')}
  ${custom.length?'':`<tr><td colspan="3" class="muted">${esc(t('roleNoneYet'))}</td></tr>`}
 </tbody></table></div>`;
 const newRole=canRoles?`<details class="role-editor"><summary>${esc(t('roleNew'))}</summary>
  <form id="role-new"><label>${esc(t('roleName'))}<input name="name" required maxlength="40" autocomplete="off" placeholder="${esc(t('roleNameHint'))}"></label>
  ${matrix([])}<button class="primary">${esc(t('roleCreate'))}</button></form></details>`:'';
 const editors=custom.map(r=>`<details class="role-editor"><summary>${esc(t('roleEdit'))} · ${esc(r.name)}</summary>
  <form data-role-form="${esc(r.id)}"><label>${esc(t('roleName'))}<input name="name" value="${esc(r.name)}" required maxlength="40"></label>
  ${matrix(r.actions)}<button class="primary" ${canRoles?'':'disabled'}>${esc(t('save'))}</button></form></details>`).join('');
 // Extra grants ride on top of a role. One details per member keeps the form stateless:
 // the ticks are exactly what is stored for that member in this property.
 const canPerms=can('member_permission_save');
 const grantEditors=canPerms?members.filter(m=>m.propertyIds.includes(propertyId)).map(m=>{
  const extra=m.extraPermissions?.[propertyId]||[];
  if(!extra.length&&!canPerms)return '';
  return `<details class="role-editor"><summary>${esc(t('memberExtraTitle'))} · ${esc(m.username)}</summary>
   <form data-perms-form="${esc(m.username)}">${matrix(extra)}<button class="primary">${esc(t('save'))}</button></form></details>`;
 }).join(''):'';
 return `<section class="panel"><div class="panel-head"><h2>${esc(t('teamAccess'))}</h2></div>
  <p class="muted">${esc(t('teamAccessNote'))}</p>
  ${editable?'':`<p class="muted">${esc(t('teamReadOnly'))}</p>`}
  <h3>${esc(t('memberRolesTitle'))}</h3><p class="muted">${esc(t('roleSectionNote'))}</p>
  ${roleTable}${newRole}${editors}
  ${grantEditors?`<h3>${esc(t('memberExtraTitle'))}</h3><p class="muted">${esc(t('memberExtraNote'))}</p>${grantEditors}`:''}
  ${newForm}<h3>${esc(t('memberList'))}</h3>${table}${audit}</section>`;
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
  roleSectionNote:'角色就是一组动作：勾选这个角色能做什么，再把角色交给成员。角色只在所属门店生效；成员也可以在角色之外单独追加动作，但不能给出自己没有的动作。',
  roleName:'角色名称',roleWhatItAllows:'可执行的动作',roleBuiltin:'内置角色，不可修改',roleReadOnly:'无权修改',
  roleNoneYet:'还没有自定义角色。新建一个角色，勾选它能做的事。',roleNew:'新建角色',roleEdit:'编辑角色',roleCreate:'创建角色',
  roleNameHint:'例如：夜班前台',memberExtraTitle:'成员附加动作',memberExtraNote:'在角色之外单独给这位成员追加动作；保存会整体替换此前给他的附加动作，且不能给出你自己没有的动作。',teamSharedOnly:'角色与权限只在连接服务端时可用。',delete:'删除',roleDeleteConfirm:'删除这个角色？此操作不可撤销。',
  role_input:'请检查角色名称与勾选的动作。',role_name_taken:'这个门店已有同名角色。',role_in_use:'还有成员在使用这个角色，先改掉他们的角色再删除。',role_limit:'一个门店最多 50 个自定义角色。',
  mod_reservations:'预订',mod_frontDesk:'前台',mod_housekeeping:'房务',mod_money:'账务',mod_catalog:'房价与资源',
  mod_operationsDay:'营业日',mod_access:'权限',mod_site:'官网',mod_notice:'通知',mod_data:'数据维护',
  mod_guest:'客人消息',mod_selfCheckin:'自助入住',mod_support:'工单',
  act_ar_account_save:"保存应收账户",act_ar_post:"转应收",act_ar_write_off:"登记收款并核销",act_ar_undo_write_off:"撤销核销",act_ar_transfer:"转移应收",act_ar_undo_post:"撤销挂账",act_ar_adjust:"新增应收调账",act_ar_undo_adjust:"冲销应收调账",act_commission_close_month:"关闭佣金账期",act_ar_close_month:"关闭应收账期",act_ar_report_view:"查看应收账款",act_settle_split:"拆账",act_settle_bill:"子账单结账",act_settle_undo:"撤销子账单结账",act_settle_unsplit:"撤销拆账",act_transfer_folio_credit:'转移多收款',act_undo_reservation_payment:'冲销合并收款',act_payment_reservation:'主订单合并收款',act_settle_reservation:'主订单批量结账',act_settle:'结账',act_reopen_folio:'重开账单',act_rate_plan_save:'保存房价计划',act_rate_plan_archive:'归档房价计划',
  act_rates_bulk_update:'批量改价',act_box_stays:'移入待排房',act_restore_stays:'放回房态',act_create_reservation:'新建预订',
  act_memo_save:'保存备注',act_create:'建立订单',act_assign:'排房',act_edit:'修改订单',act_lock:'锁定订单',act_payment:'收款',
  act_cancel:'取消订单',act_checkin:'办理入住',act_checkout:'办理退房',act_clean:'完成清洁',act_block:'关房',act_unblock:'解除关房',
  act_bulk_clean:'批量清洁',act_bulk_block:'批量关房',act_bulk_unblock:'批量解除关房',act_room_type_save:'保存房型',
  act_physical_room_save:'保存房间',act_suite_save:'保存套房',act_resource_update:'修改资源',act_resource_archive:'归档资源',
  act_business_date_init:'启用营业日',act_night_audit_handle_all:'Handle All',act_night_audit:'夜审',act_shift_mode_save:'Handover method',act_shift_save:'保存班次',act_shift_delete:'删除班次',
  act_shift_handover:'交班',act_cash_variance_approve:'审批现金差异',act_member_save:'管理成员',act_role_save:'保存角色',
  act_role_delete:'删除角色',act_member_permission_save:'成员附加权限',act_site_save:'发布官网',act_notice_severity_save:'通知优先级',
  act_notice_rule_save:'通知规则',act_purge_test_orders:'清理测试订单',act_booking_request_decision:'处理预订申请',
  act_commission_save:'佣金设置',act_guest_read:'查看客人消息',act_guest_sync:'同步客人消息',act_guest_send:'发送客人消息',
  act_guest_note:'客人消息备注',act_guest_handled:'标记已处理',act_guest_bind:'绑定客人会话',act_guest_reconcile:'客人消息对账',
  act_sc_read:'查看自助入住',act_sc_invite:'发送自助入住邀请',act_sc_revoke:'撤销邀请',act_sc_review:'审核自助入住',
  act_sc_document:'查看证件',act_sc_checkin:'代办自助入住',act_sc_policy_save:'自助入住政策',act_sc_purge_identity:'清除证件数据',
  act_support_create:'新建工单',act_support_reply:'回复工单',act_support_status:'工单状态',act_support_contact_save:'工单联系方式',
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
  roleSectionNote:'A role is a set of actions: tick what it may do, then hand it to a member. A role applies to the property that owns it, and a member can also carry a few extra actions on top of its role - never an action the giver does not hold.',
  roleName:'Role name',roleWhatItAllows:'What it allows',roleBuiltin:'Built in, cannot be edited',roleReadOnly:'No permission to change',
  roleNoneYet:'No custom role yet. Create one and tick what it may do.',roleNew:'New role',roleEdit:'Edit role',roleCreate:'Create role',
  roleNameHint:'For example: Night front desk',memberExtraTitle:'Member extra actions',memberExtraNote:'Add single actions to a member on top of its role; saving replaces the whole set, and no action can be granted that the giver does not hold.',teamSharedOnly:'Roles and access are only available on the shared server.',delete:'Delete',roleDeleteConfirm:'Delete this role? This cannot be undone.',
  role_input:'Check the role name and the ticked actions.',role_name_taken:'This property already has a role with that name.',role_in_use:'Members still hold this role. Give them another role first.',role_limit:'A property can define at most 50 roles.',
  mod_reservations:'Reservations',mod_frontDesk:'Front desk',mod_housekeeping:'Housekeeping',mod_money:'Money',mod_catalog:'Rates & resources',
  mod_operationsDay:'Business day',mod_access:'Access',mod_site:'Website',mod_notice:'Notices',mod_data:'Data',
  mod_guest:'Guest messages',mod_selfCheckin:'Self check-in',mod_support:'Support desk',
  act_ar_account_save:"Save AR account",act_ar_post:"Post to AR",act_ar_write_off:"Record receipt and allocate",act_ar_undo_write_off:"Reverse allocation",act_ar_transfer:"Transfer receivable",act_ar_undo_post:"Reverse AR posting",act_ar_adjust:"Post AR adjustment",act_ar_undo_adjust:"Reverse AR adjustment",act_commission_close_month:"Close commission month",act_ar_close_month:"Close AR month",act_ar_report_view:"View receivables",act_settle_split:"Split bills",act_settle_bill:"Settle bill",act_settle_undo:"Reverse bill settlement",act_settle_unsplit:"Undo split",act_transfer_folio_credit:'Transfer overpayment',act_undo_reservation_payment:'Reverse group payment',act_payment_reservation:'Record group payment',act_settle_reservation:'Settle reservation folios',act_settle:'Settle',act_reopen_folio:'Reopen folio',act_rate_plan_save:'Save rate plan',act_rate_plan_archive:'Archive rate plan',
  act_rates_bulk_update:'Bulk rate update',act_box_stays:'Move to unassigned',act_restore_stays:'Return to the grid',act_create_reservation:'Create reservation',
  act_memo_save:'Save note',act_create:'Create booking',act_assign:'Assign room',act_edit:'Edit booking',act_lock:'Lock booking',act_payment:'Take payment',
  act_cancel:'Cancel booking',act_checkin:'Check in',act_checkout:'Check out',act_clean:'Mark clean',act_block:'Block dates',act_unblock:'Unblock dates',
  act_bulk_clean:'Bulk clean',act_bulk_block:'Bulk block',act_bulk_unblock:'Bulk unblock',act_room_type_save:'Save room type',
  act_physical_room_save:'Save room',act_suite_save:'Save suite',act_resource_update:'Update resource',act_resource_archive:'Archive resource',
  act_business_date_init:'Start business day',act_night_audit:'Night audit',act_shift_save:'Save shift',act_shift_delete:'Delete shift',
  act_shift_handover:'Handover',act_cash_variance_approve:'Approve cash variance',act_member_save:'Manage members',act_role_save:'Save role',
  act_role_delete:'Delete role',act_member_permission_save:'Member extra actions',act_site_save:'Publish website',act_notice_severity_save:'Notice priority',
  act_notice_rule_save:'Notice rules',act_purge_test_orders:'Purge test orders',act_booking_request_decision:'Decide booking requests',
  act_commission_save:'Commission settings',act_guest_read:'Read guest messages',act_guest_sync:'Sync guest messages',act_guest_send:'Send guest messages',
  act_guest_note:'Guest message note',act_guest_handled:'Mark handled',act_guest_bind:'Bind guest thread',act_guest_reconcile:'Reconcile guest messages',
  act_sc_read:'View self check-in',act_sc_invite:'Send check-in invite',act_sc_revoke:'Revoke invite',act_sc_review:'Review self check-in',
  act_sc_document:'View documents',act_sc_checkin:'Complete check-in',act_sc_policy_save:'Self check-in policy',act_sc_purge_identity:'Purge identity data',
  act_support_create:'Open ticket',act_support_reply:'Reply to ticket',act_support_status:'Ticket status',act_support_contact_save:'Support contact details',
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
  roleSectionNote:'Peranan ialah satu set tindakan: tandakan apa yang dibenarkan, kemudian berikan kepada ahli. Peranan hanya berkuat kuasa di hartanah pemiliknya, dan ahli boleh membawa beberapa tindakan tambahan - tidak pernah tindakan yang pemberi sendiri tiada.',
  roleName:'Nama peranan',roleWhatItAllows:'Apa yang dibenarkan',roleBuiltin:'Terbina dalam, tidak boleh diubah',roleReadOnly:'Tiada kebenaran mengubah',
  roleNoneYet:'Belum ada peranan tersuai. Cipta satu dan tandakan apa yang dibenarkan.',roleNew:'Peranan baharu',roleEdit:'Sunting peranan',roleCreate:'Cipta peranan',
  roleNameHint:'Contoh: Kaunter malam',memberExtraTitle:'Tindakan tambahan ahli',memberExtraNote:'Tambah tindakan tunggal kepada ahli di atas peranannya; menyimpan menggantikan keseluruhan set, dan tindakan yang pemberi sendiri tiada tidak boleh diberi.',teamSharedOnly:'Peranan dan akses hanya tersedia pada pelayan dikongsi.',delete:'Padam',roleDeleteConfirm:'Padam peranan ini? Tindakan ini tidak boleh dibatalkan.',
  role_input:'Semak nama peranan dan tindakan yang ditanda.',role_name_taken:'Hartanah ini sudah ada peranan dengan nama itu.',role_in_use:'Masih ada ahli memegang peranan ini. Beri mereka peranan lain dahulu.',role_limit:'Satu hartanah boleh menentukan paling banyak 50 peranan.',
  mod_reservations:'Tempahan',mod_frontDesk:'Kaunter hadapan',mod_housekeeping:'Pembersihan',mod_money:'Kewangan',mod_catalog:'Kadar & sumber',
  mod_operationsDay:'Hari perniagaan',mod_access:'Akses',mod_site:'Laman web',mod_notice:'Notis',mod_data:'Data',
  mod_guest:'Mesej tetamu',mod_selfCheckin:'Daftar masuk sendiri',mod_support:'Meja sokongan',
  act_ar_account_save:"Simpan akaun AR",act_ar_post:"Pindah ke AR",act_ar_write_off:"Rekod dan padankan terimaan",act_ar_undo_write_off:"Balikkan padanan",act_ar_transfer:"Pindah baki belum terima",act_ar_undo_post:"Balikkan catatan AR",act_ar_adjust:"Catat pelarasan AR",act_ar_undo_adjust:"Balikkan pelarasan AR",act_commission_close_month:"Tutup bulan komisen",act_ar_close_month:"Tutup bulan AR",act_ar_report_view:"Lihat akaun belum terima",act_settle_split:"Pecah bil",act_settle_bill:"Selesaikan bil",act_settle_undo:"Balikkan penyelesaian bil",act_settle_unsplit:"Batal pecahan",act_transfer_folio_credit:'Pindahkan lebihan bayaran',act_undo_reservation_payment:'Balikkan bayaran tempahan',act_payment_reservation:'Rekod bayaran tempahan',act_settle_reservation:'Selesaikan folio tempahan',act_settle:'Selesaikan bil',act_reopen_folio:'Buka semula folio',act_rate_plan_save:'Simpan pelan kadar',act_rate_plan_archive:'Arkib pelan kadar',
  act_rates_bulk_update:'Kemas kini kadar pukal',act_box_stays:'Pindah ke belum ditetapkan',act_restore_stays:'Kembali ke grid',act_create_reservation:'Cipta tempahan',
  act_memo_save:'Simpan nota',act_create:'Cipta tempahan',act_assign:'Tetapkan bilik',act_edit:'Sunting tempahan',act_lock:'Kunci tempahan',act_payment:'Terima bayaran',
  act_cancel:'Batal tempahan',act_checkin:'Daftar masuk',act_checkout:'Daftar keluar',act_clean:'Tanda bersih',act_block:'Sekat tarikh',act_unblock:'Buka sekatan',
  act_bulk_clean:'Bersih pukal',act_bulk_block:'Sekat pukal',act_bulk_unblock:'Buka sekatan pukal',act_room_type_save:'Simpan jenis bilik',
  act_physical_room_save:'Simpan bilik',act_suite_save:'Simpan suite',act_resource_update:'Kemas kini sumber',act_resource_archive:'Arkib sumber',
  act_business_date_init:'Mula hari perniagaan',act_night_audit:'Audit malam',act_shift_save:'Simpan syif',act_shift_delete:'Padam syif',
  act_shift_handover:'Serahan syif',act_cash_variance_approve:'Lulus beza tunai',act_member_save:'Urus ahli',act_role_save:'Simpan peranan',
  act_role_delete:'Padam peranan',act_member_permission_save:'Tindakan tambahan ahli',act_site_save:'Terbitkan laman web',act_notice_severity_save:'Keutamaan notis',
  act_notice_rule_save:'Peraturan notis',act_purge_test_orders:'Bersihkan tempahan ujian',act_booking_request_decision:'Putus permintaan tempahan',
  act_commission_save:'Tetapan komisen',act_guest_read:'Baca mesej tetamu',act_guest_sync:'Segerak mesej tetamu',act_guest_send:'Hantar mesej tetamu',
  act_guest_note:'Nota mesej tetamu',act_guest_handled:'Tanda selesai',act_guest_bind:'Ikat benang tetamu',act_guest_reconcile:'Runding mesej tetamu',
  act_sc_read:'Lihat daftar masuk sendiri',act_sc_invite:'Hantar jemputan daftar masuk',act_sc_revoke:'Tarik balik jemputan',act_sc_review:'Semak daftar masuk sendiri',
  act_sc_document:'Lihat dokumen',act_sc_checkin:'Selesaikan daftar masuk',act_sc_policy_save:'Polisi daftar masuk sendiri',act_sc_purge_identity:'Hapus data identiti',
  act_support_create:'Buka tiket',act_support_reply:'Balas tiket',act_support_status:'Status tiket',act_support_contact_save:'Maklumat hubungan sokongan',
  member_input:'Semak akaun, panjang kata laluan, peranan dan skop hartanah.',member_scope:'Anda hanya boleh mengurus ahli yang berkongsi hartanah dengan anda, dalam hartanah yang boleh anda capai.',
  member_self:'Akses sendiri tidak boleh diubah di sini.',member_last_admin:'Sekurang-kurangnya seorang pentadbir aktif mesti kekal.',password_length:'Kata laluan perlu sekurang-kurangnya 12 aksara.'}
};

// Property site. The page publishes a read-only public page for one property. It
// never claims a booking was taken: no payment is connected and nothing is emailed,
// so the site shows room types and availability and leaves the booking to a person.
export function bookingEngineSetupPage(t,escape){
  const label=key=>escape(t(key));
  const channels=[['booking-engine','Booking Engine'],['chinese-site','Chinese Site'],['red','RED'],['wechat','WeChat']];
  const cards=channels.map(([id,name])=>`<div class="stat" data-booking-channel="${id}">
    <strong>${name}</strong><small>${label('bookingDisabled')}</small></div>`).join('');
  const empty=(id,title,actions='')=>`<section class="panel" data-booking-empty="${id}"><h3>${label(title)}</h3><p class="empty">${label('bookingNoData')}</p>${actions}</section>`;
  const verificationFields=['businessContact','companyName','phone','address'].map(name=>
    `<label>${label('bookingVerify_'+name)}<input name="${name}" readonly></label>`).join('');
  return `<section class="panel" data-booking-engine-setup><h2>${label('bookingEngineSetup')}</h2><h3>${label('bookingSiteSetup')}</h3><div class="stats">${cards}</div></section>
    ${empty('room-rate-plans','bookingRoomRates',`<button type="button" data-booking-maintenance="resourcesSettings">${label('resourcesSettings')}</button> <button type="button" data-booking-maintenance="rates">${label('rateInventory')}</button>`)}${empty('taxes','bookingTaxes')}
    <section class="panel" data-booking-seo><h3>${label('bookingSeo')}</h3><p>${label('bookingSeoUnset')}</p><p class="muted">${label('bookingSeoNote')}</p></section>
    <section class="panel" data-booking-strike data-effective="false"><h3>${label('bookingStrike')}</h3>
      <label><input type="checkbox" checked disabled> ${label('bookingEnabled')}</label><p>${label('bookingStrikeNote')}</p></section>
    <section class="panel"><details data-booking-verify-preview><summary>${label('bookingVerify')}</summary>
      <p class="muted">${label('bookingVerifyNote')}</p><div class="form-row">${verificationFields}</div>
    </details></section>`;
}

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
   start:r.start,end:r.end,roomType:r.selections?r.selections.map(line=>typeName(line.roomTypeId)+' × '+line.rooms).join(' · '):typeName(r.roomTypeId),guests:r.guests,rooms:r.rooms||1}[key]??'');
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
export function notificationsPage({notifications=[],properties=[],propertyId,noticeSettings=[],noticeSettingsAudit=[],noticeRules=[],noticeRulesAudit=[],can=()=>false,t,escape}) {
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
   if(n.kind==='staff_notice')return esc(n.text);
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
   <td><span class="sev sev-${esc(rank(n))}">${esc(t(level(n)))}</span>${n.escalated?` <small class="muted">${esc(t('noticeRuleEscalated'))}</small>`:''}</td>
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
 // A rule is written against a fact that can be counted, never against an event. The
 // count is left empty to disable it, and the level can only raise the fact towards the
 // top. The system default is shown alongside so the choice is made with it in view.
 const ruleEditable=can('notice_rule_save');
 const ruleSetting=(noticeRules||[]).find(s=>s.propertyId===propertyId);
 const ruleLevels=ruleSetting?.rules||{};
 const ruleRows=noticeRuleKinds.map(kind=>{
   const chosen=ruleLevels[kind];
   const levelOptions=noticeLevels.map(l=>`<option value="${l}" ${chosen?.level===l?'selected':''}>${esc(t(levelKey(l)))}</option>`).join('');
   return `<tr><td>${esc(t(kindKey(kind)))}</td><td>${esc(t(levelKey(severityOf(kind))))}</td>
     <td><input type="number" min="1" max="99" step="1" inputmode="numeric" name="${esc(kind)}" data-notice-rule-at-least="${esc(kind)}"
       value="${chosen?esc(chosen.atLeast):''}" placeholder="${esc(t('noticeRuleOff'))}" ${ruleEditable?'':'disabled'}></td>
     <td><select name="${esc(kind)}-level" data-notice-rule-level="${esc(kind)}" ${ruleEditable?'':'disabled'}>${levelOptions}</select></td></tr>`;
 }).join('');
 const ruleLabel=r=>r?`${esc(r.atLeast)} → ${esc(t(levelKey(r.level)))}`:esc(t('noticeRuleOff'));
 const ruleAudit=(noticeRulesAudit||[]).filter(a=>a.propertyId===propertyId).slice(0,10).map(a=>{
   const changed=noticeRuleKinds.filter(k=>JSON.stringify(a.previous?.[k]??null)!==JSON.stringify(a.next?.[k]??null))
     .map(k=>`${esc(t(kindKey(k)))}: ${ruleLabel(a.previous?.[k])} → ${ruleLabel(a.next?.[k])}`).join('; ');
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
  </section>
  <section class="panel"><div class="panel-head"><h2>${esc(t('noticeRuleTitle'))}</h2>${ruleSetting?`<span>${esc(t('noticeLevelChanged'))}: ${esc(ruleSetting.updatedBy)} · ${esc(ruleSetting.updatedAt)}</span>`:''}</div>
   <p class="muted">${esc(t('noticeRuleNote'))}</p>
   <p class="muted">${esc(t('noticeRuleScopeNote'))}</p>
   <form id="notice-rule-form" class="notice-settings">
    <div class="table-wrap"><table><thead><tr>${['noticeKind','noticeLevelBuiltIn','noticeRuleAtLeast','noticeRuleLevel'].map(h=>`<th>${esc(t(h))}</th>`).join('')}</tr></thead><tbody>${ruleRows}</tbody></table></div>
    ${ruleEditable?`<button class="primary">${esc(t('noticeRuleSave'))}</button>`:`<p class="muted">${esc(t('noticeRuleReadOnly'))}</p>`}
   </form>
   ${ruleAudit?`<h3>${esc(t('noticeRuleAudit'))}</h3><div class="table-wrap"><table><thead><tr>${['time','createdBy','noticeLevelChange'].map(h=>`<th>${esc(t(h))}</th>`).join('')}</tr></thead><tbody>${ruleAudit}</tbody></table></div>`:''}
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
  notice_read_failed:'标记已读失败，请稍后再试。',notifications_polling:'提醒每约一分钟自动检查一次，不刷新你正在操作的页面。',
  noticeRuleTitle:'条件升级规则',noticeRuleNote:'门店可以让某类待办在积压到一定程度时自动升级：例如待清洁房达到 3 间就按紧急处理。规则只影响本店这些仍然成立的待办的排序与标签，不改变系统默认级别、不产生或清除提醒、不投递给任何人，也不推进业务版本。规则只能升级，不能把紧急的客人降级。数量留空表示不启用该规则。',
  noticeRuleScopeNote:'数量口径：待清洁房按待清洁的房间数；等待过久的预订请求与待核验登记按当前本店同类待办条数。',
  noticeRuleAtLeast:'当数量达到',noticeRuleLevel:'升级为',noticeRuleOff:'不启用',noticeRuleSave:'保存规则',
  noticeRuleReadOnly:'只有本店管理员可以调整条件规则。',noticeRuleAudit:'最近的规则调整',noticeRuleEscalated:'已按规则升级'},
 en:{notifications:'Notifications',noticeUnreadCount:'Unread',noticeNote:'Notices stay inside JOVIAN: no email, SMS or push is connected, so nothing is sent to anyone and they are only seen by signing in. A notice points at the work; it never does the work.',
  noticeOtherProperty:'Unread in other properties',noticeKind:'Type',noticeDetail:'Detail',noticeProperty:'Property',noticeState:'State',noticeActions:'Actions',
  noticeUnread:'Unread',noticeRead:'Read',noticeOpen:'Go to it',noticeMarkRead:'Mark read',noticeMarkAllRead:'Mark everything in this property read',
  noticeBookingRequest:'New booking request from the site',noticeNone:'Nothing to notify you about.',nights:'nights',requestQuote:'quoted',
  noticeNoShow:'Arrival that never arrived',noticeOverdue:'Departure that never left',noticeUnassigned:'Arriving today, no room yet',
  noticeCleaning:'Rooms needing cleaning',noticeWaiting:'Booking request left waiting',noticeDue:'Due',noticeRoomsUnit:'to clean',
  noticeWaitingNote:'waiting for more than a day',noticeLevelTitle:'Notice priority settings',noticeLevelNote:'A property decides where each kind of notice sits: make cleaning urgent, or make an arrival routine. It only affects this property. Leaving one at the system default keeps following the current rule instead of freezing an old default into a setting. A level changes the order and the label only: it does not change whether a notice is raised, the unread count, or do any of the work.',noticeLevelBuiltIn:'System default',noticeLevelProperty:'This property',noticeLevelDefault:'System default',noticeLevelSave:'Save priorities',noticeLevelReadOnly:'Only an administrator of this property can change notice priorities.',noticeLevelAudit:'Recent priority changes',noticeLevelChange:'Change',noticeLevelChanged:'Last changed',noticeSeverity:'Priority',severityUrgent:'Urgent',severityAttention:'Attention',severityRoutine:'Routine',noticeCheckinReview:'Registration waiting for review',noticeCheckinReviewNote:'identity details submitted, waiting for a person to check them',noticeSeverityNote:'By default the list is ordered by priority: guests who should have arrived or left, arrivals with no room, and registrations waiting for review come first; rooms needing cleaning come last. This property can change each level below.',noticeOpenOrder:'Open booking',
  noticeStandingNote:'These are facts still standing rather than things that happened. Once one is dealt with it disappears by itself.',
  notice_read_failed:'Marking as read failed, so please try again.',notifications_polling:'Notices are checked about once a minute. The page you are working on is not reloaded.',
  noticeRuleTitle:'Conditional priority rules',noticeRuleNote:'A property can let a kind of standing work rise in the list once it has piled up: for example, treat rooms needing cleaning as urgent once there are 3 of them. A rule only changes the order and label of these still-standing facts at this property. It does not change the system default, does not raise or dismiss a notice, sends nothing to anyone, and advances no business revision. A rule can only raise a notice; it can never push an urgent guest down. Leaving the count empty disables that rule.',
  noticeRuleScopeNote:'What is counted: cleaning counts dirty rooms; waiting requests and registrations waiting for review count how many of that kind are outstanding at this property.',
  noticeRuleAtLeast:'When there are at least',noticeRuleLevel:'Raise to',noticeRuleOff:'No rule',noticeRuleSave:'Save rules',
  noticeRuleReadOnly:'Only an administrator of this property can change the conditional rules.',noticeRuleAudit:'Recent rule changes',noticeRuleEscalated:'raised by a rule'},
 ms:{notifications:'Pemberitahuan',noticeUnreadCount:'Belum dibaca',noticeNote:'Pemberitahuan kekal dalam JOVIAN: tiada e-mel, SMS atau push disambungkan, jadi tiada apa dihantar dan hanya kelihatan selepas log masuk. Ia menunjuk kepada kerja, bukan melakukannya.',
  noticeOtherProperty:'Belum dibaca di hartanah lain',noticeKind:'Jenis',noticeDetail:'Butiran',noticeProperty:'Hartanah',noticeState:'Status',noticeActions:'Tindakan',
  noticeUnread:'Belum dibaca',noticeRead:'Dibaca',noticeOpen:'Pergi ke situ',noticeMarkRead:'Tanda dibaca',noticeMarkAllRead:'Tandakan semua di hartanah ini sebagai dibaca',
  noticeBookingRequest:'Permintaan tempahan baharu dari laman',noticeNone:'Tiada pemberitahuan.',nights:'malam',requestQuote:'ada sebut harga',
  noticeNoShow:'Ketibaan yang tidak tiba',noticeOverdue:'Berlepas yang tidak keluar',noticeUnassigned:'Tiba hari ini, belum ada bilik',
  noticeCleaning:'Bilik perlu dibersihkan',noticeWaiting:'Permintaan tempahan terbiar',noticeDue:'Tarikh akhir',noticeRoomsUnit:'perlu dibersih',
  noticeWaitingNote:'menunggu lebih daripada sehari',noticeLevelTitle:'Tetapan keutamaan pemberitahuan',noticeLevelNote:'Hartanah boleh menentukan kedudukan setiap jenis pemberitahuan: jadikan pembersihan mendesak, atau ketibaan sesuatu rutin. Ia hanya memberi kesan kepada hartanah ini. Biarkan pada lalai sistem untuk terus mengikut peraturan semasa, bukan membeku nilai lama. Keutamaan hanya mengubah susunan dan label: ia tidak mengubah sama ada pemberitahuan dijana, bilangan belum dibaca, atau melakukan sebarang kerja.',noticeLevelBuiltIn:'Lalai sistem',noticeLevelProperty:'Hartanah ini',noticeLevelDefault:'Lalai sistem',noticeLevelSave:'Simpan keutamaan',noticeLevelReadOnly:'Hanya pentadbir hartanah ini boleh mengubah keutamaan pemberitahuan.',noticeLevelAudit:'Perubahan keutamaan terkini',noticeLevelChange:'Perubahan',noticeLevelChanged:'Terakhir diubah',noticeSeverity:'Keutamaan',severityUrgent:'Mendesak',severityAttention:'Perhatian',severityRoutine:'Rutin',noticeCheckinReview:'Pendaftaran menunggu semakan',noticeCheckinReviewNote:'butiran identiti dihantar, menunggu semakan oleh kakitangan',noticeSeverityNote:'Secara lalai senarai mengikut keutamaan: tetamu yang sepatutnya tiba atau keluar, ketibaan tanpa bilik, dan pendaftaran menunggu semakan di hadapan; bilik perlu dibersihkan di akhir. Hartanah ini boleh menukar setiap tahap di bawah.',noticeOpenOrder:'Buka tempahan',
  noticeStandingNote:'Ini fakta yang masih berlaku, bukan peristiwa. Setelah selesai ia hilang dengan sendirinya.',
  notice_read_failed:'Menanda dibaca gagal, sila cuba lagi.',notifications_polling:'Pemberitahuan diperiksa kira-kira setiap minit. Halaman yang sedang digunakan tidak dimuat semula.',
  noticeRuleTitle:'Peraturan keutamaan bersyarat',noticeRuleNote:'Hartanah boleh membiarkan kerja yang masih tertunggak naik dalam senarai apabila ia cukup banyak: contohnya, anggap bilik perlu dibersihkan sebagai mendesak apabila ada 3 bilik. Peraturan hanya mengubah susunan dan label fakta yang masih berlaku di hartanah ini. Ia tidak mengubah lalai sistem, tidak menjana atau membuang pemberitahuan, tidak menghantar apa-apa, dan tidak memajukan versi perniagaan. Peraturan hanya boleh menaikkan, tidak boleh menurunkan tetamu mendesak. Biarkan kosong untuk melumpuhkan peraturan itu.',
  noticeRuleScopeNote:'Apa yang dikira: pembersihan mengira bilik kotor; permintaan menunggu dan pendaftaran menunggu semakan mengira berapa banyak yang masih tertunggak di hartanah ini.',
  noticeRuleAtLeast:'Apabila sekurang-kurangnya',noticeRuleLevel:'Naik ke',noticeRuleOff:'Tiada peraturan',noticeRuleSave:'Simpan peraturan',
  noticeRuleReadOnly:'Hanya pentadbir hartanah ini boleh mengubah peraturan bersyarat.',noticeRuleAudit:'Perubahan peraturan terkini',noticeRuleEscalated:'dinaikkan oleh peraturan'}
};

export const operationsDisplayWords={
  zh:{operationsDisplay:'房态显示与前台住宿规则',roomGroups:'房间分组',groupName:'分组名称',addGroup:'添加分组',removeGroup:'删除分组',typeOrder:'按房型排序',roomOrder:'按房间排序',groupOrder:'按分组排序',paymentOrder:'付款方式排列',channelOrder:'渠道排列',enabledList:'启用',disabledList:'停用',ungrouped:'未分组',reorderHelp:'拖动条目调整顺序，或用上下按钮。将房间拖入分组以修改归属。',advanceCard:'预发预订房卡',advanceMinutes:'入住时间前的分钟数',advanceNote:'仅保存规则，不实际发卡；此设置不是智能锁密码。',invalidGroups:'请为每个分组填写名称。'},
  en:{operationsDisplay:'Calendar display and front desk stay rules',roomGroups:'Room groups',groupName:'Group name',addGroup:'Add group',removeGroup:'Remove group',typeOrder:'Sort by room type',roomOrder:'Sort by room',groupOrder:'Sort by group',paymentOrder:'Payment method order',channelOrder:'Channel order',enabledList:'Enabled',disabledList:'Disabled',ungrouped:'Ungrouped',reorderHelp:'Drag items to reorder, or use the up and down buttons. Drag a room into a group to assign it.',advanceCard:'Advance Key Card Issuance for Reserved Reservations',advanceMinutes:'Minutes before check-in time',advanceNote:'Saves the rule only; no key card is issued. This is not a smart-lock passcode.',invalidGroups:'Enter a name for each room group.'},
  ms:{operationsDisplay:'Paparan kalendar dan peraturan penginapan kaunter',roomGroups:'Kumpulan bilik',groupName:'Nama kumpulan',addGroup:'Tambah kumpulan',removeGroup:'Buang kumpulan',typeOrder:'Susun mengikut jenis bilik',roomOrder:'Susun mengikut bilik',groupOrder:'Susun mengikut kumpulan',paymentOrder:'Susunan kaedah pembayaran',channelOrder:'Susunan saluran',enabledList:'Aktif',disabledList:'Tidak aktif',ungrouped:'Tanpa kumpulan',reorderHelp:'Seret item untuk menyusun, atau gunakan butang atas dan bawah. Seret bilik ke kumpulan untuk menetapkannya.',advanceCard:'Pengeluaran awal kad kunci untuk tempahan',advanceMinutes:'Minit sebelum masa daftar masuk',advanceNote:'Simpan peraturan sahaja; tiada kad kunci dikeluarkan. Ini bukan kod laluan kunci pintar.',invalidGroups:'Masukkan nama bagi setiap kumpulan bilik.'}
};
for(const labels of Object.values(operationsDisplayWords))labels.act_display_preferences_save=labels.operationsDisplay;

export function preferenceOptions(defaults, saved=[], {includeDisabled=false, keep}={}){
  const known=saved.filter(row=>defaults.includes(row.id));
  const seen=new Set(known.map(row=>row.id));
  return [...known,...defaults.filter(id=>!seen.has(id)).map(id=>({id,enabled:true}))]
    .filter(row=>includeDisabled||row.enabled||row.id===keep);
}

export function bindOperationsDisplay(root,{preferences,rooms,types,payments,channels,t,save,editable,errorText}){
  const groupMap=new Map((preferences.groups||[]).map(group=>[group.id,{...group,roomIds:group.roomIds.filter(id=>rooms.some(room=>room.id===id))}]));
  const ordered=(ids,entries)=>[...(ids||[]).filter(id=>entries.some(row=>row.id===id)),...entries.map(row=>row.id).filter(id=>!ids?.includes(id))];
  const optionLists=(key,ids)=>Object.fromEntries([true,false].map(enabled=>[key+(enabled?'-enabled':'-disabled'),preferenceOptions(ids,preferences[key],{includeDisabled:true}).filter(row=>row.enabled===enabled).map(row=>row.id)]));
  const lists={
    roomTypeOrder:ordered(preferences.roomTypeOrder,types),
    roomOrder:ordered(preferences.roomOrder,rooms),
    groupOrder:ordered(preferences.groupOrder,[...groupMap.values()]),
    ...optionLists('payments',payments),...optionLists('channels',channels)
  };
  const advance={enabled:false,minutes:0,...preferences.advanceCard};
  const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const ro=editable?'':' disabled';
  const roomLabel=id=>rooms.find(room=>room.id===id)?.label||id;
  const name=(key,id)=>key==='roomTypeOrder'?types.find(row=>row.id===id)?.label:key==='groupOrder'?groupMap.get(id)?.name||t('groupName'):key==='roomOrder'||key.startsWith('member:')?roomLabel(id):t(id);
  const renderList=(key,ids)=>`<ul class="list" data-layout-list="${escape(key)}">${ids.map((id,i)=>`<li draggable="${editable}" data-layout-item="${escape(id)}">${escape(name(key,id))} <button type="button" data-layout-step="-1" aria-label="${escape(t('previous'))}" ${i?ro:'disabled'}>↑</button> <button type="button" data-layout-step="1" aria-label="${escape(t('next'))}" ${i<ids.length-1?ro:'disabled'}>↓</button>${key.includes('-enabled')||key.includes('-disabled')?` <button type="button" data-layout-toggle${ro}>${t(key.endsWith('-enabled')?'disabledList':'enabledList')}</button>`:''}</li>`).join('')}</ul>`;
  const members=key=>key==='member:'?rooms.map(r=>r.id).filter(id=>![...groupMap.values()].some(group=>group.roomIds.includes(id))):groupMap.get(key.slice(7))?.roomIds||[];
  const render=()=>{
    root.innerHTML=`<section class="panel" data-operations-display><h2>${t('operationsDisplay')}</h2><form id="operations-display-form"><p>${t('reorderHelp')}</p><section><h3>${t('roomGroups')}</h3><button type="button" data-add-room-group${ro}>${t('addGroup')}</button><fieldset><legend>${t('ungrouped')}</legend>${renderList('member:',members('member:'))}</fieldset>${lists.groupOrder.map(id=>`<fieldset><legend>${t('roomGroups')}</legend><label>${t('groupName')}<input required maxlength="80" data-group-name="${escape(id)}" value="${escape(groupMap.get(id).name)}"${ro}></label><button type="button" data-remove-room-group="${escape(id)}"${ro}>${t('removeGroup')}</button>${renderList('member:'+id,members('member:'+id))}</fieldset>`).join('')}<label>${t('roomGroups')}<select data-move-room${ro}><option value="">${t('room')}</option>${rooms.map(r=>`<option value="${escape(r.id)}">${escape(r.label)}</option>`).join('')}</select><select data-move-group${ro}><option value="member:">${t('ungrouped')}</option>${lists.groupOrder.map(id=>`<option value="member:${escape(id)}">${escape(groupMap.get(id).name||t('groupName'))}</option>`).join('')}</select><button type="button" data-move-room-button${ro}>${t('apply')}</button></label></section><section><h3>${t('displaySettings')}</h3>${[['roomTypeOrder','typeOrder'],['roomOrder','roomOrder'],['groupOrder','groupOrder']].map(([key,label])=>`<fieldset><legend>${t(label)}</legend>${renderList(key,lists[key])}</fieldset>`).join('')}</section>${[['payments','paymentOrder'],['channels','channelOrder']].map(([key,label])=>`<section><h3>${t(label)}</h3>${['enabled','disabled'].map(status=>`<fieldset><legend>${t(status+'List')}</legend>${renderList(key+'-'+status,lists[key+'-'+status])}</fieldset>`).join('')}</section>`).join('')}<fieldset><legend>${t('advanceCard')}</legend><p>${t('advanceNote')}</p><label><input name="advanceEnabled" type="checkbox" ${advance.enabled?'checked':''}${ro}> ${t('advanceCard')}</label><label>${t('advanceMinutes')}<input name="advanceMinutes" type="number" min="0" max="1440" step="1" required value="${escape(advance.minutes)}"${advance.enabled?ro:' disabled'}></label></fieldset><p role="alert" data-layout-error></p><button class="primary" ${ro}>${t('apply')}</button></form></section>`;
  };
  const move=(from,to,id,before)=>{
    if(from.startsWith('member:')&&to.startsWith('member:')){
      if(from===to)return;
      for(const group of groupMap.values())group.roomIds=group.roomIds.filter(room=>room!==id);
      if(to!=='member:')groupMap.get(to.slice(7))?.roomIds.push(id);
    }else{
      if(from!==to&&(!from.includes('-')||from.split('-')[0]!==to.split('-')[0]))return;
      if(!lists[from]?.includes(id)||!lists[to]||before===id)return;
      lists[from]=lists[from].filter(row=>row!==id);
      const index=lists[to].indexOf(before);
      lists[to].splice(index<0?lists[to].length:index,0,id);
    }
    render();
  };
  let dragged;
  root.ondragstart=e=>{const item=e.target.closest('[data-layout-item]');if(!editable||!item)return;dragged={key:item.closest('[data-layout-list]').dataset.layoutList,id:item.dataset.layoutItem};e.dataTransfer?.setData('text/plain',dragged.id);};
  root.ondragend=()=>{dragged=null;};
  root.ondragover=e=>{if(dragged&&(e.target.closest('[data-layout-list]')||e.target.closest('fieldset')?.querySelector('[data-layout-list]')))e.preventDefault();};
  root.ondrop=e=>{
    const target=(e.target.closest('[data-layout-list]')||e.target.closest('fieldset')?.querySelector('[data-layout-list]'));
    if(!dragged||!target)return;
    e.preventDefault();
    const item=e.target.closest('[data-layout-item]');
    move(dragged.key,target.dataset.layoutList,dragged.id,item?.dataset.layoutItem);
    dragged=null;
  };
  root.oninput=e=>{
    const input=e.target;
    if(input.dataset.groupName)groupMap.get(input.dataset.groupName).name=input.value;
    if(input.name==='advanceEnabled'){advance.enabled=input.checked;if(!advance.enabled)advance.minutes=0;const minutes=root.querySelector('[name=advanceMinutes]');minutes.disabled=!advance.enabled;minutes.value=advance.minutes;}
    if(input.name==='advanceMinutes')advance.minutes=input.value;
  };
  root.onclick=e=>{
    if(!editable)return;
    const button=e.target.closest('button');
    if(!button)return;
    if(button.hasAttribute('data-add-room-group')){
      const id=crypto.randomUUID();groupMap.set(id,{id,name:'',roomIds:[]});lists.groupOrder.push(id);render();root.querySelector('[data-group-name="'+id+'"]').focus();
    }
    if(button.dataset.removeRoomGroup){
      const id=button.dataset.removeRoomGroup;groupMap.delete(id);lists.groupOrder=lists.groupOrder.filter(row=>row!==id);render();
    }
    if(button.hasAttribute('data-move-room-button')){
      const id=root.querySelector('[data-move-room]').value,to=root.querySelector('[data-move-group]').value;
      if(id)move('member:'+([...groupMap.values()].find(group=>group.roomIds.includes(id))?.id||''),to,id);
    }
    const item=button.closest('[data-layout-item]');
    if(!item)return;
    const key=item.closest('[data-layout-list]').dataset.layoutList,id=item.dataset.layoutItem;
    if(button.hasAttribute('data-layout-toggle')){
      const [kind,status]=key.split('-');move(key,kind+'-'+(status==='enabled'?'disabled':'enabled'),id);
    }
    if(button.dataset.layoutStep&&lists[key]){
      const index=lists[key].indexOf(id),next=index+Number(button.dataset.layoutStep);
      if(next>=0&&next<lists[key].length){[lists[key][index],lists[key][next]]=[lists[key][next],lists[key][index]];render();}
    }
  };
  root.onsubmit=async e=>{
    if(e.target.id!=='operations-display-form')return;
    e.preventDefault();
    if(!editable)return;
    const groups=lists.groupOrder.map(id=>groupMap.get(id));
    const error=root.querySelector('[data-layout-error]');
    if(groups.some(group=>!group.name.trim())){error.textContent=t('invalidGroups');return;}
    const options=key=>[true,false].flatMap(enabled=>lists[key+(enabled?'-enabled':'-disabled')].map(id=>({id,enabled})));
    const button=e.submitter||e.target.querySelector('.primary');
    button.disabled=true;
    try{await save({groups,roomTypeOrder:lists.roomTypeOrder,roomOrder:lists.roomOrder,groupOrder:lists.groupOrder,payments:options('payments'),channels:options('channels'),advanceCard:{enabled:advance.enabled,minutes:advance.enabled?Number(advance.minutes):0}});}
    catch(err){error.textContent=errorText(err);button.disabled=false;}
  };
  render();
}

// Internal operations workbench; all labels are deliberately local to this batch.
export function internalOperationsPanel({state,propertyId,lang='en',username='',admin=false,view,escape:esc}){
 const L=(zh,en,ms)=>({zh,en,ms}[lang]||en),own=key=>(state[key]||[]).filter(r=>r.propertyId===propertyId);
 const field=(name,label,type='text',extra='')=>`<label>${esc(label)} <input name="${name}" type="${type}" ${extra}></label>`;
 const select=(name,label,rows)=>`<label>${esc(label)} <select name="${name}">${rows.map(([value,label])=>`<option value="${esc(value)}">${esc(label)}</option>`).join('')}</select></label>`;
 const form=(type,body)=>`<form data-internal-command="${type}">${body}<button>${esc(L('保存','Save','Simpan'))}</button><output role="status"></output></form>`;
 const table=rows=>`<div class="table-wrap"><table><tbody>${rows.map(row=>`<tr>${row.map(cell=>`<td>${esc(cell??'—')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
 let body='';
 if(view==='calendar')body+=`<button type="button" data-calendar-range-query>${L('当前日历区间住宿查询','Stays in the displayed calendar range','Penginapan dalam julat kalendar')}</button>`;
 if(view==='notifications'){
 body+=`<h3>${L('员工提醒与历史','Staff notices and history','Notis kakitangan dan sejarah')}</h3><p>${L('仅系统内。短信、电邮及推送未连接。日期按营业日；撤回保留原文。','Internal only. SMS, email and push are not connected. Dates use business day; withdrawal keeps the original.','Dalaman sahaja. SMS, e-mel dan push tidak disambungkan. Tarikh hari perniagaan; penarikan menyimpan asal.')}</p>`;
 body+=form('notice_send',field('text',L('内容','Message','Mesej'),'text','maxlength="1000" required')+field('recipient',L('接收账号（空为全店）','Recipient account (blank: property)','Akaun penerima (kosong: hartanah)')));
 body+=field('noticeSearch',L('查询：内容、发出人、状态、日期','Search: message, sender, status, date','Cari: mesej, penghantar, status, tarikh'));
 body+=`<div data-staff-history>${own('staffNotices').filter(n=>!n.recipient||n.recipient===username||n.actor===username).map(n=>{const withdrawn=own('noticeWithdrawals').find(w=>w.noticeId===n.id);return `<article data-history-row><p>${esc([n.businessDate,n.actor,n.recipient,n.text,withdrawn?L('已撤回','Withdrawn','Ditarik'):L('已发出','Sent','Dihantar')].join(' · '))}</p>${!withdrawn&&n.actor===username?form('notice_withdraw',`<input type="hidden" name="noticeId" value="${esc(n.id)}">`+field('reason',L('撤回原因','Withdrawal reason','Sebab penarikan'),'text','required maxlength="500"')):''}${withdrawn?`<p>${esc(withdrawn.actor+' · '+withdrawn.reason+' · '+withdrawn.at)}</p>`:''}</article>`;}).join('')}</div>`;
 if(admin)body+=`<h3>${L('班次 / 账号升级规则','Shift / account escalation rules','Peraturan eskalasi syif / akaun')}</h3>`+form('notice_scope_save',select('kind',L('提醒种类','Notice kind','Jenis notis'),noticeKinds.map(k=>[k,k]))+select('level',L('级别','Level','Tahap'),noticeLevels.map(k=>[k,k]))+select('shiftId',L('班次（可空）','Shift (optional)','Syif (pilihan)'),[['','—'],...(state.shiftTypes||[]).filter(r=>!r.propertyId||r.propertyId===propertyId).map(r=>[r.id,r.name])])+field('username',L('员工账号（可空）','Account (optional)','Akaun (pilihan)')))+table(own('noticeScopes').map(r=>[r.kind,r.shiftId,r.username,r.level,r.actor,r.at]));
 }
 if(view==='commission'){
 body+=`<h3>${L('渠道默认佣金费率（生效历史）','Default channel commission rates (effective history)','Kadar komisen saluran (sejarah kuat kuasa)')}</h3>`;
 if(admin)body+=form('commission_rate_save',select('source',L('渠道','Channel','Saluran'),['direct','booking','agoda','airbnb','expedia','tripcom','traveloka','tiket','chinesesite','rednote','neppan','hostelworld','tujia','vrbo','xiaozhu','temairazu','rakuten','klook','walkin','bookingengine','other'].map(k=>[k,k]))+field('percent',L('百分比','Percent','Peratus'),'number','required min="0" max="100" step="0.01"')+field('effectiveFrom',L('生效营业日期','Effective business date','Tarikh perniagaan kuat kuasa'),'date','required'));
 body+=table([[L('渠道','Channel','Saluran'),L('费率','Rate','Kadar'),L('生效日期','Effective date','Tarikh kuat kuasa'),L('操作人','Actor','Pelaku'),L('时间','Time','Masa')],...own('commissionRates').map(r=>[r.source,r.percent+'%',r.effectiveFrom,r.actor,r.at])]);
 body+=table([[L('住宿项','Stay','Penginapan'),L('渠道','Channel','Saluran'),L('费率 %','Rate %','Kadar %'),L('预期（分）','Expected (cents)','Jangkaan (sen)'),L('实际（分）','Actual (cents)','Sebenar (sen)'),L('差额（分）','Variance (cents)','Beza (sen)')],...state.orders.filter(o=>o.propertyId===propertyId&&o.commission).map(o=>[o.id,o.source,o.commission.expected?.rate==null?'—':o.commission.expected.rate+'%',o.commission.expected?.amount??'—',o.commission.amount,o.commission.expected?.amount==null?'—':o.commission.amount-o.commission.expected.amount])]);
 body+=`<p>${L('预期/实际/差额以分显示；无费率显示空。预期基数为首次录入时账页应付总额（含附加费及取消费），仅供人工核对。无 OTA 导入或银行连接。','Expected / actual / variance in cents; missing rates stay blank. The indicative basis is the folio charge at first invoice entry, including extras and penalties, for manual review. No OTA import or bank connection.','Jangkaan / sebenar / beza dalam sen; kadar tiada kekal kosong. Asas indikatif ialah caj folio semasa entri invois pertama, termasuk tambahan dan penalti, untuk semakan manual. Tiada import OTA atau bank.')}</p>`;
 }
 if(view==='resourcesSettings'){
 body+=`<h3>${L('公开房源链接批量导入草稿','Public listing URL import drafts','Draf import URL penyenaraian awam')}</h3><p>${L('仅公开可读页面；失败如实显示。逐行检查并由管理员确认后才保存草稿，不发布、不建库存。','Publicly readable pages only; failures are reported. Check each row; only administrator confirmation saves a draft. No publishing or inventory creation.','Halaman awam sahaja; kegagalan dilaporkan. Semak setiap baris; hanya pengesahan pentadbir menyimpan draf. Tiada penerbitan atau inventori.')}</p><form data-listing-preview><textarea name="urls" rows="4" required placeholder="https://…"></textarea><button>${L('读取预览（最多10条）','Read preview (up to 10)','Baca pratonton (maksimum 10)')}</button><output></output></form><div data-listing-results></div>`;
 body+=table(own('listingDrafts').map(r=>[r.title,r.capacity,r.description,r.url,r.status]));
 }
 if(view==='propertySite'||view==='resourcesSettings'){
 body+=`<h3>${L('照片顺序 / 封面及三语描述','Photo order / cover and descriptions','Susunan foto / muka depan dan huraian')}</h3>`;
 if(admin){const targets=[...state.roomTypes.filter(r=>r.propertyId===propertyId).map(r=>['type:'+r.id,r.names?.[lang]||r.id]),...state.physicalRooms.filter(r=>r.propertyId===propertyId).map(r=>['room:'+r.id,r.label]),...own('listingDrafts').map(r=>['draft:'+r.id,r.title])];
 body+=form('booking_content_save',select('target',L('房型 / 房间 / 草稿','Room type / room / draft','Jenis bilik / bilik / draf'),targets)+field('title',L('草稿标题','Draft title','Tajuk draf'))+field('draftCapacity',L('草稿人数（可空；房型人数请在资源设置维护）','Draft capacity (optional; edit live capacity in resources)','Kapasiti draf (pilihan; edit kapasiti bilik di sumber)'),'number','min="1" max="100"')+`<label>${L('照片 URL：逐行排序','Photo URLs: ordered lines','URL foto: baris tersusun')}<textarea name="photos" rows="3"></textarea></label>`+field('cover',L('封面 URL（空用首张）','Cover URL (blank: first)','URL muka depan (kosong: pertama)'))+['zh','en','ms'].map(l=>`<label>${l}<textarea name="description_${l}" maxlength="2000"></textarea></label>`).join(''));
 body+=`<p>${L('选择目标后载入现有内容，保存会替换该目标内容。','Selecting a target loads its current content; save replaces that content.','Memilih sasaran memuatkan kandungan semasa; simpan menggantikannya.')}</p>`;}
 }
 if(view==='commission'||view==='notifications')body+=`<h3>${L('营业日报表与 CSV','Business date reports and CSV','Laporan hari perniagaan dan CSV')}</h3><form data-internal-report>${field('from',L('从','From','Dari'),'date','required')}${field('to',L('至','To','Hingga'),'date','required')}<button>${L('查询','Query','Cari')}</button><button type="button" data-report-csv>CSV</button></form><div data-report-results></div>`;
 return body?`<section class="panel" data-internal-operations>${body}</section>`:'';
}

export const parityLabels={
 parityWorkspace:['运营查询工作台','Operations queries','Pertanyaan operasi'],dailyInventory:['每日库存','Daily inventory','Inventori harian'],futureInventory:['未来库存','Future inventory','Inventori akan datang'],housekeepingCalendar:['清洁周转日历','Housekeeping turnover calendar','Kalendar pertukaran bilik'],housekeepingList:['当前清洁列表','Current cleaning list','Senarai pembersihan semasa'],rateHistory:['房价及可售变更历史','Rate and sale change history','Sejarah kadar dan jualan'],customerDetails:['客户住宿详情','Customer stay details','Butiran penginapan pelanggan'],revenueSummary:['营收汇总','Revenue summary','Ringkasan hasil'],transactionSummary:['交易汇总','Transaction summary','Ringkasan transaksi'],channelSummary:['渠道汇总','Channel summary','Ringkasan saluran'],salesSummary:['销售汇总（预订类型 / 公司）','Sales by booking type / company','Jualan mengikut jenis tempahan / syarikat'],accommodationSummary:['住宿汇总','Accommodation summary','Ringkasan penginapan'],quickNoteSummary:['备忘录历史','Quick note history','Sejarah nota ringkas'],invoice:['内部账单（非税务发票）','Internal invoice (not a tax invoice)','Invois dalaman (bukan invois cukai)'],
 tags:['当前标签','Current tags','Tag semasa'],date:['日期','Date','Tarikh'],roomTypeId:['房型','Room type','Jenis bilik'],productId:['产品','Product','Produk'],capacity:['当前目录单位数','Current catalogue units','Unit katalog semasa'],occupied:['区间内占用住宿数','Stays occupying this date','Penginapan pada tarikh ini'],available:['可售单位（各房型独立）','Available units (independent by type)','Unit tersedia (setiap jenis berasingan)'],resourceId:['房间 / 床位','Room / bed','Bilik / katil'],cleaning:['当前清洁状态','Current cleanliness','Kebersihan semasa'],arrivals:['计划抵达数','Planned arrivals','Ketibaan dirancang'],departures:['计划离店数','Planned departures','Pelepasan dirancang'],at:['操作时间','Recorded time','Masa rekod'],actor:['操作人','Actor','Pelaku'],batchId:['变更批次','Change batch','Kumpulan perubahan'],planCode:['价格计划','Rate plan','Pelan kadar'],before:['原快照','Before snapshot','Petikan sebelum'],after:['新快照','After snapshot','Petikan selepas'],orderId:['住宿项','Stay','Penginapan'],guest:['联系人','Contact','Kenalan'],phone:['电话','Phone','Telefon'],email:['邮箱','Email','E-mel'],country:['国家','Country','Negara'],start:['入住日','Arrival','Ketibaan'],end:['离店日','Departure','Pelepasan'],status:['状态','Status','Status'],charge:['账页费用（分）','Folio charges (cents)','Caj folio (sen)'],paid:['住宿净实收（分）','Net accommodation receipts (cents)','Terimaan penginapan bersih (sen)'],due:['待收 / 负数待退（分）','Due / negative refund owed (cents)','Baki / negatif perlu dipulang (sen)'],deposit:['押金余额（分）','Deposit held (cents)','Deposit dipegang (sen)'],key:['日期 / 来源','Date / source','Tarikh / sumber'],total:['总费用（分）','Total charges (cents)','Jumlah caj (sen)'],roomFee:['房费（分）','Room charges (cents)','Caj bilik (sen)'],extras:['附加费及取消费（分）','Extras and penalties (cents)','Tambahan dan penalti (sen)'],unitNights:['单位夜','Unit nights','Malam unit'],method:['收付方式','Method','Kaedah'],payment:['收款（分）','Payments (cents)','Bayaran (sen)'],refund:['退款（分）','Refunds (cents)','Pulangan (sen)'],deposit_in:['收押金（分）','Deposits in (cents)','Deposit masuk (sen)'],deposit_out:['退押金（分）','Deposits out (cents)','Deposit keluar (sen)'],netAccommodation:['住宿净收（分）','Net receipts (cents)','Terimaan bersih (sen)'],netDeposit:['押金净额（分）','Net deposits (cents)','Deposit bersih (sen)'],bookingKind:['预订类型','Booking type','Jenis tempahan'],companyName:['公司','Company','Syarikat'],revenue:['房费营收（分）','Room revenue (cents)','Hasil bilik (sen)'],soldNights:['已售单位夜','Sold unit nights','Malam unit dijual'],sellableNights:['可售单位夜','Sellable unit nights','Malam unit boleh dijual'],occupancy:['入住率（比例）','Occupancy ratio','Nisbah penghunian'],adr:['ADR（分）','ADR (cents)','ADR (sen)'],revpar:['RevPAR（分）','RevPAR (cents)','RevPAR (sen)'],businessDate:['营业日','Business date','Hari perniagaan'],text:['原文','Original text','Teks asal'],kind:['账项类型','Line kind','Jenis baris'],name:['项目','Item','Item'],amount:['账项金额（分）','Line amount (cents)','Amaun baris (sen)']
};
export function parityLabel(key,lang){return parityLabels[key]?.[{zh:0,en:1,ms:2}[lang]??1]||key;}
for(const lang of ['zh','en','ms'])shellWords[lang].parityWorkspace=parityLabel('parityWorkspace',lang);
export function parityWorkspacePage({state,propertyId,lang,date,kind='dailyInventory',escape:esc}){
 const L=(zh,en,ms)=>({zh,en,ms}[lang]||en),label=k=>parityLabel(k,lang);
 return `<section class="panel" data-parity-workspace><h2>${label('parityWorkspace')}</h2><p>${L('只读查询。营收、销售及备注按记录的营业日；交易按马来西亚自然日。金额为 MYR 分，押金不计营收。空白表示未记录。库存按当前目录计算，各房型是共享空间的独立销售选择，不能相加。','Read-only. Revenue, sales and notes use recorded business dates; transactions use Malaysia local days. Amounts are MYR cents; deposits are not revenue. Blank means unrecorded. Inventory uses the current catalogue; types are alternative uses of shared space and cannot be added.','Baca sahaja. Hasil, jualan dan nota mengikut hari perniagaan direkod; transaksi mengikut hari Malaysia. Amaun dalam sen MYR; deposit bukan hasil. Kosong bermakna tidak direkod. Inventori menggunakan katalog semasa; jenis berkongsi ruang tidak boleh dijumlah.')}</p><form data-parity-query><label>${L('视图','View','Paparan')}<select name="kind">${Object.keys(parityLabels).filter(k=>['dailyInventory','futureInventory','housekeepingCalendar','housekeepingList','rateHistory','customerDetails','revenueSummary','transactionSummary','channelSummary','salesSummary','accommodationSummary','quickNoteSummary','invoice'].includes(k)).map(k=>`<option value="${k}" ${k===kind?'selected':''}>${label(k)}</option>`).join('')}</select></label><label>${L('从','From','Dari')}<input name="from" type="date" value="${esc(date)}" required></label><label>${L('至（库存及日历最多31天，其他366天）','To (inventory and calendar: 31 days; others: 366)','Hingga (inventori dan kalendar: 31 hari; lain: 366)')}<input name="to" type="date" value="${esc(date)}" required></label><label>${L('搜索结果字段','Search result fields','Cari medan hasil')}<input name="search" maxlength="200"></label><button>${L('查询','Query','Cari')}</button><button type="button" data-parity-csv disabled>CSV</button><output role="status"></output></form><p data-parity-note></p><div data-parity-results></div><h3>iCal</h3><p>${L('仅离线文件：导出无个人资料的占用区间；粘贴全天 ICS 预览。不会抓取网址、保存导入或占用库存；不支持重复事件。','Offline files only: export occupancy without personal data; paste all-day ICS for preview. No URL fetch, saved import or inventory changes; recurring events are unsupported.','Fail luar talian sahaja: eksport penghunian tanpa data peribadi; tampal ICS sepanjang hari untuk pratonton. Tiada capaian URL, simpan import atau perubahan inventori; acara berulang tidak disokong.')}</p><form data-parity-ical><label>${L('房间 / 床位','Room / bed','Bilik / katil')}<select name="resourceId">${state.resources.filter(r=>r.propertyId===propertyId&&!r.archived).map(r=>`<option value="${esc(r.id)}">${esc(r.label)}</option>`).join('')}</select></label><button type="button" data-parity-ical-export>${L('导出所选日期区间','Export selected date range','Eksport julat tarikh dipilih')}</button><label>ICS<textarea name="ics" maxlength="100000" rows="5"></textarea></label><button>${L('仅预览粘贴文件','Preview pasted fixture','Pratonton fail ditampal')}</button><output role="status"></output><pre data-ical-preview></pre></form></section>`;
}
export function parityReportTable(report,lang,esc){
 return `<p>${parityLabel(report.kind,lang)} · ${esc(report.from)} → ${esc(report.to)} · ${report.rows.length}</p><div class="table-wrap"><table><thead><tr>${report.columns.map(k=>`<th>${esc(parityLabel(k,lang))}</th>`).join('')}</tr></thead><tbody>${report.rows.map(r=>`<tr>${report.columns.map(k=>`<td>${esc(r[k])}${k==='orderId'?` <button type="button" data-open-stay="${esc(r[k])}">${{zh:'详情',en:'Details',ms:'Butiran'}[lang]||'Details'}</button>`:''}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}

import {directoryEntries,directoryKinds} from '../src/demo-store.js';
export function directoryPanel({state,propertyId,lang,admin,escape:esc}){
 const L=(zh,en,ms)=>({zh,en,ms}[lang]||en);
 const names={tagGroup:L('标签组','Tag groups','Kumpulan tag'),tag:L('标签','Tags','Tag'),corporate:L('公司客户','Corporate clients','Pelanggan korporat'),meal:L('餐食目录','Meal catalogue','Katalog hidangan'),item:L('物品目录','Item catalogue','Katalog item'),hourly:L('钟点房定义','Hourly room definitions','Takrif bilik jam')};
 const rows=directoryEntries(state,propertyId);
 const input=(name,label,type='text',extra='')=>`<label>${label}<input name="${name}" type="${type}" ${extra}></label>`;
 const select=(name,label,options)=>`<label>${label}<select name="${name}"><option value="">—</option>${options.map(r=>`<option value="${esc(r.entryId||r.id)}">${esc(r.name||r.label||r.id)}</option>`).join('')}</select></label>`;
 return `<section class="panel" data-directory-panel><h2>${L('内部目录与客户标签','Internal directories and customer tags','Direktori dalaman dan tag pelanggan')}</h2><p>${L('每次保存追加版本；不改旧住宿价格。目录价格以 MYR 分记录。餐食不生成权益或核销；钟点房仅定义，不创建按小时库存或预订。标签绑定住宿项，不按同名合并客户。公司关联 AR 只作展示，不挂账。','Each save appends a version and does not reprice stays. Prices are MYR cents. Meals create no entitlements or redemption; hourly definitions create no hourly inventory or reservations. Tags belong to stays and never merge matching names. Corporate AR links are display references and do not post charges.','Setiap simpan menambah versi dan tidak mengubah harga penginapan. Harga dalam sen MYR. Hidangan tidak mewujudkan hak atau penebusan; takrif jam tidak mencipta inventori atau tempahan jam. Tag milik penginapan, bukan gabungan nama sama. Pautan AR syarikat hanya rujukan paparan, bukan catatan caj.')}</p>${directoryKinds.map(kind=>`<details><summary>${names[kind]} (${rows.filter(r=>r.kind===kind).length})</summary>${admin?`<form data-directory-save="${kind}">${select('entryId',L('新建（空）/ 更新已有','New (blank) / update existing','Baharu (kosong) / kemas kini'),rows.filter(r=>r.kind===kind))}${input('name',L('名称','Name','Nama'),'text','required maxlength="100"')}${kind==='tag'?select('groupId',names.tagGroup,rows.filter(r=>r.kind==='tagGroup')):''}${kind==='corporate'?input('contact',L('联系人','Contact','Kenalan'),'text','maxlength="100"')+input('phone',L('电话','Phone','Telefon'),'text','maxlength="100"')+select('arAccountId','AR',(state.arAccounts||[]).filter(r=>r.propertyId===propertyId)):''}${['meal','item','hourly'].includes(kind)?input('unitAmount',L('单价（分）','Unit rate (cents)','Kadar unit (sen)'),'number','required min="0" max="100000000" step="1"'):''}${kind==='hourly'?select('roomTypeId',L('房型','Room type','Jenis bilik'),state.roomTypes.filter(r=>r.propertyId===propertyId&&!r.archived).map(r=>({id:r.id,name:r.names?.[lang]||r.id})))+input('minHours',L('最低小时','Minimum hours','Jam minimum'),'number','required min="1" max="24" step="1"')+input('baseAmount',L('基础价（分）','Base rate (cents)','Kadar asas (sen)'),'number','required min="0" max="100000000" step="1"')+input('unitHours',L('单位小时','Unit hours','Jam unit'),'number','required min="1" max="24" step="1"')+input('maxHours',L('最大小时','Maximum hours','Jam maksimum'),'number','required min="1" max="24" step="1"'):''}<button>${L('保存追加版本','Save new version','Simpan versi baharu')}</button><output role="status"></output></form>`:''}<ul>${rows.filter(r=>r.kind===kind).map(r=>`<li>${esc(r.name)} · ${esc(r.entryId)} · ${esc(r.unitAmount??'')} ${kind==='hourly'?esc([r.roomTypeId,r.minHours,r.baseAmount,r.unitHours,r.maxHours].join(' / ')):''}${kind==='corporate'?esc([r.contact,r.phone,r.arAccountId].join(' / ')):''}${kind==='tag'?esc(rows.find(g=>g.entryId===r.groupId)?.name||''):''} · ${esc(r.actor)} · ${esc(r.at)}</li>`).join('')}</ul></details>`).join('')}${admin?`<form data-customer-tag>${select('orderId',L('住宿项','Stay','Penginapan'),state.orders.filter(r=>r.propertyId===propertyId).map(r=>({id:r.id,name:r.guest+' · '+r.id})))}${select('tagId',names.tag,rows.filter(r=>r.kind==='tag'))}<label>${L('添加 / 移除','Add / remove','Tambah / buang')}<select name="active"><option value="true">${L('添加','Add','Tambah')}</option><option value="false">${L('移除','Remove','Buang')}</option></select></label><button>${L('保存标签','Save tag','Simpan tag')}</button><output role="status"></output></form>`:''}<h3>${L('标签及设置历史','Tag and settings history','Sejarah tag dan tetapan')}</h3><div class="table-wrap"><table><tbody>${[...(state.directoryHistory||[]),...(state.customerTagHistory||[])].filter(r=>r.propertyId===propertyId).map(r=>`<tr><td>${esc(r.at)}</td><td>${esc(r.actor)}</td><td>${esc(r.kind||r.orderId)}</td><td>${esc(r.name||rows.find(t=>t.entryId===r.tagId)?.name||'')}</td><td>${esc(r.active??r.entryId)}</td></tr>`).join('')}</tbody></table></div></section>`;
}
