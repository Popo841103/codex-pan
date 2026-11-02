"""Build native member forms; identity and permissions live in Supabase."""
from pathlib import Path
import html as H,json
from lxml import html,etree
R=Path(__file__).resolve().parents[2]
COPY=[
['Host an event','发起活动','Anjurkan aktiviti'],
['My activities','我的活动','Aktiviti saya'],['Sign in','登录','Log masuk'],['Create account','注册账号','Daftar akaun'],['Email','邮箱','E-mel'],['Password','密码','Kata laluan'],['Use at least 8 characters. Verify your email before hosting or joining an event.','密码至少8位。发起或参加活动前，请先验证邮箱。','Gunakan sekurang-kurangnya 8 aksara. Sahkan e-mel sebelum menganjurkan atau menyertai aktiviti.'],
['Forgot password','忘记密码','Lupa kata laluan'],['Resend verification email','重发验证邮件','Hantar semula e-mel pengesahan'],['Sign out','退出登录','Log keluar'],['Check your email to confirm your account, then sign in.','请到邮箱确认账号，然后返回登录。','Semak e-mel untuk mengesahkan akaun, kemudian log masuk.'],['Please verify your email first.','请先验证邮箱。','Sila sahkan e-mel dahulu.'],['We could not complete this request. Please try again or contact the team.','暂时无法完成，请重试或联系团队。','Permintaan tidak dapat diselesaikan. Cuba lagi atau hubungi pasukan.'],['Email delivery is unavailable or limited. Please contact the team.','验证邮件暂时无法发送或已达限额，请联系团队。','Penghantaran e-mel tidak tersedia atau terhad. Sila hubungi pasukan.'],['Incorrect email or password.','邮箱或密码不正确。','E-mel atau kata laluan tidak betul.'],['If the account exists, check your email for the next step.','如账号存在，请查看邮箱中的后续操作邮件。','Jika akaun wujud, semak e-mel untuk langkah seterusnya.'],
['Event title','活动名称','Tajuk aktiviti'],['Event description','活动介绍','Penerangan aktiviti'],['Date and time (Malaysia time)','日期与时间（马来西亚时间）','Tarikh dan masa (waktu Malaysia)'],['Location','地点','Lokasi'],['Participant limit','人数上限','Had peserta'],['Event language','现场语言','Bahasa aktiviti'],['Fees and what is included','费用及包含内容','Bayaran dan perkara yang disertakan'],['Submit for review','提交审核','Hantar untuk semakan'],['Your event was saved and is awaiting team review.','活动已保存，等待团队审核。','Aktiviti disimpan dan menunggu semakan pasukan.'],['Submitting an event does not confirm the venue, date or fees.','提交活动不代表场地、日期或费用已确认。','Menghantar aktiviti tidak mengesahkan tempat, tarikh atau bayaran.'],
['Joined','已参加','Disertai'],['Hosting','我发起的','Saya anjurkan'],['Following','已关注','Diikuti'],['Co-hosting','联合主办','Penganjur bersama'],['Pending','待处理','Menunggu'],['No activities here yet.','这里暂时没有活动。','Belum ada aktiviti di sini.'],['Approved','已通过','Diluluskan'],['Rejected','未通过','Ditolak'],['Cancelled','已取消','Dibatalkan'],['Confirmed','已确认','Disahkan'],['Requested','报名待确认','Permohonan menunggu pengesahan'],['Invited','受邀待处理','Jemputan menunggu'],['Accept','接受','Terima'],['Decline','拒绝','Tolak'],
['Upcoming events','即将举行的活动','Aktiviti akan datang'],['Confirmed events will appear here. You can register your interests below.','已确认的活动将在这里公布，也可以在下方登记兴趣。','Aktiviti yang disahkan akan dipaparkan di sini. Daftar minat anda di bawah.'],['Request to join','申请参加','Mohon menyertai'],['Follow','关注','Ikuti'],['Your request was saved. The team will confirm participation.','申请已保存，参加安排由团队确认。','Permohonan disimpan. Pasukan akan mengesahkan penyertaan.'],['Saved to your activities.','已保存到我的活动。','Disimpan dalam aktiviti anda.'],['Choose a future date.','请选择未来的日期。','Pilih tarikh akan datang.'],['Google sign-in','使用Google登录','Log masuk dengan Google'],['Update password','更新密码','Kemas kini kata laluan'],['Your password was updated.','密码已更新。','Kata laluan dikemas kini.'],['Loading…','正在加载…','Sedang dimuatkan…'],['Password must contain at least 8 characters.','密码至少需要8位。','Kata laluan mestilah sekurang-kurangnya 8 aksara.'],['You already host this event.','你已是该活动的发起人。','Anda sudah menganjurkan aktiviti ini.'],['Please sign in again.','请重新登录。','Sila log masuk semula.']]
by={x[0]:x for x in COPY}
def el(tag,en,attrs=''):
 a=by.get(en,[en,en,en]);return '<'+tag+' '+attrs+' '+ ' '.join('data-'+k+'="'+H.escape(v,quote=True)+'"' for k,v in zip(['en','zh','ms'],a))+'>'+H.escape(a[0])+'</'+tag+'>'
