import { describe, expect, it } from 'vitest';
import {
  submissionStatusLabel,
  submissionReference,
  normalizeContent,
} from '../../../../../src/modules/submissions/util/format';
import type { SubmissionStatus } from '../../../../../src/modules/submissions/dtos/submission.dtos';

describe('format utility tests', () => {
  describe('submissionStatusLabel', () => {
    it('returns correct label for every status', () => {
      const cases: Record<SubmissionStatus, string> = {
        draft: 'Draft',
        pending: 'Pending',
        in_review: 'In review',
        approved: 'Approved',
        rejected: 'Rejected',
        needs_changes: 'Needs changes',
        withdrawn: 'Withdrawn',
      };
      for (const [status, label] of Object.entries(cases)) {
        expect(submissionStatusLabel(status as SubmissionStatus)).toBe(label);
      }
    });
  });

  describe('submissionReference', () => {
    it('constructs a stable reference string YYYYMMDD-XXXX from a UUID and a Date', () => {
      const submissionId = 'e6005cbb-84f9-467a-bb48-e8cbffc9c991';
      const createdAt = new Date('2026-07-12T12:00:00.000Z');

      const ref = submissionReference(submissionId, createdAt);

      // 2026-07-12 becomes 20260712
      // e8cbffc9c991 ends with c991, which becomes uppercase C991
      expect(ref).toBe('20260712-C991');
    });
  });

  describe('normalizeContent', () => {
    // Feature 217: `content` IS `{ schema, uischema }`, so there is no per-kind branch any more —
    // a multi-stage form is a `Flow` root inside `uischema`, not a different top-level object.
    it("returns the content's schema and uischema unchanged", () => {
      const input = {
        schema: { type: 'object', properties: { field: { type: 'string' } } },
        uischema: { type: 'Form', elements: [{ type: 'Control', scope: '#/properties/field' }] },
      };

      expect(normalizeContent(input)).toEqual(input);
    });

    it('defaults an empty content to an empty object schema and an empty Form', () => {
      expect(normalizeContent({})).toEqual({
        schema: { type: 'object', properties: {} },
        uischema: { type: 'Form', elements: [] },
      });
    });

    it('keeps a Flow root as-is rather than coercing it', () => {
      const input = { schema: {}, uischema: { type: 'Flow', elements: [] } };

      expect(normalizeContent(input).uischema).toEqual({ type: 'Flow', elements: [] });
    });

    it('ignores keys that are not schema or uischema', () => {
      const result = normalizeContent({ schema: { type: 'object' }, stages: [{ id: 's1' }] });

      expect(Object.keys(result).toSorted()).toEqual(['schema', 'uischema']);
    });
  });
});
