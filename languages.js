(() => {
  'use strict';
  const select=document.querySelector('#language');if(!select)return;
  const extra=[['zh-TW','繁體中文'],['ja','日本語'],['ko','한국어'],['th','ไทย'],['id','Bahasa Indonesia'],['vi','Tiếng Việt'],['fr','Français'],['de','Deutsch'],['es','Español'],['pt','Português'],['ru','Русский'],['ar','العربية'],['hi','हिन्दी'],['it','Italiano'],['nl','Nederlands'],['tr','Türkçe']];
  const native=new Set(['en','zh','ms']),allowed=new Set([...native,...extra.map(([id])=>id)]);
  select.querySelectorAll('optgroup').forEach(el=>el.remove());
  const group=document.createElement('optgroup');group.label='Languages / 语言';
  for(const [code,name] of extra){const option=document.createElement('option');option.value=code;option.textContent=name;group.append(option);}select.append(group);
  let active='en',messages={},loading=null,revision=0,scheduled=false;
  const cache=new Map(),sources=new WeakMap(),attributes=new WeakMap();
  const normal=s=>String(s).replaceAll('\\n','\n').trim().replace(/\s+/g,' ');
  const status=document.createElement('span');status.id='language-status';status.className='language-status';status.setAttribute('role','status');status.hidden=true;document.querySelector('.language-tools')?.append(status);
  const protectedNode=el=>!el||el.closest('script,style,textarea,input,[data-user-content],#language,[data-native-language],.language-tools-title,.brand');
  function text(value){
    if(native.has(active)||/^RM\s*\d/.test(String(value).trim()))return value;
    const source=String(value),key=normal(source);
    if(messages[key])return source.replace(source.trim(),messages[key]);
    // Only fixed, prewritten phrases are substituted; personal inputs never enter this function.
    let result=source;
    const segments=source.split(/(\n|https?:\/\/\S+)/);
    result=segments.map(segment=>{
      if(segment.startsWith('http'))return segment;
      if(messages[normal(segment)])return messages[normal(segment)];
      let out=segment;
      for(const [en,to] of window.COHUB_I18N.fragments||[]){
        if(!out.includes(en))continue;
        const escaped=en.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
        out=out.replace(new RegExp('(?<![A-Za-z])'+escaped+'(?![A-Za-z])','g'),()=>to);
      }
      return out;
    }).join('');
    return result;
  }
  function apply(){
    document.documentElement.lang=active==='zh'?'zh-Hans':active==='zh-TW'?'zh-Hant':active;
    document.documentElement.dir=active==='ar'?'rtl':'ltr';
    document.querySelectorAll('[data-native-language]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.nativeLanguage===active)));
    if(native.has(active))return;
    document.querySelectorAll('[data-en]').forEach(el=>{if(protectedNode(el))return;const value=text(el.dataset.en.replaceAll('\\n','\n'));if(el.textContent!==value)el.textContent=value;});
    const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let node;
    while((node=walker.nextNode())){
      const parent=node.parentElement;if(!node.nodeValue.trim()||protectedNode(parent)||parent.closest('[data-en]')||parent===status)continue;
      let state=sources.get(node);
      if(!state||(node.nodeValue!==state.last&&node.nodeValue!==state.en))state={en:node.nodeValue};
      const value=text(state.en);state.last=value;sources.set(node,state);if(value!==node.nodeValue)node.nodeValue=value;
    }
    document.querySelectorAll('[placeholder],[aria-label],[title],img[alt]').forEach(el=>{
      if(protectedNode(el))return;let state=attributes.get(el);
      if(!state){state={};for(const name of ['placeholder','aria-label','title','alt'])if(el.hasAttribute(name))state[name]=el.getAttribute(name);attributes.set(el,state);}
      for(const [name,value] of Object.entries(state)){const target=text(value);if(el.getAttribute(name)!==target)el.setAttribute(name,target);}
    });
  }
  function restore(){
    const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let node;
    while((node=walker.nextNode())){const state=sources.get(node);if(state&&node.nodeValue===state.last&&node.nodeValue!==state.en)node.nodeValue=state.en;}
    document.querySelectorAll('[placeholder],[aria-label],[title],img[alt]').forEach(el=>{const state=attributes.get(el);if(state)for(const [k,v]of Object.entries(state))el.setAttribute(k,v);});
  }
  function queue(){if(scheduled)return;scheduled=true;queueMicrotask(()=>{scheduled=false;apply();});}
  async function load(code){
    const request=++revision;loading=code;
    if(native.has(code)){messages={};window.COHUB_I18N.fragments=[];loading=null;status.hidden=true;queue();return;}
    status.hidden=false;status.textContent='Loading '+extra.find(([id])=>id===code)[1]+'…';
    try{
      let data=cache.get(code);
      if(!data){const response=await fetch('locale-'+code+'.json?v=20261026-members1',{credentials:'same-origin'});if(!response.ok)throw Error('Language file unavailable');data=await response.json();if(!data||Array.isArray(data)||typeof data!=='object')throw Error('Invalid language file');cache.set(code,data);}
      if(request!==revision||active!==code)return;
      messages=Object.fromEntries(Object.entries(data).map(([k,v])=>[normal(k),String(v)]));
      window.COHUB_I18N.fragments=Object.entries(messages).filter(([k])=>k.length>2&&k.length<120&&!k.includes('http')).sort((a,b)=>b[0].length-a[0].length);
      loading=null;status.hidden=true;select.dispatchEvent(new Event('change',{bubbles:true}));
    }catch{
      if(request!==revision)return;loading=null;status.textContent='Could not load / 无法加载 · ';const retry=document.createElement('button');retry.type='button';retry.textContent='Retry / 重试';retry.addEventListener('click',()=>load(active));status.append(retry);status.hidden=false;
    }
  }
  window.COHUB_I18N={get lang(){return active;},allowed,fragments:[],t:text,local(en,zh,ms){return active==='zh'?zh:active==='ms'?ms:active==='en'?en:text(en);},apply:queue};
  select.addEventListener('change',()=>{
    const next=allowed.has(select.value)?select.value:'en',changed=active!==next;
    if(changed){restore();active=next;messages={};window.COHUB_I18N.fragments=[];try{localStorage.setItem('cohub-language',active);}catch{}if(native.has(active)||!cache.has(active))load(active);else{loading=null;revision++;status.hidden=true;messages=Object.fromEntries(Object.entries(cache.get(active)).map(([k,v])=>[normal(k),v]));window.COHUB_I18N.fragments=Object.entries(messages).filter(([k])=>k.length>2&&k.length<120).sort((a,b)=>b[0].length-a[0].length);}}
    if(!changed&&!native.has(active)&&!cache.has(active)&&loading!==active)load(active);
    queue();
  },true);
  document.querySelectorAll('[data-native-language]').forEach(button=>button.addEventListener('click',()=>{select.value=button.dataset.nativeLanguage;select.dispatchEvent(new Event('change',{bubbles:true}));}));
  new MutationObserver(queue).observe(document.body,{subtree:true,childList:true,characterData:true});
  try{const saved=localStorage.getItem('cohub-language');if(allowed.has(saved))select.value=saved;}catch{}
  // Existing page renderers dispatch the initial change after they attach their handlers.
})();
