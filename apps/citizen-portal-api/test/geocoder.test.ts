import { ConfigService } from '@nestjs/config';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Env } from '../src/config/env.schema';
import { GeocoderService, normalizeBcFeature } from '../src/modules/geo/services/geocoder.service';

/** A minimal ConfigService stub returning the two geocoder env values. */
function config(apiKey?: string): ConfigService<Env, true> {
  const values: Record<string, unknown> = {
    BC_GEOCODER_URL: 'https://geocoder.example',
    BC_GEOCODER_API_KEY: apiKey,
  };
  return { get: (key: string) => values[key] } as unknown as ConfigService<Env, true>;
}

const bcResponse = (features: unknown[]) =>
  ({ ok: true, json: async () => ({ features }) }) as unknown as Response;

describe('normalizeBcFeature', () => {
  it('builds a suggestion from structured street parts + locality', () => {
    const s = normalizeBcFeature({
      properties: {
        fullAddress: '1012 Douglas St, Victoria, BC',
        civicNumber: '1012',
        streetName: 'Douglas',
        streetType: 'St',
        localityName: 'Victoria',
        provinceCode: 'BC',
      },
    });
    expect(s).toEqual({
      label: '1012 Douglas St, Victoria, BC',
      streetAddress: '1012 Douglas St',
      city: 'Victoria',
      provinceCode: 'BC',
    });
  });

  it('falls back to fullAddress parts when structured fields are missing', () => {
    const s = normalizeBcFeature({
      properties: { fullAddress: '500 Government St, Victoria, BC' },
    });
    expect(s?.streetAddress).toBe('500 Government St');
    expect(s?.city).toBe('Victoria');
    expect(s?.provinceCode).toBe('BC');
  });

  it('returns null for a feature with no usable data', () => {
    expect(normalizeBcFeature({ properties: {} })).toBeNull();
    expect(normalizeBcFeature(null)).toBeNull();
    expect(normalizeBcFeature({})).toBeNull();
  });
});

describe('GeocoderService.regions', () => {
  it('is empty when no API key is configured', () => {
    expect(new GeocoderService(config(undefined)).regions()).toEqual([]);
  });

  it('registers CA/BC when the API key is set', () => {
    expect(new GeocoderService(config('secret-key')).regions()).toEqual([
      { country: 'CA', province: 'BC' },
    ]);
  });
});

describe('GeocoderService.search', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('returns [] for an unconfigured/unknown region without calling the upstream', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const svc = new GeocoderService(config('key'));
    expect(await svc.search('US', 'CA', 'main')).toEqual([]);
    expect(await svc.search('CA', 'ON', 'main')).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns [] for a blank query without calling the upstream', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    expect(await new GeocoderService(config('key')).search('CA', 'BC', '   ')).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('normalizes upstream features (case-insensitive region key)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        bcResponse([
          {
            properties: {
              fullAddress: '1012 Douglas St, Victoria, BC',
              localityName: 'Victoria',
              provinceCode: 'BC',
            },
          },
        ]),
      ),
    );
    const items = await new GeocoderService(config('key')).search('ca', 'bc', 'douglas');
    expect(items).toHaveLength(1);
    expect(items[0]?.city).toBe('Victoria');
  });

  it('swallows an upstream error to [] (typing never 5xxs)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network down');
      }),
    );
    expect(await new GeocoderService(config('key')).search('CA', 'BC', 'douglas')).toEqual([]);
  });

  it('returns [] on a non-2xx upstream response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 429 }) as unknown as Response),
    );
    expect(await new GeocoderService(config('key')).search('CA', 'BC', 'douglas')).toEqual([]);
  });
});
