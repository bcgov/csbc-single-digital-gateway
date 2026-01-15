import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';
import { AppConfigSchema } from '../../src/common/dtos/app-config.dto';

const parsed = AppConfigSchema.parse(process.env);

export default defineConfig({
  dialect: 'postgresql',
  out: './drizzle/default/migrations',
  schema: './src/database/default/schema',
  dbCredentials: {
    database: parsed.DEFAULT_DB_NAME,
    host: parsed.DEFAULT_DB_HOST,
    port: parsed.DEFAULT_DB_PORT,
    user: parsed.DEFAULT_DB_USER,
    password: parsed.DEFAULT_DB_PASS,
    ssl: parsed.DEFAULT_DB_SSL,
  },
});
