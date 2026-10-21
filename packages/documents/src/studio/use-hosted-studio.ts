import { useCallback, useEffect, useRef, useState } from 'react';
import type { DocumentContent, DocumentKind, DocumentType } from './document-types';
import { ensureContentIds } from './element-ids';
import { ensureContentStart } from './funnel-model';
import type { GoverningTemplate, StudioDraft, useDocumentStudio } from './use-document-studio';

/** What a host hands a controlled studio (doc 276). */
export interface HostedStudioOptions {
  content: DocumentContent;
  kind: DocumentKind;
  type: DocumentType;
  /** The governing template's name and rules (doc 259) — the host loads them; the studio never does. */
  governing?: GoverningTemplate | undefined;
  /** Every content the author makes, and ONCE on mount: the opened content, with ids stamped (the baseline). */
  onContentChange?: ((content: DocumentContent) => void) | undefined;
}

/** The same surface as `useDocumentStudio`, so the studio shell does not care which drives it. */
export type StudioState = ReturnType<typeof useDocumentStudio>;

const NOTHING = () => undefined;
const NOTHING_ASYNC = () => Promise.resolve();

/**
 * A studio CONTROLLED by its host (doc 276): seeded from `content` ONCE per mount, reporting every edit through
 * `onContentChange`, and touching no store — the host fetches, saves, versions and decides what is dirty.
 *
 * Seeded once on purpose (the feature 218 trap): a host's refetch after a save hands back an equal content with a NEW
 * identity, and re-seeding on that would clear element ids and the author's selection. A host that opens another
 * version REMOUNTS the studio (`key` it by the version id).
 *
 * `onContentChange` is held in a ref, so an inline arrow is safe. Its first call is the baseline — the content as
 * opened, with any missing element ids and Funnel start stamped — so a host comparing against what it stored must
 * treat that first call as "not a change" (compare by value, as `FormStudio`'s hosts already do).
 *
 * `options === null` (an uncontrolled studio) makes this inert: no draft, no emits.
 */
export function useHostedStudio(options: HostedStudioOptions | null): StudioState | null {
  const [draft, setDraft] = useState<StudioDraft | null>(() =>
    options === null
      ? null
      : {
          kind: options.kind,
          type: options.type,
          content: ensureContentStart(ensureContentIds(options.content)),
          baseline: null,
          ref: null,
        },
  );
  const onChangeRef = useRef(options?.onContentChange);
  onChangeRef.current = options?.onContentChange;
  const content = draft?.content;
  useEffect(() => {
    if (content !== undefined) onChangeRef.current?.(content);
  }, [content]);
  const setContent = useCallback((next: DocumentContent) => {
    setDraft((current) => (current === null ? current : { ...current, content: next }));
  }, []);
  if (options === null) return null;
  return {
    status: 'ready',
    draft,
    dirty: false,
    saving: false,
    saveError: null,
    start: NOTHING,
    setContent,
    save: NOTHING_ASYNC,
    governing: options.governing ?? null,
  };
}
