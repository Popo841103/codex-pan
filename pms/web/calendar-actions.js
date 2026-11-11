import { saleResources } from '../src/catalog.js';
import { stayDays } from '../src/reservations.js';
import { blockType } from '../src/inventory-actions.js';

export const calendarActionWords = {
 zh:{cellActions:'日历操作',selectRange:'选择入住区间',rangeHint:'点击空格打开菜单；鼠标可在同一房号拖选。手机或键盘可先点“选择入住区间”，再选首晚和末晚。',selectFirst:'请选择首晚空格。',selectLast:'请选择同一房号的末晚；首尾两格都计入住宿晚数。',selection:'已选房床与日期',rangeRule:'结束日期是离店日，不占当晚；输入日期可调整范围。',selection_conflict:'所选区间有预订、关房或共用空间占用，请重新选择。',selection_scope:'请选择本店同一房床的有效区间。',reserve:'预订',blockUnit:'关房',releaseBlock:'开放所选关房日期',blockType:'关房类型',maintenance:'维修房',out_of_service:'停用房',hold:'保留房',blockPolicy:'维修、停用扣除入住率可售分母；保留房阻止销售，但保留在分母。此为JOVIAN明确规则。',block_input:'请选择有效关房类型，备注不超过200字。',confirmRange:'已核对房床、日期和操作类型',selectedBlocks:'所选日期相交的关房记录',releasePolicy:'只释放勾选记录中此房床与此区间的占用；其他日期、房床和重叠记录保留。',boxTitle:'订单盒子（不占库存）',boxNote:'盒内住宿项不承诺房床库存；恢复时必须重新校验，原房号不会自动保留。已有房费与收退款、押金全部保留，不自动退款。',box_stays:'移入订单盒子',restore_stays:'恢复库存预订',box_state:'仅未锁定、未入住的有效预订可移入盒子；盒内需先恢复库存才能分房或入住。',box_input:'请填写200字以内的原因并选择恢复方式。',boxConfirm:'确认这些住宿项的库存将释放或重新预留',released:'库存已释放',boxed:'盒内／不占库存',reserved:'占库存预订',inventoryState:'库存归属',inventoryHistory:'盒子与恢复记录',unassignedQueue:'待分房预订（已占库存）',restoreAssign:'恢复并自动分房',boxEmpty:'订单盒子为空。',partialBox:'盒内住宿项',blockNotes:'关房备注',rangeModeOff:'退出区间选择'},
 en:{cellActions:'Calendar actions',selectRange:'Select stay range',rangeHint:'Click a free cell for actions. Drag within one unit with a mouse, or enable range selection and select the first and last nights with touch or keyboard.',selectFirst:'Select the first free night.',selectLast:'Select the last night in the same unit; both endpoint cells are stay nights.',selection:'Selected unit and dates',rangeRule:'End is the departure date and is not occupied. Edit dates to adjust the range.',selection_conflict:'The range includes a reservation, block or shared-space occupancy.',selection_scope:'Choose a valid range in one unit of this property.',reserve:'Reserve',blockUnit:'Block unit',releaseBlock:'Release selected block dates',blockType:'Block type',maintenance:'Maintenance',out_of_service:'Out of service',hold:'Hold',blockPolicy:'Maintenance and out-of-service reduce occupancy capacity. Holds prevent sales but remain in capacity. This is the JOVIAN policy.',block_input:'Choose a block type and use at most 200 characters for the note.',confirmRange:'I checked the unit, dates and action',selectedBlocks:'Blocks intersecting selected dates',releasePolicy:'Release only checked records for this unit and interval. Other units, dates and overlapping records remain.',boxTitle:'Order box (no inventory)',boxNote:'Boxed stays promise no inventory. Restoring rechecks capacity and does not retain the old unit. Charges, payments, refunds and deposits remain unchanged; no automatic refund.',box_stays:'Move to order box',restore_stays:'Restore inventory reservation',box_state:'Only unlocked, expected stays can be boxed. Restore before assigning or checking in.',box_input:'Enter a reason up to 200 characters and choose how to restore.',boxConfirm:'Confirm releasing or reserving inventory for these stays',released:'Inventory released',boxed:'Boxed / no inventory',reserved:'Inventory reserved',inventoryState:'Inventory status',inventoryHistory:'Box / restore history',unassignedQueue:'Unassigned (inventory held)',restoreAssign:'Restore and auto-assign',boxEmpty:'The order box is empty.',partialBox:'Boxed stays',blockNotes:'Block note',rangeModeOff:'Exit range selection'},
 ms:{cellActions:'Tindakan kalendar',selectRange:'Pilih julat penginapan',rangeHint:'Klik petak kosong untuk tindakan. Seret dalam satu unit dengan tetikus, atau pilih mod julat kemudian malam pertama dan terakhir melalui sentuhan atau papan kekunci.',selectFirst:'Pilih malam kosong pertama.',selectLast:'Pilih malam terakhir dalam unit sama; kedua-dua petak termasuk dalam malam penginapan.',selection:'Unit dan tarikh dipilih',rangeRule:'Tarikh akhir ialah tarikh keluar dan tidak diduduki. Tarikh boleh diubah.',selection_conflict:'Julat mengandungi tempahan, sekatan atau ruang kongsi diduduki.',selection_scope:'Pilih julat sah dalam satu unit hartanah ini.',reserve:'Tempah',blockUnit:'Sekat unit',releaseBlock:'Buka tarikh sekatan dipilih',blockType:'Jenis sekatan',maintenance:'Penyelenggaraan',out_of_service:'Tidak beroperasi',hold:'Pegangan',blockPolicy:'Penyelenggaraan dan unit tidak beroperasi mengurangkan kapasiti. Pegangan menghalang jualan tetapi kekal dalam kapasiti. Ini polisi JOVIAN.',block_input:'Pilih jenis sekatan dan nota sehingga 200 aksara.',confirmRange:'Unit, tarikh dan tindakan telah disemak',selectedBlocks:'Sekatan bertindih tarikh dipilih',releasePolicy:'Buka rekod ditanda untuk unit dan julat ini sahaja. Unit, tarikh dan rekod lain kekal.',boxTitle:'Kotak tempahan (tiada inventori)',boxNote:'Tempahan dalam kotak tidak menjamin inventori. Pemulihan menyemak kapasiti semula tanpa mengekalkan unit lama. Caj, bayaran, pulangan dan deposit tidak berubah; tiada pulangan automatik.',box_stays:'Pindah ke kotak tempahan',restore_stays:'Pulihkan tempahan inventori',box_state:'Hanya tempahan dijangka yang tidak dikunci boleh dipindah. Pulihkan sebelum menetapkan unit atau daftar masuk.',box_input:'Isi sebab sehingga 200 aksara dan pilih cara pemulihan.',boxConfirm:'Sahkan pelepasan atau penempahan inventori untuk penginapan ini',released:'Inventori dilepaskan',boxed:'Dalam kotak / tiada inventori',reserved:'Inventori ditempah',inventoryState:'Status inventori',inventoryHistory:'Sejarah kotak / pemulihan',unassignedQueue:'Belum ditetapkan (inventori dipegang)',restoreAssign:'Pulihkan dan tetapkan unit',boxEmpty:'Kotak tempahan kosong.',partialBox:'Penginapan dalam kotak',blockNotes:'Nota sekatan',rangeModeOff:'Keluar mod julat'}
};
const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tomorrow = day => new Date(Date.parse(day+'T00:00:00Z')+86400000).toISOString().slice(0,10);

