import { describe, expect, it } from 'vitest';
import {
  applicationReference,
  normalizeContent,
  submissionStatusLabel,
} from '../../../../../src/modules/applications/util/format';
import type { SubmissionStatus } from '../../../../../src/modules/applications/dtos/application.dtos';

describe('format utils', () => {
  describe('submissionStatusLabel', () => {
    it('should map each SubmissionStatus to its correct human-facing label', () => {
      const cases: Record<SubmissionStatus, string> = {
        draft: 'Draft',
        pending: 'Submitted',
        in_review: 'Review',
        approved: 'Approved',
        rejected: 'Rejected',
        needs_changes: 'Action needed',
        withdrawn: 'Withdrawn',
      };

      for (const [status, expected] of Object.entries(cases)) {
        expect(submissionStatusLabel(status as SubmissionStatus)).toBe(expected);
      }
    });
  });

  describe('applicationReference', () => {
    it('should format creation date and last 4 chars of submission ID into stable reference', () => {
      const createdAt = new Date('2026-07-08T11:52:11-07:00');
      // toISOString of 2026-07-08T11:52:11-07:00 is 2026-07-08T18:52:11.000Z.
      // slice(0, 10) is "2026-07-08", replaceAll('-', '') is "20260708".
      const submissionId = 'a1b2-c3d4-e5f6-7890';
      // replaceAll('-', '') is "a1b2c3d4e5f67890", slice(-4) is "7890", toUpperCase is "7890".

      const ref = applicationReference(submissionId, createdAt);
      expect(ref).toBe('20260708-7890');
    });

    it('should convert the suffix to uppercase', () => {
      const createdAt = new Date('2026-01-01T00:00:00Z');
      const submissionId = 'some-uuid-with-abcdef';

      const ref = applicationReference(submissionId, createdAt);
      // "some-uuid-with-abcdef" replaceAll('-', '') is "someuuidwithabcdef", slice(-4) is "cdef", toUpperCase is "CDEF".
      expect(ref).toBe('20260101-CDEF');
    });
  });

  describe('normalizeContent', () => {
    // Feature 217: `content` IS `{ schema, uischema }`, so there is no per-kind branch left —
    // a staged application is a `Flow` root inside `uischema`, not a different top-level object.
    it('passes a present schema and uischema through verbatim', () => {
      const content = {
        schema: { type: 'object', properties: { name: { type: 'string' } } },
        uischema: { type: 'Flow', elements: [{ type: 'Stage', elements: [] }] },
      };

      expect(normalizeContent(content)).toEqual(content);
    });

    it('defaults an empty content to an empty object schema and an empty Form', () => {
      expect(normalizeContent({})).toEqual({
        schema: { type: 'object', properties: {} },
        uischema: { type: 'Form', elements: [] },
      });
    });

    it('defaults only the half that is missing', () => {
      expect(normalizeContent({ schema: { type: 'object', properties: { a: {} } } })).toEqual({
        schema: { type: 'object', properties: { a: {} } },
        uischema: { type: 'Form', elements: [] },
      });
    });

    it('ignores keys that are neither schema nor uischema', () => {
      const result = normalizeContent({ stages: [{ id: 's1' }] });

      expect(Object.keys(result).toSorted()).toEqual(['schema', 'uischema']);
    });
  });
});
