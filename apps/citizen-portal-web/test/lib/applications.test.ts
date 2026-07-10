import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  getApplicationForm,
  createOrResumeDraft,
  saveDraft,
  submitApplication,
  getApplication,
  reviseApplication,
  applicationQueryOptions,
  applicationFormQueryOptions,
  draftQueryOptions,
} from '@/lib/applications';
import { BFF_ORIGIN } from '@/lib/bff';

describe('applications lib', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('requestJson API functions', () => {
    it('getApplicationForm fetches form from the correct endpoint', async () => {
      const mockForm = { id: 'form1', title: 'Test Form' };
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => mockForm,
      } as Response);

      const result = await getApplicationForm('service-123', 'form-abc');

      expect(fetchSpy).toHaveBeenCalledWith(
        `${BFF_ORIGIN}/v1/services/service-123/applications/form-abc`,
        { credentials: 'include' },
      );
      expect(result).toEqual(mockForm);
    });

    it('createOrResumeDraft sends POST to applications endpoint', async () => {
      const mockSubmission = { id: 'sub-1', status: 'draft' };
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => mockSubmission,
      } as Response);

      const result = await createOrResumeDraft('v-99');

      expect(fetchSpy).toHaveBeenCalledWith(`${BFF_ORIGIN}/v1/me/applications`, {
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({ formVersionId: 'v-99' }),
        headers: { 'content-type': 'application/json' },
      });
      expect(result).toEqual(mockSubmission);
    });

    it('saveDraft sends PATCH with data to correct endpoint', async () => {
      const mockSubmission = { id: 'sub-1', status: 'draft' };
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => mockSubmission,
      } as Response);

      const data = { field: 'value' };
      const result = await saveDraft('sub-1', data);

      expect(fetchSpy).toHaveBeenCalledWith(`${BFF_ORIGIN}/v1/me/applications/sub-1`, {
        method: 'PATCH',
        credentials: 'include',
        body: JSON.stringify({ data }),
        headers: { 'content-type': 'application/json' },
      });
      expect(result).toEqual(mockSubmission);
    });

    it('submitApplication sends POST with data to submit endpoint', async () => {
      const mockSubmission = { id: 'sub-1', status: 'pending' };
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => mockSubmission,
      } as Response);

      const data = { field: 'value' };
      const result = await submitApplication('sub-1', data);

      expect(fetchSpy).toHaveBeenCalledWith(`${BFF_ORIGIN}/v1/me/applications/sub-1/submit`, {
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({ data }),
        headers: { 'content-type': 'application/json' },
      });
      expect(result).toEqual(mockSubmission);
    });

    it('getApplication fetches application detail by ID', async () => {
      const mockDetail = { id: 'app-1', reference: 'REF-123' };
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => mockDetail,
      } as Response);

      const result = await getApplication('app-1');

      expect(fetchSpy).toHaveBeenCalledWith(`${BFF_ORIGIN}/v1/me/applications/app-1`, {
        credentials: 'include',
      });
      expect(result).toEqual(mockDetail);
    });

    it('reviseApplication sends POST to revise endpoint', async () => {
      const mockSubmission = { id: 'sub-1', status: 'draft' };
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => mockSubmission,
      } as Response);

      const result = await reviseApplication('app-1');

      expect(fetchSpy).toHaveBeenCalledWith(`${BFF_ORIGIN}/v1/me/applications/app-1/revise`, {
        method: 'POST',
        credentials: 'include',
      });
      expect(result).toEqual(mockSubmission);
    });

    it('throws error when response is not ok', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: false,
        status: 400,
      } as Response);

      let error: any;
      try {
        await reviseApplication('app-1');
      } catch (e) {
        error = e;
      }
      expect(error).toBeDefined();
      expect(error.message).toBe('POST /v1/me/applications/app-1/revise failed: 400');
    });
  });

  describe('query options configuration', () => {
    it('applicationQueryOptions creates correct options object', async () => {
      const mockDetail = { id: 'app-1', reference: 'REF-123' };
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => mockDetail,
      } as Response);

      const options = applicationQueryOptions('app-1');
      expect(options.queryKey).toEqual(['me', 'applications', 'app-1']);
      expect(options.staleTime).toBe(30000);
      expect(options.retry).toBe(false);

      const result = await options.queryFn!({} as any);
      expect(fetchSpy).toHaveBeenCalledWith(
        `${BFF_ORIGIN}/v1/me/applications/app-1`,
        expect.any(Object),
      );
      expect(result).toEqual(mockDetail);
    });

    it('applicationFormQueryOptions creates correct options object', async () => {
      const mockForm = { id: 'form1', title: 'Test Form' };
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => mockForm,
      } as Response);

      const options = applicationFormQueryOptions('service-1', 'form-1');
      expect(options.queryKey).toEqual(['applicationForm', 'service-1', 'form-1']);
      expect(options.staleTime).toBe(60000);
      expect(options.retry).toBe(false);

      const result = await options.queryFn!({} as any);
      expect(fetchSpy).toHaveBeenCalledWith(
        `${BFF_ORIGIN}/v1/services/service-1/applications/form-1`,
        expect.any(Object),
      );
      expect(result).toEqual(mockForm);
    });

    it('draftQueryOptions creates correct options object when formVersionId is provided', async () => {
      const mockSubmission = { id: 'sub-1', status: 'draft' };
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => mockSubmission,
      } as Response);

      const options = draftQueryOptions('v-1');
      expect(options.queryKey).toEqual(['applicationDraft', 'v-1']);
      expect(options.enabled).toBe(true);
      expect(options.staleTime).toBe(Number.POSITIVE_INFINITY);
      expect(options.refetchOnWindowFocus).toBe(false);
      expect(options.retry).toBe(false);

      const result = await options.queryFn!({} as any);
      expect(fetchSpy).toHaveBeenCalledWith(`${BFF_ORIGIN}/v1/me/applications`, expect.any(Object));
      expect(result).toEqual(mockSubmission);
    });

    it('draftQueryOptions disables query when formVersionId is undefined', () => {
      const options = draftQueryOptions(undefined);
      expect(options.enabled).toBe(false);
    });
  });
});
