import { describe, expect, it } from 'vitest';
import {
  applicationReference,
  normalizeFormStructure,
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

  describe('normalizeFormStructure', () => {
    describe('multi-stage-form kind', () => {
      it('should return valid structure with fields preserved when they are of correct types', () => {
        const structure = {
          name: 'My Form',
          description: 'A test form',
          stages: [{ id: 'stage-1' }],
          edges: [{ from: 'stage-1', to: 'stage-2' }],
        };

        const result = normalizeFormStructure('multi-stage-form', structure);
        expect(result).toEqual({
          name: 'My Form',
          description: 'A test form',
          stages: [{ id: 'stage-1' }],
          edges: [{ from: 'stage-1', to: 'stage-2' }],
        });
      });

      it('should default missing or incorrectly typed fields to empty strings/arrays', () => {
        const structure = {
          name: 123, // wrong type
          description: null, // wrong type
          stages: 'not-an-array', // wrong type
          edges: {}, // wrong type
        } as any;

        const result = normalizeFormStructure('multi-stage-form', structure);
        expect(result).toEqual({
          name: '',
          description: '',
          stages: [],
          edges: [],
        });
      });
    });

    describe('other kinds (e.g., basic-form)', () => {
      it('should preserve custom schema and uischema if they exist', () => {
        const structure = {
          schema: { type: 'object', properties: { test: { type: 'string' } } },
          uischema: { type: 'VerticalLayout', elements: [{ type: 'Control' }] },
        };

        const result = normalizeFormStructure('basic-form', structure);
        expect(result).toEqual({
          schema: { type: 'object', properties: { test: { type: 'string' } } },
          uischema: { type: 'VerticalLayout', elements: [{ type: 'Control' }] },
        });
      });

      it('should return default schema and uischema if they are missing', () => {
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
