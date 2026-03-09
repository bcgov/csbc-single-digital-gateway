import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import type { DbConfig } from './config.js';
import * as schema from './schema/index.js';

export function createDatabase(config: DbConfig) {
  const pool = new Pool({
    database: config.DB_NAME,
    host: config.DB_HOST,
    port: config.DB_PORT,
    user: config.DB_USER,
    password: config.DB_PASS,
    ssl: config.DB_SSL,
  });
  return drizzle(pool, { schema });
}

export type Schema = typeof schema;

export type Database = ReturnType<typeof createDatabase>;
