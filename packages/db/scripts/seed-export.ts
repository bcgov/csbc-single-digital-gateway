import "dotenv/config";
import { asc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { DbConfigSchema } from "../drizzle/drizzle.config.ts";
import {
  orgUnitRelations,
  orgUnits,
  services,
  serviceTypes,
  serviceTypeVersionTranslations,
  serviceTypeVersions,
  serviceVersionTranslations,
  serviceVersions,
} from "../src/schema/index.ts";

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
  process.exit(1);
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.resolve(__dirname, "../seed/fixtures");

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
    console.log(
      `Connecting to source database at ${config.DB_HOST}:${config.DB_PORT}...`,
    );
    const client = await pool.connect();
    client.release();
    console.log("Connection verified.");

    const db = drizzle(pool, { casing: "snake_case" });

    fs.mkdirSync(FIXTURES_DIR, { recursive: true });

    const exports: Array<{
      file: string;
      rows: unknown[];
    }> = [
      {
        file: "org_units.json",
        rows: await db.select().from(orgUnits).orderBy(asc(orgUnits.createdAt)),
      },
      {
        file: "org_unit_relations.json",
        rows: await db
          .select()
          .from(orgUnitRelations)
          .orderBy(asc(orgUnitRelations.createdAt)),
      },
      {
        file: "service_types.json",
        rows: await db
          .select()
          .from(serviceTypes)
          .orderBy(asc(serviceTypes.createdAt)),
      },
      {
        file: "service_type_versions.json",
        rows: await db
          .select()
          .from(serviceTypeVersions)
          .orderBy(asc(serviceTypeVersions.createdAt)),
      },
      {
        file: "service_type_version_translations.json",
        rows: await db
          .select()
          .from(serviceTypeVersionTranslations)
          .orderBy(asc(serviceTypeVersionTranslations.createdAt)),
      },
      {
        file: "services.json",
        rows: await db.select().from(services).orderBy(asc(services.createdAt)),
      },
      {
        file: "service_versions.json",
        rows: await db
          .select()
          .from(serviceVersions)
          .orderBy(asc(serviceVersions.createdAt)),
      },
      {
        file: "service_version_translations.json",
        rows: await db
          .select()
          .from(serviceVersionTranslations)
          .orderBy(asc(serviceVersionTranslations.createdAt)),
      },
    ];

    for (const { file, rows } of exports) {
      const target = path.join(FIXTURES_DIR, file);
      fs.writeFileSync(target, JSON.stringify(rows, null, 2) + "\n", "utf8");
      console.log(`  ${file}: ${rows.length} rows`);
    }

    console.log(`Wrote ${exports.length} fixtures to ${FIXTURES_DIR}.`);
  } catch (error) {
    console.error("Seed export failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
