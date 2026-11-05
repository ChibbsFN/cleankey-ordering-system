// Shared helpers for protecting Netlify Functions.
// Secrets live in Netlify environment variables, never in the code:
//   APP_ACCESS_CODE  - team code required to save or list orders
//   ADMIN_PASSWORD   - password for the admin product module
const crypto = require("crypto");

function safeEqual(a, b) {
  const ha = crypto.createHash("sha256").update(String(a || "")).digest();
  const hb = crypto.createHash("sha256").update(String(b || "")).digest();
  return crypto.timingSafeEqual(ha, hb);
}

function header(event, name) {
  const h = event.headers || {};
  return h[name] || h[name.toLowerCase()] || "";
}

// Returns an error response object if the request is not allowed, else null.
function requireSecret(event, envName, headerName) {
  const expected = process.env[envName];
  if (!expected) {
    return json(503, { ok: false, error: `${envName} is not configured on the server.` });
  }
  if (!safeEqual(header(event, headerName), expected)) {
    return json(401, { ok: false, error: "Unauthorized" });
  }
  return null;
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    body: JSON.stringify(body),
  };
}

module.exports = { requireSecret, json };
