// Netlify Function: save-order (Netlify Blobs version)
// Stores each order in a Netlify Blobs store called "order-history".
// The data model is a single JSON array under key "orders".
const { getStore, connectLambda } = require("@netlify/blobs");
const crypto = require("crypto");

function generateId() {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

exports.handler = async (event) => {
  // Initialize Netlify Blobs environment for Lambda compatibility
  connectLambda(event);
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let order;
  try {
    order = JSON.parse(event.body || "{}");
  } catch (_e) {
    return { statusCode: 400, body: "Invalid JSON" };
  }

  try {
    const store = getStore("order-history");

    // Load existing orders (if none, default to [])
    const existing =
      (await store.get("orders", { type: "json" })) || [];

    const createdAt = new Date().toISOString();
    const id = generateId();

    const row = {
      id,
      created_at: createdAt,
      payload: order,
    };

    // Newest first
    existing.unshift(row);

    // Persist back to blobs
    await store.setJSON("orders", existing);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ok: true,
        id,
        createdAt,
      }),
    };
  } catch (e) {
    console.error("Blobs save error", e);
    return { statusCode: 500, body: "Error saving order" };
  }
};
