// Netlify Function: verify-admin
// Checks the admin password against the ADMIN_PASSWORD environment variable,
// so the password is never shipped to the browser.
const { requireSecret, json } = require("../lib/auth");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }
  const denied = requireSecret(event, "ADMIN_PASSWORD", "x-admin-password");
  if (denied) return denied;
  return json(200, { ok: true });
};
