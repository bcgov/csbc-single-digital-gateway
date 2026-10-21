import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { type SQL } from 'drizzle-orm';
import { getTableConfig, PgDialect, type PgTable } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';

import * as schema from '../src/schema';

// Doc 226 — namespaced document types.
const migrationsDir = resolve(import.meta.dirname, '../migrations');
const migration0023 = (): string => {
  const file = readdirSync(migrationsDir).find((f) => f.startsWith('0023_') && f.endsWith('.sql'));
  expect(file, 'migration 0023 must exist').toBeDefined();
  return readFileSync(resolve(migrationsDir, file as string), 'utf8');
};

describe('document type namespacing (doc 226)', () => {
  it('declares exactly the three services.* enum values', () => {
    expect(schema.documentType.enumValues).toEqual([
      'services.service',
      'services.service-application-method',
      'services.service-agreement',
    ]);
  });

  it('exports a frozen DOCUMENT_TYPE map and DOCUMENT_TYPES list from the enum', () => {
    expect(schema.DOCUMENT_TYPE).toEqual({
      service: 'services.service',
      applicationMethod: 'services.service-application-method',
      serviceAgreement: 'services.service-agreement',
    });
    expect(Object.isFrozen(schema.DOCUMENT_TYPE)).toBe(true);
    expect(schema.DOCUMENT_TYPES).toEqual(schema.documentType.enumValues);
    expect(Object.isFrozen(schema.DOCUMENT_TYPES)).toBe(true);
  });

  it('writes the generated agreement_type with the new literal', () => {
    const column = getTableConfig(schema.workspaceDefaultAgreements as PgTable).columns.find(
      (c) => c.name === 'agreement_type',
    );
    const expression = column?.generated?.as as SQL | undefined;
    expect(expression, 'agreement_type must be GENERATED').toBeDefined();
    const { sql } = new PgDialect().sqlToQuery(expression as SQL);
    expect(sql).toBe("'services.service-agreement'::document_type");
  });

  it('migration 0023 RENAMEs each value in place and never drops the type', () => {
    const sql = migration0023();
    for (const [from, to] of [
      ['service', 'services.service'],
      ['application-method', 'services.service-application-method'],
      ['service-agreement', 'services.service-agreement'],
    ]) {
      expect(sql).toContain(
        `ALTER TYPE "public"."document_type" RENAME VALUE '${from}' TO '${to}';`,
      );
    }
    // drizzle-kit's own diff drops and re-creates the enum, which cannot map existing rows. The
    // header comment explains exactly that, so only the statements are checked.
    const statements = sql
      .split('\n')
      .filter((line) => !line.trimStart().startsWith('--'))
      .join('\n');
    expect(statements).not.toMatch(/DROP TYPE/i);
    expect(statements).not.toMatch(/CREATE TYPE/i);
    expect(statements).not.toMatch(/SET DATA TYPE/i);
  });
});
