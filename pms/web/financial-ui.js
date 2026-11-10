import {commissionPeriod} from '../src/demo-store.js';
import {receivableReports} from '../src/financial-reports.js';
import {accommodationReport,accommodationBreakdown,cashflowReport,financialComparison,managerDailyReport,guestLedger,roomChargeDetail,roomBusinessSummary,roomMovementLog,extraChargeDetail,cancellationPenaltyDetail,roomOccupantDetail,registrationRecord,commissionDetail} from '../src/financial-reports.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const financialWords={
zh:{reportFrom:'开始日期',reportTo:'结束日期',reportDaily:'每日汇总',reportMethods:'支付方式汇总',reportDetails:'逐笔明细',reportUnallocated:'未确定营业日的费用（不计入期间汇总）',reportBusinessNote:'按住宿营业日统计收费，押金不计收入。缺少营业日的最终费用另列，不推定归属。',reportCashNote:'按马来西亚自然交易日统计手工收付记录；不代表银行到账。押金独立核算。',report_input:'请检查门店与日期范围。',report_amount:'账目金额无效，报表已停止计算。',reportTotal:'期间合计',reportNetRoom:'住宿净收款',reportNetDeposit:'押金净收款'},
en:{reportFrom:'From',reportTo:'To',reportDaily:'Daily summary',reportMethods:'Payment methods',reportDetails:'Transaction details',reportUnallocated:'Charges without a business date (excluded from period totals)',reportBusinessNote:'Charges follow accommodation business dates; deposits are not revenue. Undated final charges remain unallocated.',reportCashNote:'Manual receipts use Malaysian transaction dates, not bank settlement. Deposits remain separate.',report_input:'Check the property and date range.',report_amount:'Invalid ledger amount; calculation stopped.',reportTotal:'Period total',reportNetRoom:'Net accommodation receipts',reportNetDeposit:'Net deposit receipts'},
ms:{reportFrom:'Tarikh mula',reportTo:'Tarikh akhir',reportDaily:'Ringkasan harian',reportMethods:'Kaedah bayaran',reportDetails:'Butiran transaksi',reportUnallocated:'Caj tanpa tarikh operasi (tidak termasuk jumlah tempoh)',reportBusinessNote:'Caj mengikut tarikh operasi penginapan; deposit bukan hasil. Caj akhir tanpa tarikh diasingkan.',reportCashNote:'Rekod manual mengikut tarikh transaksi Malaysia, bukan penyelesaian bank. Deposit diasingkan.',report_input:'Semak hartanah dan julat tarikh.',report_amount:'Amaun lejar tidak sah; pengiraan dihentikan.',reportTotal:'Jumlah tempoh',reportNetRoom:'Terimaan bersih penginapan',reportNetDeposit:'Terimaan bersih deposit'}};
export function financialPage(state,{kind,propertyId,from,to,source='all',dimension='date',lang='en',transactionKind='all',method='all',operator='all',sources=[],t,currency}){
 const dimensionFilter=kind==='business'?'<label>'+esc(t('reportDimension'))+'<select data-finance-filter="dimension">'+['date','source','roomTypeId'].map(k=>'<option value="'+k+'" '+(dimension===k?'selected':'')+'>'+esc(t(k==='roomTypeId'?'roomTypes':k))+'</option>').join('')+'</select></label>':'';
 const actorOptions=[['all',t('all')],['unknown',t('unspecified')],...[...new Set(state.orders.filter(o=>o.propertyId===propertyId).flatMap(o=>(o.transactions||[]).map(tr=>tr.actor)).filter(Boolean))].sort().map(actor=>['actor:'+actor,actor])];
 const operatorFilter='<label>'+esc(t('createdBy'))+'<select data-finance-filter="operator">'+actorOptions.map(([value,label])=>'<option value="'+esc(value)+'" '+(operator===value?'selected':'')+'>'+esc(label)+'</option>').join('')+'</select></label>';
 const cashierFilters=kind==='cashflow'?operatorFilter+'<label>'+esc(t('kind'))+'<select data-finance-filter="transactionKind">'+['all','payment','refund','deposit_in','deposit_out'].map(k=>'<option value="'+k+'" '+(transactionKind===k?'selected':'')+'>'+esc(t(k))+'</option>').join('')+'</select></label><label>'+esc(t('method'))+'<select data-finance-filter="method">'+['all','cash','bank','card','ota','unspecified'].map(k=>'<option value="'+k+'" '+(method===k?'selected':'')+'>'+esc(t(k))+'</option>').join('')+'</select></label>':'';
 const filters=`<div class="order-filters"><label>${esc(t('reportFrom'))}<input data-finance-filter="from" type="date" value="${esc(from)}"></label><label>${esc(t('reportTo'))}<input data-finance-filter="to" type="date" value="${esc(to)}"></label><label>${esc(t('source'))}<select data-finance-filter="source">${['all',...sources].map(id=>`<option value="${esc(id)}" ${source===id?'selected':''}>${esc(t(id))}</option>`).join('')}</select></label>${dimensionFilter}${cashierFilters}</div>`;
 const table=(headers,rows)=>`<div class="table-wrap"><table><thead><tr>${headers.map(h=>`<th>${esc(t(h))}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
 const link=r=>`<button ${r.kind?'data-finance-detail':''} data-open-stay="${esc(r.orderId)}">${esc(r.guest||r.orderId)}</button>`;
 const money=n=>esc(currency(n));
 try{
 const query={propertyId,from,to,source,transactionKind,method,operator};let content;
 if(kind==='business'){const report=accommodationBreakdown(state,query,dimension);content=`<p>${esc(t('reportBusinessNote'))}</p><h3>${esc(t('reportTotal'))}: ${money(report.total)}</h3><h3>${esc(t('reportDaily'))}</h3>${table(['reportDate','amount'],report.daily.map(r=>`<tr><td>${esc(r.date)}</td><td>${money(r.amount)}</td></tr>`))}<h3>${esc(t('reportGrouped'))}</h3>${table(['reportDimension','roomCharge','extraCharge','unitNights','amount','details'],report.groups.map(g=>`<tr><td>${esc(dimension==='source'?t(g.key):dimension==='roomTypeId'?(state.roomTypes||[]).find(r=>r.id===g.key)?.names?.[lang]||g.key:g.key)}</td><td>${money(g.roomFee)}</td><td>${money(g.extras)}</td><td>${g.unitNights}</td><td>${money(g.total)}</td><td>${g.orderIds.map(orderId=>link({orderId,guest:state.orders.find(o=>o.id===orderId&&o.propertyId===propertyId)?.guest})).join(' ')}</td></tr>`))}<h3>${esc(t('reportDetails'))}</h3>${table(['date','guest','source','kind','amount'],report.rows.map(r=>`<tr><td>${esc(r.date)}</td><td>${link(r)}</td><td>${esc(t(r.source))}</td><td>${esc(r.name||t(r.kind))}</td><td>${money(r.amount)}</td></tr>`))}${report.unallocatedCharges.length?`<h3>${esc(t('reportUnallocated'))}</h3>${table(['guest','amount'],report.unallocatedCharges.map(r=>`<tr><td>${link(r)}</td><td>${money(r.amount)}</td></tr>`))}`:''}`;}
 else{const report=cashflowReport(state,query);content=`<p>${esc(t('reportCashNote'))}</p><h3>${esc(t('reportNetRoom'))}: ${money(report.totals.netAccommodation)} · ${esc(t('reportNetDeposit'))}: ${money(report.totals.netDeposit)}</h3><h3>${esc(t('reportMethods'))}</h3>${table(['method','payment','refund','deposit_in','deposit_out'],report.methods.map(r=>`<tr><td>${esc(t(r.method))}</td>${['payment','refund','deposit_in','deposit_out'].map(k=>`<td>${money(r[k])}<small>${r.counts[k]} ${esc(t('reportEntries'))}</small></td>`).join('')}</tr>`))}<h3>${esc(t('reportDetails'))}</h3>${table(['date','guest','kind','method','amount','createdBy'],report.rows.map(r=>`<tr><td>${esc(r.date)}</td><td>${link(r)}</td><td>${esc(t(r.kind))}</td><td>${esc(t(r.method))}</td><td>${money(r.amount)}</td><td>${esc(r.actor||'—')}</td></tr>`))}`;}
 return `<section class="panel"><h2>${esc(t(kind==='business'?'businessSummary':'cashflowSummary'))}</h2>${filters}${content}</section>`;
 }catch(error){return `<section class="panel">${filters}<p role="alert">${esc(t(error.message))}</p></section>`;}
}

Object.assign(financialWords.zh,{reportDimension:'统计维度',reportGrouped:'分组汇总',unitNights:'间夜量'});Object.assign(financialWords.en,{reportDimension:'Dimension',reportGrouped:'Grouped totals',unitNights:'Unit nights'});Object.assign(financialWords.ms,{reportDimension:'Dimensi',reportGrouped:'Jumlah kumpulan',unitNights:'Malam unit'});

Object.assign(financialWords.zh,{reportEntries:'笔',unspecified:'未指定'});Object.assign(financialWords.en,{reportEntries:'entries',unspecified:'Unspecified'});Object.assign(financialWords.ms,{reportEntries:'rekod',unspecified:'Tidak ditetapkan'});

export function renderFolioHistory(order,{t=k=>k,currency=n=>String(n)}={}){const events=order.folioEvents||[];return '<section><h3>'+esc(t('folioHistory'))+'</h3>'+(events.length?'<div class="table-wrap"><table><thead><tr>'+['time','action','createdBy','charge','paid','deposit','folioReopenReason'].map(k=>'<th>'+esc(t(k))+'</th>').join('')+'</tr></thead><tbody>'+events.map(e=>'<tr><td>'+esc(e.at)+'</td><td>'+esc(t(e.type==='settle'?'settle':e.type==='reopen'?'reopenFolio':e.type))+'</td><td>'+esc(e.actor||'—')+'</td>'+['charge','paid','deposit'].map(k=>'<td>'+(Number.isSafeInteger(e[k])?esc(currency(e[k])):'—')+'</td>').join('')+'<td>'+esc(e.reason||'—')+'</td></tr>').join('')+'</tbody></table></div>':'<p class="muted">'+esc(t('folioHistoryEmpty'))+'</p>')+'</section>';}

export function comparisonPage(state,{propertyId,periods,source='all',sources=[],t,currency}){
 const periodKeys=['current','month','year'];
 const filters='<div class="order-filters">'+periodKeys.map(key=>'<fieldset class="comparison-period"><legend>'+esc(t('compare'+key))+'</legend>'+['from','to'].map(field=>'<label>'+esc(t('report'+(field==='from'?'From':'To')))+'<input type="date" data-finance-filter="'+key+(field==='from'?'From':'To')+'" value="'+esc(periods?.[key]?.[field]||'')+'"></label>').join('')+'</fieldset>').join('')+'<label>'+esc(t('source'))+'<select data-finance-filter="source">'+['all',...sources].map(id=>'<option value="'+esc(id)+'" '+(source===id?'selected':'')+'>'+esc(t(id))+'</option>').join('')+'</select></label></div>';
 const shell=content=>'<section class="panel"><h2>'+esc(t('comparison'))+'</h2>'+filters+content+'</section>';
 try{
 const report=financialComparison(state,{propertyId,periods,source});
 const links='<div class="order-filters">'+periodKeys.map(key=>'<div><strong>'+esc(t('compare'+key))+'</strong> '+['business','cashflow'].map(kind=>'<button data-compare-drill="'+kind+'" data-period="'+key+'">'+esc(t(kind==='business'?'reportRevenueDetails':'reportCashDetails'))+'</button>').join(' ')+'</div>').join('')+'</div>';
 const metrics=['revenue','roomFee','extras','unitNights','payment','refund','netAccommodation','deposit_in','deposit_out','netDeposit'];
 const show=(metric,value)=>esc(metric==='unitNights'?String(value):currency(value));
 const rows=metrics.map(metric=>'<tr><th>'+esc(t('compareMetric'+metric))+'</th>'+periodKeys.map(key=>'<td data-compare-value="'+key+'-'+metric+'">'+show(metric,report.periods[key].values[metric])+'</td>').join('')+['month','year'].map(key=>{const change=report.changes[key][metric];return '<td>'+show(metric,change.delta)+'<small>'+(change.percent===null?'—':esc(change.percent.toFixed(2))+'%')+'</small></td>';}).join('')+'</tr>').join('');
 const warning=report.periods.current.unallocatedCharges.length?'<p role="status">'+esc(t('reportUnallocated'))+' · '+report.periods.current.unallocatedCharges.length+'</p>':'';
 return shell('<p>'+esc(t('comparisonNote'))+'</p>'+warning+links+'<div class="table-wrap"><table><thead><tr>'+['compareMetricLabel','comparecurrent','comparemonth','compareyear','compareMonthChange','compareYearChange'].map(key=>'<th>'+esc(t(key))+'</th>').join('')+'</tr></thead><tbody>'+rows+'</tbody></table></div>');
 }catch(error){return shell('<p role="alert">'+esc(t(error.message))+'</p>');}
}

Object.assign(financialWords.zh,{"comparison":"期间经营对比","comparecurrent":"本期","comparemonth":"上月同期（可调整）","compareyear":"去年同期（可调整）","compareMonthChange":"较上月差额／增长","compareYearChange":"较去年差额／增长","reportRevenueDetails":"营业明细","reportCashDetails":"收付明细","comparisonNote":"三组期间独立，含首尾日期；房费和附加项目按营业日，收付按马来西亚交易日。押金不是收入；费用未定营业日则不计入任何期间。增长率＝差额÷对比期绝对值，零基数显示—；不将收入与现金相加。","compareMetricrevenue":"住宿营业费用合计","compareMetricroomFee":"原订单房费","compareMetricextras":"附加费／优惠净额","compareMetricunitNights":"间夜量（房／床项）","compareMetricpayment":"住宿收款","compareMetricrefund":"住宿退款","compareMetricnetAccommodation":"住宿净收款","compareMetricdeposit_in":"收押金","compareMetricdeposit_out":"退押金","compareMetricnetDeposit":"押金净流入"});
Object.assign(financialWords.en,{"comparison":"Operating period comparison","comparecurrent":"Current period","comparemonth":"Previous month (editable)","compareyear":"Previous year (editable)","compareMonthChange":"Change vs month / growth","compareYearChange":"Change vs year / growth","reportRevenueDetails":"Revenue details","reportCashDetails":"Receipt details","comparisonNote":"Independent inclusive date ranges. Charges use accommodation business dates; receipts use Malaysian transaction dates. Deposits are not revenue; undated charges are excluded. Growth is change divided by the absolute comparison base; zero base shows —. Revenue and cash are not added.","compareMetricrevenue":"Accommodation charges","compareMetricroomFee":"Original room charges","compareMetricextras":"Net extras / discounts","compareMetricunitNights":"Unit nights (room / bed stays)","compareMetricpayment":"Accommodation payments","compareMetricrefund":"Accommodation refunds","compareMetricnetAccommodation":"Net accommodation receipts","compareMetricdeposit_in":"Deposits received","compareMetricdeposit_out":"Deposits returned","compareMetricnetDeposit":"Net deposit inflow"});
Object.assign(financialWords.ms,{"comparison":"Perbandingan tempoh operasi","comparecurrent":"Tempoh semasa","comparemonth":"Bulan sebelumnya (boleh ubah)","compareyear":"Tahun sebelumnya (boleh ubah)","compareMonthChange":"Perubahan bulan / pertumbuhan","compareYearChange":"Perubahan tahun / pertumbuhan","reportRevenueDetails":"Butiran hasil","reportCashDetails":"Butiran terimaan","comparisonNote":"Julat tarikh berasingan termasuk kedua-dua hujung. Caj mengikut tarikh operasi, terimaan mengikut tarikh transaksi Malaysia. Deposit bukan hasil; caj tanpa tarikh dikecualikan. Pertumbuhan ialah beza dibahagi nilai mutlak asas; asas sifar menunjukkan —. Hasil dan tunai tidak dijumlahkan.","compareMetricrevenue":"Jumlah caj penginapan","compareMetricroomFee":"Caj bilik asal","compareMetricextras":"Caj tambahan / diskaun bersih","compareMetricunitNights":"Malam unit (bilik / katil)","compareMetricpayment":"Bayaran penginapan","compareMetricrefund":"Bayaran balik penginapan","compareMetricnetAccommodation":"Terimaan bersih penginapan","compareMetricdeposit_in":"Deposit diterima","compareMetricdeposit_out":"Deposit dipulangkan","compareMetricnetDeposit":"Aliran masuk deposit bersih"});
Object.assign(financialWords.zh,{"compareMetricLabel":"指标"});
Object.assign(financialWords.en,{"compareMetricLabel":"Metric"});
Object.assign(financialWords.ms,{"compareMetricLabel":"Metrik"});

