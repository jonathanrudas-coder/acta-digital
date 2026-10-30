/* Service worker: guarda la app para que funcione sin señal. Cambia CACHE en cada versión nueva. */
const CACHE = 'acta-v11';
const LOCAL = [
  './', 'index.html', 'manifest.webmanifest',
  'styles/olibia-tokens.css', 'styles/app.css', 'styles/sheet.css',
  'src/model.js', 'src/lists.js', 'src/catalog.js', 'src/rules.js', 'src/validate.js', 'src/sheets.js',
  'src/store.js', 'src/capture.js', 'src/form.js', 'src/export.js', 'src/app.js',
  'icons/favicon-32.png', 'icons/icon-192.png', 'icons/icon-512.png'
];
const REMOTE = [
  'https://cdn.jsdelivr.net/npm/html-to-image@1.11.11/dist/html-to-image.js',
  'https://cdn.jsdelivr.net/npm/remixicon@4.6.0/fonts/remixicon.css',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap'
];
const RUNTIME_HOSTS = ['cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com'];

/* Guarda un recurso remoto; si es CSS, guarda también las fuentes que referencia (woff2 de Inter y Remix Icon). */
async function cacheRemote(cache, url) {
  const res = await fetch(new Request(url, { mode: 'cors' }));
  if (!res.ok) return;
  await cache.put(url, res.clone());
  if (!/\.css(\?|$)|fonts\.googleapis\.com\/css/.test(url)) return;
  const css = await res.text();
  const fonts = [...css.matchAll(/url\(\s*['"]?([^'")]+\.woff2[^'")]*)['"]?\s*\)/g)].map(m => new URL(m[1], url).href);
  await Promise.all(fonts.map(f => cache.add(new Request(f, { mode: 'cors' })).catch(() => {})));
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // cache: 'reload' evita que la versión nueva se llene con archivos viejos de la caché HTTP del navegador.
    await cache.addAll(LOCAL.map(u => new Request(u, { cache: 'reload' })));
    await Promise.all(REMOTE.map(u => cacheRemote(cache, u).catch(() => {})));
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
