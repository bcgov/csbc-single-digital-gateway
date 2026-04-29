import type { Request } from 'express';
import { ServicesAdminV1Controller } from '../services-admin-v1.controller';

describe('ServicesAdminV1Controller', () => {
  let controller: ServicesAdminV1Controller;
  let servicesService: Record<string, jest.Mock>;
  let contributorsService: Record<string, jest.Mock>;
  let usersService: { getUserRoles: jest.Mock };

  const mockReq = (userId?: string): Request =>
    ({ session: { idir: { userId } } }) as unknown as Request;

  beforeEach(() => {
    servicesService = {
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
      findByService: jest.fn(),
      addContributor: jest.fn(),
      removeContributor: jest.fn(),
    };
    usersService = { getUserRoles: jest.fn() };
    controller = new ServicesAdminV1Controller(
      servicesService as never,
      contributorsService as never,
      usersService as never,
    );
  });

  it('create should delegate with userId and isAdmin', async () => {
    usersService.getUserRoles.mockResolvedValue(['admin']);
    const body = { serviceTypeId: 'st1', orgUnitId: 'o1', name: 'Svc' };
    await controller.create(body as never, mockReq('u1'));
    expect(servicesService.create).toHaveBeenCalledWith(body, 'u1', true);
  });

  it('create uses empty string when no userId', async () => {
    usersService.getUserRoles.mockResolvedValue([]);
    const body = { serviceTypeId: 'st1', orgUnitId: 'o1', name: 'Svc' };
    await controller.create(
      body as never,
      { session: { idir: {} } } as unknown as Request,
    );
    expect(servicesService.create).toHaveBeenCalledWith(body, '', false);
  });

  it('findAll should pass filters and admin status', async () => {
    usersService.getUserRoles.mockResolvedValue(['staff']);
    servicesService.findAll.mockResolvedValue({ data: [] });
    await controller.findAll(
      { page: 1, limit: 10, orgUnitId: 'o1', serviceTypeId: 'st1' } as never,
      mockReq('u1'),
    );
    expect(servicesService.findAll).toHaveBeenCalledWith(
      1,
      10,
      { orgUnitId: 'o1', serviceTypeId: 'st1' },
      'u1',
      false,
    );
  });

  it('findOne should delegate', () => {
    controller.findOne({ serviceId: 's1' } as never);
    expect(servicesService.findById).toHaveBeenCalledWith('s1');
  });

  it('createVersion should delegate', () => {
    controller.createVersion({ serviceId: 's1' } as never);
    expect(servicesService.createVersion).toHaveBeenCalledWith('s1');
  });

  it('getVersion should delegate', () => {
    controller.getVersion({ serviceId: 's1', versionId: 'v1' } as never);
    expect(servicesService.getVersion).toHaveBeenCalledWith('s1', 'v1');
  });

  it('upsertTranslation should delegate', () => {
    const body = { name: 'N', content: {} };
    controller.upsertTranslation(
      { serviceId: 's1', versionId: 'v1', locale: 'en' } as never,
      body as never,
    );
    expect(servicesService.upsertTranslation).toHaveBeenCalledWith(
      's1',
      'v1',
      'en',
      body,
    );
  });

  it('publishVersion should delegate', () => {
    controller.publishVersion({ serviceId: 's1', versionId: 'v1' } as never);
    expect(servicesService.publishVersion).toHaveBeenCalledWith('s1', 'v1');
  });

  it('archiveVersion should delegate', () => {
    controller.archiveVersion({ serviceId: 's1', versionId: 'v1' } as never);
    expect(servicesService.archiveVersion).toHaveBeenCalledWith('s1', 'v1');
  });

  it('getContributors should delegate', () => {
    controller.getContributors({ serviceId: 's1' } as never);
    expect(contributorsService.findByService).toHaveBeenCalledWith('s1');
  });

  it('addContributor should delegate', () => {
    controller.addContributor(
      { serviceId: 's1' } as never,
      { userId: 'u2', role: 'owner' } as never,
    );
    expect(contributorsService.addContributor).toHaveBeenCalledWith(
      's1',
      'u2',
      'owner',
    );
  });

  it('deleteService should delegate', () => {
    controller.deleteService({ serviceId: 's1' } as never);
    expect(servicesService.delete).toHaveBeenCalledWith('s1');
  });

  it('removeContributor should delegate', () => {
    controller.removeContributor({ serviceId: 's1', userId: 'u2' } as never);
    expect(contributorsService.removeContributor).toHaveBeenCalledWith(
      's1',
      'u2',
    );
  });
});
