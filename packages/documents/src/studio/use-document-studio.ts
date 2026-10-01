import { useCallback, useEffect, useRef, useState } from 'react';
import type { DocumentRef, DocumentStore } from './document-store';
import { ensureContentIds } from './element-ids';
import { ensureContentStart } from './funnel-model';
import {
  blankContent,
  contentChanged,
  type DocumentContent,
  type DocumentKind,
  type DocumentType,
} from './document-types';

/** The document open in the studio. `ref` and `baseline` are `null` until it is first saved. */
export interface StudioDraft {
  kind: DocumentKind;
  type: DocumentType;
  content: DocumentContent;
  baseline: DocumentContent | null;
  ref: DocumentRef | null;
}

export type StudioStatus = 'new' | 'loading' | 'ready' | 'not-found';

export interface UseDocumentStudioOptions {
  documentId?: string | undefined;
  versionId?: string | undefined;
  kind?: DocumentKind | undefined;
  type?: DocumentType | undefined;
  store: DocumentStore;
  onSaved?: ((ref: DocumentRef) => void) | undefined;
}

function newDraft(kind: DocumentKind, type: DocumentType): StudioDraft {
  return { kind, type, content: blankContent(), baseline: null, ref: null };
}

/** Whether `ref` is what the host is asking for, so a host echoing a just-saved ref causes no reload. */
function isShowing(
  ref: DocumentRef | null,
  documentId: string,
  versionId: string | undefined,
): boolean {
  return ref?.documentId === documentId && (versionId === undefined || ref.versionId === versionId);
}

type Setter<T> = (value: T) => void;

/**
 * Opens what the host asks for whenever it changes: a stored version, or a new document once kind and type
 * are known. A host echoing back the ref it was just given by a save causes no reload.
 */
function useOpenDocument(
  { documentId, versionId, kind, type, store }: UseDocumentStudioOptions,
  draftRef: { readonly current: StudioDraft | null },
  setDraft: Setter<StudioDraft | null>,
  setStatus: Setter<StudioStatus>,
) {
  useEffect(() => {
    if (documentId === undefined) {
      setStatus('new');
      setDraft(kind !== undefined && type !== undefined ? newDraft(kind, type) : null);
      return;
    }
    if (isShowing(draftRef.current?.ref ?? null, documentId, versionId)) return;
    let cancelled = false;
    setStatus('loading');
    store.load(documentId, versionId).then(
      (loaded) => {
        if (cancelled) return;
        setStatus(loaded === null ? 'not-found' : 'ready');
        // Documents saved before ids or Funnel starts existed get them now. The stamped content is also the baseline, so opening
        // one is not a change; the ids are persisted with the next save.
        const content =
          loaded === null ? null : ensureContentStart(ensureContentIds(loaded.content));
        setDraft(
          loaded === null || content === null
            ? null
            : {
                ...loaded,
                content,
                baseline: content,
                ref: { documentId: loaded.documentId, versionId: loaded.versionId },
              },
        );
      },
      (error: unknown) => {
        console.error(`[documents] could not load document ${documentId}`, error);
        if (!cancelled) setStatus('not-found');
      },
    );
    return () => {
      cancelled = true;
    };
  }, [documentId, versionId, kind, type, store]);
}

/**
 * The studio's document lifecycle: open an existing version (the latest unless `versionId` names one),
 * start a new document once kind and type are known, track dirtiness against the last save, and save.
 */
export function useDocumentStudio(options: UseDocumentStudioOptions) {
  const { documentId, versionId, kind, type, store } = options;
  const [status, setStatus] = useState<StudioStatus>(documentId === undefined ? 'new' : 'loading');
  const [draft, setDraft] = useState<StudioDraft | null>(() =>
    documentId === undefined && kind !== undefined && type !== undefined
      ? newDraft(kind, type)
      : null,
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const onSavedRef = useRef(options.onSaved);
  onSavedRef.current = options.onSaved;

  useOpenDocument({ documentId, versionId, kind, type, store }, draftRef, setDraft, setStatus);

  const start = useCallback((nextKind: DocumentKind, nextType: DocumentType) => {
    setDraft(newDraft(nextKind, nextType));
  }, []);

  const setContent = useCallback((content: DocumentContent) => {
    setDraft((current) => (current === null ? current : { ...current, content }));
  }, []);

  const save = useCallback(async () => {
    const current = draftRef.current;
    if (current === null) return;
    setSaving(true);
    setSaveError(null);
    try {
      const ref = current.ref ?? (await store.create(current));
      if (current.ref !== null) await store.save(ref, current.content);
      setDraft((latest) =>
        latest === null ? latest : { ...latest, ref, baseline: current.content },
      );
      setStatus('ready');
      onSavedRef.current?.(ref);
    } catch (error) {
      console.error('[documents] could not save the document', error);
      setSaveError('The document could not be saved.');
    } finally {
      setSaving(false);
    }
  }, [store]);

  const dirty =
    draft !== null && (draft.baseline === null || contentChanged(draft.content, draft.baseline));

  return { status, draft, dirty, saving, saveError, start, setContent, save };
}
