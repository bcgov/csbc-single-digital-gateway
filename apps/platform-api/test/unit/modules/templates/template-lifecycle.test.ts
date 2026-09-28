import { ConflictException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTemplateSchema } from '../../../../src/modules/templates/dtos/template.dtos';
import { TemplateLifecycleService } from '../../../../src/modules/templates/services/template-lifecycle.service';

// Doc 227 — creating and deleting templates.

const mockQuery = (resolvedValue: unknown) => {
  const qb = Promise.resolve(resolvedValue);
  return Object.assign(qb, {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
  });
};

const NOW = new Date('2026-09-28T12:00:00.000Z');
const templateRow = (over: Record<string, unknown> = {}) => ({
  id: 'tpl-1',
  workspaceId: null,
  type: 'services.service',
  kind: 'template',
  templateId: null,
  templateKind: 'template',
  createdAt: NOW,
  updatedAt: NOW,
  ...over,
});
const versionRow = (over: Record<string, unknown> = {}) => ({
  id: 'v1',
  documentId: 'tpl-1',
  templateId: null,
  templateVersionId: null,
  versionNumber: 1,
  revision: 1,
  status: 'draft',
  title: 'Health service',
  description: null,
  content: { schema: {}, uischema: { type: 'Service', label: 'Health service', elements: [] } },
  createdAt: NOW,
  updatedAt: NOW,
  publishedAt: null,
  archivedAt: null,
  ...over,
});
const versionDto = (id: string) => ({ id }) as never;

