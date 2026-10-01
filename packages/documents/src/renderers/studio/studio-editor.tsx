import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

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
  selectedId: string | null;
  select: (id: string | null) => void;
}

const StudioEditorContext = createContext<StudioEditor | null>(null);

/** Makes the studio renderers below it editable; `update` is the host's, the selection is owned here. */
export function StudioEditorProvider({
  update,
  children,
}: {
  update: StudioEditor['update'];
  children: ReactNode;
}) {
  const [selectedId, select] = useState<string | null>(null);
  const editor = useMemo(() => ({ update, selectedId, select }), [update, selectedId]);
  return <StudioEditorContext.Provider value={editor}>{children}</StudioEditorContext.Provider>;
}

/** The editor, or `null` outside a provider — which means view-only (rule 12). */
export function useStudioEditor(): StudioEditor | null {
  return useContext(StudioEditorContext);
}
