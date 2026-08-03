import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ServicesV1Controller } from '../../../../../src/modules/services/controllers/services-v1.controller';
import type { AuthUser } from '@repo/nestjs/auth';
import type {
  CreateServiceDto,
  ListServicesPageQueryDto,
  ListServicesQueryDto,
  UpdateVersionDataDto,
} from '../../../../../src/modules/services/dtos/service.dtos';

describe('ServicesV1Controller', () => {
  let controller: ServicesV1Controller;
  let servicesServiceMock: any;
  let serviceVersionsServiceMock: any;

  const mockUser: AuthUser = {
    id: 'user-1',
    roles: ['staff'],
    claims: {
      sub: 'user-1-sub',
      email: 'test@example.com',
      name: 'Test User',
    },
  };

  beforeEach(() => {
    servicesServiceMock = {
      list: vi.fn(),
      create: vi.fn(),
      getServiceDefinition: vi.fn(),
      listForms: vi.fn(),
      get: vi.fn(),
      remove: vi.fn(),
      archive: vi.fn(),
      reactivate: vi.fn(),
    };

    serviceVersionsServiceMock = {
      updateDraft: vi.fn(),
      publish: vi.fn(),
      archive: vi.fn(),
      addVersion: vi.fn(),
      discardVersion: vi.fn(),
    };

    controller = new ServicesV1Controller(servicesServiceMock, serviceVersionsServiceMock);
  });

  describe('list', () => {
    it('returns a list of services wrapped in an items object', async () => {
      const query: ListServicesPageQueryDto = {
        workspaceId: 'e6005cbb-84f9-467a-bb48-e8cbffc9c991',
      } as any;
      const mockResult = [{ id: 'service-1', title: 'Service 1' }];
      servicesServiceMock.list.mockResolvedValue({ items: mockResult });

      const result = await controller.list(mockUser, query);

      expect(servicesServiceMock.list).toHaveBeenCalledWith(mockUser.id, query);
      expect(result).toEqual({ items: mockResult });
    });
  });

  describe('create', () => {
    it('creates a service via the service', async () => {
      const body: CreateServiceDto = {
        workspaceId: 'e6005cbb-84f9-467a-bb48-e8cbffc9c991',
        title: 'New Service',
        data: {},
        applications: [],
      };
      const mockResult = { id: 'service-1', title: 'New Service' };
      servicesServiceMock.create.mockResolvedValue(mockResult);

      const result = await controller.create(mockUser, body);

      expect(servicesServiceMock.create).toHaveBeenCalledWith(mockUser.id, body);
      expect(result).toEqual(mockResult);
    });
  });

  describe('getDefinition', () => {
    it('returns the service type schema definition', () => {
      const mockDef = { schema: { type: 'object' }, uischema: {} };
      servicesServiceMock.getServiceDefinition.mockReturnValue(mockDef);

      const result = controller.getDefinition();

      expect(servicesServiceMock.getServiceDefinition).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockDef);
    });
  });

  describe('listForms', () => {
    it('returns the forms catalog for a workspace', async () => {
      const query: ListServicesQueryDto = {
        workspaceId: 'e6005cbb-84f9-467a-bb48-e8cbffc9c991',
      };
      const mockResult = [{ documentId: 'form-1', title: 'Form 1' }];
      servicesServiceMock.listForms.mockResolvedValue(mockResult);

      const result = await controller.listForms(mockUser, query);

      expect(servicesServiceMock.listForms).toHaveBeenCalledWith(mockUser.id, query.workspaceId);
      expect(result).toEqual({ items: mockResult });
    });
  });

  describe('get', () => {
    it('retrieves detailed service by id', async () => {
      const mockResult = { id: 'service-1', title: 'Service 1', versions: [] };
      servicesServiceMock.get.mockResolvedValue(mockResult);

      const result = await controller.get(mockUser, 'service-1');

      expect(servicesServiceMock.get).toHaveBeenCalledWith(mockUser.id, 'service-1');
      expect(result).toEqual(mockResult);
    });
  });

  describe('removeService', () => {
    it('deletes a service via the service', async () => {
      servicesServiceMock.remove.mockResolvedValue(undefined);

      await controller.removeService(mockUser, 'service-1');

      expect(servicesServiceMock.remove).toHaveBeenCalledWith(mockUser.id, 'service-1');
    });
  });

  describe('archiveService', () => {
    it('archives a service via the service', async () => {
      servicesServiceMock.archive.mockResolvedValue(undefined);

      await controller.archiveService(mockUser, 'service-1');

      expect(servicesServiceMock.archive).toHaveBeenCalledWith(mockUser.id, 'service-1');
    });
  });

  describe('reactivateService', () => {
    it('reactivates a service via the service', async () => {
      servicesServiceMock.reactivate.mockResolvedValue(undefined);

      await controller.reactivateService(mockUser, 'service-1');

      expect(servicesServiceMock.reactivate).toHaveBeenCalledWith(mockUser.id, 'service-1');
    });
  });

  describe('updateDraft', () => {
    it('updates a draft version via the service versions service', async () => {
      const body: UpdateVersionDataDto = {
        data: { updated: true },
      };
      const mockResult = { id: 'version-1', data: { updated: true } };
      serviceVersionsServiceMock.updateDraft.mockResolvedValue(mockResult);

      const result = await controller.updateDraft(mockUser, 'service-1', 'version-1', body);

      expect(serviceVersionsServiceMock.updateDraft).toHaveBeenCalledWith(
        mockUser.id,
        'service-1',
        'version-1',
        body,
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe('publish', () => {
    it('publishes a service version via the service versions service', async () => {
      const mockResult = { id: 'version-1', status: 'published' };
      serviceVersionsServiceMock.publish.mockResolvedValue(mockResult);

      const result = await controller.publish(mockUser, 'service-1', 'version-1');

      expect(serviceVersionsServiceMock.publish).toHaveBeenCalledWith(
        mockUser.id,
        'service-1',
        'version-1',
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe('archive', () => {
    it('archives a service version via the service versions service', async () => {
      const mockResult = { id: 'version-1', status: 'archived' };
      serviceVersionsServiceMock.archive.mockResolvedValue(mockResult);

      const result = await controller.archive(mockUser, 'service-1', 'version-1');

      expect(serviceVersionsServiceMock.archive).toHaveBeenCalledWith(
        mockUser.id,
        'service-1',
        'version-1',
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe('addVersion', () => {
    it('creates a new draft version via the service versions service', async () => {
      const mockResult = { id: 'version-2', status: 'draft' };
      serviceVersionsServiceMock.addVersion.mockResolvedValue(mockResult);

      const result = await controller.addVersion(mockUser, 'service-1');

      expect(serviceVersionsServiceMock.addVersion).toHaveBeenCalledWith(mockUser.id, 'service-1');
      expect(result).toEqual(mockResult);
    });
  });

  describe('discardVersion', () => {
    it('discards a draft version via the service versions service', async () => {
      serviceVersionsServiceMock.discardVersion.mockResolvedValue(undefined);

      await controller.discardVersion(mockUser, 'service-1', 'version-1');

      expect(serviceVersionsServiceMock.discardVersion).toHaveBeenCalledWith(
        mockUser.id,
        'service-1',
        'version-1',
      );
    });
  });
});
