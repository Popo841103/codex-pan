const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function rateCalendar(state,{propertyId,start,days=14,currency=n=>String(n),t=k=>k}){
 const stamp=Date.parse(start+'T00:00:00Z');if(!Number.isFinite(stamp)||new Date(stamp).toISOString().slice(0,10)!==start||!Number.isInteger(days)||days<1||days>31)throw Error('rate_dates');
 const dates=Array.from({length:days},(_,i)=>new Date(stamp+i*86400000).toISOString().slice(0,10));
 const rows=(state.ratePlans||[]).filter(p=>p.propertyId===propertyId&&!p.archived).flatMap(p=>p.roomTypeIds.map(id=>'<tr><th>'+esc(p.name)+'<small>'+esc(id)+'</small></th>'+dates.map(date=>{const c=(state.rateCells||[]).find(c=>c.propertyId===propertyId&&c.planCode===p.code&&c.roomTypeId===id&&c.date===date);return '<td>'+(!c?'—':esc(currency(c.amount))+'<small>'+esc(t(c.sale))+' · '+esc(c.minStay||0)+'/'+esc(c.maxStay||0)+' · CTA '+(c.cta?'×':'✓')+' · CTD '+(c.ctd?'×':'✓')+'</small>')+'</td>';}).join('')+'</tr>'));
 return '<div class="table-wrap"><table><thead><tr><th>'+esc(t('ratePlan'))+'</th>'+dates.map(d=>'<th>'+d+'</th>').join('')+'</tr></thead><tbody>'+rows.join('')+'</tbody></table></div>';
}
