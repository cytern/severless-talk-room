const AWS = require('aws-sdk');
const S3 = new AWS.S3({ signatureVersion: 'v4' });
const BUCKET = process.env.BUCKET_NAME;

exports.handler = async (event) => {
  try {
    const key = 'viewer_app_secure.exe';
    const url = await S3.getSignedUrlPromise('getObject', { 
      Bucket: BUCKET, 
      Key: key, 
      Expires: 300 
    });
    
    return {
      statusCode: 302,
      headers: {
        'Location': url,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    };
  } catch (e) {
    console.error('get url error', e && e.message);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'InternalError' })
    };
  }
};
