const AWS = require('aws-sdk');
const ddb = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME;
const SECRET_KEY = 'aabbccdd112233';

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');
    const { here_name, here_nick_name, secret_key } = body;

    if (!here_name || !here_nick_name) {
      return { statusCode: 400, headers: cors(), body: JSON.stringify({ error: 'Missing parameters' }) };
    }

    // Check if planet exists
    const planetCheck = await ddb.query({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'here_name = :h',
      ExpressionAttributeValues: { ':h': here_name },
      Limit: 1
    }).promise();

    const planetExists = planetCheck.Items && planetCheck.Items.length > 0;
    let userExists = false;

    if (planetExists) {
      // Check if user exists
      const userCheck = await ddb.query({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'here_name = :h',
        FilterExpression: 'here_nick_name = :n',
        ExpressionAttributeValues: { ':h': here_name, ':n': here_nick_name },
        Limit: 1
      }).promise();
      userExists = userCheck.Items && userCheck.Items.length > 0;
    }

    if (!planetExists || !userExists) {
      if (secret_key !== SECRET_KEY) {
        return { statusCode: 403, headers: cors(), body: JSON.stringify({ error: 'SecretKeyRequired', message: '新增加的用户和新的星球需要输入固定密钥' }) };
      } else {
        // Record the registration so next time it exists even without messages
        await ddb.put({
          TableName: TABLE_NAME,
          Item: {
            here_name: here_name,
            heart_time: -1 * Math.abs(hashCode(here_nick_name)), // dummy record
            here_nick_name: here_nick_name,
            kind: 'registration'
          }
        }).promise();
      }
    }

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

function hashCode(str) {
  let hash = 0;
  for (let i = 0, len = str.length; i < len; i++) {
    let chr = str.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0;
  }
  return hash;
}
