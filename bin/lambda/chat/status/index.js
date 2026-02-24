const AWS = require('aws-sdk');
const ddb = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME;

exports.handler = async (event) => {
  try {
    if (event.requestContext && event.requestContext.http && event.requestContext.http.method === 'OPTIONS') {
      return resp(204, {});
    }
    const hereNameRaw = event.headers?.hitoken;
    const hereName = safeDecode(hereNameRaw);
    if (!hereName) {
      return resp(400, { error: 'Missing hitoken header' });
    }
    const body = JSON.parse(event.body || '{}');
    let keys = Array.isArray(body.keys) ? body.keys : [];
    keys = keys.map(v => Number(v)).filter(v => Number.isFinite(v) && v > 0);
    if (!keys.length) {
      return resp(200, { items: [] });
    }
    const maxBatch = 100;
    const chunks = [];
    for (let i = 0; i < keys.length; i += maxBatch) chunks.push(keys.slice(i, i + maxBatch));
    const allItems = [];
    for (const chunk of chunks) {
      const req = {
        RequestItems: {
          [TABLE_NAME]: {
            Keys: chunk.map(ht => ({ here_name: hereName, heart_time: ht })),
            ProjectionExpression: 'here_name, heart_time, readers, read_count'
          }
        }
      };
      const respData = await ddb.batchGet(req).promise();
      const items = (respData.Responses && respData.Responses[TABLE_NAME]) || [];
      allItems.push(...items);
    }
    return resp(200, { items: allItems });
  } catch (e) {
    console.error(e);
    return resp(500, { error: 'InternalError' });
  }
};

function safeDecode(v) {
  if (!v) return '';
  try { return decodeURIComponent(v); } catch { return v; }
}

function resp(code, data) {
  return {
    statusCode: code,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, hitoken',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    },
    body: JSON.stringify(data)
  };
}

