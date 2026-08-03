import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ServiceAgreementsV1Controller } from '../../../../../src/modules/service-agreements/controllers/service-agreements-v1.controller';
import type { AuthUser } from '@repo/nestjs/auth';
import type {
  CreateServiceAgreementDto,
  ListServiceAgreementsDto,
  UpdateServiceAgreementDto,
} from '../../../../../src/modules/service-agreements/dtos/service-agreement.dtos';

describe('ServiceAgreementsV1Controller', () => {
  let controller: ServiceAgreementsV1Controller;
  let serviceMock: any;

  const mockUser: AuthUser = {
    id: 'user-123',
    roles: ['admin'],
    claims: {
      sub: 'user-123-sub',
      email: 'admin@example.com',
      name: 'Admin User',
    },
  };

  const mockActor = {
    id: 'user-123',
    isAdmin: true,
  };

  beforeEach(() => {
    serviceMock = {
      create: vi.fn(),
      list: vi.fn(),
      get: vi.fn(),
      updateDraft: vi.fn(),
      addVersion: vi.fn(),
      publish: vi.fn(),
    };

    controller = new ServiceAgreementsV1Controller(serviceMock);
  });

  describe('create', () => {
    it('creates a service agreement', async () => {
      const body: CreateServiceAgreementDto = {
        workspaceId: 'e6005cbb-84f9-467a-bb48-e8cbffc9c991',
        data: { title: 'Agreement Title' },
      };
      const mockResult = { id: 'agreement-123', title: 'Agreement Title' };
      serviceMock.create.mockResolvedValue(mockResult);

      const result = await controller.create(mockUser, body);

      expect(serviceMock.create).toHaveBeenCalledWith(mockActor, body);
      expect(result).toEqual(mockResult);
    });
  });

  describe('list', () => {
    it('returns agreements wrapped in items object', async () => {
      const query: ListServiceAgreementsDto = { workspaceId: 'ws-1' };
      const mockList = [{ id: 'agreement-123' }];
      serviceMock.list.mockResolvedValue(mockList);

      const result = await controller.list(mockUser, query);

      expect(serviceMock.list).toHaveBeenCalledWith(mockActor, query);
      expect(result).toEqual({ items: mockList });
    });
  });

  describe('get', () => {
    it('returns a single service agreement', async () => {
      const mockResult = { id: 'agreement-123' };
      serviceMock.get.mockResolvedValue(mockResult);

      const result = await controller.get(mockUser, 'agreement-123');

      expect(serviceMock.get).toHaveBeenCalledWith(mockActor, 'agreement-123');
      expect(result).toEqual(mockResult);
    });
  });

  describe('updateDraft', () => {
    it('updates a draft version of a service agreement', async () => {
      const body: UpdateServiceAgreementDto = {
        title: 'New Title',
        data: {
          schema: { type: 'object' },
          uischema: { type: 'VerticalLayout' },
          isOptional: true,
        },
      };
      const mockResult = { id: 'version-123', version: 1 };
      serviceMock.updateDraft.mockResolvedValue(mockResult);

      const result = await controller.updateDraft(mockUser, 'agreement-123', 'version-123', body);

      expect(serviceMock.updateDraft).toHaveBeenCalledWith(
        mockActor,
        'agreement-123',
        'version-123',
        body,
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe('addVersion', () => {
    it('adds a new version to the agreement', async () => {
      const mockResult = { id: 'version-124', version: 2 };
      serviceMock.addVersion.mockResolvedValue(mockResult);

      const result = await controller.addVersion(mockUser, 'agreement-123');

      expect(serviceMock.addVersion).toHaveBeenCalledWith(mockActor, 'agreement-123');
      expect(result).toEqual(mockResult);
    });
  });

  describe('publish', () => {
    it('publishes a version of the agreement', async () => {
      const mockResult = { id: 'version-123', status: 'published' };
      serviceMock.publish.mockResolvedValue(mockResult);

      const result = await controller.publish(mockUser, 'agreement-123', 'version-123');

      expect(serviceMock.publish).toHaveBeenCalledWith(mockActor, 'agreement-123', 'version-123');
      expect(result).toEqual(mockResult);
    });
  });
});
