import { createContext, useContext, useMemo } from 'react';
import type { AddTarget } from './canvas-graph';
import { canConnectFrom, type ConnectSource } from './connect-edits';
import type { PendingDelete } from './delete-gate';
import type { Uischema } from './document-types';
import { updateElement, type ElementPatch } from './element-edits';
import { moveElement } from './element-move';
import { addAfter, addBefore, addBetween, type NodeKind } from './node-edits';

/**
 * What the canvas's nodes and edges can do to the variant, by id. A context rather than callbacks in node/edge `data`,
 * so the graph stays plain data and xyflow is not handed new functions on every render.
 */
export interface CanvasActions {
  add: (target: AddTarget, kind: NodeKind) => void;
  /** Asks before deleting, unless the author stopped asking (doc 234 rules 8-9). */
  remove: (target: PendingDelete) => void;
  editCondition: (conditionId: string) => void;
  /** Opens a Form's page, as a double-click does (doc 234 rule 5). */
  focus: (formId: string) => void;
  /** Selects a Form and reveals the inspector (doc 234 rule 7). */
  inspect: (formId: string) => void;
  /** Enters connect mode for a free output, or into a headless Condition (doc 235 rule 5). */
  startConnect: (source: ConnectSource) => void;
  /** Whether a + may offer Connection: only on a Funnel's flow (doc 235 rule 2). */
  canConnect: boolean;
  /** Whether that +'s Connection has any node to pick; listed but disabled when not (doc 235 rule 2b). */
  connectable: (target: AddTarget) => boolean;
  /** Applies a studio renderer's edit to the element with that id (doc 236 rule 36). */
  edit: (id: string, patch: ElementPatch) => void;
  /** Places a palette item in a layout on the page (doc 238 rule 14). */
  insert: (layoutId: string, index: number, itemId: string) => void;
  /** Moves a page element into a layout at an index (doc 243): a uischema-only edit, like `edit`. */
  move: (id: string, layoutId: string, index: number) => void;
  /** Copies a page element, returning the copy's id (doc 254 rule 6); absent: elements offer no Copy. */
  copy?: ((elementId: string) => string | undefined) | undefined;
  /** Whether page elements offer Delete (doc 242): the host can apply an element delete. */
  canRemoveElement: boolean;
  /** Reports the focused page's element selection to the host (doc 238 rule 16b). */
  selectElement: (elementId: string | null) => void;
}

export const CanvasActionsContext = createContext<CanvasActions | null>(null);

export function useCanvasActions(): CanvasActions {
  const actions = useContext(CanvasActionsContext);
  if (actions === null) throw new Error('useCanvasActions must be used inside DocumentCanvas');
  return actions;
}

/** What the nodes and edges can do: every edit goes through a pure function and out through `onChange`. */
export function useEditActions(
  uischema: Uischema,
  onChange: (uischema: Uischema) => void,
  /** Given while a page is focused: adding from its + also leaves the page. */
  unfocus: (() => void) | undefined,
  {
    remove,
    editCondition,
    focus,
    inspect,
    startConnect,
    canConnect,
    insert,
    canRemoveElement,
    selectElement,
    copy,
  }: Omit<CanvasActions, 'add' | 'edit' | 'move' | 'connectable'>,
): CanvasActions {
  return useMemo(
    () => ({
      add: (target, kind) => {
        onChange(added(uischema, target, kind));
        unfocus?.();
      },
      remove,
      editCondition,
      focus,
      inspect,
      startConnect,
      canConnect,
      connectable: (target) => canConnectFrom(uischema, target),
      edit: (id, patch) => {
        const next = updateElement(uischema, id, patch);
        // A patch that changes nothing is not an edit.
        if (next !== uischema) onChange(next);
      },
      insert,
      move: (id, layoutId, index) => {
        const next = moveElement(uischema, id, layoutId, index);
        // A refused move, or one to where the element already is, is not an edit.
        if (next !== uischema) onChange(next);
      },
      canRemoveElement,
      selectElement,
      copy,
    }),
    [
      uischema,
      onChange,
      unfocus,
      remove,
      editCondition,
      focus,
      inspect,
      startConnect,
      canConnect,
      insert,
      canRemoveElement,
      selectElement,
      copy,
    ],
  );
}

/** The variant with a node added where a + asked; a leading + only ever adds a Form, an orphan's nothing. */
function added(uischema: Uischema, target: AddTarget, kind: NodeKind): Uischema {
  if (target.kind === 'between') return addBetween(uischema, target.edgeId, kind);
  if (target.kind === 'trailing') return addAfter(uischema, target.output, kind);
  // An orphan's + only connects (doc 235 rule 10b): it never adds.
  if (target.kind === 'orphan') return uischema;
  return addBefore(uischema, target.nodeId);
}
