import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.resolve(__dirname, "../../../infra/db/migrations");
const MAX_RETRIES = Number(process.env.MIGRATION_MAX_RETRIES || 12);
const RETRY_DELAY_MS = Number(process.env.MIGRATION_RETRY_DELAY_MS || 2500);

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableError(err) {
  const retryableCodes = new Set([
    "ECONNRESET",
    "ECONNREFUSED",
    "ETIMEDOUT",
    "57P03", // cannot_connect_now
    "53300" // too_many_connections
  ]);

  return retryableCodes.has(err?.code);
}

async function run() {
  const files = (await fs.readdir(migrationsDir)).filter((file) => file.endsWith(".sql")).sort();

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    try {
      for (const file of files) {
        const sql = await fs.readFile(path.join(migrationsDir, file), "utf8");
        console.log(`Running migration: ${file}`);
        await pool.query(sql);
      }

      await pool.end();
      console.log("Migrations complete.");
      return;
    } catch (err) {
      await pool.end().catch(() => {});

      const shouldRetry = attempt < MAX_RETRIES && isRetryableError(err);
      if (!shouldRetry) {
        throw err;
      }

      console.warn(
        `Database not ready yet (${err.code}). Retrying migration in ${RETRY_DELAY_MS}ms (${attempt}/${MAX_RETRIES})...`
      );
      await wait(RETRY_DELAY_MS);
    }
  }
}

run().catch((err) => {
  console.error("Migration failed", err);
  process.exit(1);
});
