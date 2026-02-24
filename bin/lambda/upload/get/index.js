const AWS = require('aws-sdk');
const S3 = new AWS.S3({ signatureVersion: 'v4' });
const BUCKET = process.env.BUCKET_NAME;

exports.handler = async (event) => {
  try {
    if (event.requestContext && event.requestContext.http && event.requestContext.http.method === 'OPTIONS') {
      return resp(204, {});
    }
    const qs = event.queryStringParameters || {};
    const key = qs.key || '';
    if (!key) return resp(400, { error: 'missing key' });
    const url = await S3.getSignedUrlPromise('getObject', { Bucket: BUCKET, Key: key, Expires: 300 });
    return resp(200, { url });
  } catch (e) {
    console.error('get url error', e && e.message);
    return resp(500, { error: 'InternalError' });
  }
};

function resp(code, data) {
  return { statusCode: code, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization, hitoken', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' }, body: JSON.stringify(data) };
}
