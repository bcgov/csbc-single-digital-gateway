import { getTableConfig, PgTable } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';

import * as schema from '../src/schema';

const cfg = (table: unknown) => getTableConfig(table as PgTable);
const colNames = (table: unknown) => new Set(cfg(table).columns.map((c) => c.name));

describe('submissions — container (versioning split)', () => {
  it('keeps the stable reference columns', () => {
    const cols = colNames(schema.submissions);
    for (const c of [
      'id',
      'document_id',
      'document_version_id',
      'user_id',
      'workspace_id',
      'created_at',
      'updated_at',
    ]) {
      expect(cols, `submissions.${c}`).toContain(c);
    }
  });

  it('no longer carries data / status / submitted_at (moved to submission_versions)', () => {
    const cols = colNames(schema.submissions);
    expect(cols).not.toContain('data');
    expect(cols).not.toContain('status');
    expect(cols).not.toContain('submitted_at');
  });

  it('declares a composite UNIQUE (id, workspace_id) to back the versions FK', () => {
    const composite = cfg(schema.submissions).uniqueConstraints.find((u) => u.columns.length === 2);
    expect(composite, 'expected a 2-column unique constraint').toBeDefined();
    const names = composite?.columns.map((c) => c.name) ?? [];
    expect(names).toContain('id');
    expect(names).toContain('workspace_id');
  });
});

describe('submission_versions — data + writable workflow status', () => {
  it('exists and carries the version/data/status columns', () => {
    expect(schema.submissionVersions, 'schema.submissionVersions must be exported').toBeDefined();
    const cols = colNames(schema.submissionVersions);
    for (const c of [
      'id',
      'submission_id',
      'workspace_id',
      'version',
      'data',
      'status',
      'submitted_at',
      'withdrawn_at',
      'created_at',
      'updated_at',
    ]) {
      expect(cols, `submission_versions.${c}`).toContain(c);
    }
  });

  it('status is a WRITABLE column (state machine), not a generated column', () => {
    const status = cfg(schema.submissionVersions).columns.find((c) => c.name === 'status');
    expect(status).toBeDefined();
    expect(status?.generated, 'status must NOT be generated').toBeFalsy();
    expect(status?.notNull).toBe(true);
  });

  it('enumerates the full review-workflow status set', () => {
    expect([...schema.submissionVersionsStatus.enumValues].toSorted()).toEqual(
      [
        'approved',
        'draft',
        'in_review',
        'needs_changes',
        'pending',
        'rejected',
        'withdrawn',
      ].toSorted(),
    );
  });

  it('has a composite FK to submissions and a unique (submission_id, version)', () => {
    const composite = cfg(schema.submissionVersions).foreignKeys.filter(
      (fk) => fk.reference().columns.length >= 2,
    );
    expect(composite.length, 'expected a composite FK to submissions').toBeGreaterThanOrEqual(1);

    const versionUnique = cfg(schema.submissionVersions)
      .uniqueConstraints.concat(
        cfg(schema.submissionVersions)
          .indexes.filter((i) => i.config.unique)
          .map((i) => ({
            columns: i.config.columns,
          })) as never[],
      )
      .some((u) => {
        const names = new Set((u.columns as { name?: string }[]).map((c) => c.name));
        return names.has('submission_id') && names.has('version');
      });
    expect(versionUnique, 'expected unique (submission_id, version)').toBe(true);
  });

  it('enforces at most one approved version via a partial unique index', () => {
    const partial = cfg(schema.submissionVersions).indexes.find(
      (idx) =>
        idx.config.unique === true &&
        idx.config.where !== undefined &&
        idx.config.columns.some(
          (c) => 'name' in c && (c as { name?: string }).name === 'submission_id',
        ),
    );
    expect(partial, 'expected partial unique on submission_id WHERE approved').toBeDefined();
  });
});
