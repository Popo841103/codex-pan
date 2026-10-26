(() => {
  const form=document.querySelector('#community-host-form');if(!form)return;
  const status=document.querySelector('#community-host-status');
  const local=(en,zh,ms)=>window.COHUB_I18N.local(en,zh,ms);
  document.querySelector('#language').addEventListener('change',()=>{status.textContent='';});
  form.addEventListener('input',()=>{status.textContent='';});
  form.addEventListener('submit',event=>{
    event.preventDefault();
    const proposal=document.querySelector('#community-proposal');
    proposal.setCustomValidity(proposal.value.trim()?'':local('Please tell us what you would like to ask.','请填写需要咨询的内容。','Sila nyatakan pertanyaan anda.'));
    if(!form.reportValidity())return;
    const contact=document.querySelector('#community-reply').value.trim();
    const message=[local('Hello CO-HUB,','你好，CO-HUB：','Helo CO-HUB,'),local('Host an event','发起活动','Anjurkan aktiviti'),proposal.value.trim(),...(contact?[local('Reply contact: ','回复联系方式：','Hubungan balasan: ')+contact]:[])].join('\n');
    if(event.submitter?.value==='email'){
      location.href='mailto:cohubcom@gmail.com?subject='+encodeURIComponent('CO-HUB · '+local('Host an event','发起活动','Anjurkan aktiviti'))+'&body='+encodeURIComponent(message);
      status.textContent=local('Please review and send in your email app. If it does not open, copy the message and email cohubcom@gmail.com.','请在邮件应用检查并发送；如未打开，可复制消息发送至cohubcom@gmail.com。','Sila semak dan hantar dalam aplikasi e-mel. Jika tidak terbuka, salin mesej dan e-mel ke cohubcom@gmail.com.');
    }else{
      window.open('https://wa.me/60178497319?text='+encodeURIComponent(message),'_blank','noopener,noreferrer');
      status.textContent=local('Please review and tap Send in WhatsApp. If it does not open, copy the message and contact +60 17-849 7319.','请在WhatsApp检查并点击发送；如未打开，可复制消息联系+60 17-849 7319。','Sila semak dan tekan Hantar dalam WhatsApp. Jika tidak terbuka, salin mesej dan hubungi +60 17-849 7319.');
    }
  });
  form.addEventListener('input',()=>document.querySelector('#community-proposal').setCustomValidity(''));
})();
