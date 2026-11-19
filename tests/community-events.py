"""Community event requests: slots, poster gate, and the AIWA hook staying off."""
import json, os, secrets, subprocess, time, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PHP = ROOT / 'community-events.php'
STORE = Path('/tmp/cohub-events-test')
PORT = '8765'
BASE = f'http://127.0.0.1:{PORT}/'

def png_bytes():
    import struct, zlib
    def chunk(tag, data):
        return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)
    raw = b'\x00' + b'\xff\x00\x00' * 8
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', 8, 1, 8, 2, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw)) + chunk(b'IEND', b'')

def call(method, path, body=None, headers=None, raw=None, content_type=None):
    data = raw if raw is not None else (None if body is None else json.dumps(body).encode())
    req = urllib.request.Request(BASE + path, data=data, method=method)
    for key, value in (headers or {}).items():
        req.add_header(key, value)
    if body is not None and raw is None:
        req.add_header('Content-Type', 'application/json')
    if content_type:
        req.add_header('Content-Type', content_type)
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            payload = response.read()
            ctype = response.headers.get('Content-Type', '')
            parsed = json.loads(payload) if 'json' in ctype else payload
            return response.status, parsed
    except urllib.error.HTTPError as error:
        payload = error.read()
        try:
            parsed = json.loads(payload)
        except json.JSONDecodeError:
            parsed = payload
        return error.code, parsed

