import { describe, expect, it, vi, beforeEach } from 'vitest';
import { InternalServerErrorException } from '@nestjs/common';
import { ServiceAgreementTypeResolver } from '../../../../../src/modules/service-agreements/services/service-agreement-type.resolver';
import { createMockQuery } from '../../../../utils/create-mock-query';
import { createMockDb } from '../../../../utils/create-db-mock';

describe('ServiceAgreementTypeResolver', () => {
  let resolver: ServiceAgreementTypeResolver;
  let dbMock: any;

  beforeEach(() => {
    vi.clearAllMocks();

    const mocks = createMockDb();
    dbMock = mocks.dbMock;

    resolver = new ServiceAgreementTypeResolver(dbMock);
  });

  describe('resolve', () => {
    it('throws InternalServerErrorException if the document type is not seeded', async () => {
      dbMock.select.mockImplementation(() => createMockQuery([]));

      await expect(resolver.resolve()).rejects.toThrow(InternalServerErrorException);
    });

    it('resolves the seeded agreement type and returns default empty schema/uischema if missing', async () => {
      dbMock.select.mockImplementation(() =>
        createMockQuery([
          {
            typeId: 'type-123',
            typeVersionId: 'ver-123',
            definition: {},
          },
        ]),
      );

      const result = await resolver.resolve();

      expect(result).toEqual({
        typeId: 'type-123',
        typeVersionId: 'ver-123',
        schema: {},
        uischema: {},
      });
    });

    it('resolves type details and custom definition schema/uischema successfully', async () => {
      dbMock.select.mockImplementation(() =>
        createMockQuery([
          {
            typeId: 'type-123',
            typeVersionId: 'ver-123',
            definition: {
              schema: { type: 'object', properties: {} },
              uischema: { type: 'VerticalLayout', elements: [] },
            },
          },
        ]),
      );

      const result = await resolver.resolve();

      expect(result).toEqual({
        typeId: 'type-123',
        typeVersionId: 'ver-123',
        schema: { type: 'object', properties: {} },
        uischema: { type: 'VerticalLayout', elements: [] },
      });
    });
  });

  describe('schemaForVersion', () => {
    it('returns empty schema if version is not found', async () => {
      dbMock.select.mockImplementation(() => createMockQuery([]));

      const result = await resolver.schemaForVersion('ver-123');
      expect(result).toEqual({});
    });

    it('returns schema from version definition successfully', async () => {
      const mockSchema = { type: 'object' };
      dbMock.select.mockImplementation(() =>
        createMockQuery([
          {
            definition: {
              schema: mockSchema,
            },
          },
        ]),
      );

      const result = await resolver.schemaForVersion('ver-123');
      expect(result).toEqual(mockSchema);
    });
  });
});
