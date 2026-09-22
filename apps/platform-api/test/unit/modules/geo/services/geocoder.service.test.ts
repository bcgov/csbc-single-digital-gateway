import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Env } from '../../../../../src/config/env.schema';
import {
  GeocoderService,
  normalizeBcFeature,
} from '../../../../../src/modules/geo/services/geocoder.service';

/** A minimal ConfigService stub returning geocoder env values. */
function createConfig(
  apiKey?: string,
  baseUrl = 'https://geocoder.example',
): ConfigService<Env, true> {
  const values: Record<string, unknown> = {
    BC_GEOCODER_URL: baseUrl,
    BC_GEOCODER_API_KEY: apiKey,
  };
  return { get: (key: string) => values[key] } as unknown as ConfigService<Env, true>;
}

const bcResponse = (body: unknown, ok = true, status = 200) =>
  ({
    ok,
    status,
    json: async () => body,
  }) as unknown as Response;

describe('GeocoderService and normalizeBcFeature Unit Test Suite', () => {
  describe('Dependency Injection and Metadata', () => {
    it('should resolve GeocoderService from NestJS Test module', async () => {
      const moduleRef = await Test.createTestingModule({
        providers: [
          GeocoderService,
          {
            provide: ConfigService,
            useValue: createConfig('di-key'),
          },
        ],
      }).compile();

      const service = moduleRef.get(GeocoderService);
      expect(service).toBeDefined();
      expect(service.regions()).toEqual([{ country: 'CA', province: 'BC' }]);
      await moduleRef.close();
    });

    it('should evaluate class decorator metadata when ConfigService is undefined', async () => {
      vi.resetModules();
      vi.doMock('@nestjs/config', () => ({
        ConfigService: undefined,
      }));
      const { GeocoderService: IsolatedGeocoderService } =
        await import('../../../../../src/modules/geo/services/geocoder.service');
      expect(IsolatedGeocoderService).toBeDefined();
    });
  });

  describe('normalizeBcFeature', () => {
    it('returns null for null, non-objects, or objects without properties', () => {
      expect(normalizeBcFeature(null)).toBeNull();
      expect(normalizeBcFeature(undefined)).toBeNull();
      expect(normalizeBcFeature('string')).toBeNull();
      expect(normalizeBcFeature(123)).toBeNull();
      expect(normalizeBcFeature({})).toBeNull();
    });

    it('builds a suggestion from structured street parts, locality, and provinceCode', () => {
      const feature = {
        properties: {
          fullAddress: '1012 Douglas St, Victoria, BC',
          civicNumber: '1012',
          streetName: 'Douglas',
          streetType: 'St',
          localityName: 'Victoria',
          provinceCode: 'BC',
        },
      };
      expect(normalizeBcFeature(feature)).toEqual({
        label: '1012 Douglas St, Victoria, BC',
        streetAddress: '1012 Douglas St',
        city: 'Victoria',
        provinceCode: 'BC',
      });
    });

    it('falls back to fullAddress head and secondPart when structured fields and locality are missing', () => {
      const feature = {
        properties: {
          fullAddress: '500 Government St, Victoria, BC',
        },
      };
      expect(normalizeBcFeature(feature)).toEqual({
        label: '500 Government St, Victoria, BC',
        streetAddress: '500 Government St',
        city: 'Victoria',
        provinceCode: 'BC',
      });
    });

    it('synthesizes label from structured street and city when fullAddress is absent', () => {
      const feature = {
        properties: {
          civicNumber: '100',
          streetName: 'Main',
          streetType: 'Ave',
          localityName: 'Vancouver',
        },
      };
      expect(normalizeBcFeature(feature)).toEqual({
        label: '100 Main Ave, Vancouver',
        streetAddress: '100 Main Ave',
        city: 'Vancouver',
        provinceCode: 'BC',
      });
    });

    it('returns null when properties carry no usable address information', () => {
      expect(normalizeBcFeature({ properties: {} })).toBeNull();
      expect(
        normalizeBcFeature({
          properties: {
            fullAddress: '',
            civicNumber: '',
            streetName: '',
            localityName: '',
          },
        }),
      ).toBeNull();
    });
  });

  describe('GeocoderService.regions', () => {
    it('returns empty array when BC_GEOCODER_API_KEY is not configured', () => {
      const service = new GeocoderService(createConfig(undefined));
      expect(service.regions()).toEqual([]);
    });

    it('registers CA:BC when BC_GEOCODER_API_KEY is set', () => {
      const service = new GeocoderService(createConfig('test-api-key'));
      expect(service.regions()).toEqual([{ country: 'CA', province: 'BC' }]);
    });

    it('handles region keys without province segment or with empty string safely', () => {
      const service = new GeocoderService(createConfig('test-api-key'));
      (service as any).providers.set('US', {} as any);
      (service as any).providers.set('', {} as any);

      const regions = service.regions();
      expect(regions).toContainEqual({ country: 'US', province: '' });
      expect(regions).toContainEqual({ country: '', province: '' });
    });
  });

  describe('GeocoderService.search', () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('returns empty array for an unconfigured or unknown region without calling upstream fetch', async () => {
      const fetchSpy = vi.fn();
      vi.stubGlobal('fetch', fetchSpy);

      const service = new GeocoderService(createConfig('api-key'));
      expect(await service.search('US', 'WA', 'main')).toEqual([]);
      expect(await service.search('CA', 'ON', 'main')).toEqual([]);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('returns empty array for a blank or whitespace-only query without calling upstream fetch', async () => {
      const fetchSpy = vi.fn();
      vi.stubGlobal('fetch', fetchSpy);

      const service = new GeocoderService(createConfig('api-key'));
      expect(await service.search('CA', 'BC', '')).toEqual([]);
      expect(await service.search('CA', 'BC', '   ')).toEqual([]);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('successfully fetches and normalizes address suggestions from BC geocoder (case-insensitive region)', async () => {
      const fetchMock = vi.fn(async () =>
        bcResponse({
          features: [
            {
              properties: {
                fullAddress: '1012 Douglas St, Victoria, BC',
                civicNumber: '1012',
                streetName: 'Douglas',
                streetType: 'St',
                localityName: 'Victoria',
                provinceCode: 'BC',
              },
            },
            {
              properties: {}, // will be filtered out as null
            },
          ],
        }),
      );
      vi.stubGlobal('fetch', fetchMock);

      const service = new GeocoderService(createConfig('api-key'));
      const results = await service.search('ca', 'bc', '1012 Douglas');

      expect(fetchMock).toHaveBeenCalledOnce();
      expect(results).toEqual([
        {
          label: '1012 Douglas St, Victoria, BC',
          streetAddress: '1012 Douglas St',
          city: 'Victoria',
          provinceCode: 'BC',
        },
      ]);
    });

    it('handles non-array or missing features body gracefully', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => bcResponse({ features: 'not-an-array' })),
      );

      const service = new GeocoderService(createConfig('api-key'));
      const results = await service.search('CA', 'BC', 'Douglas');

      expect(results).toEqual([]);
    });

    it('handles non-object response body gracefully', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => bcResponse('plain-text-response')),
      );

      const service = new GeocoderService(createConfig('api-key'));
      const results = await service.search('CA', 'BC', 'Douglas');

      expect(results).toEqual([]);
    });

    it('returns empty array and logs warning on upstream non-2xx response', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => bcResponse(null, false, 502)),
      );

      const service = new GeocoderService(createConfig('api-key'));
      const results = await service.search('CA', 'BC', 'Douglas');

      expect(results).toEqual([]);
    });

    it('swallows upstream fetch Error exceptions and returns empty array', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => {
          throw new Error('Connection timeout');
        }),
      );

      const service = new GeocoderService(createConfig('api-key'));
      const results = await service.search('CA', 'BC', 'Douglas');

      expect(results).toEqual([]);
    });

    it('swallows non-Error throwables and returns empty array', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => {
          throw 'Non-error string exception';
        }),
      );

      const service = new GeocoderService(createConfig('api-key'));
      const results = await service.search('CA', 'BC', 'Douglas');

      expect(results).toEqual([]);
    });
  });
});
