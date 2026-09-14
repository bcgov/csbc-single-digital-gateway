import {
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from 'react';
import type { GridEditor } from '../renderers/gridstack/grid-editor';
import type { StudioItemPlacement, StudioSelection } from '../renderers/studio/studio-selection';

/** What selection needs from the studio document (`useStudioDocument`). */
export interface SelectableDocument {
  readonly editor: GridEditor;
  /** Replaced when a new seed document resets the studio, and with it the element ids. */
  readonly seed: object;
  /** Every element below the root by studio id, with its uischema type. */
  readonly elementTypes: ReadonlyMap<string, string>;
  copy(elementId: string, placement: StudioItemPlacement): string | undefined;
  remove(elementId: string): void;
}

/** An element waiting on the delete confirmation (doc 185 rule 21). */
export interface PendingDelete {
  readonly elementId: string;
  readonly elementType: string;
}

type PointerTarget =
  | { readonly kind: 'item' | 'actions'; readonly id: string }
  | { readonly kind: 'canvas' | 'outside' };

const OUTSIDE: PointerTarget = Object.freeze({ kind: 'outside' });
const CANVAS: PointerTarget = Object.freeze({ kind: 'canvas' });

type IdSetter = Dispatch<SetStateAction<string | null>>;

/**
 * What a pointer event at `target` points at (doc 185 rules 1-2, 4-5, 7): an element's actions popover
 * (portalled out of the studio, so found by its marker), the innermost studio grid item whose box —
 * content, margin or resize handles — holds the target, the canvas (centre panel) around the items, or
 * anything else. The root element is not a grid item, so it counts as canvas.
 */
export function pointerTargetOf(target: EventTarget | null, root: HTMLElement): PointerTarget {
  if (!(target instanceof Element)) return OUTSIDE;
  const actionsFor = target
    .closest('[data-studio-actions-for]')
    ?.getAttribute('data-studio-actions-for');
  if (actionsFor) return { kind: 'actions', id: actionsFor };
  if (!root.contains(target)) return OUTSIDE;

  const id = target
    .closest('.grid-stack-item')
    ?.querySelector(':scope > .grid-stack-item-content > [data-slot="studio-grid-item"]')
    ?.getAttribute('data-element-id');
  if (id) return { kind: 'item', id };
  return target.closest('[data-slot="form-studio-center-panel"]') ? CANVAS : OUTSIDE;
}

/**
 * Document listeners turning pointer and key events into hover and selection (rules 2, 5, 7). The press
 * listener captures, so gridstack's drag handling on the item cannot swallow it. Escape is left to the
 * delete confirmation while it is open.
 */
function usePointerSelection(
  rootRef: RefObject<HTMLElement | null>,
  active: boolean,
  confirming: boolean,
  setHovered: IdSetter,
  setSelected: IdSetter,
) {
  useEffect(() => {
    const root = rootRef.current;
    if (!active || !root) return;

    const onOver = (event: Event) => {
      const target = pointerTargetOf(event.target, root);
      setHovered(target.kind === 'item' || target.kind === 'actions' ? target.id : null);
    };
    const onOut = (event: PointerEvent) => {
      if (event.relatedTarget === null) setHovered(null);
    };
    const onDown = (event: Event) => {
      if (event instanceof MouseEvent && event.button > 0) return;
      const target = pointerTargetOf(event.target, root);
      if (target.kind === 'item') setSelected(target.id);
      else if (target.kind === 'canvas') setSelected(null);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !confirming) setSelected(null);
    };

    document.addEventListener('pointerover', onOver);
    document.addEventListener('pointerout', onOut);
    document.addEventListener('pointerdown', onDown, true);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerover', onOver);
      document.removeEventListener('pointerout', onOut);
      document.removeEventListener('pointerdown', onDown, true);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [rootRef, active, confirming, setHovered, setSelected]);
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
 * Hover, selection and element actions for the Form Studio (doc 185 rule 30). `active` is `false` in
 * preview, which clears everything; a new seed document does too, because its element ids restart. Ids
 * no longer in the document (a deleted element) read as nothing. Returns the selection port for the
 * studio grid items, the Grid editor extended with gesture tracking, and the delete confirmation.
 */
export function useStudioSelection(
  rootRef: RefObject<HTMLElement | null>,
  active: boolean,
  studio: SelectableDocument,
) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [gesturing, setGesturing] = useState(false);
  const [seed, setSeed] = useState(studio.seed);
  const confirmation = useDeleteConfirmation(studio);

  if (seed !== studio.seed || (!active && (hovered !== null || selected !== null || gesturing))) {
    setSeed(studio.seed);
    setHovered(null);
    setSelected(null);
    setGesturing(false);
  }
  usePointerSelection(rootRef, active, confirmation.pending !== null, setHovered, setSelected);

  const { copy, editor: documentEditor, elementTypes } = studio;
  const hoveredId = hovered !== null && elementTypes.has(hovered) ? hovered : null;
  const selectedId = selected !== null && elementTypes.has(selected) ? selected : null;

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
        documentEditor.onGesture(gesture);
      },
      onGestureActive: setGesturing,
    }),
    [documentEditor],
  );

  return { port, editor, confirmation };
}
