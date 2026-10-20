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
import { createMockSpy } from '../../support/create-mock-spy';

describe('Applications Library Test Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('requestJson API functions', () => {
    it('Should fetch form from the correct endpoint using getApplicationForm', async () => {
      const mockForm = { id: 'form1', title: 'Test Form' };
      const fetchSpy = createMockSpy(mockForm);

      const result = await getApplicationForm('service-123', 'form-abc');

      expect(fetchSpy).toHaveBeenCalledWith(
        `${BFF_ORIGIN}/v1/services/service-123/applications/form-abc`,
        { credentials: 'include' },
      );
      expect(result).toEqual(mockForm);
    });

    it('Should send POST to applications endpoint using createOrResumeDraft', async () => {
      const mockSubmission = { id: 'sub-1', status: 'draft' };
      const fetchSpy = createMockSpy(mockSubmission);

      const result = await createOrResumeDraft('v-99');

      expect(fetchSpy).toHaveBeenCalledWith(`${BFF_ORIGIN}/v1/me/applications`, {
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({ formVersionId: 'v-99' }),
        headers: { 'content-type': 'application/json' },
      });
      expect(result).toEqual(mockSubmission);
    });

    it('Should send PATCH with data to correct endpoint using saveDraft', async () => {
      const mockSubmission = { id: 'sub-1', status: 'draft' };
      const fetchSpy = createMockSpy(mockSubmission);

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

    it('Should send POST with data to submit endpoint using submitApplication', async () => {
      const mockSubmission = { id: 'sub-1', status: 'pending' };
      const fetchSpy = createMockSpy(mockSubmission);

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

    it('Should fetch application detail by ID using getApplication', async () => {
      const mockResult = { id: 'app-1', reference: 'REF-123' };
      const fetchSpy = createMockSpy(mockResult);

      const result = await getApplication('app-1');

      expect(fetchSpy).toHaveBeenCalledWith(`${BFF_ORIGIN}/v1/me/applications/app-1`, {
        credentials: 'include',
      });
      expect(result).toEqual(mockResult);
    });

    it('Should send POST to revise endpoint using reviseApplication', async () => {
      const mockSubmission = { id: 'sub-1', status: 'draft' };
      const fetchSpy = createMockSpy(mockSubmission);

      const result = await reviseApplication('app-1');

      expect(fetchSpy).toHaveBeenCalledWith(`${BFF_ORIGIN}/v1/me/applications/app-1/revise`, {
        method: 'POST',
        credentials: 'include',
      });
      expect(result).toEqual(mockSubmission);
    });

    it('Should throw error when response is not ok', async () => {
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
    it('Should create correct options object in applicationQueryOptions', async () => {
      const mockResult = { id: 'app-1', reference: 'REF-123' };
      const fetchSpy = createMockSpy(mockResult);

      const options = applicationQueryOptions('app-1');
      expect(options.queryKey).toEqual(['me', 'applications', 'app-1']);
      expect(options.staleTime).toBe(30000);
      expect(options.retry).toBe(false);

      const result = await options.queryFn!({} as any);
      expect(fetchSpy).toHaveBeenCalledWith(
        `${BFF_ORIGIN}/v1/me/applications/app-1`,
        expect.any(Object),
      );
      expect(result).toEqual(mockResult);
    });

    it('Should create correct options object in applicationFormQueryOptions', async () => {
      const mockForm = { id: 'form1', title: 'Test Form' };
      const fetchSpy = createMockSpy(mockForm);

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

    it('Should create correct options object when formVersionId is provided in draftQueryOptions', async () => {
      const mockSubmission = { id: 'sub-1', status: 'draft' };
      const fetchSpy = createMockSpy(mockSubmission);

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

    it('Should disable query when formVersionId is undefined in draftQueryOptions', () => {
      const options = draftQueryOptions(undefined);
      expect(options.enabled).toBe(false);
    });
  });
});
