"""Run against a separately started loopback server on port 8010."""
from pathlib import Path
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
    page = browser.new_page(viewport={'width':1440,'height':1000})
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    response=page.goto('http://127.0.0.1:8010/web/')
    assert response.status == 200
    page.locator('[data-view=overview]').click()
    assert page.locator('.resource').count()==40
    page.locator('#new').click()
    page.locator('[name=guest]').fill('TEST Browser Guest')
    page.locator('#product').select_option('bed')
    page.locator('#gender').select_option('female')
    page.locator('#order-form button.primary').click()
    page.locator('[data-view=orders]').click()
    assert page.locator('tbody tr').count()==1
    page.locator('[data-target]').select_option('TEST-KL-B1')
    page.locator('[data-action=assign]').click()
    page.locator('[data-action=checkin]').click()
    assert page.locator('tbody tr').inner_text().find('在住')>=0
    page.locator('#date').fill('2027-01-11')
    page.locator('#date').dispatch_event('change')
    page.locator('[data-action=checkout]').click()
    assert '已退房' in page.locator('tbody tr').inner_text()
    page.locator('[data-view=tasks]').click()
    assert page.locator('.resource.dirty').count()==1
    page.locator('[data-action=clean]').click()
    assert page.locator('.resource.dirty').count()==0
    page.locator('[data-action=block]').first.click()
    assert page.locator('.resource.blocked').count()==1
    page.locator('[data-action=unblock]').click()
    assert page.locator('.resource.blocked').count()==0
    page.reload()
    page.locator('[data-view=orders]').click()
    assert 'TEST Browser Guest' in page.locator('tbody').inner_text()
    page.locator('#property').select_option('TEST-PG')
    assert page.locator('tbody tr').count()==0
    page.locator('[data-view=overview]').click()
    assert page.locator('.resource').count()==8
    for lang,title in [('en','Property overview'),('ms','Gambaran hartanah'),('zh','房态总览')]:
        page.locator('#language').select_option(lang)
        assert page.locator('h1').inner_text()==title
    page.locator('#property').select_option('TEST-KL')
    Path('/workspace/codex-pan/pms/artifacts').mkdir(exist_ok=True)
    page.screenshot(path='/workspace/codex-pan/pms/artifacts/overview.png',full_page=True)
    page.set_viewport_size({'width':390,'height':844})
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    page.screenshot(path='/workspace/codex-pan/pms/artifacts/mobile.png',full_page=True)
    assert not errors,errors
    browser.close()
    print('PASS: browser order lifecycle, cleaning, maintenance, persistence, stores, languages and mobile overflow')
