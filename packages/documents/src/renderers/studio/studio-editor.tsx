import type { DropSource, Governance } from '../../studio/capabilities/governance';
import type { GridDrop } from '../default/grid-placement';
import type { ColumnEdit } from './column-edit';
import { createContext, useContext, useMemo, useRef, useState, type ReactNode } from 'react';

/** What a studio renderer may change on one element (doc 236 rule 11). It never carries a `type`. */
export interface ElementPatch {
  /** Merged shallowly over the element's options; a key whose value is `undefined` is removed. */
  options?: Record<string, unknown>;
  /** Replaces the element's `elements`. */
  elements?: unknown[];
  /** Sets the element's top-level `label`; `undefined` removes it. Absent key = untouched. */
  label?: string | undefined;
  /** Sets the element's JSONForms `rule` (doc 256); `undefined` removes it. Absent key = untouched. */
  rule?: Record<string, unknown> | undefined;
}

/** The studio edit port (doc 236 rules 11-12): edits by element id, plus the studio's local selection. */
export interface StudioEditor {
  update: (id: string, patch: ElementPatch) => void;
  /**
   * Places the palette item `itemId` in the layout `layoutId` at `index` (doc 238 rule 14). Renderers only ever see the
   * item's id, carried by the drag source; the host resolves and creates it. Into a Grid, `cell` is where it was
   * dropped — with the items moved out of its way — and `index` is ignored (doc 260 rule 19).
   */
  insert: (layoutId: string, index: number, itemId: string, cell?: GridDrop) => void;
  /**
   * Asks the host to delete the element with that id, `name` as the author knows it (doc 242). Absent: elements offer
   * no Delete.
   */
  remove?: ((id: string, name: string) => void) | undefined;
  /**
   * Moves the element with that id into the layout `layoutId` at `index` (doc 243). Absent: grids accept palette items
   * only, never another grid's. Into a Grid, `cell` is the cell it was dropped on (doc 260 rule 21).
   */
  move?: ((id: string, layoutId: string, index: number, cell?: GridDrop) => void) | undefined;
  /**
   * Inserts a copy of the element with that id right after it, returning the copy's id (doc 254 rule 6). Absent:
   * elements offer no Copy.
   */
  copy?: ((id: string) => string | undefined) | undefined;
  /** Opens the options editor for the choice field with that id (doc 255 rule 3). Absent: no Edit options. */
  editOptions?: ((id: string) => void) | undefined;
  /**
   * Edits the columns of the object array with that id (doc 263 rule 27) — a schema write the host gates by variant and
   * template. Absent: the studio data table is never editable.
   */
  editColumns?: ((id: string, edit: ColumnEdit) => void) | undefined;
  /** Opens the rule dialog for the element with that id (doc 256 rule 9). Absent: no Rules action. */
  editRule?: ((id: string) => void) | undefined;
  /**
   * Whether the layout `layoutId` may take that drop, by the document's own rules — records refuse nesting and unsafe
   * moves (doc 271 rule 15). Asked BEFORE gridstack takes the drop. Absent: every drop the template allows.
   */
  accepts?: ((layoutId: string, source: DropSource) => boolean) | undefined;
  /** The fields an element's rule tests that it may not (doc 256 rule 5); absent: never in error. */
  ruleProblems?: ((id: string) => string[]) | undefined;
  /** Whether an element has any field above it a rule could test (doc 256 rule 9b); absent: always. */
  canAddRule?: ((id: string) => boolean) | undefined;
  /** The pinned template's rules (doc 259); absent: ungoverned, everything allowed. */
  governance?: Governance | undefined;
  selectedId: string | null;
  select: (id: string | null) => void;
}

const StudioEditorContext = createContext<StudioEditor | null>(null);

/**
 * Whether a studio editor provider is present at all — even DISABLED. A page renders with a disabled provider while it
 * zooms open (doc 241 rule 6), so `useStudioEditor()` is `null` then; anything that words itself for the studio (the
 * empty drop zone, doc 238 bug B1) asks this instead, or it flashes the view-only wording first.
 */
const StudioPresenceContext = createContext(false);

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
  editOptions,
  editColumns,
  editRule,
  accepts,
  ruleProblems,
  canAddRule,
  governance,
  onSelectionChange,
  enabled = true,
  children,
}: {
  update: StudioEditor['update'];
  insert: StudioEditor['insert'];
  remove?: StudioEditor['remove'];
  move?: StudioEditor['move'];
  copy?: StudioEditor['copy'];
  editOptions?: StudioEditor['editOptions'];
  editColumns?: StudioEditor['editColumns'];
  editRule?: StudioEditor['editRule'];
  accepts?: StudioEditor['accepts'];
  ruleProblems?: StudioEditor['ruleProblems'];
  canAddRule?: StudioEditor['canAddRule'];
  governance?: StudioEditor['governance'];
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
    () => ({
      update,
      insert,
      remove,
      move,
      copy,
      editOptions,
      editColumns,
      editRule,
      accepts,
      ruleProblems,
      canAddRule,
      governance,
      selectedId,
      select,
    }),
    [
      update,
      insert,
      remove,
      move,
      copy,
      editOptions,
      editColumns,
      editRule,
      accepts,
      ruleProblems,
      canAddRule,
      governance,
      selectedId,
      select,
    ],
  );
  return (
    <StudioPresenceContext.Provider value={true}>
      <StudioEditorContext.Provider value={enabled ? editor : null}>
        {children}
      </StudioEditorContext.Provider>
    </StudioPresenceContext.Provider>
  );
}

/**
 * A layout's drop check (doc 259 rules 10-11, doc 271 rule 15): the template's rules, then the document's own. `undefined`
 * when neither has anything to say.
 */
export function dropCheck(
  editor: StudioEditor | null,
  layoutId: string | undefined,
): ((source: DropSource) => boolean) | undefined {
  if (editor === null || layoutId === undefined) return undefined;
  const { governance, accepts } = editor;
  if (governance === undefined && accepts === undefined) return undefined;
  return (source) =>
    (governance?.mayDrop(layoutId, source) ?? true) && (accepts?.(layoutId, source) ?? true);
}

/** Whether the pinned template lets the element's setting `key` change (doc 259 rule 14); ungoverned: always. */
export function mayEdit(editor: StudioEditor, id: string, key: string): boolean {
  return editor.governance?.canEdit(id, key) !== false;
}

/** Whether this renders inside the studio, editable or not yet — `false` only with no provider at all. */
export function useInStudio(): boolean {
  return useContext(StudioPresenceContext);
}

/** The editor, or `null` outside a provider — which means view-only (rule 12). */
export function useStudioEditor(): StudioEditor | null {
  return useContext(StudioEditorContext);
}
