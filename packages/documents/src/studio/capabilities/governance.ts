import { DEFAULT_VARIANT, variantOf, type DocumentContent, type Uischema } from '../document-types';
import { idOf } from '../element-ids';
import {
  capabilityFor,
  mayAddTo,
  mayChangeEdges,
  mayEdit,
  mayMove,
  mayRemove,
} from './capability-for';
import type { CapabilityMap } from './capability-types';

// Doc 259 — the ONE object every governed affordance and backstop asks. Built from the document being edited and its
// pinned template's Implementation Rules; `undefined` (no rules) means ungoverned: everything allowed.

/** What a drop brings into a layout: a new palette item, or an element moved from another layout. */
/** What a drag brings: a palette item (its id, when the drag carries one — doc 271 rule 15) or a moved element. */
export type DropSource = { palette: true; itemId?: string } | { elementId: string };

export interface Governance {
  /** A new child may be added to the layout (palette, Funnel add). */
  canAdd(layoutId: string): boolean;
  /** The element may leave its layout for `toLayoutId`. */
  canMove(elementId: string, toLayoutId: string): boolean;
  /** The element may be dragged within its layout: its own move and its layout's reorder. */
  canDrag(elementId: string): boolean;
  canRemove(elementId: string): boolean;
  /** A copy lands beside the element, so its layout must accept new children. */
  canCopy(elementId: string): boolean;
  /** The element's setting `key` (an inspector field key, or `key` / `options` / `rule` / `content`) may change. */
  canEdit(elementId: string, key: string): boolean;
  /** The layout's children may be rearranged within it. */
  canReorder(layoutId: string): boolean;
  /** A canvas edit (`label` / `options` / `rule` / `elements`) to the element touches only what may change. */
  canPatch(elementId: string, patch: CanvasPatch): boolean;
  /** A Funnel root's edges and Conditions may change; a Form root has none to lock. */
  canChangeConnections(): boolean;
  /** Whether the layout takes this drop — asked in the grid's accept check, never only at write-back (rule 10). */
  mayDrop(layoutId: string, source: DropSource): boolean;
  /** What the element itself may not do, for the lock badge (rule 9); empty when nothing. */
  restrictions(elementId: string): string[];
}

/** What a canvas edit may carry — `ElementPatch`'s shape, restated so the model imports nothing from the canvas. */
export interface CanvasPatch {
  label?: unknown;
  options?: Readonly<Record<string, unknown>>;
  rule?: unknown;
  elements?: unknown;
}

/** The Implementation Rules setting each inline option is (doc 259 rule 14); any other option is its own key. */
const OPTION_KEYS: Readonly<Record<string, string>> = Object.freeze({
  text: 'headingText',
  description: 'formDescription',
  content: 'content',
  // A Table's in-place edits are its Content (doc 265 rule 8).
  headers: 'content',
  rows: 'content',
  // A Table column's alignment, set from its canvas menu (doc 267 rule 7).
  align: 'content',
});

/** The setting a `label` is on each element type: a Funnel's name, a Form's title, else a field's label. */
const labelKeyOf = (type: unknown) =>
  type === 'Funnel' ? 'funnelName' : type === 'Form' ? 'formTitle' : 'label';

/** Every element by id, with its parent (the root has none). */
function indexOf(root: Uischema) {
  const elements = new Map<string, Uischema>();
  const parents = new Map<string, Uischema>();
  const visit = (node: Uischema, parent: Uischema | undefined) => {
    const id = idOf(node);
    if (id !== undefined) {
      elements.set(id, node);
      if (parent !== undefined) parents.set(id, parent);
    }
    const children = node['elements'];
    if (!Array.isArray(children)) return;
    for (const child of children)
      if (typeof child === 'object' && child !== null) visit(child as Uischema, node);
  };
  visit(root, undefined);
  return { elements, parents };
}

/** The pinned template's rules over `variant` of `content` (doc 262 rule 17), or `undefined` when there are none. */
export function governanceOf(
  content: DocumentContent,
  capabilities: CapabilityMap | undefined,
  variant: string = DEFAULT_VARIANT,
): Governance | undefined {
  if (capabilities === undefined) return undefined;
  const root = variantOf(content, variant);
  const { elements, parents } = indexOf(root);
  const own = (id: string) => {
    const element = elements.get(id);
    return element === undefined ? undefined : capabilityFor(capabilities, element);
  };
  const governance: Governance = {
    canAdd: (layoutId) => {
      const layout = elements.get(layoutId);
      return layout !== undefined && mayAddTo(capabilities, layout);
    },
    canMove: (elementId, toLayoutId) => {
      const [element, from, to] = [
        elements.get(elementId),
        parents.get(elementId),
        elements.get(toLayoutId),
      ];
      return (
        element !== undefined &&
        from !== undefined &&
        to !== undefined &&
        mayMove(capabilities, element, from, to)
      );
    },
    canDrag: (elementId) => {
      const parent = parents.get(elementId);
      return (
        parent !== undefined &&
        own(elementId)?.move === true &&
        capabilityFor(capabilities, parent).reorderChildren
      );
    },
    canRemove: (elementId) => {
      const [element, parent] = [elements.get(elementId), parents.get(elementId)];
      return (
        element !== undefined && parent !== undefined && mayRemove(capabilities, element, parent)
      );
    },
    canCopy: (elementId) => {
      const parent = parents.get(elementId);
      return parent !== undefined && mayAddTo(capabilities, parent);
    },
    canEdit: (elementId, key) => {
      const capability = own(elementId);
      return capability !== undefined && mayEdit(capability, key);
    },
    canReorder: (layoutId) => {
      const layout = elements.get(layoutId);
      return layout !== undefined && capabilityFor(capabilities, layout).reorderChildren;
    },
    canPatch: (elementId, patch) => {
      const element = elements.get(elementId);
      if (element === undefined) return false;
      if (patch.elements !== undefined && !governance.canReorder(elementId)) return false;
      const keys = [
        ...(patch.label === undefined ? [] : [labelKeyOf(element['type'])]),
        ...Object.keys(patch.options ?? {}).map((key) => OPTION_KEYS[key] ?? key),
        ...(patch.rule === undefined ? [] : ['rule']),
      ];
      return keys.every((key) => governance.canEdit(elementId, key));
    },
    canChangeConnections: () => root['type'] !== 'Funnel' || mayChangeEdges(capabilities, root),
    mayDrop: (layoutId, source) =>
      'palette' in source
        ? governance.canAdd(layoutId)
        : governance.canMove(source.elementId, layoutId),
    restrictions: (elementId) => {
      const capability = own(elementId);
      if (capability === undefined) return [];
      const { edit, remove, move } = capability;
      return [
        edit === 'none' ? 'settings locked' : Array.isArray(edit) ? 'some settings locked' : null,
        remove ? null : "can't be deleted",
        move ? null : "can't be moved",
      ].filter((entry): entry is string => entry !== null);
    },
  };
  return governance;
}

/** Whether a Funnel node may be deleted (doc 259 rule 12): connections must be free, and a Form itself removable. */
export function mayRemoveNode(
  governance: Governance,
  target: { kind: 'form' | 'condition' | 'element'; id: string },
): boolean {
  if (!governance.canChangeConnections()) return false;
  return target.kind !== 'form' || governance.canRemove(target.id);
}

/** Disabled-affordance text (rule 8). */
export const LOCKED = 'Locked by the template';
