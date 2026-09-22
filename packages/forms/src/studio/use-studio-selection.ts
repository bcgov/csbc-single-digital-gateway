import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from 'react';
import type { GridEditor, GridGesture } from '../renderers/gridstack/grid-editor';
import type { StudioItemPlacement, StudioSelection } from '../renderers/studio/studio-selection';
import type { TabsEditor } from '../renderers/gridstack/tabs-editor';
import type { FlowEditor } from '../renderers/xyflow/flow-editor';
import type { EdgePatch } from '../renderers/xyflow/flow-gestures';
import { useSelectionFlowEditor, type FlowInsertGesture } from './use-flow-document';
import { useSelectionTabsEditor } from './use-tabs-document';

/** What selection needs from the studio document (`useStudioDocument`). */
export interface SelectableDocument {
  readonly editor: GridEditor;
  /** The Flow editor writing Flow gestures to the document (doc 196). */
  readonly flowEditor: FlowEditor;
  /** Doc 198 rule 16: applies an on-canvas + gesture, returning the new element's id. */
  insertFlowGesture(gesture: FlowInsertGesture): string | undefined;
  /** Doc 209 rules 9-10: re-points one edge of a Flow, returning WHY it was refused (rule 15). */
  repointFlowEdge(flowId: string, edgeId: string, patch: EdgePatch): string | undefined;
  /** Doc 216 rule 14: the tabs editor writing Tabs edits to the document. */
  readonly tabsEditor: TabsEditor;
  /** Doc 216 rule 16: adds a Tab to that Tabs, returning the new element's id. */
  insertTab(tabsId: string): string | undefined;
  /** Doc 216 rule 17: the open Tab derived from `selectedId`, or `undefined`. */
  openTabFor(tabsId: string, selectedId: string | null): string | undefined;
  /** The Form the canvas shows for `selectedId`, or `null` (doc 196 rule 12). */
  canvasRootOf(selectedId: string | null): string | null;
  /** Replaced when a new seed document resets the studio, and with it the element ids. */
  readonly seed: object;
  /** Every element below the root by studio id, with its uischema type. */
  readonly elementTypes: ReadonlyMap<string, string>;
  /** The root element's studio id (doc 186 rule 6). */
  readonly rootId: string;
  /** Doc 210 rule 8b: whether deleting `elementId` would join its neighbours, which the confirmation says. */
  joinsOnDelete(elementId: string): boolean;
  /** The id of the element holding `elementId`; `null` for the root or an unknown id. */
  parentOf(elementId: string): string | null;
  copy(elementId: string, placement: StudioItemPlacement): string | undefined;
  /** Inserts a dropped palette template (doc 189 rule 25): the new element's id, or `undefined` when refused. */
  insert(gesture: Extract<GridGesture, { type: 'insert' }>): string | undefined;
  /** Inserts a clicked palette template next to `selectedId` (doc 189 rule 24). */
  add(template: string, selectedId: string | null): string | undefined;
  remove(elementId: string): void;
}

/** An element waiting on the delete confirmation (doc 185 rule 21). */
export interface PendingDelete {
  readonly elementId: string;
  readonly elementType: string;
  /** Doc 210 rule 8b: the node's neighbours will be joined, so the wording must not promise they are cut. */
  readonly joins: boolean;
}

type PointerTarget =
  | { readonly kind: 'item' | 'actions'; readonly id: string }
  | { readonly kind: 'canvas' | 'outside' | 'breadcrumbs' };

const OUTSIDE: PointerTarget = Object.freeze({ kind: 'outside' });
const CANVAS: PointerTarget = Object.freeze({ kind: 'canvas' });
const BREADCRUMBS: PointerTarget = Object.freeze({ kind: 'breadcrumbs' });

// The nearest of either is the innermost element: a grid item, or a framed element outside one (the root).
const ELEMENT_BOX = '.grid-stack-item, [data-slot="studio-element"][data-element-id]';
const GRID_ITEM_ROOT = ':scope > .grid-stack-item-content > [data-slot="studio-grid-item"]';

