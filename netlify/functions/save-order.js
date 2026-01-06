// Netlify Function: save-order
// Persists a single order into a Postgres table "orders" with columns:
// id (serial/bigserial), created_at timestamptz default now(), payload jsonb.
const { Client } = require("pg");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let order;
  try {
    order = JSON.parse(event.body || "{}");
  } catch (e) {
    return { statusCode: 400, body: "Invalid JSON" };
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.warn("DATABASE_URL not set. Skipping server-side save.");
    // Frontend will fall back to local history. Indicate ok:false but no error.
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, reason: "no_database_url" }),
    };
  }

  const client = new Client({ connectionString });

  try {
    await client.connect();
    const result = await client.query(
      "INSERT INTO orders (payload) VALUES ($1) RETURNING id, created_at",
      [order]
    );
    await client.end();

    const row = result.rows[0];

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ok: true,
        id: row.id,
        createdAt: row.created_at,
      }),
    };
  } catch (e) {
    console.error("Failed to save order to database", e);
    try {
      await client.end();
    } catch (_) {}
    return { statusCode: 500, body: "Error saving order" };
  }
};
