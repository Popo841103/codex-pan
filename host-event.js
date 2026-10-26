(() => {
 'use strict';
 const dialog=document.querySelector('#host-event');if(!dialog)return;
 const $=id=>document.getElementById(id),cfg=window.COHUB_MEMBER_CONFIG;
 const phrases=new Map([...document.querySelectorAll('#member-copy [data-en]')].map(e=>[e.dataset.en,e.dataset]));
 const local=en=>{const d=phrases.get(en);return d?window.COHUB_I18N.local(d.en,d.zh,d.ms):window.COHUB_I18N.t(en);};
 let client,loading,trigger=null,user=null,mode='host',tab='joined',pendingAction=null,recovery=false,busy=false;
 const status=en=>{const node=$('member-status');node.dataset.message=en;node.textContent=local(en);if(en!=='Loading…'&&dialog.open)node.scrollIntoView({block:'nearest'});};
 const clear=()=>{$('member-status').textContent='';delete $('member-status').dataset.message;};
 const action=async fn=>{if(busy)return;busy=true;dialog.setAttribute('aria-busy','true');try{await fn();}catch(e){status(e?.status===429||/email.*(rate|sending|not.*allowed|authorized)|sending.*email|smtp/i.test(e?.message||'')?'Email delivery is unavailable or limited. Please contact the team.':'We could not complete this request. Please try again or contact the team.');}finally{busy=false;dialog.removeAttribute('aria-busy');}};
 function copyNode(tag,text){const el=document.createElement(tag),d=phrases.get(text);el.textContent=local(text);if(d){for(const k of ['en','zh','ms'])el.dataset[k]=d[k];}return el;}
 const textNode=(tag,text)=>{const e=document.createElement(tag);e.dataset.userContent='';e.textContent=String(text??'');return e;};
 async function init(){
  if(client)return client;if(loading)return loading;
  loading=(async()=>{
   if(!window.CohubSupabase)await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='member-sdk.js?v=20261026-editorial2';s.onload=resolve;s.onerror=reject;document.body.append(s);});
   let passwordReturn=false;
   try{const verifier=JSON.parse(localStorage.getItem('sb-'+new URL(cfg.projectUrl).hostname.split('.')[0]+'-auth-token-code-verifier')||'null');passwordReturn=new URLSearchParams(location.search).has('code')&&typeof verifier==='string'&&verifier.endsWith('/PASSWORD_RECOVERY');}catch{}
   client=CohubSupabase.createClient(cfg.projectUrl,cfg.publishableKey,{auth:{persistSession:true,storage:localStorage,flowType:'pkce',detectSessionInUrl:true},global:{fetch:(url,opts={})=>fetch(url,{...opts,signal:opts.signal||AbortSignal.timeout(20000)})}});
   client.auth.onAuthStateChange(event=>{if(event==='PASSWORD_RECOVERY')recovery=true;if(event==='SIGNED_OUT')user=null;});
   const {data,error}=await client.auth.getSession();if(error)throw error;
   if(data.session){await identify();if(passwordReturn)recovery=true;}
   return client;
  })();
  try{return await loading;}catch(e){loading=null;client=null;throw e;}
 }
 async function identify(){
  const {data,error}=await client.auth.getUser();if(error){user=null;throw error;}
  user=data.user?.email_confirmed_at?data.user:null;
  if(!user)throw Error('Unverified user');
 }
 async function providers(){try{const r=await fetch(cfg.projectUrl+'/auth/v1/settings',{headers:{apikey:cfg.publishableKey},signal:AbortSignal.timeout(15000)});if(r.ok){const s=await r.json();$('member-google').hidden=!s.external?.google;}}catch{/* Email remains available; do not expose an unconfigured OAuth button. */}}
 function syncDialogCopy(){dialog.querySelectorAll('[data-en]').forEach(el=>{el.textContent=window.COHUB_I18N.local(el.dataset.en,el.dataset.zh||el.dataset.en,el.dataset.ms||el.dataset.en);});}
 function showViews(){
  syncDialogCopy();
  $('member-auth-view').hidden=!!user||recovery;
  $('member-session').hidden=!user;
  $('member-email-display').textContent=user?.email||'';
  $('member-create-form').hidden=!user||mode!=='host'||recovery;
  $('member-mine-view').hidden=!user||mode!=='mine'||recovery;
  $('member-recovery-form').hidden=!recovery;
  $('member-dialog-title').textContent=local(mode==='mine'?'My activities':'Host an event');
  $('member-dialog-title').removeAttribute('data-en');$('member-dialog-title').removeAttribute('data-zh');$('member-dialog-title').removeAttribute('data-ms');
 }
 async function open(next='host',source=null){
  mode=next;trigger=source||trigger;if(!dialog.open)dialog.showModal();clear();showViews();
  await action(async()=>{status('Loading…');await init();showViews();clear();if(!user)void providers();else if(mode==='mine')await loadMine();});
 }
 document.querySelectorAll('a[href="#host-event"]').forEach(link=>link.addEventListener('click',e=>{e.preventDefault();void open('host',link);}));
 $('member-open-mine').addEventListener('click',e=>void open('mine',e.currentTarget));
 $('close-host-event').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
 dialog.addEventListener('close',()=>{if(location.hash==='#host-event'||location.hash==='#my-activities')history.replaceState(null,'',location.pathname+location.search);$('member-password').value='';$('member-new-password').value='';trigger?.focus();});
 const redirect=()=>new URL('community.html',location.href).href.split('?')[0].split('#')[0];
 async function afterSignIn(){await identify();$('member-password').value='';showViews();clear();if(pendingAction){const fn=pendingAction;pendingAction=null;await fn();}else if(mode==='mine')await loadMine();}
 $('member-auth-form').addEventListener('submit',e=>{
  e.preventDefault();const kind=e.submitter?.value||'login',email=$('member-email').value.trim(),password=$('member-password').value;
  if(kind==='signup'&&password.length<8){status('Password must contain at least 8 characters.');return;}
  void action(async()=>{
   await init();clear();
   if(kind==='signup'){
    const {data,error}=await client.auth.signUp({email,password,options:{emailRedirectTo:redirect()}});$('member-password').value='';if(error)throw error;
    if(data.session)await afterSignIn();else status('Check your email to confirm your account, then sign in.');
   }else{
    const {error}=await client.auth.signInWithPassword({email,password});$('member-password').value='';
    if(error){status(error.code==='email_not_confirmed'?'Please verify your email first.':'Incorrect email or password.');return;}await afterSignIn();
   }
  });
 });
 for(const [id,fn]of [['member-forgot',email=>client.auth.resetPasswordForEmail(email,{redirectTo:redirect()})],['member-resend',email=>client.auth.resend({type:'signup',email,options:{emailRedirectTo:redirect()}})]])$(id).addEventListener('click',()=>{
  if(!$('member-email').reportValidity())return;
  void action(async()=>{await init();const {error}=await fn($('member-email').value.trim());if(error)throw error;status('If the account exists, check your email for the next step.');});
 });
 $('member-google').addEventListener('click',()=>void action(async()=>{await init();const {error}=await client.auth.signInWithOAuth({provider:'google',options:{redirectTo:redirect()}});if(error)throw error;}));
 $('member-logout').addEventListener('click',()=>void action(async()=>{
  await init();const {error}=await client.auth.signOut({scope:'local'});if(error)throw error;user=null;pendingAction=null;recovery=false;$('member-list').replaceChildren();$('member-create-form').reset();showViews();clear();
 }));
 $('member-recovery-form').addEventListener('submit',e=>{e.preventDefault();void action(async()=>{await init();const {error}=await client.auth.updateUser({password:$('member-new-password').value});$('member-new-password').value='';if(error)throw error;recovery=false;await identify();showViews();status('Your password was updated.');});});
 $('member-create-form').addEventListener('submit',e=>{e.preventDefault();void action(async()=>{
  await init();await identify();const at=new Date($('member-date').value+'+08:00');
  if(!Number.isFinite(at.getTime())||at<=new Date()){status('Choose a future date.');return;}
  const event={owner_id:user.id,title:$('member-title').value.trim(),description:$('member-description').value.trim(),starts_at:at.toISOString(),location:$('member-location').value.trim(),capacity:Number($('member-capacity').value),language:$('member-event-language').value.trim(),fee_details:$('member-fees').value.trim(),status:'pending'};
  const {error}=await client.from('cohub_events').insert(event);if(error)throw error;
  $('member-create-form').reset();mode='mine';tab='hosting';showViews();await loadMine();status('Your event was saved and is awaiting team review.');
 });});
 const labelStatus=value=>({pending:'Pending',draft:'Pending',approved:'Approved',rejected:'Rejected',cancelled:'Cancelled',confirmed:'Confirmed',requested:'Requested',invited:'Invited',accepted:'Co-hosting',declined:'Decline'}[value]||'Pending');
 async function eventsByIds(ids){if(!ids.length)return [];const {data,error}=await client.from('cohub_events').select('*').in('id',[...new Set(ids)]).order('starts_at');if(error)throw error;return data;}
 function card(event,statusText,actions=[]){
  const el=document.createElement('article');el.className='experience-card member-event-card';
  el.append(textNode('h3',event.title),textNode('p',event.description),textNode('p',new Intl.DateTimeFormat(document.documentElement.lang,{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Kuala_Lumpur'}).format(new Date(event.starts_at))+' · '+event.location),textNode('p',event.language+' · '+event.fee_details));
  if(statusText)el.append(copyNode('p',statusText));
  for(const [name,fn]of actions){const b=copyNode('button',name);b.type='button';b.className='button button-secondary';b.addEventListener('click',()=>void action(fn));el.append(b);}return el;
 }
 async function loadMine(){
  const target=$('member-list');target.replaceChildren(copyNode('p','Loading…'));
  document.querySelectorAll('[data-member-tab]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.memberTab===tab)));
  let rows=[];
  if(tab==='hosting'){
   const {data,error}=await client.from('cohub_events').select('*').eq('owner_id',user.id).order('created_at',{ascending:false}).limit(100);if(error)throw error;rows=data.map(event=>({event,state:event.status}));
  }else{
   const tables=tab==='pending'?['cohub_registrations','cohub_cohosts']:tab==='joined'?['cohub_registrations']:tab==='following'?['cohub_follows']:['cohub_cohosts'];
   for(const table of tables){
    const {data,error}=await client.from(table).select('*').eq('user_id',user.id).limit(100);if(error)throw error;
    const records=data.filter(x=>tab==='pending'?['requested','invited'].includes(x.status):tab==='joined'?x.status==='confirmed':tab==='cohosting'?x.status==='accepted':true);
    const events=await eventsByIds(records.map(x=>x.event_id));for(const record of records){const event=events.find(x=>x.id===record.event_id);if(event)rows.push({event,state:record.status||'approved',invite:record.status==='invited'});}
   }
   if(tab==='pending'){const {data,error}=await client.from('cohub_events').select('*').eq('owner_id',user.id).eq('status','pending').limit(100);if(error)throw error;rows.push(...data.map(event=>({event,state:'pending'})));}
  }
  target.replaceChildren();for(const row of rows){const actions=row.invite?[['Accept',()=>answer(row.event.id,true)],['Decline',()=>answer(row.event.id,false)]]:[];target.append(card(row.event,labelStatus(row.state),actions));}
  if(!rows.length)target.append(copyNode('p','No activities here yet.'));
 }
 async function answer(id,yes){const {error}=await client.rpc('cohub_answer_invitation',{target_event:id,accept_invite:yes});if(error)throw error;await loadMine();}
 document.querySelectorAll('[data-member-tab]').forEach(button=>button.addEventListener('click',()=>{tab=button.dataset.memberTab;void action(loadMine);}));
 async function memberAction(fn){await init();if(!user){pendingAction=fn;mode='mine';if(!dialog.open)dialog.showModal();showViews();return;}await identify();await fn();}
 $('member-load-events').addEventListener('click',()=>void action(async()=>{
  await init();const {data,error}=await client.from('cohub_events').select('*').eq('status','approved').gt('starts_at',new Date().toISOString()).order('starts_at').limit(40);if(error)throw error;
  const target=$('member-public-list');target.replaceChildren();if(!data.length)target.append(copyNode('p','No activities here yet.'));
  for(const event of data)target.append(card(event,'Approved',[
   ['Request to join',()=>memberAction(async()=>{if(event.owner_id===user.id){status('You already host this event.');return;}const {error}=await client.rpc('cohub_request_join',{target_event:event.id});if(error)throw error;if(!dialog.open)dialog.showModal();mode='mine';tab='pending';showViews();await loadMine();status('Your request was saved. The team will confirm participation.');})],
   ['Follow',()=>memberAction(async()=>{const {error}=await client.from('cohub_follows').upsert({event_id:event.id,user_id:user.id},{onConflict:'event_id,user_id',ignoreDuplicates:true});if(error)throw error;if(!dialog.open)dialog.showModal();mode='mine';tab='following';showViews();await loadMine();status('Saved to your activities.');})]
  ]));
 }));
 $('language').addEventListener('change',()=>{if($('member-status').dataset.message)status($('member-status').dataset.message);showViews();});
 addEventListener('hashchange',()=>{if(location.hash==='#host-event')void open('host');if(location.hash==='#my-activities')void open('mine');});
 syncDialogCopy();
 if(new URLSearchParams(location.search).has('code'))void open('mine');
 else if(location.hash==='#host-event')void open('host');else if(location.hash==='#my-activities')void open('mine');
})();
