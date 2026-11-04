// Optional in-process DOM verification of "a property starts empty and is filled by hand".
// It drives the same UI modules a browser loads; it does not operate a real browser and
// does not execute SmartOrder. Supply an installed jsdom module path as argv[2].
//
// What this proves, and why it matters: the operator asked that the system never assume
// a room layout. A brand-new property must therefore show the real page with nothing in
// it, the creation control must work, and the operator must be able to type their own
// room type and dorm beds afterwards. Nothing is pre-filled.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {Store} from '../server/store.js';
import {makeServer} from '../server/http.js';
if(!process.argv[2])throw Error('Supply the jsdom module path for this optional verification.');
const {JSDOM,VirtualConsole}=await import(pathToFileURL(resolve(process.argv[2])).href);
const store=new Store(':memory:');
// A fresh installation: an administrator exists, no property does.
const adminName='test-empty-'+randomUUID().slice(0,8),adminPassword=randomUUID();
store.createUser({username:adminName,password:adminPassword,role:'admin',propertyIds:[]});
const server=makeServer(store);await new Promise(done=>server.listen(0,'127.0.0.1',done));
const base=`http://127.0.0.1:${server.address().port}`,realFetch=fetch,errors=[];
let cookie='';
const dom=new JSDOM(readFileSync(new URL('../web/index.html',import.meta.url),'utf8'),{url:base+'/web/',runScripts:'outside-only',virtualConsole:new VirtualConsole().on('jsdomError',error=>errors.push(error))});
dom.window.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};
dom.window.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};
dom.window.confirm=()=>true;
global.window=dom.window;global.document=dom.window.document;global.FormData=dom.window.FormData;global.localStorage=dom.window.localStorage;
global.fetch=async(path,options={})=>{
  const response=await realFetch(new URL(path,base),{...options,signal:AbortSignal.timeout(8000),headers:{Origin:base,Cookie:cookie,...options.headers}});
  if(response.headers.has('set-cookie'))cookie=response.headers.get('set-cookie').split(';')[0];return response;
};
const $=selector=>{const node=document.querySelector(selector);assert(node,`Missing DOM control: ${selector}`);return node;};
const set=(selector,value)=>{const node=$(selector);node.value=value;node.dispatchEvent(new dom.window.Event('input',{bubbles:true}));node.dispatchEvent(new dom.window.Event('change',{bubbles:true}));};
const until=async(check,title)=>{for(let n=0;n<1000;n++){if(check())return;await new Promise(done=>setTimeout(done,10));}throw Error('Timed out: '+title+'; UI message: '+(document.querySelector('#message')?.textContent||'')+'; DOM errors: '+errors.map(e=>e.message).join('; '));};
const text=()=>$('#content').textContent;
const login=async(username,password)=>{
  const response=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password})});
  assert.equal(response.status,200,username+' should be able to sign in');
};
// The inner text of the nth table on the page, so an assertion cannot pass on a name
// that merely appears somewhere else on a long settings page.
const tableRows=nth=>{
  const table=document.querySelectorAll('#content table')[nth];
  return table?[...table.querySelectorAll('tbody tr')].map(row=>[...row.children].map(cell=>cell.textContent.trim())):[];
};
try {
  await login(adminName,adminPassword);
  await import(new URL('../web/app.js?empty-property='+randomUUID(),import.meta.url).href);
  // No property exists, so the workspace must open on the settings page and say so,
  // instead of failing with an access error the administrator cannot act on.
  await until(()=>document.body.dataset.view==='resourcesSettings','the empty installation opens on room type & resource settings');
  assert.match(text(),/新建门店|New property/,'the creation control is offered to an administrator with nothing yet');
  assert.match(text(),/没有房型、没有房间、没有床位|no room type, no room, no bed/,'the page states a new property starts empty');
  assert.match(text(),/尚未|还没有|has no room type|belum mempunyai/,'the empty state is stated plainly');

  // Create the property through the page, exactly as an operator would.
  set('#new-property-name','CO-HUB Hostel · Kuala Lumpur');
  set('#new-property-id','COHUB-KL');
  $('#new-property-save').click();
  await until(()=>$('#property').value==='COHUB-KL','the new property becomes the selected property');
  // Choosing the property is what binds later commands to it; without it the desk would
  // still be aiming at no property at all.
  $('#property').value='COHUB-KL';
  $('#property').dispatchEvent(new dom.window.Event('change',{bubbles:true}));
  await until(()=>$('#property').value==='COHUB-KL','the new property stays selected');
  await until(()=>document.body.dataset.view==='home'||document.body.dataset.view==='resourcesSettings','the property switch reaches the new property workspace');
  $('#global-nav [data-view="resourcesSettings"]').click();
  await until(()=>document.body.dataset.view==='resourcesSettings'&&document.querySelector('#content [data-catalog="type"]'),'resource settings are open for the new property');
  assert.equal(tableRows(0).length,0,'no room type exists until the operator types one');
  assert.equal(tableRows(1).length,0,'no physical room exists until the operator types one');
  assert.equal(tableRows(2).length,0,'no bed or sales unit exists until the operator types one');

  // Room type one: a private room. Room type two: a dorm bed. Both are typed in.
  const saveType=async(zh,en,ms,kind,guests)=>{
    $('#content [data-catalog="type"]').click();
    await until(()=>document.querySelector('#catalog-form'),'the room type dialog opens');
    const form=$('#catalog-form');
    form.elements.name_zh.value=zh;form.elements.name_en.value=en;form.elements.name_ms.value=ms;
    form.elements.maxGuests.value=String(guests);form.elements.sortOrder.value='1';
    // The dialog opens with a default of one guest, so an untouched number field looks
    // filled but contributes nothing to the form data. Set it explicitly.
    for (const node of [form.elements.maxGuests, form.elements.sortOrder])
      node.dispatchEvent(new dom.window.Event('input',{bubbles:true}));
    // The room kind decides whether the type is a private room or a bed; the form
    // itself validates that a bed type allows exactly one guest.
    set('#catalog-form [name=productId]',kind);
    form.querySelector('input[type=checkbox]').checked=true;
    form.dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));
    await new Promise(done=>setTimeout(done,300));
    // A rejected save says so inside the dialog, but the same wording can also come from
    // somewhere else on the page, so the assertion below still has to see the row itself.
    await until(()=>{const message=document.querySelector('#utility-error')?.textContent||'';if(message.includes('检查')||message.includes('input')||message.includes('semak'))throw Error('the room type dialog rejected the save: '+message);return true;},'reporting a dialog rejection');
    await until(()=>tableRows(0).some(row=>row.some(cell=>cell.includes(zh))),'the saved room type is listed: '+zh);
  };
  await saveType('大床房','Queen room','Bilik queen','room',2);
  await saveType('混住床位','Mixed bed','Katil campur','bed',1);
  assert.equal(tableRows(0).length,2,'exactly the two room types that were typed in, nothing added');

  // One private room and one dormitory with three beds, typed in by number.
  const saveRoom=async(label,floor,typeProduct,kind,beds)=>{
    $('#content [data-catalog="room"]').click();
    await until(()=>document.querySelector('#catalog-form'),'the physical room dialog opens');
    const form=$('#catalog-form');
    form.elements.label.value=label;form.elements.floor.value=floor;
    set('#catalog-form [name=kind]',kind);
    await new Promise(done=>setTimeout(done,20));
    // The type list narrows to the kinds that exist for this room kind, so the type is
    // picked by its name rather than by a position in a list that just changed.
    const typeSelect=form.elements.roomTypeId;
    const wanted=kind==='dorm'?'混住床位':'大床房';
    const option=[...typeSelect.options].find(o=>o.textContent.includes(wanted));
    assert.ok(option,'the '+kind+' room type is offered: '+wanted);
    typeSelect.value=option.value;
    typeSelect.dispatchEvent(new dom.window.Event('change',{bubbles:true}));
    if(kind==='dorm')form.elements.bedLabels.value=beds.join('\n');
    form.querySelector('input[type=checkbox]').checked=true;
    form.dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));
    await new Promise(done=>setTimeout(done,300));
    await until(()=>{const message=document.querySelector('#utility-error')?.textContent||'';if(message.includes('检查')||message.includes('input'))throw Error('the room dialog rejected the save: '+message);return true;},'reporting a room dialog rejection');
    await until(()=>tableRows(1).some(row=>row.some(cell=>cell.includes(label))),'the saved room is listed: '+label);
  };
  await saveRoom('A-101','1','room','room',[]);
  await saveRoom('Dorm 1','2','bed','dorm',['B1','B2','B3']);
  assert.deepEqual(tableRows(1).map(row=>row[0]).sort(),['A-101','Dorm 1'],'both rooms are listed by the numbers typed in');
  const units=tableRows(2).map(row=>row[0]).sort();
  assert.deepEqual(units,['A-101','Dorm 1 · B1','Dorm 1 · B2','Dorm 1 · B3'],'one room plus exactly three beds, nothing assumed');
  // A unit that has not been cleaned yet cannot be checked in. The settings page does
  // not print a cleaning badge, so the state is read where it is acted on: the room
  // overview lists every unit, and a dirty one offers the "mark clean" action.
  $('#global-nav [data-view="home"]').click();
  await until(()=>document.body.dataset.view==='home','the room overview opens for the new property');
  await new Promise(done=>setTimeout(done,100));
  // The room list lives under the room section of the page; open it from the main bar.
  $('#global-nav [data-view="calendar"]').click();
  await until(()=>document.body.dataset.view==='calendar','the room calendar opens for the new property');
  await until(()=>document.querySelector('#nav [data-view="tasks"]'),'the room section offers its room list');
  $('#nav [data-view="tasks"]').click();
  await until(()=>document.body.dataset.view==='tasks','the room overview lists the new units');
  const taskText=text();
  for(const label of ['A-101','Dorm 1 · B1','Dorm 1 · B2','Dorm 1 · B3'])
    assert.ok(taskText.includes(label),'housekeeping lists the new unit: '+label);
  assert.match(taskText,/待清洁|Needs cleaning|perlu dibersihkan/,'every new unit needs cleaning before check-in');

  console.log('Empty property DOM passed: a fresh installation opens on settings, the operator creates a property with no inventory, then types its own room types, one room and three beds with nothing assumed.');
}finally {
  global.fetch=realFetch;server.closeAllConnections();await new Promise(done=>server.close(done));store.close();dom.window.close();
}
