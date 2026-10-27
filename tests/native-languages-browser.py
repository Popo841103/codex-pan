"""Check every bundled language locally, including forms, carts and privacy."""
from pathlib import Path
from urllib.parse import urlparse,parse_qs
import json
from playwright.sync_api import sync_playwright
BASE='http://127.0.0.1:8000/'
LANGS=['zh-TW','ja','ko','th','id','vi','fr','de','es','pt','ru','ar','hi','it','nl','tr']
PAGES=['index.html','stay.html','community.html','guide.html','enquiry.html','supply.html','coffee.html','beer.html']
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 context=browser.new_context();page=context.new_page();errors=[];external=[];bad=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('request',lambda r:external.append(r.url) if not r.url.startswith(BASE) else None)
 page.on('response',lambda r:bad.append((r.status,r.url)) if r.status>=400 else None)
 def choose(lang):
  page.select_option('#language',lang)
  page.wait_for_function('([lang])=>document.documentElement.lang===(lang==="zh-TW"?"zh-Hant":lang)&&document.querySelector("#language-status").hidden',arg=[lang])
  page.wait_for_timeout(20)
 for name in PAGES:
  page.goto(BASE+name);page.select_option('#language','en')
  for lang in LANGS:
   choose(lang)
   assert page.locator('#language').input_value()==lang,(name,lang)
   assert page.evaluate('localStorage.getItem("cohub-language")')==lang
   assert page.locator('#translation-dialog').count()==0
   assert page.locator('a[href*="translate.google"]').count()==0
   assert page.locator('.language-tools').is_visible()
   assert page.locator('[data-en="Contact us"]').first.inner_text()!='Contact us',(name,lang)
   for width in [320,390,1440]:
    page.set_viewport_size({'width':width,'height':950})
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(name,lang,width)
   assert page.evaluate('document.documentElement.dir')==('rtl' if lang=='ar' else 'ltr')
  print(name,'16 extra languages checked',flush=True)
 for lang in LANGS:
  page.goto(BASE+'coffee.html');choose(lang)
  page.locator('[data-product="coffee-05"] .coffee-add').click();page.locator('.cart-launcher').click()
  assert 'RM 40.00' in page.locator('#coffee-total').inner_text(),lang
  assert page.locator('#coffee-whatsapp').get_attribute('href').startswith('https://wa.me/60178497319?text=')
  assert 'https://cohub.jovianhome.com/coffee.html#cart=' in parse_qs(urlparse(page.locator('#coffee-whatsapp').get_attribute('href')).query)['text'][0]
  page.locator('#coffee-clear').click() if page.locator('#coffee-clear').count() else page.locator('#clear-coffee-cart').click()
  page.keyboard.press('Escape')
  page.goto(BASE+'enquiry.html?type=general');choose(lang)
  guest='Guest <PRIVATE> 123 '+lang
  page.locator('#enquiry-name').fill(guest);page.locator('#enquiry-message').fill('My original question 42 — keep unchanged.')
  preview=page.locator('#enquiry-preview').input_value();assert guest in preview and 'My original question 42 — keep unchanged.' in preview
  page.evaluate('window.open=(url)=>{window.__sentUrl=url;return null}')
  page.locator('#enquiry-form button[type="submit"][value="whatsapp"]').click()
  msg=parse_qs(urlparse(page.evaluate('window.__sentUrl')).query)['text'][0]
  assert guest in msg and 'My original question 42 — keep unchanged.' in msg
  assert page.evaluate('localStorage.getItem("cohub-language")')==lang
  page.goto(BASE+'guide.html');page.wait_for_function('document.querySelector("#language-status").hidden')
  assert page.locator('#language').input_value()==lang
 assert not errors,errors
 assert not external,external
 assert not bad,bad
 print('PASS: 8 pages × 16 additional built-in languages × 3 widths; RTL; cart prices and WhatsApp links; personal inputs unchanged; cross-page persistence; no external translation requests or missing resources.')
 browser.close()
