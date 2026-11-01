import {test} from 'node:test';
import assert from 'node:assert/strict';
import {roomOccupantDetail,registrationRecord,commissionDetail} from '../src/financial-reports.js';

const state=(over={})=>({properties:[{id:'P'}],resources:[{id:'r1',label:'R01',propertyId:'P',productId:'room',roomTypeId:'rt1',atoms:['a1']},
  {id:'r2',label:'R02',propertyId:'P',productId:'room',roomTypeId:'rt2',atoms:['a2']}],
  roomTypes:[{id:'rt1',name:'Double'},{id:'rt2',name:'Twin'}],orders:[],audit:[],...over});
const stay=(over={})=>{const o={id:'o1',propertyId:'P',guest:'TEST guest',source:'direct',status:'reserved',
  productId:'room',roomTypeId:'rt1',resourceId:'r1',start:'2027-01-01',end:'2027-01-03',nightly:10000,
  nightlyRates:[{date:'2027-01-01',amount:10000},{date:'2027-01-02',amount:10000}],
  occupants:[{name:'TEST A',gender:'female'},{name:'TEST B',gender:'male'}],transactions:[],extraCharges:[],...over};
  return o;};
const query=(over={})=>({propertyId:'P',from:'2027-01-01',to:'2027-01-31',source:'all',...over});

test('occupant detail lists one row per person and keeps the party size on each row',()=>{
  const report=roomOccupantDetail(state({orders:[stay()]}),query());
  assert.equal(report.rows.length,2);
  assert.deepEqual(report.rows.map(r=>r.occupant),['TEST A','TEST B']);
  assert.equal(report.rows[0].party,2,'each row carries how many people arrived together');
  assert.equal(report.rows[0].roomTypeName,'Double');
  assert.equal(report.rows[0].resourceLabel,'R01');
  assert.equal(report.totals.people,2);
  assert.equal(report.totals.stays,1,'one booking with two people is one stay');
  assert.equal(report.totals.nights,2);
});

test('occupant detail counts a name that was never entered instead of dropping the person',()=>{
  const report=roomOccupantDetail(state({orders:[stay({occupants:[{name:'TEST A',gender:'female'},{name:'',gender:'male'},null]})]}),query());
  assert.equal(report.rows.length,3,'a person with no name is still a person in the room');
  assert.equal(report.unnamed,2);
  assert.equal(report.rows.filter(r=>r.occupant==='').length,2);
  assert.equal(report.rows.filter(r=>r.gender==='any').length,1,'an unusable record degrades to any rather than a guess');
});

test('occupant detail never lists a cancelled stay',()=>{
  const report=roomOccupantDetail(state({orders:[stay({status:'cancelled',finalCharge:5000,cancelBusinessDate:'2027-01-02'})]}),query());
  assert.equal(report.rows.length,0,'nobody checked into a booking that was cancelled');
  assert.equal(report.totals.people,0);
});

test('occupant detail arrival basis selects by arrival date, overlap basis by any night in the window',()=>{
  const orders=[stay({id:'o1',start:'2026-12-30',end:'2027-01-02',occupants:[{name:'TEST A',gender:'any'}]}),
    stay({id:'o2',start:'2027-01-05',end:'2027-01-06',occupants:[{name:'TEST B',gender:'any'}]})];
  const arrivals=roomOccupantDetail(state({orders}),query());
  assert.deepEqual(arrivals.rows.map(r=>r.orderId),['o2'],'only the stay that arrives inside the window');
  const overlapping=roomOccupantDetail(state({orders}),query(),{basis:'overlap'});
  assert.deepEqual(overlapping.rows.map(r=>r.orderId),['o1','o2'],'o1 was still in house during the window');
  assert.equal(overlapping.rows[0].date,'2027-01-01','the first night inside the window is shown, not the arrival date');
  const exclusive=roomOccupantDetail(state({orders}),query({from:'2027-01-02',to:'2027-01-31'}),{basis:'overlap'});
  assert.deepEqual(exclusive.rows.map(r=>r.orderId),['o2'],'a stay ending on the first day of the window spent no night in it');
});

test('occupant detail rejects an unknown basis',()=>{
  assert.throws(()=>roomOccupantDetail(state({orders:[]}),query(),{basis:'nights'}),/report_input/);
});

test('occupant detail groups by day, gender and room type',()=>{
  const orders=[stay({id:'o1',occupants:[{name:'TEST A',gender:'female'},{name:'TEST B',gender:'female'}]}),
    stay({id:'o2',start:'2027-01-01',end:'2027-01-02',roomTypeId:'rt2',resourceId:'r2',
      nightlyRates:[{date:'2027-01-01',amount:5000}],occupants:[{name:'TEST C',gender:'male'}]})];
  const report=roomOccupantDetail(state({orders}),query());
  assert.deepEqual(report.genders,[{gender:'female',people:2},{gender:'male',people:1}]);
  assert.equal(report.roomTypes.length,2);
  assert.equal(report.roomTypes.find(r=>r.key==='rt1').people,2);
  assert.equal(report.roomTypes.find(r=>r.key==='rt1').stays,1);
  assert.deepEqual(report.daily,[{date:'2027-01-01',people:3}]);
});

