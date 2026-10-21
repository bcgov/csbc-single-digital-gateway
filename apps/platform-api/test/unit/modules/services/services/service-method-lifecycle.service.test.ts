import { ConflictException } from '@nestjs/common';
import { documents, documentVersions } from '@repo/database';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ServiceMethodLifecycle } from '../../../../../src/modules/services/services/service-method-lifecycle.service';
import {
  linkedElsewhere,
  linkedMethodIds,
  linkUsers,
} from '../../../../../src/modules/services/util/document-links';
import { findMethods } from '../../../../../src/modules/services/util/method-lookup';

vi.mock('../../../../../src/modules/services/util/document-links', () => ({
  linkedElsewhere: vi.fn(async () => new Set()),
  linkedMethodIds: vi.fn(async () => []),
  linkUsers: vi.fn(async () => new Map()),
}));
vi.mock('../../../../../src/modules/services/util/method-lookup', () => ({
  findMethods: vi.fn(async () => new Map()),
}));

const M1 = '11111111-1111-4111-8111-111111111111';
const M2 = '22222222-2222-4222-8222-222222222222';
const SERVICE = { id: 'service-1', workspaceId: 'ws-1' };
const ARCHIVED_AT = new Date('2026-10-08T12:00:00.000Z');

const version = (documentId: string, n: number, over: Record<string, unknown> = {}) => ({
  id: `${documentId.slice(0, 2)}-v${String(n)}`,
  documentId,
  versionNumber: n,
  status: 'draft',
  archivedAt: null,
  ...over,
});
const method = (id: string, versions: unknown[]) => [id, { doc: { id }, versions }] as const;
/** A service version whose default variant references `ids` as application methods. */
const serviceVersion = (ids: string[], over: Record<string, unknown> = {}) => ({
  id: 'sv-1',
  documentId: 'service-1',
  archivedAt: null,
  content: {
    schema: { type: 'object', properties: {} },
    variants: {
      default: {
        type: 'Form',
        elements: [
          {
            type: 'Control',
            scope: '#/properties/methods',
            options: {
              component: 'document-reference',
              documentType: 'services.service-application-method',
            },
          },
        ],
      },
    },
    data: { methods: ids.map((id) => ({ id })) },
  },
  ...over,
});
const countQuery = (n: number) => {
  const qb = Promise.resolve([{ n }]);
  return Object.assign(qb, {
    from: vi.fn().mockReturnValue(qb),
    where: vi.fn().mockReturnValue(qb),
  });
};

