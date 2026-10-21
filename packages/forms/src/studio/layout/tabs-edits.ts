import type { UISchemaElement } from '@jsonforms/core';
import { stampMissingIds } from './stamp-ids';
import { allIdsUsed } from './form-address';
import { TABS_TYPE, TAB_CONTENT_TYPE, TAB_TYPE } from '../../renderers/gridstack/grid-layouts';
import type { ElementIds } from './element-ids';
import { findById, updateById, withElements, type TreeElement } from './element-tree';
import { nextElementLabel } from './flow-node-factory';

// Tabs edits in the studio document (doc 216 rules 16, 18-19), the pure half of the tab strip's
// affordances. Pure, like `flow-edits.ts`: every changed element is a new object carrying its studio id,
// untouched subtrees keep identity, and a refused edit returns the SAME uischema so the studio does not
// re-render (and does not push an undo entry) for a gesture that changed nothing.
//
// Doc 216 rule 18 deliberately exports NOTHING for removal: `removeElement` (`remove-element.ts`) already
// takes any element out of its parent's `elements` and reclaims the data properties its Controls used, and
// `withElements` is happy with an empty array — a Tabs with no Tabs is a valid state, not a
// throw. A `removeTab` here would be a second implementation of an edit that already exists.

/**
 * An add's result: the uischema, and the new Tab as it is in it, or `undefined` when refused. The same
 * shape as `FlowInsertResult`, so the studio's selection routing is identical for both — the caller reads the
 * new Tab's id off `inserted` with `ids.idOf` and selects it.
 */
export interface TabInsertResult {
  readonly uischema: UISchemaElement;
  readonly inserted: UISchemaElement | undefined;
}

/**
 * Rule 16: a fresh `"Tab <n>"` Tab with an empty panel.
 *
 * The numbering is `nextElementLabel` — the SAME mechanism the Flow's node factory numbers Stages and
 * Conditions with (doc 196 rule 20) — scoped to the Tabs, so the count is against that strip's own
 * Tabs rather than every Tab in the document. (`palette-templates.ts` `nextTitle` is the same rule
 * one layer over, but it numbers SCHEMA property titles; a Tab is numbered by its label.)
 *
 * No authored id and no `options`: a Tab is addressed by its place in `elements` (rule 19), and
 * `exactOptionalPropertyTypes` means an absent key, never an `undefined` one.
 */
/**
 * Rule 16: a Tab arrives WITH its TabContent, in one object. The pair is nested precisely so it cannot desync,
 * and building only half of it here would put the strip in the state the nesting exists to make impossible — a
 * trigger with no panel behind it.
 */
function newTabElement(tabs: TreeElement): TreeElement {
  return {
    type: TAB_TYPE,
    label: nextElementLabel(tabs, TAB_TYPE, 'Tab'),
    elements: [{ type: TAB_CONTENT_TYPE, elements: [] }],
  } as TreeElement;
}

/**
 * Rule 16: the Tabs with `tabsId` gains a Tab at the end of its strip.
 *
 * ONE edit: the Tab and its empty `elements` array arrive together, so there is a single undo and the
 * strip is never in a state where a trigger has no panel to show. Refused — the same document, no id — when
 * the id is not in the tree or does not name a Tabs.
 */
export function addTab(
  uischema: UISchemaElement,
  tabsId: string,
  ids: ElementIds,
): TabInsertResult {
  const root = uischema as TreeElement;
  const tabs = findById(root, tabsId, ids);
  if (tabs?.type !== TABS_TYPE) return { uischema, inserted: undefined };

  // Doc 219 rule 4: every element carries an authored id, and a Tab is built here rather than through
  // `insertElement`, so it is stamped here too — against the whole document's ids, not just this Tabs'.
  const tab = stampMissingIds(newTabElement(tabs), undefined, allIdsUsed(uischema)) as TreeElement;
  const next = updateById(
    root,
    tabsId,
    (element) => withElements(element, [...(element.elements ?? []), tab], ids),
    ids,
  );
  return { uischema: next, inserted: tab };
}

/**
 * Rule 19: the Tab at `from` moved to `to` within its Tabs.
 *
 * Placement in a Tabs is ORDER, never authored coordinates — the rule the axis layouts follow
 * (doc 180 rule 23) — so this writes `elements` order and nothing else: no `gridItem`, no `x`/`y`/`w`. The
 * moved Tab object itself is untouched, so its subtree and every studio id below it survive the move.
 *
 * Returns the same document for an unknown or non-Tabs id, an index that is not a whole number in
 * range, or a no-op move.
 */
export function reorderTabs(
  uischema: UISchemaElement,
  tabsId: string,
  from: number,
  to: number,
  ids: ElementIds,
): UISchemaElement {
  const root = uischema as TreeElement;
  const tabs = findById(root, tabsId, ids);
  if (tabs?.type !== TABS_TYPE) return uischema;

  const elements = tabs.elements ?? [];
  if (from === to) return uischema;
  if (!inRange(from, elements.length) || !inRange(to, elements.length)) return uischema;

  // `noUncheckedIndexedAccess`: the range check does not narrow the read, so the element is proved here.
  const moved = elements[from];
  if (!moved) return uischema;

  const without = elements.filter((_, index) => index !== from);
  const reordered = [...without.slice(0, to), moved, ...without.slice(to)];
  return updateById(root, tabsId, (element) => withElements(element, reordered, ids), ids);
}

const inRange = (index: number, length: number) =>
  Number.isInteger(index) && index >= 0 && index < length;

/**
 * Doc 216 rule 39: where a click-insert lands when a Tabs or a Tab is selected — the open tab's PANEL.
 *
 * Neither a `Tabs` nor a `Tab` is a layout kind (rule 1), so `addTargetId`'s "use the selection if it is a
 * layout, else its parent" walked UP from a selected Tab to the Tabs, which is not a layout either — and
 * `insertElement` then refused outright. The result was a tab panel with no way to put anything in it.
 *
 * A Tabs resolves to its FIRST tab's panel, which is always the open one: with the Tabs itself selected there
 * is no Tab on the path, so rule 17's derivation falls back to the first tab. `undefined` for anything else.
 */
export function panelTargetOf(element: TreeElement): TreeElement | undefined {
  const children = (element.elements ?? []) as TreeElement[];
  if (element.type === TAB_TYPE) return children.find((child) => child.type === TAB_CONTENT_TYPE);
  if (element.type !== TABS_TYPE) return undefined;
  const firstTab = children.find((child) => child.type === TAB_TYPE);
  return firstTab ? panelTargetOf(firstTab) : undefined;
}