export function managerReportPage(state,{propertyId,date,source='all',sources=[],t,currency,lang}={}){
 const filters=`<div class="order-filters"><label>${esc(t('reportDate'))}<input data-finance-filter="date" type="date" value="${esc(date)}"></label><label>${esc(t('source'))}<select data-finance-filter="source">${['all',...sources].map(id=>`<option value="${esc(id)}" ${source===id?'selected':''}>${esc(t(id))}</option>`).join('')}</select></label></div>`;
 const shell=content=>`<section class="panel"><h2>${esc(t('managerDailyReport'))}</h2>${filters}${content}</section>`;
 try{
  const report=managerDailyReport(state,{propertyId,date,source});
  const c=report.current;
  const notice=c.businessDateSet?'':`<p role="alert">${esc(t('reportNoBusinessDate'))}</p>`;
  const state_=c.balanced?`<p role="status">${esc(t('reportReconciled'))}</p>`:`<p role="alert">${esc(t('reportUnreconciled'))}</p>`;
  const signed=v=>(v<0?'\u2212':v>0?'+':'')+currency(Math.abs(v));
  const lines=(title,rows)=>`<h3>${esc(t(title))}</h3><div class="table-wrap"><table><tbody>${rows.map(([k,v,note])=>`<tr><th>${esc(t(k))}</th><td>${esc(signed(v))}</td><td class="muted">${esc(note||'')}</td></tr>`).join('')}</tbody></table></div>`;
  const balance=lines('reportBalances',[
   ['mdrOpening',c.opening.due,t('mdrOpeningNote')],
   ['mdrCharges',c.charges.total,t('mdrChargesNote')],
   ['mdrReceipts',-c.settlements.net,t('mdrReceiptsNote')],
   ...(c.arNet?[['ar_post',-c.arNet,'']]:[]),
   ['mdrClosing',c.closing.due,t('mdrClosingNote')]]);
  const breakdown=lines('reportChargeBreakdown',[
   ['mdrRoom',c.charges.room,''],['mdrExtras',c.charges.extras,''],['mdrCancellation',c.charges.cancellation,'']]);
  const cash=lines('reportReceiptBreakdown',[
   ['payment',c.settlements.payment,''],['refund',c.settlements.refund,''],['deposit_in',c.settlements.deposit_in,''],['deposit_out',c.settlements.deposit_out,'']]);
  const formula=`<h3>${esc(t('reportFormula'))}</h3><p>${esc(t('reportFormulaText'))}</p><p class="ledger-formula">${esc(currency(c.opening.due))} + ${esc(currency(c.charges.total))} − ${esc(currency(c.settlements.net))}${c.arNet?' − '+esc(currency(c.arNet))+' ('+esc(t('ar_post'))+')':''} = <strong>${esc(currency(c.opening.due+c.charges.total-c.settlements.net-c.arNet))}</strong>${c.balanced?'':' · '+esc(t('reportUnreconciled'))}</p>`;
  const percent=v=>v===null?'—':esc(v.toFixed(2))+'%';
  const comparison=`<h3>${esc(t('reportComparison'))}</h3><div class="table-wrap"><table><thead><tr><th>${esc(t('compareMetricLabel'))}</th><th>${esc(t('comparecurrent'))}</th><th>${esc(t('comparemonth'))}<br><small>${esc(report.periods.month.date)}</small></th><th>${esc(t('reportMonthChange'))}</th><th>${esc(t('compareyear'))}<br><small>${esc(report.periods.year.date)}</small></th><th>${esc(t('reportYearChange'))}</th></tr></thead><tbody>${['charges','receipts','due'].map(metric=>`<tr><th>${esc(t({charges:'mdrMetricCharges',receipts:'mdrMetricReceipts',due:'mdrMetricDue'}[metric]))}</th><td>${esc(currency(report.changes.month[metric].now))}</td><td>${esc(currency(report.changes.month[metric].was))}</td><td>${esc(currency(report.changes.month[metric].delta))}<small>${percent(report.changes.month[metric].percent)}</small></td><td>${esc(currency(report.changes.year[metric].was))}</td><td>${esc(currency(report.changes.year[metric].delta))}<small>${percent(report.changes.year[metric].percent)}</small></td></tr>`).join('')}</tbody></table></div>`;
  const metrics=`<h3>${esc(t('reportMetrics'))}</h3><div class="table-wrap"><table><tbody>${[['mdrArrivals',c.metrics.arrivals],['mdrDepartures',c.metrics.departures],['mdrInHouse',c.metrics.inHouse]].map(([k,v])=>`<tr><th>${esc(t(k))}</th><td>${esc(v)}</td></tr>`).join('')}</tbody></table></div>`;
  const table=(headers,rows)=>`<div class="table-wrap"><table><thead><tr>${headers.map(h=>`<th>${esc(t(h))}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
  const link=r=>`<button data-open-stay="${esc(r.orderId)}">${esc(r.guest||r.orderId)}</button>`;
  const detail=`<h3>${esc(t('reportChargeLines'))}</h3>${table(['guest','source','kind','amount'],c.chargeLines.map(r=>`<tr><td>${link(r)}</td><td>${esc(t(r.source))}</td><td>${esc(r.name||t(r.kind))}</td><td>${esc(currency(r.amount))}</td></tr>`))}`;
  const unallocated=c.unallocated.length?`<h3>${esc(t('reportUnallocated'))}</h3>${table(['guest','amount'],c.unallocated.map(r=>`<tr><td>${link(r)}</td><td>${esc(currency(r.amount))}</td></tr>`))}`:'';
  return shell(notice+`<p>${esc(t('reportManagerNote'))}</p>`+state_+balance+breakdown+cash+formula+comparison+metrics+detail+unallocated);
 }catch(error){return shell(`<p role="alert">${esc(t(error.message))}</p>`);}
}

export function guestLedgerPage(state,{propertyId,date,source='all',sources=[],t,currency,lang}={}){
 const filters=`<div class="order-filters"><label>${esc(t('reportDate'))}<input data-finance-filter="date" type="date" value="${esc(date)}"></label><label>${esc(t('source'))}<select data-finance-filter="source">${['all',...sources].map(id=>`<option value="${esc(id)}" ${source===id?'selected':''}>${esc(t(id))}</option>`).join('')}</select></label></div>`;
 const shell=content=>`<section class="panel"><h2>${esc(t('guestLedger'))}</h2>${filters}${content}</section>`;
 try{
  const report=guestLedger(state,{propertyId,date,source});
  const buckets=[['ledgerOutstanding',report.buckets.outstanding],['ledgerOverpaid',report.buckets.overpaid],['ledgerDepositHeld',report.buckets.depositHeld],['ledgerSettled',report.buckets.settled]];
  const summary=`<div class="table-wrap"><table><thead><tr><th>${esc(t('ledgerBucket'))}</th><th>${esc(t('ledgerOrders'))}</th><th>${esc(t('amount'))}</th></tr></thead><tbody>${buckets.map(([k,b])=>`<tr><th>${esc(t(k))}</th><td>${esc(b.count)}</td><td>${esc(currency(b.amount))}</td></tr>`).join('')}</tbody></table></div>`;
  const rows=report.rows.map(r=>`<tr><td><button data-open-stay="${esc(r.orderId)}">${esc(r.guest||r.orderId)}</button></td><td>${esc(t(r.source))}</td><td>${esc(r.start)} → ${esc(r.end)}</td><td>${esc(currency(r.charge))}</td><td>${esc(currency(r.paid))}</td><td>${r.outstanding?esc(currency(r.outstanding)):'—'}</td><td>${r.overpaid?esc(currency(r.overpaid)):'—'}</td><td>${r.depositHeld?esc(currency(r.depositHeld)):'—'}</td><td>${esc(t(r.status))}</td></tr>`).join('');
  const table=`<h3>${esc(t('ledgerDetails'))}</h3><div class="table-wrap"><table><thead><tr>${['guest','source','mdrStay','mdrCharged','mdrPaid','ledgerOutstanding','ledgerOverpaid','ledgerDepositHeld','status'].map(h=>`<th>${esc(t(h))}</th>`).join('')}</tr></thead><tbody>${rows||`<tr><td colspan="9">${esc(t('empty'))}</td></tr>`}</tbody></table></div>`;
  return shell(`<p>${esc(t('reportLedgerNote'))}</p>`+summary+table);
 }catch(error){return shell(`<p role="alert">${esc(t(error.message))}</p>`);}
}

const managerWords={
 zh:{managerDailyReport:'经理日报',guestLedger:'宾客账结余',reportDate:'营业日',mdrOpening:'期初结余',mdrCharges:'本期发生费用',mdrReceipts:'本期净收款',mdrClosing:'期末结余',mdrOpeningNote:'截至前一营业日应收减已收',mdrChargesNote:'当日营业日赚取的房费、附加费与违约金',mdrReceiptsNote:'当日马来西亚交易日收款减退款，押金不计',mdrClosingNote:'截至本营业日应收减已收',reportBalances:'结余与变动',reportChargeBreakdown:'本期发生构成',reportReceiptBreakdown:'本期收付构成',mdrRoom:'房费',mdrExtras:'附加费／优惠净额',mdrCancellation:'违约金',reportFormula:'计算口径',reportFormulaText:'期末结余＝期初结余＋本期发生费用−本期净收款。费用按营业日确认，收款按马来西亚交易日确认，押金单独列示且不是收入。',reportReconciled:'本期发生与收付可重建期末结余，已对账。',reportUnreconciled:'本期发生与收付无法重建期末结余，请勿据此外报。',reportNoBusinessDate:'该门店尚未设定营业日，费用归属只能以订单自身日期为准。',reportComparison:'同比环比',reportMonthChange:'较上月',reportYearChange:'较去年',mdrMetricCharges:'本期发生费用',mdrMetricReceipts:'本期净收款',mdrMetricDue:'期末结余',reportMetrics:'经营指标',mdrArrivals:'当日应到',mdrDepartures:'当日应离',mdrInHouse:'在住',reportChargeLines:'当日逐笔费用',reportManagerNote:'日报以营业日为口径，而不是自然日；押金是负债不是收入，未确定营业日的费用不计入任何期间。',ledgerOutstanding:'未收',ledgerOverpaid:'多收待退',ledgerDepositHeld:'押金余款',ledgerSettled:'已结清',ledgerBucket:'分类',ledgerOrders:'订单数',mdrStay:'入离',mdrCharged:'消费',mdrPaid:'已收',ledgerDetails:'逐单明细',reportLedgerNote:'JOVIAN 不提供挂账。未收、多收与押金余款分别列示，不相互抵销；押金在退房或结账时独立结清。'},
 en:{managerDailyReport:"Manager's daily report",guestLedger:'Guest ledger balances',reportDate:'Business date',mdrOpening:'Opening balance',mdrCharges:'Charges today',mdrReceipts:'Net receipts today',mdrClosing:'Closing balance',mdrOpeningNote:'Receivable less received up to the previous business date',mdrChargesNote:'Room, extra and penalty charges earned on this business date',mdrReceiptsNote:'Receipts less refunds on this Malaysian transaction day; deposits excluded',mdrClosingNote:'Receivable less received up to this business date',reportBalances:'Balances and movements',reportChargeBreakdown:'What was charged today',reportReceiptBreakdown:'What was received today',mdrRoom:'Room charges',mdrExtras:'Net extras / discounts',mdrCancellation:'Cancellation penalties',reportFormula:'How this is calculated',reportFormulaText:'Closing balance = opening balance + charges today − net receipts today. Charges follow the business date, receipts follow the Malaysian transaction day, and deposits are listed separately because they are not revenue.',reportReconciled:"Today's charges and receipts rebuild the closing balance; the day reconciles.",reportUnreconciled:"Today's charges and receipts do not rebuild the closing balance; do not report from this page.",reportNoBusinessDate:'No business date is set for this property, so charges can only be placed on their own order dates.',reportComparison:'Compared with last month and last year',reportMonthChange:'Vs last month',reportYearChange:'Vs last year',mdrMetricCharges:'Charges today',mdrMetricReceipts:'Net receipts today',mdrMetricDue:'Closing balance',reportMetrics:'Operating counts',mdrArrivals:'Due to arrive',mdrDepartures:'Due to depart',mdrInHouse:'In house',reportChargeLines:"Today's charge lines",reportManagerNote:'The daily report uses the business date, not the calendar date. Deposits are a liability, not revenue, and charges without a business date belong to no period.',ledgerOutstanding:'Outstanding',ledgerOverpaid:'Overpaid to return',ledgerDepositHeld:'Deposit held',ledgerSettled:'Settled',ledgerBucket:'Bucket',ledgerOrders:'Orders',mdrStay:'Stay',mdrCharged:'Charged',mdrPaid:'Received',ledgerDetails:'Per-order detail',reportLedgerNote:'JOVIAN does not offer charge-to-room. Outstanding, overpaid and deposit amounts are listed separately and never netted against each other; a deposit is settled on its own at checkout.'},
 ms:{managerDailyReport:'Laporan harian pengurus',guestLedger:'Baki lejar tetamu',reportDate:'Tarikh operasi',mdrOpening:'Baki awal',mdrCharges:'Caj hari ini',mdrReceipts:'Terimaan bersih hari ini',mdrClosing:'Baki akhir',mdrOpeningNote:'Belum terima tolak telah terima sehingga tarikh operasi sebelumnya',mdrChargesNote:'Caj bilik, tambahan dan penalti yang diperoleh pada tarikh operasi ini',mdrReceiptsNote:'Terimaan tolak bayaran balik pada hari transaksi Malaysia; deposit dikecualikan',mdrClosingNote:'Belum terima tolak telah terima sehingga tarikh operasi ini',reportBalances:'Baki dan pergerakan',reportChargeBreakdown:'Caj yang dikenakan hari ini',reportReceiptBreakdown:'Terimaan hari ini',mdrRoom:'Caj bilik',mdrExtras:'Tambahan / diskaun bersih',mdrCancellation:'Penalti pembatalan',reportFormula:'Cara pengiraan',reportFormulaText:'Baki akhir = baki awal + caj hari ini − terimaan bersih hari ini. Caj mengikut tarikh operasi, terimaan mengikut hari transaksi Malaysia, dan deposit disenaraikan berasingan kerana bukan hasil.',reportReconciled:'Caj dan terimaan hari ini membina semula baki akhir; hari ini berpadanan.',reportUnreconciled:'Caj dan terimaan hari ini tidak membina semula baki akhir; jangan laporkan daripada halaman ini.',reportNoBusinessDate:'Tiada tarikh operasi ditetapkan untuk hartanah ini, jadi caj hanya boleh diletakkan pada tarikh pesanannya sendiri.',reportComparison:'Perbandingan bulan dan tahun lalu',reportMonthChange:'Lawan bulan lalu',reportYearChange:'Lawan tahun lalu',mdrMetricCharges:'Caj hari ini',mdrMetricReceipts:'Terimaan bersih hari ini',mdrMetricDue:'Baki akhir',reportMetrics:'Petunjuk operasi',mdrArrivals:'Dijangka tiba',mdrDepartures:'Dijangka keluar',mdrInHouse:'Dalam penginapan',reportChargeLines:'Butiran caj hari ini',reportManagerNote:'Laporan harian menggunakan tarikh operasi, bukan tarikh kalendar. Deposit ialah liabiliti, bukan hasil, dan caj tanpa tarikh operasi tidak termasuk dalam mana-mana tempoh.',ledgerOutstanding:'Belum terima',ledgerOverpaid:'Lebih bayar perlu dipulang',ledgerDepositHeld:'Deposit dipegang',ledgerSettled:'Selesai',ledgerBucket:'Kategori',ledgerOrders:'Pesanan',mdrStay:'Penginapan',mdrCharged:'Dikenakan',mdrPaid:'Diterima',ledgerDetails:'Butiran setiap pesanan',reportLedgerNote:'JOVIAN tidak menawarkan caj ke bilik. Amaun belum terima, lebih bayar dan deposit disenaraikan berasingan dan tidak pernah diimbangi antara satu sama lain; deposit diselesaikan sendiri semasa daftar keluar.'}
};
for(const language of Object.keys(managerWords))Object.assign(financialWords[language],managerWords[language]);
const percentOf=value=>value===null||value===undefined?'\u2014':(value*100).toFixed(1)+'%';
const rangeFilter=(date,to,sources,source,t)=>`<div class="order-filters"><label>${esc(t('from'))}<input data-finance-filter="from" type="date" value="${esc(date)}"></label><label>${esc(t('to'))}<input data-finance-filter="to" type="date" value="${esc(to)}"></label><label>${esc(t('source'))}<select data-finance-filter="source">${['all',...sources].map(id=>`<option value="${esc(id)}" ${source===id?'selected':''}>${esc(t(id))}</option>`).join('')}</select></label></div>`;
const crash=title=>content=>`<section class="panel"><h2>${esc(title)}</h2>${content}</section>`;

