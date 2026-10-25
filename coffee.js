(() => {
  const products=window.COHUB_COFFEE_PRODUCTS;
  const byId=new Map(products.map(p=>[p.id,p]));
  const selector=document.querySelector('#language');
  const dialog=document.querySelector('#coffee-cart');
  const storage='cohub-coffee-enquiry-v1';
  const local=(en,zh,ms)=>({en,zh,ms}[selector.value]||en);
  const name=p=>p.names[{en:0,zh:1,ms:2}[selector.value]||0];
  const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=n=>'RM '+Number(n).toFixed(2);
  const format=unit=>unit==='box10'?local('Box · 10 bags','整盒 · 10袋','Kotak · 10 beg'):unit==='250g'?'250 g':'1 kg';
  let cart=[],noticeTimer;
  const launcher=document.querySelector('.cart-launcher');
  ['data-en','data-zh','data-ms'].forEach(key=>launcher.removeAttribute(key));
  window.COHUB_TRANSLATIONS={
    'Pack size':['包装规格','Saiz pek'],'Quantity':['数量','Kuantiti'],'Close':['关闭','Tutup']
  };
  function validate(rows){
    if(!Array.isArray(rows)||rows.length>products.reduce((n,p)=>n+Object.keys(p.prices).length,0))throw Error('Invalid cart');
    const seen=new Set();
    return rows.map(row=>{
      if(!Array.isArray(row)||row.length!==3)throw Error('Invalid cart line');
      const [id,unit,qty]=row,key=id+':'+unit;
      if(!byId.has(id)||!Object.hasOwn(byId.get(id).prices,unit)||!Number.isInteger(qty)||qty<1||qty>999||seen.has(key))throw Error('Invalid selection');
      seen.add(key);return {id,unit,qty};
    });
  }
  const rows=()=>cart.map(p=>[p.id,p.unit,p.qty]);
  function save(){try{localStorage.setItem(storage,JSON.stringify(rows()));}catch{}updateLauncher();}
  function updateLauncher(){launcher.textContent=local('Coffee cart','咖啡购物车','Troli kopi')+' · '+cart.reduce((sum,line)=>sum+line.qty,0);}
  function notify(en,zh,ms){
    const el=document.querySelector('#coffee-notice');el.textContent=local(en,zh,ms);el.hidden=false;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>el.hidden=true,5000);
  }
  function share(){return 'https://cohub.jovianhome.com/coffee.html#cart='+btoa(JSON.stringify({v:1,items:rows()})).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
  function renderCart(){
    updateLauncher();let total=0;
    document.querySelector('#coffee-lines').innerHTML=cart.length?cart.map(line=>{
      const p=byId.get(line.id),unitPrice=p.prices[line.unit];total+=unitPrice*line.qty;
      return `<article class="cart-line"><div><h3>${esc(name(p))}</h3><p>${format(line.unit)} · ${money(unitPrice)}</p></div><label>${local('Qty','数量','Kuantiti')}<input class="cart-qty" type="number" min="1" max="999" step="1" value="${line.qty}" data-id="${p.id}" data-unit="${line.unit}" aria-label="${esc(local('Quantity for ','数量：','Kuantiti untuk ')+name(p)+' '+format(line.unit))}"></label><strong>${money(unitPrice*line.qty)}</strong><button class="remove-line" type="button" data-id="${p.id}" data-unit="${line.unit}">${local('Remove','移除','Buang')}</button></article>`;
    }).join(''):`<p class="cart-empty">${local('Your coffee cart is empty. Choose a product to get started.','咖啡购物车为空，请先选择产品。','Troli kopi kosong. Pilih produk untuk bermula.')}</p>`;
    document.querySelector('#coffee-total').innerHTML=cart.length?`<p class="cart-subtotal">${local('Reference subtotal','参考小计','Jumlah kecil rujukan')}<strong>${money(total)}</strong></p><p class="small">${local('All prices exclude local delivery charges. Delivery and any applicable taxes or charges are confirmed in the final quotation. This is an enquiry, not an order or payment.','所有价格均不含本地运费。配送及相关税费将在最终报价中确认。这是采购咨询，不是订单或付款。','Semua harga tidak termasuk caj penghantaran tempatan. Penghantaran dan cukai atau caj berkaitan disahkan dalam sebut harga akhir. Ini pertanyaan, bukan pesanan atau bayaran.')}</p>`:'';
    const wa=document.querySelector('#coffee-whatsapp'),email=document.querySelector('#coffee-email');
    wa.textContent=local('Enquire on WhatsApp ↗','通过WhatsApp咨询 ↗','Tanya melalui WhatsApp ↗');
    email.textContent=local('Enquire by email ↗','通过邮件咨询 ↗','Tanya melalui e-mel ↗');
    wa.hidden=email.hidden=!cart.length;
    if(cart.length){
      const detail=cart.map(line=>`${name(byId.get(line.id))} / ${format(line.unit)} × ${line.qty}`).join('\n');
      const message=local('Hello CO-HUB, please confirm the quotation and availability for my coffee selection:','你好CO-HUB，请确认以下咖啡产品的报价和供货情况：','Helo CO-HUB, sila sahkan sebut harga dan stok untuk pilihan kopi saya:')+'\n'+detail+'\n'+local('Reference subtotal: ','参考小计：','Jumlah kecil rujukan: ')+money(total)+'\n'+share()+'\n'+local('Prices exclude local delivery charges. Please confirm delivery and the final quotation. This is an enquiry, not a confirmed order.','以上价格不含本地运费，请确认配送及最终报价。这是采购咨询，不是已确认订单。','Harga tidak termasuk caj penghantaran tempatan. Sila sahkan penghantaran dan sebut harga akhir. Ini pertanyaan, bukan pesanan yang disahkan.');
      wa.href='https://wa.me/60178497319?text='+encodeURIComponent(message);
      email.href='mailto:cohubcom@gmail.com?subject='+encodeURIComponent(local('CO-HUB coffee enquiry','CO-HUB咖啡采购咨询','Pertanyaan kopi CO-HUB'))+'&body='+encodeURIComponent(message);
    }else{wa.removeAttribute('href');email.removeAttribute('href');}
    const copy=document.querySelector('#coffee-copy'),clear=document.querySelector('#coffee-clear');
    copy.disabled=clear.disabled=!cart.length;
    copy.textContent=local('Copy cart link','复制购物车链接','Salin pautan troli');clear.textContent=local('Clear cart','清空购物车','Kosongkan troli');
    document.querySelector('#coffee-share-status').textContent='';document.querySelector('#coffee-manual-label').hidden=true;
  }
  function restoreShare(){
    if(!location.hash.startsWith('#cart='))return;
    try{
      const raw=location.hash.slice(6);if(raw.length>3000)throw Error('Too large');
      let encoded=raw.replace(/-/g,'+').replace(/_/g,'/');encoded+='='.repeat((4-encoded.length%4)%4);
      const data=JSON.parse(atob(encoded));if(data.v!==1)throw Error('Unsupported');cart=validate(data.items);save();renderCart();if(!dialog.open)dialog.showModal();
      notify('Shared coffee cart loaded. No order has been placed.','已载入分享的咖啡购物车，尚未下单。','Troli kopi dikongsi dimuatkan. Tiada pesanan dibuat.');
    }catch{notify('Invalid cart link. Please request a new link.','购物车链接无效，请索取新链接。','Pautan troli tidak sah. Sila minta pautan baharu.');}
  }
  try{cart=validate(JSON.parse(localStorage.getItem(storage)||'[]'));}catch{cart=[];}
  document.querySelectorAll('.coffee-add').forEach(button=>button.addEventListener('click',()=>{
    const card=button.closest('.coffee-card'),input=card.querySelector('.coffee-qty');if(!input.reportValidity())return;
    const qty=Number(input.value),unit=card.querySelector('.coffee-unit').value,id=card.dataset.product;
    const existing=cart.find(line=>line.id===id&&line.unit===unit);
    if(existing&&existing.qty+qty>999){notify('Maximum quantity per product/pack is 999.','每款产品每种规格最多999件。','Kuantiti maksimum bagi setiap produk/pek ialah 999.');return;}
    if(existing)existing.qty+=qty;else cart.push({id,unit,qty});save();notify('Added to your coffee enquiry cart.','已加入咖啡询价购物车。','Ditambah ke troli pertanyaan kopi anda.');
  }));
  document.querySelectorAll('.coffee-open-cart').forEach(button=>button.addEventListener('click',()=>{renderCart();dialog.showModal();}));
  document.querySelector('#coffee-close').addEventListener('click',()=>dialog.close());
  document.querySelector('#coffee-lines').addEventListener('change',event=>{
    const input=event.target.closest('.cart-qty');if(!input)return;
    const line=cart.find(p=>p.id===input.dataset.id&&p.unit===input.dataset.unit);if(!line)return;
    if(!input.reportValidity()){input.value=line.qty;return;}line.qty=Number(input.value);save();renderCart();
  });
  document.querySelector('#coffee-lines').addEventListener('click',event=>{
    const button=event.target.closest('.remove-line');if(!button)return;cart=cart.filter(p=>p.id!==button.dataset.id||p.unit!==button.dataset.unit);save();renderCart();
  });
  document.querySelector('#coffee-clear').addEventListener('click',()=>{cart=[];save();renderCart();});
  document.querySelector('#coffee-copy').addEventListener('click',async()=>{
    try{await navigator.clipboard.writeText(share());document.querySelector('#coffee-share-status').textContent=local('Cart link copied.','购物车链接已复制。','Pautan troli disalin.');}
    catch{document.querySelector('#coffee-manual-label').hidden=false;const input=document.querySelector('#coffee-manual');input.value=share();input.focus();input.select();document.querySelector('#coffee-share-status').textContent=local('Copy the selected link manually.','请手动复制已选中的链接。','Salin pautan dipilih secara manual.');}
  });
  selector.addEventListener('change',()=>{updateLauncher();if(dialog.open)renderCart();});window.addEventListener('hashchange',restoreShare);
  save();renderCart();restoreShare();
})();
