import type { DocumentContent, Uischema } from './document-types';
import { DEFAULT_VARIANT, variantOf, withVariant } from './document-types';
import { findById, idOf } from './element-ids';
import type { GridCell, GridDrop } from '../renderers/default/grid-placement';
import { withGridItem } from '../renderers/studio/grid-order';
import { cellAfter, gridLanding, isGrid, replaceById, withDisplaced } from './grid-edits';
import { isRow, landInRow } from './row-edits';
import type { PaletteCreation } from './palette-items';
import { boundKeys, keyOfScope } from './variants/variant-bindings';
import { ownerOf, withOwner } from './property-ref';
import { intoRecord, recordArrayOf } from './record-scope';
import { activeTabOf } from '../renderers/studio/active-tabs';
import { cardSlots } from '../renderers/ui/card-model';
import { tabsOf } from '../renderers/ui/tabs-model';

/**
 * `content` with a placed item (doc 238 rule 15): its element spliced into the `elements` of the element whose id is
 * `layoutId` (any depth, in `variantName` — default unless named) at `index` clamped to the list, and its schema
 * properties added. The SAME content when the layout is unknown or a property key already exists — an insert never
 * overwrites a field — and, outside default (doc 262 rule 13b), for a creation that adds properties or a Control over a
 * field the variant already shows.
 *
 * Into a Grid (doc 260 rule 19) the element takes `cell` — or, with none asked, the first free cell — at its reading
 * order index, `index` ignored; the SAME content when that cell is taken or the Grid is full.
 */
export function insertItem(
  content: DocumentContent,
  layoutId: string,
  index: number,
  creation: PaletteCreation,
  cell?: GridDrop,
  variantName: string = DEFAULT_VARIANT,
): DocumentContent {
  const original = variantOf(content, variantName);
  // Doc 271 rule 11: into a record's item form, fields become ITEM properties with item scopes.
  const array = recordArrayOf(original, layoutId);
  const placed = array === undefined ? creation : intoRecord(creation, array);
  if (placed === undefined) return content;
  const owner =
    (array === undefined ? content.schema : ownerOf(content.schema, { array, key: '' })) ?? {};
  const current = isRecord(owner['properties']) ? owner['properties'] : {};
  const added = placed.properties ?? {};
  if (Object.keys(added).some((key) => Object.hasOwn(current, key))) return content;
  if (variantName !== DEFAULT_VARIANT && !mayPlaceInVariant(original, placed)) return content;
  // Doc 260 rule 19: the items moved out of the arrival's way, then the arrival — one edit.
  const variant = withDisplaced(original, layoutId, cell?.displaced);
  const layout = findById(variant, layoutId);
  let { element } = placed;
  let at = index;
  if (layout !== undefined && isGrid(layout)) {
    const landing = gridLanding(layout, cell === undefined ? undefined : { x: cell.x, y: cell.y });
    if (landing === undefined) return content;
    element = withGridItem(element, { ...landing.cell, w: 1, h: 1 });
    at = landing.index;
  }
  let next: Uischema;
  if (layout !== undefined && isRow(layout)) {
    // Doc 261 rule 16: the arrival at its width, the row's others re-fitted around it — one edit.
    const landed = landInRow(layout, index, element);
    if (landed === undefined) return content;
    next = replaceById(variant, layoutId, () => landed);
  } else next = spliced(variant, layoutId, at, element);
  if (next === original) return content;
  const withElement = withVariant(content, next, variantName);
  if (Object.keys(added).length === 0) return withElement;
  const schema =
    array === undefined
      ? { ...content.schema, properties: { ...current, ...added } }
      : withOwner(content.schema, { array, key: '' }, (items) => ({
          ...items,
          properties: { ...current, ...added },
        }));
  return { ...withElement, schema };
}

/**
 * Doc 262 rule 13b: outside default an insert adds no schema property, and a Control only over a field default shows
 * that the variant does not show yet — each field once per variant.
 */
