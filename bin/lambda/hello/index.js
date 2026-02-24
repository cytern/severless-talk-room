exports.handler = async function(event) {
  const response = {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type,Authorization",
      "Access-Control-Allow-Methods": "GET,OPTIONS"
    },
    body: JSON.stringify({
      timestamp: Date.now(),
      message: "hello"
    })
  };
  return response;
};
