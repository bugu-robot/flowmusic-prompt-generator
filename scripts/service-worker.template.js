const CACHE_PREFIX = 'flowmusic-prompt-generator-';
const CACHE_NAME = CACHE_PREFIX + '__FLOWMUSIC_BUILD_ID__';

async function responseForAudioRange(response, rangeHeader) {
  if (!rangeHeader) return response;
  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
  if (!match) return response;

  const bytes = await response.clone().arrayBuffer();
  const length = bytes.byteLength;
  let start = match[1] ? Number(match[1]) : null;
  let end = match[2] ? Number(match[2]) : null;
  if (start === null && end !== null) {
    start = Math.max(0, length - end);
    end = length - 1;
  } else {
    start ??= 0;
    end ??= length - 1;
    end = Math.min(end, length - 1);
  }
  if (start === null || end === null || start >= length || start > end) {
    return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${length}` } });
  }

  const headers = new Headers(response.headers);
  headers.set('Accept-Ranges', 'bytes');
  headers.set('Content-Length', String(end - start + 1));
  headers.set('Content-Range', `bytes ${start}-${end}/${length}`);
  return new Response(bytes.slice(start, end + 1), { status: 206, statusText: 'Partial Content', headers });
}

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
    const url = new URL(request.url);
    const isPreviewAudio = url.pathname.includes('/audio-previews/') && url.pathname.endsWith('.mp3');

    if (isPreviewAudio) {
      const range = request.headers.get('range');
      const cachedPreview = await cache.match(url.href);
      if (cachedPreview) return responseForAudioRange(cachedPreview, range);
      try {
        // Store the complete small MP3 even when Safari starts with a Range
        // request. Return the requested byte window so media playback keeps
        // its expected 206 response semantics on the first play as well.
        const headers = new Headers(request.headers);
        headers.delete('range');
        const fullRequest = new Request(request, { headers });
        const response = await fetch(fullRequest);
        if (response.ok && response.status === 200) {
          await cache.put(url.href, response.clone());
          return responseForAudioRange(response, range);
        }
        return response;
      } catch {
        return Response.error();
      }
    }

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
