import { BadRequestException } from '@nestjs/common';
import { DOCUMENT_TYPE } from '@repo/database';
import { type SQL } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import { ZodValidationPipe } from 'nestjs-zod';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TemplatesV1Controller } from '../../../../src/modules/templates/controllers/templates-v1.controller';
import {
  StaffTemplatesQueryDto,
  staffTemplatesQuerySchema,
} from '../../../../src/modules/templates/dtos/template.dtos';
import { TemplatesService } from '../../../../src/modules/templates/services/templates.service';

// Doc 287 — `GET /v1/templates?type=` narrows the staff catalog to one document type.

const NOW = new Date('2026-10-08T00:00:00.000Z');
const dialect = new PgDialect();

const row = (type: string) => ({
  template: {
    id: `tpl-${type}`,
    workspaceId: null,
    type,
    kind: 'template',
    templateId: null,
    createdAt: NOW,
    updatedAt: NOW,
  },
  published: {
    id: `v-${type}`,
    documentId: `tpl-${type}`,
    versionNumber: 1,
    revision: 1,
    status: 'published',
    title: type,
    description: null,
    content: {},
    createdAt: NOW,
    publishedAt: NOW,
    archivedAt: null,
  },
});

const mockQuery = (rows: unknown) => {
  const qb = Promise.resolve(rows);
  return Object.assign(qb, {
    from: vi.fn().mockReturnValue(qb),
    innerJoin: vi.fn().mockReturnValue(qb),
    where: vi.fn().mockReturnValue(qb),
    orderBy: vi.fn().mockReturnValue(qb),
  });
};

describe('TemplatesService.staffList type filter', () => {
  let dbMock: { select: ReturnType<typeof vi.fn> };
  let service: TemplatesService;

  beforeEach(() => {
    dbMock = { select: vi.fn() };
    service = new TemplatesService(dbMock as never);
  });

  describe('type', () => {
    it('returns only templates of the given type', async () => {
      const query = mockQuery([row(DOCUMENT_TYPE.applicationMethod)]);
      dbMock.select.mockReturnValueOnce(query);

      const result = await service.staffList(DOCUMENT_TYPE.applicationMethod);

      const where = dialect.sqlToQuery(query.where.mock.calls[0]![0] as SQL);
      expect(where.sql).toBe('("documents"."kind" = $1 and "documents"."type" = $2)');
      expect(where.params).toEqual(['template', DOCUMENT_TYPE.applicationMethod]);
      expect(result.map((r) => r.template.type)).toEqual([DOCUMENT_TYPE.applicationMethod]);

      // The controller passes the validated query's type straight through.
      const templates = { staffList: vi.fn().mockResolvedValue([]) };
      const controller = new TemplatesV1Controller(templates as never);
      await expect(controller.list({ type: DOCUMENT_TYPE.service })).resolves.toEqual({
        items: [],
      });
      expect(templates.staffList).toHaveBeenCalledWith(DOCUMENT_TYPE.service);
    });

    it('returns every published template when type is omitted', async () => {
      const rows = [row(DOCUMENT_TYPE.service), row(DOCUMENT_TYPE.serviceAgreement)];
      const query = mockQuery(rows);
      dbMock.select.mockReturnValueOnce(query);

      const result = await service.staffList();

      const where = dialect.sqlToQuery(query.where.mock.calls[0]![0] as SQL);
      expect(where.sql).toBe('"documents"."kind" = $1');
      expect(where.params).toEqual(['template']);
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        template: { id: `tpl-${DOCUMENT_TYPE.service}` },
        published: { status: 'published', publishedAt: NOW.toISOString() },
      });
    });

    it('rejects an unknown type with 400 in the query dto', () => {
      expect(staffTemplatesQuerySchema.safeParse({ type: 'basic-form' }).success).toBe(false);
      expect(staffTemplatesQuerySchema.parse({})).toEqual({});
      const pipe = new ZodValidationPipe();
      const metadata = { type: 'query', metatype: StaffTemplatesQueryDto } as const;
      expect(() => pipe.transform({ type: 'basic-form' }, metadata)).toThrow(BadRequestException);
      expect(pipe.transform({ type: DOCUMENT_TYPE.service }, metadata)).toEqual({
        type: DOCUMENT_TYPE.service,
      });
    });
  });
});
