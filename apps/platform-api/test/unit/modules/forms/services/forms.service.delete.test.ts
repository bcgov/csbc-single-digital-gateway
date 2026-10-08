import {
  ConflictException,
  ForbiddenException,
  type INestApplication,
  NotFoundException,
  VersioningType,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DOCUMENT_TYPE, documentMembers, documents, submissions } from '@repo/database';
import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { FormsV1Controller } from '../../../../../src/modules/forms/controllers/forms-v1.controller';
import {
  FORM_HAS_SUBMISSIONS,
  FormsService,
} from '../../../../../src/modules/forms/services/forms.service';

const FORM_ID = 'e6005cbb-84f9-467a-bb48-e8cbffc9c991';
const NOW = new Date('2026-10-08T00:00:00.000Z');

const formDoc = (overrides: Record<string, unknown> = {}) => ({
  id: FORM_ID,
  workspaceId: 'ws-1',
  type: DOCUMENT_TYPE.applicationMethod,
  kind: 'document',
  templateId: 'template-1',
  createdAt: NOW,
  updatedAt: NOW,
  ...overrides,
});

/** A thenable Drizzle select chain resolving to `rows`. */
const mockQuery = (rows: unknown) => {
  const qb = Promise.resolve(rows);
  return Object.assign(qb, {
    from: vi.fn().mockReturnValue(qb),
    innerJoin: vi.fn().mockReturnValue(qb),
    where: vi.fn().mockReturnValue(qb),
    limit: vi.fn().mockReturnValue(qb),
  });
};

describe('FormsService.delete', () => {
  let dbMock: {
    select: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    where: ReturnType<typeof vi.fn>;
  };
  let service: FormsService;

  /** Selects in call order: requireDocument, the document role, the submission count. */
  const arrange = (doc: unknown[], role: unknown[], submissionCount: number) => {
    const queries = [mockQuery(doc), mockQuery(role), mockQuery([{ n: submissionCount }])];
    for (const q of queries) dbMock.select.mockReturnValueOnce(q);
    return queries;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    dbMock = {
      select: vi.fn(),
      delete: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue(undefined),
    };
    service = new FormsService(dbMock as never, {} as never);
  });

  describe('delete', () => {
    it('deletes an application method for an editor of its workspace', async () => {
      const [, roleQuery, submissionQuery] = arrange([{ doc: formDoc() }], [{ role: 'editor' }], 0);
      await expect(service.remove('user-1', FORM_ID)).resolves.toBeUndefined();
      expect(roleQuery!.from).toHaveBeenCalledWith(documentMembers);
      expect(submissionQuery!.from).toHaveBeenCalledWith(submissions);
      expect(dbMock.delete).toHaveBeenCalledWith(documents);
      expect(dbMock.where).toHaveBeenCalledTimes(1);
    });

    it('404s when the form is missing, not an application method, or the caller is not a member', async () => {
      // requireDocument joins the membership and filters on the application-method type, so a
      // missing form, another type and a non-member all come back as no row.
      arrange([], [], 0);
      await expect(service.remove('user-1', FORM_ID)).rejects.toBeInstanceOf(NotFoundException);
      // A TEMPLATE of the application-method type is not a form either.
      arrange([{ doc: formDoc({ kind: 'template' }) }], [], 0);
      await expect(service.remove('user-1', FORM_ID)).rejects.toBeInstanceOf(NotFoundException);
      expect(dbMock.delete).not.toHaveBeenCalled();
    });

    it('403s for a viewer', async () => {
      arrange([{ doc: formDoc() }], [{ role: 'viewer' }], 0);
      await expect(service.remove('user-1', FORM_ID)).rejects.toBeInstanceOf(ForbiddenException);
      expect(dbMock.delete).not.toHaveBeenCalled();
    });

    it('409s with Form has submissions when a submission references the form', async () => {
      arrange([{ doc: formDoc() }], [], 2);
      const error = await service.remove('user-1', FORM_ID).catch((e: unknown) => e);
      expect(error).toBeInstanceOf(ConflictException);
      expect((error as ConflictException).getResponse()).toMatchObject({
        message: FORM_HAS_SUBMISSIONS,
      });
      expect(FORM_HAS_SUBMISSIONS).toBe('Form has submissions');
      expect(dbMock.delete).not.toHaveBeenCalled();
    });
  });

  describe('controller', () => {
    let app: INestApplication;
    const formsMock = { remove: vi.fn() };

    beforeAll(async () => {
      const moduleRef = await Test.createTestingModule({
        controllers: [FormsV1Controller],
        providers: [{ provide: FormsService, useValue: formsMock }],
      }).compile();
      app = moduleRef.createNestApplication();
      app.use((req: Request, _res: Response, next: NextFunction) => {
        Object.assign(req, { authUser: { id: 'user-1', roles: ['staff'], claims: {} } });
        next();
      });
      app.enableVersioning({ type: VersioningType.URI });
      await app.init();
    });

    afterAll(async () => {
      await app.close();
    });

    it('DELETE /v1/forms/:id returns 204 and rejects a non-uuid id with 400', async () => {
      formsMock.remove.mockResolvedValueOnce(undefined);
      const ok = await request(app.getHttpServer()).delete(`/v1/forms/${FORM_ID}`);
      expect(ok.status).toBe(204);
      expect(formsMock.remove).toHaveBeenCalledWith('user-1', FORM_ID);

      formsMock.remove.mockClear();
      const bad = await request(app.getHttpServer()).delete('/v1/forms/not-a-uuid');
      expect(bad.status).toBe(400);
      expect(formsMock.remove).not.toHaveBeenCalled();
    });
  });
});
