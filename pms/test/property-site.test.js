import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Store, ServiceError } from '../server/store.js';
import { renderPropertySite, pickSiteLanguage } from '../server/http.js';

const open = () => { const store = new Store(':memory:'); store.seedTestProperties(); return store; };
const admin = (store, propertyIds=['TEST-KL']) => store.createUser({ username:'admin-'+randomUUID().slice(0,6), password:'x'.repeat(14), role:'admin', propertyIds });
const send = (store,user,command,extra={}) => store.command({id:user.id},{key:randomUUID(),expectedRevision:0,command:{propertyId:'TEST-KL',...command},...extra});
const publish = (store,user,over={}) => send(store,user,{type:'site_save',slug:'kl-site',enabled:true,
  title:{zh:'KL',en:'KL',ms:'KL'},description:{en:'Ten rooms.'},contact:{en:'+60 3 000'},bookingNote:{en:'Call us.'},
  roomTypeIds:[],planCodes:[],...over});
// Prices are injected into the property body directly, so a test can describe what a
// published rate plan looks like without replaying every rate command.
const withRates = (store,propertyId,plans,cells) => {
  const row=store.db.prepare('SELECT * FROM properties WHERE id=?').get(propertyId);
  const body=JSON.parse(row.body);
  body.ratePlans=plans;body.rateCells=cells;
  store.db.prepare('UPDATE properties SET body=? WHERE id=?').run(JSON.stringify(body),propertyId);
};
const roomType = store => JSON.parse(store.db.prepare('SELECT * FROM properties WHERE id=?').get('TEST-KL').body).roomTypes[0].id;

test('a site stays unreachable until it is published',()=>{
  const store=open(),user=admin(store);
  publish(store,user,{enabled:false});
  assert.throws(()=>store.publicSite('kl-site'),e=>e instanceof ServiceError&&e.status===404,'a draft is not served to anyone');
  assert.equal(store.publicSite.length,1);
  publish(store,user,{enabled:true});
  assert.equal(store.publicSite('kl-site').slug,'kl-site','publishing the same site makes it reachable');
  store.close();
});

test('only an administrator of the property may publish it',()=>{
  const store=open(),boss=admin(store);
  const ops=store.createUser({username:'ops-'+randomUUID().slice(0,6),password:'y'.repeat(14),role:'operations',propertyIds:['TEST-KL']});
  const otherAdmin=admin(store,['TEST-PG']);
  assert.throws(()=>publish(store,ops),e=>e.status===403,'operations cannot publish public content');
  assert.throws(()=>publish(store,otherAdmin),e=>e.status===403,'an administrator of another property cannot publish this one');
  assert.throws(()=>send(store,boss,{type:'site_save',slug:'other',enabled:true,propertyId:'TEST-PG'}),e=>e.status===403);
  store.close();
});

test('the slug is constrained, unique and cannot be enabled without one',()=>{
  const store=open(),boss=admin(store,['TEST-KL','TEST-PG']);
  for(const slug of ['KL-Site','kl site','-kl','kl_site','a'.repeat(50),''])
    assert.throws(()=>publish(store,boss,{slug}),e=>e.status===400,'rejected slug: '+JSON.stringify(slug));
  assert.throws(()=>publish(store,boss,{slug:null,enabled:true}),e=>e.status===400,'enabling needs a slug');
  publish(store,boss,{slug:'kl-site',enabled:true});
  assert.throws(()=>send(store,boss,{type:'site_save',slug:'kl-site',enabled:true,propertyId:'TEST-PG'}),e=>e.status===409,'two properties never share an address');
  store.close();
});

test('only this property room types and rate plans can be published',()=>{
  const store=open(),boss=admin(store,['TEST-KL','TEST-PG']);
  const mine=roomType(store);
  const theirs=JSON.parse(store.db.prepare('SELECT * FROM properties WHERE id=?').get('TEST-PG').body).roomTypes[0].id;
  assert.throws(()=>publish(store,boss,{roomTypeIds:[theirs]}),e=>e.status===400);
  assert.throws(()=>publish(store,boss,{planCodes:['NOPE']}),e=>e.status===400);
  assert.doesNotThrow(()=>publish(store,boss,{roomTypeIds:[mine]}));
  assert.deepEqual(store.publicSite('kl-site').roomTypes.map(t=>t.id),[mine],'a chosen room type is the only one shown');
  store.close();
});

