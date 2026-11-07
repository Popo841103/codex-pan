// Anyone on the internet can open the signup page, create one account and one empty
// store, and start working in it. The account is an administrator of exactly its own
// store and nothing else: it cannot create a second store, and a member it invites
// inherits the same limit. Strangers never reach anything outside their own store.
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Store } from '../server/store.js';
import { makeServer } from '../server/http.js';

const password = () => randomUUID().replace(/-/g, '');
const send = (store, user, command, propertyId, revision = 0) =>
  store.command(user, { key: randomUUID(), expectedRevision: revision, command: { propertyId, ...command } });

function install(t) {
  const dir = mkdtempSync(join(tmpdir(), 'jovian-signup-'));
  const store = new Store(join(dir, 'test.sqlite'));
  if (t) t.after(() => { try { store.close(); } catch {} rmSync(dir, { recursive: true, force: true }); });
  const root = store.createUser({ username: 'test-root', password: password(), role: 'admin', propertyIds: [] });
  return { store, root, dir };
}

const signupInput = over => ({ username: 'trial-owner', password: password(), propertyId: 'TRIAL-KL', name: 'Trial Guesthouse', ...over });

test('a stranger can sign up and receives one account plus one empty store', () => {
  const { store } = install();
  try {
    const pass = password();
    const created = store.signup(signupInput({ password: pass }));
    assert.equal(created.username, 'trial-owner');
    assert.equal(created.propertyId, 'TRIAL-KL');
    const row = store.db.prepare("SELECT id,role,origin,active FROM users WHERE username='trial-owner'").get();
    assert.equal(row.role, 'admin', 'the trial owner administers their own store');
    assert.equal(row.origin, 'trial');
    assert.equal(row.active, 1);
    const body = JSON.parse(store.db.prepare('SELECT body FROM properties WHERE id=?').get('TRIAL-KL').body);
    assert.deepEqual(body.roomTypes, []);
    assert.deepEqual(body.physicalRooms, []);
    assert.deepEqual(body.resources, []);
    assert.deepEqual(body.orders, []);
    assert.equal(body.properties[0].name, 'Trial Guesthouse');
    assert.equal(body.businessDate, null, 'the store has no business day until the owner starts one');
    const audit = store.db.prepare("SELECT summary FROM audit WHERE property_id='TRIAL-KL' AND action='property_create'").all();
    assert.equal(audit.length, 1, 'the creation is one append-only audit row');
    const summary = JSON.parse(audit[0].summary);
    assert.equal(summary.starterInventory, 'empty');
    assert.equal(summary.origin, 'trial');
    assert.equal(summary.createdBy, 'trial-owner');
    // The account can log in and read its store like any administrator.
    const auth = store.login('trial-owner', pass);
    assert.equal(auth.user.role, 'admin');
    assert.equal(auth.user.origin, 'trial');
    const state = store.read(auth.user);
    assert.deepEqual(state.properties.map(p => p.id), ['TRIAL-KL'], 'the trial sees exactly its own store');
  } finally { store.close(); }
});

test('a trial account cannot create a second store, and an invited member inherits the limit', () => {
  const { store } = install();
  try {
    const pass = password();
    const created = store.signup(signupInput({ password: pass }));
    const auth = store.login(created.username, pass);
    const second = { type: 'property_create', propertyId: 'TRIAL-KL', newPropertyId: 'SECOND', name: 'Second Store' };
    assert.throws(() => send(store, auth.user, second, 'TRIAL-KL'),
      e => e.status === 403 && e.message === 'forbidden', 'growing past one store is refused at the command itself');
    assert.equal(store.db.prepare('SELECT COUNT(*) n FROM properties').get().n, 1);
    // The owner invites an administrator onto the same store; that member must not be
    // a loophole around the one-store cap.
    send(store, auth.user, { type: 'member_save', username: 'trial-staff', role: 'admin', password: 'p'.repeat(16), propertyIds: ['TRIAL-KL'] }, 'TRIAL-KL');
    const staffRow = store.db.prepare("SELECT origin FROM users WHERE username='trial-staff'").get();
    assert.equal(staffRow.origin, 'trial', 'an invited member carries the same trial origin');
    const staff = store.login('trial-staff', 'p'.repeat(16));
    assert.throws(() => send(store, staff.user, second, 'TRIAL-KL'),
      e => e.status === 403 && e.message === 'forbidden');
    // Ordinary administrator work inside the one store still works.
    const rev = () => store.read(auth.user).revisions['TRIAL-KL'];
    const saved = send(store, auth.user, { type: 'room_type_save', productId: 'room', gender: 'any', maxGuests: 2, names: { zh: '大床房', en: 'Double', ms: 'Bilik' } }, 'TRIAL-KL', rev());
    assert.equal(typeof saved.revision, 'number');
    assert.equal(store.read(auth.user).roomTypes.length, 1, 'the trial owner configures their own catalog');
  } finally { store.close(); }
});

