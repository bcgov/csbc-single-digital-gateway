import { createContext, useContext, useMemo, useRef, useState, type ReactNode } from 'react';

/** What a studio renderer may change on one element (doc 236 rule 11). It never carries a `type`. */
export interface ElementPatch {
  /** Merged shallowly over the element's options; a key whose value is `undefined` is removed. */
  options?: Record<string, unknown>;
  /** Replaces the element's `elements`. */
  elements?: unknown[];
  /** Sets the element's top-level `label`; `undefined` removes it. Absent key = untouched. */
  label?: string | undefined;
}

/** The studio edit port (doc 236 rules 11-12): edits by element id, plus the studio's local selection. */
export interface StudioEditor {
  update: (id: string, patch: ElementPatch) => void;
  /**
   * Places the palette item `itemId` in the layout `layoutId` at `index` (doc 238 rule 14). Renderers only ever see the
   * item's id, carried by the drag source; the host resolves and creates it.
   */
  insert: (layoutId: string, index: number, itemId: string) => void;
  /**
   * Asks the host to delete the element with that id, `name` as the author knows it (doc 242). Absent: elements offer
   * no Delete.
   */
  remove?: ((id: string, name: string) => void) | undefined;
  /**
   * Moves the element with that id into the layout `layoutId` at `index` (doc 243). Absent: grids accept palette items
   * only, never another grid's.
   */
  move?: ((id: string, layoutId: string, index: number) => void) | undefined;
  /**
   * Inserts a copy of the element with that id right after it, returning the copy's id (doc 254 rule 6). Absent:
   * elements offer no Copy.
   */
  copy?: ((id: string) => string | undefined) | undefined;
  selectedId: string | null;
  select: (id: string | null) => void;
}

const StudioEditorContext = createContext<StudioEditor | null>(null);

/**
 * Makes the studio renderers below it editable; `update` is the host's, the selection is owned here. `enabled={false}`
 * provides `null` — view-only — WITHOUT changing the tree, so a host toggling editability never remounts what is below
 * (doc 241 rule 6: a closing page keeps its scroll).
 */
export function StudioEditorProvider({
  update,
  insert,
  remove,
  move,
  copy,
  onSelectionChange,
  enabled = true,
  children,
}: {
  update: StudioEditor['update'];
  insert: StudioEditor['insert'];
  remove?: StudioEditor['remove'];
  move?: StudioEditor['move'];
  copy?: StudioEditor['copy'];
  /**
   * Told every time the selection changes (doc 238 rule 16b) — the provider still owns it. Held in a ref, so an inline
   * arrow is safe.
   */
  onSelectionChange?: ((id: string | null) => void) | undefined;
  enabled?: boolean;
  children: ReactNode;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const report = useRef(onSelectionChange);
  report.current = onSelectionChange;
  const select = useMemo(
    () => (id: string | null) => {
      setSelectedId(id);
      report.current?.(id);
    },
    [],
  );
  const editor = useMemo(
    () => ({ update, insert, remove, move, copy, selectedId, select }),
    [update, insert, remove, move, copy, selectedId, select],
  );
  return (
    <StudioEditorContext.Provider value={enabled ? editor : null}>
      {children}
    </StudioEditorContext.Provider>
  );
}

/** The editor, or `null` outside a provider — which means view-only (rule 12). */
export function useStudioEditor(): StudioEditor | null {
  return useContext(StudioEditorContext);
}
