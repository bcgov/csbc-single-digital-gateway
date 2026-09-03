import { test as base } from '@playwright/test';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

// Create a reusable worker-scoped connection pool
const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT),
});

// Extend Playwright base test with a custom 'db' fixture
export const test = base.extend<{ db: Pool }>({
  // eslint-disable-next-line no-empty-pattern
  db: async ({}, use) => {
    // Expose the pool to the tests
    await use(pool);
  },
});

export { expect } from '@playwright/test';