export function roomChargePage(state,{propertyId,from,to,source='all',sources=[],t,currency}={}){
 const shell=crash(t('roomChargeDetail'));
 try{
  const report=roomChargeDetail(state,{propertyId,from,to,source});
  const rows=report.rows.map(r=>`<tr><td>${esc(r.date)}</td><td><button data-open-stay="${esc(r.orderId)}">${esc(r.guest||r.orderId)}</button></td><td>${esc(r.channelOrderId||'\u2014')}</td><td>${esc(r.roomTypeName||esc(t('unspecified')))}</td><td>${esc(r.resourceLabel||t('unassignedStay'))}</td><td>${esc(t(r.productId))}</td><td>${esc(t(r.source))}</td><td>${esc(r.start)} \u2192 ${esc(r.end)}</td><td>${esc(r.nights)}</td><td>${esc(r.ratePlanId?esc(r.ratePlanId):t('ratePlanNotRecorded'))}</td><td>${esc(currency(r.amount))}</td></tr>`).join('');
  return shell(rangeFilter(from,to,sources,source,t)+`<p>${esc(t('roomChargeNote'))}</p>
   <div class="table-wrap"><table><thead><tr>${['reportDate','guest','channelOrderId','roomType','room','stayType','source','mdrStay','nightCount','ratePlan','amount'].map(h=>`<th>${esc(t(h))}</th>`).join('')}</tr></thead><tbody>${rows||`<tr><td colspan="11">${esc(t('empty'))}</td></tr>`}</tbody></table></div>
   <p><strong>${esc(t('total'))}</strong> ${esc(currency(report.total))} \u00b7 ${esc(t('adr'))} ${esc(currency(report.adr||0))} \u00b7 ${esc(t('nightCount'))} ${esc(report.nightCount)}</p>`);
 }catch(error){return shell(rangeFilter(from,to,sources,source,t)+`<p role="alert">${esc(t(error.message))}</p>`);}
}

export function roomBusinessPage(state,{propertyId,from,to,source='all',sources=[],dimension='date',t,currency}={}){
 const shell=crash(t('roomBusinessSummary'));
 const dimensions=[['date','byDate'],['roomType','byRoomType'],['product','byProduct'],['room','byRoom'],['source','bySource']];
 const picker=`<label>${esc(t('dimension'))}<select data-finance-filter="dimension">${dimensions.map(([id,word])=>`<option value="${esc(id)}" ${dimension===id?'selected':''}>${esc(t(word))}</option>`).join('')}</select></label>`;
 try{
  const report=roomBusinessSummary(state,{propertyId,from,to,source,dimension});
  const unavailable=report.occupancyAvailable?'':`<p role="status">${esc(t('occUnavailable'))}</p>`;
  const head=`<tr><th>${esc(t('compareMetricLabel'))}</th><th>${esc(t('roomRevenue'))}</th><th>${esc(t('nightsSold'))}</th><th>${esc(t('adr'))}</th><th>${esc(t('occ'))}</th><th>${esc(t('revpar'))}</th><th>${esc(t('sellableNights'))}</th></tr>`;
  const totals=`<tfoot><tr><th>${esc(t('total'))}</th><td>${esc(currency(report.totals.revenue))}</td><td>${esc(report.totals.sold)}</td><td>${esc(currency(report.totals.adr||0))}</td><td>${esc(percentOf(report.totals.occ))}</td><td>${esc(currency(report.totals.revpar||0))}</td><td>${esc(report.totals.supplyNights)}</td></tr></tfoot>`;
  const summary=`<h3>${esc(t('reportTotals'))}</h3><div class="table-wrap"><table><thead>${head}</thead><tbody>${report.rows.map(r=>`<tr><th>${esc(t(r.key)||esc(String(r.key)))}</th><td>${esc(currency(r.revenue))}</td><td>${esc(r.totalSold)}</td><td>${esc(currency(r.adr||0))}</td><td>${esc(percentOf(r.occ))}</td><td>${esc(currency(r.revpar||0))}</td><td>${esc(r.supplyNights)}</td></tr>`).join('')}</tbody>${totals}</table></div>`;
  const byProduct=`<h3>${esc(t('byProduct'))}</h3><div class="table-wrap"><table><thead><tr><th>${esc(t('compareMetricLabel'))}</th><th>${esc(t('stayType'))}</th><th>${esc(t('roomRevenue'))}</th><th>${esc(t('nightsSold'))}</th><th>${esc(t('adr'))}</th><th>${esc(t('occ'))}</th><th>${esc(t('revpar'))}</th><th>${esc(t('sellableNights'))}</th></tr></thead><tbody>${report.rows.flatMap(r=>r.byProduct.filter(p=>p.revenue||p.sold||p.unassigned||p.supplyNights).map(p=>`<tr><th>${esc(t(r.key)||esc(String(r.key)))}</th><td>${esc(t(p.productId))}</td><td>${esc(currency(p.revenue))}</td><td>${esc(p.sold+p.unassigned)}</td><td>${esc(currency(p.adr||0))}</td><td>${esc(percentOf(p.occ))}</td><td>${esc(currency(p.revpar||0))}</td><td>${esc(p.supplyNights)}</td></tr>`)).join('')}</tbody></table></div>`;
  return shell(`<div class="order-filters">${rangeFilter(from,to,sources,source,t).replace('<div class="order-filters">','').replace('</div>','')}${picker}</div>
   <p>${esc(t('roomBusinessNote'))}</p>${unavailable}${report.unassignedNights?`<p role="status">${esc(t('unassignedNights'))}: ${esc(report.unassignedNights)}</p>`:''}${summary}${byProduct}`);
 }catch(error){return shell(`<div class="order-filters">${rangeFilter(from,to,sources,source,t).replace('<div class="order-filters">','').replace('</div>','')}${picker}</div><p role="alert">${esc(t(error.message))}</p>`);}
}

export function roomMovementPage(state,{propertyId,from,to,source='all',sources=[],movement='all',t,currency}={}){
 const shell=crash(t('roomMovementLog'));
 try{
  const report=roomMovementLog(state,{propertyId,from,to,source});
  const rows=report.rows.filter(r=>movement==='all'||r.movement===movement);
  const picker=`<label>${esc(t('movementType'))}<select data-finance-filter="movement">${['all',...report.types].map(id=>`<option value="${esc(id)}" ${movement===id?'selected':''}>${esc(t('movement_'+id)||esc(id))}</option>`).join('')}</select></label>`;
  const show=value=>value===null||value===undefined||value===''?'\u2014':esc(value);
  const body=rows.map(r=>`<tr><td>${esc(r.at)}</td><td>${esc(r.actor)}</td><td>${esc(t('movement_'+r.movement)||esc(r.movement))}</td><td><button data-open-stay="${esc(r.orderId)}">${esc(r.guest||r.orderId)}</button></td><td>${esc(t(r.source))}</td><td>${show(r.beforeRoom)} \u2192 ${show(r.afterRoom)}</td><td>${show(r.beforeStart)} \u2192 ${show(r.afterStart)}</td><td>${show(r.beforeEnd)} \u2192 ${show(r.afterEnd)}</td><td>${r.beforeNightly===null?show(null):esc(currency(r.beforeNightly))} \u2192 ${r.afterNightly===null?show(null):esc(currency(r.afterNightly))}</td><td data-movement-charge>${r.beforeCharge==null?show(null):esc(currency(r.beforeCharge))} → ${r.afterCharge==null?show(null):esc(currency(r.afterCharge))}</td><td>${r.penalty===null?show(null):esc(currency(r.penalty))}</td><td>${show(r.reason)}</td></tr>`).join('');
  const counts=`<p>${Object.entries(report.counts).map(([k,n])=>`${esc(t('movement_'+k)||esc(k))} ${esc(n)}`).join(' \u00b7 ')||esc(t('empty'))}</p>`;
  return shell(`<div class="order-filters">${rangeFilter(from,to,sources,source,t).replace('<div class="order-filters">','').replace('</div>','')}${picker}</div>
   <p>${esc(t('roomMovementNote'))}</p>${counts}
   <div class="table-wrap"><table><thead><tr>${['time','createdBy','movementType','guest','source','movementRoom','movementStart','movementEnd','movementNightly','charge','mdrCancellation','reason'].map(h=>`<th>${esc(t(h))}</th>`).join('')}</tr></thead><tbody>${body||`<tr><td colspan="11">${esc(t('empty'))}</td></tr>`}</tbody></table></div>`);
 }catch(error){return shell(rangeFilter(from,to,sources,source,t)+`<p role="alert">${esc(t(error.message))}</p>`);}
}

// Other (non-room) charges. Extras are accommodation only: JOVIAN never posts a
// restaurant bill to a room, so this page never contains one.
export function extraChargePage(state,{propertyId,from,to,source='all',sources=[],t,currency}={}){
 const shell=crash(t('otherChargeDetail'));
 try{
  const report=extraChargeDetail(state,{propertyId,from,to,source});
  const signed=n=>(n<0?'\u2212':'+')+currency(Math.abs(n));
  const table=(headers,rows)=>`<div class="table-wrap"><table><thead><tr>${headers.map(h=>`<th>${esc(t(h))}</th>`).join('')}</tr></thead><tbody>${rows||`<tr><td colspan="${headers.length}">${esc(t('empty'))}</td></tr>`}</tbody></table></div>`;
  const link=r=>`<button data-open-stay="${esc(r.orderId)}">${esc(r.guest||r.orderId)}</button>`;
  const totals=`<div class="table-wrap"><table><tbody>${[['extraChargeTotal',report.totals.charge],['extraDiscountTotal',-report.totals.discount],['extraNet',report.totals.net]].map(([k,v])=>`<tr><th>${esc(t(k))}</th><td>${esc(signed(v))}</td></tr>`).join('')}</tbody></table></div><p>${esc(t('extraCount'))}: ${esc(report.totals.count)}</p>`;
  const byItem=`<h3>${esc(t('extraByItem'))}</h3>${table(['itemName','quantity','extraChargeCount','extraDiscountCount','extraChargeTotal','extraDiscountTotal','extraNet'],
   report.names.map(n=>`<tr><th>${esc(n.name)}</th><td>${esc(n.quantity)}</td><td>${esc(n.chargeCount)}</td><td>${esc(n.discountCount)}</td><td>${esc(currency(n.charge))}</td><td>${esc(currency(n.discount))}</td><td>${esc(currency(n.net))}</td></tr>`).join(''))}`;
  const daily=`<h3>${esc(t('reportDaily'))}</h3>${table(['reportDate','amount'],report.daily.map(d=>`<tr><td>${esc(d.date)}</td><td>${esc(currency(d.amount))}</td></tr>`).join(''))}`;
  const body=report.rows.map(r=>`<tr><td>${esc(r.date)}</td><td>${link(r)}</td><td>${esc(t(r.source))}</td><td>${esc(r.roomTypeName||t('unspecified'))}</td><td>${esc(r.resourceLabel||t('unassignedStay'))}</td><td>${esc(r.name)}</td><td>${esc(t(r.kind==='discount'?'discount':'feeItem'))}</td><td>${esc(r.quantity)}</td><td>${esc(currency(r.unitAmount))}</td><td>${esc(signed(r.amount))}</td></tr>`).join('');
  const detail=`<h3>${esc(t('reportDetails'))}</h3>${table(['reportDate','guest','source','roomType','room','itemName','kind','quantity','unitAmount','amount'],body)}`;
  const superseded=report.superseded?`<p role="status">${esc(t('extraSuperseded'))}: ${esc(report.superseded)}</p><p class="muted">${esc(t('extraSupersededNote'))}</p>`:'';
  const unallocated=report.unallocated.length?`<h3>${esc(t('reportUnallocated'))}</h3>${table(['guest','itemName','amount'],report.unallocated.map(r=>`<tr><td>${link(r)}</td><td>${esc(r.name)}</td><td>${esc(signed(r.amount))}</td></tr>`))}`:'';
  return shell(rangeFilter(from,to,sources,source,t)+`<p>${esc(t('otherChargeNote'))}</p>${totals}${superseded}${byItem}${daily}${detail}${unallocated}`);
 }catch(error){return shell(rangeFilter(from,to,sources,source,t)+`<p role="alert">${esc(t(error.message))}</p>`);}
}

