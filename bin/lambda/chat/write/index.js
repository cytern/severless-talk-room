const AWS = require('aws-sdk');
const ddb = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME;
const WS_ENDPOINT = process.env.WS_ENDPOINT;

exports.handler = async (event) => {
  try {
    const hereNameRaw = event.headers?.hitoken;
    const hereName = safeDecode(hereNameRaw);
    if (!hereName) {
      return { statusCode: 400, headers: cors(), body: JSON.stringify({ error: 'Missing hitoken header' }) };
    }
    const body = JSON.parse(event.body || '{}');
    const now = Date.now();
    const item = {
      here_name: hereName,
      heart_time: now,
      here_nick_name: body.nick || '',
      battery: typeof body.battery === 'number' ? body.battery : null,
      lat: body.lat ?? null,
      lng: body.lng ?? null,
      msg: body.message || '',
      kind: body.kind || 'text',
      file: body.file || null,
      countdown_ts: body.countdownTs ?? null,
      readers: [],
      read_count: 0
    };
    await ddb.put({ TableName: TABLE_NAME, Item: item }).promise();
    if (WS_ENDPOINT) {
      await notifyWebsocket(hereName, item);
    }
    return { statusCode: 200, headers: cors(), body: JSON.stringify({ ok: true, ts: now }) };
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

async function notifyWebsocket(hereName, item) {
  try {
    const key = { here_name: hereName, heart_time: 0 };
    const cur = await ddb.get({ TableName: TABLE_NAME, Key: key }).promise();
    let regs = [];
    if (cur && cur.Item && typeof cur.Item.websocket === 'string') {
      try { regs = JSON.parse(cur.Item.websocket) || []; } catch {}
    } else {
      // initialize
      await ddb.put({ TableName: TABLE_NAME, Item: { ...key, websocket: '[]' } }).promise();
      return;
    }
    if (!regs.length) return;
    const mgmt = new AWS.ApiGatewayManagementApi({ endpoint: WS_ENDPOINT });
    const payload = JSON.stringify({ type: 'message', item });
    let changed = false;
    for (const r of regs) {
      try {
        await mgmt.postToConnection({ ConnectionId: r.connectionId, Data: payload }).promise();
        r.fails = 0;
      } catch (e) {
        r.fails = (r.fails || 0) + 1;
        changed = true;
      }
    }
    const filtered = regs.filter(r => (r.fails || 0) < 3);
    if (changed) {
      await ddb.put({ TableName: TABLE_NAME, Item: { ...key, websocket: JSON.stringify(filtered) } }).promise();
    }
  } catch (e) {
    console.error('notify websocket error', e);
  }
}
