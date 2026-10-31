import {quoteRateStay} from './rates.js';
// Parent reservations group existing single-unit stays. Inventory and money stay
// on each child; parent totals are derived and never posted a second time.
export class ReservationError extends Error {}
const fail = code => { throw new ReservationError(code); };
const text = (v,max) => {if(typeof v!=='string'||v.length>max)fail('reservation_input');return v.trim();};
const money = v => {if(!Number.isSafeInteger(v)||v<0||v>100000000)fail('amount');return v;};
export function stayDays(start,end) {
  const valid=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d+'T00:00:00Z'))&&new Date(d+'T00:00:00Z').toISOString().slice(0,10)===d;
  const n=(Date.parse(end)-Date.parse(start))/86400000;
  if(!valid(start)||!valid(end)||n<1||n>366)fail('date_range');
  return Array.from({length:n},(_,i)=>new Date(Date.parse(start+'T00:00:00Z')+i*86400000).toISOString().slice(0,10));
}
export function prepareStay(state,propertyId,c) {
  const days=stayDays(c.start,c.end),nightly=money(c.nightly??0);
  const roomType=state.roomTypes.find(t=>t.propertyId===propertyId&&t.id===c.roomTypeId);
  if(!roomType||roomType.productId!==c.productId)fail('scope');
  const numbers={};for(const k of ['adults','children','infants']){numbers[k]=c[k]??(k==='adults'?1:0);if(!Number.isSafeInteger(numbers[k])||numbers[k]<0||numbers[k]>20)fail('occupancy');}
  const count=numbers.adults+numbers.children+numbers.infants;
  // Infants count toward capacity until a property exemption policy is implemented.
  if(numbers.adults<1||count>roomType.maxGuests||c.productId==='bed'&&count!==1)fail('occupancy');
  if(!Array.isArray(c.occupants)||c.occupants.length!==count)fail('occupancy');
  const occupants=c.occupants.map(p=>{if(!p||!['female','male','any'].includes(p.gender)||roomType.gender!=='any'&&p.gender!==roomType.gender)fail('occupancy');return {name:text(p.name??'',100),gender:p.gender};});
  const clock=(v,fallback)=>{v??=fallback;if(typeof v!=='string'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(v))fail('reservation_input');return v;};
  const inputRates=c.nightlyRates??days.map(date=>({date,amount:nightly}));
  if(!Array.isArray(inputRates)||inputRates.length!==days.length)fail('rates');
  const nightlyRates=inputRates.map((r,i)=>{if(!r||r.date!==days[i])fail('rates');return {date:r.date,amount:money(r.amount)};});
  if(!Array.isArray(c.extraCharges??[])||(c.extraCharges??[]).length>20)fail('reservation_input');
  const extraCharges=(c.extraCharges||[]).map(r=>{if(!r||!['charge','discount'].includes(r.kind)||!Number.isSafeInteger(r.quantity)||r.quantity<1||r.quantity>100)fail('reservation_input');const name=text(r.name??'',100);if(!name)fail('reservation_input');return {kind:r.kind,name,quantity:r.quantity,unitAmount:money(r.unitAmount),businessDate:c.start};});
  money(nightlyRates.reduce((n,r)=>n+r.amount,0)+extraCharges.reduce((n,r)=>n+(r.kind==='charge'?1:-1)*r.quantity*r.unitAmount,0));
  return {...numbers,occupants,arrivalTime:clock(c.arrivalTime,'15:00'),departureTime:clock(c.departureTime,'12:00'),nightlyRates,extraCharges,nightly};
}
export function createReservation(state,c,apply,preview) {
  const {propertyId}=c;
  if(!Array.isArray(c.stays)||!c.stays.length||c.stays.length>30||!['reserve','checkin'].includes(c.mode)||!['individual','company'].includes(c.bookingKind)||typeof c.autoAssign!=='boolean')fail('reservation_input');
  const guest=text(c.guest??'',100),companyName=text(c.companyName??'',100);if(!guest)fail('guest');if(c.bookingKind==='company'&&!companyName)fail('reservation_input');
  const channelOrderId=text(c.channelOrderId??'',100);
  if(channelOrderId&&state.orders.some(o=>o.propertyId===propertyId&&(o.source||'direct')===(c.source||'direct')&&o.channelOrderId===channelOrderId))fail('duplicate_channel');
  if(c.email&&(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email)))fail('reservation_input');
  const businessTime=typeof c.date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(c.date)?Date.parse(c.date+'T00:00:00Z'):NaN;
  if(!Number.isFinite(businessTime)||new Date(businessTime).toISOString().slice(0,10)!==c.date)fail('date_range');
  if((state.reservations||[]).some(r=>r.id===c.id))fail('duplicate');
  if(!Array.isArray(c.reminders??[])||(c.reminders??[]).length>10)fail('reservation_input');
  const reminders=(c.reminders||[]).map(r=>{const value=text(r?.text??'',200),when=text(r?.when??'',16);if(!value||!/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(when)||!Number.isFinite(Date.parse(when+':00Z'))||new Date(when+':00Z').toISOString().slice(0,16)!==when)fail('reservation_input');return {text:value,when,status:'internal_note'};});
  let next=structuredClone(state);const stayIds=[];
  for(const [i,stay] of c.stays.entries()) {
    if(!stay||typeof stay!=='object')fail('reservation_input');
    const quoted=quoteRateStay(next,propertyId,stay);const detail=prepareStay(next,propertyId,quoted),id=`${c.id}-stay-${i+1}`;
    next=apply(next,{type:'create',propertyId,id,at:c.at,actor:c.actor,date:c.date,guest,
      productId:stay.productId,roomTypeId:stay.roomTypeId,gender:stay.gender,start:stay.start,end:stay.end,resourceId:stay.resourceId||null,group:stay.group||'',nightly:detail.nightly,
      source:c.source,email:c.email,phone:c.phone,country:c.country,guestLanguage:c.guestLanguage,channelOrderId,channelNotes:'',notes:c.notes,color:c.color});
    Object.assign(next.orders.find(o=>o.id===id),detail,{reservationId:c.id,createdBusinessDate:c.date,...(stay.ratePlanCode?{ratePlanCode:stay.ratePlanCode}:{})});stayIds.push(id);
  }
  if(c.autoAssign||c.mode==='checkin') {
    const assignments=preview(next,propertyId);
    for(const id of stayIds)if(!next.orders.find(o=>o.id===id).resourceId)next=apply(next,{type:'assign',propertyId,id:`${c.id}-assign-${id}`,orderId:id,resourceId:assignments.find(p=>p.demandId===id).resourceId,at:c.at});
  }
  if(c.mode==='checkin')for(const id of stayIds) {
    if(next.orders.find(o=>o.id===id).occupants.some(p=>!p.name))fail('occupant_names');
    next=apply(next,{type:'checkin',propertyId,orderId:id,id:`${c.id}-checkin-${id}`,at:c.at,date:c.date});
  }
  next.reservations.push({id:c.id,propertyId,guest,source:c.source||'direct',bookingKind:c.bookingKind,companyName,stayIds,reminders,createdAt:c.at,createdBy:c.actor||'local'});
  return next;
}
export function reservationSummary(state,reservation,folio) {
  const stays=state.orders.filter(o=>o.propertyId===reservation.propertyId&&reservation.stayIds.includes(o.id));
  const totals={charge:0,paid:0,due:0,deposit:0};for(const stay of stays){const f=folio(stay);for(const k of Object.keys(totals))totals[k]+=f[k];}
  return {stays,totals,unsettledStays:stays.filter(o=>{const f=folio(o);return f.due!==0||f.deposit!==0;}).length,counts:Object.fromEntries(['confirmed','checked_in','checked_out','cancelled'].map(s=>[s,stays.filter(o=>o.status===s).length]))};
}
