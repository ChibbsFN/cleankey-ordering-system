// Netlify Function: list-orders
// Returns latest orders from Postgres "orders" table.
// Each row is expected to have at least: id, created_at, payload jsonb.
const { Client } = require("pg");

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.warn("DATABASE_URL not set. Returning empty history.");
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, orders: [] }),
    };
  }

  const client = new Client({ connectionString });

  try {
    await client.connect();
    const result = await client.query(
      "SELECT id, created_at, payload FROM orders ORDER BY created_at DESC LIMIT 500"
    );
    await client.end();

    const rows = result.rows.map((row) => ({
      id: row.id,
      created_at: row.created_at,
      payload: row.payload,
    }));

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true, orders: rows }),
    };
  } catch (e) {
    console.error("Failed to load orders from database", e);
    try {
      await client.end();
    } catch (_) {}
    return { statusCode: 500, body: "Error loading orders" };
  }
};
