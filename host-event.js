(() => {
  const dialog=document.querySelector('#host-event');if(!dialog)return;
  let trigger=null;
  const open=()=>{if(!dialog.open)dialog.showModal();};
  document.querySelectorAll('a[href="#host-event"]').forEach(link=>link.addEventListener('click',event=>{
    event.preventDefault();trigger=link;open();
  }));
  const close=()=>dialog.close();
  document.querySelector('#close-host-event').addEventListener('click',close);
  dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)close();}});
  dialog.addEventListener('close',()=>{
    if(location.hash==='#host-event')history.replaceState(null,'',location.pathname+location.search);
    trigger?.focus();
  });
  document.querySelector('#host-contact-team').addEventListener('click',()=>{close();document.querySelector('header [data-contact]')?.click();});
  addEventListener('hashchange',()=>{if(location.hash==='#host-event')open();});
  if(location.hash==='#host-event')open();
})();
