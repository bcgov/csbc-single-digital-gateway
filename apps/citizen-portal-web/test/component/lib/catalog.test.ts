import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  getServices,
  getMyApplications,
  getService,
  getServiceVersion,
  servicesQueryOptions,
  myApplicationsQueryOptions,
  serviceQueryOptions,
  serviceVersionQueryOptions,
} from '@/lib/catalog';
import { BFF_ORIGIN } from '@/lib/bff';
import { createMockSpy } from '../../support/create-mock-spy';

describe('Catalog Library Test Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('API functions', () => {
    it('Should fetch services from correct endpoint without search term in getServices', async () => {
      const mockItems = [{ id: 's1', title: 'Service 1', description: 'Desc 1' }];
      const fetchSpy = createMockSpy({ items: mockItems });

      const result = await getServices();

      expect(fetchSpy).toHaveBeenCalledWith(`${BFF_ORIGIN}/v1/services`, {
        credentials: 'include',
      });
      expect(result).toEqual(mockItems);
    });

    it('Should fetch services with query param when search term is provided in getServices', async () => {
      const mockItems = [{ id: 's1', title: 'Service 1', description: 'Desc 1' }];
      const fetchSpy = createMockSpy({ items: mockItems });

      const result = await getServices('  passport  ');

      expect(fetchSpy).toHaveBeenCalledWith(`${BFF_ORIGIN}/v1/services?q=passport`, {
        credentials: 'include',
      });
      expect(result).toEqual(mockItems);
    });

    it('Should throw error when response is not ok in getServices', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: false,
        status: 500,
      } as Response);

      let error: any;
      try {
        await getServices();
      } catch (e) {
        error = e;
      }
      expect(error).toBeDefined();
      expect(error.message).toBe('GET /v1/services failed: 500');
    });

    it('Should fetch citizen applications in getMyApplications', async () => {
      const mockItems = [{ id: 'app1', reference: 'REF-1' }];
      const fetchSpy = createMockSpy({ items: mockItems });

      const result = await getMyApplications();

      expect(fetchSpy).toHaveBeenCalledWith(`${BFF_ORIGIN}/v1/me/applications`, {
        credentials: 'include',
      });
      expect(result).toEqual(mockItems);
    });

    it('Should return empty array on 401 Unauthorized in getMyApplications', async () => {
      const fetchSpy = createMockSpy({}, 401);

      const result = await getMyApplications();

      expect(fetchSpy).toHaveBeenCalledWith(`${BFF_ORIGIN}/v1/me/applications`, {
        credentials: 'include',
      });
      expect(result).toEqual([]);
    });

    it('Should throw error on other failure status codes in getMyApplications', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: false,
        status: 400,
      } as Response);

      let error: any;
      try {
        await getMyApplications();
      } catch (e) {
        error = e;
      }
      expect(error).toBeDefined();
      expect(error.message).toBe('GET /v1/me/applications failed: 400');
    });

    it('Should fetch a single service details by id in getService', async () => {
      const mockService = { id: 's1', title: 'Service 1' };
      const fetchSpy = createMockSpy(mockService);

      const result = await getService('s1');

      expect(fetchSpy).toHaveBeenCalledWith(`${BFF_ORIGIN}/v1/services/s1`, {
        credentials: 'include',
      });
      expect(result).toEqual(mockService);
    });

    it('Should throw error when response is not ok in getService', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: false,
        status: 404,
      } as Response);

      let error: any;
      try {
        await getService('invalid');
      } catch (e) {
        error = e;
      }
      expect(error).toBeDefined();
      expect(error.message).toBe('GET /v1/services/invalid failed: 404');
    });

    it('Should fetch specific service version details in getServiceVersion', async () => {
      const mockVersion = { id: 'v1', version: 2 };
      const fetchSpy = createMockSpy(mockVersion);

      const result = await getServiceVersion('s1', 'v1');

      expect(fetchSpy).toHaveBeenCalledWith(`${BFF_ORIGIN}/v1/services/s1/versions/v1`, {
        credentials: 'include',
      });
      expect(result).toEqual(mockVersion);
    });

    it('Should throw error when response is not ok in getServiceVersion', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: false,
        status: 404,
      } as Response);

      let error: any;
      try {
        await getServiceVersion('s1', 'invalid');
      } catch (e) {
        error = e;
      }
      expect(error).toBeDefined();
      expect(error.message).toBe('GET /v1/services/s1/versions/invalid failed: 404');
    });
  });

  describe('Query options', () => {
    it('Should return correct options in servicesQueryOptions configuration', async () => {
      const mockItems = [{ id: 's1', title: 'Service' }];
      const fetchSpy = createMockSpy({ items: mockItems });

      const options = servicesQueryOptions('test');
      expect(options.queryKey).toEqual(['services', 'test']);
      expect(options.staleTime).toBe(60 * 1000);

      const result = await options.queryFn!({} as any);
      expect(fetchSpy).toHaveBeenCalledWith(`${BFF_ORIGIN}/v1/services?q=test`, expect.any(Object));
      expect(result).toEqual(mockItems);
    });

    it('Should use empty string default queryKey when q is missing in servicesQueryOptions', () => {
      const options = servicesQueryOptions();
      expect(options.queryKey).toEqual(['services', '']);
    });

    it('Should return correct options in myApplicationsQueryOptions configuration', async () => {
      const mockItems = [{ id: 'app1' }];
      const fetchSpy = createMockSpy({ items: mockItems });

      const options = myApplicationsQueryOptions();
      expect(options.queryKey).toEqual(['me', 'applications']);
      expect(options.staleTime).toBe(60 * 1000);

      const result = await options.queryFn!({} as any);
      expect(fetchSpy).toHaveBeenCalledWith(`${BFF_ORIGIN}/v1/me/applications`, expect.any(Object));
      expect(result).toEqual(mockItems);
    });

    it('Should return correct options in serviceQueryOptions configuration', async () => {
      const mockService = { id: 's1' };
      const fetchSpy = createMockSpy(mockService);

      const options = serviceQueryOptions('s1');
      expect(options.queryKey).toEqual(['services', 'detail', 's1']);
      expect(options.staleTime).toBe(60 * 1000);
      expect(options.retry).toBe(false);

      const result = await options.queryFn!({} as any);
      expect(fetchSpy).toHaveBeenCalledWith(`${BFF_ORIGIN}/v1/services/s1`, expect.any(Object));
      expect(result).toEqual(mockService);
    });

    it('Should return correct options in serviceVersionQueryOptions configuration', async () => {
      const mockVersion = { id: 'v1' };
      const fetchSpy = createMockSpy(mockVersion);

      const options = serviceVersionQueryOptions('s1', 'v1');
      expect(options.queryKey).toEqual(['services', 's1', 'versions', 'v1']);
      expect(options.staleTime).toBe(60 * 1000);
      expect(options.retry).toBe(false);

      const result = await options.queryFn!({} as any);
      expect(fetchSpy).toHaveBeenCalledWith(
        `${BFF_ORIGIN}/v1/services/s1/versions/v1`,
        expect.any(Object),
      );
      expect(result).toEqual(mockVersion);
    });
  });
});
