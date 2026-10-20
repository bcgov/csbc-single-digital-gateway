import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { type Database, documentReferences, documentVersions, documents } from '@repo/database';
import { CatalogService } from '../../../../../src/modules/catalog/services/catalog.service';
import { createMockDb } from '../../../../utils/create-mock-db';

describe('CatalogService Unit Test Suite', () => {
  let service: CatalogService;
  let dbMock: any;
  let mockResponse: any;

  beforeEach(() => {
    const mocks = createMockDb();
    dbMock = mocks.builderMock;
    mockResponse = mocks.mockResponse;
    service = new CatalogService(dbMock as unknown as Database);
  });

  describe('listServices', () => {
    it('Should list services with search and limit filters applied', async () => {
      const mockRows = [
        {
          id: 'service-1',
          docTitle: 'Service 1 Title',
          docDescription: 'Service 1 Desc',
          data: { title: 'Custom Service 1', description: 'Custom Desc 1' },
        },
        {
          id: 'service-2',
          docTitle: 'Service 2 Title',
          docDescription: 'Service 2 Desc',
          data: {}, // no custom fields, should fall back
        },
      ];

      mockResponse(mockRows, documents, 'select');

      const result = await service.listServices({ q: 'health', limit: 10 });

      expect(result).toEqual([
        {
          id: 'service-1',
          title: 'Custom Service 1',
          description: 'Custom Desc 1',
        },
        {
          id: 'service-2',
          title: 'Service 2 Title',
          description: 'Service 2 Desc',
        },
      ]);
    });

    it('Should handle undefined search parameter', async () => {
      const mockRows = [
        {
          id: 'service-1',
          docTitle: 'Service 1 Title',
          docDescription: 'Service 1 Desc',
          data: {},
        },
      ];

      mockResponse(mockRows, documents, 'select');

      const result = await service.listServices({ limit: 50 });

      expect(result).toEqual([
        {
          id: 'service-1',
          title: 'Service 1 Title',
          description: 'Service 1 Desc',
        },
      ]);
    });

    it('Should handle empty search parameter ("")', async () => {
      const mockRows = [
        {
          id: 'service-1',
          docTitle: 'Service 1 Title',
          docDescription: 'Service 1 Desc',
          data: {},
        },
      ];

      mockResponse(mockRows, documents, 'select');

      const result = await service.listServices({ q: '', limit: 50 });

      expect(result).toEqual([
        {
          id: 'service-1',
          title: 'Service 1 Title',
          description: 'Service 1 Desc',
        },
      ]);
    });

    it('Should not add match filter if searchFilter returns undefined', async () => {
      const searchSpy = vi.spyOn(service as any, 'searchFilter').mockReturnValue(undefined);
      mockResponse([], documents, 'select');

      await service.listServices({ q: 'health', limit: 10 });

      expect(searchSpy).toHaveBeenCalledWith('health');
      searchSpy.mockRestore();
    });
  });

  describe('getService', () => {
    it('Should throw NotFoundException if service is not found when fetching a service', async () => {
      mockResponse([], documents, 'select');

      await expect(service.getService('svc-invalid')).rejects.toThrow(NotFoundException);
    });

    it('Should return service detail with associated applications on success', async () => {
      const mockServiceRow = [
        {
          id: 'service-123',
          docTitle: 'Fallback Title',
          docDescription: 'Fallback Desc',
          versionId: 'version-456',
          version: 1,
          publishedAt: new Date('2026-07-08T12:00:00Z'),
          data: { title: 'Published Service Title', description: 'Published Service Desc' },
          definition: { schema: { type: 'object' }, uischema: { type: 'VerticalLayout' } },
        },
      ];

      const mockApplicationsRow = [
        {
          id: 'ref-1',
          label: 'Apply Online',
          title: 'Intake Form',
          formId: 'form-abc',
          formVersionId: 'form-ver-xyz',
          kind: 'form',
          targetData: { url: null },
        },
      ];

      mockResponse(mockServiceRow, documents, 'select');
      mockResponse(mockApplicationsRow, documentReferences, 'select');

      const result = await service.getService('service-123');

      expect(result).toEqual({
        id: 'service-123',
        title: 'Published Service Title',
        description: 'Published Service Desc',
        publishedVersionId: 'version-456',
        version: 1,
        publishedAt: '2026-07-08T12:00:00.000Z',
        data: { title: 'Published Service Title', description: 'Published Service Desc' },
        schema: { type: 'object' },
        uischema: { type: 'VerticalLayout' },
        applications: [
          {
            id: 'ref-1',
            label: 'Apply Online',
            title: 'Intake Form',
            formId: 'form-abc',
            formVersionId: 'form-ver-xyz',
            kind: 'form',
            url: null,
          },
        ],
      });
    });

    it('Should map applications with external url correctly', async () => {
      const mockServiceRow = [
        {
          id: 'service-123',
          docTitle: 'Fallback Title',
          docDescription: 'Fallback Desc',
          versionId: 'version-456',
          version: 1,
          publishedAt: new Date('2026-07-08T12:00:00Z'),
          data: { title: 'Published Service Title', description: 'Published Service Desc' },
          definition: { schema: { type: 'object' }, uischema: { type: 'VerticalLayout' } },
        },
      ];

      const mockApplicationsRow = [
        {
          id: 'ref-1',
          label: 'Apply Externally 1',
          title: 'External Site 1',
          formId: 'form-abc',
          formVersionId: 'form-ver-xyz',
          kind: 'external-application',
          targetData: { url: 'https://example.com' },
        },
        {
          id: 'ref-2',
          label: 'Apply Externally 2',
          title: 'External Site 2',
          formId: 'form-def',
          formVersionId: 'form-ver-uvw',
          kind: 'external-application',
          targetData: { url: 123 },
        },
      ];

      mockResponse(mockServiceRow, documents, 'select');
      mockResponse(mockApplicationsRow, documentReferences, 'select');

      const result = await service.getService('service-123');

      expect(result.applications).toEqual([
        {
          id: 'ref-1',
          label: 'Apply Externally 1',
          title: 'External Site 1',
          formId: 'form-abc',
          formVersionId: 'form-ver-xyz',
          kind: 'external-application',
          url: 'https://example.com',
        },
        {
          id: 'ref-2',
          label: 'Apply Externally 2',
          title: 'External Site 2',
          formId: 'form-def',
          formVersionId: 'form-ver-uvw',
          kind: 'external-application',
          url: null,
        },
      ]);
    });

    it('Should handle null publishedAt on success', async () => {
      const mockServiceRow = [
        {
          id: 'service-123',
          docTitle: 'Fallback Title',
          docDescription: 'Fallback Desc',
          versionId: 'version-456',
          version: 1,
          publishedAt: null,
          data: { title: 'Published Service Title', description: 'Published Service Desc' },
          definition: { schema: { type: 'object' }, uischema: { type: 'VerticalLayout' } },
        },
      ];

      mockResponse(mockServiceRow, documents, 'select');
      mockResponse([], documentReferences, 'select');

      const result = await service.getService('service-123');
      expect(result.publishedAt).toBeNull();
    });
  });

  describe('getServiceVersion', () => {
    it('Should throw NotFoundException if version is not found', async () => {
      mockResponse([], documentVersions, 'select');

      await expect(service.getServiceVersion('service-123', 'version-invalid')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('Should return service version details on success', async () => {
      const mockVersionRow = [
        {
          id: 'version-456',
          version: 2,
          status: 'published',
          data: { title: 'Service Title v2', description: 'Service Desc v2' },
          createdAt: new Date('2026-07-08T10:00:00Z'),
          publishedAt: new Date('2026-07-08T12:00:00Z'),
          archivedAt: null,
          docTitle: 'Fallback Title',
          definition: { schema: { type: 'object' }, uischema: { type: 'VerticalLayout' } },
        },
      ];

      mockResponse(mockVersionRow, documentVersions, 'select');

      const result = await service.getServiceVersion('service-123', 'version-456');

      expect(result).toEqual({
        id: 'version-456',
        serviceId: 'service-123',
        version: 2,
        status: 'published',
        title: 'Service Title v2',
        data: { title: 'Service Title v2', description: 'Service Desc v2' },
        schema: { type: 'object' },
        uischema: { type: 'VerticalLayout' },
        createdAt: '2026-07-08T10:00:00.000Z',
        publishedAt: '2026-07-08T12:00:00.000Z',
        archivedAt: null,
      });
    });

    it('Should handle null publishedAt and archivedAt on success', async () => {
      const mockVersionRow = [
        {
          id: 'version-456',
          version: 2,
          status: 'published',
          data: { title: 'Service Title v2', description: 'Service Desc v2' },
          createdAt: new Date('2026-07-08T10:00:00Z'),
          publishedAt: null,
          archivedAt: null,
          docTitle: 'Fallback Title',
          definition: { schema: { type: 'object' }, uischema: { type: 'VerticalLayout' } },
        },
      ];

      mockResponse(mockVersionRow, documentVersions, 'select');

      const result = await service.getServiceVersion('service-123', 'version-456');
      expect(result.publishedAt).toBeNull();
      expect(result.archivedAt).toBeNull();
    });

    it('Should return service version details with archived status and defined archivedAt/publishedAt on success', async () => {
      const mockVersionRow = [
        {
          id: 'version-456',
          version: 2,
          status: 'archived',
          data: { title: 'Service Title v2', description: 'Service Desc v2' },
          createdAt: new Date('2026-07-08T10:00:00Z'),
          publishedAt: new Date('2026-07-08T12:00:00Z'),
          archivedAt: new Date('2026-07-08T14:00:00Z'),
          docTitle: 'Fallback Title',
          definition: { schema: { type: 'object' }, uischema: { type: 'VerticalLayout' } },
        },
      ];

      mockResponse(mockVersionRow, documentVersions, 'select');

      const result = await service.getServiceVersion('service-123', 'version-456');

      expect(result).toEqual({
        id: 'version-456',
        serviceId: 'service-123',
        version: 2,
        status: 'archived',
        title: 'Service Title v2',
        data: { title: 'Service Title v2', description: 'Service Desc v2' },
        schema: { type: 'object' },
        uischema: { type: 'VerticalLayout' },
        createdAt: '2026-07-08T10:00:00.000Z',
        publishedAt: '2026-07-08T12:00:00.000Z',
        archivedAt: '2026-07-08T14:00:00.000Z',
      });
    });

    it('Should throw NotFoundException if version exists but status is neither published nor archived', async () => {
      const mockVersionRow = [
        {
          id: 'version-456',
          version: 2,
          status: 'draft',
          data: { title: 'Service Title v2', description: 'Service Desc v2' },
          createdAt: new Date('2026-07-08T10:00:00Z'),
          publishedAt: null,
          archivedAt: null,
          docTitle: 'Fallback Title',
          definition: { schema: { type: 'object' }, uischema: { type: 'VerticalLayout' } },
        },
      ];

      mockResponse(mockVersionRow, documentVersions, 'select');

      await expect(service.getServiceVersion('service-123', 'version-456')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
