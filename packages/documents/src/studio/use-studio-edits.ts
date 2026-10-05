import { useCallback, useEffect, useMemo, useState } from 'react';
import type { GridDrop } from '../renderers/default/grid-placement';
import type { ColumnEdit } from '../renderers/studio/column-edit';
import { governanceOf } from './capabilities/governance';
import type { CapabilityMap } from './capabilities/capability-types';
import { canvasColumnEdit } from './column-edits';
import type { DocumentStore, DocumentSummary } from './document-store';
import { DEFAULT_VARIANT, type DocumentContent } from './document-types';
import { copyElement } from './element-copy';
import { removeElement } from './element-remove';
import { withoutDisplaced } from './grid-edits';
import { insertItem } from './palette-insert';
import type { PaletteItem } from './palette-items';
import type { StudioDraft } from './use-document-studio';

/**
 * The studio's content-wide element edits — palette insert, delete, copy, a data table's columns — each refused when the pinned template forbids
 * it (doc 259 backstops), and the governance they and the canvas ask.
 */
export function useStudioEdits(
  draft: StudioDraft | null,
  items: readonly PaletteItem[],
  capabilities: CapabilityMap | undefined,
  setContent: (content: DocumentContent) => void,
  variant: string = DEFAULT_VARIANT,
) {
  // Doc 259: the pinned template's rules over the variant being edited (doc 262 rule 17); `undefined` = ungoverned.
  const governance = useMemo(
    () => (draft === null ? undefined : governanceOf(draft.content, capabilities, variant)),
    [draft, capabilities, variant],
  );
  // A palette item placed on the page (doc 238 rules 14-16): created fresh, then applied with its schema properties.
  const insert = useCallback(
    (layoutId: string, index: number, itemId: string, cell?: GridDrop) => {
      const item = items.find((candidate) => candidate.id === itemId);
      if (draft === null || item === undefined) return;
      // Backstop (doc 259 rule 10): a layout the template locks takes nothing new.
      if (governance !== undefined && !governance.canAdd(layoutId)) return;
      // Doc 260 rule 19: moving items out of the arrival's way is a reorder the template may forbid.
      const drop = governance?.canReorder(layoutId) === false ? withoutDisplaced(cell) : cell;
      const next = insertItem(draft.content, layoutId, index, item.create(), drop, variant);
      if (next !== draft.content) setContent(next);
    },
    [items, draft, setContent, governance, variant],
  );
  // A page element deleted through the gate (doc 242): removed with any schema property only it bound.
  const removeEl = useCallback(
    (elementId: string) => {
      if (draft === null || governance?.canRemove(elementId) === false) return;
      const next = removeElement(draft.content, elementId, variant);
      if (next !== draft.content) setContent(next);
    },
    [draft, setContent, governance, variant],
  );
  // A page element copied from its action bar (doc 254 rule 6): the copy's id comes back so the page selects it.
  const copyEl = useCallback(
    (elementId: string) => {
      if (draft === null || governance?.canCopy(elementId) === false) return undefined;
      const result = copyElement(draft.content, elementId, variant);
      if (result === undefined) return undefined;
      setContent(result.content);
      return result.copyId;
    },
    [draft, setContent, governance, variant],
  );
  // A data table's columns edited in place (doc 263 rules 27-28): refused outside default or when the template locks them.
  const editColumns = useCallback(
    (elementId: string, edit: ColumnEdit) => {
      if (draft === null) return;
      const next = canvasColumnEdit(draft.content, variant, governance, elementId, edit);
      if (next !== draft.content) setContent(next);
    },
    [draft, setContent, governance, variant],
  );
  return { governance, insert, removeEl, copyEl, editColumns };
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
