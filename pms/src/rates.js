import {rateDates} from './rate-dates.js';
const fail=()=>{throw Error('rate_input');};
export function changeRates(s,c){
 s.ratePlans??=[];s.rateCells??=[];s.rateChanges??=[];
 const types=c.roomTypeIds;if(!Array.isArray(types)||!types.length||types.length>100||new Set(types).size!==types.length||types.some(id=>!s.roomTypes.some(t=>t.id===id&&t.propertyId===c.propertyId&&!t.archived)))fail();
 if(c.type==='rate_plan_save'){if(typeof c.code!=='string'||! /^[A-Za-z0-9]{1,8}$/.test(c.code)||typeof c.name!=='string'||!c.name.trim()||c.name.length>100)fail();const old=s.ratePlans.find(p=>p.propertyId===c.propertyId&&p.code===c.code);if(old)fail();s.ratePlans.push({propertyId:c.propertyId,code:c.code,name:c.name.trim(),roomTypeIds:[...types],kind:'independent'});return;}
 const plan=s.ratePlans.find(p=>p.propertyId===c.propertyId&&p.code===c.planCode);if(!plan||types.some(id=>!plan.roomTypeIds.includes(id)))fail();
 for(const key of ['minStay','maxStay'])if(c[key]!==undefined&&(!Number.isInteger(c[key])||c[key]<0||c[key]>366))fail();
 for(const key of ['cta','ctd'])if(c[key]!==undefined&&typeof c[key]!=='boolean')fail();
 const dates=rateDates(c.ranges,c.weekdays);if(!dates.length||dates.length*types.length>10000)fail();
 const mode=c.priceMode??'fixed';if(!['fixed','delta','percent'].includes(mode)||!Number.isSafeInteger(c.amount)||Math.abs(c.amount)>100000000||mode==='fixed'&&c.amount<0||mode==='percent'&&c.amount< -10000)fail();
 if(!['unchanged','open','closed'].includes(c.sale??'unchanged'))fail();
 for(const roomTypeId of types)for(const date of dates){const index=s.rateCells.findIndex(r=>r.propertyId===c.propertyId&&r.planCode===c.planCode&&r.roomTypeId===roomTypeId&&r.date===date);const before=index<0?null:structuredClone(s.rateCells[index]);if(mode!=='fixed'&&!before)throw Error('rate_missing');const amount=mode==='fixed'?c.amount:mode==='delta'?before.amount+c.amount:Number((BigInt(before.amount)*BigInt(10000+c.amount)+5000n)/10000n);if(!Number.isSafeInteger(amount)||amount<0||amount>100000000)fail();const after={propertyId:c.propertyId,planCode:c.planCode,roomTypeId,date,amount,sale:c.sale==='unchanged'||!c.sale?(before?.sale||'open'):c.sale};for(const key of ['minStay','maxStay','cta','ctd'])after[key]=c[key]??before?.[key]??(key==='cta'||key==='ctd'?false:0);if(after.minStay&&after.maxStay&&after.minStay>after.maxStay)fail();if(index<0)s.rateCells.push(after);else s.rateCells[index]=after;s.rateChanges.push({propertyId:c.propertyId,batchId:c.id,priceMode:mode,adjustment:c.amount,at:c.at,actor:c.actor,before,after:structuredClone(after)});}
}

export function quoteRateStay(state,propertyId,stay){
 if(!stay.ratePlanCode)return stay;
 const fail=code=>{throw Error(code);};const plan=(state.ratePlans||[]).find(p=>p.propertyId===propertyId&&p.code===stay.ratePlanCode&&p.roomTypeIds.includes(stay.roomTypeId));if(!plan)fail('rate_plan');
 const dates=rateDates([{from:stay.start,to:stay.end}],[1,2,3,4,5,6,7]);if(dates.length<2||dates.at(-1)!==stay.end)fail('rate_dates');dates.pop();
 const cell=date=>(state.rateCells||[]).find(r=>r.propertyId===propertyId&&r.planCode===plan.code&&r.roomTypeId===stay.roomTypeId&&r.date===date);
 const rows=dates.map(cell);if(rows.some(r=>!r))fail('rate_missing');if(rows.some(r=>r.sale==='closed'))fail('rate_closed');if(rows[0].cta)fail('rate_arrival');if(cell(stay.end)?.ctd)fail('rate_departure');if(rows[0].minStay&&dates.length<rows[0].minStay||rows[0].maxStay&&dates.length>rows[0].maxStay)fail('rate_length');
 return {...stay,nightly:rows[0].amount,nightlyRates:rows.map(r=>({date:r.date,amount:r.amount}))};
}
