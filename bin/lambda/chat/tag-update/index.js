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
    const body = JSON.parse(event.body || '{}');
    const { heart_time, tag_name } = body;

    if (heart_time == null || !tag_name) {
      return { statusCode: 400, headers: cors(), body: JSON.stringify({ error: 'Missing parameters' }) };
    }

    const tagPk = `${hereName}#${tag_name}`;

    // Update the message item to add the tag
    await ddb.update({
      TableName: TABLE_NAME,
      Key: { here_name: hereName, heart_time: Number(heart_time) },
      UpdateExpression: 'SET file_tag = :tag, tag_pk = :tpk',
      ExpressionAttributeValues: { ':tag': tag_name, ':tpk': tagPk }
    }).promise();

    // Add tag to tags table
    await ddb.put({
      TableName: TAGS_TABLE_NAME,
      Item: {
        here_name: hereName,
        tag_name: tag_name
      }
    }).promise();

    return { statusCode: 200, headers: cors(), body: JSON.stringify({ ok: true }) };
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