describe('template lifecycle (doc 227)', () => {
  let service: TemplateLifecycleService;
  let dbMock: any;
  let txMock: any;

  beforeEach(() => {
    txMock = {
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn(),
    };
    dbMock = {
      select: vi.fn().mockImplementation(() => mockQuery([])),
      delete: vi.fn().mockImplementation(() => mockQuery([])),
      transaction: vi.fn().mockImplementation(async (cb) => cb(txMock)),
    };
    service = new TemplateLifecycleService(dbMock);
  });

  describe('create', () => {
    it('creates a global template with a draft v1 of the blank content titled as asked', async () => {
      txMock.returning.mockResolvedValueOnce([templateRow()]).mockResolvedValueOnce([versionRow()]);

      const result = await service.create({ type: 'services.service', title: 'Health service' });

      // The document: a TEMPLATE of the type, with no workspace (global).
      expect(txMock.values.mock.calls[0][0]).toEqual({
        type: 'services.service',
        kind: 'template',
      });
      // The version: v1, never published, the type's blank root with the title as its label.
      const version = txMock.values.mock.calls[1][0];
      expect(version).toMatchObject({ documentId: 'tpl-1', versionNumber: 1 });
      expect(version).not.toHaveProperty('publishedAt');
      expect(version.content.uischema).toEqual({
        type: 'Service',
        label: 'Health service',
        elements: [],
      });
      expect(result.template).toMatchObject({ id: 'tpl-1', workspaceId: null });
      expect(result.versions.map((v) => v.status)).toEqual(['draft']);
    });

    it('rejects an unknown type or a blank title (DTO)', () => {
      expect(createTemplateSchema.safeParse({ type: 'service', title: 'X' }).success).toBe(false);
      expect(
        createTemplateSchema.safeParse({ type: 'services.service', title: '   ' }).success,
      ).toBe(false);
      expect(
        createTemplateSchema.safeParse({ type: 'services.service-agreement', title: ' Terms ' })
          .data,
      ).toEqual({ type: 'services.service-agreement', title: 'Terms' });
    });
  });

  describe('deletable', () => {
    it('allows deleting an unreferenced template and every unreferenced version', async () => {
      dbMock.select
        .mockImplementationOnce(() => mockQuery([{ n: 0 }])) // documents using the template
        .mockImplementationOnce(() => mockQuery([{ versionId: 'v2', n: 3 }])); // pins

      const deletable = await service.deletable('tpl-1', [
        versionDto('v1'),
        versionDto('v2'),
        versionDto('v3'),
      ]);

      expect(deletable).toEqual({ template: true, versionIds: ['v1', 'v3'] });
    });

    it('never offers the only version, and gives a reason when the template is in use', async () => {
      dbMock.select
        .mockImplementationOnce(() => mockQuery([{ n: 2 }]))
        .mockImplementationOnce(() => mockQuery([]));

      const deletable = await service.deletable('tpl-1', [versionDto('v1')]);

      expect(deletable.template).toBe(false);
      expect(deletable.versionIds).toEqual([]);
      expect(deletable.reason).toMatch(/2 documents use this template/);
    });
  });

  describe('remove', () => {
    it('deletes an unreferenced template', async () => {
      dbMock.select
        .mockImplementationOnce(() => mockQuery([templateRow()]))
        .mockImplementationOnce(() => mockQuery([{ n: 0 }]));

      await expect(service.remove('tpl-1')).resolves.toBeUndefined();
      expect(dbMock.delete).toHaveBeenCalledTimes(1);
    });

    it('refuses a template a document uses, with a 409 reason', async () => {
      dbMock.select
        .mockImplementationOnce(() => mockQuery([templateRow()]))
        .mockImplementationOnce(() => mockQuery([{ n: 1 }]));

      const attempt = service.remove('tpl-1');
      await expect(attempt).rejects.toBeInstanceOf(ConflictException);
      await expect(attempt).rejects.toThrow(/1 document uses this template/);
      expect(dbMock.delete).not.toHaveBeenCalled();
    });

    it('404s an id that is not a template', async () => {
      dbMock.select.mockImplementationOnce(() => mockQuery([]));

      await expect(service.remove('doc-1')).rejects.toBeInstanceOf(NotFoundException);
      expect(dbMock.delete).not.toHaveBeenCalled();
    });
  });

  describe('removeVersion', () => {
    it('deletes an unreferenced PUBLISHED version when others remain', async () => {
      // Status is not consulted at all: a published version may go when nothing is based on it.
      dbMock.select
        .mockImplementationOnce(() => mockQuery([templateRow()]))
        .mockImplementationOnce(() => mockQuery([{ id: 'v1' }, { id: 'v2' }]))
        .mockImplementationOnce(() => mockQuery([]));

      await expect(service.removeVersion('tpl-1', 'v1')).resolves.toBeUndefined();
      expect(dbMock.delete).toHaveBeenCalledTimes(1);
    });

    it('refuses the only version', async () => {
      dbMock.select
        .mockImplementationOnce(() => mockQuery([templateRow()]))
        .mockImplementationOnce(() => mockQuery([{ id: 'v1' }]));

      await expect(service.removeVersion('tpl-1', 'v1')).rejects.toThrow(/only version/);
      expect(dbMock.delete).not.toHaveBeenCalled();
    });

    it('refuses a version a document version is based on', async () => {
      dbMock.select
        .mockImplementationOnce(() => mockQuery([templateRow()]))
        .mockImplementationOnce(() => mockQuery([{ id: 'v1' }, { id: 'v2' }]))
        .mockImplementationOnce(() => mockQuery([{ versionId: 'v1', n: 4 }]));

      const attempt = service.removeVersion('tpl-1', 'v1');
      await expect(attempt).rejects.toBeInstanceOf(ConflictException);
      await expect(attempt).rejects.toThrow(/4 document versions are based on this version/);
      expect(dbMock.delete).not.toHaveBeenCalled();
    });

    it('404s a version of another template', async () => {
      dbMock.select
        .mockImplementationOnce(() => mockQuery([templateRow()]))
        .mockImplementationOnce(() => mockQuery([{ id: 'v1' }, { id: 'v2' }]));

      await expect(service.removeVersion('tpl-1', 'other')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