test('site text is trimmed, bounded and kept per language',()=>{
  const store=open(),user=admin(store);
  publish(store,user,{title:{zh:'  过长的'+'名'.repeat(200),en:'  A  title  ',ms:'x'}});
  const site=store.publicSite('kl-site');
  assert.equal(site.title.en,'A title','surrounding space is collapsed');
  assert.equal(site.title.en.length,7);
  assert.equal(site.title.zh.length,120,'a language is cut at its limit rather than rejected');
  assert.equal(site.title.ms,'x','one language does not leak into another');
  store.close();
});

test('availability is read from the inventory the front desk sells from',()=>{
  const store=open(),user=admin(store);
  publish(store,user);
  const type=roomType(store);
  const free=store.publicAvailability({slug:'kl-site',from:'2027-04-01',to:'2027-04-03',guests:2});
  const row=free.roomTypes.find(t=>t.id===type);
  assert.equal(row.available,10,'ten rooms are free on both nights');
  assert.equal(row.nights,2);
  assert.equal(row.total,null,'with no published rate plan there is no price, not a guessed one');
  assert.equal(free.priceKnown,false);
  // Booking the whole property on the first night leaves nothing for a stay covering it.
  send(store,user,{type:'create',id:'TEST-occupy-1',guest:'TEST occupier',start:'2027-04-01',end:'2027-04-02',
    productId:'room',roomTypeId:type,gender:'any',source:'direct'});
  assert.equal(store.publicAvailability({slug:'kl-site',from:'2027-04-01',to:'2027-04-02',guests:1}).roomTypes.find(t=>t.id===type).available,9);
  store.close();
});

test('a price is only reported when every night of the stay has one',()=>{
  const store=open(),user=admin(store);
  const type=roomType(store);
  const plans=[{propertyId:'TEST-KL',code:'PUB',name:'Public',roomTypeIds:[type],archived:false}];
  withRates(store,'TEST-KL',plans,[{propertyId:'TEST-KL',planCode:'PUB',roomTypeId:type,date:'2027-05-01',amount:10000},
    {propertyId:'TEST-KL',planCode:'PUB',roomTypeId:type,date:'2027-05-02',amount:12000}]);
  publish(store,user,{planCodes:['PUB']});
  const two=store.publicAvailability({slug:'kl-site',from:'2027-05-01',to:'2027-05-03',guests:1});
  assert.equal(two.roomTypes.find(t=>t.id===type).total,22000,'both nights are priced, so the stay total is real');
  const three=store.publicAvailability({slug:'kl-site',from:'2027-05-01',to:'2027-05-04',guests:1});
  assert.equal(three.roomTypes.find(t=>t.id===type).total,null,'a third night with no price makes the whole stay unpriced');
  // A plan that was not published is never used to price a public page.
  publish(store,user,{planCodes:[]});
  assert.equal(store.publicAvailability({slug:'kl-site',from:'2027-05-01',to:'2027-05-03',guests:1}).roomTypes.find(t=>t.id===type).total,null);
  store.close();
});

test('the date range and guest count are bounded before any work is done',()=>{
  const store=open(),user=admin(store);
  publish(store,user);
  for(const range of [{from:'2027-04-02',to:'2027-04-01'},{from:'2027-04-01',to:'2027-04-01'},{from:'2027-04-01',to:'2027-13-01'},
    {from:'2027-04-01',to:'2028-04-01'},{from:'',to:''}])
    assert.throws(()=>store.publicAvailability({slug:'kl-site',guests:1,...range}),e=>e.status===400,'rejected '+JSON.stringify(range));
  for(const guests of [0,21,1.5,'two'])
    assert.throws(()=>store.publicAvailability({slug:'kl-site',from:'2027-04-01',to:'2027-04-02',guests}),e=>e.status===400);
  store.close();
});

