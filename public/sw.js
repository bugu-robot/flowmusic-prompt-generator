const CACHE_PREFIX = 'flowmusic-prompt-generator-';
const CACHE_NAME = CACHE_PREFIX + 'v1';

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    const shellUrl = new URL('./', self.registration.scope);
    const shell = await fetch(shellUrl);
    if (!shell.ok) throw new Error('Unable to cache the application shell.');
    await cache.put(shellUrl, shell.clone());
    const html = await shell.text();
    const assetUrls = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
      .map((match) => new URL(match[1], shellUrl))
      .filter((url) => url.origin === self.location.origin && /\.(?:js|css|svg|webmanifest)$/i.test(url.pathname));
    await Promise.all(assetUrls.map(async (url) => {
      const response = await fetch(url);
      if (response.ok) await cache.put(url, response);
    }));
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      const response = await fetch(request);
      if (response.ok) await cache.put(request, response.clone());
      return response;
    } catch {
      const cached = await cache.match(request);
      if (cached) return cached;
      if (request.mode === 'navigate') return (await cache.match(new URL('./', self.registration.scope))) ?? Response.error();
      return Response.error();
    }
  })());
});
