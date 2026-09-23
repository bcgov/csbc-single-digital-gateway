import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  GeocoderService,
  normalizeBcFeature,
} from '../../../../../src/modules/geo/services/geocoder.service';
import { createMockConfigService } from '../../../../utils/createMockConfigService';
import { createMockResponse } from '../../../../utils/createMockResponse';

describe('GeocoderService and normalizeBcFeature Unit Test Suite', () => {
  describe('Dependency Injection and Metadata', () => {
    it('Should resolve GeocoderService from NestJS Test module', async () => {
      const moduleRef = await Test.createTestingModule({
        providers: [
          GeocoderService,
          {
            provide: ConfigService,
            useValue: createMockConfigService({ BC_GEOCODER_API_KEY: 'di-key' }),
          },
        ],
      }).compile();

      const service = moduleRef.get(GeocoderService);
      expect(service).toBeDefined();
      expect(service.regions()).toEqual([{ country: 'CA', province: 'BC' }]);
      await moduleRef.close();
    });

    it('Should evaluate class decorator metadata when ConfigService is undefined', async () => {
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
    it('Should return null for null, non-objects, or objects without properties', () => {
      expect(normalizeBcFeature(null)).toBeNull();
      expect(normalizeBcFeature(undefined)).toBeNull();
      expect(normalizeBcFeature('string')).toBeNull();
      expect(normalizeBcFeature(123)).toBeNull();
      expect(normalizeBcFeature({})).toBeNull();
    });

    it('Should build a suggestion from structured street parts, locality, and provinceCode', () => {
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

    it('Should fall back to fullAddress head and secondPart when structured fields and locality are missing', () => {
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

    it('Should synthesize label from structured street and city when fullAddress is absent', () => {
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

    it('Should return null when properties carry no usable address information', () => {
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
    it('Should return empty array when BC_GEOCODER_API_KEY is not configured', () => {
      const service = new GeocoderService(
        createMockConfigService({ BC_GEOCODER_API_KEY: undefined }),
      );
      expect(service.regions()).toEqual([]);
    });

    it('Should register CA:BC when BC_GEOCODER_API_KEY is set', () => {
      const service = new GeocoderService(
        createMockConfigService({ BC_GEOCODER_API_KEY: 'test-api-key' }),
      );
      expect(service.regions()).toEqual([{ country: 'CA', province: 'BC' }]);
    });

    it('Should handle region keys without province segment or with empty string safely', () => {
      const service = new GeocoderService(
        createMockConfigService({ BC_GEOCODER_API_KEY: 'test-api-key' }),
      );
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

    it('Should return empty array for an unconfigured or unknown region without calling upstream fetch', async () => {
      const fetchSpy = vi.fn();
      vi.stubGlobal('fetch', fetchSpy);

      const service = new GeocoderService(createMockConfigService());
      expect(await service.search('US', 'WA', 'main')).toEqual([]);
      expect(await service.search('CA', 'ON', 'main')).toEqual([]);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('Should return empty array for a blank or whitespace-only query without calling upstream fetch', async () => {
      const fetchSpy = vi.fn();
      vi.stubGlobal('fetch', fetchSpy);

      const service = new GeocoderService(createMockConfigService());
      expect(await service.search('CA', 'BC', '')).toEqual([]);
      expect(await service.search('CA', 'BC', '   ')).toEqual([]);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('Should successfully fetch and normalizes address suggestions from BC geocoder (case-insensitive region)', async () => {
      const fetchMock = vi.fn(async () =>
        createMockResponse({
          json: vi.fn().mockResolvedValue({
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
        }),
      );
      vi.stubGlobal('fetch', fetchMock);

      const service = new GeocoderService(
        createMockConfigService({ BC_GEOCODER_API_KEY: 'api-key' }),
      );
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

    it('Should handle non-array or missing features body gracefully', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () =>
          createMockResponse({ json: vi.fn().mockResolvedValue({ features: 'not-an-array' }) }),
        ),
      );

      const service = new GeocoderService(createMockConfigService());
      const results = await service.search('CA', 'BC', 'Douglas');

      expect(results).toEqual([]);
    });

    it('Should handle non-object response body gracefully', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () =>
          createMockResponse({ json: vi.fn().mockResolvedValue('plain-text-response') }),
        ),
      );

      const service = new GeocoderService(createMockConfigService());
      const results = await service.search('CA', 'BC', 'Douglas');

      expect(results).toEqual([]);
    });

    it('Should return empty array and logs warning on upstream non-2xx response', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () =>
          createMockResponse({ ok: false, status: 502, json: vi.fn().mockResolvedValue(null) }),
        ),
      );

      const service = new GeocoderService(createMockConfigService());
      const results = await service.search('CA', 'BC', 'Douglas');

      expect(results).toEqual([]);
    });

    it('Should swallow upstream fetch Error exceptions and returns empty array', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => {
          throw new Error('Connection timeout');
        }),
      );

      const service = new GeocoderService(createMockConfigService());
      const results = await service.search('CA', 'BC', 'Douglas');

      expect(results).toEqual([]);
    });

    it('Should swallow non-Error throwables and returns empty array', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => {
          throw 'Non-error string exception';
        }),
      );

      const service = new GeocoderService(createMockConfigService());
      const results = await service.search('CA', 'BC', 'Douglas');

      expect(results).toEqual([]);
    });
  });
});
