const AWS = require('aws-sdk');
const ddb = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME;

exports.handler = async (event) => {
  try {
    const route = event.requestContext?.routeKey;
    if (route === '$connect') return { statusCode: 200, body: 'ok' };
    if (route === '$disconnect') return { statusCode: 200, body: 'bye' };
    const body = parseBody(event.body);
    const action = body.action;
    if (action === 'register') {
      const hereName = (body.here_name || '').trim();
      const nick = (body.here_nick_name || '').trim();
      if (!hereName || !nick) return { statusCode: 400, body: 'missing fields' };
      const connectionId = event.requestContext?.connectionId;
      const key = { here_name: hereName, heart_time: 0 };
      const cur = await ddb.get({ TableName: TABLE_NAME, Key: key }).promise();
      let arr = [];
      if (cur && cur.Item && typeof cur.Item.websocket === 'string') {
        try { arr = JSON.parse(cur.Item.websocket) || []; } catch {}
      }
      let found = arr.find(x => x.nick === nick);
      if (!found) {
        arr.push({ nick, connectionId, fails: 0 });
      } else {
        found.connectionId = connectionId;
        found.fails = 0;
      }
      const putItem = { ...key, websocket: JSON.stringify(arr) };
      await ddb.put({ TableName: TABLE_NAME, Item: putItem }).promise();
      return { statusCode: 200, body: 'registered' };
    }
    if (action === 'read') {
      const hereName = (body.here_name || '').trim();
      const hart = Number(body.heart_time);
      const reader = (body.here_nick_name || '').trim();
      if (!hereName || !hart || !reader) return { statusCode: 400, body: 'missing fields' };
      const msgKey = { here_name: hereName, heart_time: hart };
      const m = await ddb.get({ TableName: TABLE_NAME, Key: msgKey }).promise();
      if (m && m.Item) {
        const readers = Array.isArray(m.Item.readers) ? m.Item.readers : [];
        if (!readers.includes(reader)) readers.push(reader);
        const read_count = readers.length;
        const updated = { ...m.Item, readers, read_count };
        await ddb.put({ TableName: TABLE_NAME, Item: updated }).promise();
        // broadcast read update
        const regKey = { here_name: hereName, heart_time: 0 };
        const cur = await ddb.get({ TableName: TABLE_NAME, Key: regKey }).promise();
        let regs = [];
        if (cur && cur.Item && typeof cur.Item.websocket === 'string') {
          try { regs = JSON.parse(cur.Item.websocket) || []; } catch {}
        }
        if (regs.length) {
          const endpoint = `https://${event.requestContext.domainName}/${event.requestContext.stage}`;
          const mgmt = new AWS.ApiGatewayManagementApi({ endpoint });
          const payload = JSON.stringify({ type: 'read', item: updated });
          for (const r of regs) {
            try { await mgmt.postToConnection({ ConnectionId: r.connectionId, Data: payload }).promise(); } catch {}
          }
        }
      }
      return { statusCode: 200, body: 'read-ok' };
    }
    if (action === 'ping') {
      return { statusCode: 200, body: 'pong' };
    }
    return { statusCode: 200, body: 'ok' };
  } catch (e) {
    console.error(e);
    return { statusCode: 500, body: 'error' };
  }
};

function parseBody(b) {
  try { return JSON.parse(b || '{}'); } catch { return {}; }
}
