// Only the public offline page is cached. Never cache a session, API response or guest data.
const CACHE = 'jovian-offline-v1';
const OFFLINE = '/web/offline.html';
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.add(OFFLINE)));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('jovian-offline-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || event.request.mode !== 'navigate' || !url.pathname.startsWith('/web/')) return;
  event.respondWith(fetch(event.request).catch(async () => (await caches.match(OFFLINE)) || Response.error()));
});
