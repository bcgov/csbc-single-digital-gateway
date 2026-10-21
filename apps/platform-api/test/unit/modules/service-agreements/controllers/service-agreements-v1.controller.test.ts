import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ServiceAgreementsV1Controller } from '../../../../../src/modules/service-agreements/controllers/service-agreements-v1.controller';
import type {
  CreateServiceAgreementDto,
  ListServiceAgreementsDto,
  UpdateServiceAgreementDto,
} from '../../../../../src/modules/service-agreements/dtos/service-agreement.dtos';
import { createMockList } from '../../../../utils/test-helpers';
import { adminUser } from '../../../../utils/fixtures';

describe('ServiceAgreementsV1Controller', () => {
  let controller: ServiceAgreementsV1Controller;
  let serviceMock: any;

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
    it('Should create a service agreement', async () => {
      const body: CreateServiceAgreementDto = {
        workspaceId: 'e6005cbb-84f9-467a-bb48-e8cbffc9c991',
        title: 'Agreement Title',
      };
      const mockResult = { id: 'agreement-123', title: 'Agreement Title' };
      serviceMock.create.mockResolvedValue(mockResult);

      const result = await controller.create(adminUser, body);

      expect(serviceMock.create).toHaveBeenCalledWith(mockActor, body);
      expect(result).toEqual(mockResult);
    });
  });

  describe('list', () => {
    it('Should return agreements wrapped in items object', async () => {
      const query: ListServiceAgreementsDto = { workspaceId: 'ws-1' };
      const mockList = createMockList('agreement-123');
      serviceMock.list.mockResolvedValue(mockList);

      const result = await controller.list(adminUser, query);

      expect(serviceMock.list).toHaveBeenCalledWith(mockActor, query);
      expect(result).toEqual({ items: mockList });
    });
  });

  describe('get', () => {
    it('Should return a single service agreement', async () => {
      const mockResult = { id: 'agreement-123' };
      serviceMock.get.mockResolvedValue(mockResult);

      const result = await controller.get(adminUser, 'agreement-123');

      expect(serviceMock.get).toHaveBeenCalledWith(mockActor, 'agreement-123');
      expect(result).toEqual(mockResult);
    });
  });

  describe('updateDraft', () => {
    it('Should update a draft version of a service agreement', async () => {
      const body: UpdateServiceAgreementDto = {
        content: {
          schema: { type: 'object', properties: {} },
          variants: { default: { type: 'Form', elements: [], label: 'New Title' } },
        },
      };
      const mockResult = { id: 'version-123', version: 1 };
      serviceMock.updateDraft.mockResolvedValue(mockResult);

      const result = await controller.updateDraft(adminUser, 'agreement-123', 'version-123', body);

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
    it('Should add a new version to the agreement', async () => {
      const mockResult = { id: 'version-124', version: 2 };
      serviceMock.addVersion.mockResolvedValue(mockResult);

      const result = await controller.addVersion(adminUser, 'agreement-123');

      expect(serviceMock.addVersion).toHaveBeenCalledWith(mockActor, 'agreement-123');
      expect(result).toEqual(mockResult);
    });
  });

  describe('publish', () => {
    it('Should publish a version of the agreement', async () => {
      const mockResult = { id: 'version-123', status: 'published' };
      serviceMock.publish.mockResolvedValue(mockResult);

      const result = await controller.publish(adminUser, 'agreement-123', 'version-123');

      expect(serviceMock.publish).toHaveBeenCalledWith(mockActor, 'agreement-123', 'version-123');
      expect(result).toEqual(mockResult);
    });
  });
});