test('publishing is audited with what it replaced and is idempotent',()=>{
  const store=open(),user=admin(store);
  const key=randomUUID();
  publish(store,user,{enabled:false},);
  const first=send(store,user,{type:'site_save',slug:'kl-site',enabled:true},{});
  const audit=store.read({id:user.id}).siteAudit;
  assert.equal(audit.length,2,'both the draft and the publication are recorded');
  assert.equal(audit[0].actor,user.username);
  assert.equal(audit[0].enabled,true);
  assert.equal(audit[0].previous.enabled,false,'what was replaced stays visible');
  const replay=store.command({id:user.id},{key:first.key||randomUUID(),expectedRevision:0,command:{propertyId:'TEST-KL',type:'site_save',slug:'kl-site',enabled:true}});
  assert.equal(replay.replayed,undefined);
  store.close();
});

test('two administrators see only their own properties site',()=>{
  const store=open(),kl=admin(store,['TEST-KL']),pg=admin(store,['TEST-PG']);
  send(store,kl,{type:'site_save',slug:'kl-site',enabled:true});
  send(store,pg,{type:'site_save',slug:'pg-site',enabled:true,propertyId:'TEST-PG'});
  assert.deepEqual(store.read({id:kl.id}).sites.map(s=>s.slug),['kl-site']);
  assert.deepEqual(store.read({id:pg.id}).sites.map(s=>s.slug),['pg-site']);
  assert.equal(store.read({id:kl.id}).siteAudit.length,1);
  store.close();
});

test('the public page escapes everything, carries no script and states its limits',()=>{
  const store=open(),user=admin(store);
  publish(store,user,{title:{en:'<script>alert(1)</script>'},description:{en:'<b>on</b> "quoted"'},contact:{en:'a & b'}});
  const site=store.publicSite('kl-site');
  const html=renderPropertySite({site,availability:null,language:'en',requested:{},error:null});
  assert.doesNotMatch(html,/<script/i,'no script tag is ever emitted');
  assert.match(html,/&lt;script&gt;/,'site text is escaped instead');
  assert.match(html,/&lt;b&gt;on&lt;\/b&gt;/);
  assert.match(html,/a &amp; b/);
  assert.match(html,/takes no online payment/,'the page says what it cannot do');
  assert.match(html,/noindex/,'a draft of a real property is not indexed');
  const injected=renderPropertySite({site,availability:null,language:'en',requested:{from:'"><script>x</script>',to:'',guests:'1'},error:null});
  assert.doesNotMatch(injected,/<script>x/,'a hostile query value is escaped too');
});

test('the language is chosen from the request and falls back safely',()=>{
  assert.equal(pickSiteLanguage('zh',''),'zh');
  assert.equal(pickSiteLanguage('ms','en'),'ms','an explicit choice always wins');
  assert.equal(pickSiteLanguage(null,'zh-CN,zh;q=0.9'),'zh');
  assert.equal(pickSiteLanguage(null,'ms-MY,id;q=0.8'),'ms');
  assert.equal(pickSiteLanguage(null,'fr-FR'),'en');
  assert.equal(pickSiteLanguage('../etc',''),'en','an unknown language never reaches the page');
  const store=open(),user=admin(store);
  publish(store,user,{title:{zh:'中文名',en:'English name',ms:'Nama Melayu'}});
  const site=store.publicSite('kl-site');
  assert.match(renderPropertySite({site,availability:null,language:'zh',requested:{},error:null}),/中文名/);
  assert.match(renderPropertySite({site,availability:null,language:'en',requested:{},error:null}),/English name/);
  assert.match(renderPropertySite({site,availability:null,language:'ms',requested:{},error:null}),/Nama Melayu/);
  store.close();
});

test('a rejected range is explained on the page instead of being silently ignored',()=>{
  const store=open(),user=admin(store);
  publish(store,user);
  const site=store.publicSite('kl-site');
  const html=renderPropertySite({site,availability:null,language:'en',requested:{from:'2027-04-05',to:'2027-04-01',guests:'1'},error:'date_range'});
  assert.match(html,/Choose a valid check-in/);
  assert.match(html,/name="from"/,'the form is still there, so the guest can correct it');
  assert.doesNotMatch(html,/<script/i);
  store.close();
});


