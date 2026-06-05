import pg from "pg";

const { Client } = pg;

// Set once per Worker isolate (initDb called from worker.js fetch handler).
// Falls back to process.env.DATABASE_URL for local dev (server.js).
let _connectionString;

export function initDb(env = {}) {
  _connectionString = env?.HYPERDRIVE?.connectionString ?? process.env.DATABASE_URL;
}

// Per-request Client — Hyperdrive pools the underlying Postgres connections,
// so creating a new Client per query is the correct pattern for Workers.
export async function query(sql, params = []) {
  const cs = _connectionString ?? process.env.DATABASE_URL;
  const client = new Client({ connectionString: cs });
  await client.connect();
  try {
    return await client.query(sql, params);
  } finally {
    await client.end().catch(() => {});
  }
}
