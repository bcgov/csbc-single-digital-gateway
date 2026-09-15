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
import type { FlowEditor } from '../renderers/xyflow/flow-editor';
import { useSelectionFlowEditor } from './use-flow-document';

/** What selection needs from the studio document (`useStudioDocument`). */
export interface SelectableDocument {
  readonly editor: GridEditor;
  /** The Flow editor writing Flow gestures to the document (doc 196). */
  readonly flowEditor: FlowEditor;
  /** The Form the canvas shows for `selectedId`, or `null` (doc 196 rule 12). */
  canvasRootOf(selectedId: string | null): string | null;
  /** Replaced when a new seed document resets the studio, and with it the element ids. */
  readonly seed: object;
  /** Every element below the root by studio id, with its uischema type. */
  readonly elementTypes: ReadonlyMap<string, string>;
  /** The root element's studio id (doc 186 rule 6). */
  readonly rootId: string;
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
  readonly parentOf: (elementId: string) => string | null;
  readonly canvasRootOf: (selectedId: string | null) => string | null;
  readonly setHovered: IdSetter;
  readonly setSelected: IdSetter;
  readonly setPressing: (pressing: boolean) => void;
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
    parentOf,
    canvasRootOf,
    setHovered,
    setSelected,
    setPressing,
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
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || confirming || insidePanelForm(event.target)) return;
      setSelected((current) => (current === null ? null : parentOf(current)));
    };

    document.addEventListener('pointerover', onOver);
    document.addEventListener('pointerout', onOut);
    document.addEventListener('pointerdown', onDown, true);
    document.addEventListener('pointerup', onUp, true);
    document.addEventListener('pointercancel', onUp, true);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerover', onOver);
      document.removeEventListener('pointerout', onOut);
      document.removeEventListener('pointerdown', onDown, true);
      document.removeEventListener('pointerup', onUp, true);
      document.removeEventListener('pointercancel', onUp, true);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [rootRef, active, confirming, parentOf, canvasRootOf, setHovered, setSelected, setPressing]);
}

/** Rules 21-23: the pending delete, and the studio-lifetime "Don't ask me again" flag. */
function useDeleteConfirmation({ remove, elementTypes }: SelectableDocument) {
  const [pending, setPending] = useState<PendingDelete | null>(null);
  const [skip, setSkip] = useState(false);

  return useMemo(
    () => ({
      pending,
      request: (elementId: string) => {
        if (skip) remove(elementId);
        else setPending({ elementId, elementType: elementTypes.get(elementId) ?? 'Element' });
      },
      confirm: (dontAskAgain: boolean) => {
        if (pending) remove(pending.elementId);
        if (dontAskAgain) setSkip(true);
        setPending(null);
      },
      cancel: () => setPending(null),
    }),
    [pending, skip, remove, elementTypes],
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
export function useStudioSelection(
  rootRef: RefObject<HTMLElement | null>,
  active: boolean,
  studio: SelectableDocument,
) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [gesturing, setGesturing] = useState(false);
  const [pressing, setPressing] = useState(false);
  const [seed, setSeed] = useState(studio.seed);
  const confirmation = useDeleteConfirmation(studio);

  if (seed !== studio.seed || (!active && (hovered !== null || selected !== null || gesturing))) {
    setSeed(studio.seed);
    setHovered(null);
    setSelected(null);
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
  } = studio;
  // Insert gestures read the latest document through a ref, so the Grid editor keeps its identity and grids never
  // reload merely because the document changed (doc 189 rule 25).
  const latest = useRef(studio);
  useEffect(() => {
    latest.current = studio;
  });
  const confirming = confirmation.pending !== null;
  usePointerSelection(rootRef, {
    active,
    confirming,
    parentOf,
    canvasRootOf,
    setHovered,
    setSelected,
    setPressing,
  });
  const flowEditor = useSelectionFlowEditor(studio.flowEditor, {
    select: setSelected,
    requestDelete: confirmation.request,
    setGesturing,
  });

  const known = (id: string | null) => id !== null && (id === rootId || elementTypes.has(id));
  const hoveredId = known(hovered) ? hovered : null;
  const selectedId = known(selected) ? selected : null;

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
      accepts: (layout, source) => documentEditor.accepts?.(layout, source) ?? true,
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

  return { port, editor, flowEditor, confirmation, hover, select: setSelected, pressing, add };
}
