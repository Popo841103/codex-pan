// Inclusive pricing dates; ISO weekday Monday=1, Sunday=7. No inventory mutation.
export function rateDates(ranges,weekdays){
 const fail=()=>{throw new Error('rate_dates');};
 const parse=s=>{if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))fail();const n=Date.parse(s+'T00:00:00Z');if(!Number.isFinite(n)||new Date(n).toISOString().slice(0,10)!==s)fail();return n;};
 if(!Array.isArray(ranges)||!ranges.length||ranges.length>20||!Array.isArray(weekdays)||!weekdays.length||weekdays.some(n=>!Number.isInteger(n)||n<1||n>7))fail();
 const days=new Set(),selected=new Set(weekdays);let scanned=0;
 for(const r of ranges){if(!r)fail();const from=parse(r.from),to=parse(r.to);if(to<from||(to-from)/86400000>=730)fail();for(let n=from;n<=to;n+=86400000){if(++scanned>14600)fail();const date=new Date(n);if(selected.has(date.getUTCDay()||7))days.add(date.toISOString().slice(0,10));}}
 if(days.size>730)fail();return [...days].sort();
}
