import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { AppConfigSchema } from 'src/common/dtos/app-config.dto';
import * as schema from './schema';

const parsed = AppConfigSchema.parse(process.env);

const pool = new Pool({
  database: parsed.DEFAULT_DB_NAME,
  host: parsed.DEFAULT_DB_HOST,
  port: parsed.DEFAULT_DB_PORT,
  user: parsed.DEFAULT_DB_USER,
  password: parsed.DEFAULT_DB_PASS,
  ssl: parsed.DEFAULT_DB_SSL,
});

export const defaultDb = drizzle(pool, { schema });

export type DefaultSchema = typeof schema;
