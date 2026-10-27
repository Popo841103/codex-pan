"""Calendar UI fixtures: no production accounts, emails or database writes."""
from playwright.sync_api import sync_playwright
from datetime import datetime,timedelta,timezone
from urllib.parse import urlparse,parse_qs
import json
base='http://127.0.0.1:8000/'
project='https://qwdhiwghyclpkzwavhjf.supabase.co'
now=datetime.now(timezone(timedelta(hours=8)))
start=now.replace(hour=23,minute=0,second=0,microsecond=0)+timedelta(days=1)
event=dict(id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',title='<img src=x onerror=alert(1)>',title_zh='测试咖啡活动',description='Description <script>alert(1)</script>',starts_at=start.isoformat(),ends_at=(start+timedelta(hours=2)).isoformat(),location='38B Jalan Nagasari',category='coffee',language='English',fee_details='Free',capacity=5,status='approved')
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=b.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 def route(r):
  path=urlparse(r.request.url).path
  if path=='/rest/v1/cohub_events':return r.fulfill(json=[event],headers={'access-control-allow-origin':'*'})
  if path=='/auth/v1/settings':return r.fulfill(json={'external':{'google':False}},headers={'access-control-allow-origin':'*'})
  raise AssertionError(path)
 page.route(project+'/**',route)
 page.goto(base+'community.html');page.locator('.calendar-event').first.wait_for();assert page.locator('.calendar-week .calendar-day').count()==7
 page.locator('.calendar-event').first.click();assert page.locator('.calendar-dialog').is_visible();assert page.locator('.calendar-dialog script').count()==0
 assert 'Description <script>' in page.locator('.calendar-dialog').inner_text()
 assert '38B%20Jalan' in page.locator('.calendar-dialog a').get_attribute('href')
 page.locator('.calendar-close').click();page.select_option('#language','zh');assert page.locator('#community-calendar h2').inner_text()=='活动日历'
 page.get_by_role('button',name='月',exact=True).click();page.wait_for_function("document.querySelectorAll('.calendar-month .calendar-day').length===42")
 page.locator('.calendar-event').first.click();assert page.locator('.calendar-dialog h2').inner_text()=='测试咖啡活动';page.keyboard.press('Escape')
 page.locator('.calendar-toolbar select').select_option('web3');assert page.locator('.calendar-event').count()==0
 for width in [320,390,768,1440]:
  page.set_viewport_size({'width':width,'height':900});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
 page.locator('.calendar-toolbar select').select_option('');page.locator('#community-calendar').screenshot(path='/tmp/cohub-calendar-month.png');page.goto(base+'community-admin.html');page.wait_for_function('!!window.COHUB_MEMBER');assert not errors,errors
 
 page.evaluate('''() => {window.testAdmin=false;window.testSaved=null;window.testRegistration=null;
 window.COHUB_MEMBER.client=async()=>({rpc:async(name,args)=>{
 if(name==='cohub_is_admin')return {data:window.testAdmin};
 if(name==='cohub_admin_events')return {data:[window.fixtureEvent]};
 if(name==='cohub_admin_save'){window.testSaved=args;return {data:null};}
 if(name==='cohub_admin_registrations')return {data:[{user_id:'member-id',email:'private@example.test',status:'requested'}]};
 if(name==='cohub_admin_registration'){window.testRegistration=args;return {data:null};}
 throw Error(name);}});}''')
 page.evaluate('(e)=>window.fixtureEvent=e',event)
 page.get_by_role('button',name='刷新',exact=True).click();page.get_by_text('需要管理员权限，请使用已授权账号登录。',exact=True).wait_for()
 page.evaluate('window.testAdmin=true');page.get_by_role('button',name='刷新',exact=True).click();page.locator('.calendar-admin-row').first.wait_for()
 page.get_by_role('button',name='保存修改',exact=True).click();page.locator('.calendar-edit input[name=title]').fill('Edited event')
 page.locator('.calendar-edit button[type=submit]').click();page.wait_for_function('!!window.testSaved')
 saved=page.evaluate('window.testSaved');assert saved['patch']['title']=='Edited event';assert saved['patch']['ends_at'].endswith('Z');assert 'owner_id' not in saved['patch']
 page.locator('.calendar-close').click();page.get_by_role('button',name='报名管理',exact=True).click();page.get_by_text('private@example.test · 待确认').wait_for()
 page.get_by_role('button',name='确认报名',exact=True).click();page.wait_for_function('!!window.testRegistration');assert page.evaluate('window.testRegistration.new_status')=='confirmed'
 assert not errors,errors
 page.locator('.calendar-close').click();page.screenshot(path='/tmp/cohub-calendar-admin.png',full_page=True)

 b.close()
print('PASS: week/month, cross-day event, translated details, safe user text, category filter, mobile widths and shared admin auth initialisation')