// Doc 290 rules 8-11.
describe('ServiceMethodLifecycle (doc 290)', () => {
  let lifecycle: ServiceMethodLifecycle;
  let tx: any;

  beforeEach(() => {
    vi.clearAllMocks();
    tx = {
      select: vi.fn(),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockReturnThis(),
    };
    lifecycle = new ServiceMethodLifecycle();
  });

  describe('discardCreatedMethodsTx (rule 8)', () => {
    it('deletes a method only this version links to and that was never published', async () => {
      vi.mocked(findMethods).mockResolvedValueOnce(new Map([method(M1, [version(M1, 1)])]) as any);

      await lifecycle.discardCreatedMethodsTx(tx, SERVICE, serviceVersion([M1]) as any);

      expect(vi.mocked(linkedElsewhere)).toHaveBeenCalledWith(tx, [M1], 'sv-1');
      expect(vi.mocked(findMethods)).toHaveBeenCalledWith(tx, 'ws-1', [M1]);
      expect(tx.delete).toHaveBeenCalledTimes(1);
      expect(tx.delete).toHaveBeenCalledWith(documents);
    });

    it('keeps a method another version links to or that has a published version', async () => {
      vi.mocked(findMethods).mockResolvedValueOnce(
        new Map([
          method(M1, [version(M1, 1)]),
          method(M2, [version(M2, 1, { status: 'published' }), version(M2, 2)]),
        ]) as any,
      );
      vi.mocked(linkedElsewhere).mockResolvedValueOnce(new Set([M1]));

      await lifecycle.discardCreatedMethodsTx(tx, SERVICE, serviceVersion([M1, M2]) as any);

      expect(tx.delete).not.toHaveBeenCalled();
    });
  });

  describe('archiveMethodsTx (rule 9)', () => {
    it('archives the methods with the given timestamp, skipping methods another live service uses', async () => {
      vi.mocked(linkedMethodIds).mockResolvedValueOnce([M1, M2]);
      vi.mocked(findMethods).mockResolvedValueOnce(
        new Map([method(M1, [version(M1, 1)]), method(M2, [version(M2, 1)])]) as any,
      );
      vi.mocked(linkUsers).mockResolvedValueOnce(
        new Map([[M2, [{ documentId: 'other', title: 'Other' }]]]),
      );

      await lifecycle.archiveMethodsTx(tx, SERVICE, ARCHIVED_AT);

      expect(vi.mocked(linkUsers)).toHaveBeenCalledWith(tx, [M1, M2], 'service-1', {
        liveOnly: true,
      });
      expect(tx.update).toHaveBeenCalledTimes(1);
      expect(tx.update).toHaveBeenCalledWith(documentVersions);
      expect(tx.set).toHaveBeenCalledWith({ archivedAt: ARCHIVED_AT });
    });
  });

  describe('reactivateMethodsTx (rule 10)', () => {
    it('clears archived_at on the method versions archived at the service version timestamp', async () => {
      vi.mocked(findMethods).mockResolvedValueOnce(
        new Map([
          // Archived WITH the service: restored.
          method(M1, [version(M1, 1, { status: 'archived', archivedAt: new Date(ARCHIVED_AT) })]),
          // Archived earlier, on its own: left alone.
          method(M2, [
            version(M2, 1, {
              status: 'archived',
              archivedAt: new Date('2026-09-01T00:00:00.000Z'),
            }),
          ]),
        ]) as any,
      );

      await lifecycle.reactivateMethodsTx(
        tx,
        SERVICE,
        serviceVersion([M1, M2], { archivedAt: ARCHIVED_AT }) as any,
      );

      expect(tx.update).toHaveBeenCalledTimes(1);
      expect(tx.set).toHaveBeenCalledWith({ archivedAt: null });
      // Nothing to do for a version that wasn't archived.
      await lifecycle.reactivateMethodsTx(tx, SERVICE, serviceVersion([M1]) as any);
      expect(tx.update).toHaveBeenCalledTimes(1);
    });
  });

  describe('deleteMethodsTx (rule 11)', () => {
    it('deletes methods only this service uses', async () => {
      vi.mocked(linkedMethodIds).mockResolvedValueOnce([M1, M2]);
      vi.mocked(findMethods).mockResolvedValueOnce(
        new Map([method(M1, [version(M1, 1)]), method(M2, [version(M2, 1)])]) as any,
      );
      vi.mocked(linkUsers).mockResolvedValueOnce(
        new Map([[M2, [{ documentId: 'other', title: 'Other' }]]]),
      );
      tx.select.mockReturnValueOnce(countQuery(0));

      await lifecycle.deleteMethodsTx(tx, SERVICE);

      expect(vi.mocked(linkUsers)).toHaveBeenCalledWith(tx, [M1, M2], 'service-1', {
        liveOnly: false,
      });
      expect(tx.delete).toHaveBeenCalledTimes(1);
      expect(tx.delete).toHaveBeenCalledWith(documents);
    });

    it('refuses 409 when such a method has submissions', async () => {
      vi.mocked(linkedMethodIds).mockResolvedValueOnce([M1]);
      vi.mocked(findMethods).mockResolvedValueOnce(new Map([method(M1, [version(M1, 1)])]) as any);
      tx.select.mockReturnValueOnce(countQuery(2));

      const attempt = lifecycle.deleteMethodsTx(tx, SERVICE);
      await expect(attempt).rejects.toBeInstanceOf(ConflictException);
      await expect(attempt).rejects.toThrow('An application method has submissions');
      expect(tx.delete).not.toHaveBeenCalled();
    });
  });
});
