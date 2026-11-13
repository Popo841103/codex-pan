import { contact } from './external-trial-store.js';
export function applicationPage(done=false) {
  return `<!doctype html><html lang="zh"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>申请使用 · JOVIAN PMS</title><link rel="stylesheet" href="/web/style.css"><body><main><h1>申请使用 / 联系我们</h1><p>对外公司试用版。申请审核后，由后台生成贵公司的独立账户。</p><p>仅使用虚构酒店、房间和测试客人，请勿填写真实客人或付款信息。</p><p>联系邮箱：<a href="mailto:${contact}">${contact}</a></p>${done?'<p role="status">申请已收到，请等待联系及账户开通。</p>':`<form method="post" action="/trial/apply"><label>公司名称<input name="company" maxlength="80" required></label><label>联系邮箱<input name="email" type="email" maxlength="254" required></label><button class="primary">提交申请</button></form>`}<p><a href="/web/">返回登录</a></p></main></body></html>`;
}
export function trialAsset(path,buffer) {
  if(!/\.(html|js)$/.test(path)&&path!=='/web/')return buffer;
  if(path==='/web/pwa.js')return Buffer.from('// External trial does not install an offline workspace.\n');
  let text=buffer.toString('utf8');
  text=text.replaceAll('COHUB-KL','NEBULA-EXAMPLE');
  if(path==='/web/'||path==='/web/index.html') {
    const link=`<p><a href="/trial/apply">申请使用 / 联系我们</a> · <a href="mailto:${contact}">${contact}</a></p>`;
    text=text.replace('<p id="login-error"',link+'<p id="login-error"');
    text=text.replace('<div id="message"',`<p class="notice">公司独立试用 · 预订、房态、房型、房价、清洁与测试账务免费。智能门锁、客户消息、自助入住、酒店网站需申请开放。<a href="mailto:${contact}">申请开放 / 联系我们</a></p><div id="message"`);
    text=text.replace('DEVELOPMENT / TEST','EXTERNAL COMPANY TRIAL');
  }
  if(path==='/web/backend.js')text=text.replace("new Error(data.error||'server_error')",`new Error(data.error==='feature_application_required'?'请申请开放此功能 / Request access: ${contact}':data.error||'server_error')`);
  // Static fallback must never restore another user's browser demo workspace.
  if(path==='/web/app.js')text=text.replace("const key = 'cohub-pms-demo-v1'","const key = 'external-trial-unused'");
  if(path==='/src/demo-store.js')text=text.replace('TEST · Kuala Lumpur','星云示例酒店').replace('TEST · Penang','月湾示例旅舍');
  return Buffer.from(text);
}
