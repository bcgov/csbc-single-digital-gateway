import type { JsonSchema } from '@jsonforms/core';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { documentFor } from '../src/studio/document/document-source';
import { useDocumentSession } from '../src/studio/document/use-document-session';
import type { FormElement, VerticalLayoutElement } from '../src/types/elements';
import type { StudioDocument } from '../src/types/index';

// Doc 200 rules 2, 4-6 — `useDocumentSession`: which document the studio opens and what status it
// reports while getting there. Statuses: 'choosing' | 'loading' | 'ready' | 'failed'.

const schemaOf = (property: string): JsonSchema => ({
  type: 'object',
  properties: { [property]: { type: 'string' } },
});

const formOf = (label: string): FormElement => ({ type: 'Form', label, elements: [] });

const documentOf = (name: string): StudioDocument => ({
  schema: schemaOf(name),
  uischema: formOf(name),
});

/** A promise this test settles by hand, so a resolve can be timed against a choice or an unmount. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((settle, fail) => {
    resolve = settle;
    reject = fail;
  });
  return { promise, resolve, reject };
}

/** A loader that always rejects with `message`, built once so its identity is stable across renders. */
const failingLoad = (message: string) => () => Promise.reject(new Error(message));

/** Lets React apply the state a settled `loadDocument` sets, so nothing is asserted mid-update. */
const flush = () => act(async () => undefined);

