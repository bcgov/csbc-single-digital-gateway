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
    // Doc 275: `content` IS `{ schema, variants }`, so there is no per-kind branch any more —
    // a routed application is a `Funnel` root inside each variant, not a different top-level object.
    it("returns the content's schema and variants unchanged", () => {
      const input = {
        schema: { type: 'object', properties: { field: { type: 'string' } } },
        variants: {
          default: { type: 'Form', elements: [{ type: 'Control', scope: '#/properties/field' }] },
          mobile: { type: 'Form', elements: [] },
        },
      };

      expect(normalizeContent(input)).toEqual(input);
    });

    it('defaults an empty content to an empty object schema and an empty Form', () => {
      expect(normalizeContent({})).toEqual({
        schema: { type: 'object', properties: {} },
        variants: { default: { type: 'Form', elements: [] } },
      });
    });

    it('degrades the old top-level uischema shape to an empty Form rather than throwing', () => {
      expect(
        normalizeContent({ schema: { type: 'object' }, uischema: { type: 'Form', elements: [] } }),
      ).toEqual({
        schema: { type: 'object', properties: {} },
        variants: { default: { type: 'Form', elements: [] } },
      });
    });

    it('keeps a Funnel root as-is rather than coercing it', () => {
      const input = { schema: {}, variants: { default: { type: 'Funnel', elements: [] } } };

      expect(normalizeContent(input)['variants']).toEqual({
        default: { type: 'Funnel', elements: [] },
      });
    });

    it('ignores keys that are not schema or variants', () => {
      const result = normalizeContent({ schema: { type: 'object' }, stages: [{ id: 's1' }] });

      expect(Object.keys(result).toSorted()).toEqual(['schema', 'variants']);
    });
  });
});
