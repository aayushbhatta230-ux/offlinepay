// Caches the app shell so the wallet opens in airplane mode.
// Network-first (so updates show during development), cache as fallback.
const CACHE = 'opay-shell-v1-' + self.registration.scope;
const SHELL = [
  './', 'index.html', 'app.js', 'styles.css', 'manifest.webmanifest',
  '/sdk/offlinepay-sdk.js', '/sdk/protocol.js', '/vendor/qrcode.js', '/vendor/jsQR.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  if (url.pathname.startsWith('/v1/') || url.pathname.includes('/api/')) return; // live data: never cache

  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
