import { QueryClient } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BFF_ORIGIN } from '@/lib/bff';
import { formQueryOptions, updateFormDraft } from '@/lib/forms';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const VERSION = {
  id: 'fv1',
  documentId: 'f 1',
  versionNumber: 1,
  revision: 1,
  status: 'draft',
  title: 'Apply online',
  description: null,
  content: { schema: {}, variants: { default: { type: 'Form', elements: [] } } },
  createdAt: '2026-10-08T00:00:00.000Z',
};

let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;
beforeEach(() => {
  fetchMock = vi.fn<typeof fetch>();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

// Doc 288: the application method client — GET /v1/forms/:id and PATCH a draft version.
describe('forms client (doc 288)', () => {
  describe('formQueryOptions', () => {
    it('GETs /v1/forms/:id with credentials under key forms/detail/:id', async () => {
      const body = { form: { id: 'f 1' }, version: VERSION };
      fetchMock.mockResolvedValue(json(body));
      const options = formQueryOptions('f 1');
      expect(options.queryKey).toEqual(['forms', 'detail', 'f 1']);
      const data = await new QueryClient().fetchQuery(options);
      expect(data).toEqual(body);
      const [url, init] = fetchMock.mock.calls[0]!;
      expect(String(url)).toBe(`${BFF_ORIGIN}/v1/forms/f%201`);
      expect(init?.credentials).toBe('include');
    });

    it("throws the API's message on an error response", async () => {
      fetchMock.mockResolvedValue(json({ message: 'Form not found' }, 404));
      const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      await expect(client.fetchQuery(formQueryOptions('f1'))).rejects.toThrow('Form not found');
    });
  });

  describe('updateFormDraft', () => {
    it('PATCHes /v1/forms/:id/versions/:versionId with { content } and returns the version', async () => {
      fetchMock.mockResolvedValue(json({ ...VERSION, revision: 2 }));
      const content = { schema: {}, variants: { default: { type: 'Form', label: 'New' } } };
      const saved = await updateFormDraft('f1', 'fv1', { content });
      expect(saved.revision).toBe(2);
      const [url, init] = fetchMock.mock.calls[0]!;
      expect(String(url)).toBe(`${BFF_ORIGIN}/v1/forms/f1/versions/fv1`);
      expect(init?.method).toBe('PATCH');
      expect(init?.credentials).toBe('include');
      expect(JSON.parse(String(init?.body))).toEqual({ content });
    });

    it("throws the API's message on a refusal (409 / 403)", async () => {
      fetchMock.mockResolvedValue(json({ message: 'Only draft versions can be edited' }, 409));
      await expect(updateFormDraft('f1', 'fv1', { content: {} })).rejects.toThrow(
        'Only draft versions can be edited',
      );
      fetchMock.mockResolvedValue(json({ message: ['Not allowed', 'by the template'] }, 403));
      await expect(updateFormDraft('f1', 'fv1', { content: {} })).rejects.toThrow(
        'Not allowed, by the template',
      );
    });
  });
});
