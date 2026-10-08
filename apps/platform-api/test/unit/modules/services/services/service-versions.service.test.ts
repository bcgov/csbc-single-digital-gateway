import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { documentVersions } from '@repo/database';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ServiceVersionsService } from '../../../../../src/modules/services/services/service-versions.service';
import { discardVersionTx } from '../../../../../src/modules/services/util/version-copy';

vi.mock('../../../../../src/modules/services/util/version-copy', () => ({
  discardVersionTx: vi.fn(),
  reactivateServiceTx: vi.fn(),
}));

/**
 * Feature 217. A draft save writes ONE `content` — no `data`, no title sync onto the document row
 * (the title is GENERATED from `content.variants.default.label`, doc 275), and no reconciled application
 * references. Publish validates the content's SHAPE; it no longer validates filled values against
 * the template's JSON schema (a service has no values), and no longer gates on
 * "≥ 1 application method", which needed `document_references`.
 */

const mockQuery = (resolvedValue: unknown) => {
  const qb = Promise.resolve(resolvedValue);
  return Object.assign(qb, {
    from: vi.fn().mockReturnValue(qb),
    innerJoin: vi.fn().mockReturnValue(qb),
    limit: vi.fn().mockReturnValue(qb),
    orderBy: vi.fn().mockReturnValue(qb),
    where: vi.fn().mockReturnValue(qb),
  });
};

const CONTENT = {
  schema: { type: 'object', properties: {} },
  variants: { default: { type: 'Form', elements: [], label: 'Waste permit' } },
};
const TEMPLATE = {
  templateId: 'template-1',
  templateVersionId: 'template-version-1',
  schema: { type: 'object', properties: {} },
  variants: { default: { type: 'Form', elements: [] } },
};
const SERVICE_DOC = {
  id: 'service-1',
  workspaceId: 'ws-1',
  type: 'services.service' as const,
  kind: 'document' as const,
  templateId: TEMPLATE.templateId,
  templateKind: 'template' as const,
  createdAt: new Date('2026-07-12T00:00:00.000Z'),
  updatedAt: new Date('2026-07-12T00:00:00.000Z'),
};
const draftVersion = (over: Record<string, unknown> = {}) => ({
  id: 'version-1',
  documentId: 'service-1',
  templateId: TEMPLATE.templateId,
  templateVersionId: TEMPLATE.templateVersionId,
  versionNumber: 1,
  revision: 1,
  status: 'draft',
  title: 'Waste permit',
  description: null,
  content: CONTENT,
  createdAt: new Date('2026-07-12T00:00:00.000Z'),
  updatedAt: new Date('2026-07-12T00:00:00.000Z'),
  publishedAt: null,
  archivedAt: null,
  ...over,
});

