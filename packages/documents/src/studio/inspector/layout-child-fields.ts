import { gridItemOption, gridPlacement } from '../../renderers/default/grid-placement';
import { rowPlacement } from '../../renderers/default/row-placement';
import { idOf } from '../element-ids';
import { withVariant, type DocumentContent, type Uischema } from '../document-types';
import { maxGridWidth, replaceById, resizeGridChild } from '../grid-edits';
import { maxRowWidth, resizeRowChild } from '../row-edits';
import { HORIZONTAL, VERTICAL } from './grid-fields';
import { absentIf, choice, optionOf, patchElement, type InspectorField } from './inspector-field';
import { recordOf, type InspectorTarget } from './inspector-target';

// Doc 260 rule 33, doc 261 rules 20-20b: what a DIRECT child of a Grid or a HorizontalLayout may set about its place in
// it — its width (the non-drag way to resize, WCAG 2.5.7) and its own alignment.

const inLayout = (t: InspectorTarget) => t.inGrid || t.inRow;

/** The child's PLACED width: its cell span in a Grid, its stored width in a row. */
function widthOf(t: InspectorTarget): number {
  if (t.parent === undefined) return 1;
  if (t.inRow) return rowPlacement(t.parent).items.find((i) => i.key === t.id)?.stored ?? 1;
  return gridPlacement(t.parent).items.find((i) => i.key === t.id)?.w ?? 1;
}

/** The widest the child can be: room made from the row's others, or the Grid's neighbours moved (rule 20b). */
function widestOf(t: InspectorTarget): number {
  if (t.parent === undefined) return 1;
  return t.inRow ? maxRowWidth(t.parent) : Math.max(widthOf(t), maxGridWidth(t.parent, t.id));
}

/** `content` with the child's parent replaced by `layout` — the same content when it is unchanged. */
function withParent(
  content: DocumentContent,
  t: InspectorTarget,
  layout: Uischema,
): DocumentContent {
  const parentId = t.parent === undefined ? undefined : idOf(t.parent);
  if (parentId === undefined || layout === t.parent) return content;
  return withVariant(
    content,
    replaceById(content.variants.default, parentId, () => layout),
  );
}

const widthField: InspectorField = {
  key: 'width',
  section: 'Appearance',
  label: 'Width',
  applies: inLayout,
  schema: (t) => ({ type: 'integer', minimum: 1, maximum: widestOf(t) }),
  required: true,
  options: { description: 'Columns.' },
  read: widthOf,
  write: (content, t, value) => {
    if (t.parent === undefined || !Number.isInteger(value)) return content;
    const w = value as number;
    const layout = t.inRow ? resizeRowChild(t.parent, t.id, w) : resizeGridChild(t.parent, t.id, w);
    return withParent(content, t, layout);
  },
};

/** The child's own alignment, in its `gridItem`: empty means the layout's (doc 260 rule 33, doc 261 rule 20). */
const alignField = (
  key: 'alignSelf' | 'justifySelf',
  label: string,
  choices: ReadonlyArray<readonly [string, string]>,
): InspectorField => ({
  key,
  section: 'Appearance',
  label,
  applies: inLayout,
  schema: () => choice(choices),
  options: { description: "Empty: the layout's." },
  read: (t) => recordOf(optionOf(t, 'gridItem'))?.[key],
  write: (content, t, value) => {
    const { [key]: _old, ...current } = recordOf(optionOf(t, 'gridItem')) ?? {};
    // In a Grid, the child's placement as drawn, so a child authored without one never moves (doc 260 rule 2). A row
    // child's gridItem never holds a cell (doc 261 rule 16).
    const placed =
      t.inGrid && t.parent !== undefined
        ? gridPlacement(t.parent).items.find((i) => i.key === t.id)
        : undefined;
    const rest = placed === undefined ? current : { ...current, ...gridItemOption(placed) };
    const own = absentIf(value);
    return patchElement(content, t, {
      options: { gridItem: own === undefined ? rest : { ...rest, [key]: own } },
    });
  },
});

/** Last in Appearance, after the element's own settings. */
export const LAYOUT_CHILD_FIELDS: readonly InspectorField[] = Object.freeze([
  widthField,
  alignField('alignSelf', 'Vertical alignment', VERTICAL),
  alignField('justifySelf', 'Horizontal alignment', HORIZONTAL),
]);