test('signup validation, duplicates and the trial cap', () => {
  const { store, root } = install();
  try {
    assert.throws(() => store.signup(signupInput({ username: 'ab' })), e => e.status === 400 && e.message === 'signup_input');
    assert.throws(() => store.signup(signupInput({ username: 'bad name!' })), e => e.status === 400 && e.message === 'signup_input');
    assert.throws(() => store.signup(signupInput({ password: 'short' })), e => e.status === 400 && e.message === 'password_length');
    assert.throws(() => store.signup(signupInput({ propertyId: 'x' })), e => e.status === 400 && e.message === 'signup_input');
    assert.throws(() => store.signup(signupInput({ propertyId: 'bad id!' })), e => e.status === 400 && e.message === 'signup_input');
    assert.throws(() => store.signup(signupInput({ name: '   ' })), e => e.status === 400 && e.message === 'signup_input');
    assert.throws(() => store.signup(signupInput({ name: 'x'.repeat(81) })), e => e.status === 400 && e.message === 'signup_input');
    store.signup(signupInput());
    assert.throws(() => store.signup(signupInput()), e => e.status === 409 && e.message === 'username_taken', 'a taken username is refused');
    assert.throws(() => store.signup(signupInput({ username: 'other-owner', propertyId: 'TRIAL-KL' })),
      e => e.status === 409 && e.message === 'property_exists', 'a taken store code is refused');
    // The cap stops a loop from filling the shared database; it is a service decision
    // and is answered as such.
    const original = Store.trialStoreCap;
    try {
      Store.trialStoreCap = 1;
      assert.throws(() => store.signup(signupInput({ username: 'next-owner', propertyId: 'TRIAL-PG' })),
        e => e.status === 403 && e.message === 'signup_closed');
    } finally { Store.trialStoreCap = original; }
    // A staff administrator is untouched by all of it: the same root can still create
    // properties the way it always did.
    const mine = send(store, root, { type: 'property_create', propertyId: 'STAFF-NEW', newPropertyId: 'STAFF-NEW', name: 'Staff Store' }, 'STAFF-NEW', 0);
    assert.equal(mine.propertyId, 'STAFF-NEW');
    assert.equal(store.db.prepare("SELECT origin FROM users WHERE username='test-root'").get().origin, 'staff');
  } finally { store.close(); }
});

