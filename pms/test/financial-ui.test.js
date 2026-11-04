import test from 'node:test';import assert from 'node:assert/strict';import {financialPage} from '../web/financial-ui.js';
const options={kind:'cashflow',propertyId:'P',from:'2027-01-01',to:'2027-01-03',sources:['booking'],t:x=>x,currency:x=>'MYR '+x};
test('financial page filters and links preserve safe scoped ledger details',()=>{const html=financialPage({orders:[{id:'<id>',propertyId:'P',guest:'<script>',transactions:[{kind:'payment',method:'cash',amount:100,at:'2027-01-01T00:00:00Z'}]}]},options);assert.match(html,/data-finance-filter="from"/);assert.match(html,/data-open-stay="&lt;id&gt;"/);assert.doesNotMatch(html,/<script>/);assert.match(html,/MYR 100/);});
test('invalid date range remains editable and shows an error instead of a partial total',()=>{const html=financialPage({orders:[]},{...options,from:'2027-02-30'});assert.match(html,/role="alert"/);assert.match(html,/report_input/);assert.match(html,/data-finance-filter/);});

test('folio history shows retained reconciliation snapshots and escapes reopening reasons',async()=>{const {renderFolioHistory}=await import('../web/financial-ui.js');const html=renderFolioHistory({folioEvents:[{type:'settle',at:'2027-01-01T10:00:00Z',actor:'TEST',charge:10000,paid:10000,deposit:0},{type:'reopen',at:'2027-01-02T10:00:00Z',actor:'<ADMIN>',reason:'<script>correction</script>'}]},{t:k=>k,currency:n=>'MYR '+n});assert.match(html,/MYR 10000/);assert.match(html,/MYR 0/);assert.match(html,/&lt;ADMIN&gt;/);assert.match(html,/&lt;script&gt;correction/);assert.doesNotMatch(html,/<script>/);assert.match(html,/2027-01-02T10:00:00Z/);assert.match(renderFolioHistory({},{t:k=>k}),/folioHistoryEmpty/);});

test('comparison view retains invalid editable ranges and supplies scoped period drill controls',async()=>{const {comparisonPage}=await import('../web/financial-ui.js');const periods={current:{from:'2027-01-01',to:'2027-01-02'},month:{from:'2026-12-07',to:'2026-12-08'},year:{from:'2026-01-03',to:'2026-01-04'}};const opts={propertyId:'P',periods,source:'<bad>',sources:['<bad>'],t:k=>k,currency:n=>'MYR '+n};const html=comparisonPage({orders:[]},opts);assert.match(html,/data-finance-filter="monthFrom"/);assert.match(html,/value="2026-12-07"/);assert.match(html,/data-compare-drill="business" data-period="month"/);assert.match(html,/data-compare-drill="cashflow" data-period="year"/);assert.doesNotMatch(html,/<bad>/);const invalid=comparisonPage({orders:[]},{...opts,periods:{...periods,month:{from:'2026-12-08',to:'2026-12-07'}}});assert.match(invalid,/role="alert"/);assert.match(invalid,/data-finance-filter="monthFrom"/);assert.doesNotMatch(invalid,/data-compare-drill/);});

test('cashier operator choices never expose foreign property actors',()=>{const mk=(propertyId,actor)=>({id:actor,propertyId,transactions:[{kind:'payment',actor,at:'2027-01-01T00:00:00Z',amount:1}]});const html=financialPage({orders:[mk('P','<LOCAL>'),mk('X','FOREIGN-OPERATOR')]},{...options,operator:'actor:<LOCAL>'});assert.match(html,/data-finance-filter="operator"/);assert.match(html,/&lt;LOCAL&gt;/);assert.doesNotMatch(html,/FOREIGN-OPERATOR/);});