type IdSetter = Dispatch<SetStateAction<string | null>>;

/**
 * What a pointer event at `target` points at (doc 185 rules 1-2, 4-5, 7; doc 186 rules 3-4, 15): an
 * element's actions popover (portalled out of the studio, so found by its marker), the footer breadcrumbs
 * or their menu (likewise), the innermost element whose box holds the target — a studio grid item
 * (content, margin or resize handles) or the root's frame — the canvas (centre panel) around the root, or
 * anything else.
 */
export function pointerTargetOf(target: EventTarget | null, root: HTMLElement): PointerTarget {
  if (!(target instanceof Element)) return OUTSIDE;
  const actionsFor = target
    .closest('[data-studio-actions-for]')
    ?.getAttribute('data-studio-actions-for');
  if (actionsFor) return { kind: 'actions', id: actionsFor };
  if (target.closest('[data-studio-breadcrumbs]')) return BREADCRUMBS;
  if (!root.contains(target)) return OUTSIDE;

  const box = target.closest(ELEMENT_BOX);
  const element = box?.matches('.grid-stack-item') ? box.querySelector(GRID_ITEM_ROOT) : box;
  const id = element?.getAttribute('data-element-id');
  if (id) return { kind: 'item', id };
  return target.closest('[data-slot="form-studio-center-panel"]') ? CANVAS : OUTSIDE;
}

interface PointerSelectionOptions {
  readonly active: boolean;
  readonly confirming: boolean;
  /** Doc 206 rule 8: Escape belongs to the Edit Options dialog while it is open. */
  readonly editingOptions: boolean;
  /** Doc 206 rules 5-6: a double-click on an element offers to edit its options. */
  openOptions(elementId: string): void;
  readonly parentOf: (elementId: string) => string | null;
  readonly canvasRootOf: (selectedId: string | null) => string | null;
  readonly setHovered: IdSetter;
  readonly setSelected: IdSetter;
  readonly setPressing: (pressing: boolean) => void;
  /**
   * Doc 209 rule 3: clears a selected edge and reports whether there was one. Escape belongs to the edge
   * first — it is the innermost thing selected — and only walks the ELEMENT selection up when there was none.
   */
  readonly clearEdge: () => boolean;
}

/**
 * Whether a key event came from inside the inspector, the palette or the code editors, where Escape belongs to their
 * fields — Monaco closes its suggest widget with it (doc 187 rule 29, doc 189 rule 27, doc 191 rule 25).
 */
const insidePanelForm = (target: EventTarget | null) =>
  target instanceof Element &&
  target.closest('[data-studio-inspector], [data-studio-palette], [data-studio-code]') !== null;

/**
 * Document listeners turning pointer and key events into hover and selection (doc 185 rules 2, 5, 7; doc
 * 186 rules 3-4, 7, 15). The press listener captures, so gridstack's drag handling on the item cannot
 * swallow it; it also marks a press held from any studio target but the rest of the page until a pointerup
 * or pointercancel anywhere (doc 187 rule 27). Escape walks the selection up to the parent, and is left to
 * the delete confirmation while it is open and to the inspector's fields. Events in the breadcrumbs change
 * nothing here — the breadcrumbs set hover and selection themselves.
 */