// Cancellation penalties. The policy is only ever shown as the snapshot taken when
// the stay was booked: the moment of cancellation was never stored, so no fee is
// recomputed here and no outcome is claimed.
export function cancellationPenaltyPage(state,{propertyId,from,to,source='all',sources=[],t,currency}={}){
 const shell=crash(t('cancellationPenaltyDetail'));
 try{
  const report=cancellationPenaltyDetail(state,{propertyId,from,to,source});
  const table=(headers,rows)=>`<div class="table-wrap"><table><thead><tr>${headers.map(h=>`<th>${esc(t(h))}</th>`).join('')}</tr></thead><tbody>${rows||`<tr><td colspan="${headers.length}">${esc(t('empty'))}</td></tr>`}</tbody></table></div>`;
  const link=r=>`<button data-open-stay="${esc(r.orderId)}">${esc(r.guest||r.orderId)}</button>`;
  const basisWord=p=>p.basis==='firstNight'?t('policyBasisFirstNight'):p.basis==='total'?t('policyBasisTotal'):'';
  const policyText=p=>{
   if(!p.kind)return esc(t('policyMissing'));
   const percent=p.percent===null?'':(p.percent/100).toFixed(2)+'%';
   const base=basisWord(p);
   if(p.kind==='free')return esc(t('policyFree'));
   if(p.kind==='nonrefundable')return esc(t('policyNonrefundable'));
   if(p.kind==='manual')return esc(t('policyManual'));
   if(p.kind==='partial')return `${esc(t('policyPartial'))} ${esc(percent)} ${esc(base)}`.trim();
   const days=p.days===null?'':p.days+' '+t('policyDays');
   return `${esc(t('policyFlexibleBefore'))} ${esc(days)} ${esc(p.time||'')} · ${esc(percent)} ${esc(base)}`.trim();
  };
  const policyCell=r=>{
   const text=policyText(r.policy);
   const deadline=r.policy.deadline?`<small>${esc(t('penaltyDeadline'))}: ${esc(r.policy.deadline.slice(0,16).replace('T',' '))}</small>`:'';
   return text+deadline;
  };
  const totals=`<div class="table-wrap"><table><tbody>${[['penaltyCount',report.count,'string'],['penaltyTotal',report.total,'money'],['penaltyBooked',report.booked,'money'],['penaltyShare',report.share,'percent']].map(([k,v,kind])=>`<tr><th>${esc(t(k))}</th><td>${kind==='string'?esc(v):kind==='percent'?esc(percentOf(v)):esc(currency(v))}</td></tr>`).join('')}</tbody></table></div>`;
  const bySource=`<h3>${esc(t('penaltyBySource'))}</h3>${table(['source','penaltyCount','penaltyTotal','penaltyBooked'],report.sources.map(s=>`<tr><th>${esc(t(s.source))}</th><td>${esc(s.count)}</td><td>${esc(currency(s.penalty))}</td><td>${esc(currency(s.booked))}</td></tr>`).join(''))}`;
  const body=report.rows.map(r=>`<tr><td>${esc(r.date)}</td><td>${link(r)}</td><td>${esc(t(r.source))}</td><td>${esc(r.roomTypeName||t('unspecified'))}</td><td>${esc(r.start)} \u2192 ${esc(r.end)}</td><td>${esc(r.nights)}</td><td>${esc(currency(r.booked))}</td><td>${esc(currency(r.penalty))}</td><td>${esc(percentOf(r.share))}</td><td>${esc(policyCell(r))}</td><td>${esc(r.reason||'\u2014')}</td><td>${esc(r.actor||'\u2014')}</td><td>${esc(currency(r.received))}</td></tr>`).join('');
  const detail=`<h3>${esc(t('reportDetails'))}</h3>${table(['reportDate','guest','source','roomType','mdrStay','nightCount','penaltyBooked','mdrCancellation','penaltyShare','penaltyPolicy','reason','createdBy','penaltyReceived'],body)}`;
  const unallocated=report.unallocated.length?`<h3>${esc(t('reportUnallocated'))}</h3>${table(['guest','mdrCancellation','penaltyBooked'],report.unallocated.map(r=>`<tr><td>${link(r)}</td><td>${esc(currency(r.penalty))}</td><td>${esc(currency(r.booked))}</td></tr>`))}`:'';
  return shell(rangeFilter(from,to,sources,source,t)+`<p>${esc(t('penaltyNote'))}</p><p class="muted">${esc(t('penaltyPolicyNote'))}</p>${totals}${bySource}${detail}${unallocated}`);
 }catch(error){return shell(rangeFilter(from,to,sources,source,t)+`<p role="alert">${esc(t(error.message))}</p>`);}
}

const accommodationWords={
 zh:{roomChargeDetail:'\u623f\u8d39\u660e\u7ec6',roomBusinessSummary:'\u5ba2\u623f\u8425\u4e1a\u6c47\u603b',roomMovementLog:'\u623f\u95f4\u5f02\u52a8\u8bb0\u5f55',
  stayType:'\u5165\u4f4f\u7c7b\u578b',nightCount:'\u95f4\u591c\u91cf',ratePlan:'\u4ef7\u8ba1\u5212',ratePlanNotRecorded:'\u672a\u8bb0\u5f55',
  roomRevenue:'\u623f\u8d39',nightsSold:'\u51fa\u552e\u95f4\u591c',adr:'ADR',occ:'\u5165\u4f4f\u7387',revpar:'RevPAR',sellableNights:'\u53ef\u552e\u95f4\u591c',
  byDate:'\u6309\u65e5\u671f',byRoomType:'\u6309\u623f\u578b',byProduct:'\u6309\u5165\u4f4f\u7c7b\u578b',byRoom:'\u6309\u623f\u53f7',bySource:'\u6309\u6e20\u9053',
  dimension:'\u7ef4\u5ea6',reportTotals:'\u6c47\u603b',unassignedStay:'\u5f85\u5206\u623f',unassignedNights:'\u672a\u5206\u623f\u95f4\u591c',
  occUnavailable:'\u5e93\u5b58\u4e0d\u5c5e\u4e8e\u4efb\u4f55\u6e20\u9053\uff0c\u6e20\u9053\u7ef4\u5ea6\u65e0\u53ef\u9760\u5206\u6bcd\uff0c\u5165\u4f4f\u7387\u4e0eRevPAR\u4e0d\u4e88\u7ed9\u5b9a\u3002',
  roomChargeNote:'\u6bcf\u4e00\u665a\u6309\u5176\u81ea\u8eab\u4ef7\u683c\u5217\u793a\uff1b\u53d6\u6d88\u8fdd\u7ea6\u91d1\u4e0d\u7b97\u623f\u8d39\uff0c\u5386\u53f2\u8ba2\u5355\u672a\u7ed1\u5b9a\u4ef7\u8ba1\u5212\u65f6\u5982\u5b9e\u663e\u793a\u672a\u8bb0\u5f55\u3002',
  roomBusinessNote:'\u623f\u3001\u5957\u4e0e\u5e8a\u5206\u522b\u8ba1\u7b97\u3002\u5957\u623f\u552e\u51fa\u540e\u5176\u7ec4\u6210\u623f\u95f4\u4e0e\u5e8a\u4f4d\u5f53\u665a\u4e0d\u518d\u5355\u72ec\u53ef\u552e\uff0c\u4e0d\u91cd\u590d\u8ba1\u5165\u3002',
  movementType:'\u5f02\u52a8\u7c7b\u578b',movementRoom:'\u524d\u540e\u623f\u95f4',movementStart:'\u5165\u4f4f\u65e5',movementEnd:'\u79bb\u5e97\u65e5',movementNightly:'\u524d\u540e\u623f\u4ef7',
  roomMovementNote:'\u5f02\u52a8\u8bb0\u5f55\u4fdd\u7559\u64cd\u4f5c\u4eba\u4e0e\u524d\u540e\u72b6\u6001\uff1b\u63d0\u524d\u6216\u5ef6\u8fdf\u9000\u623f\u3001\u6362\u623f\u3001\u53d6\u6d88\u5747\u5355\u72ec\u5206\u7c7b\u3002',
  movement_early_departure:'\u63d0\u524d\u9000\u623f',movement_late_departure:'\u5ef6\u8fdf\u9000\u623f',movement_date_change:'\u6539\u671f',movement_price_change:'\u6539\u4ef7',movement_room_change:'\u5728\u4f4f\u6362\u623f',
  movement_assign:'\u5206\u623f',movement_edit:'\u7f16\u8f91',movement_cancel:'\u53d6\u6d88',movement_checkin:'\u5165\u4f4f',movement_checkout:'\u9000\u623f',movement_lock:'\u9501\u5b9a',
  movement_boxed:'\u79fb\u5165\u76d2\u5b50',movement_restored:'\u6062\u590d\u5e93\u5b58',movement_create:'\u65b0\u5efa',movement_all:'\u5168\u90e8'},
 en:{roomChargeDetail:'Room charge detail',roomBusinessSummary:'Room business summary',roomMovementLog:'Room movement log',
  stayType:'Stay type',nightCount:'Room-nights',ratePlan:'Rate plan',ratePlanNotRecorded:'Not recorded',
  roomRevenue:'Room revenue',nightsSold:'Room-nights sold',adr:'ADR',occ:'Occupancy',revpar:'RevPAR',sellableNights:'Sellable room-nights',
  byDate:'By date',byRoomType:'By room type',byProduct:'By stay type',byRoom:'By unit',bySource:'By channel',
  dimension:'Dimension',reportTotals:'Summary',unassignedStay:'Unassigned',unassignedNights:'Unassigned room-nights',
  occUnavailable:'Inventory is not owned by any channel, so no reliable denominator exists for the channel view; occupancy and RevPAR are not given.',
  roomChargeNote:'Every night is listed at its own rate. Cancellation penalties are not room revenue, and orders made before rate plans were linked show as not recorded rather than being guessed.',
  roomBusinessNote:'Rooms, suites and beds are counted separately. Once a suite is sold, the rooms and beds inside it cannot be sold separately that night and are not counted twice.',
  movementType:'Movement',movementRoom:'Unit before / after',movementStart:'Arrival',movementEnd:'Departure',movementNightly:'Rate before / after',
  roomMovementNote:'Each movement keeps who made it and the state before and after. Early or late departure, room changes and cancellations are classified separately.',
  movement_early_departure:'Early departure',movement_late_departure:'Late departure',movement_date_change:'Date change',movement_price_change:'Price change',movement_room_change:'Room change',
  movement_assign:'Assign',movement_edit:'Edit',movement_cancel:'Cancel',movement_checkin:'Check in',movement_checkout:'Check out',movement_lock:'Lock',
  movement_boxed:'Boxed',movement_restored:'Restored',movement_create:'Create',movement_all:'All'},
 ms:{roomChargeDetail:'Butiran caj bilik',roomBusinessSummary:'Ringkasan perniagaan bilik',roomMovementLog:'Log pergerakan bilik',
  stayType:'Jenis penginapan',nightCount:'Malam bilik',ratePlan:'Pelan kadar',ratePlanNotRecorded:'Tidak direkod',
  roomRevenue:'Hasil bilik',nightsSold:'Malam bilik terjual',adr:'ADR',occ:'Kadar penghunian',revpar:'RevPAR',sellableNights:'Malam bilik boleh dijual',
  byDate:'Mengikut tarikh',byRoomType:'Mengikut jenis bilik',byProduct:'Mengikut jenis penginapan',byRoom:'Mengikut unit',bySource:'Mengikut saluran',
  dimension:'Dimensi',reportTotals:'Ringkasan',unassignedStay:'Belum ditetapkan',unassignedNights:'Malam bilik belum ditetapkan',
  occUnavailable:'Inventori tidak dimiliki mana-mana saluran, jadi tiada penyebut yang boleh dipercayai untuk paparan saluran; kadar penghunian dan RevPAR tidak diberikan.',
  roomChargeNote:'Setiap malam disenaraikan pada kadarnya sendiri. Penalti pembatalan bukan hasil bilik, dan pesanan sebelum pelan kadar dipautkan ditunjukkan sebagai tidak direkod.',
  roomBusinessNote:'Bilik, suite dan katil dikira berasingan. Setelah suite terjual, bilik dan katil di dalamnya tidak boleh dijual berasingan pada malam itu dan tidak dikira dua kali.',
  movementType:'Pergerakan',movementRoom:'Unit sebelum / selepas',movementStart:'Ketibaan',movementEnd:'Pelepasan',movementNightly:'Kadar sebelum / selepas',
  roomMovementNote:'Setiap pergerakan menyimpan siapa yang melakukannya dan keadaan sebelum serta selepas. Pelepasan awal atau lewat, pertukaran bilik dan pembatalan dikelaskan berasingan.',
  movement_early_departure:'Keluar awal',movement_late_departure:'Keluar lewat',movement_date_change:'Tukar tarikh',movement_price_change:'Tukar harga',movement_room_change:'Tukar bilik',
  movement_assign:'Tetapkan',movement_edit:'Sunting',movement_cancel:'Batal',movement_checkin:'Daftar masuk',movement_checkout:'Daftar keluar',movement_lock:'Kunci',
  movement_boxed:'Dalam kotak',movement_restored:'Dipulihkan',movement_create:'Cipta',movement_all:'Semua'}
};
for(const language of Object.keys(accommodationWords))Object.assign(financialWords[language],accommodationWords[language]);

