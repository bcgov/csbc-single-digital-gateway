import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CatalogV1Controller } from '../../../../../src/modules/catalog/controllers/catalog-v1.controller';
import { CatalogService } from '../../../../../src/modules/catalog/services/catalog.service';
import type { ListServicesQueryDto } from '../../../../../src/modules/catalog/dtos/catalog.dtos';

describe('CatalogV1Controller Unit Test Suite', () => {
  let controller: CatalogV1Controller;
  let catalogServiceMock: any;

  beforeEach(() => {
    catalogServiceMock = {
      listServices: vi.fn(),
      getService: vi.fn(),
      getServiceVersion: vi.fn(),
    };
    controller = new CatalogV1Controller(catalogServiceMock as unknown as CatalogService);
  });

  describe('list', () => {
    it('should list catalog services based on the query', async () => {
      const mockQuery: ListServicesQueryDto = { q: 'health', limit: 50 };
      const mockServices = [
        { id: 'service-1', title: 'Health Service' },
        { id: 'service-2', title: 'Mental Health Support' },
      ];
      catalogServiceMock.listServices.mockResolvedValue(mockServices);

      const result = await controller.list(mockQuery);

      expect(catalogServiceMock.listServices).toHaveBeenCalledWith(mockQuery);
      expect(result).toEqual({ items: mockServices });
    });
  });

  describe('get', () => {
    it('should retrieve detail of a specific service', async () => {
      const mockServiceId = 'service-123';
      const mockServiceDetail = {
        id: mockServiceId,
        title: 'Health Service',
        description: 'Details about health service',
      };
      catalogServiceMock.getService.mockResolvedValue(mockServiceDetail);

      const result = await controller.get(mockServiceId);

      expect(catalogServiceMock.getService).toHaveBeenCalledWith(mockServiceId);
      expect(result).toEqual(mockServiceDetail);
    });
  });

  describe('getVersion', () => {
    it('should retrieve a specific version of a service', async () => {
      const mockServiceId = 'service-123';
      const mockVersionId = 'version-456';
      const mockServiceVersion = {
        id: mockVersionId,
        serviceId: mockServiceId,
        version: 1,
        status: 'published',
      };
      catalogServiceMock.getServiceVersion.mockResolvedValue(mockServiceVersion);

      const result = await controller.getVersion(mockServiceId, mockVersionId);

      expect(catalogServiceMock.getServiceVersion).toHaveBeenCalledWith(
        mockServiceId,
        mockVersionId,
      );
      expect(result).toEqual(mockServiceVersion);
    });
  });
});
