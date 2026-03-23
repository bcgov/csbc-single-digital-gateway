import "dotenv/config";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { DbConfigSchema } from "./drizzle.config.ts";

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
  process.exit(1);
});

async function main() {
  const config = DbConfigSchema.parse(process.env);

  const pool = new pg.Pool({
    host: config.DB_HOST,
    port: config.DB_PORT,
    user: config.DB_USER,
    password: config.DB_PASS,
    database: config.DB_NAME,
    ssl: config.DB_SSL,
    max: 1,
    connectionTimeoutMillis: 10_000,
  });

  try {
    console.log(`Connecting to database at ${config.DB_HOST}:${config.DB_PORT}...`);
    const client = await pool.connect();
    client.release();
    console.log("Database connection verified.");

    const db = drizzle(pool);
    console.log("Applying migrations...");
    await migrate(db, { migrationsFolder: "./drizzle/migrations" });
    console.log("Migrations applied successfully.");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