// Other charges and cancellation penalties. Both pages state what they refuse to do:
// no restaurant posting, no invented policy outcome, no convenient posting date.
const penaltyWords={
 zh:{roomType:'\u623f\u578b',otherChargeDetail:'\u5ba2\u623f\u5176\u4ed6\u6d88\u8d39\u660e\u7ec6',cancellationPenaltyDetail:'\u5ba2\u623f\u8fdd\u7ea6\u91d1\u660e\u7ec6',
  otherChargeNote:'\u4ec5\u5217\u4f4f\u5bbf\u9644\u52a0\u8d39\u4e0e\u4f18\u60e0\uff0c\u5404\u81ea\u6309\u5176\u8425\u4e1a\u65e5\u5f52\u5c5e\uff1b\u9910\u996e\u4e0d\u6302\u8d26\u3002\u4f18\u60e0\u4ee5\u8d1f\u6570\u5355\u72ec\u5217\u793a\uff0c\u4e0d\u5148\u6297\u9500\u540e\u518d\u5c55\u793a\u3002',
  extraChargeTotal:'\u9644\u52a0\u8d39\u5408\u8ba1',extraDiscountTotal:'\u4f18\u60e0\u5408\u8ba1',extraNet:'\u51c0\u989d',extraCount:'\u7b14\u6570',
  extraByItem:'\u6309\u9879\u76ee\u6c47\u603b',extraChargeCount:'\u6536\u8d39\u7b14\u6570',extraDiscountCount:'\u4f18\u60e0\u7b14\u6570',
  extraSuperseded:'\u5df2\u88ab\u6700\u7ec8\u8d39\u7528\u53d6\u4ee3\u7684\u8ba2\u5355',
  extraSupersededNote:'\u5df2\u53d6\u6d88\u6216\u5df2\u586b\u5199\u6700\u7ec8\u8d39\u7528\u7684\u8ba2\u5355\uff0c\u5176\u9644\u52a0\u8d39\u4e0d\u518d\u5355\u72ec\u8ba1\u8d39\uff0c\u56e0\u6b64\u4e0d\u8ba1\u5165\u672c\u8868\uff0c\u907f\u514d\u540c\u4e00\u7b14\u4f4f\u5bbf\u91cd\u590d\u8ba1\u7b97\u3002',
  penaltyNote:'\u8fdd\u7ea6\u91d1\u5f52\u5c5e\u53d6\u6d88\u53d1\u751f\u5f53\u65e5\u7684\u8425\u4e1a\u65e5\uff1b\u5b83\u4e0d\u662f\u623f\u8d39\uff0c\u4e5f\u4e0d\u4e0e\u5176\u4ed6\u8425\u4e1a\u65e5\u6df7\u5217\u3002\u7f3a\u5c11\u53d6\u6d88\u8425\u4e1a\u65e5\u7684\u8bb0\u5f55\u5355\u72ec\u5217\u793a\uff0c\u4e0d\u63a8\u5b9a\u5f52\u5c5e\u3002',
  penaltyPolicyNote:'\u653f\u7b56\u4e3a\u4e0b\u5355\u65f6\u7684\u5feb\u7167\uff0c\u4ec5\u4f9b\u53c2\u8003\uff1b\u7cfb\u7edf\u672a\u8bb0\u5f55\u53d6\u6d88\u65f6\u523b\uff0c\u56e0\u6b64\u4e0d\u91cd\u7b97\u5e94\u6536\u8d39\u7528\uff0c\u4e5f\u4e0d\u58f0\u79f0\u653f\u7b56\u5df2\u81ea\u52a8\u6267\u884c\u3002',
  penaltyCount:'\u7b14\u6570',penaltyTotal:'\u8fdd\u7ea6\u91d1\u5408\u8ba1',penaltyBooked:'\u539f\u8ba2\u5355\u91d1\u989d',penaltyShare:'\u5360\u539f\u8ba2\u5355\u6bd4',
  penaltyPolicy:'\u53d6\u6d88\u653f\u7b56',penaltyReceived:'\u8be5\u5355\u5df2\u6536',penaltyBySource:'\u6309\u6e20\u9053\u6c47\u603b',penaltyDeadline:'\u514d\u8d39\u622a\u6b62',
  policyMissing:'\u672a\u8bb0\u5f55\u653f\u7b56',policyFree:'\u514d\u8d39\u53d6\u6d88',policyNonrefundable:'\u4e0d\u53ef\u9000\u6b3e',policyPartial:'\u90e8\u5206\u6536\u8d39',
  policyManual:'\u4eba\u5de5\u6838\u5b9a',policyFlexibleBefore:'\u5165\u4f4f\u524d',policyDays:'\u5929',policyBasisTotal:'\u6309\u603b\u623f\u8d39',policyBasisFirstNight:'\u6309\u9996\u665a\u623f\u8d39'},
 en:{roomType:'Room type',otherChargeDetail:'Other charge detail',cancellationPenaltyDetail:'Cancellation penalty detail',
  otherChargeNote:'Accommodation extras and discounts only, each placed on its own business date; restaurant charges are never posted to a room. Discounts are listed as negative lines and are not netted away before display.',
  extraChargeTotal:'Extras total',extraDiscountTotal:'Discounts total',extraNet:'Net',extraCount:'Lines',
  extraByItem:'By item',extraChargeCount:'Charge lines',extraDiscountCount:'Discount lines',
  extraSuperseded:'Bookings replaced by a final charge',
  extraSupersededNote:'Once a stay is cancelled or carries a final charge its extras are no longer billed separately, so they are left out here rather than charging the same stay twice.',
  penaltyNote:'A penalty belongs to the business date the cancellation happened on. It is not room revenue and is never mixed into another day. A penalty with no business date is listed separately instead of being assigned to a convenient day.',
  penaltyPolicyNote:'The policy is the snapshot taken when the stay was booked. The moment of cancellation was never recorded, so no fee is recomputed and no automatic policy outcome is claimed.',
  penaltyCount:'Bookings',penaltyTotal:'Penalties total',penaltyBooked:'Value booked',penaltyShare:'Share of booking',
  penaltyPolicy:'Cancellation policy',penaltyReceived:'Already received',penaltyBySource:'By channel',penaltyDeadline:'Free until',
  policyMissing:'No policy recorded',policyFree:'Free cancellation',policyNonrefundable:'Non-refundable',policyPartial:'Partial charge',
  policyManual:'Manually confirmed',policyFlexibleBefore:'Before arrival',policyDays:'days',policyBasisTotal:'of total room charges',policyBasisFirstNight:'of the first night'},
 ms:{roomType:'Jenis bilik',otherChargeDetail:'Butiran caj lain',cancellationPenaltyDetail:'Butiran penalti pembatalan',
  otherChargeNote:'Caj tambahan dan diskaun penginapan sahaja, setiap satu pada tarikh operasinya; caj restoran tidak pernah diposkan ke bilik. Diskaun disenaraikan sebagai baris negatif dan tidak ditolak sebelum dipaparkan.',
  extraChargeTotal:'Jumlah caj tambahan',extraDiscountTotal:'Jumlah diskaun',extraNet:'Bersih',extraCount:'Baris',
  extraByItem:'Mengikut item',extraChargeCount:'Baris caj',extraDiscountCount:'Baris diskaun',
  extraSuperseded:'Tempahan yang diganti oleh caj akhir',
  extraSupersededNote:'Sebaik penginapan dibatalkan atau mempunyai caj akhir, caj tambahannya tidak lagi dibilkan berasingan, jadi ia dikecualikan di sini supaya penginapan sama tidak dikira dua kali.',
  penaltyNote:'Penalti milik tarikh operasi semasa pembatalan berlaku. Ia bukan hasil bilik dan tidak dicampur ke hari lain. Penalti tanpa tarikh operasi disenaraikan berasingan, bukan diberikan tarikh yang mudah.',
  penaltyPolicyNote:'Polisi ialah syot tangkap semasa tempahan dibuat. Masa pembatalan tidak direkodkan, jadi tiada caj dikira semula dan tiada keputusan polisi automatik didakwa.',
  penaltyCount:'Tempahan',penaltyTotal:'Jumlah penalti',penaltyBooked:'Nilai ditempah',penaltyShare:'Bahagian daripada tempahan',
  penaltyPolicy:'Polisi pembatalan',penaltyReceived:'Sudah diterima',penaltyBySource:'Mengikut saluran',penaltyDeadline:'Percuma sehingga',
  policyMissing:'Polisi tidak direkod',policyFree:'Pembatalan percuma',policyNonrefundable:'Tidak boleh dipulangkan',policyPartial:'Caj sebahagian',
  policyManual:'Disahkan manual',policyFlexibleBefore:'Sebelum ketibaan',policyDays:'hari',policyBasisTotal:'daripada jumlah caj bilik',policyBasisFirstNight:'daripada malam pertama'}
};
// Occupants, registration completeness and channel commission. Identity documents
// stay encrypted on the server and are never decrypted into a report, so
// "registered" can only mean a name was written down. And no commission has ever
// been recorded anywhere in the system, so the commission page shows what the
// channel booking was worth and leaves the commission column empty.
export function roomOccupantPage(state,{propertyId,from,to,source='all',sources=[],basis='arrival',t,currency}={}){
 const shell=crash(t('roomOccupantDetail'));
 const picker=`<label>${esc(t('occupantBasis'))}<select data-finance-filter="basis">${[['arrival','basisArrival'],['overlap','basisOverlap']].map(([id,word])=>`<option value="${esc(id)}" ${basis===id?'selected':''}>${esc(t(word))}</option>`).join('')}</select></label>`;
 const filters=`<div class="order-filters">${rangeFilter(from,to,sources,source,t).replace('<div class="order-filters">','').replace('</div>','')}${picker}</div>`;
 try{
  const report=roomOccupantDetail(state,{propertyId,from,to,source},{basis});
  const table=(headers,rows)=>`<div class="table-wrap"><table><thead><tr>${headers.map(h=>`<th>${esc(t(h))}</th>`).join('')}</tr></thead><tbody>${rows||`<tr><td colspan="${headers.length}">${esc(t('empty'))}</td></tr>`}</tbody></table></div>`;
  const link=r=>`<button data-open-stay="${esc(r.orderId)}">${esc(r.guest||r.orderId)}</button>`;
  const name=r=>r.occupant?esc(r.occupant):`<em>${esc(t('occupantUnnamed'))}</em>`;
  const totals=`<div class="table-wrap"><table><tbody>${[['occupantPeople',report.totals.people],['occupantStays',report.totals.stays],['nightCount',report.totals.nights],['occupantUnnamedCount',report.totals.unnamed]].map(([k,v])=>`<tr><th>${esc(t(k))}</th><td>${esc(v)}</td></tr>`).join('')}</tbody></table></div>`;
  const byType=`<h3>${esc(t('byRoomType'))}</h3>${table(['roomType','occupantPeople','occupantStays'],
   report.roomTypes.map(r=>`<tr><th>${esc(r.roomTypeName||t('unspecified'))}</th><td>${esc(r.people)}</td><td>${esc(r.stays)}</td></tr>`).join(''))}`;
  const byGender=`<h3>${esc(t('occupantByGender'))}</h3>${table(['occupantGender','occupantPeople'],
   report.genders.map(g=>`<tr><th>${esc(t('gender_'+g.gender)||esc(g.gender))}</th><td>${esc(g.people)}</td></tr>`).join(''))}`;
  const daily=`<h3>${esc(t('reportDaily'))}</h3>${table(['reportDate','occupantPeople'],report.daily.map(d=>`<tr><td>${esc(d.date)}</td><td>${esc(d.people)}</td></tr>`).join(''))}`;
  const body=report.rows.map(r=>`<tr><td>${esc(r.date)}</td><td>${link(r)}</td><td>${name(r)}</td><td>${esc(t('gender_'+r.gender)||esc(r.gender))}</td><td>${esc(r.roomTypeName||t('unspecified'))}</td><td>${esc(r.resourceLabel||t('unassignedStay'))}</td><td>${esc(t(r.stayType))}</td><td>${esc(t(r.source))}</td><td>${esc(r.start)} \u2192 ${esc(r.end)}</td><td>${esc(r.nights)}</td><td>${esc(r.party)}</td><td>${esc(t('status_'+r.status)||esc(r.status))}</td></tr>`).join('');
  const detail=`<h3>${esc(t('reportDetails'))}</h3>${table(['reportDate','guest','occupantName','occupantGender','roomType','room','stayType','source','mdrStay','nightCount','occupantParty','stayStatus'],body)}`;
  return shell(filters+`<p>${esc(t('occupantNote'))}</p>${totals}${byType}${byGender}${daily}${detail}`);
 }catch(error){return shell(filters+`<p role="alert">${esc(t(error.message))}</p>`);}
}

export function registrationRecordPage(state,{propertyId,from,to,source='all',sources=[],basis='arrival',t,currency}={}){
 const shell=crash(t('registrationRecord'));
 const picker=`<label>${esc(t('occupantBasis'))}<select data-finance-filter="basis">${[['arrival','basisArrival'],['overlap','basisOverlap']].map(([id,word])=>`<option value="${esc(id)}" ${basis===id?'selected':''}>${esc(t(word))}</option>`).join('')}</select></label>`;
 const filters=`<div class="order-filters">${rangeFilter(from,to,sources,source,t).replace('<div class="order-filters">','').replace('</div>','')}${picker}</div>`;
 try{
  const report=registrationRecord(state,{propertyId,from,to,source},{basis});
  const table=(headers,rows)=>`<div class="table-wrap"><table><thead><tr>${headers.map(h=>`<th>${esc(t(h))}</th>`).join('')}</tr></thead><tbody>${rows||`<tr><td colspan="${headers.length}">${esc(t('empty'))}</td></tr>`}</tbody></table></div>`;
  const link=r=>`<button data-open-stay="${esc(r.orderId)}">${esc(r.guest||r.orderId)}</button>`;
  const totals=`<div class="table-wrap"><table><tbody>${[['regStays',report.totals.stays],['regExpected',report.totals.expected],['regRegistered',report.totals.registered],['regMissing',report.totals.missing],['regIncomplete',report.totals.incomplete],['regUnassigned',report.totals.unassigned]].map(([k,v])=>`<tr><th>${esc(t(k))}</th><td>${esc(v)}</td></tr>`).join('')}</tbody></table></div>`;
  const body=report.rows.map(r=>`<tr><td>${esc(r.date)}</td><td>${link(r)}</td><td>${esc(t(r.source))}</td><td>${esc(r.roomTypeName||t('unspecified'))}</td><td>${esc(r.resourceLabel||t('unassignedStay'))}</td><td>${esc(r.start)} \u2192 ${esc(r.end)}</td><td>${esc(r.expected)}</td><td>${esc(r.registered)}</td><td>${r.missing?`<strong>${esc(r.missing)}</strong>`:'0'}</td><td>${esc(t(r.complete?'regComplete':'regIncompleteRow'))}</td><td>${esc(t(r.assigned?'roomAssigned':'unassignedStay'))}</td><td>${esc(t('status_'+r.status)||esc(r.status))}</td></tr>`).join('');
  const detail=`<h3>${esc(t('reportDetails'))}</h3>${table(['reportDate','guest','source','roomType','room','mdrStay','regExpected','regRegistered','regMissing','regState','regAssigned','stayStatus'],body)}`;
  return shell(filters+`<p>${esc(t('registrationNote'))}</p><p class="muted">${esc(t('registrationPrivacyNote'))}</p>${totals}${detail}`);
 }catch(error){return shell(filters+`<p role="alert">${esc(t(error.message))}</p>`);}
}