describe('ServiceVersionsService', () => {
  let service: ServiceVersionsService;
  let dbMock: any;
  let txMock: any;
  let servicesServiceMock: any;
  let templatesMock: any;
  let methodsMock: any;

  beforeEach(() => {
    vi.clearAllMocks();

    txMock = Object.assign(Promise.resolve([]), {
      select: vi.fn().mockImplementation(() => mockQuery([])),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      returning: vi.fn(),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
    });

    dbMock = Object.assign(Promise.resolve([]), {
      transaction: vi.fn().mockImplementation((cb) => cb(txMock)),
      select: vi.fn().mockImplementation(() => mockQuery([])),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn(),
      where: vi.fn().mockReturnThis(),
    });

    servicesServiceMock = { requireDocument: vi.fn().mockResolvedValue(SERVICE_DOC) };
    templatesMock = {
      forDocument: vi.fn().mockResolvedValue(TEMPLATE),
      // Doc 222: ungoverned — these cases are about versioning, not capabilities.
      capabilitiesForVersion: vi.fn().mockResolvedValue(undefined),
    };

    // Doc 289: every method gate passes unless a case says otherwise.
    methodsMock = {
      check: vi.fn().mockResolvedValue({ ok: true, hasMethods: true, methods: [] }),
      publishMethodsTx: vi.fn(),
      draftMethodsTx: vi.fn(),
      discardMethodDraftsTx: vi.fn(),
    };
    service = new ServiceVersionsService(dbMock, servicesServiceMock, templatesMock, methodsMock);
  });

  describe('updateDraft', () => {
    it('writes the content and bumps the revision', async () => {
      dbMock.select.mockReturnValueOnce(mockQuery([draftVersion()]));
      dbMock.returning.mockResolvedValueOnce([draftVersion({ revision: 2 })]);

      const result = await service.updateDraft('user-1', 'service-1', 'version-1', {
        content: CONTENT,
      });

      expect(dbMock.update).toHaveBeenCalledWith(documentVersions);
      const setArg = dbMock.set.mock.calls[0][0];
      expect(setArg.content).toEqual(CONTENT);
      expect(setArg.revision).toBeDefined();
      expect(result.revision).toBe(2);
    });

    it('never writes a document title — there is no title column to sync', async () => {
      dbMock.select.mockReturnValueOnce(mockQuery([draftVersion()]));
      dbMock.returning.mockResolvedValueOnce([draftVersion()]);

      await service.updateDraft('user-1', 'service-1', 'version-1', { content: CONTENT });

      expect(dbMock.update).toHaveBeenCalledTimes(1);
      expect(dbMock.set.mock.calls[0][0]).not.toHaveProperty('title');
    });

    it.each(['Service', 'Flow'])(
      'rejects a %s root — a service is a Form or a Funnel (doc 275)',
      async (root) => {
        dbMock.select.mockReturnValueOnce(mockQuery([draftVersion()]));

        await expect(
          service.updateDraft('user-1', 'service-1', 'version-1', {
            content: {
              schema: { type: 'object', properties: {} },
              variants: { default: { type: root, elements: [] } },
            },
          }),
        ).rejects.toThrow(BadRequestException);
      },
    );

    it('rejects content with no default variant', async () => {
      dbMock.select.mockReturnValueOnce(mockQuery([draftVersion()]));

      await expect(
        service.updateDraft('user-1', 'service-1', 'version-1', {
          content: {
            schema: { type: 'object', properties: {} },
            variants: { mobile: { type: 'Form', elements: [] } },
          },
        } as never),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws ConflictException if the version is not a draft', async () => {
      dbMock.select.mockReturnValueOnce(mockQuery([draftVersion({ status: 'published' })]));

      await expect(
        service.updateDraft('user-1', 'service-1', 'version-1', { content: CONTENT }),
      ).rejects.toThrow(ConflictException);
    });

    it('throws NotFoundException if the version is not found', async () => {
      dbMock.select.mockReturnValueOnce(mockQuery([]));

      await expect(
        service.updateDraft('user-1', 'service-1', 'version-1', { content: CONTENT }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('publish', () => {
    it('archives the currently-published version BEFORE promoting the draft', async () => {
      // The partial unique index is not deferrable, so promote-then-demote would collide.
      txMock.select.mockReturnValueOnce(mockQuery([draftVersion()]));
      txMock.returning.mockResolvedValueOnce([
        draftVersion({ status: 'published', publishedAt: new Date() }),
      ]);

      const result = await service.publish('user-1', 'service-1', 'version-1');

      expect(txMock.update).toHaveBeenNthCalledWith(1, documentVersions);
      expect(txMock.set.mock.calls[0][0]).toHaveProperty('archivedAt');
      expect(txMock.set.mock.calls[1][0]).toHaveProperty('publishedAt');
      expect(result.status).toBe('published');
    });

    it('validates the content shape rather than filled values', async () => {
      txMock.select.mockReturnValueOnce(
        mockQuery([
          draftVersion({
            content: {
              schema: { type: 'object', properties: {} },
              variants: { default: { type: 'Service', elements: [] } },
            },
          }),
        ]),
      );

      await expect(service.publish('user-1', 'service-1', 'version-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('does not require an application method to publish', async () => {
      // Feature 217: the "a service needs ≥ 1 way to apply" gate needed document_references.
      txMock.select.mockReturnValueOnce(mockQuery([draftVersion()]));
      txMock.returning.mockResolvedValueOnce([draftVersion({ status: 'published' })]);

      await expect(service.publish('user-1', 'service-1', 'version-1')).resolves.toBeDefined();
      expect(txMock.select).toHaveBeenCalledTimes(1);
    });

    it('throws NotFoundException if the version is not found', async () => {
      txMock.select.mockReturnValueOnce(mockQuery([]));

      await expect(service.publish('user-1', 'service-1', 'version-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ConflictException when publishing a non-draft version', async () => {
      txMock.select.mockReturnValueOnce(mockQuery([draftVersion({ status: 'archived' })]));

      await expect(service.publish('user-1', 'service-1', 'version-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('throws if the promote mutation returns no row', async () => {
      txMock.select.mockReturnValueOnce(mockQuery([draftVersion()]));
      txMock.returning.mockResolvedValueOnce([]);

      await expect(service.publish('user-1', 'service-1', 'version-1')).rejects.toThrow(
        'document version mutation returned no row',
      );
    });
  });

  describe('staff answers in content.data (doc 230)', () => {
    const FORM = {
      schema: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] },
      variants: {
        default: {
          type: 'Form',
          label: 'Waste permit',
          elements: [{ type: 'Control', scope: '#/properties/name' }],
        },
      },
    };

    it('stores the answers sent with the document', async () => {
      dbMock.select.mockReturnValueOnce(mockQuery([draftVersion({ content: FORM })]));
      dbMock.returning.mockResolvedValueOnce([draftVersion()]);

      await service.updateDraft('user-1', 'service-1', 'version-1', {
        content: { ...FORM, data: { name: 'Acme' } },
      });

      expect(dbMock.set.mock.calls[0][0].content).toEqual({ ...FORM, data: { name: 'Acme' } });
    });

    it('keeps the stored answers when a save sends none', async () => {
      dbMock.select.mockReturnValueOnce(
        mockQuery([draftVersion({ content: { ...FORM, data: { name: 'Kept' } } })]),
      );
      dbMock.returning.mockResolvedValueOnce([draftVersion()]);

      await service.updateDraft('user-1', 'service-1', 'version-1', { content: FORM });

      expect(dbMock.set.mock.calls[0][0].content.data).toEqual({ name: 'Kept' });
    });

    it('refuses to publish answers the form rejects, and says which', async () => {
      txMock.select.mockReturnValueOnce(
        mockQuery([draftVersion({ content: { ...FORM, data: {} } })]),
      );

      const attempt = service.publish('user-1', 'service-1', 'version-1');
      await expect(attempt).rejects.toBeInstanceOf(BadRequestException);
      await expect(attempt).rejects.toThrow("Answers don't match the form: name is required");
      expect(txMock.update).not.toHaveBeenCalled();
    });

    it('publishes answers the form accepts', async () => {
      txMock.select.mockReturnValueOnce(
        mockQuery([draftVersion({ content: { ...FORM, data: { name: 'Acme' } } })]),
      );
      txMock.returning.mockResolvedValueOnce([draftVersion({ status: 'published' })]);

      await expect(service.publish('user-1', 'service-1', 'version-1')).resolves.toMatchObject({
        status: 'published',
      });
    });

    it('refuses to publish when a variant does not show a required field (doc 275)', async () => {
      const content = {
        ...FORM,
        variants: { ...FORM.variants, mobile: { type: 'Form', elements: [] } },
        data: { name: 'Acme' },
      };
      txMock.select.mockReturnValueOnce(mockQuery([draftVersion({ content })]));

      const attempt = service.publish('user-1', 'service-1', 'version-1');
      await expect(attempt).rejects.toBeInstanceOf(BadRequestException);
      await expect(attempt).rejects.toThrow('"mobile" is missing name');
      expect(txMock.update).not.toHaveBeenCalled();
    });
  });

  describe('archive', () => {
    it('archives an active version', async () => {
      dbMock.select.mockReturnValueOnce(mockQuery([draftVersion()]));
      dbMock.returning.mockResolvedValueOnce([draftVersion({ status: 'archived' })]);

      const result = await service.archive('user-1', 'service-1', 'version-1');

      expect(dbMock.update).toHaveBeenCalledWith(documentVersions);
      expect(result.status).toBe('archived');
    });

    it('throws ConflictException if it is already archived', async () => {
      dbMock.select.mockReturnValueOnce(mockQuery([draftVersion({ status: 'archived' })]));

      await expect(service.archive('user-1', 'service-1', 'version-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('throws if the archive mutation returns no row', async () => {
      dbMock.select.mockReturnValueOnce(mockQuery([draftVersion()]));
      dbMock.returning.mockResolvedValueOnce([]);

      await expect(service.archive('user-1', 'service-1', 'version-1')).rejects.toThrow(
        'document version mutation returned no row',
      );
    });

    it('throws NotFoundException if the version is not found', async () => {
      dbMock.select.mockReturnValueOnce(mockQuery([]));

      await expect(service.archive('user-1', 'service-1', 'version-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('discardVersion', () => {
    it('discards a draft version via discardVersionTx', async () => {
      dbMock.select.mockReturnValueOnce(mockQuery([draftVersion()]));

      await service.discardVersion('user-1', 'service-1', 'version-1');

      expect(vi.mocked(discardVersionTx)).toHaveBeenCalledWith(txMock, 'service-1', 'version-1');
    });

    it('throws ConflictException when discarding a published version', async () => {
      dbMock.select.mockReturnValueOnce(mockQuery([draftVersion({ status: 'published' })]));

      await expect(service.discardVersion('user-1', 'service-1', 'version-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('throws NotFoundException if the version is not found', async () => {
      dbMock.select.mockReturnValueOnce(mockQuery([]));

      await expect(service.discardVersion('user-1', 'service-1', 'version-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('addVersion', () => {
    it('copies the latest version content into the next version number', async () => {
      txMock.select.mockReturnValueOnce(mockQuery([draftVersion({ versionNumber: 2 })]));
      txMock.returning.mockResolvedValueOnce([draftVersion({ id: 'version-3', versionNumber: 3 })]);

      const result = await service.addVersion('user-1', 'service-1');

      const values = txMock.values.mock.calls[0][0];
      expect(values.versionNumber).toBe(3);
      expect(values.content).toEqual(CONTENT);
      expect(values.templateVersionId).toBe(TEMPLATE.templateVersionId);
      expect(result.versionNumber).toBe(3);
    });

    it('starts at version 1 from the template when there is no prior version', async () => {
      txMock.select.mockReturnValueOnce(mockQuery([]));
      txMock.returning.mockResolvedValueOnce([draftVersion()]);

      await service.addVersion('user-1', 'service-1');

      const values = txMock.values.mock.calls[0][0];
      expect(values.versionNumber).toBe(1);
      expect(values.content).toEqual({ schema: TEMPLATE.schema, variants: TEMPLATE.variants });
    });

    it('throws if the insert returns no row', async () => {
      txMock.select.mockReturnValueOnce(mockQuery([]));
      txMock.returning.mockResolvedValueOnce([]);

      await expect(service.addVersion('user-1', 'service-1')).rejects.toThrow(
        'document version mutation returned no row',
      );
    });
  });

  // Doc 289: publish / new version / discard carry the service's application methods.
  describe('application methods (doc 289)', () => {
    describe('publish', () => {
      it('refuses with 400 naming the first failing precheck (rule 7)', async () => {
        txMock.select.mockReturnValueOnce(mockQuery([draftVersion()]));
        methodsMock.check.mockResolvedValueOnce({ ok: false, hasMethods: false, methods: [] });

        const attempt = service.publish('user-1', 'service-1', 'version-1');
        await expect(attempt).rejects.toBeInstanceOf(BadRequestException);
        await expect(attempt).rejects.toThrow('Add at least one application method');
        expect(methodsMock.check).toHaveBeenCalledWith(txMock, SERVICE_DOC, draftVersion());
        expect(txMock.update).not.toHaveBeenCalled();
        expect(methodsMock.publishMethodsTx).not.toHaveBeenCalled();
      });

      it('names each failing method in the refusal (rule 7)', async () => {
        txMock.select.mockReturnValueOnce(mockQuery([draftVersion()]));
        methodsMock.check.mockResolvedValueOnce({
          ok: false,
          hasMethods: true,
          methods: [
            { id: 'm1', title: 'Online', status: 'draft', problems: [] },
            { id: 'm2', title: null, status: null, problems: ['Not found'] },
            { id: 'm3', title: 'Mail', status: 'draft', problems: ['Has no fields'] },
          ],
        });

        await expect(service.publish('user-1', 'service-1', 'version-1')).rejects.toThrow(
          'Untitled: Not found; Mail: Has no fields',
        );
      });

      it('publishes the service and its draft methods in one transaction (rules 8, 13)', async () => {
        txMock.select.mockReturnValueOnce(mockQuery([draftVersion()]));
        txMock.returning.mockResolvedValueOnce([draftVersion({ status: 'published' })]);

        await expect(service.publish('user-1', 'service-1', 'version-1')).resolves.toMatchObject({
          status: 'published',
        });
        expect(dbMock.transaction).toHaveBeenCalledTimes(1);
        expect(methodsMock.publishMethodsTx).toHaveBeenCalledWith(txMock, SERVICE_DOC, CONTENT);
      });
    });

    describe('addVersion', () => {
      it('drafts each referenced method in the same transaction (rule 12)', async () => {
        txMock.select.mockReturnValueOnce(mockQuery([draftVersion({ versionNumber: 2 })]));
        txMock.returning.mockResolvedValueOnce([
          draftVersion({ id: 'version-3', versionNumber: 3 }),
        ]);

        await service.addVersion('user-1', 'service-1');

        expect(dbMock.transaction).toHaveBeenCalledTimes(1);
        expect(methodsMock.draftMethodsTx).toHaveBeenCalledWith(txMock, SERVICE_DOC, CONTENT);
      });
    });

    describe('discardVersion', () => {
      it('discards the method drafts before the service version (rule 14)', async () => {
        dbMock.select.mockReturnValueOnce(mockQuery([draftVersion()]));

        await service.discardVersion('user-1', 'service-1', 'version-1');

        expect(methodsMock.discardMethodDraftsTx).toHaveBeenCalledWith(
          txMock,
          SERVICE_DOC,
          CONTENT,
        );
        expect(methodsMock.discardMethodDraftsTx.mock.invocationCallOrder[0]).toBeLessThan(
          vi.mocked(discardVersionTx).mock.invocationCallOrder[0]!,
        );
      });
    });
  });
});
