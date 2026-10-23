import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {seed,preview,apply,folio} from '../src/demo-store.js';
// Execute the actual renderer with deterministic state; no copied rendering logic.
const source=readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
const renderer=source.slice(source.indexOf('function calendar('),source.indexOf("\n$('#content').addEventListener('change'"));
function render(state,options={}){
 const context=vm.createContext({state,propertyId:'TEST-KL',lang:'zh',calendarSpan:7,calendarProduct:'all',calendarGender:'all',calendarQuery:'',calendarGroup:'product',calendarStatus:'all',calendarSource:'all',displaySource:true,displayBalance:true,displayAvailability:true,compactRows:false,view:'calendar',sourceValues:['direct','walkin','booking','airbnb','agoda','tripcom','other'],businessDate:()=> '2027-01-30',folio,t:k=>k,can:()=>true,currency:n=>String(n),escape:s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),nextDay:d=>new Date(Date.parse(d+'T00:00:00Z')+86400000).toISOString().slice(0,10),...options});
 vm.runInContext(renderer,context);
 return context.calendar(state.resources.filter(r=>r.propertyId==='TEST-KL'),state.orders,preview(state,'TEST-KL'),'2027-01-30');
}
function book(state,id,start,end,resourceId,guest=id){return apply(state,{type:'create',id,propertyId:'TEST-KL',productId:'room',gender:'any',start,end,resourceId,guest,at:'2027-01-01T00:00:00Z'});}
test('calendar clips a cross-month booking once and allows the departure-day booking',()=>{
 let state=book(seed(),'first','2027-01-28','2027-02-02','TEST-KL-R1');
 state=book(state,'second','2027-02-02','2027-02-04','TEST-KL-R1');
 const html=render(state);
 assert.equal((html.match(/data-id="first"/g)||[]).length,1);
 assert.match(html,/<td colspan="3"><button[^>]*data-id="first"/);
 assert.match(html,/<td colspan="2"><button[^>]*data-id="second"/);
 assert.match(html,/data-cell="TEST-KL-R1" data-day="2027-02-04"/);
});
test('calendar filters by product and gender without hiding the unassigned queue',()=>{
 const state=apply(seed(),{type:'create',id:'pending',propertyId:'TEST-KL',guest:'TEST pending',productId:'bed',gender:'female',start:'2027-01-30',end:'2027-02-01'});
 const html=render(state,{calendarProduct:'bed',calendarGender:'female'});
 assert.doesNotMatch(html,/data-cell="TEST-KL-R/);
 assert.match(html,/data-cell="TEST-KL-B1"/);
 assert.doesNotMatch(html,/data-cell="TEST-KL-B13"/);
 assert.match(html,/data-id="pending"/);
});
test('calendar searches guest names, escapes content and respects CSP without inline styles',()=>{
 const state=book(seed(),'unsafe','2027-01-30','2027-02-01','TEST-KL-R1','<img src=x>');
 const html=render(state,{calendarQuery:'<img'});
 assert.match(html,/&lt;img src=x&gt;/);assert.doesNotMatch(html,/<img/);
 assert.doesNotMatch(html,/data-cell="TEST-KL-R2"/);assert.doesNotMatch(html,/style=/);
 assert.match(html,/data-span="7"/);
});
test('calendar renders one header for each physical dorm in room grouping',()=>{
 const html=render(seed(),{calendarProduct:'bed',calendarGroup:'room'});
 assert.equal((html.match(/scope="rowgroup"/g)||[]).length,5);
 assert.match(html,/TEST-KL-D1/);assert.match(html,/TEST-KL-D5/);
});
