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
// Feature 217 dropped document_types, document_type_versions and document_references; their
// triggers went with them (a trigger is owned by its table). `documents`, `document_members` and
// `document_versions` survive the rewrite as ALTERed tables, so they KEEP the triggers 0002
// attached — migration 0022 deliberately creates none.
const UPDATED_AT_TABLES = [
  'users',
  'workspaces',
  'workspace_members',
  'documents',
  'document_members',
  'document_versions',
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

describe('documents rewrite migration (feature 217)', () => {
  const sql = () => readMigration((f) => f.includes('documents_rewrite'));

  it('drops the type catalog and the reference tables', () => {
    for (const table of [
      'document_type_versions',
      'document_types',
      'document_references',
      'document_version_contributors',
    ]) {
      expect(sql(), `expected ${table} to be dropped`).toMatch(
        new RegExp(`DROP TABLE "${table}"`, 'i'),
      );
    }
  });

  it('re-creates the one-published partial index the status rebuild destroys', () => {
    // drizzle drops and re-adds document_versions.status, which takes this dependent index with
    // it and never restores it. Without the hand-added line there is nothing enforcing "at most
    // one published version per document" — and no test would notice.
    expect(sql()).toMatch(/CREATE UNIQUE INDEX "document_versions_one_published_key"/i);
  });

  it('creates document_version_history with the explicitly named version FK', () => {
    expect(sql()).toMatch(/CREATE TABLE "document_version_history"/i);
    expect(sql()).toMatch(/ADD CONSTRAINT "document_version_history_version_fk"/i);
  });
});

describe('migration identifiers', () => {
  it('never declares an identifier longer than Postgres truncates at (63 characters)', () => {
    // A longer name is silently truncated, so two constraints can collide or a later
    // DROP CONSTRAINT by the intended name fails. This is why document_version_history names its
    // version FK explicitly (drizzle's default would be 68 characters).
    //
    // One historical offender is allowed: 0001 declared a 73-character FK on
    // document_version_contributors, which Postgres truncated. The table is dropped in 0022, so
    // the truncated name is gone from the live schema — and an applied migration must never be
    // rewritten, so it is recorded here rather than fixed.
    const KNOWN_TRUNCATED = new Set([
      'document_version_contributors_document_version_id_document_versions_id_fk',
    ]);
    const offenders: string[] = [];
    for (const file of readdirSync(migrationsDir).filter((f) => f.endsWith('.sql'))) {
      const sql = readFileSync(resolve(migrationsDir, file), 'utf8');
      for (const [, name] of sql.matchAll(
        /(?:ADD CONSTRAINT|CREATE (?:UNIQUE )?INDEX(?: IF NOT EXISTS)?|CREATE TABLE|CONSTRAINT)\s+"([^"]+)"/gi,
      )) {
        if (name.length > 63 && !KNOWN_TRUNCATED.has(name))
          offenders.push(`${file}: ${name} (${String(name.length)})`);
      }
    }
    expect(offenders).toEqual([]);
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