export function commissionPage(state,{propertyId,from,to,source='all',sources=[],t,currency,can=()=>false}={}){
 const shell=crash(t('commissionDetail'));
 try{
  const report=commissionDetail(state,{propertyId,from,to,source});
  const table=(headers,rows)=>`<div class="table-wrap"><table><thead><tr>${headers.map(h=>`<th>${esc(t(h))}</th>`).join('')}</tr></thead><tbody>${rows||`<tr><td colspan="${headers.length}">${esc(t('empty'))}</td></tr>`}</tbody></table></div>`;
  const link=r=>`<button data-open-stay="${esc(r.orderId)}">${esc(r.guest||r.orderId)}</button>`;
  const blank=`<em>${esc(t('commissionNotRecorded'))}</em>`;
  const stateLabel=r=>r.settlement==='settled'?t('commissionSettled'):r.settlement==='recorded'?t('commissionRecorded'):t('commissionNotRecorded');
  const amountCell=r=>r.commission===null?blank:`<span>${esc(currency(r.commission))}</span><small>${esc(r.commissionReference||'')}</small>${r.commissionPeriod?' <small>'+esc(t('commissionMonth'))+' · '+esc(r.commissionPeriod)+'</small>':''}`;
  const totals=`<div class="table-wrap"><table><tbody>${[['commissionOrders',report.totals.orders,'count'],['nightCount',report.totals.nights,'count'],['roomRevenue',report.totals.room,'money'],['commissionCharged',report.totals.charge,'money'],['commissionPaid',report.totals.paid,'money'],['ledgerOutstanding',report.totals.outstanding,'money'],['commissionAmount',report.totals.commission,'money']].map(([k,v,kind])=>`<tr><th>${esc(t(k))}</th><td>${v===null?blank:kind==='count'?esc(v):esc(currency(v))}</td></tr>`).join('')}</tbody></table></div>`;
  const byChannel=`<h3>${esc(t('commissionByChannel'))}</h3>${table(['source','commissionOrders','nightCount','roomRevenue','commissionCharged','commissionPaid','ledgerOutstanding','commissionAmount'],
   report.channels.map(c=>`<tr><th>${esc(t(c.source))}</th><td>${esc(c.orders)}</td><td>${esc(c.nights)}</td><td>${esc(currency(c.room))}</td><td>${esc(currency(c.charge))}</td><td>${esc(currency(c.paid))}</td><td>${esc(currency(c.outstanding))}</td><td>${c.commission===null?blank:esc(currency(c.commission))}${c.unrecorded?`<small>${esc(t('commissionUnrecordedCount'))}: ${esc(c.unrecorded)}</small>`:''}</td></tr>`).join(''))}`;
  const body=report.rows.map(r=>`<tr><td>${esc(r.start)}</td><td>${esc(t(r.source))}</td><td>${esc(r.channelOrderId||'\u2014')}</td><td>${link(r)}</td><td>${esc(r.roomTypeName||t('unspecified'))}</td><td>${esc(r.resourceLabel||t('unassignedStay'))}</td><td>${esc(r.start)} \u2192 ${esc(r.end)}</td><td>${esc(r.nights)}</td><td>${esc(currency(r.room))}</td><td>${esc(currency(r.extras))}</td><td>${esc(currency(r.penalty))}</td><td>${esc(currency(r.charge))}</td><td>${esc(currency(r.paid))}</td><td>${esc(currency(r.outstanding))}</td><td>${amountCell(r)}</td><td>${esc(stateLabel(r))}</td></tr>`).join('');
  const detail=`<h3>${esc(t('reportDetails'))}</h3>${table(['reportDate','source','channelOrderId','guest','roomType','room','mdrStay','nightCount','roomRevenue','mdrExtras','mdrCancellation','commissionCharged','commissionPaid','ledgerOutstanding','commissionAmount','commissionSettlement'],body)}`;
  const closed=(state.commissionPeriods||[]).filter(row=>row.propertyId===propertyId).at(-1);
  const candidates=(state.orders||[]).filter(o=>o.propertyId===propertyId&&o.status!=='cancelled'&&!(closed&&o.commission&&commissionPeriod(o.commission)<=closed.month))
    .sort((a,b)=>String(b.start||'').localeCompare(String(a.start||''))).slice(0,200);
  const options=candidates.map(o=>`<option value="${esc(o.id)}">${esc(o.guest||o.id)} · ${esc(o.start||'')} · ${esc(o.id)}</option>`).join('');
  const editor=can('commission_save')
    ? `<details><summary>${esc(t('commissionRecordTitle'))}</summary><form id="commission-form" class="commission-form"><label>${esc(t('commissionOrder'))}<select name="orderId" required>${options}</select></label><label>${esc(t('commissionAmountInput'))}<input name="amount" type="number" min="0" max="1000000" step="0.01" required></label><label>${esc(t('commissionReference'))}<input name="reference" maxlength="100" required></label><label>${esc(t('commissionNoteInput'))}<input name="note" maxlength="500"></label><label class="check-label"><input type="checkbox" name="settled">${esc(t('commissionSettled'))}</label><p class="muted">${esc(t('commissionRateNote'))}</p><button class="primary" ${candidates.length?'':'disabled'}>${esc(t('commissionSave'))}</button></form></details>`
    : `<p class="muted">${esc(t('commissionReadOnly'))}</p>`;
  const unallocated=report.unallocated?`<p role="status">${esc(t('commissionUnallocated'))}: ${esc(currency(report.unallocated))}</p>`:'';
  // The durable audit already keeps the before/after of every commission change,
  // but the page could never read it. Show the recent append-only history here so a
  // correction stays visible instead of overwriting the only number on the order.
  const historyRows=(state.audit||[]).filter(a=>a.type==='commission_save'&&(!a.propertyId||a.propertyId===propertyId)).slice(0,50);
  const commissionCell=c=>c===null||c===undefined
    ?`<em>${esc(t('commissionNotRecorded'))}</em>`
    :`<span>${esc(currency(c.amount))}</span><small>${esc(c.reference||'')} · ${esc(c.settledAt?t('commissionSettled'):t('commissionRecorded'))}</small>`;
  const history=`<h3>${esc(t('commissionHistory'))}</h3><p class="muted">${esc(t('commissionHistoryNote'))}</p>${historyRows.length
    ?table(['commissionHistoryAt','commissionHistoryActor','commissionHistoryBooking','commissionHistoryBefore','commissionHistoryAfter'],
      historyRows.map(a=>`<tr><td>${esc(a.at||'')}</td><td>${esc(a.actor||'')}</td><td>${esc((state.orders||[]).find(o=>o.id===a.orderId)?.guest||a.orderId||'')}</td><td>${commissionCell(a.commissionChange?.before)}</td><td>${commissionCell(a.commissionChange?.after)}</td></tr>`).join(''))
    :`<p class="muted">${esc(t('commissionHistoryEmpty'))}</p>`}`;
  return shell(rangeFilter(from,to,sources,source,t)+`<p role="status">${esc(t('commissionNote'))}</p><p class="muted">${esc(t('commissionNoteDetail'))}</p>${editor}${totals}${byChannel}${detail}${history}${unallocated}`);
 }catch(error){return shell(rangeFilter(from,to,sources,source,t)+`<p role="alert">${esc(t(error.message))}</p>`);}
}

const occupantWords={
 zh:{roomOccupantDetail:'房间入住人明细',registrationRecord:'入住登记记录',commissionDetail:'佣金明细',
  occupantBasis:'归属口径',basisArrival:'按到店日',basisOverlap:'期内任一晚在住',
  occupantName:'入住人姓名',occupantGender:'性别',occupantParty:'同行人数',occupantPeople:'人数',occupantStays:'住宿笔数',
  occupantUnnamed:'未填写姓名',occupantUnnamedCount:'缺姓名人数',occupantByGender:'按性别',
  gender_female:'女',gender_male:'男',gender_any:'不限／未记录',
  stayStatus:'订单状态',status_reserved:'预订',status_confirmed:'已确认',status_checked_in:'在住',status_checked_out:'已退房',status_cancelled:'已取消',
  occupantNote:'按订单自带的到店日归属，不是营业日；取消的订单没有实际入住人，不列入。房间未分房时如实显示待分房。',
  regStays:'住宿笔数',regExpected:'应登记人数',regRegistered:'已登记姓名',regMissing:'缺姓名',regIncomplete:'不完整单数',
  regUnassigned:'未分房单数',regState:'登记状态',regAssigned:'房间',regComplete:'姓名齐备',regIncompleteRow:'待补全',
  roomAssigned:'已分房',
  registrationNote:'本页只核对订单自带的入住人姓名是否齐备，并按到店日归属。',
  registrationPrivacyNote:'身份证件资料以加密形式保存在服务端，审核状态也在自助入住审核页；本报表不解密、不导出、不显示证件号。',
  commissionOrders:'订单数',commissionCharged:'账单合计',commissionPaid:'已收',commissionAmount:'佣金金额',
  commissionNotRecorded:'未记录',commissionSettlement:'结算状态',commissionByChannel:'按渠道汇总',
  commissionUnallocated:'无营业日的费用（不计入合计）',
  commissionNote:'渠道佣金由财务按渠道账单人工录入；系统不配置佣金率，也不按房价推算佣金。',
  commissionNoteDetail:'下表列出每笔渠道订单的房费、附加费、违约金与已收金额，供与渠道账单核对。未录入佣金的订单仍显示未记录，不会打印 0；已录入的显示账单实际金额与结算状态。',
  commissionRecordTitle:'录入渠道佣金',commissionOrder:'订单',commissionAmountInput:'佣金金额（MYR）',commissionReference:'渠道账单号',commissionNoteInput:'备注',commissionSave:'保存佣金',commissionSettled:'已结算',commissionRecorded:'已录入待结算',commissionReadOnly:'只有财务或管理员可以录入渠道佣金。',commissionRateNote:'请填写渠道账单上的实际佣金金额，不要填估算值；录入会记入审计，可更正。',commissionUnrecordedCount:'未录入',commissionHistory:'佣金录入与更正历史',commissionHistoryNote:'以下记录来自不可修改的操作审计，按时间倒序显示本门店最近 50 条。每次录入或更正都同时保留变更前与变更后的金额、账单号和结算状态；此页只做展示，不会改动账务。',commissionHistoryAt:'时间',commissionHistoryActor:'操作人',commissionHistoryBooking:'订单',commissionHistoryBefore:'变更前',commissionHistoryAfter:'变更后',commissionHistoryEmpty:'本门店还没有佣金录入或更正记录。'},
 en:{roomOccupantDetail:'Room occupant detail',registrationRecord:'Registration record',commissionDetail:'Commission detail',
  occupantBasis:'Placement',basisArrival:'By arrival date',basisOverlap:'Any night in the period',
  occupantName:'Occupant',occupantGender:'Gender',occupantParty:'Party size',occupantPeople:'People',occupantStays:'Stays',
  occupantUnnamed:'No name entered',occupantUnnamedCount:'People with no name',occupantByGender:'By gender',
  gender_female:'Female',gender_male:'Male',gender_any:'Any / not recorded',
  stayStatus:'Booking status',status_reserved:'Reserved',status_confirmed:'Confirmed',status_checked_in:'In house',status_checked_out:'Checked out',status_cancelled:'Cancelled',
  occupantNote:'Placed on the arrival date the booking carries, not on a business date. A cancelled booking has nobody in the room and is left out. An unassigned room says so.',
  regStays:'Stays',regExpected:'Occupants expected',regRegistered:'Names entered',regMissing:'Names missing',regIncomplete:'Incomplete stays',
  regUnassigned:'Stays with no room',regState:'Registration',regAssigned:'Room',regComplete:'Names complete',regIncompleteRow:'Names to complete',
  roomAssigned:'Assigned',
  registrationNote:'This page only checks whether the names carried on the booking are complete, and places each stay on its arrival date.',
  registrationPrivacyNote:'Identity documents stay encrypted on the server and the review state lives on the self-check-in review page. This report never decrypts, exports or shows a document number.',
  commissionOrders:'Bookings',commissionCharged:'Billed',commissionPaid:'Received',commissionAmount:'Commission',
  commissionNotRecorded:'Not recorded',commissionSettlement:'Settlement',commissionByChannel:'By channel',
  commissionUnallocated:'Charges without a business date (excluded from totals)',
  commissionNote:'Finance records the commission the channel actually billed. No rate is configured and none is inferred from the room price.',
  commissionNoteDetail:'What follows is what each channel booking was worth and what was received on it, for reconciling a channel invoice. Bookings with no recorded commission still say not recorded rather than printing 0; recorded ones show the invoiced amount and settlement state.',
  commissionRecordTitle:'Record a channel commission',commissionOrder:'Booking',commissionAmountInput:'Commission (MYR)',commissionReference:'Channel invoice reference',commissionNoteInput:'Note',commissionSave:'Save commission',commissionSettled:'Settled',commissionRecorded:'Recorded, not settled',commissionReadOnly:'Only finance or an administrator can record a channel commission.',commissionRateNote:'Enter the amount on the channel invoice, never an estimate. Recording is audited and can be corrected.',commissionUnrecordedCount:'Not recorded',commissionHistory:'Commission entry and correction history',commissionHistoryNote:'These rows come from the append-only audit, newest first, up to the last 50 entries for this property. Every entry keeps the amount, invoice reference and settlement state both before and after the change. This page only displays them; it never changes the books.',commissionHistoryAt:'When',commissionHistoryActor:'By',commissionHistoryBooking:'Booking',commissionHistoryBefore:'Before',commissionHistoryAfter:'After',commissionHistoryEmpty:'No commission has been recorded or corrected for this property yet.'},
 ms:{roomOccupantDetail:'Butiran penghuni bilik',registrationRecord:'Rekod pendaftaran',commissionDetail:'Butiran komisen',
  occupantBasis:'Asas penempatan',basisArrival:'Mengikut tarikh ketibaan',basisOverlap:'Sebarang malam dalam tempoh',
  occupantName:'Penghuni',occupantGender:'Jantina',occupantParty:'Bilangan sekali',occupantPeople:'Orang',occupantStays:'Penginapan',
  occupantUnnamed:'Nama tidak diisi',occupantUnnamedCount:'Orang tanpa nama',occupantByGender:'Mengikut jantina',
  gender_female:'Perempuan',gender_male:'Lelaki',gender_any:'Sebarang / tidak direkod',
  stayStatus:'Status tempahan',status_reserved:'Ditempah',status_confirmed:'Disahkan',status_checked_in:'Dalam penginapan',status_checked_out:'Daftar keluar',status_cancelled:'Dibatalkan',
  occupantNote:'Diletakkan pada tarikh ketibaan yang dibawa tempahan, bukan tarikh operasi. Tempahan dibatalkan tiada penghuni dan dikecualikan. Bilik belum ditetapkan dinyatakan sedemikian.',
  regStays:'Penginapan',regExpected:'Penghuni dijangka',regRegistered:'Nama diisi',regMissing:'Nama kurang',regIncomplete:'Penginapan tidak lengkap',
  regUnassigned:'Penginapan tanpa bilik',regState:'Pendaftaran',regAssigned:'Bilik',regComplete:'Nama lengkap',regIncompleteRow:'Nama perlu dilengkapkan',
  roomAssigned:'Ditetapkan',
  registrationNote:'Halaman ini hanya menyemak sama ada nama yang dibawa tempahan lengkap, dan meletakkan setiap penginapan pada tarikh ketibaannya.',
  registrationPrivacyNote:'Dokumen identiti disimpan tersulit di pelayan dan status semakan berada di halaman semakan daftar masuk kendiri. Laporan ini tidak menyahsulit, mengeksport atau memaparkan nombor dokumen.',
  commissionOrders:'Tempahan',commissionCharged:'Dibilkan',commissionPaid:'Diterima',commissionAmount:'Komisen',
  commissionNotRecorded:'Tidak direkod',commissionSettlement:'Penyelesaian',commissionByChannel:'Mengikut saluran',
  commissionUnallocated:'Caj tanpa tarikh operasi (tidak termasuk jumlah)',
  commissionNote:'Kewangan merekod komisen yang sebenarnya dibilkan oleh saluran. Tiada kadar dikonfigurasi dan tiada komisen dianggarkan daripada harga bilik.',
  commissionNoteDetail:'Yang berikut ialah nilai tempahan saluran dan apa yang diterima padanya untuk memadankan invois saluran. Tempahan tanpa komisen direkod masih menyatakan tidak direkod, bukan mencetak 0; yang telah direkod menunjukkan amaun invois dan status penyelesaian.',
  commissionRecordTitle:'Rekod komisen saluran',commissionOrder:'Tempahan',commissionAmountInput:'Komisen (MYR)',commissionReference:'Rujukan invois saluran',commissionNoteInput:'Nota',commissionSave:'Simpan komisen',commissionSettled:'Diselesaikan',commissionRecorded:'Direkod, belum diselesaikan',commissionReadOnly:'Hanya kewangan atau pentadbir boleh merekod komisen saluran.',commissionRateNote:'Masukkan amaun pada invois saluran, jangan anggaran. Rekod diaudit dan boleh dibetulkan.',commissionUnrecordedCount:'Tidak direkod',commissionHistory:'Sejarah rekod dan pembetulan komisen',commissionHistoryNote:'Baris ini daripada audit yang tidak boleh diubah, terbaharu dahulu, sehingga 50 rekod terakhir bagi hartanah ini. Setiap rekod menyimpan amaun, rujukan invois dan status penyelesaian sebelum dan selepas perubahan. Halaman ini hanya memaparkannya dan tidak mengubah akaun.',commissionHistoryAt:'Masa',commissionHistoryActor:'Oleh',commissionHistoryBooking:'Tempahan',commissionHistoryBefore:'Sebelum',commissionHistoryAfter:'Selepas',commissionHistoryEmpty:'Belum ada rekod atau pembetulan komisen bagi hartanah ini.'}
};
for(const language of Object.keys(occupantWords))Object.assign(financialWords[language],occupantWords[language]);
for(const language of Object.keys(penaltyWords))Object.assign(financialWords[language],penaltyWords[language]);

