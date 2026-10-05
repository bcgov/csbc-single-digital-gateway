import { useCallback, useEffect, useMemo, useState } from 'react';
import { governanceOf } from './capabilities/governance';
import type { CapabilityMap } from './capabilities/capability-types';
import type { DocumentStore, DocumentSummary } from './document-store';
import type { DocumentContent } from './document-types';
import { copyElement } from './element-copy';
import { removeElement } from './element-remove';
import { insertItem } from './palette-insert';
import type { PaletteItem } from './palette-items';
import type { StudioDraft } from './use-document-studio';

/**
 * The studio's content-wide element edits — palette insert, delete, copy — each refused when the pinned template forbids
 * it (doc 259 backstops), and the governance they and the canvas ask.
 */
export function useStudioEdits(
  draft: StudioDraft | null,
  items: readonly PaletteItem[],
  capabilities: CapabilityMap | undefined,
  setContent: (content: DocumentContent) => void,
) {
  // Doc 259: the pinned template's rules over the document being edited; `undefined` = ungoverned.
  const governance = useMemo(
    () => (draft === null ? undefined : governanceOf(draft.content, capabilities)),
    [draft, capabilities],
  );
  // A palette item placed on the page (doc 238 rules 14-16): created fresh, then applied with its schema properties.
  const insert = useCallback(
    (layoutId: string, index: number, itemId: string) => {
      const item = items.find((candidate) => candidate.id === itemId);
      if (draft === null || item === undefined) return;
      // Backstop (doc 259 rule 10): a layout the template locks takes nothing new.
      if (governance !== undefined && !governance.canAdd(layoutId)) return;
      const next = insertItem(draft.content, layoutId, index, item.create());
      if (next !== draft.content) setContent(next);
    },
    [items, draft, setContent, governance],
  );
  // A page element deleted through the gate (doc 242): removed with any schema property only it bound.
  const removeEl = useCallback(
    (elementId: string) => {
      if (draft === null || governance?.canRemove(elementId) === false) return;
      const next = removeElement(draft.content, elementId);
      if (next !== draft.content) setContent(next);
    },
    [draft, setContent, governance],
  );
  // A page element copied from its action bar (doc 254 rule 6): the copy's id comes back so the page selects it.
  const copyEl = useCallback(
    (elementId: string) => {
      if (draft === null || governance?.canCopy(elementId) === false) return undefined;
      const result = copyElement(draft.content, elementId);
      if (result === undefined) return undefined;
      setContent(result.content);
      return result.copyId;
    },
    [draft, setContent, governance],
  );
  return { governance, insert, removeEl, copyEl };
}

/** Every stored template, refreshed each time the New document dialog opens (doc 259 rule 1). */
export function useTemplates(store: DocumentStore, open: boolean): DocumentSummary[] {
  const [templates, setTemplates] = useState<DocumentSummary[]>([]);
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    store.list({ kind: 'template' }).then(
      (found) => {
        if (!cancelled) setTemplates(found);
      },
      (error: unknown) => console.error('[documents] could not list templates', error),
    );
    return () => {
      cancelled = true;
    };
  }, [store, open]);
  return templates;
}
