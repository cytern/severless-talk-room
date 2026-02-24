const AWS = require('aws-sdk');
const S3 = new AWS.S3({ signatureVersion: 'v4' });
const BUCKET = process.env.BUCKET_NAME;

exports.handler = async (event) => {
  try {
    if (event.requestContext && event.requestContext.http && event.requestContext.http.method === 'OPTIONS') {
      return resp(204, {});
    }
    const body = JSON.parse(event.body || '{}');
    const ct = String(body.contentType || 'application/octet-stream');
    const ext = (String(body.ext || '').replace(/[^a-zA-Z0-9\\.\\-_]/g, '') || '');
    const here = safeDecode(event.headers?.hitoken || '');
    if (!here) return resp(400, { error: 'Missing hitoken' });
    if (!BUCKET) return resp(500, { error: 'BucketNotConfigured' });
    const key = buildKey(here, ext);
    const url = await S3.getSignedUrlPromise('putObject', { Bucket: BUCKET, Key: key, Expires: 300, ContentType: ct });
    return resp(200, { key, url });
  } catch (e) {
    console.error('sign upload error', e && e.message, e && e.stack);
    return resp(500, { error: 'InternalError', reason: String(e && e.message || '') });
  }
};

function buildKey(here, ext) {
  const now = new Date();
  const p = n => String(n).padStart(2, '0');
  const y = now.getUTCFullYear();
  const m = p(now.getUTCMonth() + 1);
  const d = p(now.getUTCDate());
  const ts = Date.now();
  const rnd = Math.random().toString(36).slice(2, 8);
  const suffix = ext && ext[0] === '.' ? ext : (ext ? '.' + ext : '');
  return `${encodeURIComponent(here)}/${y}${m}${d}/${ts}-${rnd}${suffix}`;
}
function safeDecode(v) { try { return decodeURIComponent(v); } catch { return v || ''; } }
function resp(code, data) {
  return { statusCode: code, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization, hitoken', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' }, body: JSON.stringify(data) };
}
