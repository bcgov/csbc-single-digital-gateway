import { getTableConfig, PgTable } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';

import * as schema from '../src/schema';

const cfg = (table: unknown) => getTableConfig(table as PgTable);

describe('reviews — append-only audit of review decisions', () => {
  it('is exported and carries the expected columns', () => {
    expect(schema.reviews, 'schema.reviews must be exported').toBeDefined();
    const cols = new Set(cfg(schema.reviews).columns.map((c) => c.name));
    for (const c of [
      'id',
      'submission_version_id',
      'submission_id',
      'workspace_id',
      'reviewer_id',
      'decision',
      'reason',
      'metadata',
      'created_at',
    ]) {
      expect(cols, `reviews.${c}`).toContain(c);
    }
  });

  it('is immutable — no updated_at column', () => {
    const cols = new Set(cfg(schema.reviews).columns.map((c) => c.name));
    expect(cols).not.toContain('updated_at');
  });

  it('enumerates the review decisions', () => {
    expect([...schema.reviewsDecision.enumValues].toSorted()).toEqual(
      ['approved', 'escalated', 'flagged', 'needs_changes', 'no_action', 'rejected'].toSorted(),
    );
  });

  it('reason is nullable; metadata is NOT NULL with a default', () => {
    const byName = new Map(cfg(schema.reviews).columns.map((c) => [c.name, c]));
    expect(byName.get('reason')?.notNull).toBe(false);
    expect(byName.get('metadata')?.notNull).toBe(true);
    expect(byName.get('metadata')?.hasDefault).toBe(true);
  });

  it('binds the reviewed version + submission with composite FKs', () => {
    const composite = cfg(schema.reviews).foreignKeys.filter(
      (fk) => fk.reference().columns.length >= 2,
    );
    expect(
      composite.length,
      'expected composite FKs to submission_versions and submissions',
    ).toBeGreaterThanOrEqual(2);
  });

  it('anchors reviewer_id to users with ON DELETE RESTRICT (audit survives removal)', () => {
    const reviewerFk = cfg(schema.reviews).foreignKeys.find((fk) => {
      const cols = fk.reference().columns.map((c) => c.name);
      return cols.length === 1 && cols[0] === 'reviewer_id';
    });
    expect(reviewerFk, 'expected a single-column reviewer_id FK').toBeDefined();
    expect(reviewerFk?.onDelete).toBe('restrict');
  });
});
