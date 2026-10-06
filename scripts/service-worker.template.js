const CACHE_PREFIX = 'flowmusic-prompt-generator-';
const CACHE_NAME = CACHE_PREFIX + '__FLOWMUSIC_BUILD_ID__';

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    const shellUrl = new URL('./', self.registration.scope);
    const shell = await fetch(shellUrl, { cache: 'reload' });
    if (!shell.ok) throw new Error('Unable to cache the application shell.');
    await cache.put(shellUrl, shell.clone());

    const html = await shell.text();
    const assetUrls = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
      .map((match) => new URL(match[1], shellUrl))
      .filter((url) => url.origin === self.location.origin && /\.(?:js|css|svg|png|webmanifest)$/i.test(url.pathname));
    const manifestUrl = assetUrls.find((url) => /\.webmanifest$/i.test(url.pathname));
    const iconUrls = [];

    if (manifestUrl) {
      const manifest = await fetch(manifestUrl);
      if (!manifest.ok) throw new Error('Unable to cache the application manifest.');
      await cache.put(manifestUrl, manifest.clone());
      const manifestData = await manifest.json();
      for (const icon of manifestData.icons ?? []) {
        const iconUrl = new URL(icon.src, manifestUrl);
        if (iconUrl.origin === self.location.origin) iconUrls.push(iconUrl);
      }
    }

    const uniqueAssets = [...new Map([...assetUrls, ...iconUrls].map((url) => [url.href, url])).values()]
      .filter((url) => url.href !== manifestUrl?.href);
    await Promise.all(uniqueAssets.map(async (url) => {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Unable to cache application asset: ' + url.pathname);
      await cache.put(url, response);
    }));
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
      .map((key) => caches.delete(key)));
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
