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
  } else if (url.pathname.startsWith('/map/')) {
    event.respondWith(handleMapRequest(event.request));
  } else if (url.pathname === '/api/map/static') {
    event.respondWith(handleMapApiRequest(event.request));
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

async function handleMapRequest(req) {
  const url = new URL(req.url);
  // /map/<lng>,<lat>?z=17&s=750*300
  const path = url.pathname.slice('/map/'.length);
  const parts = decodeURIComponent(path||'').split(',');
  const lng = parseFloat(parts[0]); const lat = parseFloat(parts[1]);
  const z = url.searchParams.get('z') || '17';
  const s = url.searchParams.get('s') || '750*300';
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(req);
  if (cached) return cached;
  try {
    if (!isFinite(lat) || !isFinite(lng)) {
      return new Response('bad map request', { status: 400 });
    }
    // derive API base
    let api = url.searchParams.get('a') || '';
    if (!api) api = self.location.origin;
    const base = String(api).replace(/\/+$/, '');
    const p = /\/api$/i.test(base) ? '/map/static' : '/api/map/static';
    const q = `?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}&zoom=${encodeURIComponent(z)}&size=${encodeURIComponent(s)}`;
    const target = base + p + q;
    try { console.log('[SW] map request =>', target.replace(/([?&]key=)[^&]+/i,'$1***')); } catch {}
    const mapRes = await fetch(target, { cache: 'no-store', mode: 'cors' });
    if (!mapRes.ok) return mapRes;
    await cache.put(req, mapRes.clone());
    return mapRes;
  } catch (e) {
    try { console.error('[SW] map request error:', (e && e.message) || String(e)); } catch {}
    return new Response('map error', { status: 500 });
  }
}

async function handleMapApiRequest(req) {
  const url = new URL(req.url);
  const lat = parseFloat(url.searchParams.get('lat') || '');
  const lng = parseFloat(url.searchParams.get('lng') || '');
  const z = String(url.searchParams.get('zoom') || '17');
  const s = String(url.searchParams.get('size') || '750*300');
  if (!isFinite(lat) || !isFinite(lng)) return new Response('bad map request', { status: 400 });
  const cache = await caches.open(CACHE_NAME);
  // 直接以实际请求 URL 作为缓存键，避免使用非 http/https scheme 导致 TypeError
  const cached = await cache.match(req);
  if (cached) return cached;
  const target = req.url;
  try { console.log('[SW] map api =>', String(target).replace(/([?&]key=)[^&]+/i,'$1***')); } catch {}
  try {
    const res = await fetch(target, { cache: 'no-store', mode: 'cors' });
    if (res && res.ok) {
      await cache.put(req, res.clone());
    }
    return res;
  } catch (e) {
    try { console.error('[SW] map api error:', (e && e.message) || String(e), target); } catch {}
    return new Response('map error', { status: 500 });
  }
}
