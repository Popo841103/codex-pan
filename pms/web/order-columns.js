// Display preferences never grant access; callers must supply already-authorized rows.
export const columns=Object.freeze([
 ['settlement','结账状态','Settlement status','Status penyelesaian'],
 ['originalRoomCharge','原订单房费','Original room charges','Caj bilik asal'],['netExtras','附加费／优惠净额','Net extras / discounts','Caj tambahan / diskaun bersih'],
 ['adults','成人','Adults','Dewasa'],['children','儿童','Children','Kanak-kanak'],['infants','婴儿','Infants','Bayi'],['unitNights','间夜量（房/床）','Unit nights (room/bed)','Malam unit (bilik/katil)'],
 ['guest','联系人','Contact','Kenalan'],['id','订单号','Reservation ID','ID tempahan'],['channelOrderId','渠道订单号','Channel reference','Rujukan saluran'],['source','渠道','Channel','Saluran'],['email','邮箱','Email','E-mel'],['phone','手机','Phone','Telefon'],['country','国家/地区','Country / region','Negara / wilayah'],['guestLanguage','偏好语言','Preferred language','Bahasa pilihan'],['arrival','入住日期','Arrival','Ketibaan'],['departure','退房日期','Departure','Berlepas'],['status','入住状态','Stay status','Status penginapan'],['rooms','房床数量','Units','Unit'],['allocation','房号/床号','Room / bed','Bilik / katil'],['guests','入住人数','Guests','Tetamu'],['charge','住宿费用','Charges','Caj'],['paid','住宿净实收','Net received','Terimaan bersih'],['due','待收/待退','Balance','Baki'],['deposit','押金余额','Deposit balance','Baki deposit'],['notes','备注','Notes','Nota'],['createdAt','创建时间','Created','Dicipta'],['createdBy','创建人','Created by','Dicipta oleh']
].map(([id,zh,en,ms])=>Object.freeze({id,zh,en,ms})));
export const defaultColumns=Object.freeze(['guest','arrival','status','allocation','charge','due']);
const allowed=new Set(columns.map(c=>c.id));
export function normalizeColumns(value){if(typeof value==='string'){try{value=JSON.parse(value);}catch{return [...defaultColumns];}}if(!Array.isArray(value))return [...defaultColumns];const next=[...new Set(value.filter(id=>typeof id==='string'&&allowed.has(id)))];return next.length?next:[...defaultColumns];}
export function preferenceKey(userId,propertyId){return 'jovian-order-columns:'+JSON.stringify([String(userId||'local'),String(propertyId)]);}
export function loadColumns(storage,userId,propertyId){try{return normalizeColumns(storage.getItem(preferenceKey(userId,propertyId)));}catch{return [...defaultColumns];}}
export function saveColumns(storage,userId,propertyId,value){const selected=normalizeColumns(value);storage.setItem(preferenceKey(userId,propertyId),JSON.stringify(selected));return selected;}
export function columnLabel(id,lang='en'){const c=columns.find(c=>c.id===id);return c?.[lang]||c?.en||id;}
const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function settlementStatus(group){const stays=group.stays||[];const closed=stays.filter(o=>o.folioClosed===true).length;return closed&&closed===stays.length?'folioClosed':closed||stays.some(o=>o.splitBills?.some(b=>b.closedBy))?'folioPartial':'folioOpen';}
export function renderColumn(id,group,{folio,currency=n=>String(n),t=k=>k,resources=[]}={}){
 const stays=group.stays||[],first=stays[0]||{},unique=key=>[...new Set(stays.map(o=>o[key]).filter(v=>v!==undefined&&v!==null&&v!==''))];
 if(id==='settlement')return escape(t(settlementStatus(group)));
 if(id==='originalRoomCharge')return escape(currency(stays.reduce((sum,o)=>sum+(o.nightlyRates?o.nightlyRates.reduce((n,r)=>n+r.amount,0):Math.round((Date.parse(o.end)-Date.parse(o.start))/86400000)*(o.nightly||0)),0)));
 if(id==='netExtras')return escape(currency(stays.reduce((sum,o)=>sum+(o.extraCharges||[]).reduce((n,r)=>n+(r.kind==='charge'?1:-1)*r.quantity*r.unitAmount,0),0)));
 if(['charge','paid','due','deposit'].includes(id)){if(typeof folio!=='function')return '—';return escape(currency(stays.reduce((sum,o)=>sum+(folio(o)[id]||0),0)));}
 if(['adults','children','infants'].includes(id))return String(stays.reduce((sum,o)=>sum+(o[id]??(id==='adults'?1:0)),0));
 if(id==='unitNights'){const nights=stays.map(o=>(Date.parse(o.end+'T00:00:00Z')-Date.parse(o.start+'T00:00:00Z'))/86400000);return nights.every(n=>Number.isInteger(n)&&n>0)?String(nights.reduce((sum,n)=>sum+n,0)):'—';}
 if(id==='guest')return escape(group.guest??first.guest??'');if(id==='id')return escape(group.id);
 if(id==='rooms')return String(stays.length);if(id==='guests')return String(stays.reduce((n,o)=>n+(o.adults??1)+(o.children||0)+(o.infants||0),0));
 if(id==='arrival')return escape(unique('start').sort()[0]||'—');if(id==='departure')return escape(unique('end').sort().at(-1)||'—');
 if(id==='status'||id==='source')return unique(id).map(v=>escape(t(v))).join(' / ')||'—';
 if(id==='allocation')return stays.map(o=>escape(resources.find(r=>r.id===o.resourceId)?.label||t('unassigned'))).join(' / ')||'—';
 if(!allowed.has(id))return '—';return escape(group[id]??unique(id).join(' / ')??'');
}

export const columnsWords={zh:{columnSettings:'字段设置',allColumns:'全选',resetColumns:'恢复默认',columnsMinimum:'请至少选择一项字段。',selectColumns:'选择要展示的订单字段',columnsApply:'确定',columnsCancel:'取消',columnsNote:'仅调整列表显示；不会改变数据访问权限。'},en:{columnSettings:'Columns',allColumns:'Select all',resetColumns:'Reset to default',columnsMinimum:'Select at least one column.',selectColumns:'Choose reservation columns',columnsApply:'Apply',columnsCancel:'Cancel',columnsNote:'Display preferences do not change data access permissions.'},ms:{columnSettings:'Tetapan lajur',allColumns:'Pilih semua',resetColumns:'Pulihkan lalai',columnsMinimum:'Pilih sekurang-kurangnya satu lajur.',selectColumns:'Pilih lajur tempahan',columnsApply:'Guna',columnsCancel:'Batal',columnsNote:'Pilihan paparan tidak mengubah kebenaran akses data.'}};
export function renderOrderTable(groups,selected,context={}){
 const ids=normalizeColumns(selected),t=context.t||((key)=>key),language=context.lang||'en';
 return '<div class="table-wrap"><table><thead><tr>'+ids.map(id=>'<th>'+escape(columnLabel(id,language))+'</th>').join('')+'<th>'+escape(t('action'))+'</th></tr></thead><tbody>'+groups.map(group=>'<tr>'+ids.map(id=>'<td>'+renderColumn(id,group,context)+'</td>').join('')+'<td><button '+(group.parent?'data-open-reservation':'data-open-stay')+'="'+escape(group.id)+'">'+escape(t('details'))+'</button></td></tr>').join('')+'</tbody></table></div>';
}
