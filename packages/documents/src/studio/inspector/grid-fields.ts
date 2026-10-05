import {
  DEFAULT_GRID_ALIGN,
  DEFAULT_GRID_JUSTIFY,
  gridItemOption,
  gridPlacement,
  gridSize,
  MAX_GRID_COLUMNS,
  MAX_GRID_ROWS,
} from '../../renderers/default/grid-placement';
import { elementName } from '../../renderers/studio/element-actions';
import type { Governance } from '../capabilities/governance';
import type { DocumentContent } from '../document-types';
import { findById } from '../element-ids';
import { gridResizeLosses, resizeGrid } from '../grid-edits';
import { parentOf, recordOf } from './inspector-target';
import {
  absentIf,
  choice,
  isKind,
  optionOf,
  patchElement,
  type InspectorField,
} from './inspector-field';
import type { InspectorTarget } from './inspector-target';

const sizeField = (key: 'columns' | 'rows', label: string, max: number): InspectorField => ({
  key,
  section: 'Appearance',
  label,
  applies: isKind('grid'),
  schema: () => ({ type: 'integer', minimum: 1, maximum: max }),
  required: true,
  read: (t) => gridSize(t.element['options'])[key],
  // Only a whole size is written (rule 25): a cleared field is still being typed in.
  write: (content, t, value) =>
    Number.isInteger(value) ? resizeGrid(content, t.id, { [key]: value as number }) : content,
});

const VERTICAL = [
  ['start', 'Top'],
  ['center', 'Middle'],
  ['end', 'Bottom'],
] as const;
const HORIZONTAL = [
  ['start', 'Left'],
  ['center', 'Center'],
  ['end', 'Right'],
  ['stretch', 'Stretch'],
] as const;

/** A Grid's default alignment for its children (doc 260 rules 29, 33): required, the default an absent key. */
const gridAlignField = (
  key: 'alignItems' | 'justifyItems',
  label: string,
  choices: ReadonlyArray<readonly [string, string]>,
  fallback: string,
): InspectorField => ({
  key,
  section: 'Appearance',
  label,
  applies: isKind('grid'),
  schema: () => choice(choices),
  required: true,
  read: (t) => optionOf(t, key) ?? fallback,
  write: (content, t, value) =>
    patchElement(content, t, { options: { [key]: absentIf(value, fallback) } }),
});

/** A Grid child's own alignment (rules 29, 33), in its `gridItem`: empty means the Grid's. */
const childAlignField = (
  key: 'alignSelf' | 'justifySelf',
  label: string,
  choices: ReadonlyArray<readonly [string, string]>,
): InspectorField => ({
  key,
  section: 'Appearance',
  label,
  applies: (t) => t.inGrid,
  schema: () => choice(choices),
  options: { description: "Empty: the grid's." },
  read: (t) => recordOf(optionOf(t, 'gridItem'))?.[key],
  write: (content, t, value) => {
    // The child's placement as drawn, so a child authored without one never moves (rule 2).
    const grid = parentOf(content.variants.default, t.id);
    const placed =
      grid === undefined ? undefined : gridPlacement(grid).items.find((i) => i.key === t.id);
    const { [key]: _old, ...current } = recordOf(optionOf(t, 'gridItem')) ?? {};
    const rest = placed === undefined ? current : { ...current, ...gridItemOption(placed) };
    const own = absentIf(value);
    return patchElement(content, t, {
      options: { gridItem: own === undefined ? rest : { ...rest, [key]: own } },
    });
  },
});

/** Doc 260 rules 24, 33: a Grid's size and its children's default alignment, in Appearance ahead of Spacing. */
export const GRID_FIELDS: readonly InspectorField[] = Object.freeze([
  sizeField('columns', 'Columns', MAX_GRID_COLUMNS),
  sizeField('rows', 'Rows', MAX_GRID_ROWS),
  gridAlignField('alignItems', 'Vertical alignment', VERTICAL, DEFAULT_GRID_ALIGN),
  gridAlignField('justifyItems', 'Horizontal alignment', HORIZONTAL, DEFAULT_GRID_JUSTIFY),
]);

/** Doc 260 rule 33: a Grid child's own alignment — last in Appearance, after the element's own settings. */
export const GRID_CHILD_FIELDS: readonly InspectorField[] = Object.freeze([
  childAlignField('alignSelf', 'Vertical alignment', VERTICAL),
  childAlignField('justifySelf', 'Horizontal alignment', HORIZONTAL),
]);

/** What a Grid resize from the inspector's values would delete (rule 25). */
export interface GridShrinkPlan {
  /** Ids of the children outside the new size. */
  ids: string[];
  /** Their names, as the canvas names them. */
  names: string[];
  /** The template forbids deleting one of them (rule 26): the resize is refused whole. */
  locked: boolean;
}

/** The deletions `values` would make on a Grid target; `undefined` when nothing would be deleted. */
export function gridShrinkPlan(
  content: DocumentContent,
  target: InspectorTarget,
  values: Record<string, unknown>,
  governance: Governance | undefined,
): GridShrinkPlan | undefined {
  if (target.kind !== 'grid') return undefined;
  const size = Object.fromEntries(
    (['columns', 'rows'] as const).flatMap((key) => {
      const value = values[key];
      return Number.isInteger(value) && (value as number) >= 1 ? [[key, value as number]] : [];
    }),
  );
  const ids = gridResizeLosses(content, target.id, size);
  if (ids.length === 0) return undefined;
  const root = content.variants.default;
  const names = ids.map((id) => {
    const element = findById(root, id);
    return element === undefined ? id : elementName(element as never, content.schema);
  });
  return { ids, names, locked: ids.some((id) => governance?.canRemove(id) === false) };
}
