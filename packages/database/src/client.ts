import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import type { PoolConfig } from 'pg';

import * as schema from './schema';

/** pg.Pool options, minus the connection string (passed as the first argument). */
export type CreateDatabaseOptions = Omit<PoolConfig, 'connectionString'>;

/**
 * Builds a Drizzle client over a node-postgres `Pool` bound to the full schema.
 *
 * Factory-only by design: no import-time singleton and no implicit `process.env` reads —
 * the caller owns the connection string and the pool lifecycle (`db.$client.end()` on
 * shutdown). The pool connects lazily, so constructing a client never opens a socket.
 */
export function createDatabase(connectionString: string, options: CreateDatabaseOptions = {}) {
  if (connectionString.trim() === '') {
    throw new Error('createDatabase: connectionString must be a non-empty PostgreSQL URL');
  }

  const pool = new Pool({ connectionString, ...options });
  return drizzle({ client: pool, schema });
}

/** The Drizzle client returned by {@link createDatabase}; `.$client` is the pg.Pool. */
export type Database = ReturnType<typeof createDatabase>;