test('occupant detail stays inside one property and honours the channel filter',()=>{
  const orders=[stay({id:'o1',occupants:[{name:'TEST A',gender:'any'}]}),
    stay({id:'o2',propertyId:'Q',occupants:[{name:'TEST B',gender:'any'}]}),
    stay({id:'o3',source:'booking',occupants:[{name:'TEST C',gender:'any'}]})];
  const report=roomOccupantDetail(state({orders}),query({source:'direct'}));
  assert.deepEqual(report.rows.map(r=>r.orderId),['o1'],'another property and another channel are both out of scope');
});

test('registration record reports what is missing rather than filling it in',()=>{
  const orders=[stay({id:'o1',occupants:[{name:'TEST A',gender:'female'},{name:'',gender:'male'}]}),
    stay({id:'o2',start:'2027-01-04',end:'2027-01-05',occupants:[{name:'TEST C',gender:'male'}],
      nightlyRates:[{date:'2027-01-04',amount:9000}]})];
  const report=registrationRecord(state({orders}),query());
  assert.equal(report.rows.length,2);
  const [incomplete,complete]=report.rows;
  assert.equal(incomplete.expected,2);
  assert.equal(incomplete.registered,1);
  assert.equal(incomplete.missing,1);
  assert.equal(incomplete.complete,false);
  assert.equal(complete.complete,true);
  assert.equal(report.totals.expected,3);
  assert.equal(report.totals.registered,2);
  assert.equal(report.totals.missing,1);
  assert.equal(report.totals.incomplete,1);
});

test('registration record flags a stay with no names and no room as still incomplete',()=>{
  const report=registrationRecord(state({orders:[stay({occupants:[],resourceId:null})]}),query());
  assert.equal(report.rows[0].expected,0);
  assert.equal(report.rows[0].complete,false,'zero names cannot satisfy a stay that should have occupants');
  assert.equal(report.rows[0].assigned,false);
  assert.equal(report.totals.unassigned,1);
});

test('registration record accepts both bases and rejects an unknown one',()=>{
  const orders=[stay({start:'2026-12-30',end:'2027-01-02'})];
  assert.equal(registrationRecord(state({orders}),query()).rows.length,0);
  assert.equal(registrationRecord(state({orders}),query(),{basis:'overlap'}).rows.length,1);
  assert.throws(()=>registrationRecord(state({orders}),query(),{basis:'week'}),/report_input/);
});

test('commission detail leaves every commission figure empty because none was ever recorded',()=>{
  const orders=[stay({id:'o1',source:'booking',channelOrderId:'CH-1',
    transactions:[{kind:'payment',amount:12000,method:'card',at:'2027-01-01T10:00:00+08:00',actor:'staff'}]}),
    stay({id:'o2',source:'agoda',channelOrderId:'CH-2',start:'2027-01-05',end:'2027-01-06',nightly:8000,
      nightlyRates:[{date:'2027-01-05',amount:8000}],transactions:[]})];
  const report=commissionDetail(state({orders}),query());
  assert.equal(report.rows.length,2);
  for(const row of report.rows){
    assert.equal(row.commission,null,'no commission amount exists, so none is shown');
    assert.equal(row.commissionRecorded,false);
    assert.equal(row.settlement,'unrecorded');
  }
  assert.equal(report.unrecorded,2);
  assert.equal(report.channels.length,2);
  const booking=report.channels.find(c=>c.source==='booking');
  assert.equal(booking.orders,1);
  assert.equal(booking.commission,null);
  assert.equal(booking.unrecorded,1);
  assert.equal(report.totals.charge,28000,'what the channels booked is still worth showing');
  assert.equal(report.totals.paid,12000,'what was received is still worth showing');
  assert.equal(report.totals.outstanding,16000);
});

test('commission detail keeps a cancellation penalty visible and separate from room charges',()=>{
  const orders=[stay({id:'o1',source:'booking',status:'cancelled',finalCharge:4000,cancelBusinessDate:'2027-01-02'})];
  const report=commissionDetail(state({orders}),query());
  assert.equal(report.rows.length,1);
  assert.equal(report.rows[0].room,0,'a cancelled stay earned no room night');
  assert.equal(report.rows[0].penalty,4000,'the penalty is what the channel would bill against');
  assert.equal(report.rows[0].charge,4000);
  assert.equal(report.rows[0].commission,null,'even here no commission was recorded');
});

test('commission detail keeps charges without a business date out of the totals',()=>{
  const orders=[stay({id:'o1',source:'booking',nightlyRates:[{date:'2027-01-01',amount:10000}],
    extraCharges:[{kind:'charge',name:'TEST late fee',quantity:1,unitAmount:2000,businessDate:null}]})];
  const report=commissionDetail(state({orders}),query());
  assert.equal(report.rows[0].charge,10000,'the extra has no business date so it belongs to no period');
  assert.equal(report.unallocated,2000,'and it is reported as unallocated rather than dropped');
});

test('commission detail selects by arrival date inside the window',()=>{
  const orders=[stay({id:'o1',start:'2026-12-30',end:'2027-01-02'}),stay({id:'o2',start:'2027-02-01',end:'2027-02-02'})];
  const report=commissionDetail(state({orders}),query());
  assert.deepEqual(report.rows.map(r=>r.orderId),[]);
  assert.throws(()=>commissionDetail(state({orders}),{propertyId:'P',from:'2027-02-30',to:'2027-01-01'}),/report_input/);
});
