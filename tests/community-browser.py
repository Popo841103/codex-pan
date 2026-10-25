"""Browser regression checks. Run after starting the static site on 127.0.0.1:8000."""
from playwright.sync_api import sync_playwright
from urllib.parse import urlparse,parse_qs
from pathlib import Path

BASE='http://127.0.0.1:8000/'
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    context=browser.new_context(viewport={'width':1440,'height':1000})
    page=context.new_page();errors=[];bad=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('response',lambda response:bad.append((response.status,response.url)) if response.status>=400 and response.url.startswith(BASE) else None)
    for filename in ['index.html','stay.html','community.html','guide.html','enquiry.html','supply.html','coffee.html','beer.html']:
        page.goto(BASE+filename)
        for lang in ['en','zh','ms']:
            page.select_option('#language',lang)
            for width in [320,390,768,1440]:
                page.set_viewport_size({'width':width,'height':1000})
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(filename,lang,width)
                assert page.locator('header .nav-supply').is_visible()
        assert page.locator('footer a[href="https://www.instagram.com/cohub.kl/"]').count()==1
    page.goto(BASE+'community.html');page.select_option('#language','zh')
    assert page.locator('.experience-card').count()==7
    assert [page.locator('.experience-card h3').nth(i).inner_text() for i in range(3)]==['CO-HUB 数字游民圈','AI Agent 实用交流','Web3 构建者交流']
    assert '筹备中' in page.locator('.experience-card').first.inner_text()
    page.goto(BASE+'guide.html');assert '15:00' in page.locator('.guide-stay').inner_text() and '12:00' in page.locator('.guide-stay').inner_text()
    direction=page.locator('a[href*="maps/dir"]').first.get_attribute('href');args=parse_qs(urlparse(direction).query)
    assert '38B Jalan Nagasari' in args['destination'][0] and args['travelmode']==['transit']
    assert page.locator('a[href*="kliaekspres.com"]').count()==1
    page.goto(BASE+'enquiry.html?type=activities&interest=ai-agents');assert page.locator('#enquiry-topic').input_value()=='activities'
    assert page.locator('[name="activity"][value="ai-agents"]').is_checked()
    assert page.locator('#stay-fields').is_hidden() and page.locator('#activity-fields').is_visible()
    assert not page.locator('#enquiry-message').evaluate('(el)=>el.required')
    page.locator('#enquiry-name').fill('Guest Example')
    page.locator('#enquiry-message').fill('<img src=x onerror=alert(1)>')
    assert page.locator('#enquiry-message img').count()==0
    assert '<img src=x onerror=alert(1)>' in page.locator('#enquiry-preview').input_value()
    page.evaluate('window.open=(url,target,features)=>{window.lastOpened={url,target,features};return null}')
    page.locator('#enquiry-form button[type="submit"][value="whatsapp"]').click()
    opened=page.evaluate('window.lastOpened');assert urlparse(opened['url']).netloc=='wa.me' and urlparse(opened['url']).path=='/60178497319'
    message=parse_qs(urlparse(opened['url']).query)['text'][0];assert 'AI Agent' in message and 'Guest Example' in message
    assert 'noopener' in opened['features'];assert '发送' in page.locator('#enquiry-status').inner_text()
    page.select_option('#language','ms');assert 'Minat komuniti' in page.locator('#enquiry-preview').input_value()
    page.select_option('#enquiry-topic','stay');page.locator('#stay-arrival').fill('2027-02-10');page.locator('#stay-departure').fill('2027-02-09')
    assert not page.locator('#stay-departure').evaluate('(el)=>el.validity.valid')
    page.locator('#stay-departure').fill('2027-02-12');assert page.locator('#stay-departure').evaluate('(el)=>el.validity.valid')
    assert '2027-02-12' in page.locator('#enquiry-preview').input_value()
    page.select_option('#enquiry-topic','supply');assert page.locator('#stay-fields').is_hidden() and page.locator('#supply-fields').is_visible()
    page.select_option('#supply-category','capsules');page.locator('#supply-quantity').fill('20 capsules');page.locator('#supply-area').fill('Kuala Lumpur')
    draft=page.locator('#enquiry-preview').input_value();assert '20 capsules' in draft and '2027-02-12' not in draft
    page.select_option('#enquiry-topic','opening');assert page.locator('#opening-fields').is_visible();assert '20 capsules' not in page.locator('#enquiry-preview').input_value()
    assert 'berita' in page.locator('#enquiry-preview').input_value().lower()
    # More-language selection must never enter the app's native-language state or share customer input.
    page.select_option('#language','read:ja');assert page.locator('#translation-dialog').is_visible();assert page.locator('#language').input_value()=='ms'
    translate=page.locator('#translation-open').get_attribute('href');query=parse_qs(urlparse(translate).query)
    assert query['tl']==['ja'] and query['u']==['https://cohub.jovianhome.com/guide.html']
    assert 'Guest' not in translate and 'capsules' not in translate
    assert page.evaluate('localStorage.getItem("cohub-language")')=='ms'
    page.locator('#translation-cancel').click();page.goto(BASE+'guide.html');assert page.locator('#language').input_value()=='ms'
    page.select_option('#language','read:fr');assert parse_qs(urlparse(page.locator('#translation-open').get_attribute('href')).query)['u']==['https://cohub.jovianhome.com/guide.html'];page.keyboard.press('Escape')
    page.goto(BASE+'stay.html');page.select_option('#language','zh');assert page.locator('.room-card').count()==7
    href=page.locator('.room-enquiry').first.get_attribute('href');assert href=='enquiry.html?type=stay&room=0'
    page.locator('.room-enquiry').first.click();assert page.locator('#stay-room').input_value()=='0'
    assert '单层胶囊' in page.locator('#enquiry-preview').input_value()
    page.goto(BASE+'coffee.html');assert page.locator('.coffee-card').count()==5
    assert 'RM 48' in page.locator('.coffee-card').first.inner_text()
    page.locator('[data-product="coffee-05"] .coffee-add').click();page.locator('.cart-launcher').click();assert 'RM 40.00' in page.locator('#coffee-total').inner_text();page.keyboard.press('Escape')
    page.goto(BASE+'beer.html');assert page.locator('.beer-card').count()==37
    page.locator('[data-product="beer-01"] .add-to-cart').click();page.locator('.cart-launcher').click();assert 'RM 270.00' in page.locator('#cart-totals').inner_text();page.keyboard.press('Escape')
    assert not errors,errors
    assert not bad,bad
    out=Path('/workspace/cohub-community-release');out.mkdir(exist_ok=True)
    for filename in ['index','community','guide','enquiry']:
        page.goto(BASE+filename+'.html');page.select_option('#language','zh');page.set_viewport_size({'width':1440,'height':1000});page.screenshot(path=str(out/(filename+'-desktop.png')),full_page=True)
        page.set_viewport_size({'width':390,'height':850});page.screenshot(path=str(out/(filename+'-mobile.png')),full_page=True)
    print('PASS: 8 pages × 3 native languages × 4 widths; 7 activities; arrival/map links and check-in/out; conditional enquiry fields, date validation, room links, draft safety and WhatsApp payload; 16 translated-reading options isolate native language and omit personal data; Instagram links; coffee/beer cart regression; no page errors or missing local resources.')
    browser.close()
