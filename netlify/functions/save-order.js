// Netlify Function: save-order (Netlify Blobs version)
// Stores each order in a Netlify Blobs store called "order-history".
// The data model is a single JSON array under key "orders".
const { getStore, connectLambda } = require("@netlify/blobs");
const crypto = require("crypto");
const { requireSecret } = require("../lib/auth");

const MAX_BODY_BYTES = 50 * 1024; // generous for one order
const MAX_ORDERS = 2000; // stop the store growing forever

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
  const denied = requireSecret(event, "APP_ACCESS_CODE", "x-access-code");
  if (denied) return denied;
  if (Buffer.byteLength(event.body || "", "utf8") > MAX_BODY_BYTES) {
    return { statusCode: 413, body: "Order too large" };
  }

  let order;
  try {
    order = JSON.parse(event.body || "{}");
  } catch (_e) {
    return { statusCode: 400, body: "Invalid JSON" };
  }
  if (!order || typeof order !== "object" || Array.isArray(order)) {
    return { statusCode: 400, body: "Invalid order" };
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
    if (existing.length > MAX_ORDERS) existing.length = MAX_ORDERS;

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