test('other charge and penalty pages escape guest, item and reason text and stay editable on a bad range',async()=>{
 const {extraChargePage,cancellationPenaltyPage}=await import('../web/financial-ui.js');
 const opts={propertyId:'P',from:'2027-01-01',to:'2027-01-03',sources:['direct'],t:k=>k,currency:n=>'MYR '+n};
 const live={id:'<id>',propertyId:'P',guest:'<script>',source:'direct',status:'confirmed',start:'2027-01-01',end:'2027-01-02',nightly:10000,
  extraCharges:[{kind:'charge',name:'<item>',quantity:1,unitAmount:500,businessDate:'2027-01-02'}]};
 const html=extraChargePage({orders:[live]},opts);
 assert.match(html,/data-open-stay="&lt;id&gt;"/);assert.match(html,/&lt;item&gt;/);
 assert.doesNotMatch(html,/<script>/);assert.doesNotMatch(html,/<item>/);assert.match(html,/MYR 500/);
 const badExtra=extraChargePage({orders:[]},{...opts,from:'2027-02-30'});
 assert.match(badExtra,/role="alert"/);assert.match(badExtra,/data-finance-filter="from"/);assert.doesNotMatch(badExtra,/MYR 0/);
 const cancelled={id:'<id2>',propertyId:'P',guest:'<script>',source:'direct',status:'cancelled',finalCharge:700,
  cancelBusinessDate:'2027-01-02',cancelReason:'<reason>',nightlyRates:[{date:'2027-01-01',amount:10000}],transactions:[],
  cancellationPolicy:{kind:'partial',percent:5000,basis:'total'}};
 const penalty=cancellationPenaltyPage({orders:[cancelled]},opts);
 assert.match(penalty,/data-open-stay="&lt;id2&gt;"/);assert.match(penalty,/&lt;reason&gt;/);assert.doesNotMatch(penalty,/<script>/);
 assert.match(penalty,/MYR 700/);assert.match(penalty,/50\.00%/,'the stored policy is shown as it was booked');
 const badPenalty=cancellationPenaltyPage({orders:[]},{...opts,from:'2027-02-30'});
 assert.match(badPenalty,/role="alert"/);assert.match(badPenalty,/data-finance-filter="from"/);
 const noPolicy=cancellationPenaltyPage({orders:[{...cancelled,cancellationPolicy:undefined}]},opts);
 assert.match(noPolicy,/policyMissing/,'a stay without a stored policy says so instead of guessing one');
});

test('occupant, registration and commission pages escape names, keep filters editable and never invent a commission',async()=>{
 const {roomOccupantPage,registrationRecordPage,commissionPage}=await import('../web/financial-ui.js');
 const opts={propertyId:'P',from:'2027-01-01',to:'2027-01-03',sources:['direct','booking'],t:k=>k,currency:n=>'MYR '+n};
 const live={id:'<id>',propertyId:'P',guest:'<script>',source:'booking',channelOrderId:'<ch>',status:'checked_in',
  productId:'room',roomTypeId:'rt',resourceId:'r1',start:'2027-01-01',end:'2027-01-03',nightly:10000,
  nightlyRates:[{date:'2027-01-01',amount:10000},{date:'2027-01-02',amount:10000}],
  occupants:[{name:'<person>',gender:'female'},{name:'  ',gender:'male'}],transactions:[],extraCharges:[]};
 const state={orders:[live],resources:[{id:'r1',label:'R01'}],roomTypes:[{id:'rt',name:'<type>'}],audit:[]};

 const occupants=roomOccupantPage(state,opts);
 assert.match(occupants,/data-open-stay="&lt;id&gt;"/);
 assert.match(occupants,/&lt;person&gt;/,'an occupant name is escaped like any other guest text');
 assert.doesNotMatch(occupants,/<person>/);assert.doesNotMatch(occupants,/<script>/);
 assert.match(occupants,/occupantUnnamed/,'a blank name is shown as missing, not dropped');
 assert.match(occupants,/data-finance-filter="basis"/,'the placement picker is present');
 const badOcc=roomOccupantPage({orders:[],resources:[],roomTypes:[]},{...opts,from:'2027-02-30'});
 assert.match(badOcc,/role="alert"/);assert.match(badOcc,/data-finance-filter="from"/,'the range stays editable when the report refuses it');

 const registration=registrationRecordPage(state,opts);
 assert.match(registration,/&lt;type&gt;/);assert.match(registration,/regIncompleteRow/,'one name is still missing');
 const badReg=registrationRecordPage({orders:[],resources:[],roomTypes:[]},{...opts,from:'2027-02-30'});
 assert.match(badReg,/role="alert"/);assert.match(badReg,/data-finance-filter="to"/);

 const commission=commissionPage(state,opts);
 assert.match(commission,/data-open-stay="&lt;id&gt;"/);assert.match(commission,/&lt;ch&gt;/);
 assert.doesNotMatch(commission,/<script>/);
 assert.match(commission,/MYR 20000/,'the room charge is still worth showing');
 assert.match(commission,/commissionNotRecorded/,'the commission column says it is not recorded');
 assert.doesNotMatch(commission,/MYR 0\.00/,'no zero commission is printed where none was ever recorded');
 assert.match(commission,/<th>commissionOrders<\/th><td>1<\/td>/,'booking and night counts stay plain integers');
 assert.doesNotMatch(commission,/<th>commissionOrders<\/th><td>MYR/,'a count is never formatted as money');
 const badCom=commissionPage({orders:[],resources:[],roomTypes:[]},{...opts,from:'2027-02-30'});
 assert.match(badCom,/role="alert"/);assert.match(badCom,/data-finance-filter="from"/);
});