export function arPostForm(state,order,{t,currency,totals}) {
  const accounts=(state.arAccounts||[]).filter(a=>a.propertyId===order.propertyId);
  if (!accounts.length||order.folioClosed||totals.deposit!==0||(!order.splitBills&&totals.due<=0)) return '';
  const due=order.splitBills?.filter(b=>!b.closedBy&&b.charge>b.paid).map(b=>({id:b.id,label:b.label,amount:b.charge-b.paid}));
  if (due && !due.length) return '';
  const date=state.businessDates?.[order.propertyId]||state.businessDate||'';
  const choices=(rows)=>rows.map(row=>'<option value="'+esc(row.id)+'">'+esc(row.label)+'</option>').join('');
  return '<details><summary>'+esc(t('ar_post'))+'</summary><form id="ar-post-form"><p>'+esc(t('arPostNote'))+'</p>'+
    '<label>'+esc(t('arLedger'))+'<select name="accountId" required>'+choices(accounts.map(a=>({...a,label:a.name})))+'</select></label>'+
    (due?'<label>'+esc(t('splitBill'))+'<select name="billId" required>'+choices(due.map(b=>({...b,label:b.label+' · '+currency(b.amount)})))+'</select></label>':'')+
    '<label>'+esc(t('arDueDate'))+'<input name="dueDate" type="date" min="'+esc(date)+'" value="'+esc(date)+'" required></label>'+
    '<label><input type="checkbox" required> '+esc(t('arConfirm'))+'</label><button>'+esc(t('ar_post'))+'</button></form></details>';
}

export function arLedgerPage(state,{propertyId,selected,t,currency,can}) {
  if(!can('ar_report_view'))return '<section class="panel"><p>'+esc(t('forbidden'))+'</p></section>';
  const accounts=(state.arAccounts||[]).filter(a=>a.propertyId===propertyId);
  const ledger=(state.arItems||[]).filter(i=>i.propertyId===propertyId);
  const account=accounts.find(a=>a.id===selected)||accounts[0];
  const items=ledger.filter(i=>i.accountId===account?.id&&!i.reversedBy);
  const events=(state.arEvents||[]).filter(e=>e.propertyId===propertyId&&(e.accountId===account?.id||e.targetId===account?.id));
  const label=key=>esc(t(key)),money=value=>esc(currency(value));
  const hidden=(name,value)=>'<input type="hidden" name="'+name+'" value="'+esc(value)+'">';
  const input=(name,key,attributes)=>'<label>'+label(key)+'<input name="'+name+'" '+attributes+'></label>';
  const select=(name,key,choices,value,id='')=>'<label>'+label(key)+'<select '+(id?'id="'+id+'" ':'')+'name="'+name+'" required>'+
    choices.map(([v,l])=>'<option value="'+esc(v)+'" '+(v===value?'selected':'')+'>'+esc(l)+'</option>').join('')+'</select></label>';
  const form=(type,fields)=>can(type)?'<form data-ar-command="'+type+'">'+fields+'<button>'+label(type)+'</button></form>':'';
  const note=()=>input('reason','folioReopenReason','required maxlength="500"');
  const table=(headers,rows)=>'<div class="table-wrap"><table><thead><tr>'+headers.map(k=>'<th>'+label(k)+'</th>').join('')+'</tr></thead><tbody>'+rows.join('')+'</tbody></table></div>';
  const choice=accounts.map(a=>[a.id,a.name+' · '+currency(ledger.filter(i=>i.accountId===a.id).reduce((n,i)=>n+i.open,0))]);
  const accountForm=form('ar_account_save',input('name','arAccountName','required maxlength="120"'));
  if(!account)return '<section class="panel"><h2>'+label('arLedger')+'</h2><div id="ar-error" role="alert"></div>'+accountForm+'</section>';
  const id=hidden('accountId',account.id);
  const others=accounts.filter(a=>a.id!==account.id).map(a=>[a.id,a.name]);
  const receipt=form('ar_write_off',id+input('amount','amount','type="number" min=".01" step=".01" required')+
    select('method','method',['cash','bank','card','ota'].map(k=>[k,t(k)]),'cash')+input('reference','reference','maxlength="120"')+
    '<details><summary>'+label('arManual')+'</summary><label><input type="checkbox" name="manual"> '+label('arManual')+'</label>'+
    items.filter(i=>i.open>0).map(i=>input('allocation:'+esc(i.id),'amount','type="number" step=".01" min="0" max="'+i.open/100+'"')+
      '<small>'+esc(i.dueDate)+' · '+money(i.open)+' · '+esc(i.id)+'</small>').join('')+'</details>');
  const amountField=()=>input('amount','amount','type="number" min=".01" step=".01" required');
  const confirm=()=>'<label><input type="checkbox" required> '+label('arAdjustConfirm')+'</label>';
  const openItems=items.filter(i=>i.open>0);
  const adjustmentForms='<details><summary>'+label('ar_adjust')+'</summary><p>'+label('arAdjustNote')+'</p>'+
    '<h4>'+label('arDebit')+'</h4>'+form('ar_adjust',id+hidden('direction','debit')+amountField()+input('dueDate','arDueDate','type="date" required')+note()+confirm())+
    (openItems.length?'<h4>'+label('arCredit')+'</h4>'+form('ar_adjust',id+hidden('direction','credit')+select('itemId','id',openItems.map(i=>[i.id,i.dueDate+' · '+currency(i.open)+' · '+i.id]))+amountField()+note()+confirm()):'')+'</details>';
  const rows=items.map(i=>{
    const key=id+hidden('itemId',i.id);
    const actions=i.open!==i.amount||i.origin==='adjustment'?'':form('ar_undo_post',key+note())+(others.length?form('ar_transfer',key+select('targetId','arTarget',others)+note()):'');
    return '<tr><td>'+(i.orderId?'<button data-open-stay="'+esc(i.orderId)+'">'+esc(i.orderId)+'</button>':label('ar_adjust')+' · '+esc(i.id))+'</td><td>'+esc(i.dueDate)+'</td><td>'+money(i.amount)+'</td><td>'+money(i.open)+'</td><td>'+actions+'</td></tr>';
  });
  const history=[...events].reverse().map(e=>{
    const reversible=!events.some(x=>x.reverses===e.id);
    const reverse=e.type==='ar_write_off'?form('ar_undo_write_off',id+hidden('receiptId',e.id)+note()):e.type==='ar_adjust'&&!e.correctsPeriodId?form('ar_undo_adjust',id+hidden('adjustmentId',e.id)+note()):'';
    const allocation=(e.allocations||[]).map(a=>esc(a.itemId)+' · '+money(a.amount)).join('<br>');
    return '<tr><td>'+esc(e.businessDate||'—')+'</td><td>'+label(e.type)+'</td><td>'+esc(e.actor)+'</td><td>'+esc(e.reference||e.reason||'')+
      (e.targetId?' · '+esc(accounts.find(a=>a.id===e.targetId)?.name||e.targetId):'')+(allocation?'<br>'+allocation:'')+
      '</td><td>'+(e.amount===undefined?'—':money(e.amount))+'</td><td>'+(reversible?reverse:'')+'</td></tr>';
  });
  return '<section class="panel"><h2>'+label('arLedger')+'</h2><div id="ar-error" role="alert"></div><p>'+label('arLedgerNote')+'</p>'+
    select('accountId','arLedger',choice,account.id,'ar-select')+accountForm+
    form('ar_account_save',id+input('name','arAccountName','required maxlength="120" value="'+esc(account.name)+'"'))+
    '<h3>'+label('ar_write_off')+'</h3>'+receipt+adjustmentForms+
    table(['id','arDueDate','charge','due','action'],rows)+
    '<h3>'+label('audit')+'</h3>'+table(['date','action','createdBy','notes','amount','action'],history)+'</section>';
}