test('one trial never reads or writes another trial, or a staff store', () => {
  const { store, root } = install();
  try {
    store.signup(signupInput({ password: 'x'.repeat(24) }));
    store.signup(signupInput({ username: 'second-owner', propertyId: 'TRIAL-PG', name: 'Second Trial', password: 'x'.repeat(24) }));
    send(store, root, { type: 'property_create', propertyId: 'STAFF-KL', newPropertyId: 'STAFF-KL', name: 'Staff KL' }, 'STAFF-KL', 0);
    const ownerA = store.login('trial-owner', 'x'.repeat(24));
    const state = store.read(ownerA.user);
    assert.deepEqual(state.properties.map(p => p.id), ['TRIAL-KL'], 'no other store is ever in scope');
    assert.deepEqual(state.members.map(m => m.username), ['trial-owner'],
      'only members sharing the trial store are listed, never another store\'s people');
    assert.throws(() => send(store, ownerA.user, { type: 'room_type_save', productId: 'room', gender: 'any', maxGuests: 1, names: { zh: 'x', en: 'x', ms: 'x' } }, 'TRIAL-PG'),
      e => e.status === 403, 'a command aimed at another trial is refused');
    assert.throws(() => send(store, ownerA.user, { type: 'room_type_save', productId: 'room', gender: 'any', maxGuests: 1, names: { zh: 'x', en: 'x', ms: 'x' } }, 'STAFF-KL'),
      e => e.status === 403, 'a command aimed at a staff store is refused');
    // A staff administrator of the platform cannot see trial members either, unless
    // they share a property; root owns no property in scope with TRIAL-KL.
    const staffScope = store.visibleMembers(root);
    assert.ok(!staffScope.some(m => m.username === 'trial-owner'), 'trial accounts are not visible to staff on other stores');
  } finally { store.close(); }
});

// The signup page itself is plain HTML with no script, served like the public site,
// and the POST is rate limited per caller with a honeypot that answers like the limit.
test('the signup page and route work over real HTTP, and abuse answers without writing', async t => {
  const { store } = install(t);
  const server = makeServer(store);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { server.closeAllConnections(); await new Promise(r => server.close(r)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (path, fields) => fetch(base + path, { method: 'POST',
    headers: { Origin: base, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(fields), redirect: 'manual' });

  const page = await fetch(base + '/signup');
  assert.equal(page.status, 200);
  assert.equal(page.headers.get('content-security-policy'), "default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
    'the signup page is as script-free as the public site');
  const html = await page.text();
  assert.ok(!/<script/i.test(html), 'the page carries no script');
  assert.ok(html.includes('name="username"') && html.includes('name="store"') && html.includes('name="company"'), 'the form fields and the honeypot are present');

  // A successful signup redirects to the workspace with the account named, and the
  // store genuinely exists afterwards.
  const fields = { username: 'http-owner', password: 'http-owner-password', confirm: 'http-owner-password', storeName: 'HTTP Trial', store: 'HTTP-KL', company: '' };
  const ok = await post('/signup', fields);
  assert.equal(ok.status, 303);
  assert.match(ok.headers.get('location'), /^\/web\/\?signup=http-owner&store=HTTP-KL$/);
  assert.ok(store.db.prepare("SELECT 1 FROM users WHERE username='http-owner' AND origin='trial'").get());

  // A filled honeypot answers like a rate limit and writes nothing.
  const spam = await post('/signup', { ...fields, username: 'spam-owner', store: 'SPAM-KL', company: 'Cheap SEO' });
  assert.equal(spam.status, 429);
  assert.ok(!store.db.prepare("SELECT 1 FROM users WHERE username='spam-owner'").get(), 'a filled honeypot created no account');

  // A mismatched password bounces back with the error named and the fields kept.
  const mismatch = await post('/signup', { ...fields, username: 'typo-owner', confirm: 'different-password-000' });
  assert.equal(mismatch.status, 303);
  assert.match(mismatch.headers.get('location'), /signupError=password_mismatch/);
  assert.match(mismatch.headers.get('location'), /username=typo-owner/);
  assert.ok(!store.db.prepare("SELECT 1 FROM users WHERE username='typo-owner'").get());

  // Every counted attempt fills the same per-address window: the success, the
  // honeypot and the mismatch above used three, so two more pass and the sixth
  // is refused without writing.
  for (let i = 0; i < 2; i++) {
    const attempt = await post('/signup', { ...fields, username: `rl-owner-${i}`, store: `RL-${i}` });
    assert.equal(attempt.status, 303, `attempt ${i + 1} reaches the handler`);
  }
  const sixth = await post('/signup', { ...fields, username: 'rl-owner-99', store: 'RL-99' });
  assert.equal(sixth.status, 429, 'the sixth counted attempt from one address is refused');
  assert.ok(!store.db.prepare("SELECT 1 FROM users WHERE username='rl-owner-99'").get());
});
