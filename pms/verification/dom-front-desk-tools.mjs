// Optional in-process DOM verification. This does not operate a browser or the
// user's logged-in sessions. Supply an installed jsdom module path as argv[2].
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {Store} from '../server/store.js';
import {makeServer} from '../server/http.js';
if(!process.argv[2])throw Error('Supply the jsdom module path for this optional verification.');
const {JSDOM,VirtualConsole}=await import(pathToFileURL(resolve(process.argv[2])).href);
const store=new Store(':memory:');store.seedTestProperties();
const username='test-dom-'+randomUUID().slice(0,8),password=randomUUID();
const operator=store.createUser({username,password,role:'admin',propertyIds:['TEST-KL']});
const server=makeServer(store);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
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
const set=(selector,value)=>{const node=$(selector);if(node.type==='checkbox')node.checked=value;else node.value=value;node.dispatchEvent(new dom.window.Event('input',{bubbles:true}));node.dispatchEvent(new dom.window.Event('change',{bubbles:true}));};
const until=async(check,title)=>{for(let n=0;n<1000;n++){if(check())return;await new Promise(resolve=>setTimeout(resolve,10));}throw Error('Timed out: '+title+'; UI error: '+(document.querySelector('#reservation-error')?.textContent||'')+'; DOM errors: '+errors.map(e=>e.message).join('; '));};
try {


  const action=(type,fields={})=>store.command(operator,{key:randomUUID(),expectedRevision:store.read(operator).revisions['TEST-KL'],command:{type,propertyId:'TEST-KL',...fields}});
  action('bulk_block',{resourceIds:['TEST-KL-R1'],start:'2027-01-15',end:'2027-01-17',blockType:'out_of_service',reason:'TEST maintenance record'});
  action('bulk_unblock',{resourceIds:['TEST-KL-R1'],start:'2027-01-15',end:'2027-01-17'});
  action('bulk_clean',{resourceIds:['TEST-KL-R1'],cleaning:'dirty'});
  action('bulk_clean',{resourceIds:['TEST-KL-R1'],cleaning:'clean'});
  const stay=action('create',{guest:'TEST front desk tools',productId:'room',gender:'any',resourceId:'TEST-KL-R1',start:'2027-01-20',end:'2027-01-21',nightly:0});
  const login=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password})});assert.equal(login.status,200);
  await import(new URL('../web/app.js?front-desk-tools='+randomUUID(),import.meta.url).href);
  $('[data-property="TEST-KL"]').click();
  const calendar=()=>$('#global-nav [data-view="calendar"]').click();
  const close=()=>$('#utility-close').click();
  const read=()=>store.read(operator);
  const revision=()=>read().revisions['TEST-KL'];
  calendar();
  // Each preview must remain isolated from saving, printing and external integrations.
  dom.window.print=()=>assert.fail('Preview must not call print');

  const baseline=revision();
  const openTool=name=>$('[data-cal-tool="'+name+'"]').click();
  openTool('room-logs');
  const log=$('[data-room-status-logs]');
  assert.equal(log.querySelectorAll('thead th').length,8);
  assert.equal(log.querySelectorAll('tbody tr').length,4);
  assert(log.textContent.includes('TEST maintenance record'));
  assert(log.textContent.includes(username));
  set('[data-room-status-logs] [name="action"]','out_of_service');
  assert.equal(log.querySelectorAll('tbody tr').length,1);
  set('[data-room-status-logs] [name="room"]','R01');
  assert.equal(log.querySelectorAll('tbody tr').length,1);
  close();

  openTool('smart-lock');
  assert($('[data-smart-lock]'));
  $('[data-lock-tab="common"]').click();
  assert.equal($('[data-lock-tab="common"]').getAttribute('aria-selected'),'true');
  assert.equal(document.querySelector('[data-smart-lock] form button[type="submit"]'),null);
  close();

  openTool('batch-print');
  set('[data-batch-print] [name="date"]','2027-01-20');
  assert.equal($('[data-registration-count]').textContent.trim(),'1');
  set('[data-batch-print] [name="date"]','2027-01-21');
  assert.equal($('[data-registration-count]').textContent.trim(),'0');
  close();

  set('#calendar-date','2027-01-20');
  $('[data-action="details"][data-id="'+stay.id+'"]').click();
  for(const [key,marker] of [['scheduled','scheduled-task'],['print','print-center'],['self-checkin','self-checkin-preview']]){
    if(!$('#detail-dialog').open)$('[data-action="details"][data-id="'+stay.id+'"]').click();
    $('[data-stay-preview="'+key+'"]').click();
    assert($('[data-'+marker+']'));
    if(key==='print'){
      $('[data-print-tab="registration"]').click();
      assert.equal($('[data-print-tab="registration"]').getAttribute('aria-selected'),'true');
    }
    close();
  }
  assert.equal(revision(),baseline);
  if($('#detail-dialog').open)$('#detail-close').click();

  for(const [lang,title] of [['en','Room Status Logs'],['ms','Log Status Bilik'],['zh','房态日志']]){
    set('#language',lang);calendar();
    assert($('[data-cal-tool="room-logs"]').textContent.toLowerCase().includes(title.toLowerCase()));
  }

  $('#global-nav [data-view="resourcesSettings"]').click();
  $('#nav [data-view="operationsDisplay"]').click();
  assert($('[data-operations-display]'));
  const settings='#operations-display-form';
  const drag=(from,to)=>{
    const transfer={setData(){}};
    for(const [node,type] of [[from,'dragstart'],[to,'dragover'],[to,'drop']]){
      const event=new dom.window.Event(type,{bubbles:true,cancelable:true});
      Object.defineProperty(event,'dataTransfer',{value:transfer});node.dispatchEvent(event);
    }
  };
  const list=(key)=>$('[data-layout-list="'+key+'"]');
  const item=(key,id)=>list(key).querySelector('[data-layout-item="'+id+'"]');
  assert.equal($(settings+' [name="advanceMinutes"]').value,'0');
  assert($(settings+' [name="advanceMinutes"]').disabled);
  $('[data-add-room-group]').click();
  const groupId=$('[data-group-name]').dataset.groupName;
  set('[data-group-name]','TEST north wing');
  drag(item('member:','TEST-KL-R1'),list('member:'+groupId));
  drag(item('roomOrder','TEST-KL-R2'),item('roomOrder','TEST-KL-R1'));
  drag(item('payments-enabled','card'),list('payments-disabled'));
  drag(item('channels-enabled','booking'),list('channels-disabled'));
  set(settings+' [name="advanceEnabled"]',true);
  set(settings+' [name="advanceMinutes"]','1440');
  $(settings+' .primary').click();
  await until(()=>revision()===baseline+1&&document.querySelector('#message')?.textContent==='测试操作已保存','display configuration persisted');
  const prefs=read().properties.find(p=>p.id==='TEST-KL').displayPreferences;
  assert.equal(prefs.groups[0].name,'TEST north wing');
  assert.deepEqual(prefs.groups[0].roomIds,['TEST-KL-R1']);
  assert(prefs.roomOrder.indexOf('TEST-KL-R2')<prefs.roomOrder.indexOf('TEST-KL-R1'));
  assert.equal(prefs.payments.find(row=>row.id==='card').enabled,false);
  assert.equal(prefs.channels.find(row=>row.id==='booking').enabled,false);
  assert.deepEqual(prefs.advanceCard,{enabled:true,minutes:1440});
  calendar();
  openTool('display');
  set('#display-form [name="group"]','room');
  $('#display-form .primary').click();
  const rowIndex=id=>[...document.querySelectorAll('.calendar tbody tr')].findIndex(row=>row.querySelector('[data-cell="'+id+'"]'));
  assert(rowIndex('TEST-KL-R2')>=0&&rowIndex('TEST-KL-R2')<rowIndex('TEST-KL-R1'));
  set('#calendar-room-group',groupId);
  assert.equal(document.querySelectorAll('.calendar tbody tr').length,1);
  assert($('.calendar tbody tr').textContent.includes('R01'));
  set('#calendar-date','2027-01-20');
  $('[data-action="details"][data-id="'+stay.id+'"]').click();
  $('#detail-tab-bill').click();
  assert.equal(document.querySelector('#payment-form option[value="card"]'),null);
  $('#detail-close').click();
  $('#new').click();
  assert.equal(document.querySelector('#reservation-dialog [data-field="source"] option[value="booking"]'),null);
  assert.equal(revision(),baseline+1);
  console.log('Front desk tools and property display settings DOM passed');
}finally {
  global.fetch=realFetch;server.closeAllConnections();await new Promise(resolve=>server.close(resolve));store.close();dom.window.close();
}
