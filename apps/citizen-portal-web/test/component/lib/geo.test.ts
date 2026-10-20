import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addressSearchRegionsQueryOptions,
  appGeoData,
  countriesQueryOptions,
  statesQueryOptions,
} from '@/lib/geo';
import { BFF_ORIGIN } from '@/lib/bff';
import { createMockSpy } from '../../support/create-mock-spy';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return function QueryWrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('Geo Library Test Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('countriesQueryOptions', () => {
    it('Should construct correct query options and fetches countries successfully', async () => {
      const mockCountries = [
        { id: 1, name: 'Canada', iso2: 'CA', hasStates: true, hasPostal: true },
        { id: 2, name: 'United States', iso2: 'US', hasStates: true, hasPostal: true },
      ];

      const fetchSpy = createMockSpy({ items: mockCountries });

      const options = countriesQueryOptions();
      expect(options.queryKey).toEqual(['geo', 'countries']);
      expect(options.staleTime).toBe(Number.POSITIVE_INFINITY);

      const result = await (options.queryFn as () => Promise<unknown>)();
      expect(fetchSpy).toHaveBeenCalledWith(`${BFF_ORIGIN}/v1/geo/countries`, {
        credentials: 'include',
      });
      expect(result).toEqual(mockCountries);
    });

    it('Should throw an error when countries fetch response is not ok', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: false,
        status: 500,
      } as Response);

      const options = countriesQueryOptions();
      let error: Error | undefined;
      try {
        await (options.queryFn as () => Promise<unknown>)();
      } catch (e) {
        error = e as Error;
      }
      expect(error).toBeDefined();
      expect(error?.message).toBe('GET /v1/geo/countries failed: 500');
    });
  });

  describe('statesQueryOptions', () => {
    it('Should construct query options with enabled=true when countryId is provided', async () => {
      const mockStates = [{ id: 10, name: 'British Columbia', type: 'province', iso2: 'BC' }];

      const fetchSpy = createMockSpy({ items: mockStates });

      const options = statesQueryOptions(1);
      expect(options.queryKey).toEqual(['geo', 'states', 1]);
      expect(options.enabled).toBe(true);
      expect(options.staleTime).toBe(Number.POSITIVE_INFINITY);

      const result = await (options.queryFn as () => Promise<unknown>)();
      expect(fetchSpy).toHaveBeenCalledWith(`${BFF_ORIGIN}/v1/geo/countries/1/states`, {
        credentials: 'include',
      });
      expect(result).toEqual(mockStates);
    });

    it('Should construct query options with enabled=false and null key when countryId is undefined', () => {
      const options = statesQueryOptions(undefined);
      expect(options.queryKey).toEqual(['geo', 'states', null]);
      expect(options.enabled).toBe(false);
    });

    it('Should throw an error when states fetch response is not ok', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: false,
        status: 404,
      } as Response);

      const options = statesQueryOptions(999);
      let error: Error | undefined;
      try {
        await (options.queryFn as () => Promise<unknown>)();
      } catch (e) {
        error = e as Error;
      }
      expect(error).toBeDefined();
      expect(error?.message).toBe('GET /v1/geo/countries/999/states failed: 404');
    });
  });

  describe('addressSearchRegionsQueryOptions', () => {
    it('Should construct correct query options and fetches regions successfully', async () => {
      const mockRegions = [{ country: 'CA', province: 'BC' }];

      const fetchSpy = createMockSpy({ items: mockRegions });

      const options = addressSearchRegionsQueryOptions();
      expect(options.queryKey).toEqual(['geo', 'address-search', 'regions']);
      expect(options.staleTime).toBe(Number.POSITIVE_INFINITY);

      const result = await (options.queryFn as () => Promise<unknown>)();
      expect(fetchSpy).toHaveBeenCalledWith(`${BFF_ORIGIN}/v1/geo/address-search/regions`, {
        credentials: 'include',
      });
      expect(result).toEqual(mockRegions);
    });

    it('Should throw an error when address search regions fetch response is not ok', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: false,
        status: 502,
      } as Response);

      const options = addressSearchRegionsQueryOptions();
      let error: Error | undefined;
      try {
        await (options.queryFn as () => Promise<unknown>)();
      } catch (e) {
        error = e as Error;
      }
      expect(error).toBeDefined();
      expect(error?.message).toBe('GET /v1/geo/address-search/regions failed: 502');
    });
  });

  describe('appGeoData.searchAddresses', () => {
    it('Should construct query parameters and returns suggestions on success', async () => {
      const mockSuggestions = [
        {
          label: '1012 Douglas St, Victoria, BC',
          streetAddress: '1012 Douglas St',
          city: 'Victoria',
          provinceCode: 'BC',
        },
      ];

      const fetchSpy = createMockSpy({ items: mockSuggestions });

      const result = await appGeoData.searchAddresses!({
        country: 'CA',
        province: 'BC',
        query: '1012 Douglas',
      });

      expect(fetchSpy).toHaveBeenCalledWith(
        `${BFF_ORIGIN}/v1/geo/address-search?country=CA&province=BC&q=1012+Douglas`,
        { credentials: 'include' },
      );
      expect(result).toEqual(mockSuggestions);
    });

    it('Should catch fetch error and returns empty array on failure', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: false,
        status: 500,
      } as Response);

      const result = await appGeoData.searchAddresses!({
        country: 'CA',
        province: 'BC',
        query: 'fail',
      });

      expect(result).toEqual([]);
    });

    it('Should catch network rejection and returns empty array', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));

      const result = await appGeoData.searchAddresses!({
        country: 'CA',
        province: 'BC',
        query: 'network fail',
      });

      expect(result).toEqual([]);
    });
  });

  describe('appGeoData hooks', () => {
    it('Should useCountries returns query data and loading state', async () => {
      const mockCountries = [
        { id: 1, name: 'Canada', iso2: 'CA', hasStates: true, hasPostal: true },
      ];
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ items: mockCountries }),
      } as Response);

      const { result } = renderHook(() => appGeoData.useCountries!(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockCountries);
    });

    it('Should useStates returns query data and loading state for a valid countryId', async () => {
      const mockStates = [{ id: 10, name: 'British Columbia', type: 'province', iso2: 'BC' }];
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ items: mockStates }),
      } as Response);

      const { result } = renderHook(() => appGeoData.useStates!(1), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockStates);
    });

    it('Should useStates handles disabled query state when countryId is undefined', () => {
      const { result } = renderHook(() => appGeoData.useStates!(undefined), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeUndefined();
    });

    it('Should useAddressSearchRegions returns query data and loading state', async () => {
      const mockRegions = [{ country: 'CA', province: 'BC' }];
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ items: mockRegions }),
      } as Response);

      const { result } = renderHook(() => appGeoData.useAddressSearchRegions!(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockRegions);
    });
  });
});
