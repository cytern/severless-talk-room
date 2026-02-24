const https = require('https');
let SSM = null;
try { SSM = require('aws-sdk/clients/ssm'); } catch {}

exports.handler = async (event) => {
  try {
    const qs = event.queryStringParameters || {};
    const lat = parseFloat(qs.lat);
    const lng = parseFloat(qs.lng);
    const zoom = String(qs.zoom || '17');
    const size = String(qs.size || '750*300');
    let key = process.env.AMAP_KEY || '';
    if (!key && SSM && process.env.AMAP_PARAM_NAME) {
      try {
        const ssm = new SSM();
        const r = await ssm.getParameter({ Name: process.env.AMAP_PARAM_NAME, WithDecryption: true }).promise();
        key = r && r.Parameter && r.Parameter.Value || '';
      } catch {}
    }
    if (!key) return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'AMAP_KEY missing' }) };
    if (!(isFinite(lat) && isFinite(lng))) {
      return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'lat/lng required' }) };
    }
    // AMap expects location=lng,lat ; markers=...:lng,lat
    const u = new URL('https://restapi.amap.com/v3/staticmap');
    u.searchParams.set('location', `${lng},${lat}`);
    u.searchParams.set('zoom', zoom);
    u.searchParams.set('size', size);
    u.searchParams.set('markers', `mid,,A:${lng},${lat}`);
    u.searchParams.set('key', key);
    const urlStr = u.toString();
    const safeUrl = urlStr.replace(/([?&]key=)[^&]+/i, '$1***');
    console.log('AMap static proxy params:', { lat, lng, zoom, size });
    console.log('AMap static forwarding to:', safeUrl);
    const buf = await fetchBuffer(urlStr, safeUrl);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400' },
      isBase64Encoded: true,
      body: buf.toString('base64')
    };
  } catch (e) {
    console.error('AMap static proxy error:', e && e.message || String(e));
    return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'map fetch failed' }) };
  }
};

function fetchBuffer(url, safeUrl) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      if (res.statusCode !== 200) {
        try { console.warn('AMap static non-200:', res.statusCode, safeUrl || url); } catch {}
        reject(new Error('status ' + res.statusCode));
        res.resume();
        return;
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', (err) => {
      try { console.error('AMap static request error:', err && err.message || String(err), safeUrl || url); } catch {}
      reject(err);
    });
  });
}
