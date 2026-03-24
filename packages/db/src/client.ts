import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema/index.ts";

export function createDatabase({
  DB_NAME,
  DB_HOST,
  DB_PORT,
  DB_USER,
  DB_PASS,
  DB_SSL,
}: {
  DB_NAME: string;
  DB_HOST: string;
  DB_PORT: number;
  DB_USER: string;
  DB_PASS: string;
  DB_SSL: boolean;
}) {
  const pool = new Pool({
    database: DB_NAME,
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASS,
    ssl: DB_SSL,
  });
  return drizzle(pool, { casing: "snake_case", schema });
}

export type Schema = typeof schema;

export type Database = ReturnType<typeof createDatabase>;
