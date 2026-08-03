import { describe, expect, it, vi, beforeEach } from 'vitest';
import { InternalServerErrorException } from '@nestjs/common';
import { ServiceTypeResolver } from '../../../../../src/modules/services/services/service-type.resolver';

const mockQuery = (resolvedValue: any) => {
  const qb = Promise.resolve(resolvedValue);
  return Object.assign(qb, {
    from: vi.fn().mockReturnValue(qb),
    innerJoin: vi.fn().mockReturnValue(qb),
    limit: vi.fn().mockReturnValue(qb),
    where: vi.fn().mockReturnValue(qb),
  });
};

describe('ServiceTypeResolver', () => {
  let resolver: ServiceTypeResolver;
  let dbMock: any;

  beforeEach(() => {
    dbMock = Object.assign(Promise.resolve([]), {
      select: vi.fn().mockImplementation(() => mockQuery([])),
    });

    resolver = new ServiceTypeResolver(dbMock);
  });

  describe('resolve', () => {
    it('successfully resolves the seeded service type and its published version', async () => {
      const mockResult = {
        typeId: 'service-type-uuid',
        typeVersionId: 'service-version-uuid',
        definition: {
          schema: { type: 'object', properties: { field: { type: 'string' } } },
          uischema: { type: 'VerticalLayout', elements: [] },
        },
      };

      dbMock.select.mockReturnValueOnce(mockQuery([mockResult]));

      const result = await resolver.resolve();

      expect(dbMock.select).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        typeId: 'service-type-uuid',
        typeVersionId: 'service-version-uuid',
        schema: { type: 'object', properties: { field: { type: 'string' } } },
        uischema: { type: 'VerticalLayout', elements: [] },
      });
    });

    it('falls back to empty schema/uischema objects when definition is empty or keys are missing', async () => {
      const mockResult = {
        typeId: 'service-type-uuid',
        typeVersionId: 'service-version-uuid',
        definition: {},
      };

      dbMock.select.mockReturnValueOnce(mockQuery([mockResult]));

      const result = await resolver.resolve();

      expect(result.schema).toEqual({});
      expect(result.uischema).toEqual({});
    });

    it('throws InternalServerErrorException if service document type has not been seeded', async () => {
      dbMock.select.mockReturnValueOnce(mockQuery([]));

      await expect(resolver.resolve()).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('schemaForVersion', () => {
    it('returns the JSON schema for a valid type version id', async () => {
      const mockResult = {
        definition: {
          schema: { type: 'object' },
        },
      };

      dbMock.select.mockReturnValueOnce(mockQuery([mockResult]));

      const result = await resolver.schemaForVersion('service-version-uuid');

      expect(dbMock.select).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ type: 'object' });
    });

    it('falls back to empty object when row is not found or schema is missing', async () => {
      dbMock.select.mockReturnValueOnce(mockQuery([]));

      const result = await resolver.schemaForVersion('service-version-uuid');

      expect(result).toEqual({});
    });
  });
});
