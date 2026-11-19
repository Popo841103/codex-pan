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
    confirmed = row.locator('[data-result=confirmed]')
    required_copy = {
        'en': ['upload your poster in My Events', 'will not appear on the public list'],
        'zh': ['在「我的活动」自行上传海报', '没有海报前，活动不会出现在公开列表'],
        'ms': ['muat naik poster anda di Aktiviti Saya', 'aktiviti tidak akan muncul dalam senarai awam'],
    }
    english = confirmed.inner_text()
    upload = row.locator('[data-poster-button=upload]')
    upload_english = upload.inner_text()
    for lang in LANGUAGES:
        page.select_option('#language', lang)
        expect(page.locator('#language-status')).to_be_hidden()
        if lang != 'en':
            expect(confirmed).not_to_have_text(english)
            expect(upload).not_to_have_text(upload_english)
        for phrase in required_copy.get(lang, []):
            expect(confirmed).to_contain_text(phrase)
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), lang
    page.select_option('#language', 'en')
    expect(form.locator('input[type=file]')).to_have_count(0)
    expect(row.locator('input[type=file]')).to_be_visible()
    page.get_by_role('link', name="What's on", exact=True).click()
    expect(page).to_have_url(url + 'community.html#events')
    expect(grid.locator('[data-published]')).to_have_count(0)
    page.locator('.activity-calendar summary').click()
    page.locator('#calendarDate').fill(day)
    expect(page.locator('#calendarEvents')).to_contain_text('10:00–12:00')
    page.get_by_role('link', name='My Events', exact=True).click()
    expect(row).to_contain_text('Confirmed')
    expect(auth).to_be_hidden()
    row.locator('input[type=file]').set_input_files(str(ROOT / 'assets/coffee/cohub-event-ai-meetup-v2.webp'))
    row.get_by_role('button', name='Upload poster').click()
    expect(page.locator('#accountStatus')).to_contain_text('Poster uploaded.')
    expect(row.get_by_role('button', name='Replace poster')).to_be_visible()
    page.reload()
    expect(row.get_by_role('button', name='Replace poster')).to_be_visible()
    page.get_by_role('link', name="What's on", exact=True).click()
    published = grid.locator('[data-published]')
    expect(published).to_contain_text('Saturday coffee and conversation')
    expect(grid.locator('.event-sample')).to_have_count(10)
    image = published.locator('img')
    image.scroll_into_view_if_needed()
    assert image.get_attribute('src').startswith('/community-events.php?poster=cohub-poster-')
    page.wait_for_function('image => image.complete && image.naturalWidth > 0', arg=image.element_handle())
    page.get_by_role('link', name='My Events', exact=True).click()
    expect(row.get_by_role('button', name='Replace poster')).to_be_visible()
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
    expect(row.locator('input[type=file]')).to_have_count(0)
    assert page.request.get(url + 'community-events.php?published=1').json()['events'] == []
    assert page.request.get(url + 'community-events.php?date=' + day).json()['occupied'] == []
    # A rejected proposal shows its specific reason locally and leaves the slot open.
    form.locator('[name=name]').fill('Local organizer')
    form.locator('[name=title]').fill('Web3 investment promotion')
    form.locator('[name=date]').fill(day)
    form.locator('[value="10-12"]').check()
    form.locator('[name=intro]').fill('We promise guaranteed investment returns.')
    form.get_by_role('button', name='Submit request').click()
    reason = row.locator('[data-reason=venue_policy_fraud]')
    expect(reason).to_contain_text('guaranteed investment returns')
    page.select_option('#language', 'zh')
    expect(reason).to_contain_text('承诺投资保本保收益')
    page.select_option('#language', 'ms')
    expect(reason).to_contain_text('jaminan pulangan pelaburan')
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
    print('PASS: four/three/two-column grid, 19 languages, hosting, automatic confirmation, poster upload and public display, sign-in and guest cancellation.')


if __name__ == '__main__':
    main()
