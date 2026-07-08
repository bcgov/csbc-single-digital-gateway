import { describe, expect, it } from 'vitest';
import {
  type CurrentAgreementRef,
  type AgreementRefSnapshot,
  planAgreementReverts,
} from '../src/modules/services/util/version-copy';

const cur = (
  refId: string,
  position: number,
  data: unknown,
  targetDocumentId = `${refId}-doc`,
): CurrentAgreementRef => ({
  refId,
  position,
  data,
  targetDocumentId,
  targetVersionId: `${refId}-ver`,
});
const prev = (position: number, data: unknown, doc: string): AgreementRefSnapshot => ({
  position,
  data,
  targetDocumentId: doc,
  targetVersionId: `${doc}-ver`,
});

describe('planAgreementReverts', () => {
  it('reverts an unchanged copy (same position, byte-identical data) to the previous version', () => {
    const data = { title: 'Terms', isOptional: false };
    const reverts = planAgreementReverts([cur('r1', 0, data)], [prev(0, { ...data }, 'prev-doc')]);
    expect(reverts).toEqual([
      {
        refId: 'r1',
        copiedDocumentId: 'r1-doc',
        previousDocumentId: 'prev-doc',
        previousVersionId: 'prev-doc-ver',
      },
    ]);
  });

  it('does NOT revert an edited copy (data differs at the same position)', () => {
    const reverts = planAgreementReverts(
      [cur('r1', 0, { title: 'Edited' })],
      [prev(0, { title: 'Original' }, 'prev-doc')],
    );
    expect(reverts).toEqual([]);
  });

  it('does NOT revert when no previous ref occupies the position', () => {
    const reverts = planAgreementReverts([cur('r1', 2, { a: 1 })], [prev(0, { a: 1 }, 'prev-doc')]);
    expect(reverts).toEqual([]);
  });

  it('reverts only the unchanged copies in a mixed set', () => {
    const shared = { title: 'Privacy', isOptional: true };
    const reverts = planAgreementReverts(
      [cur('r1', 0, { ...shared }), cur('r2', 1, { title: 'Changed' })],
      [prev(0, { ...shared }, 'p0'), prev(1, { title: 'Was' }, 'p1')],
    );
    expect(reverts.map((r) => r.refId)).toEqual(['r1']);
    expect(reverts[0]?.previousDocumentId).toBe('p0');
  });
});
