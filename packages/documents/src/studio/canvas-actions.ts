import type { DropSource, Governance } from './capabilities/governance';
import type { GridDrop } from '../renderers/default/grid-placement';
import type { ColumnEdit } from '../renderers/studio/column-edit';
import { createContext, useContext, useMemo } from 'react';
import type { AddTarget } from './canvas-graph';
import { canConnectFrom, type ConnectSource } from './connect-edits';
import type { PendingDelete } from './delete-gate';
import type { Uischema } from './document-types';
import { updateElement, type ElementPatch } from './element-edits';
import { moveElement } from './element-move';
import { withoutDisplaced } from './grid-edits';
import { restoreRules } from './rules/strip-rules';
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
  /** Whether a + may add a node — the template may lock the Funnel's connections or children (doc 259 rule 13). */
  canAddNode: boolean;
  /** Whether that +'s Connection has any node to pick; listed but disabled when not (doc 235 rule 2b). */
  connectable: (target: AddTarget) => boolean;
  /** Applies a studio renderer's edit to the element with that id (doc 236 rule 36). */
  edit: (id: string, patch: ElementPatch) => void;
  /** Places a palette item in a layout on the page (doc 238 rule 14). */
  insert: (layoutId: string, index: number, itemId: string, cell?: GridDrop) => void;
  /** Moves a page element into a layout at an index (doc 243): a uischema-only edit, like `edit`. */
  move: (id: string, layoutId: string, index: number, cell?: GridDrop) => void;
  /** Copies a page element, returning the copy's id (doc 254 rule 6); absent: elements offer no Copy. */
  copy?: ((elementId: string) => string | undefined) | undefined;
  /** Opens the options editor for a page choice field (doc 255 rule 3); absent: no Edit options. */
  editOptions?: ((elementId: string) => void) | undefined;
  /** Edits a page object array's columns (doc 263 rule 27); absent: the studio table is never editable. */
  editColumns?: ((elementId: string, edit: ColumnEdit) => void) | undefined;
  /** Whether a layout may take a drop, by the document's own rules (doc 271 rule 15); absent: all. */
  accepts?: ((layoutId: string, source: DropSource) => boolean) | undefined;
  /** Opens the rule dialog for a page element (doc 256 rule 9); absent: no Rules action. */
  editRule?: ((elementId: string) => void) | undefined;
  /** The fields a page element's rule may not test (doc 256 rule 5); absent: never in error. */
  ruleProblems?: ((elementId: string) => string[]) | undefined;
  /** Whether a page element has any field above it a rule could test (doc 256 rule 9b); absent: always. */
  canAddRule?: ((elementId: string) => boolean) | undefined;
  /** The pinned template's rules (doc 259); absent: ungoverned. */
  governance?: Governance | undefined;
  /** Whether page elements offer Delete (doc 242): the host can apply an element delete. */
  canRemoveElement: boolean;
  /** Reports the focused page's element selection to the host (doc 238 rule 16b). */
  selectElement: (elementId: string | null) => void;
  /** The focused page's element selection as the host holds it — the footer's crumbs can set it. */
  pageSelectedId?: string | null | undefined;
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
    pageSelectedId,
    copy,
    editOptions,
    editColumns,
    accepts,
    moveContent,
    editRule,
    ruleProblems,
    canAddRule,
    governance,
  }: Omit<CanvasActions, 'add' | 'edit' | 'move' | 'connectable' | 'canAddNode'> & {
    /**
     * The host's content-level move (doc 271 rule 14): a field crossing into or out of a record moves its property too,
     * which a uischema-only move cannot. Absent: the uischema move.
     */
    moveContent?:
      | ((id: string, layoutId: string, index: number, cell?: GridDrop) => void)
      | undefined;
  },
): CanvasActions {
  return useMemo(
    () => ({
      add: (target, kind) => {
        // Backstop (doc 259 rule 13): adding a node changes the Funnel's connections and its children.
        if (governance !== undefined && !mayAddNode(governance, uischema)) return;
        onChange(added(uischema, target, kind));
        unfocus?.();
      },
      remove,
      editCondition,
      focus,
      inspect,
      startConnect,
      canConnect: canConnect && governance?.canChangeConnections() !== false,
      canAddNode: governance === undefined || mayAddNode(governance, uischema),
      connectable: (target) => canConnectFrom(uischema, target),
      edit: (id, patch) => {
        // Backstop (doc 259 rules 11, 14): a reorder or inline edit the template locks is not applied.
        if (governance !== undefined && !governance.canPatch(id, patch)) return;
        // A layout's reorder writes back the canvas's elements, whose rules were moved aside (doc 256 bug).
        const restored =
          patch.elements === undefined
            ? patch
            : { ...patch, elements: patch.elements.map(restoreRules) };
        const next = updateElement(uischema, id, restored);
        // A patch that changes nothing is not an edit.
        if (next !== uischema) onChange(next);
      },
      insert,
      move: (id, layoutId, index, cell) => {
        // Backstop (doc 259 rule 11): only where the element, its source and the target all allow.
        if (governance !== undefined && !governance.canMove(id, layoutId)) return;
        // Doc 260 rule 19: moving items out of the arrival's way is a reorder the template may forbid.
        const drop = governance?.canReorder(layoutId) === false ? withoutDisplaced(cell) : cell;
        if (moveContent !== undefined) {
          moveContent(id, layoutId, index, drop);
          return;
        }
        const next = moveElement(uischema, id, layoutId, index, drop);
        // A refused move, or one to where the element already is, is not an edit.
        if (next !== uischema) onChange(next);
      },
      canRemoveElement,
      selectElement,
      pageSelectedId,
      copy,
      editOptions,
      editColumns,
      accepts,
      editRule,
      ruleProblems,
      canAddRule,
      governance,
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
      pageSelectedId,
      copy,
      editOptions,
      editColumns,
      accepts,
      moveContent,
      editRule,
      ruleProblems,
      canAddRule,
      governance,
    ],
  );
}

/** Whether a node may be added to the root: connections change, and the root takes a new child (doc 259 rule 13). */
export function mayAddNode(governance: Governance, root: Uischema): boolean {
  const id = root['id'];
  return governance.canChangeConnections() && typeof id === 'string' && governance.canAdd(id);
}

/** The variant with a node added where a + asked; a leading + only ever adds a Form, an orphan's nothing. */
function added(uischema: Uischema, target: AddTarget, kind: NodeKind): Uischema {
  if (target.kind === 'between') return addBetween(uischema, target.edgeId, kind);
  if (target.kind === 'trailing') return addAfter(uischema, target.output, kind);
  // An orphan's + only connects (doc 235 rule 10b): it never adds.
  if (target.kind === 'orphan') return uischema;
  return addBefore(uischema, target.nodeId);
}
