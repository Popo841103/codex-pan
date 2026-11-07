import test from 'node:test';
import assert from 'node:assert/strict';
import * as reports from '../src/financial-reports.js';
test('AR historical cutoff preserves ownership and balance before later receipts and transfers',()=>{
 const propertyId='P';
 const event=(type,businessDate,fields)=>({type,businessDate,propertyId,...fields});
 const state={orders:[],arEvents:[
 event('ar_account_save',null,{accountId:'a',name:'A'}),
 event('ar_account_save',null,{accountId:'b',name:'B'}),
 event('ar_post','2027-01-01',{itemId:'i',accountId:'a',amount:10000,dueDate:'2027-01-10'}),
 event('ar_transfer','2027-02-01',{itemId:'i',accountId:'a',targetId:'b',amount:10000}),
 event('ar_write_off','2027-02-03',{id:'r',accountId:'b',amount:3000,allocations:[{itemId:'i',amount:3000}]}),
 event('ar_undo_write_off','2027-02-05',{accountId:'b',amount:3000,reverses:'r',allocations:[{itemId:'i',amount:3000}]}),
 {...event('ar_post','2027-01-01',{itemId:'foreign',accountId:'a',amount:99999,dueDate:'2027-01-01'}),propertyId:'X'}]};
 const q={propertyId,from:'2027-01-01',to:'2027-01-31'};
 const jan=reports.receivableReports(state,q);
 assert.deepEqual(jan.aging.map(x=>[x.accountId,x.open,x.days]),[['a',10000,21]]);
 assert.deepEqual(jan.balances.map(x=>[x.accountId,x.closing]),[['a',10000],['b',0]]);
 const feb=reports.receivableReports(state,{...q,from:'2027-02-01',to:'2027-02-03'});
 assert.deepEqual(feb.balances.map(x=>[x.accountId,x.opening,x.closing]),[['a',10000,0],['b',0,7000]]);
 assert.equal(feb.allocations[0].amount,3000);
 assert.equal(reports.receivableReports(state,{...q,to:'2027-02-05'}).aging[0].open,10000);
 assert.throws(()=>reports.receivableReports(state,{...q,to:'2027-02-30'}),/report_input/);
});
