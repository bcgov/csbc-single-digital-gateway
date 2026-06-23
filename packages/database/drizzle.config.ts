import { resolve } from 'node:path';
import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

// drizzle-kit `migrate` needs DATABASE_URL; `generate` does not. drizzle-kit loads this
// config from the package dir (the npm `db:*` scripts set cwd here), so anchor on cwd to
// reach the repo-root .env. (import.meta.dirname is undefined under drizzle-kit's loader.)
config({ path: resolve(process.cwd(), '../../.env') });

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema/index.ts',
  out: './migrations',
  dbCredentials: { url: process.env.DATABASE_URL ?? '' },
  strict: true,
  verbose: true,
});
