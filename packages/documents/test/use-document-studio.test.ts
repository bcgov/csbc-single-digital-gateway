import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createDocumentStore, STUB_DOCUMENTS } from '../src/studio';
import { useDocumentStudio } from '../src/studio/use-document-studio';

const seededStore = () => createDocumentStore({ seed: STUB_DOCUMENTS });

describe('useDocumentStudio', () => {
  it('opens the latest version of a document, clean', async () => {
    const { result } = renderHook(() =>
      useDocumentStudio({ documentId: 'stub-service', store: seededStore() }),
    );

    expect(result.current.status).toBe('loading');
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.draft?.ref).toEqual({
      documentId: 'stub-service',
      versionId: 'stub-service-v2',
    });
    expect(result.current.dirty).toBe(false);
  });

  it('opens the named version', async () => {
    const { result } = renderHook(() =>
      useDocumentStudio({
        documentId: 'stub-service',
        versionId: 'stub-service-v1',
        store: seededStore(),
      }),
    );

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.draft?.content.variants.default['label']).toBe('Fishing licence (v1)');
  });

  it('stamps ids on a document saved without them, without making it dirty', async () => {
    const store = createDocumentStore();
    const ref = await store.create({
      kind: 'document',
      type: 'services.service',
      content: {
        schema: {},
        variants: { default: { type: 'Funnel', elements: [{ type: 'Form', elements: [] }] } },
      },
    });
    const { result } = renderHook(() => useDocumentStudio({ documentId: ref.documentId, store }));

    await waitFor(() => expect(result.current.status).toBe('ready'));
    const root = result.current.draft!.content.variants.default;
    expect(root['id']).toMatch(/^[\w-]{8}$/);
    expect((root['elements'] as Record<string, unknown>[])[0]!['id']).toMatch(/^[\w-]{8}$/);
    expect(result.current.dirty).toBe(false);
  });

  it('reports an unknown document as not found', async () => {
    const { result } = renderHook(() =>
      useDocumentStudio({ documentId: 'missing', store: seededStore() }),
    );

    await waitFor(() => expect(result.current.status).toBe('not-found'));
    expect(result.current.draft).toBeNull();
  });

  it('becomes dirty when the content changes, and clean again once saved over the version', async () => {
    const store = seededStore();
    const save = vi.spyOn(store, 'save');
    const { result } = renderHook(() => useDocumentStudio({ documentId: 'stub-service', store }));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    const edited = {
      ...result.current.draft!.content,
      variants: { default: { type: 'Form', label: 'Edited', elements: [] } },
    };

    act(() => result.current.setContent(edited));
    expect(result.current.dirty).toBe(true);
    await act(() => result.current.save());

    expect(save).toHaveBeenCalledWith(
      { documentId: 'stub-service', versionId: 'stub-service-v2' },
      edited,
    );
    expect(result.current.dirty).toBe(false);
    expect((await store.load('stub-service'))?.content).toEqual(edited);
  });

  it('starts a preconfigured new document dirty, creates it on first save, then saves over it', async () => {
    const store = createDocumentStore();
    const create = vi.spyOn(store, 'create');
    const onSaved = vi.fn();
    const { result } = renderHook(() =>
      useDocumentStudio({ kind: 'template', type: 'services.service', store, onSaved }),
    );

    expect(result.current.draft?.content).toEqual({
      schema: { type: 'object', properties: {} },
      variants: { default: {} },
    });
    expect(result.current.dirty).toBe(true);
    await act(() => result.current.save());
    await act(() => result.current.save());

    expect(create).toHaveBeenCalledTimes(1);
    expect(onSaved).toHaveBeenCalledTimes(2);
    const ref = onSaved.mock.calls[0]![0];
    expect(result.current.draft?.ref).toEqual(ref);
    expect(result.current.dirty).toBe(false);
    expect(await store.load(ref.documentId)).toMatchObject({
      kind: 'template',
      type: 'services.service',
    });
  });

  it('does not reload when the host echoes back the ref it was just given', async () => {
    const store = createDocumentStore();
    const load = vi.spyOn(store, 'load');
    const { result, rerender } = renderHook((props: { documentId?: string }) =>
      useDocumentStudio({ ...props, kind: 'document', type: 'services.service', store }),
    );
    await act(() => result.current.save());

    rerender({ documentId: result.current.draft!.ref!.documentId });

    expect(load).not.toHaveBeenCalled();
    expect(result.current.status).toBe('ready');
  });

  it('keeps the draft dirty and reports the failure when a save fails', async () => {
    const store = createDocumentStore();
    vi.spyOn(store, 'create').mockRejectedValue(new Error('disk full'));
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() =>
      useDocumentStudio({ kind: 'document', type: 'services.service', store }),
    );

    await act(() => result.current.save());

    expect(result.current.saveError).toBe('The document could not be saved.');
    expect(result.current.dirty).toBe(true);
    expect(error).toHaveBeenCalled();
  });

  it('drops an open document when the host clears the document id', async () => {
    const { result, rerender } = renderHook(
      (props: { documentId?: string }) => useDocumentStudio({ ...props, store: seededStore() }),
      { initialProps: { documentId: 'stub-service' } as { documentId?: string } },
    );
    await waitFor(() => expect(result.current.status).toBe('ready'));

    rerender({});

    expect(result.current.status).toBe('new');
    expect(result.current.draft).toBeNull();
  });
});
