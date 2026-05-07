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

async function run() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const files = (await fs.readdir(migrationsDir))
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const sql = await fs.readFile(path.join(migrationsDir, file), "utf8");
    console.log(`Running migration: ${file}`);
    await pool.query(sql);
  }

  await pool.end();
  console.log("Migrations complete.");
}

run().catch((err) => {
  console.error("Migration failed", err);
  process.exit(1);
});
