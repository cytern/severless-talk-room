exports.handler = async (event) => {
  let body = {};
  try {
    if (event && event.body) {
      body = JSON.parse(event.body);
    }
  } catch (e) {
    console.error('JSON parse error:', e);
  }
  console.log('Location payload:', body);
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type,Authorization",
      "Access-Control-Allow-Methods": "POST,OPTIONS"
    },
    body: JSON.stringify({ ok: true, received: body, ts: Date.now() })
  };
};
