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

describe('catalog lib', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('API functions', () => {
    it('getServices fetches services from correct endpoint without search term', async () => {
      const mockItems = [{ id: 's1', title: 'Service 1', description: 'Desc 1' }];
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ items: mockItems }),
      } as Response);

      const result = await getServices();

      expect(fetchSpy).toHaveBeenCalledWith(`${BFF_ORIGIN}/v1/services`, {
        credentials: 'include',
      });
      expect(result).toEqual(mockItems);
    });

    it('getServices fetches services with query param when search term is provided', async () => {
      const mockItems = [{ id: 's1', title: 'Service 1', description: 'Desc 1' }];
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ items: mockItems }),
      } as Response);

      const result = await getServices('  passport  ');

      expect(fetchSpy).toHaveBeenCalledWith(`${BFF_ORIGIN}/v1/services?q=passport`, {
        credentials: 'include',
      });
      expect(result).toEqual(mockItems);
    });

    it('getServices throws error when response is not ok', async () => {
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

    it('getMyApplications fetches citizen applications', async () => {
      const mockItems = [{ id: 'app1', reference: 'REF-1' }];
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ items: mockItems }),
      } as Response);

      const result = await getMyApplications();

      expect(fetchSpy).toHaveBeenCalledWith(`${BFF_ORIGIN}/v1/me/applications`, {
        credentials: 'include',
      });
      expect(result).toEqual(mockItems);
    });

    it('getMyApplications returns empty array on 401 Unauthorized', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: false,
        status: 401,
      } as Response);

      const result = await getMyApplications();

      expect(fetchSpy).toHaveBeenCalledWith(`${BFF_ORIGIN}/v1/me/applications`, {
        credentials: 'include',
      });
      expect(result).toEqual([]);
    });

    it('getMyApplications throws error on other failure status codes', async () => {
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

    it('getService fetches a single service details by id', async () => {
      const mockService = { id: 's1', title: 'Service 1' };
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => mockService,
      } as Response);

      const result = await getService('s1');

      expect(fetchSpy).toHaveBeenCalledWith(`${BFF_ORIGIN}/v1/services/s1`, {
        credentials: 'include',
      });
      expect(result).toEqual(mockService);
    });

    it('getService throws error when response is not ok', async () => {
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

    it('getServiceVersion fetches specific service version details', async () => {
      const mockVersion = { id: 'v1', version: 2 };
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => mockVersion,
      } as Response);

      const result = await getServiceVersion('s1', 'v1');

      expect(fetchSpy).toHaveBeenCalledWith(`${BFF_ORIGIN}/v1/services/s1/versions/v1`, {
        credentials: 'include',
      });
      expect(result).toEqual(mockVersion);
    });

    it('getServiceVersion throws error when response is not ok', async () => {
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
    it('servicesQueryOptions configuration', async () => {
      const mockItems = [{ id: 's1', title: 'Service' }];
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ items: mockItems }),
      } as Response);

      const options = servicesQueryOptions('test');
      expect(options.queryKey).toEqual(['services', 'test']);
      expect(options.staleTime).toBe(60 * 1000);

      const result = await options.queryFn!({} as any);
      expect(fetchSpy).toHaveBeenCalledWith(`${BFF_ORIGIN}/v1/services?q=test`, expect.any(Object));
      expect(result).toEqual(mockItems);
    });

    it('servicesQueryOptions uses empty string default queryKey when q is missing', () => {
      const options = servicesQueryOptions();
      expect(options.queryKey).toEqual(['services', '']);
    });

    it('myApplicationsQueryOptions configuration', async () => {
      const mockItems = [{ id: 'app1' }];
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ items: mockItems }),
      } as Response);

      const options = myApplicationsQueryOptions();
      expect(options.queryKey).toEqual(['me', 'applications']);
      expect(options.staleTime).toBe(60 * 1000);

      const result = await options.queryFn!({} as any);
      expect(fetchSpy).toHaveBeenCalledWith(`${BFF_ORIGIN}/v1/me/applications`, expect.any(Object));
      expect(result).toEqual(mockItems);
    });

    it('serviceQueryOptions configuration', async () => {
      const mockService = { id: 's1' };
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => mockService,
      } as Response);

      const options = serviceQueryOptions('s1');
      expect(options.queryKey).toEqual(['services', 'detail', 's1']);
      expect(options.staleTime).toBe(60 * 1000);
      expect(options.retry).toBe(false);

      const result = await options.queryFn!({} as any);
      expect(fetchSpy).toHaveBeenCalledWith(`${BFF_ORIGIN}/v1/services/s1`, expect.any(Object));
      expect(result).toEqual(mockService);
    });

    it('serviceVersionQueryOptions configuration', async () => {
      const mockVersion = { id: 'v1' };
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => mockVersion,
      } as Response);

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
