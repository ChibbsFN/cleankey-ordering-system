// Netlify Function: list-orders (Netlify Blobs version)
// Reads the order list from the Netlify Blobs store "order-history".
const { getStore, connectLambda } = require("@netlify/blobs");
const { requireSecret } = require("../lib/auth");

exports.handler = async (event) => {
  // Initialize Netlify Blobs environment for Lambda compatibility
  connectLambda(event);
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }
  // Orders contain customer names, so only the team may read them.
  const denied = requireSecret(event, "APP_ACCESS_CODE", "x-access-code");
  if (denied) return denied;

  try {
    const store = getStore("order-history");
    const existing =
      (await store.get("orders", { type: "json" })) || [];

    // existing is already an array of { id, created_at, payload }
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ok: true,
        orders: existing,
      }),
    };
  } catch (e) {
    console.error("Blobs list error", e);
    // On error, respond with ok:false so frontend can fall back to local history.
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, orders: [] }),
    };
  }
};
