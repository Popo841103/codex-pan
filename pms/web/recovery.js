const token=new URLSearchParams(location.hash.slice(1)).get('token');
// Keep the bearer token in memory, never in storage, server paths, referrers or form action URLs.
history.replaceState(null,'',location.pathname);
const form=document.querySelector('#recovery-form'),message=document.querySelector('#recovery-message');
if(!token||!/^[a-f0-9]{64}$/.test(token)){form.hidden=true;message.textContent='请从限时重设链接打开此页。Open the one-time recovery link. Buka pautan pemulihan sekali guna.';}
form.onsubmit=async event=>{
 event.preventDefault();
 const password=form.elements.password.value;
 if(password!==form.elements.confirm.value){message.textContent='两次密码不同 · Passwords do not match · Kata laluan tidak sepadan';return;}
 const button=form.querySelector('button');button.disabled=true;
 try{
  const response=await fetch('/api/account-recovery',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'omit',cache:'no-store',body:JSON.stringify({token,password})});
  const result=await response.json();
  if(!response.ok){
   message.textContent=result.error==='password_length'?'至少12个字符 · At least 12 characters · Sekurang-kurangnya 12 aksara':result.error==='rate_limited'?'请15分钟后再试 · Retry in 15 minutes · Cuba selepas 15 minit':'链接已过期或已使用，请申请新链接。Link expired or already used. Pautan tamat atau telah digunakan.';
   return;
  }
  form.reset();form.hidden=true;
  message.textContent=`密码已更新。用户名：${result.username}。Password updated. Username: ${result.username}. Kata laluan dikemas kini.`;
  document.querySelector('#recovery-login').hidden=false;
 }catch{message.textContent='连接失败。请重新打开原链接，使用刚设置的密码重试或登录验证。Connection failed. Reopen the original link and retry or try signing in.';}
 finally{button.disabled=false;}
};
