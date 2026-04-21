import type { Request } from 'express';
import { ConsentDocumentTypesAdminV1Controller } from '../consent-document-types-admin-v1.controller';

describe('ConsentDocumentTypesAdminV1Controller', () => {
  let controller: ConsentDocumentTypesAdminV1Controller;
  let typesService: Record<string, jest.Mock>;
  let usersService: { getUserRoles: jest.Mock };

  const mockReq = (userId?: string): Request =>
    ({ session: { idir: { userId } } }) as unknown as Request;

  beforeEach(() => {
    typesService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findAllPublished: jest.fn(),
      findById: jest.fn(),
      delete: jest.fn(),
      createVersion: jest.fn(),
      getVersion: jest.fn(),
      upsertTranslation: jest.fn(),
      publishVersion: jest.fn(),
      archiveVersion: jest.fn(),
    };
    usersService = { getUserRoles: jest.fn() };
    controller = new ConsentDocumentTypesAdminV1Controller(
      typesService as never,
      usersService as never,
    );
  });

  it('create should delegate to typesService.create', () => {
    const body = { name: 'Test', description: 'Desc' };
    controller.create(body as never);
    expect(typesService.create).toHaveBeenCalledWith(body);
  });

  it('findAll should pass isAdmin=true for admin user', async () => {
    usersService.getUserRoles.mockResolvedValue(['admin']);
    typesService.findAll.mockResolvedValue({ data: [] });
    await controller.findAll({ page: 1, limit: 10 } as never, mockReq('u1'));
    expect(typesService.findAll).toHaveBeenCalledWith(1, 10, true, undefined);
  });

  it('findAll should pass isAdmin=false for staff user', async () => {
    usersService.getUserRoles.mockResolvedValue(['staff']);
    typesService.findAll.mockResolvedValue({ data: [] });
    await controller.findAll({ page: 1, limit: 10 } as never, mockReq('u1'));
    expect(typesService.findAll).toHaveBeenCalledWith(1, 10, false, undefined);
  });

  it('findAll isAdmin false when no userId', async () => {
    typesService.findAll.mockResolvedValue({ data: [] });
    await controller.findAll(
      { page: 1, limit: 10 } as never,
      { session: { idir: {} } } as unknown as Request,
    );
    expect(typesService.findAll).toHaveBeenCalledWith(1, 10, false, undefined);
  });

  it('findAllPublished should delegate', () => {
    controller.findAllPublished({ page: 1, limit: 10, search: 'q' } as never);
    expect(typesService.findAllPublished).toHaveBeenCalledWith(1, 10, 'q');
  });

  it('findOne should delegate with isAdmin', async () => {
    usersService.getUserRoles.mockResolvedValue(['admin']);
    await controller.findOne({ typeId: 't1' } as never, mockReq('u1'));
    expect(typesService.findById).toHaveBeenCalledWith('t1', true);
  });

  it('delete should delegate', () => {
    controller.delete({ typeId: 't1' } as never);
    expect(typesService.delete).toHaveBeenCalledWith('t1');
  });

  it('createVersion should delegate', () => {
    controller.createVersion({ typeId: 't1' } as never);
    expect(typesService.createVersion).toHaveBeenCalledWith('t1');
  });

  it('getVersion should delegate', () => {
    controller.getVersion({ typeId: 't1', versionId: 'v1' } as never);
    expect(typesService.getVersion).toHaveBeenCalledWith('t1', 'v1');
  });

  it('upsertTranslation should delegate', () => {
    const body = { name: 'N', description: 'D' };
    controller.upsertTranslation(
      { typeId: 't1', versionId: 'v1', locale: 'fr' } as never,
      body as never,
    );
    expect(typesService.upsertTranslation).toHaveBeenCalledWith(
      't1',
      'v1',
      'fr',
      body,
    );
  });

  it('publishVersion should delegate', () => {
    controller.publishVersion({ typeId: 't1', versionId: 'v1' } as never);
    expect(typesService.publishVersion).toHaveBeenCalledWith('t1', 'v1');
  });

  it('archiveVersion should delegate', () => {
    controller.archiveVersion({ typeId: 't1', versionId: 'v1' } as never);
    expect(typesService.archiveVersion).toHaveBeenCalledWith('t1', 'v1');
  });
});
