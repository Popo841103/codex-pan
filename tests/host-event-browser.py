"""Verify guest hosting and the public grid against the actual PHP endpoint."""
from datetime import date, timedelta
import os
from pathlib import Path
import re
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

    def enter_account(action, address=email):
        auth.locator('[name=email]').fill(address)
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
        'en': ['here in My Events, in the Upload poster section', 'will not appear on the public list'],
        'zh': ['本页「我的活动」的「上传海报」处提交', '没有海报前，活动不会出现在公开列表'],
        'ms': ['di sini dalam Aktiviti Saya, pada bahagian Muat naik poster',
               'aktiviti tidak akan muncul dalam senarai awam'],
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
    id_pattern = re.compile(r'^COHUB-[0-9a-f]{32}$')
    application_id = row.get_by_text(id_pattern).inner_text()
    query = 'my-events.html?upload=' + application_id
    deep_link = url + query
    public_link = 'https://cohub.jovianhome.com/' + query
    expect(row.get_by_role('link', name=public_link)).to_have_attribute('href', public_link)
    upload_form = page.locator('#upload-poster-' + application_id)
    unavailable = page.locator('#uploadLinkStatus')

    def expect_upload_destination():
        expect(page).to_have_url(deep_link)
        expect(upload_form).to_be_focused()
        expect(upload_form.get_by_role('heading', name='Upload poster')).to_be_in_viewport()
        file_box = upload_form.locator('input[type=file]').bounding_box()
        assert file_box['y'] >= page.locator('header').bounding_box()['height']
        expect(upload_form.locator('button:visible')).to_be_in_viewport()
        expect(unavailable).to_be_empty()

    page.goto(deep_link)
    expect_upload_destination()

    # A signed-out guest can register in place, but a new account cannot see
    # another organizer's request. The same message covers missing IDs.
    visitor = browser.new_page(viewport={'width': 320, 'height': 900})
    visitor.goto(deep_link)
    visitor_auth = visitor.locator('#accountForm')
    expect(visitor_auth).to_be_visible()
    expect(visitor.locator('#uploadLinkStatus')).to_be_empty()
    visitor_auth.locator('[name=email]').fill('other@invalid.test')
    visitor_auth.locator('[name=phone]').fill(phone)
    visitor_auth.locator('[name=password]').fill(password)
    visitor_auth.locator('[value=register]').click()
    expect(visitor).to_have_url(deep_link)
    expect(visitor.locator('#uploadLinkStatus')).to_have_text('This poster upload link is unavailable.')
    expect(visitor.locator('#myRequests .request-card')).to_have_count(0)
    visitor.close()

    for invalid_id in ['COHUB-' + '0' * 32, 'COHUB-' + 'A' * 32]:
        page.goto(url + 'my-events.html?upload=' + invalid_id)
        expect(unavailable).to_have_text('This poster upload link is unavailable.')
        expect(unavailable.get_by_text(invalid_id)).to_have_count(0)
        expect(upload_form).not_to_be_focused()
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
    page.goto(deep_link)
    expect_upload_destination()
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
    page.goto(deep_link)
    expect(auth).to_be_visible()
    enter_account('sign-in')
    expect_upload_destination()
    expect(row).to_contain_text('Confirmed')
    page.once('dialog', lambda dialog: dialog.accept())
    row.get_by_role('button', name='Cancel').click()
    expect(row).to_contain_text('Cancelled')
    expect(row.get_by_role('button', name='Cancel')).to_have_count(0)
    expect(row.locator('input[type=file]')).to_have_count(0)
    page.reload()
    expect(unavailable).to_have_text('This poster upload link is unavailable.')
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
    page.select_option('#language', 'en')
    form.locator('[name=name]').fill('Local organizer')
    form.locator('[name=title]').fill('Brewing workshop')
    form.locator('[name=date]').fill(day)
    form.locator('[value="10-12"]').check()
    form.locator('[name=intro]').fill('Neighbors will share brewing tips and sample coffee together.')
    form.locator('[name=note]').fill('We need a stage setup.')
    form.get_by_role('button', name='Submit request').click()
    pending = row.filter(has_text='Brewing workshop')
    expect(pending).to_contain_text('Pending review')
    pending_id = pending.get_by_text(id_pattern).inner_text()
    page.goto(url + 'my-events.html?upload=' + pending_id)
    expect(unavailable).to_have_text('This poster upload link is unavailable.')
    expect(pending.locator('[data-poster-form]')).to_have_count(0)
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
    print('PASS: event grid, 19 languages, hosting, confirmation, poster upload and public display, direct upload links, sign-in, registration and guest cancellation.')


if __name__ == '__main__':
    main()
