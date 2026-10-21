import { documentLinks as linksTable } from '@repo/database';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { rebuildLinksTx } from '../../../../../src/modules/services/util/document-links';

const M1 = '11111111-1111-4111-8111-111111111111';
const S1 = '33333333-3333-4333-8333-333333333333';
const GONE = '44444444-4444-4444-8444-444444444444';

const ref = (key: string, documentType: string) => ({
  type: 'Control',
  scope: `#/properties/${key}`,
  options: { component: 'document-reference', documentType },
});
const version = (data?: Record<string, unknown>) => ({
  id: 'sv-1',
  documentId: 'service-1',
  content: {
    schema: { type: 'object', properties: {} },
    variants: {
      default: {
        type: 'Form',
        elements: [
          ref('methods', 'services.service-application-method'),
          ref('related', 'services.service'),
        ],
      },
    },
    ...(data !== undefined && { data }),
  },
});

// Doc 290.
describe('rebuildLinksTx (doc 290 rules 2-3)', () => {
  let tx: any;
  let existing: { id: string }[];

  beforeEach(() => {
    existing = [];
    tx = {
      delete: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue(undefined),
      select: vi.fn(() => ({
        from: () => ({ where: () => Promise.resolve(existing) }),
      })),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
    };
  });

  describe('rebuild', () => {
    it('deletes the version rows then inserts its documentLinks whose target documents exist', async () => {
      existing = [{ id: M1 }, { id: S1 }];

      const written = await rebuildLinksTx(
        tx,
        version({ methods: [{ id: M1 }], related: [{ id: S1 }] }),
      );

      expect(written).toBe(2);
      expect(tx.delete).toHaveBeenCalledWith(linksTable);
      expect(tx.delete.mock.invocationCallOrder[0]).toBeLessThan(
        tx.insert.mock.invocationCallOrder[0],
      );
      expect(tx.values).toHaveBeenCalledWith([
        {
          sourceDocumentId: 'service-1',
          sourceVersionId: 'sv-1',
          targetDocumentId: M1,
          relation: 'references',
          fieldKey: 'methods',
          targetType: 'services.service-application-method',
        },
        {
          sourceDocumentId: 'service-1',
          sourceVersionId: 'sv-1',
          targetDocumentId: S1,
          relation: 'references',
          fieldKey: 'related',
          targetType: 'services.service',
        },
      ]);
    });

    it('inserts nothing when the content has no references', async () => {
      await expect(rebuildLinksTx(tx, version())).resolves.toBe(0);
      // The old rows still go: a save that removed every reference removes every link.
      expect(tx.delete).toHaveBeenCalledWith(linksTable);
      expect(tx.select).not.toHaveBeenCalled();
      expect(tx.insert).not.toHaveBeenCalled();
    });

    it('drops references to ids that are not existing documents (and malformed ids)', async () => {
      existing = [{ id: M1 }];

      const written = await rebuildLinksTx(
        tx,
        version({ methods: [{ id: M1 }, { id: GONE }, { id: 'not-a-uuid' }] }),
      );

      expect(written).toBe(1);
      const rows = tx.values.mock.calls[0][0];
      expect(rows.map((row: { targetDocumentId: string }) => row.targetDocumentId)).toEqual([M1]);
      expect(tx.onConflictDoNothing).toHaveBeenCalledTimes(1);
    });
  });
});
