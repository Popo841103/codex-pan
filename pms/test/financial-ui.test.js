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
