const CACHE_NAME = 'laundry-pos-shell-v2';
const SHELL_FILES = [
  'index.html',
  'pos.html',
  'admin.html',
  'agen.html',
  'poslaundry.html',
  'offline-sync.js',
  'order-lists.js'
];
const EXCLUDED_HOSTS = ['api.cloudinary.com'];

async function cacheIfAvailable(cache, request) {
  try {
    const response = await fetch(request);
    if (response.ok || response.type === 'opaque') {
      await cache.put(request, response.clone());
      return response;
    }
  } catch (error) {
    console.warn('Aset offline tidak dapat di-cache:', request.url, error);
  }
  return null;
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    const scope = self.registration.scope;
    let posPage = null;

    for (const file of SHELL_FILES) {
      const request = new Request(new URL(file, scope).href, { cache: 'reload' });
      const response = await cacheIfAvailable(cache, request);
      if (response && /(?:poslaundry|pos)\.html$/i.test(new URL(request.url).pathname)) {
        posPage = { url: request.url, response };
      }
    }

    if (posPage) {
      const html = await posPage.response.clone().text();
      const assets = [...html.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/gi)]
        .map(match => {
          try {
            return new URL(match[1], posPage.url);
          } catch {
            return null;
          }
        })
        .filter(url => url && /^https?:$/.test(url.protocol) && url.origin !== self.location.origin);

      const uniqueAssets = [...new Map(assets.map(url => [url.href, url])).values()];
      await Promise.all(uniqueAssets.map(url => {
        const request = new Request(url.href, { mode: 'no-cors' });
        return cacheIfAvailable(cache, request);
      }));
    } else {
      console.error('Halaman POS tidak ditemukan untuk cache offline.');
    }

    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('laundry-pos-shell-') && key !== CACHE_NAME)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    if (EXCLUDED_HOSTS.includes(url.hostname) || /(?:firebasedatabase\.app|firebaseio\.com)$/.test(url.hostname)) return;
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok || response.type === 'opaque') await cache.put(request, response.clone());
      return response;
    })());
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      const response = await fetch(request);
      if (response.ok) await cache.put(request, response.clone());
      return response;
    } catch (error) {
      const exactMatch = await cache.match(request);
      if (exactMatch) return exactMatch;

      const withoutQuery = new URL(request.url);
      withoutQuery.search = '';
      const pathMatch = await cache.match(withoutQuery.href);
      if (pathMatch) return pathMatch;

      if (request.mode === 'navigate') {
        const fallback = await cache.match(new URL('index.html', self.registration.scope).href)
          || await cache.match(new URL('poslaundry.html', self.registration.scope).href);
        if (fallback) return fallback;
      }
      throw error;
    }
  })());
});
