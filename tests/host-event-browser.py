"""Verify guest hosting and the public grid against the actual PHP endpoint."""
from datetime import date, timedelta
import os
from pathlib import Path
import socket
import subprocess
import tempfile
import time
from urllib.error import URLError
from urllib.request import urlopen

from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
LANGUAGES = ['en', 'zh', 'ms', 'zh-TW', 'ja', 'ko', 'th', 'id', 'vi', 'fr',
             'de', 'es', 'pt', 'ru', 'ar', 'hi', 'it', 'nl', 'tr']


def verify(browser, url):
    page = browser.new_page()
    page.route('**/fonts.googleapis.com/**', lambda route: route.abort())
    page_errors = []
    page.on('pageerror', lambda error: page_errors.append(str(error)))
    page.goto(url + 'community.html')
    samples = page.locator('#event-list .event-sample')
    expect(samples).to_have_count(10)
    grid = page.locator('#event-list')
    for width, columns in [(320, 2), (639, 2), (640, 3), (959, 3), (960, 4), (1440, 4)]:
        page.set_viewport_size({'width': width, 'height': 900})
        assert grid.evaluate("element => getComputedStyle(element).gridTemplateColumns.split(' ').length") == columns
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    expect(page.locator('#accountForm, #hostForm')).to_have_count(0)
    for entry in ['#openHost', '.community-links a:nth-child(2)', '.community-links a:nth-child(3)']:
        expect(page.locator(entry)).to_have_attribute('href', 'my-events.html')
    for legacy in ['community.html#my-events', 'community.html?host=1', 'enquiry.html?type=host']:
        page.goto(url + legacy)
        expect(page).to_have_url(url + 'my-events.html')
    page.goto(url + 'index.html')
    expect(page.locator('#activity-entry-actions a').last).to_have_attribute('href', 'my-events.html')
    page.goto(url + 'community.html')
    page.select_option('#language', 'zh')
    page.get_by_role('link', name='我的活动', exact=True).click()
    expect(page).to_have_url(url + 'my-events.html')
    expect(page.locator('#hostTitle')).to_have_text('我的活动')
    expect(page.locator('#hostForm')).to_be_hidden()
    auth = page.locator('#accountForm')
    expect(auth).to_be_visible()
    expect(auth.locator('[name=password]')).to_have_attribute('minlength', '6')
    expect(auth.locator('[name=password]')).to_have_attribute('maxlength', '72')
    page.set_viewport_size({'width': 320, 'height': 900})
    for lang in LANGUAGES:
        page.select_option('#language', lang)
        expect(page.locator('#language-status')).to_be_hidden()
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), lang
        if lang != 'en':
            assert page.locator('#hostTitle').inner_text() != 'My Events', lang
    page.select_option('#language', 'en')

    email = 'browser@invalid.test'
    phone = '+60 11 0100 0000'
    password = 'abc123'

    def enter_account(action):
        auth.locator('[name=email]').fill(email)
        auth.locator('[name=phone]').fill(phone)
        auth.locator('[name=password]').fill(password)
        auth.locator(f'[value={action}]').click()

    enter_account('register')
    expect(auth).to_be_hidden()
    form = page.locator('#hostForm')
    expect(form).to_be_visible()
    form.locator('[name=name]').fill('Local organizer')
    form.locator('[name=title]').fill('Saturday coffee and conversation')
    day = (date.today() + timedelta(days=60)).isoformat()
    form.locator('[name=date]').fill(day)
    form.locator('[value="10-12"]').check()
    form.locator('[name=intro]').fill('Neighbors will share brewing tips and sample coffee together.')
    form.get_by_role('button', name='Submit request').click()
    row = page.locator('#myRequests .request-card')
    expect(row).to_contain_text('Confirmed')
    expect(row).to_contain_text(day + ' · 10:00–12:00')
    expect(row.get_by_role('button', name='Cancel')).to_be_visible()

    page.reload()
    expect(row).to_contain_text('Confirmed')
    assert page.request.get(url + 'community-events.php?date=' + day).json()['occupied'] == ['10-12']
    expect(row).to_contain_text('Your slot is confirmed.')
    expect(row).to_contain_text('send your poster')
    page.get_by_role('link', name="What's on", exact=True).click()
    expect(page).to_have_url(url + 'community.html#events')
    expect(grid.locator('[data-published]')).to_have_count(0)
    page.locator('.activity-calendar summary').click()
    page.locator('#calendarDate').fill(day)
    expect(page.locator('#calendarEvents')).to_contain_text('10:00–12:00')
    page.get_by_role('link', name='My Events', exact=True).click()
    expect(row).to_contain_text('Confirmed')
    expect(auth).to_be_hidden()
    page.locator('#signOut').click()
    expect(row).to_have_count(0)
    expect(form).to_be_hidden()
    page.get_by_role('link', name="What's on", exact=True).click()
    page.get_by_role('link', name='Sign in', exact=True).click()
    expect(page).to_have_url(url + 'my-events.html')
    enter_account('sign-in')
    expect(row).to_contain_text('Confirmed')
    page.once('dialog', lambda dialog: dialog.accept())
    row.get_by_role('button', name='Cancel').click()
    expect(row).to_contain_text('Cancelled')
    expect(row.get_by_role('button', name='Cancel')).to_have_count(0)
    assert page.request.get(url + 'community-events.php?date=' + day).json()['occupied'] == []
    assert not page_errors, page_errors


def main():
    with tempfile.TemporaryDirectory() as data, socket.socket() as listener:
        listener.bind(('127.0.0.1', 0))
        port = listener.getsockname()[1]
        listener.close()
        server = subprocess.Popen(
            [os.environ.get('COHUB_TEST_PHP', 'php'), '-n', '-S', f'127.0.0.1:{port}', '-t', str(ROOT)],
            env={**os.environ, 'COHUB_EVENTS_DATA_DIR': data, 'COHUB_EVENTS_API_TOKEN': ''},
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )
        url = f'http://127.0.0.1:{port}/'
        try:
            for _ in range(100):
                try:
                    with urlopen(url + 'community.html', timeout=1):
                        break
                except URLError:
                    time.sleep(.02)
            else:
                raise RuntimeError('PHP server did not start')
            with sync_playwright() as playwright:
                browser = playwright.chromium.launch(executable_path=os.environ.get('COHUB_TEST_CHROMIUM'),
                                                     args=['--no-sandbox'])
                verify(browser, url)
                browser.close()
        finally:
            server.terminate()
            server.wait(timeout=5)
    print('PASS: four/three/two-column grid, 19 languages, hosting, automatic confirmation, sign-in and guest cancellation.')


if __name__ == '__main__':
    main()
