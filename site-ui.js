(() => {
  const selector = document.querySelector('#language');
  const dictionary = window.COHUB_TRANSLATIONS || {};
  const originals = new WeakMap();
  const attrOriginals = new WeakMap();
  const ui = (en, zh, ms) => ({en, zh, ms}[selector.value] || en);
  const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const labels = {
    'bottles':['瓶','botol'], 'bottle':['瓶','botol'], 'cans':['罐','tin'], 'can':['罐','tin'],
    'original wort extract':['原麦汁浓度','ekstrak wort asal'], 'total sugar':['总糖','jumlah gula'],
    'CO-HUB / HOSPITALITY SUPPLY':['CO-HUB / 住宿餐饮供应链','CO-HUB / BEKALAN HOSPITALITI'], 'CO-HUB SUPPLY':['CO-HUB 供应链','BEKALAN CO-HUB'], 'Close':['关闭','Tutup'], 'Product image':['产品图片','Imej produk'], 'Online enquiry':['线上客服','Pertanyaan dalam talian'], 'Not applicable':['不适用','Tidak berkenaan'], 'N/A':['不适用','Tidak berkenaan'],
    '1,500+ tonnes':['1,500+吨','1,500+ tan'], 'Enquiry cart':['询价购物车','Troli pertanyaan']
  };
  Object.assign(dictionary, labels);
  function translate(value) {
    if (selector.value === 'en') return value;
    const lang = selector.value === 'zh' ? 0 : 1;
    const trimmed = value.trim();
    if (dictionary[trimmed]) return value.replace(trimmed,dictionary[trimmed][lang]);
    let result = value;
    // Variable strings are translated from their English source, keeping quantities and prices intact.
    const substitutions = [
      [/^(\d+) products?$/, (_,n) => ui('',`${n}款产品`,`${n} produk`)],
      [/^(\d+) item line\(s\) require a separate quote and are not included in this subtotal\.$/, (_,n) => ui('',`${n}项商品需单独报价，未计入此小计。`,`${n} baris produk memerlukan sebut harga berasingan dan tidak termasuk dalam jumlah kecil ini.`)],
      [/^Added (.+) to your enquiry cart\.$/, (_,v) => ui('',`已将${v}加入询价购物车。`,`${v} ditambah ke troli pertanyaan.`)],
      [/Case \(/g, ui('','整箱（','Kotak (')],
      [/Priced format: /g, ui('','计价规格：','Format harga: ')],
      [/Per /g, ui('','每','Setiap ')],
      [/ · Suggested retail/g, ui('',' · 建议零售价',' · Harga runcit disyorkan')],
      [/ each/g, ui('','／件',' setiap unit')],
      [/Quantity for /g, ui('','数量：','Kuantiti untuk ')],
      [/Format for /g, ui('','规格：','Format untuk ')],
      [/Remove /g, ui('','移除：','Buang ')]
    ];
    substitutions.forEach(([pattern,replacement]) => {result=result.replace(pattern,replacement);});
    // Longest phrase first; word boundaries prevent "can" changing unrelated words.
    Object.keys(dictionary).sort((a,b)=>b.length-a.length).forEach(key=>{
      if (key.length > 110 || !result.includes(key)) return;
      const safe = key.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
      result=result.replace(new RegExp('(?<![A-Za-z])'+safe+'(?![A-Za-z])','g'),dictionary[key][lang]);
    });
    return result;
  }
  function applyTranslations(root = document.body) {
    const walker = document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    let node;
    while ((node=walker.nextNode())) {
      if (!node.nodeValue.trim() || node.parentElement.closest('script,style,[data-en]')) continue;
      let state=originals.get(node);
      if (!state || (node.nodeValue!==state.last && node.nodeValue!==state.en)) state={en:node.nodeValue};
      const value=translate(state.en);
      state.last=value;originals.set(node,state);
      if(node.nodeValue!==value)node.nodeValue=value;
    }
    root.querySelectorAll('[placeholder],[aria-label]').forEach(el=>{
      let state=attrOriginals.get(el);if(!state){state={};['placeholder','aria-label'].forEach(a=>{if(el.hasAttribute(a))state[a]=el.getAttribute(a);});attrOriginals.set(el,state);}
      Object.entries(state).forEach(([a,value])=>{const t=translate(value);if(el.getAttribute(a)!==t)el.setAttribute(a,t);});
    });
  }
  const markup = `<button class="contact-launcher" type="button" data-contact aria-haspopup="dialog"><svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 4h16v12H9l-5 4z"/><path d="M8 8h8M8 12h5"/></svg><span data-en="Contact us" data-zh="联系我们" data-ms="Hubungi kami">Contact us</span></button>
  <dialog id="contact-dialog" aria-labelledby="contact-title"><button class="dialog-close" id="contact-close" type="button" aria-label="Close">×</button><p class="eyebrow">CO-HUB</p><h2 id="contact-title" data-en="Contact us" data-zh="联系我们" data-ms="Hubungi kami">Contact us</h2><div class="contact-options"><button class="button" id="online-support" type="button" data-en="Online enquiry" data-zh="线上客服" data-ms="Pertanyaan dalam talian">Online enquiry</button><a class="button" href="https://wa.me/60178497319" target="_blank" rel="noopener noreferrer">WhatsApp</a><a class="button" href="mailto:cohubcom@gmail.com" data-en="Email" data-zh="邮件" data-ms="E-mel">Email</a><a class="button" href="tel:+60178497319" data-en="Call us" data-zh="电话" data-ms="Telefon">Call us</a></div><p class="contact-details">+60 17-849 7319<br><a href="mailto:cohubcom@gmail.com">cohubcom@gmail.com</a></p><p class="contact-more"><a class="text-link" href="enquiry.html?type=general" data-en="Detailed enquiry ↗" data-zh="整理需求并咨询 ↗" data-ms="Pertanyaan terperinci ↗">Detailed enquiry ↗</a><a class="text-link" href="guide.html" data-en="Arrival guide ↗" data-zh="到店指南 ↗" data-ms="Panduan ketibaan ↗">Arrival guide ↗</a></p><form id="support-form" hidden><p class="small" data-en="Write your question, then send it through WhatsApp or email. This window does not connect to live chat or send messages automatically." data-zh="填写问题后，通过WhatsApp或邮件发送。本窗口暂未接通实时聊天，不会自动发送消息。" data-ms="Tulis soalan, kemudian hantar melalui WhatsApp atau e-mel. Tetingkap ini belum bersambung kepada sembang langsung dan tidak menghantar mesej secara automatik.">Write your question, then send it through WhatsApp or email. This window does not connect to live chat or send messages automatically.</p><label><span data-en="Your name (optional)" data-zh="姓名（选填）" data-ms="Nama (pilihan)">Your name (optional)</span><input id="support-name" autocomplete="name" maxlength="100"></label><label><span data-en="How can we help?" data-zh="有什么可以帮助你？" data-ms="Bagaimana kami boleh membantu?">How can we help?</span><textarea id="support-question" required maxlength="2000" rows="5"></textarea></label><div class="actions"><button class="button" type="submit" value="whatsapp" data-en="Send via WhatsApp" data-zh="通过WhatsApp发送" data-ms="Hantar melalui WhatsApp">Send via WhatsApp</button><button class="button" type="submit" value="email" data-en="Send via email" data-zh="通过邮件发送" data-ms="Hantar melalui e-mel">Send via email</button></div></form></dialog>`;
  document.body.insertAdjacentHTML('beforeend',markup);
  const contact=document.querySelector('#contact-dialog');
  document.querySelectorAll('[data-contact]').forEach(button=>button.addEventListener('click',()=>contact.showModal()));
  document.querySelector('#contact-close').addEventListener('click',()=>contact.close());
  document.querySelector('#online-support').addEventListener('click',()=>{document.querySelector('#support-form').hidden=false;document.querySelector('#support-question').focus();});
  document.querySelector('#support-form').addEventListener('submit',event=>{
    event.preventDefault();
    const name=document.querySelector('#support-name').value.trim();
    const question=document.querySelector('#support-question');
    question.setCustomValidity(question.value.trim()?'':ui('Please enter your question.','请输入咨询内容。','Sila masukkan soalan anda.'));
    if(!question.reportValidity())return;
    const message=ui('Hello CO-HUB','你好，CO-HUB','Helo CO-HUB')+(name?` (${name})`:'')+'\n'+question.value.trim();
    if(event.submitter?.value==='email')location.href='mailto:cohubcom@gmail.com?subject='+encodeURIComponent(ui('CO-HUB website enquiry','CO-HUB官网咨询','Pertanyaan laman web CO-HUB'))+'&body='+encodeURIComponent(message);
    else window.open('https://wa.me/60178497319?text='+encodeURIComponent(message),'_blank','noopener,noreferrer');
  });
  document.querySelector('#support-question').addEventListener('input',event=>event.target.setCustomValidity(''));
  if(document.querySelector('.product-art')){
    document.body.insertAdjacentHTML('beforeend','<dialog id="product-image-dialog" aria-label="Product image"><button class="dialog-close" id="image-close" type="button" aria-label="Close">×</button><h3 id="image-title"></h3><img id="full-product-image" alt=""></dialog>');
    const imageDialog=document.querySelector('#product-image-dialog');
    document.querySelectorAll('.product-art').forEach(image=>{
      function show(){const full=document.querySelector('#full-product-image');full.src=image.src;full.alt=image.alt;document.querySelector('#image-title').textContent=image.closest('.beer-card').querySelector('h3').textContent;imageDialog.showModal();}
      image.addEventListener('click',show);image.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();show();}});
    });
    document.querySelector('#image-close').addEventListener('click',()=>imageDialog.close());
  }
  function changeLanguage(){
    try{localStorage.setItem('cohub-language',selector.value);}catch{}
    document.querySelectorAll('[data-en]').forEach(el=>{const value=el.dataset[selector.value];if(value)el.textContent=value.replaceAll('\\n','\n');});
    applyTranslations();
    document.querySelectorAll('.beer-card').forEach((card,index)=>{
      const product=window.COHUB_BEER_PRODUCTS?.[index];if(product)card.dataset.search=[product.name,product.originalName,product.style,product.description,card.textContent].join(' ').toLowerCase();
    });
    document.documentElement.lang=selector.value==='zh'?'zh-Hans':selector.value;
  }
  // Remember language across every public page. App's existing handler still updates room details.
  applyTranslations();
  selector.addEventListener('change',changeLanguage);
  try {const saved=localStorage.getItem('cohub-language');if(['en','zh','ms'].includes(saved))selector.value=saved;} catch{}
  selector.dispatchEvent(new Event('change'));
  let pending=false;
  new MutationObserver(()=>{if(pending)return;pending=true;queueMicrotask(()=>{pending=false;applyTranslations();});}).observe(document.body,{childList:true,subtree:true,characterData:true});
})();