describe('useDocumentSession', () => {
  describe('status precedence (rule 2)', () => {
    it('is ready at once when a uischema prop is passed', () => {
      const uischema = formOf('seeded');
      const { result } = renderHook(() => useDocumentSession({ uischema }));

      expect(result.current.status).toBe('ready');
      expect(result.current.document?.uischema).toBe(uischema);
      expect(result.current.reason).toBeNull();
    });

    it('is ready at once when a schema prop is passed', () => {
      const schema = schemaOf('name');
      const { result } = renderHook(() => useDocumentSession({ schema }));

      expect(result.current.status).toBe('ready');
      expect(result.current.document?.schema).toBe(schema);
      // An absent half stays an ABSENT KEY, so `useStudioDocument` fills it from the sample.
      expect(result.current.document && 'uischema' in result.current.document).toBe(false);
    });

    it('is loading when only loadDocument is passed', () => {
      const loadDocument = vi.fn(() => deferred<StudioDocument>().promise);
      const { result } = renderHook(() => useDocumentSession({ loadDocument }));

      expect(result.current.status).toBe('loading');
      expect(result.current.document).toBeNull();
    });

    it('is choosing when neither a seed nor loadDocument is passed', () => {
      const { result } = renderHook(() => useDocumentSession({}));

      expect(result.current.status).toBe('choosing');
      expect(result.current.document).toBeNull();
      expect(result.current.reason).toBeNull();
    });

    it('prefers a seeded document over loadDocument and never calls it', async () => {
      // This is what keeps every existing host and test working (rule 2).
      const uischema = formOf('seeded');
      const loadDocument = vi.fn(() => Promise.resolve(documentOf('loaded')));
      const { result } = renderHook(() => useDocumentSession({ uischema, loadDocument }));
      await flush();

      expect(result.current.status).toBe('ready');
      expect(result.current.document?.uischema).toBe(uischema);
      expect(loadDocument).not.toHaveBeenCalled();
    });
  });

  describe('loading (rules 4, 6)', () => {
    it('reaches ready with the resolved document', async () => {
      const loaded = documentOf('loaded');
      const loadDocument = vi.fn(() => Promise.resolve(loaded));
      const { result } = renderHook(() => useDocumentSession({ loadDocument }));

      expect(result.current.status).toBe('loading');
      await flush();

      expect(result.current.status).toBe('ready');
      expect(result.current.document).toBe(loaded);
    });

    it('calls loadDocument once for one function identity, across re-renders', async () => {
      const loadDocument = vi.fn(() => Promise.resolve(documentOf('loaded')));
      const { result, rerender } = renderHook(() => useDocumentSession({ loadDocument }));
      await flush();
      rerender();
      rerender();
      await flush();

      expect(loadDocument).toHaveBeenCalledTimes(1);
      expect(result.current.status).toBe('ready');
    });

    it('re-loads when loadDocument changes identity', async () => {
      const first = documentOf('first');
      const second = documentOf('second');
      const loadFirst = vi.fn(() => Promise.resolve(first));
      const loadSecond = vi.fn(() => Promise.resolve(second));
      const { result, rerender } = renderHook(
        (loadDocument: () => Promise<StudioDocument>) => useDocumentSession({ loadDocument }),
        { initialProps: loadFirst },
      );
      await flush();
      expect(result.current.document).toBe(first);

      rerender(loadSecond);
      await flush();

      expect(loadSecond).toHaveBeenCalledTimes(1);
      expect(loadFirst).toHaveBeenCalledTimes(1);
      expect(result.current.document).toBe(second);
    });

    it('does not call loadDocument during render', async () => {
      // Rule 4: called from an effect, never in the render pass.
      const loadDocument = vi.fn(() => Promise.resolve(documentOf('loaded')));
      const callsSeenWhileRendering: number[] = [];
      renderHook(() => {
        const session = useDocumentSession({ loadDocument });
        callsSeenWhileRendering.push(loadDocument.mock.calls.length);
        return session;
      });
      await flush();

      expect(callsSeenWhileRendering[0]).toBe(0);
      expect(loadDocument).toHaveBeenCalledTimes(1);
    });

    it('hands a resolved document through even when its root is neither Form nor Flow', async () => {
      // Rule 4: the canvas root check reports it — one root-error path, not two.
      const uischema: VerticalLayoutElement = { type: 'VerticalLayout', elements: [] };
      const loaded: StudioDocument = { schema: schemaOf('name'), uischema };
      // A stable identity: rule 4 re-loads on a changed one, so an inline arrow would load on every render.
      const loadDocument = () => Promise.resolve(loaded);
      const { result } = renderHook(() => useDocumentSession({ loadDocument }));
      await flush();

      expect(result.current.status).toBe('ready');
      expect(result.current.document?.uischema).toBe(uischema);
      expect(result.current.reason).toBeNull();
    });
  });

  describe('failure (rule 5)', () => {
    it('reaches failed when loadDocument rejects', async () => {
      const loadDocument = failingLoad('404 Not Found');
      const { result } = renderHook(() => useDocumentSession({ loadDocument }));
      await flush();

      expect(result.current.status).toBe('failed');
      expect(result.current.document).toBeNull();
    });

    it('exposes the rejection reason', async () => {
      const loadDocument = failingLoad('form 42 is not readable');
      const { result } = renderHook(() => useDocumentSession({ loadDocument }));
      await flush();

      expect(result.current.reason).toBe('form 42 is not readable');
    });

    it('retries on demand and reaches ready when the retry resolves', async () => {
      const loaded = documentOf('loaded');
      const loadDocument = vi
        .fn<() => Promise<StudioDocument>>()
        .mockRejectedValueOnce(new Error('offline'))
        .mockResolvedValueOnce(loaded);
      const { result } = renderHook(() => useDocumentSession({ loadDocument }));
      await flush();
      expect(result.current.status).toBe('failed');

      await act(async () => {
        result.current.retry();
      });
      await flush();

      expect(loadDocument).toHaveBeenCalledTimes(2);
      expect(result.current.status).toBe('ready');
      expect(result.current.document).toBe(loaded);
      expect(result.current.reason).toBeNull();
    });
  });

  describe('choosing beats a late load (rule 6)', () => {
    it('is ready with the chosen document once a choice is made', () => {
      const { result } = renderHook(() => useDocumentSession({}));
      expect(result.current.status).toBe('choosing');

      act(() => {
        result.current.choose('new-basic');
      });

      expect(result.current.status).toBe('ready');
      expect(result.current.document).toEqual(documentFor('new-basic'));
      expect(result.current.document?.uischema).toHaveProperty('type', 'Form');
    });

    it('discards a load that resolves after an explicit choice', async () => {
      const late = deferred<StudioDocument>();
      const loaded = documentOf('loaded');
      const loadDocument = () => late.promise;
      const { result } = renderHook(() => useDocumentSession({ loadDocument }));
      expect(result.current.status).toBe('loading');

      act(() => {
        result.current.choose('new-multi-stage');
      });
      await act(async () => {
        late.resolve(loaded);
        await late.promise;
      });

      expect(result.current.status).toBe('ready');
      expect(result.current.document).not.toBe(loaded);
      expect(result.current.document).toEqual(documentFor('new-multi-stage'));
    });

    it('discards a load that resolves after unmount without warning', async () => {
      const late = deferred<StudioDocument>();
      const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const loadDocument = () => late.promise;
      const { unmount } = renderHook(() => useDocumentSession({ loadDocument }));

      unmount();
      await act(async () => {
        late.resolve(documentOf('loaded'));
        await late.promise;
      });

      expect(errors).not.toHaveBeenCalled();
      errors.mockRestore();
    });
  });
});
