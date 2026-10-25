(() => {
  const select=document.querySelector('#language');if(!select)return;
  let native=['en','zh','ms'].includes(select.value)?select.value:'en';
  const local=(en,zh,ms)=>({en,zh,ms}[native]||en);
  const choices=[['zh-TW','繁體中文 · 自動翻譯'],['ja','日本語 · 自動翻訳'],['ko','한국어 · 자동 번역'],['th','ไทย · แปลอัตโนมัติ'],['id','Bahasa Indonesia · terjemahan otomatis'],['vi','Tiếng Việt · dịch tự động'],['fr','Français · traduction automatique'],['de','Deutsch · automatische Übersetzung'],['es','Español · traducción automática'],['pt','Português · tradução automática'],['ru','Русский · автоматический перевод'],['ar','العربية · ترجمة آلية'],['hi','हिन्दी · स्वचालित अनुवाद'],['it','Italiano · traduzione automatica'],['nl','Nederlands · automatische vertaling'],['tr','Türkçe · otomatik çeviri']];
  const codes=new Set(choices.map(([code])=>code));
  const group=document.createElement('optgroup');
  choices.forEach(([code,label])=>{const option=document.createElement('option');option.value='read:'+code;option.textContent=label;group.append(option);});select.append(group);
  const dialog=document.createElement('dialog');dialog.id='translation-dialog';dialog.setAttribute('aria-labelledby','translation-title');
  dialog.innerHTML='<button type="button" class="dialog-close" id="translation-close" aria-label="Close">×</button><h2 id="translation-title"></h2><p id="translation-language"></p><p id="translation-explanation"></p><p id="translation-confirmation" class="small"></p><div class="actions"><a id="translation-open" class="button" target="_blank" rel="noopener noreferrer"></a><button id="translation-cancel" class="copy-enquiry" type="button"></button></div>';
  document.body.append(dialog);
  function labels(){
    group.label=local('More languages · automatic reading','更多语言 · 自动翻译阅读','Bahasa lain · bacaan terjemahan automatik');
    select.setAttribute('aria-label',local('Website language','网站语言','Bahasa laman web'));
    document.querySelector('#translation-title').textContent=local('Automatic translation reading','自动翻译阅读','Bacaan terjemahan automatik');
    document.querySelector('#translation-explanation').textContent=local('Open a reading version through Google Translate in a new tab. Automatic translations may contain errors. This is a third-party service.','将在新标签页通过Google Translate打开自动翻译阅读版。自动译文可能有误，这是第三方提供的服务。','Buka versi bacaan melalui Google Translate dalam tab baharu. Terjemahan automatik mungkin mengandungi kesilapan. Ini perkhidmatan pihak ketiga.');
    document.querySelector('#translation-confirmation').textContent=local('Return to the original website for enquiry forms and carts. Confirm prices, room details and terms with CO-HUB before making arrangements. No form entries or cart selections are included in this translation link.','填写咨询表单或使用购物车请返回原站；价格、房型与条款请向CO-HUB确认。翻译链接不会包含你已填写的表单内容或购物车清单。','Kembali ke laman asal untuk borang pertanyaan dan troli. Sahkan harga, butiran bilik dan syarat dengan CO-HUB. Pautan terjemahan tidak mengandungi isian borang atau pilihan troli.');
    document.querySelector('#translation-open').textContent=local('Open translated reading ↗','打开自动翻译阅读版 ↗','Buka bacaan terjemahan ↗');
    document.querySelector('#translation-cancel').textContent=local('Stay on original website','留在原站','Kekal di laman asal');
    document.querySelector('#translation-close').setAttribute('aria-label',local('Close','关闭','Tutup'));
  }
  select.addEventListener('change',event=>{
    if(!select.value.startsWith('read:')){if(['en','zh','ms'].includes(select.value))native=select.value;labels();return;}
    event.stopImmediatePropagation();
    const code=select.value.slice(5);select.value=native;if(!codes.has(code))return;
    const current=location.pathname.split('/').pop()||'index.html';
    const readable=new Set(['index.html','stay.html','supply.html','beer.html','coffee.html','community.html','guide.html']);
    const filename=readable.has(current)?current:'guide.html';
    const target=new URL(filename,'https://cohub.jovianhome.com/');
    const url=new URL('https://translate.google.com/translate');url.searchParams.set('sl','auto');url.searchParams.set('tl',code);url.searchParams.set('u',target.href);
    labels();document.querySelector('#translation-language').textContent=choices.find(([id])=>id===code)[1];document.querySelector('#translation-open').href=url.href;dialog.showModal();
  },true);
  ['translation-close','translation-cancel'].forEach(id=>document.querySelector('#'+id).addEventListener('click',()=>dialog.close()));
  document.querySelector('#translation-open').addEventListener('click',()=>dialog.close());
  labels();
})();
