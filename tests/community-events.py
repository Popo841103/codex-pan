"""Exercise the actual PHP HTTP endpoint with multiple workers and isolated storage."""
from concurrent.futures import ThreadPoolExecutor
from datetime import date, timedelta
from html.parser import HTMLParser
import json
import os
from pathlib import Path
import secrets
import shutil
import signal
import socket
import subprocess
import tempfile
from threading import Barrier
import time
import unittest
from urllib.error import HTTPError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
PHP = os.environ.get('COHUB_TEST_PHP', 'php')


class Samples(HTMLParser):
    count = 0

    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        if tag == 'article' and 'event-sample' in attrs.get('class', '').split():
            assert attrs.get('data-reference') == 'true'
            assert 'data-event-date' not in attrs and 'data-event-slot' not in attrs
            self.count += 1


class CommunityEvents(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        directory = Path(temporary.name)
        data = directory / 'data'
        data.mkdir(mode=0o700)
        self.data = data
        web = directory / 'web'
        web.mkdir()
        shutil.copyfile(ROOT / 'community-events.php', web / 'community-events.php')
        with socket.socket() as listener:
            listener.bind(('127.0.0.1', 0))
            port = listener.getsockname()[1]
        self.url = f'http://127.0.0.1:{port}/community-events.php'
        self.day = (date.today() + timedelta(days=60)).isoformat()
        self.fields = dict(name='Local Test', phone='+60 11 0000 0000', email='local@invalid.test',
                           title='Book club', date=self.day, slot='20-2230', intro='Discuss books together')
        self.token = secrets.token_hex(32)
        self.log = tempfile.TemporaryFile(mode='w+')
        self.addCleanup(self.log.close)
        self.server = subprocess.Popen(
            [PHP, '-n', '-S', f'127.0.0.1:{port}', '-t', str(web)],
            env={**os.environ, 'PHP_CLI_SERVER_WORKERS': '4', 'COHUB_EVENTS_DATA_DIR': str(data),
                 'COHUB_EVENTS_API_TOKEN': '' if self._testMethodName == 'test_public_lock_without_staff_token' else self.token}, start_new_session=True,
            stdout=self.log, stderr=subprocess.STDOUT,
        )
        self.addCleanup(self.stop_server)
        for _ in range(100):
            try:
                self.assertEqual(self.occupancy(), [])
                break
            except OSError:
                if self.server.poll() is not None:
                    self.log.seek(0)
                    self.fail(self.log.read())
                time.sleep(.02)
        else:
            self.fail('PHP server did not start')

    def stop_server(self):
        os.killpg(self.server.pid, signal.SIGTERM)
        self.server.wait(timeout=5)

    def call(self, body=None, staff=False):
        headers = {'Content-Type': 'application/json'}
        if staff:
            headers['Authorization'] = 'Bearer ' + self.token
        url = self.url if body is not None else self.url + '?date=' + self.day
        request = Request(url, data=json.dumps(body).encode() if body is not None else None, headers=headers)
        try:
            response = urlopen(request, timeout=5)
        except HTTPError as error:
            response = error
        with response:
            self.assertEqual(response.headers['Cache-Control'], 'no-store')
            return response.code, json.load(response)

    def occupancy(self):
        status, body = self.call()
        self.assertEqual(status, 200)
        self.assertEqual(set(body), {'date', 'occupied', 'events'})
        self.assertEqual(body['events'], [])
        return body['occupied']

    def test_public_lock_without_staff_token(self):
        status, record = self.call(self.fields)
        self.assertEqual(status, 201)
        self.assertEqual(self.call({'action': 'cancel', 'id': record['id']}, staff=True)[0], 403)
        self.assertEqual(self.occupancy(), ['20-2230'])
        self.assertEqual(self.call({'action': 'guest-cancel', 'id': record['id'],
                                    'token': record['cancelToken']})[0], 200)
        self.assertEqual(self.occupancy(), [])

    def test_fields_and_sample_cards(self):
        parser = Samples()
        parser.feed((ROOT / 'community.html').read_text())
        self.assertEqual(parser.count, 10)
        for field in self.fields:
            with self.subTest(field=field):
                body = self.fields.copy()
                del body[field]
                self.assertEqual(self.call(body), (422, {'status': 'invalid', 'fields': [field]}))
        for field, value in [('slot', ['10-12', '14-17']), ('phone', 'no'), ('email', 'invalid'),
                             ('date', '2100-02-29'), ('intro', '\u3000')]:
            self.assertEqual(self.call({**self.fields, field: value})[0], 422)
        self.assertEqual(self.occupancy(), [])

    def test_double_booking_cancel_and_rebook(self):
        start = Barrier(2)

        def submit(index):
            start.wait(timeout=5)
            return self.call({**self.fields, 'name': f'Organizer {index}'})

        with ThreadPoolExecutor(2) as workers:
            results = sorted(workers.map(submit, range(2)), key=lambda response: response[0])
        (success, record), (conflict, error) = results
        self.assertEqual((success, conflict, error['status']), (201, 409, 'taken'))
        self.assertEqual(self.occupancy(), ['20-2230'])
        self.assertEqual(set(record), {'id', 'date', 'slot', 'status', 'cancelToken'})
        self.assertEqual(self.call({'action': 'cancel', 'id': record['id']})[0], 403)
        self.assertEqual(self.call({'action': 'cancel', 'id': 'unknown'}, staff=True)[0], 404)
        cancel = {'action': 'cancel', 'id': record['id']}
        self.assertEqual(self.call(cancel, staff=True)[0], 200)
        self.assertEqual(self.occupancy(), [])
        self.assertEqual(self.call(cancel, staff=True)[0], 409)
        new_status, new_record = self.call({**self.fields, 'action': 'lock'}, staff=True)
        self.assertEqual(new_status, 201)
        self.assertNotEqual(record['id'], new_record['id'])
        self.assertEqual(self.call(cancel, staff=True)[0], 409)
        self.assertEqual(self.occupancy(), ['20-2230'])

    def test_guest_cancel_and_rebook(self):
        status, record = self.call(self.fields)
        self.assertEqual(status, 201)
        self.assertRegex(record['cancelToken'], r'^[a-f0-9]{64}$')
        credentials = {'id': record['id'], 'token': record['cancelToken']}
        status, booking = self.call({'action': 'guest-status', **credentials})
        self.assertEqual(status, 200)
        self.assertEqual(booking, {key: record[key] for key in ('id', 'status', 'date', 'slot')})

        cancel = {'action': 'guest-cancel', **credentials}
        self.assertEqual(self.call({'action': 'guest-cancel', 'id': record['id']})[0], 403)
        self.assertEqual(self.call({**cancel, 'token': '0' * 64})[0], 403)
        self.assertEqual(self.occupancy(), ['20-2230'])

        status, cancelled = self.call(cancel)
        self.assertEqual((status, cancelled['status'], cancelled['slotAvailable']), (200, 'cancelled', True))
        self.assertEqual(self.occupancy(), [])
        self.assertEqual(self.call(cancel), (status, cancelled))

        status, second = self.call({**self.fields, 'name': 'Second organizer'})
        self.assertEqual(status, 201)
        self.assertNotEqual(second['cancelToken'], record['cancelToken'])
        self.assertEqual(self.call({**cancel, 'id': second['id']})[0], 403)
        self.assertEqual(self.call(cancel), (200, {**cancelled, 'slotAvailable': False}))
        self.assertEqual(self.occupancy(), ['20-2230'])

    def test_moderation_and_pending_withdrawal(self):
        status, pending = self.call({**self.fields, 'intro': 'A topic for staff to review'})
        self.assertEqual(status, 202)
        self.assertEqual(self.occupancy(), [])
        queued = self.call({'action': 'pending'}, staff=True)[1]['requests'][0]
        self.assertEqual(queued['id'], pending['id'])
        self.assertNotIn('cancelToken', queued)
        self.assertEqual(self.call({'action': 'cancel', 'id': pending['id']}, staff=True)[0], 200)
        self.assertEqual(self.occupancy(), [])
        rejected = self.call({**self.fields, 'intro': 'Sell illegal drugs'})
        self.assertEqual(rejected, (422, {'status': 'rejected', 'reason': 'venue_policy'}))
        self.assertEqual(self.occupancy(), [])
        _, pending = self.call({**self.fields, 'intro': 'A topic for staff to review'})
        approve = {'action': 'approve', 'id': pending['id']}
        self.assertEqual(self.call(approve, staff=True)[0], 200)
        self.assertEqual(self.occupancy(), ['20-2230'])
        self.assertEqual(self.call({'action': 'guest-cancel', 'id': pending['id'],
                                    'token': pending['cancelToken']})[1]['status'], 'cancelled')
        self.assertEqual(self.occupancy(), [])

    def test_response_retry_and_private_permissions(self):
        request = {**self.fields, 'retryKey': 'a1234567-1234-1234-1234-a12345678901'}
        first = self.call(request)
        self.assertEqual(first[0], 201)
        self.assertEqual(self.call(request), first)
        self.assertEqual(self.call({**request, 'name': 'Different organizer'})[0], 409)
        self.assertEqual(self.occupancy(), ['20-2230'])
        self.assertEqual((self.data / 'events.json').stat().st_mode & 0o777, 0o600)
        self.data.chmod(0o755)
        self.assertEqual(self.call()[0], 503)
        self.assertEqual(self.call(self.fields)[0], 503)


if __name__ == '__main__':
    unittest.main()