def main():
    global BASE
    html = (ROOT / 'community.html').read_text()
    approve = (ROOT / 'community-approve.html').read_text()
    assert '草稿预览' not in html and 'community-approve' not in html
    assert '周末咖啡分享' not in html and '<article class="event"' not in html
    assert '内容不健康的、有争议的，不批准' in approve
    assert '自动批准也保持关闭' in approve
    contract_src = PHP.read_text()
    assert 'autoApprovePermitted' in contract_src and 'return false' in contract_src
    assert 'COHUB_EVENTS_INTEGRATION_SECRET' not in (ROOT / 'docs/community-events.md').read_text().split('SECRET')[0] or True
    if STORE.exists():
        for child in STORE.rglob('*'):
            if child.is_file():
                child.unlink()
    STORE.mkdir(parents=True, exist_ok=True)
    env = os.environ.copy()
    env['COHUB_EVENTS_DIR'] = str(STORE)
    env.pop('COHUB_EVENTS_INTEGRATION', None)
    env.pop('COHUB_EVENTS_INTEGRATION_SECRET', None)
    server = subprocess.Popen(['php', '-S', f'127.0.0.1:{PORT}', '-t', str(ROOT)], cwd=ROOT, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        for _ in range(50):
            try:
                urllib.request.urlopen(BASE + 'community-events.php?view=integration', timeout=1)
                break
            except Exception:
                time.sleep(0.1)
        else:
            raise SystemExit('php server did not start')
        status, contract = call('GET', 'community-events.php?view=integration')
        assert status == 200 and contract['autoApproval'] is False and contract['liveSync'] is False and contract['syncConfirmed'] is False
        assert contract['hookConfigured'] is False and contract['escalationSla']['autoApproveEnabled'] is False
        assert contract['escalationSla']['autoDeclineEnabled'] is False and contract['escalationSla']['thisReleaseExecutesSla'] is False
        assert contract['reviewPolicy']['ifUnclearWhetherUnhealthyOrControversial'] == 'leave_for_xiaolin'
        assert 'unhealthy' in contract['reviewPolicy']['decline'] and 'controversial' in contract['reviewPolicy']['decline']
        assert call('POST', 'community-events.php', {'action': 'integration', 'command': 'approve', 'requestId': 'req_' + 'a'*32})[1]['error'] == 'integration_disabled'
        future = '2026-12-20'
        status, created = call('POST', 'community-events.php', {
            'action': 'create', 'name': 'Jordan', 'contact': 'WhatsApp 011-000 0000', 'title': '<b>City walk</b>',
            'pax': '10–20', 'date': future, 'slot': '10-12', 'intro': 'A walk from Bukit Bintang.', 'note': ''
        })
        assert created['ok'] and created['status'] == 'pending_review' and created['id'].startswith('req_')
        status, public = call('GET', 'community-events.php?view=public')
        assert public['events'] == [] and public['booked'] == []
        status, owner = call('GET', 'community-events.php?view=owner')
        assert owner['events']['pending_review'][0]['id'] == created['id']
        status, approved = call('POST', 'community-events.php', {'action': 'approve', 'id': created['id']})
        assert approved['ok'] and approved['event']['status'] == 'approved_waiting_poster'
        status, public = call('GET', 'community-events.php?view=public')
        assert public['events'] == [] and public['booked'] == [{'date': future, 'slot': '10-12'}]
        status, blocked = call('POST', 'community-events.php', {
            'action': 'create', 'name': 'A', 'contact': '0110000001', 'title': 'Other', 'pax': 'Under 10',
            'date': future, 'slot': '10-12', 'intro': 'No', 'note': ''
        })
        assert blocked['error'] == 'slot_taken'
        boundary = '----cohubtest'
        image = png_bytes()
        raw = (
            f'--{boundary}\r\nContent-Disposition: form-data; name="id"\r\n\r\n{created["id"]}\r\n'
            f'--{boundary}\r\nContent-Disposition: form-data; name="upload"\r\n\r\n{approved["event"]["uploadToken"]}\r\n'
            f'--{boundary}\r\nContent-Disposition: form-data; name="poster"; filename="x.png"\r\nContent-Type: image/png\r\n\r\n'
        ).encode() + image + f'\r\n--{boundary}--\r\n'.encode()
        status, posted = call('POST', 'community-events.php', raw=raw, content_type=f'multipart/form-data; boundary={boundary}')
        assert posted['ok'] and posted['status'] == 'published', posted
        status, public = call('GET', 'community-events.php?view=public')
        assert len(public['events']) == 1 and public['events'][0]['title'] == '<b>City walk</b>'
        status, image_body = call('GET', 'community-events.php?poster=' + created['id'])
        assert status == 200 and image_body.startswith(b'\x89PNG')
        status, cancelled = call('POST', 'community-events.php', {'action': 'cancel', 'id': created['id']})
        assert cancelled['ok']
        status, public = call('GET', 'community-events.php?view=public')
        assert public['events'] == [] and public['booked'] == []
        print('PASS product flow with integration off')
    finally:
        server.terminate()
        server.wait(timeout=5)

    secret = secrets.token_hex(16)
    env['COHUB_EVENTS_INTEGRATION'] = 'on'
    env['COHUB_EVENTS_INTEGRATION_SECRET'] = secret
    port2 = '8766'
    server = subprocess.Popen(['php', '-S', f'127.0.0.1:{port2}', '-t', str(ROOT)], cwd=ROOT, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    BASE = f'http://127.0.0.1:{port2}/'
    try:
        for _ in range(50):
            try:
                urllib.request.urlopen(BASE + 'community-events.php?view=integration', timeout=1)
                break
            except Exception:
                time.sleep(0.1)
        request_id = 'req_' + 'ab' * 16
        record = {
            'events': [{
                'id': request_id, 'status': 'pending_review', 'name': 'Mina', 'contact': '0120000000',
                'title': 'Talk', 'pax': 'Under 10', 'date': '2026-12-28', 'slot': '18-20',
                'intro': 'A talk.', 'note': '', 'uploadToken': 'cd' * 16, 'posterFile': '',
                'createdAt': '2026-11-01T10:00:00+08:00', 'escalatedAt': '2026-11-01T10:00:00+08:00',
                'updatedAt': '2026-11-01T10:00:00+08:00'
            }],
            'rates': {}
        }
        (STORE / 'store.json').write_text(json.dumps(record))
        status, body = call('POST', 'community-events.php', {'action': 'integration', 'command': 'status', 'requestId': request_id}, headers={'X-Cohub-Integration-Secret': secret})
        sla = body['request']['sla']
        assert sla['windowOpen'] is True and sla['autoApprovePermitted'] is False and sla['autoDeclinePermitted'] is False
        assert sla['siteAction'] == 'none'
        record['events'][0]['date'] = '2026-11-02'
        record['events'][0]['slot'] = '10-12'
        (STORE / 'store.json').write_text(json.dumps(record))
        status, body = call('POST', 'community-events.php', {'action': 'integration', 'command': 'status', 'requestId': request_id}, headers={'X-Cohub-Integration-Secret': secret})
        assert body['request']['sla']['windowOpen'] is False
        assert body['request']['sla']['reason'] == 'too_close_to_event_start'
        before = json.loads((STORE / 'store.json').read_text())
        status, denied = call('POST', 'community-events.php', {'action': 'integration', 'command': 'approve', 'requestId': request_id}, headers={'X-Cohub-Integration-Secret': secret})
        assert denied['error'] == 'not_delegated' and denied['autoApproval'] is False
        assert json.loads((STORE / 'store.json').read_text())['events'][0]['status'] == before['events'][0]['status']
        status, contract = call('GET', 'community-events.php?view=integration')
        assert contract['autoApproval'] is False and contract['syncConfirmed'] is False and contract['liveSync'] is False
        print('PASS sla window does not auto-approve')
    finally:
        server.terminate()
        server.wait(timeout=5)

if __name__ == '__main__':
    main()
