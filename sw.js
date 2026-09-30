/* Service worker: guarda la app para que funcione sin señal. Cambia CACHE en cada versión nueva. */
const CACHE = 'acta-v1';
const LOCAL = [
  './', 'index.html', 'manifest.webmanifest',
  'styles/olibia-tokens.css', 'styles/app.css', 'styles/sheet.css',
  'styles/fonts/SeasonMix-TRIAL-Regular.ttf', 'styles/fonts/SeasonMix-TRIAL-Medium.ttf',
  'src/model.js', 'src/lists.js', 'src/catalog.js', 'src/rules.js', 'src/validate.js', 'src/sheets.js',
  'src/store.js', 'src/capture.js', 'src/form.js', 'src/export.js', 'src/app.js',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png'
];
const REMOTE = [
  'https://cdn.jsdelivr.net/npm/html-to-image@1.11.11/dist/html-to-image.js',
  'https://cdn.jsdelivr.net/npm/remixicon@4.6.0/fonts/remixicon.css',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap'
];
const RUNTIME_HOSTS = ['cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(LOCAL);
    await Promise.all(REMOTE.map(u => cache.add(new Request(u, { mode: 'cors' })).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const same = url.origin === self.location.origin;
  if (!same && RUNTIME_HOSTS.indexOf(url.hostname) === -1) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req, { ignoreSearch: req.mode === 'navigate' });
    if (hit) return hit;
    try {
      const res = await fetch(req);
      if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
      return res;
    } catch (e) {
      if (req.mode === 'navigate') return (await cache.match('index.html')) || Response.error();
      throw e;
    }
  })());
});