def label(en,control):return '<label>'+el('span',en)+control+'</label>'
def btn(en,attrs=''):return el('button',en,'type="button" class="button button-secondary" '+attrs)
form='<div id="member-auth-view">'+el('h3','Sign in')+'<form id="member-auth-form">'+label('Email','<input id="member-email" type="email" autocomplete="email" maxlength="254" required>')+label('Password','<input id="member-password" type="password" autocomplete="current-password" maxlength="128" required>')+el('p','Use at least 8 characters. Verify your email before hosting or joining an event.')+'<div class="actions">'+el('button','Sign in','class="button" type="submit" value="login"')+el('button','Create account','class="button button-secondary" type="submit" value="signup"')+'</div><div class="actions">'+btn('Forgot password','id="member-forgot"')+btn('Resend verification email','id="member-resend"')+btn('Google sign-in','id="member-google" hidden')+'</div></form></div>'
form+='<div id="member-session" hidden><p id="member-email-display" data-user-content></p>'+btn('Sign out','id="member-logout"')+'</div>'
form+='<form id="member-create-form" hidden>'+el('h3','Host an event')+label('Event title','<input id="member-title" maxlength="160" required>')+label('Event description','<textarea id="member-description" rows="4" maxlength="5000" required></textarea>')+label('Date and time (Malaysia time)','<input id="member-date" type="datetime-local" required>')+label('Location','<input id="member-location" maxlength="300" required>')+label('Participant limit','<input id="member-capacity" type="number" min="1" max="1000" step="1" required>')+label('Event language','<input id="member-event-language" maxlength="100" required>')+label('Fees and what is included','<input id="member-fees" maxlength="300" required>')+el('p','Submitting an event does not confirm the venue, date or fees.')+el('button','Submit for review','class="button" type="submit"')+'</form>'
form+='<div id="member-mine-view" hidden>'+el('h3','My activities')+'<div class="member-tabs" role="group">'+''.join(btn(name,'data-member-tab="'+key+'"') for key,name in [('joined','Joined'),('hosting','Hosting'),('following','Following'),('cohosting','Co-hosting'),('pending','Pending')])+'</div><div id="member-list"></div></div>'
form+='<form id="member-recovery-form" hidden>'+label('Password','<input id="member-new-password" type="password" minlength="8" maxlength="128" autocomplete="new-password" required>')+el('button','Update password','class="button" type="submit"')+'</form>'
# Keep fixed status phrases in dictionaries, not raw provider errors or user content.
form+='<div hidden id="member-copy">'+''.join(el('span',x[0]) for x in COPY)+'</div>'
tree=html.fromstring((R/'community.html').read_bytes());dialog=tree.xpath('//*[@id="host-event"]')[0]
for old in list(dialog):
 if 'host-dialog-top' not in old.get('class',''):dialog.remove(old)
dialog.set('aria-labelledby','member-dialog-title');dialog.xpath('.//h2')[0].set('id','member-dialog-title')
close=dialog.xpath('.//*[@id="close-host-event"]')[0]
if close.getparent().tag!='form':
 close.set('type','submit')
 wrapper=etree.Element('form',method='dialog',attrib={'class':'member-close-form'})
 close.addprevious(wrapper);wrapper.append(close)

dialog.append(html.fromstring('<div class="member-content"><p id="member-status" role="status" aria-live="polite"></p>'+form+'</div>'))
lead=tree.xpath('//section[contains(@class,"community-discovery")]/div')[0];lead.append(html.fromstring(btn('My activities','id="member-open-mine"')))
section='<section class="section" id="member-events">'+el('h2','Upcoming events')+el('p','Confirmed events will appear here. You can register your interests below.')+'<button type="button" class="button button-secondary" id="member-load-events" data-en="Upcoming events" data-zh="即将举行的活动" data-ms="Aktiviti akan datang">Upcoming events</button><div id="member-public-list"></div></section>'
tree.xpath('//*[@id="builders"]')[0].addprevious(html.fromstring(section))
config=json.loads((R/'scripts/member-system/project.json').read_text())
(R/'member-config.js').write_text('window.COHUB_MEMBER_CONFIG='+json.dumps(config)+';\n')
script=tree.xpath('//script[starts-with(@src,"host-event.js")]')[0]
script.addprevious(etree.Element('script',src='member-config.js?v=20261027-calendar1'))
# Host interaction script initializes the SDK lazily on demand.
(R/'community.html').write_text('<!doctype html>\n'+html.tostring(tree,encoding='unicode',method='html'))
(R/'scripts/member-system/ui-copy.json').write_text(json.dumps(COPY,ensure_ascii=False,indent=2))
