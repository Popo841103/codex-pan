(() => {
  if(new URLSearchParams(location.search).get('type')==='host'){location.replace('community.html#host-event');return;}
  const form=document.querySelector('#enquiry-form');if(!form)return;
  const languageSelect=document.querySelector('#language');
  const topic=document.querySelector('#enquiry-topic');
  const status=document.querySelector('#enquiry-status');
  const preview=document.querySelector('#enquiry-preview');
  const roomSelect=document.querySelector('#stay-room');
  const local=(en,zh,ms)=>window.COHUB_I18N.local(en,zh,ms);
  const languageIndex=()=>({en:0,zh:1,ms:2}[languageSelect.value]||0);
  const field=id=>document.querySelector('#'+id);
  const value=id=>field(id).value.trim();
  const topicNames={general:['General enquiry','一般咨询','Pertanyaan umum'],stay:['Future accommodation enquiry','未来住宿咨询','Pertanyaan penginapan akan datang'],activities:['Community & activity interests','社区与活动兴趣','Minat komuniti & aktiviti'],opening:['Request opening updates','申请接收开业通知','Minta berita pembukaan'],supply:['Business supply enquiry','企业采购咨询','Pertanyaan bekalan perniagaan']};
  // Product names are confirmed room types, not a live inventory.
  if(typeof inventory!=='undefined')inventory.forEach((room,index)=>{
    const option=document.createElement('option');option.value=String(index);
    ['en','zh','ms'].forEach((lang,n)=>option.dataset[lang]=room.name[n]);
    option.textContent=room.name[languageIndex()];roomSelect.append(option);
  });
  const params=new URLSearchParams(location.search);
  if(Object.hasOwn(topicNames,params.get('type')))topic.value=params.get('type');
  if([...roomSelect.options].some(option=>option.value===params.get('room')))roomSelect.value=params.get('room');
  const chosenInterests=new Set((params.get('interest')||'').split(','));
  form.querySelectorAll('[name="activity"]').forEach(input=>input.checked=chosenInterests.has(input.value));
  const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Kuala_Lumpur',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  ['stay-arrival','stay-departure','activity-date'].forEach(id=>field(id).min=today);
  function selectedText(id){const el=field(id);return window.COHUB_I18N.t(el.selectedOptions[0]?.textContent||'');}
  function buildMessage(){
    const lines=[local('Hello CO-HUB,','你好，CO-HUB：','Helo CO-HUB,'),window.COHUB_I18N.t(topicNames[topic.value][languageIndex()])];
    if(value('enquiry-name'))lines.push(local('Name: ','姓名：','Nama: ')+value('enquiry-name'));
    if(topic.value==='stay'){
      lines.push(local('Room preference: ','意向房型：','Pilihan penginapan: ')+selectedText('stay-room'));
      lines.push(local('Guests: ','人数：','Tetamu: ')+value('stay-guests'));
      if(value('stay-arrival'))lines.push(local('Planned arrival: ','计划入住：','Tarikh tiba: ')+value('stay-arrival'));
      if(value('stay-departure'))lines.push(local('Planned departure: ','计划退房：','Tarikh keluar: ')+value('stay-departure'));
      lines.push(local('I understand accommodation is still being prepared. Please confirm future booking arrangements; this is not a reservation.','我了解住宿仍在筹备，请确认未来预订安排。本次仅咨询，不是订房。','Saya memahami penginapan masih disediakan. Sila sahkan aturan tempahan akan datang; ini bukan tempahan.'));
    }
    if(topic.value==='activities'){
      const activities=[...form.querySelectorAll('[name="activity"]:checked')].map(input=>window.COHUB_I18N.t(input.closest('label').querySelector('span').textContent));
      lines.push(local('Interests: ','活动兴趣：','Minat: ')+(activities.length?activities.join(' / '):local('Please recommend','希望获得推荐','Sila cadangkan')));
      if(value('activity-date'))lines.push(local('Preferred date: ','期望日期：','Tarikh pilihan: ')+value('activity-date'));
      lines.push(local('Please let me know when dates, participation arrangements and fees are confirmed. This does not reserve a place.','请在日期、参加安排和费用确定后联系我。本次不保留活动名额。','Sila maklumkan apabila tarikh, aturan penyertaan dan bayaran disahkan. Ini tidak menempah tempat.'));
    }
    if(topic.value==='supply'){
      lines.push(local('Category: ','采购品类：','Kategori: ')+selectedText('supply-category'));
      [['supply-quantity',['Quantity / specification: ','数量／规格：','Kuantiti / spesifikasi: ']],['supply-area',['Delivery area: ','配送地区：','Kawasan penghantaran: ']],['supply-business',['Business / project: ','公司／项目：','Perniagaan / projek: ']]].forEach(([id,labels])=>{if(value(id))lines.push(window.COHUB_I18N.t(labels[languageIndex()])+value(id));});
      lines.push(local('Please confirm specifications, availability, delivery and a quotation before an order is agreed.','请确认规格、供货、配送与报价后再商定订单。','Sila sahkan spesifikasi, stok, penghantaran dan sebut harga sebelum pesanan dipersetujui.'));
    }
    if(topic.value==='opening')lines.push(local('I would like updates when accommodation bookings or community activities open. Please confirm my request. I can ask to stop updates at any time.','我希望收到住宿开放预订或社区活动消息，请确认登记。我可以随时告知停止联系。','Saya ingin menerima berita apabila tempahan penginapan atau aktiviti komuniti dibuka. Sila sahkan permintaan saya. Saya boleh meminta berita dihentikan pada bila-bila masa.'));
    if(value('enquiry-message'))lines.push(local('Notes: ','补充需求：','Nota: ')+value('enquiry-message'));
    if(value('enquiry-reply'))lines.push(local('Reply contact: ','回复联系方式：','Hubungan balasan: ')+value('enquiry-reply'));
    return lines.join('\n');
  }
  function update(){
    ['stay','activity','supply','opening'].forEach(key=>{
      const section=field(key+'-fields');const active=topic.value===(key==='activity'?'activities':key);
      section.hidden=!active;section.disabled=!active;
    });
    field('enquiry-message').required=topic.value==='general';
    field('enquiry-message').setCustomValidity('');field('stay-departure').setCustomValidity('');
    if(topic.value==='stay'&&value('stay-arrival')&&value('stay-departure')&&value('stay-departure')<=value('stay-arrival'))field('stay-departure').setCustomValidity(local('Departure must be after arrival.','退房日期须晚于入住日期。','Tarikh keluar mesti selepas tarikh tiba.'));
    preview.value=buildMessage();
    preview.setAttribute('aria-label',local('Enquiry message','咨询内容','Mesej pertanyaan'));
    status.textContent='';
  }
  function valid(){
    update();if(topic.value==='general'&&!value('enquiry-message'))field('enquiry-message').setCustomValidity(local('Please tell us what you would like to ask.','请填写需要咨询的内容。','Sila nyatakan pertanyaan anda.'));
    return form.reportValidity();
  }
  form.addEventListener('input',update);form.addEventListener('change',update);
  languageSelect.addEventListener('change',()=>{
    // The existing app updates data-en elements first; keep the message in the chosen language.
    form.querySelectorAll('[data-en]').forEach(el=>{if(el.dataset[languageSelect.value])el.textContent=el.dataset[languageSelect.value];});update();
  });
  form.addEventListener('submit',event=>{
    event.preventDefault();if(!valid())return;
    const message=buildMessage();
    if(event.submitter?.value==='email'){
      location.href='mailto:cohubcom@gmail.com?subject='+encodeURIComponent('CO-HUB · '+window.COHUB_I18N.t(topicNames[topic.value][languageIndex()]))+'&body='+encodeURIComponent(message);
      status.textContent=local('Please review and send in your email app. If it does not open, copy the message and email cohubcom@gmail.com.','请在邮件应用检查并发送；如未打开，可复制消息发送至cohubcom@gmail.com。','Sila semak dan hantar dalam aplikasi e-mel. Jika tidak terbuka, salin mesej dan e-mel ke cohubcom@gmail.com.');
    }else{
      window.open('https://wa.me/60178497319?text='+encodeURIComponent(message),'_blank','noopener,noreferrer');
      status.textContent=local('Please review and tap Send in WhatsApp. If it does not open, copy the message and contact +60 17-849 7319.','请在WhatsApp检查并点击发送；如未打开，可复制消息联系+60 17-849 7319。','Sila semak dan tekan Hantar dalam WhatsApp. Jika tidak terbuka, salin mesej dan hubungi +60 17-849 7319.');
    }
  });
  field('copy-enquiry').addEventListener('click',async()=>{
    if(!valid())return;
    try{await navigator.clipboard.writeText(buildMessage());status.textContent=local('Message copied. Paste it into WhatsApp or email and send to CO-HUB.','消息已复制，请粘贴到WhatsApp或邮件发送给CO-HUB。','Mesej disalin. Tampal dalam WhatsApp atau e-mel dan hantar kepada CO-HUB.');}
    catch{preview.focus();preview.select();status.textContent=local('Select and copy the message above, then send it to CO-HUB.','请手动复制上方已选中的消息，再发送给CO-HUB。','Salin mesej yang dipilih di atas, kemudian hantar kepada CO-HUB.');}
  });
  update();
})();
