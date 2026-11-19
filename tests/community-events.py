"""Exercise the actual PHP HTTP endpoint with multiple workers and isolated storage."""
from concurrent.futures import ThreadPoolExecutor
from datetime import date, timedelta
from html.parser import HTMLParser
from http.cookiejar import CookieJar
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
from urllib.request import HTTPCookieProcessor, Request, build_opener, urlopen

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
        self.poster = 'cohub-poster-local.webp'
        (web / 'assets/coffee').mkdir(parents=True)
        shutil.copyfile(ROOT / 'assets/coffee/cohub-event-ai-meetup-v2.webp', web / 'assets/coffee' / self.poster)
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

    def call(self, body=None, staff=False, client=None, query=None):
        headers = {'Content-Type': 'application/json'}
        if staff:
            headers['Authorization'] = 'Bearer ' + (self.token if staff is True else staff)
        url = self.url if body is not None else self.url + '?' + (query or 'date=' + self.day)
        request = Request(url, data=json.dumps(body).encode() if body is not None else None, headers=headers)
        try:
            response = (client.open if client else urlopen)(request, timeout=5)
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

    def guest(self, index=1):
        client = build_opener(HTTPCookieProcessor(CookieJar()))
        auth = {'email': f'guest{index}@invalid.test', 'phone': f'+60 11 0100 000{index}',
                'password': secrets.token_urlsafe(24)}
        self.assertEqual(self.call({'action': 'register', **auth}, client=client)[0], 200)
        return client, auth

    def staff_lock(self, fields):
        return self.call({**fields, 'action': 'lock'}, staff=True)

    def test_password_minimum_length(self):
        auth = {'email': 'password-boundary@invalid.test', 'phone': '+60 11 0100 0000'}
        short_password = 'abc12'
        minimum_password = 'abc123'
        self.assertEqual(self.call({'action': 'register', **auth, 'password': short_password}),
                         (422, {'status': 'credentials'}))
        self.assertEqual(self.call({'action': 'register', **auth, 'password': minimum_password})[0], 200)

        client = build_opener(HTTPCookieProcessor(CookieJar()))
        self.assertEqual(self.call({'action': 'sign-in', **auth, 'password': short_password}, client=client),
                         (422, {'status': 'credentials'}))
        self.assertEqual(self.call({'action': 'sign-in', **auth, 'password': minimum_password}, client=client)[0], 200)
        self.assertEqual(self.call({'action': 'my-events'}, client=client)[0], 200)

    def test_public_lock_without_staff_token(self):
        self.assertEqual(self.call(self.fields)[0], 401)
        client, _ = self.guest()
        status, record = self.call({**self.fields, 'action': 'submit-event'}, client=client)
        self.assertEqual((status, record['status']), (201, 'confirmed'))
        self.assertEqual(self.occupancy(), ['20-2230'])
        self.assertEqual(self.call({'action': 'approve', 'id': record['id']}, staff=True)[0], 403)
        self.assertEqual(self.call({'action': 'cancel-my-event', 'id': record['id']}, client=client)[0], 200)
        self.assertEqual(self.occupancy(), [])

    def test_accounts_hold_approve_cancel_and_rebook(self):
        first, auth = self.guest(1)
        second, _ = self.guest(2)
        self.assertEqual(self.call({'action': 'register', **auth}, client=second)[0], 409)
        self.assertEqual(self.call({'action': 'sign-in', **auth, 'password': 'invalid-password'}, client=second)[0], 403)
        self.assertNotIn(auth['password'], (self.data / 'accounts.json').read_text())
        self.assertEqual((self.data / 'accounts.json').stat().st_mode & 0o777, 0o600)
        request = {**self.fields, 'action': 'submit-event', 'note': 'Need a stage'}
        self.assertEqual(self.call(request)[0], 401)
        start = Barrier(2)

        def submit(client):
            start.wait(timeout=5)
            return self.call(request, client=client)

        with ThreadPoolExecutor(2) as workers:
            results = list(workers.map(submit, [first, second]))
        self.assertEqual(sorted(code for code, _ in results), [202, 409])
        winner = 0 if results[0][0] == 202 else 1
        owner, other = (first, second) if winner == 0 else (second, first)
        _, booking = results[winner]
        event_id = booking['id']
        self.assertEqual(booking['status'], 'pending')
        self.assertNotIn('cancelToken', booking)
        self.assertEqual(self.occupancy(), ['20-2230'])
        self.assertEqual(self.call({'action': 'my-events'}, client=other)[1]['requests'], [])
        cancel = {'action': 'cancel-my-event', 'id': event_id}
        self.assertEqual(self.call(cancel, client=other)[0], 404)
        self.assertEqual(self.call(cancel)[0], 401)
        self.assertEqual(self.call({'action': 'guest-cancel', 'id': event_id, 'token': '0' * 64})[0], 403)
        publish = {'action': 'publish', 'id': event_id, 'poster': self.poster}
        self.assertEqual(self.call(publish, staff=True)[0], 409)
        self.assertEqual(self.call({'action': 'approve', 'id': event_id}, staff=True)[1]['status'], 'confirmed')
        self.assertEqual(self.occupancy(), ['20-2230'])
        self.assertEqual(self.call({'action': 'my-events'}, client=owner)[1]['requests'][0]['status'], 'confirmed')
        self.assertEqual(self.call(query='published=1')[1], {'events': []})
        self.assertEqual(self.call({**publish, 'poster': '../private.webp'}, staff=True)[0], 422)
        self.assertEqual(self.call(publish, staff=True)[0], 200)
        public = self.call(query='published=1')[1]['events']
        self.assertEqual([item['id'] for item in public], [event_id])
        self.assertNotIn(self.fields['email'], json.dumps(public))
        self.assertEqual(self.call(cancel, client=other)[0], 404)
        self.assertEqual(self.call(cancel, client=owner)[1]['status'], 'cancelled')
        self.assertEqual(self.occupancy(), [])
        self.assertEqual(self.call(query='published=1')[1], {'events': []})
        self.assertEqual(self.call(request, client=other)[0], 202)
        self.assertEqual(self.call(cancel, client=owner)[1]['status'], 'cancelled')
        self.assertEqual(self.occupancy(), ['20-2230'])
        self.assertEqual(self.call({'action': 'sign-out'}, client=first)[0], 200)
        self.assertEqual(self.call({'action': 'my-events'}, client=first)[0], 401)
        self.assertEqual(self.call({'action': 'sign-in', **auth}, client=first)[0], 200)
        expected = 'cancelled' if winner == 0 else 'pending'
        self.assertEqual(self.call({'action': 'my-events'}, client=first)[1]['requests'][0]['status'], expected)

    def test_public_signup_cap_is_atomic_and_private(self):
        owner, _ = self.guest()
        _, event = self.call({**self.fields, 'action': 'submit-event'}, client=owner)
        event_id = event['id']
        request = {'action': 'join-event', 'id': event_id, 'name': 'Local participant'}
        self.assertEqual(self.call({**request, 'email': 'before@invalid.test'})[0], 404)
        self.assertEqual(self.call({'action': 'publish', 'id': event_id, 'poster': self.poster}, staff=True)[0], 200)

        def join(index):
            return self.call({**request, 'email': f'attendee{index}@invalid.test'})

        with ThreadPoolExecutor(4) as workers:
            results = list(workers.map(join, range(24)))
        self.assertEqual([code for code, _ in results].count(201), 20)
        self.assertEqual([code for code, _ in results].count(409), 4)
        joined = next(index for index, (code, _) in enumerate(results) if code == 201)
        self.assertEqual(join(joined), (200, {'status': 'joined'}))
        attendees = {'action': 'attendees', 'id': event_id}
        self.assertEqual(self.call(attendees)[0], 403)
        self.assertEqual(len(self.call(attendees, staff=True)[1]['attendees']), 20)
        self.assertNotIn('attendee', json.dumps(self.call(query='published=1')[1]))
        self.assertEqual(self.call({'action': 'cancel-my-event', 'id': event_id}, client=owner)[0], 200)
        self.assertEqual(join(25)[0], 404)

    def test_rejected_or_withdrawn_requests_release_hold(self):
        client, _ = self.guest()
        request = {**self.fields, 'action': 'submit-event', 'note': 'Need a stage'}
        _, first = self.call(request, client=client)
        self.assertEqual(self.occupancy(), ['20-2230'])
        self.assertEqual(self.call({'action': 'reject', 'id': first['id'], 'reason': 'Staff review reason'}, staff=True)[0], 200)
        self.assertEqual(self.occupancy(), [])
        self.assertEqual(self.call({'action': 'my-events'}, client=client)[1]['requests'][0]['reason'], 'Staff review reason')
        _, second = self.call(request, client=client)
        self.assertEqual(self.call({'action': 'cancel-my-event', 'id': second['id']}, client=client)[0], 200)
        self.assertEqual(self.occupancy(), [])
        _, rejected = self.call({**request, 'intro': 'Sell illegal drugs'}, client=client)
        self.assertEqual(rejected['status'], 'rejected')
        self.assertEqual(rejected['reason'], 'venue_policy_illegal')
        self.assertEqual(self.occupancy(), [])

    def test_community_topics_confirm_without_title_whitelist(self):
        owner, _ = self.guest()
        for title, intro in (
            ('Web3 Builders Circle', 'Share open-source projects and build a demo together.'),
            ('AI Meetup', 'A practical exchange about using AI in our daily work.'),
            ('周末读书会', '交流读书笔记，欢迎 20 人参与。'),
            ('Bengkel kopi', 'Berkongsi teknik membancuh kopi bersama 20 peserta.'),
        ):
            with self.subTest(title=title):
                request = {**self.fields, 'action': 'submit-event', 'title': title, 'intro': intro}
                code, event = self.call(request, client=owner)
                self.assertEqual((code, event['status']), (201, 'confirmed'))
                self.assertEqual(self.occupancy(), ['20-2230'])
                self.assertEqual(self.call(request, client=owner)[0], 409)
                self.assertEqual(self.call({'action': 'cancel-my-event', 'id': event['id']}, client=owner)[0], 200)

    def test_clear_violations_reject_without_holding_the_slot(self):
        owner, _ = self.guest()
        for field, copy, category in (
            ('title', '销售违禁品', 'illegal'),
            ('intro', 'No experience needed. Sell illegal drugs.', 'illegal'),
            ('note', 'Pertandingan judi', 'illegal'),
            ('title', 'Armed attack', 'illegal'),
            ('intro', '伤害未成年人', 'illegal'),
            ('note', 'Pengubahan wang haram', 'illegal'),
            ('title', '投资诈骗与传销', 'fraud'),
            ('intro', 'Web3 项目保本保收益', 'fraud'),
            ('note', 'Web3 拉人头', 'fraud'),
            ('note', 'Pulangan pelaburan dijamin', 'fraud'),
            ('title', 'Gangguan seksual terhadap peserta', 'harassment'),
            ('intro', 'We will stalk attendees', 'harassment'),
            ('note', '起底参与者', 'harassment'),
            ('intro', 'Tayangan bahan lucah', 'harmful'),
            ('note', 'Screening graphic violence', 'harmful'),
            ('title', '宣扬自残', 'harmful'),
            ('title', 'Kempen parti politik', 'controversial'),
            ('intro', 'Organize a protest', 'controversial'),
            ('note', '攻击特定宗教', 'controversial'),
            ('intro', 'Promote gender discrimination', 'controversial'),
        ):
            with self.subTest(field=field, copy=copy):
                request = {**self.fields, 'action': 'submit-event', field: copy}
                code, event = self.call(request, client=owner)
                self.assertEqual((code, event['status'], event['reason']),
                                 (202, 'rejected', f'venue_policy_{category}'))
                self.assertEqual(self.occupancy(), [])

    def test_manual_review_signals_hold_the_slot(self):
        owner, _ = self.guest()
        for note in ('15–24 attendees', '20–30人', '20+ pax', '超过20人', 'Exclusive use', '包场',
                     'Possible scheduling conflict', 'Special sound equipment', '搭建舞台', 'Details TBD',
                     'Discussing how to prevent money laundering', 'Web3 guaranteed returns?', '防范投资诈骗'):
            with self.subTest(note=note):
                code, event = self.call({**self.fields, 'action': 'submit-event', 'note': note}, client=owner)
                self.assertEqual((code, event['status']), (202, 'pending'))
                self.assertEqual(self.occupancy(), ['20-2230'])
                self.assertEqual(self.call({**self.fields, 'action': 'submit-event'}, client=owner)[0], 409)
                self.assertEqual(self.call({'action': 'cancel-my-event', 'id': event['id']}, client=owner)[0], 200)
                self.assertEqual(self.occupancy(), [])

    def test_automatic_confirmation_and_updates(self):
        owner, auth = self.guest()
        other, _ = self.guest(2)
        request = {**self.fields, 'action': 'submit-event', 'title': 'Saturday yoga for neighbours',
                   'intro': 'A guided beginner session with breathing exercises for 20 people.'}
        code, event = self.call(request, client=owner)
        self.assertEqual(code, 201)
        self.assertEqual(event, {key: request[key] for key in ('title', 'date', 'slot')}
                         | {'id': event['id'], 'status': 'confirmed'})
        self.assertEqual(self.occupancy(), ['20-2230'])
        self.assertEqual(self.call(request, client=other), (409, {'status': 'taken'}))
        poll = {'action': 'updates'}
        self.assertEqual(self.call(poll)[0], 403)
        self.assertEqual(self.call(poll, staff=secrets.token_hex(32))[0], 403)
        self.assertEqual(self.call({**poll, 'since': '2100-02-29T00:00:00Z'}, staff=True)[0], 422)

        cancel = {'action': 'cancel-my-event', 'id': event['id']}
        self.assertEqual(self.call(cancel, client=owner), (200, {**event, 'status': 'cancelled'}))
        self.assertEqual(self.occupancy(), [])
        self.assertEqual(self.call(cancel, client=owner)[0], 200)
        _, pending = self.call({**request, 'intro': 'Yoga for 25 people'}, client=other)
        self.assertEqual(pending['status'], 'pending')
        self.assertEqual(self.call(request, client=owner), (409, {'status': 'taken'}))
        self.assertEqual(self.call({'action': 'cancel', 'id': pending['id']}, staff=True)[0], 200)

        code, response = self.call(poll, staff=True)
        self.assertEqual(code, 200)
        confirmed, cancelled, staff_cancelled = response['updates']
        for update, expected in [(confirmed, event), (cancelled, {**event, 'status': 'cancelled'})]:
            self.assertRegex(update['changedAt'], r'^\d{4}-\d{2}-\d{2}T.*\.\d{6}Z$')
            self.assertEqual(update, {**expected, 'changedAt': update['changedAt'], 'name': request['name'],
                                      'phone': '601101000001', 'email': auth['email']})
        self.assertEqual(staff_cancelled['id'], pending['id'])
        self.assertEqual(staff_cancelled['status'], 'cancelled')
        self.assertEqual(staff_cancelled['email'], 'guest2@invalid.test')
        self.assertEqual(self.call({**poll, 'since': cancelled['changedAt']}, staff=True),
                         (200, {'updates': [cancelled, staff_cancelled]}))
        self.assertEqual(self.call({**poll, 'since': '9999-01-01T00:00:00Z'}, staff=True),
                         (200, {'updates': []}))

    def test_fields_and_sample_cards(self):
        parser = Samples()
        parser.feed((ROOT / 'community.html').read_text())
        self.assertEqual(parser.count, 10)
        for field in self.fields:
            with self.subTest(field=field):
                body = self.fields.copy()
                del body[field]
                self.assertEqual(self.staff_lock(body), (422, {'status': 'invalid', 'fields': [field]}))
        for field, value in [('slot', ['10-12', '14-17']), ('phone', 'no'), ('email', 'invalid'),
                             ('date', '2100-02-29'), ('intro', '\u3000')]:
            self.assertEqual(self.staff_lock({**self.fields, field: value})[0], 422)
        self.assertEqual(self.occupancy(), [])

    def test_double_booking_cancel_and_rebook(self):
        start = Barrier(2)

        def submit(index):
            start.wait(timeout=5)
            return self.staff_lock({**self.fields, 'name': f'Organizer {index}'})

        with ThreadPoolExecutor(2) as workers:
            results = sorted(workers.map(submit, range(2)), key=lambda response: response[0])
        (success, record), (conflict, error) = results
        self.assertEqual((success, conflict, error['status']), (201, 409, 'taken'))
        self.assertEqual(self.occupancy(), ['20-2230'])
        self.assertEqual(set(record), {'id', 'date', 'slot', 'status', 'title', 'cancelToken'})
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
        status, record = self.staff_lock(self.fields)
        self.assertEqual(status, 201)
        self.assertRegex(record['cancelToken'], r'^[a-f0-9]{64}$')
        credentials = {'id': record['id'], 'token': record['cancelToken']}
        status, booking = self.call({'action': 'guest-status', **credentials})
        self.assertEqual(status, 200)
        self.assertEqual(booking, {key: record[key] for key in ('id', 'status', 'title', 'date', 'slot')})

        cancel = {'action': 'guest-cancel', **credentials}
        self.assertEqual(self.call({'action': 'guest-cancel', 'id': record['id']})[0], 403)
        self.assertEqual(self.call({**cancel, 'token': '0' * 64})[0], 403)
        self.assertEqual(self.occupancy(), ['20-2230'])

        status, cancelled = self.call(cancel)
        self.assertEqual((status, cancelled['status'], cancelled['slotAvailable']), (200, 'cancelled', True))
        self.assertEqual(self.occupancy(), [])
        self.assertEqual(self.call(cancel), (status, cancelled))

        status, second = self.staff_lock({**self.fields, 'name': 'Second organizer'})
        self.assertEqual(status, 201)
        self.assertNotEqual(second['cancelToken'], record['cancelToken'])
        self.assertEqual(self.call({**cancel, 'id': second['id']})[0], 403)
        self.assertEqual(self.call(cancel), (200, {**cancelled, 'slotAvailable': False}))
        self.assertEqual(self.occupancy(), ['20-2230'])

    def test_moderation_and_pending_withdrawal(self):
        status, pending = self.staff_lock({**self.fields, 'intro': 'The topic is still to be decided'})
        self.assertEqual(status, 202)
        self.assertEqual(self.occupancy(), ['20-2230'])
        queued = self.call({'action': 'pending'}, staff=True)[1]['requests'][0]
        self.assertEqual(queued['id'], pending['id'])
        self.assertNotIn('cancelToken', queued)
        self.assertEqual(self.call({'action': 'cancel', 'id': pending['id']}, staff=True)[0], 200)
        self.assertEqual(self.occupancy(), [])
        rejected = self.staff_lock({**self.fields, 'intro': 'Sell illegal drugs'})
        self.assertEqual(rejected, (422, {'status': 'rejected', 'reason': 'venue_policy_illegal'}))
        self.assertEqual(self.occupancy(), [])
        _, pending = self.staff_lock({**self.fields, 'intro': 'The topic is still to be decided'})
        approve = {'action': 'approve', 'id': pending['id']}
        self.assertEqual(self.call(approve, staff=True)[0], 200)
        self.assertEqual(self.occupancy(), ['20-2230'])
        self.assertEqual(self.call({'action': 'guest-cancel', 'id': pending['id'],
                                    'token': pending['cancelToken']})[1]['status'], 'cancelled')
        self.assertEqual(self.occupancy(), [])

    def test_response_retry_and_private_permissions(self):
        request = {**self.fields, 'retryKey': 'a1234567-1234-1234-1234-a12345678901'}
        first = self.staff_lock(request)
        self.assertEqual(first[0], 201)
        self.assertEqual(self.staff_lock(request), first)
        self.assertEqual(self.staff_lock({**request, 'name': 'Different organizer'})[0], 409)
        self.assertEqual(self.occupancy(), ['20-2230'])
        self.assertEqual((self.data / 'events.json').stat().st_mode & 0o777, 0o600)
        self.data.chmod(0o755)
        self.assertEqual(self.call()[0], 503)
        self.assertEqual(self.staff_lock(self.fields)[0], 503)


if __name__ == '__main__':
    unittest.main()
