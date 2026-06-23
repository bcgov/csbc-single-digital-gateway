import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getTableConfig, PgTable } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';

import { userRole, users } from '../src/schema';

const cfg = (table: unknown) => getTableConfig(table as PgTable);

describe('user_role enum', () => {
  it('has the gateway global roles', () => {
    expect(userRole.enumValues).toEqual(['admin', 'staff', 'citizen']);
  });
});

describe('users.roles column', () => {
  it('is a NOT NULL user_role array with a default', () => {
    const roles = cfg(users).columns.find((c) => c.name === 'roles');
    expect(roles, 'users.roles must exist').toBeDefined();
    expect(roles?.notNull).toBe(true);
    expect(roles?.hasDefault).toBe(true);
    expect(roles?.getSQLType()).toContain('user_role');
  });
});

describe('user roles migration', () => {
  const dir = resolve(import.meta.dirname, '../migrations');

  it('creates the user_role type and adds users.roles', () => {
    const file = readdirSync(dir).find((f) => f.includes('user_roles') && f.endsWith('.sql'));
    expect(file, 'expected a *user_roles*.sql migration').toBeDefined();
    const sql = readFileSync(resolve(dir, file as string), 'utf8');
    expect(sql).toMatch(/CREATE TYPE "public"\."user_role"/i);
    expect(sql).toMatch(/ALTER TABLE "users" ADD COLUMN "roles"/i);
  });
});