Object.assign(financialWords.zh,{"arLedger":"应收账款","ar_account_save":"保存应收账户","ar_post":"转应收","ar_write_off":"登记收款并核销","ar_undo_write_off":"撤销核销","ar_transfer":"转移应收","ar_undo_post":"撤销挂账","ar_report_view":"查看应收账款","arAccountName":"账户名称","arDueDate":"到期日","arTarget":"目标账户","arManual":"手工分配（默认按到期日）","arPostNote":"将选中账单的未收金额转入应收。押金须先结清。","arConfirm":"确认将未收金额转入应收","arLedgerNote":"按门店核算。应收收款及冲销单列，转应收不计现金。","ar_input":"应收账户或金额有误。","ar_state":"当前账务状态不允许此操作。","ar_total":"核销分配之和必须等于收款金额。","ar_business_date":"请先初始化本门店营业日。"});
Object.assign(financialWords.en,{"arLedger":"Accounts receivable","ar_account_save":"Save AR account","ar_post":"Post to AR","ar_write_off":"Record receipt and allocate","ar_undo_write_off":"Reverse allocation","ar_transfer":"Transfer receivable","ar_undo_post":"Reverse AR posting","ar_report_view":"View receivables","arAccountName":"Account name","arDueDate":"Due date","arTarget":"Destination account","arManual":"Manual allocation (default: earliest due date)","arPostNote":"Post the selected unpaid balance to AR. Clear the deposit first.","arConfirm":"Confirm transfer of the unpaid balance to AR","arLedgerNote":"Property ledger. AR receipts and reversals are separate. Posting to AR is a non-cash transfer.","ar_input":"Check the AR account or amount.","ar_state":"The current ledger state does not allow this action.","ar_total":"Allocations must equal the receipt amount.","ar_business_date":"Initialize the property business date first."});
Object.assign(financialWords.ms,{"arLedger":"Akaun belum terima","ar_account_save":"Simpan akaun AR","ar_post":"Pindah ke AR","ar_write_off":"Rekod dan padankan terimaan","ar_undo_write_off":"Balikkan padanan","ar_transfer":"Pindah baki belum terima","ar_undo_post":"Balikkan catatan AR","ar_report_view":"Lihat akaun belum terima","arAccountName":"Nama akaun","arDueDate":"Tarikh matang","arTarget":"Akaun destinasi","arManual":"Agihan manual (lalai: tarikh matang terawal)","arPostNote":"Pindah baki belum bayar ke AR. Selesaikan deposit dahulu.","arConfirm":"Sahkan pindahan baki belum bayar ke AR","arLedgerNote":"Lejar hartanah. Terimaan dan pembalikan AR diasingkan. Pindahan ke AR tidak melibatkan tunai.","ar_input":"Semak akaun atau amaun AR.","ar_state":"Status lejar semasa tidak membenarkan tindakan ini.","ar_total":"Jumlah agihan mesti sama dengan terimaan.","ar_business_date":"Mulakan tarikh operasi hartanah dahulu."});
export function arReportsPage(state,{propertyId,from,to,arReport='aging',t,currency,can}) {
  const e=esc, label=k=>e(t(k)), money=n=>e(currency(n));
  if(!can('ar_report_view'))return '<section class="panel"><p>'+label('forbidden')+'</p></section>';
  const kinds=['aging','balances','postings','allocations','receipts','adjustments','guest','accrual'];
  if(!kinds.includes(arReport))arReport='aging';
  const filters='<div class="order-filters">'+['from','to'].map(k=>'<label>'+label(k==='from'?'reportFrom':'reportTo')+
    '<input type="date" data-finance-filter="'+k+'" value="'+e(k==='from'?from:to)+'"></label>').join('')+
    '<label>'+label('arReports')+'<select data-finance-filter="arReport">'+kinds.map(k=>'<option value="'+k+'" '+(k===arReport?'selected':'')+'>'+label('arReport_'+k)+'</option>').join('')+'</select></label></div>';
  const panel=html=>'<section class="panel"><h2>'+label('arReports')+'</h2><p id="ar-error" aria-live="polite"></p>'+filters+arPeriodPanel(state,{propertyId,t,currency,can})+html+'</section>';
  try{
    const report=receivableReports(state,{propertyId,from,to});
    const account=id=>e(report.accounts.get(id)||id||'—');
    const order=id=>id?'<button data-open-stay="'+e(id)+'">'+e(report.orderName(id))+'</button>':'—';
    const rows=report[arReport];
    const eventHeaders=['date','arAccountName','action','createdBy','reference','amount'];
    const eventCells=r=>[e(r.date),account(r.accountId),label(r.type),e(r.actor||'—'),e(r.reference||r.reverses||'—'),money(r.amount)];
    const definitions={
      aging:[['arAccountName','guest','arDueDate','arAgeBand','due'],r=>[account(r.accountId),r.orderId?order(r.orderId):label('ar_adjust')+' · '+e(r.itemId),e(r.dueDate),label(r.band),money(r.open)]],
      balances:[['arAccountName','mdrOpening','arMovement','mdrClosing'],r=>[e(r.name),money(r.opening),money(r.change),money(r.closing)]],
      postings:[['date','arAccountName','guest','arDueDate','createdBy','amount'],r=>[e(r.date),account(r.accountId),order(r.orderId),e(r.dueDate),e(r.actor||'—'),money(r.amount)]],
      allocations:[[...eventHeaders,'guest','id'],r=>[...eventCells(r),order(r.orderId),e(r.itemId)]],
      receipts:[eventHeaders,r=>eventCells(r)],
      adjustments:[[...eventHeaders,'arTarget','notes','id'],r=>[...eventCells(r),account(r.targetId),e(r.reason),e(r.itemId)]],
      guest:[['guest','charge','paid','due','deposit'],r=>[order(r.orderId),money(r.charge),money(r.paid),money(r.due),money(r.depositHeld)]],
      accrual:[['date','guest','source','kind','amount'],r=>[e(r.date),order(r.orderId),label(r.source),e(r.name||t(r.kind)),money(r.amount)]]
    };
    const [headers,cells]=definitions[arReport];
    const totalField={aging:'open',balances:'closing',guest:'due'}[arReport]||'amount';
    const total=arReport==='adjustments'?0:rows.reduce((sum,r)=>sum+r[totalField],0);
    const note=arReport==='aging'||arReport==='guest'?'arAsOfNote':arReport==='accrual'?'reportBusinessNote':'arPeriodNote';
    const unallocated=arReport==='accrual'&&report.unallocated.length?'<p>'+label('reportUnallocated')+' · '+report.unallocated.length+'</p>':'';
    return panel('<h3>'+label('arReport_'+arReport)+'</h3><p>'+label(note)+'</p>'+unallocated+
      (arReport==='adjustments'?'':'<p>'+label('reportTotal')+' · '+money(total)+'</p>')+
      '<div class="table-wrap"><table><thead><tr>'+headers.map(k=>'<th>'+label(k)+'</th>').join('')+
      '</tr></thead><tbody>'+rows.map(r=>'<tr>'+cells(r).map(c=>'<td>'+c+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>');
  }catch(error){return panel('<p role="alert">'+label(error.message)+'</p>');}
}

Object.assign(financialWords.zh,{"arReports":"应收与财务报表","arReport_aging":"AR 账龄表","arReport_balances":"AR 账户余额表","arReport_postings":"AR 挂账明细表","arReport_allocations":"AR 核销明细表","arReport_receipts":"AR 核销流水表","arReport_adjustments":"AR 调账明细表","arReport_guest":"宾客账结余明细表","arReport_accrual":"权责制营业报表","arAgeBand":"账龄","arCurrent":"未逾期","arDays30":"逾期 1–30 天","arDays60":"逾期 31–60 天","arDays90":"逾期 61–90 天","arDaysOver90":"逾期 90 天以上","arMovement":"期间净变动","arAsOfNote":"按结束日期的营业日截点列示。","arPeriodNote":"按营业日范围（含首尾）列示。冲销单列。"});
Object.assign(financialWords.en,{"arReports":"AR and financial reports","arReport_aging":"AR aging","arReport_balances":"AR account balances","arReport_postings":"AR postings","arReport_allocations":"AR allocation details","arReport_receipts":"AR receipt ledger","arReport_adjustments":"AR adjustments","arReport_guest":"Guest ledger balances","arReport_accrual":"Accrual revenue","arAgeBand":"Age band","arCurrent":"Current","arDays30":"1–30 overdue","arDays60":"31–60 overdue","arDays90":"61–90 overdue","arDaysOver90":"Over 90 overdue","arMovement":"Net movement","arAsOfNote":"Snapshot at the end business date.","arPeriodNote":"Inclusive business dates. Reversals appear separately."});
Object.assign(financialWords.ms,{"arReports":"Laporan AR dan kewangan","arReport_aging":"Usia AR","arReport_balances":"Baki akaun AR","arReport_postings":"Catatan AR","arReport_allocations":"Butiran agihan AR","arReport_receipts":"Lejar terimaan AR","arReport_adjustments":"Pelarasan AR","arReport_guest":"Baki lejar tetamu","arReport_accrual":"Hasil akruan","arAgeBand":"Julat usia","arCurrent":"Semasa","arDays30":"Lewat 1–30 hari","arDays60":"Lewat 31–60 hari","arDays90":"Lewat 61–90 hari","arDaysOver90":"Lewat lebih 90 hari","arMovement":"Pergerakan bersih","arAsOfNote":"Baki pada tarikh operasi akhir.","arPeriodNote":"Tarikh operasi termasuk kedua-dua hujung. Pembalikan ditunjukkan berasingan."});
function arPeriodPanel(state,{propertyId,t,currency,can}) {
  const label=k=>esc(t(k));
  const money=v=>esc(currency(v));
  const periods=(state.arPeriods||[]).filter(row=>row.propertyId===propertyId);
  const corrections=(state.arEvents||[]).filter(row=>row.propertyId===propertyId&&row.correctsPeriodId);
  const correctionControls=(period,row)=>{
    if(!can('ar_close_month'))return '';
    const items=(state.arItems||[]).filter(item=>item.propertyId===propertyId&&item.accountId===row.accountId&&
      !item.reversedBy&&item.open>0&&item.businessDate<=period.to);
    const form=(direction,extra)=>'<form data-ar-command="ar_close_month" data-ar-correction="'+direction+'">'+
      '<input type="hidden" name="periodId" value="'+esc(period.id)+'"><input type="hidden" name="accountId" value="'+esc(row.accountId)+'">'+
      '<input type="hidden" name="direction" value="'+direction+'">'+extra+
      '<label>'+label('amount')+'<input name="amount" type="number" min=".01" max="1000000" step=".01" required></label>'+
      '<label>'+label('notes')+'<input name="reason" maxlength="500" required></label><button>'+label(direction==='debit'?'arDebit':'arCredit')+'</button></form>';
    return '<details><summary>'+label('arMonthCorrection')+'</summary>'+form('debit','<label>'+label('arDueDate')+'<input type="date" name="dueDate" required></label>')+
      (items.length?form('credit','<label>'+label('arOpen')+'<select name="itemId">'+items.map(item=>'<option value="'+esc(item.id)+'">'+esc(item.id)+' · '+money(item.open)+'</option>').join('')+'</select></label>'):'')+'</details>';
  };
  const correctionRows=(period)=>corrections.filter(row=>row.correctsPeriodId===period.id).map(row=>
    '<li>'+esc(row.businessDate)+' · '+esc(period.balances.find(account=>account.accountId===row.accountId)?.name||row.accountId)+' · '+money(row.amount)+
    ' · '+esc(row.actor)+' · '+esc(row.at)+' · '+esc(row.reason)+'</li>').join('');
  const history=[...periods].reverse().map(period=>'<details><summary>'+esc(period.month)+' · '+money(period.totals.closing)+' · '+esc(period.actor)+' · '+esc(period.at)+'</summary>'+
    '<div class="table-wrap"><table><thead><tr>'+['arAccountName','mdrOpening','arMovement','mdrClosing'].map(k=>'<th>'+label(k)+'</th>').join('')+'</tr></thead><tbody>'+
    period.balances.map(row=>'<tr><td>'+esc(row.name)+'</td><td>'+money(row.opening)+'</td><td>'+money(row.change)+'</td><td>'+money(row.closing)+correctionControls(period,row)+'</td></tr>').join('')+
    '</tbody></table></div><ul data-ar-correction-history>'+correctionRows(period)+'</ul></details>').join('');
  const form=can('ar_close_month')?'<form data-ar-command="ar_close_month"><label>'+label('arMonth')+'<input name="month" type="month" required></label><label><input type="checkbox" required> '+label('arCloseConfirm')+'</label><button>'+label('ar_close_month')+'</button></form>':'';
  return '<details><summary>'+label('arPeriods')+'</summary><p>'+label('arPeriodRule')+'</p>'+form+history+'</details>';
}

Object.assign(financialWords.zh,{"arMonthCorrection":"登记月结更正","arPeriods":"AR 月结记录","arMonth":"应收月份","ar_close_month":"关闭应收账期","arCloseConfirm":"确认保存期末快照并关闭该月","arPeriodRule":"只能关闭已结束的月份。首次月结后须按月连续关闭。","ar_period":"月份无效、仍在营业、已经关闭或不连续。"});
Object.assign(financialWords.en,{"arMonthCorrection":"Record month-end correction","arPeriods":"AR month-end records","arMonth":"Receivable month","ar_close_month":"Close AR month","arCloseConfirm":"Confirm snapshot and close month","arPeriodRule":"Only elapsed months can be closed. After the first close, months must be consecutive.","ar_period":"The month is invalid, active, already closed or out of sequence."});
Object.assign(financialWords.ms,{"arMonthCorrection":"Rekod pembetulan bulan tutup","arPeriods":"Rekod tutup bulan AR","arMonth":"Bulan AR","ar_close_month":"Tutup bulan AR","arCloseConfirm":"Sahkan baki dan tutup bulan","arPeriodRule":"Hanya bulan yang telah tamat boleh ditutup. Selepas penutupan pertama, bulan mesti berturutan.","ar_period":"Bulan tidak sah, aktif, sudah ditutup atau tidak berturutan."});
Object.assign(financialWords.zh,{"ar_adjust":"新增应收调账","ar_undo_adjust":"冲销应收调账","arDebit":"加记应收","arCredit":"减记应收","arAdjustConfirm":"确认按本营业日登记此分录","arAdjustNote":"加记生成独立应收。减记抵减指定开放应收。两者均不产生现金或住宿收入。"});
Object.assign(financialWords.en,{"ar_adjust":"Post AR adjustment","ar_undo_adjust":"Reverse AR adjustment","arDebit":"Increase receivable","arCredit":"Decrease receivable","arAdjustConfirm":"Confirm posting on this business date","arAdjustNote":"An increase creates a standalone receivable. A decrease reduces the selected open item. Neither changes cash or accommodation revenue."});
Object.assign(financialWords.ms,{"ar_adjust":"Catat pelarasan AR","ar_undo_adjust":"Balikkan pelarasan AR","arDebit":"Tambah belum terima","arCredit":"Kurangkan belum terima","arAdjustConfirm":"Sahkan catatan pada tarikh operasi ini","arAdjustNote":"Tambahan mencipta baki berasingan. Pengurangan mengurangkan baki dipilih. Tiada perubahan tunai atau hasil penginapan."});
export function commissionPeriodPanel(state,{propertyId,t,currency,can}){
  if(!can('commission_save')&&!can('commission_close_month'))return '';
  const label=k=>esc(t(k)),money=n=>esc(currency(n));
  const periods=(state.commissionPeriods||[]).filter(row=>row.propertyId===propertyId);
  const orders=state.orders.filter(order=>order.propertyId===propertyId);
  const correctionForm=row=>{
    const order=orders.find(order=>order.id===row.orderId);
    if(row.originalPeriod||!order||!can('commission_save')||!can('commission_close_month'))return '';
    const current=order.commissionCorrections?.at(-1)?.correctedAmount??row.amount;
    return '<details><summary>'+label('commissionCorrection')+'</summary><form data-commission-correct="'+esc(row.orderId)+'">'+
      '<label>'+label('commissionCorrectedAmount')+'<input name="amount" type="number" min="0" max="1000000" step=".01" required value="'+esc((current/100).toFixed(2))+'"></label>'+
      '<label>'+label('reference')+'<input name="reference" maxlength="100" required></label>'+
      '<label>'+label('notes')+'<input name="note" maxlength="500" required></label><button>'+label('record')+'</button></form></details>';
  };
  const pending=orders.flatMap(order=>(order.commissionCorrections||[]).filter(row=>!periods.some(p=>p.month===row.period)));
  const pendingHistory=pending.length?'<h3>'+label('commissionPendingCorrections')+'</h3><ul>'+pending.map(row=>
    '<li>'+esc(row.period)+' · '+esc(row.originalPeriod)+' · '+money(row.amount)+' · '+esc(row.reference)+' · '+esc(row.note)+'</li>').join('')+'</ul>':'';
  const history=[...periods].reverse().map(period=>'<details data-commission-period="'+esc(period.month)+'"><summary>'+esc(period.month)+' · '+money(period.total)+' · '+esc(period.actor)+' · '+esc(period.at)+'</summary>'+
    '<div class="table-wrap"><table><thead><tr>'+['source','commissionOrders','commissionAmount'].map(k=>'<th>'+label(k)+'</th>').join('')+
    '</tr></thead><tbody>'+period.channels.map(row=>'<tr><td>'+label(row.source)+'</td><td>'+esc(row.count)+'</td><td>'+money(row.amount)+'</td></tr>').join('')+
    '</tbody></table><table><thead><tr>'+['id','source','reference','commissionAmount'].map(k=>'<th>'+label(k)+'</th>').join('')+
    '</tr></thead><tbody>'+period.entries.map(row=>'<tr><td><button data-open-stay="'+esc(row.orderId)+'">'+esc(row.orderId)+'</button></td><td>'+label(row.source)+'</td><td>'+esc(row.reference)+(row.originalPeriod?' · '+esc(row.originalPeriod)+' · '+esc(row.note):'')+'</td><td>'+money(row.amount)+correctionForm(row)+'</td></tr>').join('')+
    '</tbody></table></div></details>').join('');
  const form=can('commission_close_month')?'<form id="commission-close-form"><label>'+label('commissionMonth')+'<input name="month" type="month" required></label><label><input type="checkbox" required> '+label('commissionCloseConfirm')+'</label><button>'+label('commission_close_month')+'</button></form>':'';
  return '<section class="panel"><details><summary>'+label('commissionPeriods')+'</summary><p>'+label('commissionPeriodNote')+'</p>'+form+pendingHistory+history+'</details></section>';
}

Object.assign(financialWords.zh,{"commissionCorrection":"登记月结更正","commissionCorrectedAmount":"更正后佣金总额","commissionPendingCorrections":"待月结的更正","commissionPeriods":"佣金月结记录","commissionMonth":"佣金月份","commission_close_month":"关闭佣金账期","commissionCloseConfirm":"确认冻结该月佣金","commissionPeriodNote":"按首次记录的营业月份归期，旧数据按首次可用记录时点的马来西亚月份归期。只汇总已录入且标为已结的佣金。","commission_period":"月份仍在营业、已关闭、不连续，或存在更早未关闭月份。","commission_pending":"该月存在未结佣金，或有佣金缺少可用归期。"});
Object.assign(financialWords.en,{"commissionCorrection":"Record month-end correction","commissionCorrectedAmount":"Corrected commission total","commissionPendingCorrections":"Corrections pending month close","commissionPeriods":"Commission month-end records","commissionMonth":"Commission month","commission_close_month":"Close commission month","commissionCloseConfirm":"Confirm freezing this commission month","commissionPeriodNote":"Invoices use their first recorded business month. Legacy entries use the available Malaysia recording timestamp. Only entered and settled commissions enter the snapshot.","commission_period":"The month is active, closed, out of sequence, or an earlier month remains open.","commission_pending":"Unsettled invoices or entries without a usable month remain."});
Object.assign(financialWords.ms,{"commissionCorrection":"Rekod pembetulan bulan tutup","commissionCorrectedAmount":"Jumlah komisen dibetulkan","commissionPendingCorrections":"Pembetulan menunggu tutup bulan","commissionPeriods":"Rekod tutup bulan komisen","commissionMonth":"Bulan komisen","commission_close_month":"Tutup bulan komisen","commissionCloseConfirm":"Sahkan pembekuan bulan ini","commissionPeriodNote":"Invois mengikut bulan operasi rekod pertama. Rekod lama menggunakan cap masa Malaysia yang tersedia. Hanya komisen direkod dan selesai diringkaskan.","commission_period":"Bulan aktif, sudah ditutup, tidak berturutan atau ada bulan terdahulu belum ditutup.","commission_pending":"Ada komisen belum selesai atau tanpa bulan yang sah."});