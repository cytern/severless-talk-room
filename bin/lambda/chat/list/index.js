const AWS = require('aws-sdk');
const ddb = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME;

exports.handler = async (event) => {
  try {
    const hereNameRaw = event.headers?.hitoken;
    const hereName = safeDecode(hereNameRaw);
    if (!hereName) {
      return { statusCode: 400, headers: cors(), body: JSON.stringify({ error: 'Missing hitoken header' }) };
    }
    const qs = event.queryStringParameters || {};
    const limit = Number(qs.limit) || 10;
    let exclusiveStartKey;
    if (qs.lastKey) {
      try {
        exclusiveStartKey = JSON.parse(Buffer.from(qs.lastKey, 'base64').toString('utf8'));
      } catch (_) {}
    }
    const resp = await ddb.query({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'here_name = :h',
      ExpressionAttributeValues: { ':h': hereName },
      ScanIndexForward: false, // descending
      Limit: limit,
      ExclusiveStartKey: exclusiveStartKey
    }).promise();
    let nextKey;
    if (resp.LastEvaluatedKey) {
      nextKey = Buffer.from(JSON.stringify(resp.LastEvaluatedKey)).toString('base64');
    }
    return { statusCode: 200, headers: cors(), body: JSON.stringify({ items: resp.Items || [], nextKey }) };
  } catch (e) {
    console.error(e);
    return { statusCode: 500, headers: cors(), body: JSON.stringify({ error: 'InternalError' }) };
  }
};

function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, hitoken',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  };
}

function safeDecode(v) {
  if (!v) return '';
  try { return decodeURIComponent(v); } catch { return v; }
}
