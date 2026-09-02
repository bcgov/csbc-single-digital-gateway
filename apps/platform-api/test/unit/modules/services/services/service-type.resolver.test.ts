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

/**
 * Feature 174. `definitionForVersion` resolves the { schema, uischema } bound to a SPECIFIC
 * document type version (via document_versions.type_version_id), rather than whichever type version
 * happens to be published now. This is what makes each service version render against the template
 * it was actually authored under.
 */
describe('ServiceTypeResolver.definitionForVersion (feature 174)', () => {
  let resolver: ServiceTypeResolver;
  let dbMock: any;

  beforeEach(() => {
    dbMock = Object.assign(Promise.resolve([]), {
      select: vi.fn().mockImplementation(() => mockQuery([])),
    });
    resolver = new ServiceTypeResolver(dbMock);
  });

  it('should return the schema and uischema of the given type version', async () => {
    dbMock.select.mockReturnValueOnce(
      mockQuery([
        {
          definition: {
            schema: { type: 'object', properties: { title: { type: 'string' } } },
            uischema: { type: 'VerticalLayout', elements: [{ type: 'Group', label: 'A' }] },
          },
        },
      ]),
    );

    const result = await resolver.definitionForVersion('type-version-2');

    expect(result).toEqual({
      schema: { type: 'object', properties: { title: { type: 'string' } } },
      uischema: { type: 'VerticalLayout', elements: [{ type: 'Group', label: 'A' }] },
    });
  });

  it('should resolve a NON-published type version (an older, demoted one)', async () => {
    // The query filters on id ONLY — no status predicate — so a demoted version still resolves.
    dbMock.select.mockReturnValueOnce(
      mockQuery([{ definition: { schema: { legacy: true }, uischema: { legacy: true } } }]),
    );

    const result = await resolver.definitionForVersion('old-demoted-version');

    expect(result.schema).toEqual({ legacy: true });
    expect(result.uischema).toEqual({ legacy: true });
  });

  it('should not fall back to the currently-published type version', async () => {
    // Unknown id → empty, NOT the published template. A silent fallback is the exact bug this
    // method exists to prevent (every field of an old service rendering empty).
    dbMock.select.mockReturnValueOnce(mockQuery([]));

    const result = await resolver.definitionForVersion('does-not-exist');

    expect(result).toEqual({ schema: {}, uischema: {} });
    expect(dbMock.select).toHaveBeenCalledTimes(1);
  });

  it('should return empty objects when the type version id is unknown', async () => {
    dbMock.select.mockReturnValueOnce(mockQuery([]));

    await expect(resolver.definitionForVersion('nope')).resolves.toEqual({
      schema: {},
      uischema: {},
    });
  });

  it('should return empty objects when the definition JSONB lacks schema/uischema', async () => {
    dbMock.select.mockReturnValueOnce(mockQuery([{ definition: {} }]));
    await expect(resolver.definitionForVersion('v')).resolves.toEqual({ schema: {}, uischema: {} });

    dbMock.select.mockReturnValueOnce(mockQuery([{ definition: null }]));
    await expect(resolver.definitionForVersion('v')).resolves.toEqual({ schema: {}, uischema: {} });
  });
});

describe('ServiceTypeResolver.definitionsForVersions (feature 174)', () => {
  let resolver: ServiceTypeResolver;
  let dbMock: any;

  beforeEach(() => {
    dbMock = Object.assign(Promise.resolve([]), {
      select: vi.fn().mockImplementation(() => mockQuery([])),
    });
    resolver = new ServiceTypeResolver(dbMock);
  });

  it('should key each definition by its type version id', async () => {
    dbMock.select.mockReturnValueOnce(
      mockQuery([
        { id: 'tv-1', definition: { schema: { a: 1 }, uischema: { a: 1 } } },
        { id: 'tv-2', definition: { schema: { b: 2 }, uischema: { b: 2 } } },
      ]),
    );

    const result = await resolver.definitionsForVersions(['tv-1', 'tv-2']);

    expect(result['tv-1']).toEqual({ schema: { a: 1 }, uischema: { a: 1 } });
    expect(result['tv-2']).toEqual({ schema: { b: 2 }, uischema: { b: 2 } });
  });

  it('should issue no query for an empty id list', async () => {
    await expect(resolver.definitionsForVersions([])).resolves.toEqual({});
    expect(dbMock.select).not.toHaveBeenCalled();
  });

  it('should de-duplicate repeated ids into one lookup', async () => {
    dbMock.select.mockReturnValueOnce(
      mockQuery([{ id: 'tv-1', definition: { schema: {}, uischema: {} } }]),
    );

    const result = await resolver.definitionsForVersions(['tv-1', 'tv-1', 'tv-1']);

    expect(Object.keys(result)).toEqual(['tv-1']);
    expect(dbMock.select).toHaveBeenCalledTimes(1);
  });

  it('should omit ids with no matching row (caller falls back to an empty definition)', async () => {
    dbMock.select.mockReturnValueOnce(
      mockQuery([{ id: 'tv-1', definition: { schema: {}, uischema: {} } }]),
    );

    const result = await resolver.definitionsForVersions(['tv-1', 'missing']);

    expect(result['tv-1']).toBeDefined();
    expect(result['missing']).toBeUndefined();
  });
});
