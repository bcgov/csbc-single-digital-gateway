import { describe, expect, it } from 'vitest';
import {
  submissionStatusLabel,
  submissionReference,
  normalizeFormStructure,
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

  describe('normalizeFormStructure', () => {
    describe('multi-stage-form', () => {
      it('returns valid values if they exist in structure', () => {
        const input = {
          name: 'My Multi Form',
          description: 'A desc',
          stages: [{ id: 's1' }],
          edges: [{ id: 'e1' }],
        };
        const result = normalizeFormStructure('multi-stage-form', input);
        expect(result).toEqual(input);
      });

      it('defaults missing or invalid types to empty strings or arrays', () => {
        const input = {
          name: 123, // invalid
          description: null, // invalid
          stages: 'not-an-array', // invalid
        };
        const result = normalizeFormStructure('multi-stage-form', input as any);
        expect(result).toEqual({
          name: '',
          description: '',
          stages: [],
          edges: [],
        });
      });
    });

    describe('basic-form and other kinds', () => {
      it('returns existing schema and uischema', () => {
        const input = {
          schema: { type: 'object', properties: { field: { type: 'string' } } },
          uischema: { type: 'Horizontal' },
        };
        const result = normalizeFormStructure('basic-form', input);
        expect(result).toEqual(input);
      });

      it('defaults schema and uischema if missing', () => {
        const result = normalizeFormStructure('basic-form', {});
        expect(result).toEqual({
          schema: {
            type: 'object',
            properties: {},
          },
          uischema: {
            type: 'VerticalLayout',
            elements: [],
          },
        });
      });
    });
  });
});
