import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TemplateVersionsService } from '../../../../src/modules/templates/services/template-versions.service';

// Doc 275 — a template version is publishable only when EVERY variant shows every required field.

const NOW = new Date('2026-10-06T12:00:00.000Z');

const mockQuery = (resolvedValue: unknown) => {
  const qb = Promise.resolve(resolvedValue);
  return Object.assign(qb, {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnValue(qb),
  });
};

const template = {
  id: 'tpl-1',
  workspaceId: null,
  type: 'services.service',
  kind: 'template',
  createdAt: NOW,
  updatedAt: NOW,
};

const SCHEMA = {
  type: 'object',
  properties: { name: { type: 'string', title: 'Name' } },
  required: ['name'],
};
const WITH_NAME = {
  type: 'Form',
  label: 'Health service',
  elements: [{ type: 'Control', scope: '#/properties/name' }],
};

const draft = (content: unknown) => ({
  id: 'v1',
  documentId: 'tpl-1',
  versionNumber: 1,
  revision: 1,
  status: 'draft',
  title: 'Health service',
  description: null,
  content,
  createdAt: NOW,
  publishedAt: null,
  archivedAt: null,
});

describe('TemplateVersionsService.publish (doc 275)', () => {
  let service: TemplateVersionsService;
  let txMock: any;

  beforeEach(() => {
    txMock = {
      select: vi.fn(),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      returning: vi.fn(),
    };
    const dbMock = {
      select: vi.fn().mockImplementation(() => mockQuery([template])),
      transaction: vi.fn().mockImplementation(async (cb) => cb(txMock)),
    };
    service = new TemplateVersionsService(dbMock as never);
  });

  it('refuses a version whose variant does not show a required field, before any write', async () => {
    const content = {
      schema: SCHEMA,
      variants: { default: WITH_NAME, mobile: { type: 'Form', elements: [] } },
    };
    txMock.select.mockImplementationOnce(() => mockQuery([draft(content)]));

    const attempt = service.publish('tpl-1', 'v1');
    await expect(attempt).rejects.toBeInstanceOf(BadRequestException);
    await expect(attempt).rejects.toThrow('"mobile" is missing Name');
    expect(txMock.update).not.toHaveBeenCalled();
  });

  it('refuses a version whose content no longer validates (old top-level uischema)', async () => {
    txMock.select.mockImplementationOnce(() =>
      mockQuery([draft({ schema: SCHEMA, uischema: WITH_NAME })]),
    );

    await expect(service.publish('tpl-1', 'v1')).rejects.toBeInstanceOf(BadRequestException);
    expect(txMock.update).not.toHaveBeenCalled();
  });

  it('publishes when every variant shows every required field', async () => {
    const content = { schema: SCHEMA, variants: { default: WITH_NAME, mobile: WITH_NAME } };
    txMock.select.mockImplementationOnce(() => mockQuery([draft(content)]));
    txMock.returning.mockResolvedValueOnce([{ ...draft(content), publishedAt: NOW }]);

    const result = await service.publish('tpl-1', 'v1');

    expect(txMock.set.mock.calls[0][0]).toHaveProperty('archivedAt');
    expect(txMock.set.mock.calls[1][0]).toHaveProperty('publishedAt');
    expect(result.publishedAt).toBe(NOW.toISOString());
  });
});
