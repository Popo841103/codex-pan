"""Verify guest hosting and the public grid against the actual PHP endpoint."""
from datetime import date, timedelta
import os
from pathlib import Path
import secrets
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


def verify(browser, url, staff_token):
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
    expect(page.locator('#guestArea')).to_be_hidden()
    page.locator('#openHost').click()
    expect(page).to_have_url(url + 'community.html#my-events')
    auth = page.locator('#accountForm')
    expect(auth).to_be_visible()
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
    password = secrets.token_urlsafe(24)

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
    form.locator('[name=title]').fill('Book club')
    day = (date.today() + timedelta(days=60)).isoformat()
    form.locator('[name=date]').fill(day)
    form.locator('[value="10-12"]').check()
    form.locator('[name=intro]').fill('Discuss books together')
    form.get_by_role('button', name='Submit request').click()
    row = page.locator('#myRequests .request-card')
    expect(row).to_contain_text('Pending review')
    expect(row).to_contain_text(day + ' · 10:00–12:00')
    expect(row.get_by_role('button', name='Cancel')).to_be_visible()

    event_id = next(text for text in row.locator('p').all_text_contents() if text.startswith('COHUB-'))
    approval = page.request.post(url + 'community-events.php', data={'action': 'approve', 'id': event_id},
                                 headers={'Authorization': 'Bearer ' + staff_token})
    assert approval.ok, approval.status
    page.locator('#refreshMine').click()
    expect(row).to_contain_text('Your slot is confirmed.')
    expect(row).to_contain_text('send your poster')
    expect(grid.locator('[data-published]')).to_have_count(0)
    page.locator('#signOut').click()
    expect(row).to_have_count(0)
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
        token = secrets.token_hex(32)
        server = subprocess.Popen(
            [os.environ.get('COHUB_TEST_PHP', 'php'), '-n', '-S', f'127.0.0.1:{port}', '-t', str(ROOT)],
            env={**os.environ, 'COHUB_EVENTS_DATA_DIR': data, 'COHUB_EVENTS_API_TOKEN': token},
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
                verify(browser, url, token)
                browser.close()
        finally:
            server.terminate()
            server.wait(timeout=5)
    print('PASS: four/three/two-column grid, 19 languages, hosting, approval, sign-in and guest cancellation.')


if __name__ == '__main__':
    main()
