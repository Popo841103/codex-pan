"""Run from pms/: python test/external-trial-browser.py (Playwright + Chromium)."""
import json
import secrets
import subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

# In-memory database and loopback server; no existing trial/production data is used.
harness = r'''
import {ExternalTrialStore} from './server/external-trial-store.js';
import {makeServer} from './server/http.js';
import {createInterface} from 'node:readline';
const store=new ExternalTrialStore(':memory:');
const server=makeServer(store,{externalTrial:true});
server.listen(0,'127.0.0.1',()=>console.log(server.address().port));
createInterface({input:process.stdin}).on('line',line=>{
 const input=JSON.parse(line);
 const app=store.db.prepare('SELECT id FROM trial_applications WHERE email=?').get(input.email);
 console.log(JSON.stringify(store.approve(app.id,input)));
});
'''
process = subprocess.Popen(['node', '--input-type=module', '-e', harness], stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True, cwd=Path(__file__).resolve().parents[1])
try:
    port = process.stdout.readline().strip()
    assert port.isdigit(), 'Browser test server did not start'
    base = 'http://127.0.0.1:' + port
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
        errors, pages = [], []
        for index, company in enumerate(['星云示例酒店', '月湾示例旅舍']):
            page = browser.new_context(viewport={'width': 1440, 'height': 1000}).new_page()
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.goto(base + '/web/')
            expect(page.locator('#login-dialog')).to_be_visible()
            page.get_by_role('link', name='申请使用 / 联系我们', exact=True).click()
            page.locator('[name=company]').fill(company)
            email = f'browser{index}@example.invalid'
            page.locator('[name=email]').fill(email)
            page.get_by_role('button', name='提交申请').click()
            expect(page.get_by_role('status')).to_contain_text('申请已收到')
            password, username = secrets.token_urlsafe(24), f'browser-{index}'
            process.stdin.write(json.dumps({'email': email, 'username': username, 'password': password}) + '\n')
            process.stdin.flush()
            account = json.loads(process.stdout.readline())
            page.get_by_role('link', name='返回登录').click()
            page.locator('#login-form [name=username]').fill(username)
            page.locator('#login-form [name=password]').fill(password)
            page.locator('#login-form button.primary').click()
            expect(page.locator('#login-dialog')).not_to_be_visible()
            if page.locator('#property-dialog').is_visible():
                page.locator('#property-cards [data-property]').click()
            expect(page.locator('#content')).to_be_visible()
            expect(page.locator('#guest-messages')).to_be_visible()
            expect(page.locator('#self-checkin')).to_be_visible()
            expect(page.locator('#property option')).to_have_count(1)
            assert page.locator('#property option').inner_text() == company
            state = page.request.get(base + '/api/state').json()
            assert [row['id'] for row in state['properties']] == [account['propertyId']]
            assert not state['orders']
            assert page.request.get(base + '/api/guest-messages?propertyId=' + account['propertyId']).status == 403
            pages.append((page, account))
        for (page, own), (_, other) in [(pages[0], pages[1]), (pages[1], pages[0])]:
            assert page.request.get(base + '/api/support?propertyId=' + other['propertyId']).status == 403
            assert other['propertyId'] not in json.dumps(page.request.get(base + '/api/state').json())
        assert not errors, errors
        browser.close()
        print('PASS: browser application, approval, login, company isolation and premium gating; no JavaScript errors')
finally:
    process.terminate()
    process.wait(timeout=10)