export function selectedRange(first, last) {
  if (!first || !last || first.resourceId !== last.resourceId) throw new Error('selection_scope');
  const start = first.day < last.day ? first.day : last.day;
  const end = tomorrow(first.day > last.day ? first.day : last.day);
  stayDays(start,end);
  return {resourceId:first.resourceId,start,end};
}
export function validateSelection(state,pid,range,plan,{allowBlocks=false}={}) {
  const days=stayDays(range.start,range.end),resource=saleResources(state,pid).find(r=>r.id===range.resourceId);
  if(!resource)throw new Error('selection_scope');
  const shares=item=>item.atoms.some(a=>resource.atoms.includes(a));
  if(plan.some(p=>p.start<range.end&&p.end>range.start&&shares(p)) || !allowBlocks&&state.blocks.some(b=>b.propertyId===pid&&b.start<range.end&&b.end>range.start&&shares(b)))throw new Error('selection_conflict');
  return {resource,nights:days.length};
}

export function bindCalendarActions({root,getState,getProperty,getPlan,businessDate,t,can,commit,openUtility,closeUtility,openComposer,errorText}) {
  let rangeMode=false,anchor=null,drag=null,lastDragAt=0;
  const error=err=>{const node=document.querySelector('#utility-error');if(node)node.textContent=errorText(err);};
  const clear=()=>root.querySelectorAll('.range-selected').forEach(node=>node.classList.remove('range-selected'));
  const cellInfo=cell=>({resourceId:cell.dataset.cell,day:cell.dataset.day});
  const paint=range=>{clear();root.querySelectorAll('[data-cell]').forEach(cell=>{if(cell.dataset.cell===range.resourceId&&cell.dataset.day>=range.start&&cell.dataset.day<range.end)cell.classList.add('range-selected');});};
  const dates=range=>`<div class="form-row"><label>${t('arrival')}<input type="date" name="start" value="${range.start}" required></label><label>${t('departure')}<input type="date" name="end" value="${range.end}" required></label></div><p class="muted">${t('rangeRule')}</p>`;
  const confirm=()=>`<label class="check-label"><input name="confirmed" type="checkbox" required>${t('confirmRange')}</label>`;
  function trackNights(form){form.addEventListener('change',()=>{const node=form.querySelector('[data-range-nights]');if(node){try{node.textContent=stayDays(form.elements.start.value,form.elements.end.value).length;}catch{node.textContent='—';}}});}
  function checked(range,allowBlocks=false){return validateSelection(getState(),getProperty(),range,getPlan(),{allowBlocks});}
  async function save(form,command) {
    const controls=[...form.querySelectorAll('input,select,textarea,button')].map(node=>[node,node.disabled]);controls.forEach(([node])=>node.disabled=true);
    try{await commit(command);closeUtility();clear();}catch(err){error(err);}finally{controls.forEach(([node,disabled])=>node.disabled=disabled);}
  }
  function menu(range) {
    let resource,nights;try{({resource,nights}=checked(range));}catch(err){document.querySelector('#message').textContent=errorText(err);clear();return;}
    rangeMode=false;anchor=null;
    openUtility('cellActions',`<form id="cell-actions-form"><h3>${esc(resource.label)} · <span data-range-nights>${nights}</span> ${t('nights')}</h3>${dates(range)}<div class="actions"><button name="action" value="reserve" ${can('create_reservation')?'':'disabled'}>${t('reserve')}</button>${range.start===businessDate()?`<button name="action" value="checkin" ${can('checkin')?'':'disabled'}>${t('checkin')}</button>`:''}<button name="action" value="block" ${can('bulk_block')?'':'disabled'}>${t('blockUnit')}</button><button type="button" id="range-cancel">${t('cancel')}</button></div></form>`);
    trackNights(document.querySelector('#cell-actions-form'));
    document.querySelector('#range-cancel').onclick=()=>{closeUtility();clear();};
    document.querySelector('#cell-actions-form').onsubmit=event=>{
      event.preventDefault();const form=event.target,selected={...range,start:form.elements.start.value,end:form.elements.end.value};
      try{checked(selected);const action=event.submitter?.value||'reserve';if(action==='block'){openBlockForm(selected);return;}if(action==='checkin'&&selected.start!==businessDate())throw new Error('date');closeUtility();clear();openComposer({...selected,day:selected.start,mode:action});}catch(err){error(err);}
    };
  }
  function openBlockForm(range) {
    const {resource,nights}=checked(range);
    openUtility('blockUnit',`<form id="range-block-form"><h3>${esc(resource.label)} · <span data-range-nights>${nights}</span> ${t('nights')}</h3>${dates(range)}<label>${t('blockType')}<select name="blockType">${['out_of_service','maintenance','hold'].map(kind=>`<option value="${kind}">${t(kind)}</option>`).join('')}</select></label><p class="muted">${t('blockPolicy')}</p><label>${t('blockNotes')}<textarea name="reason" maxlength="200"></textarea></label>${confirm()}<button class="primary" ${can('bulk_block')?'':'disabled'}>${t('apply')}</button></form>`);
    trackNights(document.querySelector('#range-block-form'));
    document.querySelector('#range-block-form').onsubmit=event=>{event.preventDefault();const form=event.target;const selected={...range,start:form.elements.start.value,end:form.elements.end.value};try{checked(selected);save(form,{type:'bulk_block',resourceIds:[range.resourceId],...selected,blockType:form.elements.blockType.value,reason:form.elements.reason.value});}catch(err){error(err);}};
  }
  function openRelease(range) {
    let resource;try{({resource}=checked(range,true));}catch(err){document.querySelector('#message').textContent=errorText(err);return;}
    const blocks=getState().blocks.filter(b=>b.propertyId===getProperty()&&b.start<range.end&&b.end>range.start&&b.atoms.some(a=>resource.atoms.includes(a)));
    openUtility('releaseBlock',`<form id="range-release-form"><h3>${esc(resource.label)}</h3>${dates(range)}<h4>${t('selectedBlocks')}</h4>${blocks.map(b=>`<label class="check-label"><input type="checkbox" name="blockId" value="${esc(b.id)}" checked>${t(blockType(b))} · ${b.start} → ${b.end} · ${esc([b.summary,b.reason].filter(Boolean).join(' · '))}</label>`).join('')}<p class="muted">${t('releasePolicy')}</p>${confirm()}<button class="primary" ${can('bulk_unblock')?'':'disabled'}>${t('releaseBlock')}</button></form>`);
    document.querySelector('#range-release-form').onsubmit=event=>{event.preventDefault();const form=event.target,data=new FormData(form),selected={...range,start:data.get('start'),end:data.get('end')};try{checked(selected,true);save(form,{type:'bulk_unblock',resourceIds:[range.resourceId],start:selected.start,end:selected.end,blockIds:data.getAll('blockId')});}catch(err){error(err);}};
  }
  root.addEventListener('pointerdown',event=>{const cell=event.target.closest('[data-cell]');if(event.button!==0||!cell||cell.disabled||rangeMode||event.pointerType==='touch')return;drag={first:cellInfo(cell),last:cellInfo(cell)};});
  root.addEventListener('pointerover',event=>{const cell=event.target.closest('[data-cell]');if(!drag||!cell||cell.disabled||cell.dataset.cell!==drag.first.resourceId)return;drag.last=cellInfo(cell);try{paint(selectedRange(drag.first,drag.last));}catch{clear();}});
  // A cancelled pointer must never turn into a booking or a lingering drag.
  root.addEventListener('pointercancel',()=>{drag=null;clear();});
  document.addEventListener('pointerup',event=>{if(!drag)return;const value=drag;drag=null;const cell=event.target.closest?.('[data-cell]');if(!cell||cell.dataset.cell!==value.first.resourceId){clear();return;}value.last=cellInfo(cell);if(value.first.day!==value.last.day){lastDragAt=Date.now();try{menu(selectedRange(value.first,value.last));}catch(err){document.querySelector('#message').textContent=errorText(err);}}});
  root.addEventListener('click',event=>{
    const toggle=event.target.closest('[data-range-toggle]');if(toggle){rangeMode=!rangeMode;anchor=null;clear();toggle.setAttribute('aria-pressed',String(rangeMode));document.querySelector('#message').textContent=rangeMode?t('selectFirst'):'';return;}
    const block=event.target.closest('[data-block-cell]');if(block){anchor=null;rangeMode=false;openRelease({resourceId:block.dataset.blockCell,start:block.dataset.day,end:tomorrow(block.dataset.day)});return;}
    const cell=event.target.closest('[data-cell]');if(!cell||cell.disabled||Date.now()-lastDragAt<250)return;
    try{if(rangeMode&&!anchor){anchor=cellInfo(cell);paint(selectedRange(anchor,anchor));document.querySelector('#message').textContent=t('selectLast');return;}const range=selectedRange(anchor||cellInfo(cell),cellInfo(cell));paint(range);menu(range);}catch(err){document.querySelector('#message').textContent=errorText(err);}
  });
  return {block:openBlockForm,release:openRelease,reset(){rangeMode=false;anchor=null;drag=null;clear();}};
}
