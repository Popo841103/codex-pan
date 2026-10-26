"""Hosting opens on request; unconfigured accounts never pretend to authenticate."""
from playwright.sync_api import sync_playwright
BASE='http://127.0.0.1:8000/'
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=b.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(BASE+'community.html')
 assert not page.locator('#host-event').is_visible()
 assert page.locator('#activity-entry-actions a').count()==2
 assert page.locator('#community-host-form').count()==0
 trigger=page.locator('#activity-entry-actions a[href="#host-event"]')
 trigger.click();assert page.locator('#host-event').is_visible()
 assert page.locator('#host-event input[type=password]').count()==0
 assert page.locator('#host-event a[href*="wa.me"]').count()==0
 page.keyboard.press('Escape');assert not page.locator('#host-event').is_visible()
 assert trigger.evaluate('(e)=>document.activeElement===e')
 for lang in ['en','zh','ms','zh-TW','ja','ko','th','id','vi','fr','de','es','pt','ru','ar','hi','it','nl','tr']:
  page.select_option('#language',lang);page.wait_for_function('document.querySelector("#language-status").hidden')
  trigger.click()
  for width in [320,390,1440]:
   page.set_viewport_size({'width':width,'height':900})
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),lang
   assert page.locator('#host-event').evaluate('(e)=>e.scrollWidth<=e.clientWidth+1'),lang
  if lang!='en':assert page.locator('#host-account-title').inner_text()!='Sign in to host an event',lang
  page.locator('#close-host-event').click()
 page.goto(BASE+'enquiry.html?type=host')
 page.wait_for_url('**/community.html#host-event')
 assert page.locator('#host-event').is_visible()
 page.locator('#host-contact-team').click()
 assert not page.locator('#host-event').is_visible()
 assert not errors,errors
 b.close()
print('PASS: closed on load, click-to-open, Escape/focus, 19 languages, mobile dialog, legacy host redirect; no fake account form.')
