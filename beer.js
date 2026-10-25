(() => {
  const products = window.COHUB_BEER_PRODUCTS;
  const local = (en, zh, ms) => ({en,zh,ms}[document.querySelector("#language").value] || en);
  const config = window.COHUB_BEER_PRICE_CONFIG;
  const byId = new Map(products.map(product => [product.id, product]));
  const storageKey = 'cohub-beer-enquiry-v1';
  const dialog = document.querySelector('#cart-dialog');
  const notice = document.querySelector('#cart-notice');
  let cart = [];
  let noticeTimer;
  const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money = amount => 'RM ' + Number(amount).toFixed(2);
  function price(product, unit) {
    const value = product.pricing && (unit === 'case' ? product.pricing.caseSourcePrice : product.pricing.singleSourcePrice);
    return Number.isFinite(value) && Number.isFinite(config.multiplier) ? Math.round(value * config.multiplier * 100) / 100 : null;
  }
  function unitLabel(product, unit) {
    const info = product.pricing;
    if (unit === 'case') return info?.unitsPerCase ? `Case (${info.unitsPerCase} × ${info.volumeMl} ml ${info.container}s)` : 'Case (format to confirm)';
    return info ? `${info.volumeMl} ml ${info.container}` : 'Single (format to confirm)';
  }
  function unitAllowed(product, unit) {
    return unit === 'single' || (unit === 'case' && (!product.pricing || product.pricing.unitsPerCase));
  }
  function validateRows(rows) {
    if (!Array.isArray(rows) || rows.length > products.length * 2) throw Error('Invalid cart');
    const result = [], keys = new Set();
    for (const row of rows) {
      if (!Array.isArray(row) || row.length !== 3) throw Error('Invalid cart line');
      const [id, unit, qty] = row, product = byId.get(id), key = id + ':' + unit;
      if (!product || !unitAllowed(product, unit) || !Number.isInteger(qty) || qty < 1 || qty > 999 || keys.has(key)) throw Error('Invalid cart selection');
      keys.add(key); result.push({id, unit, qty});
    }
    return result;
  }
  function rows() { return cart.map(line => [line.id, line.unit, line.qty]); }
  function notify(text) {
    clearTimeout(noticeTimer); notice.textContent = text; notice.hidden = false;
    noticeTimer = setTimeout(() => { notice.hidden = true; }, 5000);
  }
  function save() {
    try { localStorage.setItem(storageKey, JSON.stringify(rows())); } catch { /* Cart still works without storage. */ }
    document.querySelector('#cart-count').textContent = cart.reduce((sum, line) => sum + line.qty, 0);
    // A shared link describes its original request. Local edits create a new link on send.
  }
  function shareURL() {
    const encoded = btoa(JSON.stringify({v:1, items:rows()})).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
    return 'https://cohub.jovianhome.com/beer.html#cart=' + encoded;
  }
  function renderCards() {
    document.querySelectorAll('.beer-purchase').forEach(el => {
      const p = byId.get(el.dataset.product), info = p.pricing;
      const cp = price(p,'case'), sp = price(p,'single');
      const caseText = info && !info.unitsPerCase ? 'No case price listed' : cp === null ? 'Quote required' : money(cp);
      el.innerHTML = `<div class="product-prices"><div><span>Per case</span><strong>${caseText}</strong></div><div><span>Per ${info?.container || 'bottle / can'} · Suggested retail</span><strong>${sp===null?'Quote required':money(sp)}</strong></div></div><p class="priced-format">${info ? `Priced format: ${info.unitsPerCase ? info.unitsPerCase+' × ' : ''}${info.volumeMl} ml ${info.container}${info.unitsPerCase?'s':''}` : 'Product not listed in price sheet. Format and prices require confirmation.'}</p><div class="add-controls"><label>Format<select class="add-unit" aria-label="Format for ${escape(p.name)}">${unitAllowed(p,'case')?`<option value="case">${unitLabel(p,'case')}</option>`:''}<option value="single">${unitLabel(p,'single')}</option></select></label><label>Quantity<input class="add-qty" type="number" min="1" max="999" step="1" value="1" aria-label="Quantity for ${escape(p.name)}"></label><button class="button add-to-cart" type="button" data-id="${p.id}">Add to cart</button></div>`;
    });
  }
  function renderCart() {
    const lines = document.querySelector('#cart-lines');
    let cents = 0, unknown = 0;
    lines.innerHTML = cart.length ? cart.map(line => {
      const p = byId.get(line.id), amount = price(p,line.unit);
      if(amount===null) unknown++; else cents += Math.round(amount*100) * line.qty;
      return `<article class="cart-line"><div><h3>${escape(p.name)}</h3><p>${escape(unitLabel(p,line.unit))} · ${amount===null?'Quote required':money(amount)+' each'}</p></div><label>Qty<input class="cart-qty" type="number" min="1" max="999" step="1" value="${line.qty}" data-id="${line.id}" data-unit="${line.unit}" aria-label="Quantity for ${escape(p.name)}"></label><strong>${amount===null?'To be quoted':money(Math.round(amount*100)*line.qty/100)}</strong><button class="remove-line" type="button" data-id="${line.id}" data-unit="${line.unit}" aria-label="Remove ${escape(p.name)}">Remove</button></article>`;
    }).join('') : '<p class="cart-empty">Your enquiry cart is empty. Add products from the catalogue.</p>';
    document.querySelector('#cart-totals').innerHTML = cart.length ? `<p class="cart-subtotal">${unknown?'Priced items subtotal':'Reference subtotal'} <strong>${money(cents/100)}</strong></p>${unknown?`<p>${unknown} item line(s) require a separate quote and are not included in this subtotal.</p>`:''}<p class="small">Final quotation, availability, delivery and applicable taxes/charges are confirmed by CO-HUB. This is not a payable total.</p>` : '';
    const link = shareURL(), message = local(`Hello CO-HUB, please quote my craft beverage selection (${cart.length} product/format lines). My enquiry cart: ${link}\nPlease confirm stock, delivery and final quotation. This is an enquiry, not a confirmed order.`, `你好CO-HUB，请为我的精酿产品清单报价（${cart.length}项产品／规格）。询价购物车：${link}\n请确认库存、配送和最终报价。这是采购咨询，不是已确认订单。`, `Helo CO-HUB, sila beri sebut harga untuk pilihan minuman kraf saya (${cart.length} baris produk/format). Troli pertanyaan: ${link}\nSila sahkan stok, penghantaran dan sebut harga akhir. Ini pertanyaan, bukan pesanan yang disahkan.`);
    const whats = document.querySelector('#cart-whatsapp'), email = document.querySelector('#cart-email');
    whats.hidden = email.hidden = !cart.length;
    if (cart.length) {
      whats.href = 'https://wa.me/60178497319?text=' + encodeURIComponent(message);
      email.href = 'mailto:cohubcom@gmail.com?subject=' + encodeURIComponent('CO-HUB craft beverage cart enquiry') + '&body=' + encodeURIComponent(message);
    } else { whats.removeAttribute('href'); email.removeAttribute('href'); }
    document.querySelector('#copy-cart').disabled = !cart.length;
    document.querySelector('#clear-cart').disabled = !cart.length;
    document.querySelector('#manual-copy-label').hidden = true;
    document.querySelector('#cart-share-status').textContent = '';
  }
  function restoreSharedCart() {
    if (!location.hash.startsWith('#cart=')) return;
    try {
      const raw = location.hash.slice(6); if(raw.length > 10000) throw Error('Link too large');
      let b64 = raw.replace(/-/g,'+').replace(/_/g,'/'); b64 += '='.repeat((4-b64.length%4)%4);
      const data = JSON.parse(atob(b64)); if(data.v!==1) throw Error('Unsupported version');
      cart=validateRows(data.items);save();renderCart();if(!dialog.open)dialog.showModal();notify('Shared enquiry cart loaded. No order has been placed.');
    } catch { notify('This cart link is invalid or unsupported. Please ask for a new link.'); }
  }
  try { cart=validateRows(JSON.parse(localStorage.getItem(storageKey)||'[]')); } catch { cart=[]; }
  renderCards();save();
  document.querySelector('.beer-grid').addEventListener('click', event => {
    const button=event.target.closest('.add-to-cart');if(!button)return;
    const box=button.closest('.beer-purchase'), qtyInput=box.querySelector('.add-qty');
    if(!qtyInput.reportValidity())return;
    const qty=Number(qtyInput.value), unit=box.querySelector('.add-unit').value, id=button.dataset.id;
    const line=cart.find(item=>item.id===id&&item.unit===unit);
    if(line&&line.qty+qty>999){notify('Maximum quantity per product/format is 999.');return;}
    if(line)line.qty+=qty;else cart.push({id,unit,qty});
    save();notify(`Added ${qty} × ${unitLabel(byId.get(id),unit)} to your enquiry cart.`);
  });
  document.querySelectorAll('.open-cart').forEach(button=>button.addEventListener('click',()=>{renderCart();dialog.showModal();}));
  document.querySelector('#cart-close').addEventListener('click',()=>dialog.close());
  document.querySelector('#cart-lines').addEventListener('change',event=>{
    const input=event.target.closest('.cart-qty');if(!input)return;
    const line=cart.find(item=>item.id===input.dataset.id&&item.unit===input.dataset.unit);
    if(!input.reportValidity()){input.value=line.qty;return;}line.qty=Number(input.value);save();renderCart();
  });
  document.querySelector('#cart-lines').addEventListener('click',event=>{
    const button=event.target.closest('.remove-line');if(!button)return;
    cart=cart.filter(line=>line.id!==button.dataset.id||line.unit!==button.dataset.unit);save();renderCart();
  });
  document.querySelector('#clear-cart').addEventListener('click',()=>{cart=[];save();renderCart();});
  document.querySelector('#copy-cart').addEventListener('click',async()=>{
    const link=shareURL();try{await navigator.clipboard.writeText(link);document.querySelector('#cart-share-status').textContent='Cart link copied.';}catch{
      document.querySelector('#manual-copy-label').hidden=false;const input=document.querySelector('#manual-copy');input.value=link;input.focus();input.select();document.querySelector('#cart-share-status').textContent='Copy the selected cart link manually.';
    }
  });
  document.querySelector('#language').addEventListener('change',()=>{if(dialog.open)renderCart();});
  window.addEventListener('hashchange',restoreSharedCart);
  const search=document.querySelector('#beer-search'),category=document.querySelector('#beer-category');
  function filter(){const term=search.value.trim().toLowerCase();let visible=0;document.querySelectorAll('.beer-card').forEach(card=>{const match=(category.value==='all'||card.dataset.category===category.value)&&card.dataset.search.includes(term);card.hidden=!match;if(match)visible++;});document.querySelector('#beer-count').textContent=`${visible} product${visible===1?'':'s'}`;document.querySelector('#beer-empty').hidden=visible!==0;}
  search.addEventListener('input',filter);category.addEventListener('change',filter);
  restoreSharedCart();
})();
