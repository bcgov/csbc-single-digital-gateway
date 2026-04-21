import type { Request } from 'express';
import { ConsentDocumentsAdminV1Controller } from '../consent-documents-admin-v1.controller';

describe('ConsentDocumentsAdminV1Controller', () => {
  let controller: ConsentDocumentsAdminV1Controller;
  let documentsService: Record<string, jest.Mock>;
  let contributorsService: Record<string, jest.Mock>;
  let usersService: { getUserRoles: jest.Mock };

  const mockReq = (userId?: string): Request =>
    ({ session: { idir: { userId } } }) as unknown as Request;

  beforeEach(() => {
    documentsService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      createVersion: jest.fn(),
      getVersion: jest.fn(),
      upsertTranslation: jest.fn(),
      publishVersion: jest.fn(),
      archiveVersion: jest.fn(),
      delete: jest.fn(),
    };
    contributorsService = {
      findByDocument: jest.fn(),
      addContributor: jest.fn(),
      removeContributor: jest.fn(),
    };
    usersService = { getUserRoles: jest.fn() };
    controller = new ConsentDocumentsAdminV1Controller(
      documentsService as never,
      contributorsService as never,
      usersService as never,
    );
  });

  it('create should delegate with userId and isAdmin', async () => {
    usersService.getUserRoles.mockResolvedValue(['admin']);
    const body = { consentDocumentTypeId: 'ct1', orgUnitId: 'o1', name: 'Doc' };
    await controller.create(body as never, mockReq('u1'));
    expect(documentsService.create).toHaveBeenCalledWith(body, 'u1', true);
  });

  it('create uses empty string when no userId', async () => {
    usersService.getUserRoles.mockResolvedValue([]);
    const body = { consentDocumentTypeId: 'ct1', orgUnitId: 'o1', name: 'Doc' };
    await controller.create(
      body as never,
      { session: { idir: {} } } as unknown as Request,
    );
    expect(documentsService.create).toHaveBeenCalledWith(body, '', false);
  });

  it('findAll should pass filters and admin status', async () => {
    usersService.getUserRoles.mockResolvedValue(['staff']);
    documentsService.findAll.mockResolvedValue({ data: [] });
    await controller.findAll(
      {
        page: 1,
        limit: 10,
        orgUnitId: 'o1',
        consentDocumentTypeId: 'ct1',
      } as never,
      mockReq('u1'),
    );
    expect(documentsService.findAll).toHaveBeenCalledWith(
      1,
      10,
      { orgUnitId: 'o1', consentDocumentTypeId: 'ct1' },
      'u1',
      false,
    );
  });

  it('findOne should delegate', () => {
    controller.findOne({ docId: 'd1' } as never);
    expect(documentsService.findById).toHaveBeenCalledWith('d1');
  });

  it('createVersion should delegate', () => {
    controller.createVersion({ docId: 'd1' } as never);
    expect(documentsService.createVersion).toHaveBeenCalledWith('d1');
  });

  it('getVersion should delegate', () => {
    controller.getVersion({ docId: 'd1', versionId: 'v1' } as never);
    expect(documentsService.getVersion).toHaveBeenCalledWith('d1', 'v1');
  });

  it('upsertTranslation should delegate', () => {
    const body = { name: 'N', content: {} };
    controller.upsertTranslation(
      { docId: 'd1', versionId: 'v1', locale: 'en' } as never,
      body as never,
    );
    expect(documentsService.upsertTranslation).toHaveBeenCalledWith(
      'd1',
      'v1',
      'en',
      body,
    );
  });

  it('publishVersion should delegate', () => {
    controller.publishVersion({ docId: 'd1', versionId: 'v1' } as never);
    expect(documentsService.publishVersion).toHaveBeenCalledWith('d1', 'v1');
  });

  it('archiveVersion should delegate', () => {
    controller.archiveVersion({ docId: 'd1', versionId: 'v1' } as never);
    expect(documentsService.archiveVersion).toHaveBeenCalledWith('d1', 'v1');
  });

  it('getContributors should delegate', () => {
    controller.getContributors({ docId: 'd1' } as never);
    expect(contributorsService.findByDocument).toHaveBeenCalledWith('d1');
  });

  it('addContributor should delegate', () => {
    controller.addContributor(
      { docId: 'd1' } as never,
      { userId: 'u2', role: 'owner' } as never,
    );
    expect(contributorsService.addContributor).toHaveBeenCalledWith(
      'd1',
      'u2',
      'owner',
    );
  });

  it('deleteDocument should delegate', () => {
    controller.deleteDocument({ docId: 'd1' } as never);
    expect(documentsService.delete).toHaveBeenCalledWith('d1');
  });

  it('removeContributor should delegate', () => {
    controller.removeContributor({ docId: 'd1', userId: 'u2' } as never);
    expect(contributorsService.removeContributor).toHaveBeenCalledWith(
      'd1',
      'u2',
    );
  });
});
