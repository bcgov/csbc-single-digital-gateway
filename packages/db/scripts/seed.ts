import "dotenv/config";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { z } from "zod";
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
import {
  getTruncateStatement,
  orgUnitFixtureSchema,
  orgUnitRelationFixtureSchema,
  parseFixture,
  serviceFixtureSchema,
  serviceTypeFixtureSchema,
  serviceTypeVersionFixtureSchema,
  serviceTypeVersionTranslationFixtureSchema,
  serviceVersionFixtureSchema,
  serviceVersionTranslationFixtureSchema,
  splitParentForTwoPass,
} from "./seed-helpers.ts";

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
  process.exit(1);
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.resolve(__dirname, "../seed/fixtures");

function readFixture<T>(filename: string, schema: z.ZodType<T>): T[] {
  const filePath = path.join(FIXTURES_DIR, filename);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Fixture not found: ${filePath}`);
  }
  const raw = fs.readFileSync(filePath, "utf8");
  const parsed: unknown = JSON.parse(raw);
  return parseFixture(parsed, schema);
}

async function main() {
  if (process.env.ALLOW_DB_SEED !== "true") {
    console.error(
      "Refusing to seed: ALLOW_DB_SEED is not 'true'. Set ALLOW_DB_SEED=true to confirm.",
    );
    process.exit(1);
  }

  const config = DbConfigSchema.parse(process.env);

  const orgUnitRows = readFixture("org_units.json", orgUnitFixtureSchema);
  const orgUnitRelationRows = readFixture(
    "org_unit_relations.json",
    orgUnitRelationFixtureSchema,
  );
  const serviceTypeRows = readFixture(
    "service_types.json",
    serviceTypeFixtureSchema,
  );
  const serviceTypeVersionRows = readFixture(
    "service_type_versions.json",
    serviceTypeVersionFixtureSchema,
  );
  const serviceTypeVersionTranslationRows = readFixture(
    "service_type_version_translations.json",
    serviceTypeVersionTranslationFixtureSchema,
  );
  const serviceRows = readFixture("services.json", serviceFixtureSchema);
  const serviceVersionRows = readFixture(
    "service_versions.json",
    serviceVersionFixtureSchema,
  );
  const serviceVersionTranslationRows = readFixture(
    "service_version_translations.json",
    serviceVersionTranslationFixtureSchema,
  );

  const {
    firstPass: serviceTypesFirstPass,
    pointerUpdates: serviceTypePointerUpdates,
  } = splitParentForTwoPass(serviceTypeRows, "publishedServiceTypeVersionId");

  const {
    firstPass: servicesFirstPass,
    pointerUpdates: servicePointerUpdates,
  } = splitParentForTwoPass(serviceRows, "publishedServiceVersionId");

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
      `Connecting to target database at ${config.DB_HOST}:${config.DB_PORT}...`,
    );
    const client = await pool.connect();
    client.release();
    console.log("Connection verified.");

    const db = drizzle(pool, { casing: "snake_case" });

    const counts: Record<string, number> = {};

    await db.transaction(async (tx) => {
      console.log("Truncating tables...");
      await tx.execute(sql.raw(getTruncateStatement()));

      if (orgUnitRows.length > 0) {
        await tx.insert(orgUnits).values(orgUnitRows);
      }
      counts.org_units = orgUnitRows.length;

      if (orgUnitRelationRows.length > 0) {
        await tx.insert(orgUnitRelations).values(orgUnitRelationRows);
      }
      counts.org_unit_relations = orgUnitRelationRows.length;

      if (serviceTypesFirstPass.length > 0) {
        await tx.insert(serviceTypes).values(serviceTypesFirstPass);
      }
      counts.service_types = serviceTypesFirstPass.length;

      if (serviceTypeVersionRows.length > 0) {
        await tx.insert(serviceTypeVersions).values(serviceTypeVersionRows);
      }
      counts.service_type_versions = serviceTypeVersionRows.length;

      if (serviceTypeVersionTranslationRows.length > 0) {
        await tx
          .insert(serviceTypeVersionTranslations)
          .values(serviceTypeVersionTranslationRows);
      }
      counts.service_type_version_translations =
        serviceTypeVersionTranslationRows.length;

      if (servicesFirstPass.length > 0) {
        await tx.insert(services).values(servicesFirstPass);
      }
      counts.services = servicesFirstPass.length;

      if (serviceVersionRows.length > 0) {
        await tx.insert(serviceVersions).values(serviceVersionRows);
      }
      counts.service_versions = serviceVersionRows.length;

      if (serviceVersionTranslationRows.length > 0) {
        await tx
          .insert(serviceVersionTranslations)
          .values(serviceVersionTranslationRows);
      }
      counts.service_version_translations =
        serviceVersionTranslationRows.length;

      for (const { id, pointerId } of serviceTypePointerUpdates) {
        await tx
          .update(serviceTypes)
          .set({ publishedServiceTypeVersionId: pointerId })
          .where(eq(serviceTypes.id, id));
      }

      for (const { id, pointerId } of servicePointerUpdates) {
        await tx
          .update(services)
          .set({ publishedServiceVersionId: pointerId })
          .where(eq(services.id, id));
      }
    });

    console.log("Seed complete. Row counts:");
    for (const [table, count] of Object.entries(counts)) {
      console.log(`  ${table}: ${count}`);
    }
  } catch (error) {
    console.error("Seed failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
