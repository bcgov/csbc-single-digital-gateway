import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationsDir = resolve(import.meta.dirname, '../migrations');

function readMigration(predicate: (file: string) => boolean): string {
  const file = readdirSync(migrationsDir).find((f) => f.endsWith('.sql') && predicate(f));
  expect(file, 'expected a matching migration file').toBeDefined();
  return readFileSync(resolve(migrationsDir, file as string), 'utf8');
}

// Tables that carry an updated_at column and therefore need a set_updated_at trigger.
const UPDATED_AT_TABLES = [
  'users',
  'workspaces',
  'workspace_members',
  'document_types',
  'document_type_versions',
  'documents',
  'document_members',
  'document_versions',
  'document_references',
  'submissions',
  'submission_versions',
];

describe('bootstrap migration', () => {
  it('creates the citext and pgcrypto extensions', () => {
    const sql = readMigration((f) => f.includes('bootstrap'));
    expect(sql).toMatch(/CREATE EXTENSION IF NOT EXISTS\s+citext/i);
    expect(sql).toMatch(/CREATE EXTENSION IF NOT EXISTS\s+pgcrypto/i);
  });

  it('defines the nanoid id generator and the set_updated_at trigger function', () => {
    const sql = readMigration((f) => f.includes('bootstrap'));
    expect(sql).toMatch(/FUNCTION\s+nanoid_optimized/i);
    expect(sql).toMatch(/FUNCTION\s+nanoid\s*\(/i);
    expect(sql).toMatch(/FUNCTION\s+set_updated_at\s*\(/i);
  });
});

describe('triggers migration', () => {
  it('attaches a set_updated_at trigger to every table with updated_at', () => {
    // Triggers are added across multiple custom migrations (0002 + per-feature) — read all.
    const sql = readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql') && f.includes('trigger'))
      .map((f) => readFileSync(resolve(migrationsDir, f), 'utf8'))
      .join('\n');
    for (const table of UPDATED_AT_TABLES) {
      expect(sql, `missing trigger for ${table}`).toMatch(
        new RegExp(`CREATE TRIGGER[\\s\\S]*?ON\\s+"?${table}"?`, 'i'),
      );
    }
    const triggerCount = (sql.match(/EXECUTE\s+FUNCTION\s+set_updated_at/gi) ?? []).length;
    expect(triggerCount).toBeGreaterThanOrEqual(UPDATED_AT_TABLES.length);
  });
});

describe('migration journal ordering', () => {
  it('runs bootstrap first and triggers last', () => {
    const journal = JSON.parse(
      readFileSync(resolve(migrationsDir, 'meta/_journal.json'), 'utf8'),
    ) as { entries: { idx: number; tag: string }[] };

    const tags = journal.entries.toSorted((a, b) => a.idx - b.idx).map((e) => e.tag);
    const bootstrapPos = tags.findIndex((t) => t.includes('bootstrap'));
    const triggerPos = tags.findIndex((t) => t.includes('trigger'));

    expect(bootstrapPos, 'bootstrap migration must be journaled').toBeGreaterThanOrEqual(0);
    expect(triggerPos, 'triggers migration must be journaled').toBeGreaterThan(bootstrapPos);
  });
});
