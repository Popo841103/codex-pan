const button=document.querySelector('#install-app');
let installPrompt;
const instructions={
 zh:{button:'添加到手机桌面',help:'Android：在 Chrome／Edge 菜单中选择“安装应用”或“添加到主屏幕”。iPhone：用 Safari 打开本站，点“分享”→“添加到主屏幕”。安装后仍需登录和联网；收付款、库存及入住退房不能离线提交。',install:'安装 JOVIAN'},
 en:{button:'Install app',help:'Android: use Install app or Add to Home screen in Chrome / Edge. iPhone: open this site in Safari, then Share → Add to Home Screen. Sign-in and a live connection are required for inventory, payments and check-in / checkout.',install:'Install JOVIAN'},
 ms:{button:'Pasang aplikasi',help:'Android: pilih Pasang aplikasi atau Tambah ke skrin utama dalam Chrome / Edge. iPhone: buka laman ini dalam Safari, kemudian Kongsi → Tambah ke Skrin Utama. Log masuk dan sambungan diperlukan untuk inventori, bayaran dan daftar masuk / keluar.',install:'Pasang JOVIAN'}
};
function update(){const text=instructions[document.documentElement.lang]||instructions.en;button.textContent=text.button;button.hidden=matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;}
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;update();});
window.addEventListener('appinstalled',()=>{installPrompt=null;button.hidden=true;});
button.addEventListener('click',async()=>{
 if(installPrompt){const prompt=installPrompt;installPrompt=null;await prompt.prompt();await prompt.userChoice;update();return;}
 const text=instructions[document.documentElement.lang]||instructions.en;
 document.querySelector('#utility-title').textContent=text.install;
 document.querySelector('#utility-body').textContent=text.help;
 document.querySelector('#utility-error').textContent='';
 document.querySelector('#utility-dialog').showModal();
});
new MutationObserver(update).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
update();
if('serviceWorker' in navigator&&window.isSecureContext)navigator.serviceWorker.register('/web/sw.js',{scope:'/web/'}).catch(()=>{});