function mayPlaceInVariant(variant: Uischema, creation: PaletteCreation): boolean {
  if (Object.keys(creation.properties ?? {}).length > 0) return false;
  const placed = new Set(boundKeys(variant));
  return (
    boundKeys(creation.element).every((key) => !placed.has(key)) &&
    (creation.element['type'] !== 'Control' || keyOfScope(creation.element['scope']) !== undefined)
  );
}

/** Where a clicked palette item goes (doc 238 rule 16): a layout and the index in its `elements`. */
export interface AppendTarget {
  layoutId: string;
  index: number;
  /** Into a Grid, the cell (doc 260 rule 19); absent: the Grid's first free cell. */
  cell?: GridCell;
}

/**
 * Where a palette click places its item in `form`, by the page selection (doc 238 rule 16): the end of a selected
 * layout (an element with `elements`, other than the Form); right after a selected element that is not a layout, in its
 * own layout; the end of the Form with nothing selected, the Form selected, or an id not inside it.
 */
export function appendTarget(form: Uischema, selectedId: string | null): AppendTarget {
  const formId = idOf(form) ?? '';
  const end = { layoutId: formId, index: Infinity };
  if (selectedId === null || selectedId === formId) return end;
  const selected = findById(form, selectedId);
  if (selected === undefined) return end;
  // Doc 272 rule 10: a selected Tabs takes it into the tab it shows (else its first tab), never as a Tabs child.
  if (selected['type'] === 'Tabs') {
    const tabs = tabsOf(selected);
    const shown = tabs.find((tab) => tab.id === activeTabOf(selectedId)) ?? tabs[0];
    return shown === undefined ? end : { layoutId: shown.id, index: Infinity };
  }
  // Doc 273 rule 12: a selected Card takes it into its content slot, never as a Card child.
  if (selected['type'] === 'Card') {
    const slotId = cardSlots(selected).content?.['id'];
    return typeof slotId === 'string' ? { layoutId: slotId, index: Infinity } : end;
  }
  if (Array.isArray(selected['elements'])) return { layoutId: selectedId, index: Infinity };
  const parent = parentOf(form, selectedId);
  const parentId = parent === undefined ? undefined : idOf(parent);
  if (parent === undefined || parentId === undefined) return end;
  if (isGrid(parent)) {
    // After a Grid child: the next free cell (doc 260 rule 19). A full Grid has none, so the insert takes nothing.
    const cell = cellAfter(parent, selectedId);
    return { layoutId: parentId, index: Infinity, ...(cell !== undefined && { cell }) };
  }
  const siblings = parent['elements'] as unknown[];
  return {
    layoutId: parentId,
    index: siblings.findIndex((c) => isRecord(c) && idOf(c) === selectedId) + 1,
  };
}

/** The element whose `elements` directly hold the element with id `id`. */
function parentOf(node: Uischema, id: string): Uischema | undefined {
  const elements = node['elements'];
  if (!Array.isArray(elements)) return undefined;
  if (elements.some((child: unknown) => isRecord(child) && idOf(child) === id)) return node;
  for (const child of elements) {
    const found = isRecord(child) ? parentOf(child, id) : undefined;
    if (found !== undefined) return found;
  }
  return undefined;
}

/** `node` with `element` spliced into the `elements` of the element whose id is `layoutId` (any depth), clamped. */
export function spliced(
  node: Uischema,
  layoutId: string,
  index: number,
  element: Uischema,
): Uischema {
  const elements = node['elements'];
  if (idOf(node) === layoutId && Array.isArray(elements)) {
    const at = Math.min(Math.max(index, 0), elements.length);
    return { ...node, elements: [...elements.slice(0, at), element, ...elements.slice(at)] };
  }
  if (!Array.isArray(elements)) return node;
  const children = elements.map((child: unknown) =>
    isRecord(child) ? spliced(child, layoutId, index, element) : child,
  );
  return children.some((child, i) => child !== elements[i])
    ? { ...node, elements: children }
    : node;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
