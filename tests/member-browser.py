"""Real SDK against isolated fixtures; no real accounts or emails are created."""
from playwright.sync_api import sync_playwright
from urllib.parse import urlparse,parse_qs
import json,time,base64
BASE='http://127.0.0.1:8000/'
PROJECT='https://qwdhiwghyclpkzwavhjf.supabase.co'
uid='11111111-1111-1111-1111-111111111111';other='22222222-2222-2222-2222-222222222222'
member={'id':uid,'aud':'authenticated','role':'authenticated','email':'member@example.com','email_confirmed_at':'2026-01-01T00:00:00Z','created_at':'2026-01-01T00:00:00Z','app_metadata':{'provider':'email','providers':['email']},'user_metadata':{},'identities':[]}
def enc(x):return base64.urlsafe_b64encode(json.dumps(x).encode()).decode().rstrip('=')
token=enc({'alg':'HS256','typ':'JWT'})+'.'+enc({'sub':uid,'exp':int(time.time())+3600,'role':'authenticated','aud':'authenticated'})+'.testsignature'
public={'id':'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','owner_id':other,'title':'Open Meetup','description':'Discussion','starts_at':'2027-12-27T10:00:00Z','location':'KL','language':'English','capacity':5,'fee_details':'Free','status':'approved','created_at':'2026-01-01T00:00:00Z'}
events=[public];registrations=[];follows=[];calls=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 context=browser.new_context();context.add_init_script("if(!localStorage.getItem('cohub-language'))localStorage.setItem('cohub-language','zh');");page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 def handler(route):
  req=route.request;u=urlparse(req.url);q=parse_qs(u.query);path=u.path;body=req.post_data_json if req.post_data else None;calls.append((path,req.method,body))
  def reply(data,status=200):route.fulfill(status=status,json=data,headers={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-expose-headers':'*'})
  if req.method=='OPTIONS':return reply({})
  if path=='/auth/v1/settings':return reply({'external':{'google':False}})
  if path=='/auth/v1/signup':
   if body['email']=='mail-unavailable@example.com':return reply({'msg':'Error sending confirmation email'},500)
   return reply(member)
  if path=='/auth/v1/token':
   if body.get('password')=='incorrect':return reply({'code':'invalid_credentials','msg':'Invalid login credentials'},400)
   return reply({'access_token':token,'refresh_token':'fake-refresh','token_type':'bearer','expires_in':3600,'user':member})
  if path=='/auth/v1/user':return reply(member)
  if path in ['/auth/v1/logout','/auth/v1/recover','/auth/v1/resend']:return reply({})
  if path=='/rest/v1/cohub_events':
   if req.method=='POST':events.append({**body,'id':'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','created_at':'2026-10-26T00:00:00Z'});return reply({},201)
   rows=events[:]
   for key in ['owner_id','status']:
    if key in q:rows=[e for e in rows if e[key]==q[key][0][3:]]
   if 'id' in q:rows=[e for e in rows if e['id'] in q['id'][0]]
   return reply(rows)
  if path=='/rest/v1/cohub_registrations':return reply(registrations)
  if path=='/rest/v1/cohub_cohosts':return reply([])
  if path=='/rest/v1/cohub_follows':
   if req.method=='POST':follows.append(body);return reply({},201)
   return reply(follows)
  if path=='/rest/v1/rpc/cohub_request_join':registrations.append({'event_id':body['target_event'],'user_id':uid,'status':'requested'});return reply(None)
  raise AssertionError((req.method,req.url,body))
 page.route(PROJECT+'/**',handler)
 page.goto(BASE+'community.html');assert page.locator('#member-auth-form button[value=signup]').inner_text()=='注册账号';assert page.locator('#close-host-event').inner_text()=='关闭';page.select_option('#language','en')
 assert not page.locator('#host-event').is_visible()
 page.locator('a[href="#host-event"]').click();page.wait_for_selector('#member-auth-form')
 page.wait_for_function('!document.querySelector("#host-event").hasAttribute("aria-busy")')
 assert not page.locator('#member-google').is_visible()
 page.locator('#member-email').fill('member@example.com');page.locator('#member-password').fill('valid-password')
 page.locator('#member-auth-form button[value=signup]').click()
 page.wait_for_function('document.querySelector("#member-status").textContent.includes("Check your email")')
 assert page.locator('#member-password').input_value()==''
 assert not page.locator('#member-create-form').is_visible()
 assert all('valid-password' not in v for v in page.evaluate('Object.values(localStorage)'))
 page.locator('#member-password').fill('incorrect');page.locator('#member-auth-form button[value=login]').click()
 page.wait_for_function('document.querySelector("#member-status").textContent.includes("Incorrect")')
 page.locator('#member-password').fill('valid-password');page.locator('#member-auth-form button[value=login]').click()
 page.wait_for_selector('#member-create-form',state='visible')
 for id,value in [('member-title','<img src=x onerror=alert(1)> My activities'),('member-description','An honest description'),('member-date','2027-12-27T18:00'),('member-location','CO-HUB'),('member-capacity','8'),('member-event-language','English'),('member-fees','Free')]:page.locator('#'+id).fill(value)
 page.locator('#member-create-form button[type=submit]').click()
 page.wait_for_function('document.querySelector("#member-status").textContent.includes("saved")')
 assert events[-1]['owner_id']==uid and events[-1]['status']=='pending'
 assert events[-1]['starts_at']=='2027-12-27T10:00:00.000Z'
 assert page.locator('#member-list img').count()==0
 original=events[-1]['title'];assert original in page.locator('#member-list').inner_text()
 for lang in ['zh','ja','fr','ar']:
  page.select_option('#language',lang);page.wait_for_function('document.querySelector("#language-status").hidden')
  assert original in page.locator('#member-list').inner_text(),lang
 page.select_option('#language','en')
 page.locator('#close-host-event').click();page.locator('#member-open-mine').click()
 page.wait_for_selector('#member-mine-view',state='visible')
 for tab in ['joined','following','cohosting','pending','hosting']:
  page.locator('[data-member-tab='+tab+']').click()
  page.wait_for_function('!document.querySelector("#host-event").hasAttribute("aria-busy")')
 page.locator('#close-host-event').click();page.locator('#member-load-events').click()
 page.wait_for_selector('#member-public-list .member-event-card')
 page.locator('#member-public-list button').first.click()
 page.wait_for_function('document.querySelector("#member-status").textContent.includes("request was saved")')
 assert len(registrations)==1
 page.locator('#member-logout').click();page.wait_for_selector('#member-auth-view',state='visible')
 assert page.locator('#member-list').inner_text()==''
 page.evaluate("localStorage.setItem('sb-qwdhiwghyclpkzwavhjf-auth-token-code-verifier',JSON.stringify('test-verifier/PASSWORD_RECOVERY'))")
 page.goto(BASE+'community.html?code=recovery-test')
 page.wait_for_selector('#member-recovery-form',state='visible')
 assert 'code=' not in page.url
 page.locator('#member-new-password').fill('new-test-password')
 page.locator('#member-recovery-form button').click()
 page.wait_for_function('document.querySelector("#member-status").textContent.includes("password was updated")')
 assert all('new-test-password' not in v for v in page.evaluate('Object.values(localStorage)'))
 page.locator('#member-logout').click();page.wait_for_selector('#member-auth-view',state='visible')
 page.locator('#member-email').fill('mail-unavailable@example.com');page.locator('#member-password').fill('valid-password')
 page.locator('#member-auth-form button[value=signup]').click()
 page.wait_for_function('document.querySelector("#member-status").textContent.includes("Email delivery")')
 box=page.locator('#member-status').bounding_box();win=page.locator('#host-event').bounding_box()
 assert win['y']<=box['y'] and box['y']+box['height']<=win['y']+win['height']
 assert not errors,errors
 browser.close()
print('PASS: actual bundled SDK; signup confirmation, rejected login, verified login, pending event persistence, MY timezone, five tabs, request-to-join, logout, input privacy and multilingual XSS-safe rendering. Real Supabase mail/OAuth not simulated as live validation.')