test('recording a channel commission is permissioned, and a recorded invoice is shown without inventing a rate',async()=>{
 const {commissionPage}=await import('../web/financial-ui.js');
 const opts={propertyId:'P',from:'2027-01-01',to:'2027-01-03',sources:['booking'],t:k=>k,currency:n=>'MYR '+n};
 const order={id:'o1',propertyId:'P',guest:'<guest>',source:'booking',channelOrderId:'<ch>',status:'confirmed',
  start:'2027-01-01',end:'2027-01-03',nightly:10000,
  nightlyRates:[{date:'2027-01-01',amount:10000},{date:'2027-01-02',amount:10000}],
  transactions:[],extraCharges:[],
  commission:{amount:1234,reference:'<inv>',note:'',at:'2027-01-02T00:00:00Z',actor:'finance',settledAt:null,settledBy:null}};
 const state={orders:[order],resources:[],roomTypes:[],audit:[]};
 const readonly=commissionPage(state,opts);
 assert.match(readonly,/commissionReadOnly/,'without permission the page explains who may record');
 assert.doesNotMatch(readonly,/id="commission-form"/,'a viewer is never offered the recording form');
 const editable=commissionPage(state,{...opts,can:()=>true});
 assert.match(editable,/id="commission-form"/);
 for(const name of ['orderId','amount','reference','note','settled'])assert.match(editable,new RegExp('name="'+name+'"'));
 assert.match(editable,/commissionRateNote/,'the form says to use the invoiced figure, not an estimate');
 assert.match(editable,/MYR 1234/,'the invoiced amount is shown');
 assert.match(editable,/&lt;inv&gt;/,'the invoice reference is escaped');
 assert.doesNotMatch(editable,/<inv>/);
 assert.match(editable,/commissionRecorded/,'an unsettled recording is labelled recorded, not settled');
 assert.match(editable,/<th>commissionAmount<\/th><td>MYR 1234<\/td>/,'the total is the recorded figure, not zero');
 const settled=commissionPage({...state,orders:[{...order,commission:{...order.commission,settledAt:'2027-01-03T00:00:00Z',settledBy:'finance'}}]},{...opts,can:()=>true});
 assert.match(settled,/<td>commissionSettled<\/td>/,'the settlement column follows the recorded state');
});

test('commission history reads the append-only audit and keeps both sides of a correction visible',async()=>{
 const {commissionPage}=await import('../web/financial-ui.js');
 const opts={propertyId:'P',from:'2027-01-01',to:'2027-01-03',sources:['booking'],t:k=>k,currency:n=>'MYR '+n};
 const order={id:'o1',propertyId:'P',guest:'<guest>',source:'booking',status:'checked_in',
  start:'2027-01-01',end:'2027-01-03',nightly:10000,
  nightlyRates:[{date:'2027-01-01',amount:10000},{date:'2027-01-02',amount:10000}],
  transactions:[],extraCharges:[],
  commission:{amount:1500,reference:'INV-rev',note:'',at:'2027-01-03T00:00:00Z',actor:'finance',
   settledAt:'2027-01-03T00:00:00Z',settledBy:'finance'}};
 const audit=[
  {id:'a2',propertyId:'P',type:'commission_save',orderId:'o1',actor:'finance',at:'2027-01-03T00:00:00Z',
   commissionChange:{before:{amount:1234,reference:'<inv>',settledAt:null},after:order.commission}},
  {id:'a1',propertyId:'P',type:'commission_save',orderId:'o1',actor:'finance',at:'2027-01-02T00:00:00Z',
   commissionChange:{before:null,after:{amount:1234,reference:'<inv>',settledAt:null}}},
  {id:'a3',propertyId:'X',type:'commission_save',orderId:'foreign',actor:'other',at:'2027-01-04T00:00:00Z',
   commissionChange:{before:null,after:{amount:9999,reference:'FOREIGN-REF',settledAt:null}}},
  {id:'a4',propertyId:'P',type:'payment',orderId:'o1',actor:'ops',at:'2027-01-01T00:00:00Z'}
 ];
 const state={orders:[order],resources:[],roomTypes:[],audit};
 const html=commissionPage(state,opts);
 assert.match(html,/commissionHistory/, 'the history panel is present for a read-only viewer too');
 assert.match(html,/<th>commissionHistoryBefore<\/th>/);
 assert.match(html,/<th>commissionHistoryAfter<\/th>/);
 assert.match(html,/MYR 1234/,'the previous amount survives the correction');
 assert.match(html,/MYR 1500/,'the corrected amount is shown as the after side');
 assert.match(html,/INV-rev/);
 assert.match(html,/&lt;inv&gt;/,'an invoice reference in the audit is escaped');
 assert.doesNotMatch(html,/<inv>/);
 assert.match(html,/&lt;guest&gt;/,'the booking label is escaped');
 assert.match(html,/commissionSettled/,'a settled correction is labelled settled');
 assert.ok((html.match(/<em>commissionNotRecorded<\/em>/g)||[]).length>=1,'a first entry shows there was no earlier commission');
 assert.doesNotMatch(html,/FOREIGN-REF/,'another property\'s commission audit never leaks into this page');
 assert.doesNotMatch(html,/MYR 9999/);
 assert.match(html,/2027-01-03T00:00:00Z/);
 const empty=commissionPage({...state,audit:[]},opts);
 assert.match(empty,/commissionHistoryEmpty/,'an empty history says so instead of printing a zero row');
});
