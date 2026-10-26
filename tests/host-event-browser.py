"""Exercise activity entry points, proposal validation and handoff without sending."""
from playwright.sync_api import sync_playwright
from urllib.parse import urlparse, parse_qs
BASE='http://127.0.0.1:8000/'
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=b.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 for name in ['index.html']:
  page.goto(BASE+name)
  assert page.locator('#activity-entry-actions a').count()==2
  page.locator('#activity-entry-actions a[href="enquiry.html?type=host"]').click()
  assert page.locator('#enquiry-topic').input_value()=='host'
  assert page.locator('#host-fields').is_visible()
  assert not page.locator('#host-proposal').evaluate('(e)=>e.checkValidity()')
  assert page.locator('#stay-fields').evaluate('(e)=>e.disabled')
 page.locator('#host-proposal').fill('Coffee meetup <test>\n2026-12-27; 6 guests; English; free; café')
 page.locator('#enquiry-reply').fill('organiser@example.com')
 page.evaluate('window.open=(url)=>{window.testHandoff=url}')
 page.locator('#enquiry-form button[value="whatsapp"]').click()
 message=parse_qs(urlparse(page.evaluate('window.testHandoff')).query)['text'][0]
 assert 'Coffee meetup <test>' in message and 'organiser@example.com' in message
 for lang in ['en','zh','ms','zh-TW','ja','ko','th','id','vi','fr','de','es','pt','ru','ar','hi','it','nl','tr']:
  page.select_option('#language',lang)
  page.wait_for_function('document.querySelector("#language-status").hidden')
  assert page.locator('#host-proposal').input_value().startswith('Coffee meetup <test>')
  assert page.locator('#host-proposal').is_visible()
  page.set_viewport_size({'width':390,'height':850})
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),lang
  if lang!='en':assert page.locator('#host-fields legend').inner_text()!='Host an event',lang
 page.select_option('#enquiry-topic','activities')
 assert page.locator('#host-fields').evaluate('(e)=>e.disabled')
 assert page.locator('#activity-fields').is_visible()
 page.goto(BASE+'community.html')
 assert page.locator('main section').first.locator('#community-host-form').count()==1
 assert page.locator('#activity-entry-actions a[href="#host-event"]').count()==1
 page.select_option('#language','zh')
 page.locator('#community-proposal').fill('Yoga <test>\n2026-12-28; café; 6 guests')
 page.locator('#community-reply').fill('host@example.com')
 page.evaluate('window.open=(url)=>{window.testHandoff=url}')
 page.locator('#community-host-form button[value="whatsapp"]').click()
 message=parse_qs(urlparse(page.evaluate('window.testHandoff')).query)['text'][0]
 assert '发起活动' in message and 'Yoga <test>' in message and 'host@example.com' in message
 assert 'WhatsApp' in page.locator('#community-host-status').inner_text()
 page.select_option('#language','ja');page.wait_for_function('document.querySelector("#language-status").hidden')
 assert 'Yoga <test>' in page.locator('#community-proposal').input_value()
 assert page.locator('#community-host-status').inner_text()==''
 assert not errors,errors
 b.close()
print('PASS: two entry points, required proposal, 19 languages, safe WhatsApp handoff, topic switching.')
