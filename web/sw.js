const CACHE_NAME = 'hihere-media-pwa-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/media/')) {
    event.respondWith(handleMediaRequest(event.request));
  }
});

async function handleMediaRequest(req) {
  const url = new URL(req.url);
  const keyEnc = url.pathname.slice('/media/'.length);
  const key = decodeURIComponent(keyEnc || '');
  const token = url.searchParams.get('t') || '';
  let api = url.searchParams.get('a') || '';
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(req);
  if (cached) {
    return cached;
  }
  try {
    if (!key) {
      return new Response('bad request', { status: 400 });
    }
    // Fallback: if no explicit API base provided, try same-origin (for execute-api domain部署场景)
    if (!api) {
      api = self.location.origin;
    }
    const base = String(api).replace(/\/+$/, '');
    const needsShort = /\/api$/i.test(base);
    const path = needsShort ? '/get-url' : '/api/get-url';
    const headers = { 'hitoken': encodeURIComponent(token || '') };
    const q = '?key=' + encodeURIComponent(key);
    const signRes = await fetch(base + path + q, { headers, cache: 'no-store', mode: 'cors' });
    if (!signRes.ok) return signRes;
    let signed = '';
    try { const j = await signRes.json(); signed = j && j.url || ''; } catch {}
    if (!signed) {
      return new Response('no signed url', { status: 502 });
    }
    const objRes = await fetch(signed, { cache: 'no-store', mode: 'cors' });
    if (!objRes.ok) return objRes;
    await cache.put(req, objRes.clone());
    return objRes;
  } catch (e) {
    return new Response('fetch error', { status: 500 });
  }
}
