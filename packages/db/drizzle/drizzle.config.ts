import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';
import { DbConfigSchema } from '../src/config.js';

const parsed = DbConfigSchema.parse(process.env);

export default defineConfig({
  dialect: 'postgresql',
  out: './drizzle/migrations',
  schema: './src/schema',
  dbCredentials: {
    database: parsed.DB_NAME,
    host: parsed.DB_HOST,
    port: parsed.DB_PORT,
    user: parsed.DB_USER,
    password: parsed.DB_PASS,
    ssl: parsed.DB_SSL,
  },
});
