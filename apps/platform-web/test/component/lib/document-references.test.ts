import { QueryClient } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BFF_ORIGIN } from '@/lib/bff';
import { documentReferenceSource } from '@/lib/document-references';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;
const source = () =>
  documentReferenceSource(new QueryClient({ defaultOptions: { queries: { retry: false } } }), {
    workspaceId: 'w1',
    slug: 'city',
    documentId: 'self',
  });
const call = (index = 0) => {
  const [url, init] = fetchMock.mock.calls[index]!;
  return { url: new URL(String(url)), init };
};

beforeEach(() => {
  fetchMock = vi.fn<typeof fetch>();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe('useDocumentReferenceSource', () => {
  describe('candidates', () => {
    it('maps referenceable services to candidates, excluding the current document', async () => {
      const item = {
        id: 's1',
        workspaceId: 'w2',
        workspaceName: 'Other',
        title: 'Parking',
        description: null,
        status: 'published',
      };
      fetchMock.mockResolvedValue(json({ items: [item], total: 1, limit: 25, offset: 0 }));
      const candidates = await source().candidates('services.service', { q: 'park' });
      expect(candidates).toEqual([item]);
      const { url } = call();
      expect(url.pathname).toBe('/v1/services/referenceable');
      expect(url.searchParams.get('workspaceId')).toBe('w1');
      expect(url.searchParams.get('excludeId')).toBe('self');
      expect(url.searchParams.get('q')).toBe('park');
    });

    it('returns workspace and global agreements filtered by q', async () => {
      fetchMock.mockResolvedValue(
        json({
          items: [
            {
              id: 'a1',
              workspaceId: 'w1',
              title: 'Privacy terms',
              isGlobal: false,
              status: 'published',
            },
            {
              id: 'a2',
              workspaceId: null,
              title: 'Province terms',
              isGlobal: true,
              status: 'published',
            },
            { id: 'a3', workspaceId: 'w1', title: 'Fees', isGlobal: false, status: 'draft' },
          ],
        }),
      );
      const candidates = await source().candidates('services.service-agreement', { q: 'TERMS' });
      expect(candidates.map((c) => c.id)).toEqual(['a1', 'a2']);
      expect(candidates[1]).toMatchObject({ workspaceId: null, workspaceName: 'All workspaces' });
      expect(call().url.pathname).toBe('/v1/service-agreements');
      expect(call().url.searchParams.get('workspaceId')).toBe('w1');
    });
  });

  describe('templates', () => {
    it('requests templates of the type and maps them to id and title', async () => {
      fetchMock.mockResolvedValue(
        json({
          items: [
            {
              template: { id: 't1', type: 'services.service-agreement' },
              published: { title: 'Terms' },
            },
            {
              template: { id: 't2', type: 'services.service-agreement' },
              published: { title: null },
            },
          ],
        }),
      );
      expect(await source().templates('services.service-agreement')).toEqual([
        { id: 't1', title: 'Terms' },
        { id: 't2', title: 'Untitled template' },
      ]);
      expect(call().url.pathname).toBe('/v1/templates');
      expect(call().url.searchParams.get('type')).toBe('services.service-agreement');
    });
  });

  describe('create', () => {
    it('creates an application method through POST /v1/forms in the workspace', async () => {
      fetchMock.mockResolvedValue(
        json({
          form: {
            id: 'f1',
            workspaceId: 'w1',
            title: 'Online',
            type: 'services.service-application-method',
          },
        }),
      );
      const created = await source().create('services.service-application-method', {
        title: 'Online',
        templateId: 't1',
      });
      expect(created).toEqual({ id: 'f1', title: 'Online', workspaceId: 'w1' });
      const { url, init } = call();
      expect(url.href).toBe(`${BFF_ORIGIN}/v1/forms`);
      expect(init?.method).toBe('POST');
      expect(JSON.parse(String(init?.body))).toEqual({
        workspaceId: 'w1',
        title: 'Online',
        templateId: 't1',
      });
    });

    it('creates an agreement through POST /v1/service-agreements in the workspace', async () => {
      fetchMock.mockResolvedValue(
        json({ agreement: { id: 'a9', workspaceId: 'w1', title: null }, version: {} }),
      );
      const created = await source().create('services.service-agreement', {
        title: 'Terms',
        templateId: 't2',
      });
      expect(created).toEqual({ id: 'a9', title: 'Terms', workspaceId: 'w1' });
      expect(call().url.pathname).toBe('/v1/service-agreements');
      expect(JSON.parse(String(call().init?.body))).toEqual({
        workspaceId: 'w1',
        title: 'Terms',
        templateId: 't2',
      });
    });
  });

  describe('remove', () => {
    it('deletes an application method through DELETE /v1/forms/:id', async () => {
      fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
      await source().remove('services.service-application-method', 'f1');
      expect(call().url.pathname).toBe('/v1/forms/f1');
      expect(call().init?.method).toBe('DELETE');
      fetchMock.mockResolvedValueOnce(json({ message: 'Form has submissions' }, 409));
      await expect(source().remove('services.service-application-method', 'f2')).rejects.toThrow(
        'Form has submissions',
      );
      await expect(source().remove('services.service', 's1')).rejects.toThrow();
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });

  describe('href', () => {
    it('links a same-workspace service and agreement and returns undefined otherwise', () => {
      const s = source();
      expect(s.href?.('services.service', { id: 's1', workspaceId: 'w1' })).toBe(
        '/app/city/services/s1',
      );
      expect(s.href?.('services.service-agreement', { id: 'a1', workspaceId: 'w1' })).toBe(
        '/app/city/service-agreements/a1',
      );
      expect(s.href?.('services.service', { id: 's2', workspaceId: 'w2' })).toBeUndefined();
      expect(s.href?.('services.service-agreement', { id: 'a2' })).toBeUndefined();
      expect(
        s.href?.('services.service-application-method', { id: 'f1', workspaceId: 'w1' }),
      ).toBeUndefined();
    });
  });
});