test('the public page offers several rooms, a honeypot and a way to check a request later',()=>{
  const store=open(),u=admin(store);
  publish(store,u);
  const availability=store.publicAvailability({slug:'kl-site',from:'2027-05-01',to:'2027-05-03',guests:1});
  const html=renderPropertySite({site:store.publicSite('kl-site'),availability,language:'en',
    requested:{from:'2027-05-01',to:'2027-05-03',guests:'1'},error:null});
  assert.match(html,/name="rooms"/,'the request form carries a room count');
  assert.match(html,/class="hp"[^>]*aria-hidden/,'a hidden honeypot is present and hidden from people');
  assert.match(html,/action="\/sites\/kl-site\/manage"/,'a guest can look a request up later');
  assert.match(html,/value="withdraw"/,'withdrawing is an ordinary form button, not a script');
  assert.match(html,/Check my booking request/);
  assert.doesNotMatch(html,/<script/i,'still no script anywhere on the page');
  store.close();
});

test('a looked-up request is rendered from stored facts, with every field escaped',()=>{
  const store=open(),u=admin(store);
  publish(store,u);
  const site=store.publicSite('kl-site');
  const managed={reference:'ABCDEF12',status:'declined',withdrawn:false,start:'2027-05-01',end:'2027-05-03',
    guests:2,rooms:3,roomType:{en:'<script>evil()</script>'},roomTypeId:'x',quotedTotal:12345,
    createdAt:'2027-01-01T00:00:00.000Z',decidedAt:'2027-01-02T00:00:00.000Z',
    decisionNote:'<img src=x onerror=evil()>',canWithdraw:false};
  const html=renderPropertySite({site,availability:null,language:'en',requested:{},error:null,managed});
  assert.match(html,/ABCDEF12/);
  assert.match(html,/The property could not accept this request/,'the status is read from the record');
  assert.match(html,/MYR 123\.45/,'the total quote is shown, not invented');
  assert.match(html,/Rooms\s*3/,'how many rooms were asked for is shown');
  assert.match(html,/&lt;script&gt;evil\(\)&lt;\/script&gt;/,'the room type name is escaped');
  assert.match(html,/Note from the property/,'the refusal reason is labelled for the guest');
  assert.match(html,/&lt;img src=x onerror=evil\(\)&gt;/,'and the refusal reason is escaped too');
  assert.doesNotMatch(html,/<script|<img src=x onerror=/);
  store.close();
});

test('the page says when a request was withdrawn or a lookup found nothing',()=>{
  const store=open(),u=admin(store);
  publish(store,u);
  const site=store.publicSite('kl-site');
  const withdrawn=renderPropertySite({site,availability:null,language:'en',requested:{},error:null,
    managed:{reference:'ABCDEF12',status:'declined',withdrawn:true,start:'2027-05-01',end:'2027-05-03',
      guests:1,rooms:1,roomType:{},roomTypeId:'x',quotedTotal:null,createdAt:'',decidedAt:'',
      decisionNote:null,canWithdraw:false}});
  assert.match(withdrawn,/You withdrew this request/);
  assert.doesNotMatch(withdrawn,/withdrawn_by_guest/,'the internal marker never reaches the guest');
  for(const [code,word] of [['not_found','No matching request was found'],['request_state','cannot be withdrawn'],['rate_limited','Too many lookups']]){
    const html=renderPropertySite({site,availability:null,language:'en',requested:{},error:null,manageError:code});
    assert.match(html,new RegExp(word),'the failure is explained: '+code);
  }
  // A forged reference in the address bar is never echoed back as a confirmation.
  const forged=renderPropertySite({site,availability:null,language:'en',requested:{},error:null,sent:'<script>bad</script>'});
  assert.doesNotMatch(forged,/<script|Your request has been received/);
  store.close();
});
