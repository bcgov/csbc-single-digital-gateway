import { describe, expect, it, vi, beforeEach } from 'vitest';
import { InternalServerErrorException } from '@nestjs/common';
import { ServiceAgreementTypeResolver } from '../../../../../src/modules/service-agreements/services/service-agreement-type.resolver';

const mockQuery = (resolvedValue: any) => {
  const qb = Promise.resolve(resolvedValue);
  return Object.assign(qb, {
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
  });
};

describe('ServiceAgreementTypeResolver', () => {
  let resolver: ServiceAgreementTypeResolver;
  let dbMock: any;

  beforeEach(() => {
    vi.clearAllMocks();

    dbMock = {
      select: vi.fn(),
    };

    resolver = new ServiceAgreementTypeResolver(dbMock);
  });

  describe('resolve', () => {
    it('throws InternalServerErrorException if the document type is not seeded', async () => {
      dbMock.select.mockImplementation(() => mockQuery([]));

      await expect(resolver.resolve()).rejects.toThrow(InternalServerErrorException);
    });

    it('resolves the seeded agreement type and returns default empty schema/uischema if missing', async () => {
      dbMock.select.mockImplementation(() =>
        mockQuery([
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
        mockQuery([
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
      dbMock.select.mockImplementation(() => mockQuery([]));

      const result = await resolver.schemaForVersion('ver-123');
      expect(result).toEqual({});
    });

    it('returns schema from version definition successfully', async () => {
      const mockSchema = { type: 'object' };
      dbMock.select.mockImplementation(() =>
        mockQuery([
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