function usePointerSelection(
  rootRef: RefObject<HTMLElement | null>,
  {
    active,
    confirming,
    editingOptions,
    openOptions,
    parentOf,
    canvasRootOf,
    setHovered,
    setSelected,
    setPressing,
    clearEdge,
  }: PointerSelectionOptions,
) {
  useEffect(() => {
    const root = rootRef.current;
    if (!active || !root) return;

    const onOver = (event: Event) => {
      const target = pointerTargetOf(event.target, root);
      if (target.kind === 'breadcrumbs') return;
      setHovered(target.kind === 'item' || target.kind === 'actions' ? target.id : null);
    };
    const onOut = (event: PointerEvent) => {
      if (event.relatedTarget === null) setHovered(null);
    };
    const onDown = (event: Event) => {
      if (event instanceof MouseEvent && event.button > 0) return;
      const target = pointerTargetOf(event.target, root);
      if (target.kind !== 'outside') setPressing(true);
      if (target.kind === 'item') setSelected(target.id);
      // Doc 196 rule 14: a press on empty canvas keeps a drilled-in Form, and clears anything else.
      else if (target.kind === 'canvas') setSelected((current) => canvasRootOf(current));
    };
    const onUp = () => setPressing(false);
    /**
     * Doc 206 rules 5-6: the package's first double-click gesture. It runs AFTER the press has already
     * selected the element, and `openOptions` itself ignores an element with no options — so a double-click
     * anywhere else on the canvas costs nothing.
     */
    const onDoubleClick = (event: Event) => {
      if (event instanceof MouseEvent && event.button > 0) return;
      const target = pointerTargetOf(event.target, root);
      if (target.kind === 'item') openOptions(target.id);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      // Rule 8: the dialog portals OUT of `[data-studio-inspector]`, so `insidePanelForm` does not cover it
      // and Escape would both close the dialog AND walk the selection up.
      if (event.key !== 'Escape' || confirming || editingOptions || insidePanelForm(event.target))
        return;
      // Rule 3: the edge goes first, and Escape stops there — one press, one step out.
      if (clearEdge()) return;
      setSelected((current) => (current === null ? null : parentOf(current)));
    };

    document.addEventListener('pointerover', onOver);
    document.addEventListener('pointerout', onOut);
    document.addEventListener('pointerdown', onDown, true);
    document.addEventListener('pointerup', onUp, true);
    document.addEventListener('pointercancel', onUp, true);
    document.addEventListener('dblclick', onDoubleClick);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerover', onOver);
      document.removeEventListener('pointerout', onOut);
      document.removeEventListener('pointerdown', onDown, true);
      document.removeEventListener('pointerup', onUp, true);
      document.removeEventListener('pointercancel', onUp, true);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [
    rootRef,
    active,
    confirming,
    editingOptions,
    openOptions,
    parentOf,
    canvasRootOf,
    setHovered,
    setSelected,
    setPressing,
    clearEdge,
  ]);
}

/**
 * Whether removing `removedId` takes `selectedId` with it — the same element, or one inside it. Walks up from the
 * selection with `parentOf`, so it must be called while both are still in the document.
 */
function takenBy(
  doc: Pick<SelectableDocument, 'parentOf'>,
  removedId: string,
  selectedId: string | null,
): boolean {
  let current = selectedId;
  while (current !== null) {
    if (current === removedId) return true;
    current = doc.parentOf(current);
  }
  return false;
}

/** Rules 21-23: the pending delete, and the studio-lifetime "Don't ask me again" flag. */
function useDeleteConfirmation(
  remove: (elementId: string) => void,
  elementTypes: ReadonlyMap<string, string>,
  joinsOnDelete: (elementId: string) => boolean,
) {
  const [pending, setPending] = useState<PendingDelete | null>(null);
  const [skip, setSkip] = useState(false);

  return useMemo(
    () => ({
      pending,
      request: (elementId: string) => {
        if (skip) remove(elementId);
        else
          setPending({
            elementId,
            elementType: elementTypes.get(elementId) ?? 'Element',
            joins: joinsOnDelete(elementId),
          });
      },
      confirm: (dontAskAgain: boolean) => {
        if (pending) remove(pending.elementId);
        if (dontAskAgain) setSkip(true);
        setPending(null);
      },
      cancel: () => setPending(null),
    }),
    [pending, skip, remove, elementTypes, joinsOnDelete],
  );
}

/**
 * Hover, selection and element actions for the Form Studio (doc 185 rule 30, doc 186). `active` is `false`
 * in preview, which clears everything; a new seed document does too, because its element ids restart. Ids
 * no longer in the document (a deleted element) read as nothing; the root's id is a valid one. Returns the
 * selection port for the studio renderers, the Grid editor extended with gesture tracking, the delete
 * confirmation, `hover` / `select` for the footer breadcrumbs (`hover` does nothing mid-gesture), and
 * `pressing` — a primary press that started in the studio is held (doc 187 rule 27).
 */
/** Doc 206 rules 5-8: the Edit Options dialog, which owns Escape while it is open. */
export interface OptionsGestures {
  readonly editingOptions: boolean;
  openOptions(elementId: string): void;
}

/** No options editor: no double-click gesture, and Escape keeps walking the selection. A module const, not a
 *  default object literal — a new identity each render would re-run the listener effect every time. */
const NO_OPTIONS_EDITOR: OptionsGestures = Object.freeze({
  editingOptions: false,
  openOptions: () => {},
});

export function useStudioSelection(
  rootRef: RefObject<HTMLElement | null>,
  active: boolean,
  studio: SelectableDocument,
  options: OptionsGestures = NO_OPTIONS_EDITOR,
  /** Doc 209 rules 16-18: the host's notice channel. Absent, a refusal still refuses — it just says nothing. */
  onNotice?: ((message: string) => void) | undefined,
) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  /**
   * Doc 209 rule 1: a PARALLEL field, not a discriminated union with the element selection. Every existing
   * reader — the frame highlight, the breadcrumbs, `canvasFocusId`, the inspector's element path — keeps
   * working unchanged and sees "no element selected" while an edge is selected, which is the behaviour wanted.
   * The invariant (at most one is set) is enforced in `setSelected` and `selectEdge` alone.
   */
  const [selectedEdge, setSelectedEdge] = useState<string | null>(null);
  const edgeRef = useRef<string | null>(null);
  edgeRef.current = selectedEdge;

  /** Rule 1: selecting an element clears the edge. The one place the two selections are reconciled. */
  const setSelected = useCallback<IdSetter>((update) => {
    setSelectedElement(update);
    setSelectedEdge(null);
  }, []);
  const selectEdge = useCallback((edgeId: string | null) => {
    setSelectedEdge(edgeId);
    if (edgeId !== null) setSelectedElement(null);
  }, []);
  const clearEdge = useCallback(() => {
    if (edgeRef.current === null) return false;
    setSelectedEdge(null);
    return true;
  }, []);
  const [gesturing, setGesturing] = useState(false);
  const [pressing, setPressing] = useState(false);
  const [seed, setSeed] = useState(studio.seed);

  if (
    seed !== studio.seed ||
    (!active &&
      (hovered !== null || selectedElement !== null || selectedEdge !== null || gesturing))
  ) {
    setSeed(studio.seed);
    setHovered(null);
    setSelectedElement(null);
    setSelectedEdge(null);
    setGesturing(false);
  }
  const {
    copy,
    add: addToDocument,
    editor: documentEditor,
    elementTypes,
    rootId,
    parentOf,
    canvasRootOf,
    joinsOnDelete,
  } = studio;
  // Insert gestures read the latest document through a ref, so the Grid editor keeps its identity and grids never
  // reload merely because the document changed (doc 189 rule 25).
  const latest = useRef(studio);
  useEffect(() => {
    latest.current = studio;
  });
  // Read through a ref for the same reason the document is: the Flow editor must keep its identity across
  // renders, and a host passing an inline arrow would otherwise rebuild it on every one (doc 200's trap).
  const noticeRef = useRef(onNotice);
  noticeRef.current = onNotice;

  /**
   * Deleting settles the selection exactly as a press on empty canvas does (doc 196 rule 14): `canvasRootOf` keeps a
   * drilled-in Form and clears anything else. Without it the selection would name an id the document no longer
   * holds, which `known` reads as nothing — and a Flow's canvas is focused BY the selection (doc 197), so deleting
   * a field dropped the author all the way back to the Flow. Read before the removal, while the ids still resolve;
   * a selection the removal does not take with it is left alone, and so is a focus the removal takes (the Form
   * itself, or the Stage around it).
   */
  const removeAndReselect = useCallback((elementId: string) => {
    const doc = latest.current;
    doc.remove(elementId);
    setSelected((current) => {
      if (!takenBy(doc, elementId, current)) return current;
      const focusId = doc.canvasRootOf(current);
      return focusId === null || takenBy(doc, elementId, focusId) ? null : focusId;
    });
  }, []);

  const confirmation = useDeleteConfirmation(removeAndReselect, elementTypes, joinsOnDelete);
  const confirming = confirmation.pending !== null;
  usePointerSelection(rootRef, {
    active,
    confirming,
    editingOptions: options.editingOptions,
    openOptions: options.openOptions,
    parentOf,
    canvasRootOf,
    setHovered,
    setSelected,
    setPressing,
    clearEdge,
  });
  const flowEditor = useSelectionFlowEditor(studio.flowEditor, {
    select: setSelected,
    requestDelete: confirmation.request,
    setGesturing,
    // Reads the latest document, like the Grid editor's insert, so the editor keeps its identity across edits.
    insert: (gesture) => latest.current.insertFlowGesture(gesture),
    selectEdge,
    // Doc 209 rules 15-16: the drag and the inspector panel run the SAME edit and report the same reason.
    repoint: (flowId, edgeId, patch) => {
      const problem = latest.current.repointFlowEdge(flowId, edgeId, patch);
      if (problem !== undefined) noticeRef.current?.(problem);
    },
  });

  const known = (id: string | null) => id !== null && (id === rootId || elementTypes.has(id));
  const hoveredId = known(hovered) ? hovered : null;
  const selectedId = known(selectedElement) ? selectedElement : null;

  // Doc 216 rules 15-17. Declared AFTER `selectedId`, which rule 17 derives the open tab from; the document
  // is reached through `latest` for the same identity reason the Flow's insert is.
  const tabsEditor = useSelectionTabsEditor(
    studio.tabsEditor,
    {
      select: setSelected,
      requestDelete: confirmation.request,
      insert: (tabsId) => latest.current.insertTab(tabsId),
      openTabId: (tabsId) => latest.current.openTabFor(tabsId, selectedId),
    },
    selectedId,
  );

  const port = useMemo<StudioSelection>(
    () => ({
      hoveredId,
      selectedId,
      gesturing,
      copy: (elementId, placement) => {
        const copyId = copy(elementId, placement);
        if (copyId !== undefined) setSelected(copyId);
      },
      requestDelete: confirmation.request,
    }),
    [hoveredId, selectedId, gesturing, copy, confirmation.request],
  );

  const editor = useMemo<GridEditor>(
    () => ({
      idOf: (element) => documentEditor.idOf(element),
      onGesture: (gesture) => {
        setGesturing(false);
        if (gesture.type === 'insert') {
          const insertedId = latest.current.insert(gesture);
          if (insertedId !== undefined) setSelected(insertedId);
        } else {
          documentEditor.onGesture(gesture);
        }
      },
      onGestureActive: setGesturing,
      // Doc 194 rule 11: drag acceptance is the document's decision.
      //
      // Doc 216 rule 12: `layoutId` MUST be forwarded. A shorter arrow is assignable to the wider port and
      // typechecks clean, so dropping it here would leave `use-studio-document` walking `elementPath` from
      // `undefined` — an empty ancestor chain, and an ancestry rule that silently never refuses anything.
      accepts: (layout, source, layoutId) =>
        documentEditor.accepts?.(layout, source, layoutId) ?? true,
    }),
    [documentEditor],
  );

  const hover = useCallback(
    (elementId: string | null) => {
      if (!gesturing) setHovered(elementId);
    },
    [gesturing],
  );

  /** Doc 189 rules 24-25: a clicked palette template lands next to the selection, and becomes the selection. */
  const add = useCallback(
    (template: string) => {
      const insertedId = addToDocument(template, selectedId);
      if (insertedId !== undefined) setSelected(insertedId);
    },
    [addToDocument, selectedId],
  );

  return {
    port,
    editor,
    flowEditor,
    tabsEditor,
    confirmation,
    hover,
    select: setSelected,
    pressing,
    add,
    selectedEdgeId: selectedEdge,
    selectEdge,
  };
}
