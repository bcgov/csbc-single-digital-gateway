import { describe, expect, it } from 'vitest';

import { createDatabase } from '../src/client';

describe('createDatabase', () => {
  it('throws when the connection string is empty', () => {
    expect(() => createDatabase('')).toThrow();
  });

  it('throws when the connection string is whitespace only', () => {
    expect(() => createDatabase('   ')).toThrow();
  });

  it('returns a Drizzle client bound to the schema without connecting eagerly', async () => {
    // A valid URL must not open a socket — pg.Pool connects lazily on first query.
    const db = createDatabase('postgresql://user:pass@localhost:5432/sdg');

    expect(typeof db.select).toBe('function');
    expect(typeof db.insert).toBe('function');
    expect(typeof db.transaction).toBe('function');

    // Drizzle exposes the underlying pg.Pool as `$client`; close it so the test exits.
    await db.$client.end();
  });
});
