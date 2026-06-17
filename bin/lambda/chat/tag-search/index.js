const AWS = require('aws-sdk');
const ddb = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME;
const TAGS_TABLE_NAME = process.env.TAGS_TABLE_NAME;

exports.handler = async (event) => {
  try {
    const hereNameRaw = event.headers?.hitoken;
    const hereName = safeDecode(hereNameRaw);
    if (!hereName) {
      return { statusCode: 400, headers: cors(), body: JSON.stringify({ error: 'Missing hitoken header' }) };
    }
    const qs = event.queryStringParameters || {};
    const q = (qs.q || '').trim();

    let items = [];

    if (!q) {
      return { statusCode: 200, headers: cors(), body: JSON.stringify({ items: [] }) };
    }

    // 1. Fuzzy search in Tags table (Scan or Query with begins_with)
    // Since it's per here_name, we can Query and filter with contains
    const tagsRes = await ddb.query({
      TableName: TAGS_TABLE_NAME,
      KeyConditionExpression: 'here_name = :h',
      FilterExpression: 'contains(tag_name, :q)',
      ExpressionAttributeValues: { ':h': hereName, ':q': q }
    }).promise();

    const matchingTags = (tagsRes.Items || []).map(t => t.tag_name);

    if (matchingTags.length === 0) {
      return { statusCode: 200, headers: cors(), body: JSON.stringify({ items: [] }) };
    }

    // 2. Query messages for these tags using GSI
    for (const tag of matchingTags) {
      const tagPk = `${hereName}#${tag}`;
      const msgRes = await ddb.query({
        TableName: TABLE_NAME,
        IndexName: 'FileTagIndex',
        KeyConditionExpression: 'tag_pk = :tpk',
        ExpressionAttributeValues: { ':tpk': tagPk },
        ScanIndexForward: false, // newest first
        Limit: 50 // limit per tag
      }).promise();
      
      if (msgRes.Items) {
        items.push(...msgRes.Items);
      }
    }

    // sort combined results by heart_time desc
    items.sort((a, b) => b.heart_time - a.heart_time);

    // dedup by heart_time just in case
    const seen = new Set();
    const finalItems = [];
    for (const item of items) {
      if (!seen.has(item.heart_time)) {
        seen.add(item.heart_time);
        finalItems.push(item);
      }
    }

    return { statusCode: 200, headers: cors(), body: JSON.stringify({ items: finalItems }) };
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
