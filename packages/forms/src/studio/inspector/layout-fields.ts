import type { JsonSchema } from '@jsonforms/core';
import {
  DEFAULT_LAYOUT_GAP,
  GAP_REM,
  LAYOUT_GAPS,
  layoutGapOf,
} from '../../renderers/gridstack/layout-gap';
import { dividersOf } from '../../renderers/gridstack/grid-layouts';
import { BOOLEAN, wholeNumbers } from './field-schemas';
import type { InspectorContext } from './inspector-context';
import { finite, optionsOf, setElement, withOption } from './inspector-edits';
import type { InspectorField } from './inspector-fields';

// The Layout section's settings of a layout element itself (doc 187, doc 193 rules 13-14, doc 194 rules 17-18), in
// rendered order. A child's Width stays in inspector-fields.ts, after these.

/** Doc 193 rule 13: the gap names as a string combobox, titled with their size. */
const GAP_SCHEMA: JsonSchema = Object.freeze({
  type: 'string',
  oneOf: LAYOUT_GAPS.map((gap) => ({
    const: gap,
    title: gap === 'none' ? 'None' : `${gap.toUpperCase()} · ${GAP_REM[gap]}rem`,
  })),
});

/** Grid stores its column count as `column`, HorizontalLayout as `columns`. */
const columnsOption = (ctx: InspectorContext) => (ctx.layoutKind === 'grid' ? 'column' : 'columns');

export const LAYOUT_FIELDS: readonly InspectorField[] = Object.freeze([
  {
    key: 'columns',
    section: 'layout',
    label: 'Columns',
    applies: (ctx) => ctx.layoutKind === 'grid' || ctx.layoutKind === 'horizontal',
    schema: (ctx) => (ctx.layoutKind === 'grid' ? wholeNumbers(1, 12) : wholeNumbers(2, 6)),
    read: (ctx) => finite(optionsOf(ctx.element)[columnsOption(ctx)]),
    write: (ctx, edit, value) =>
      setElement(edit, withOption(edit.element, columnsOption(ctx), value)),
  },
  {
    // Doc 193 rules 13-14: every layout kind; shows the effective gap, and the default removes `options.gap`.
    key: 'gap',
    section: 'layout',
    label: 'Gap',
    applies: (ctx) => ctx.layoutKind !== undefined,
    schema: () => GAP_SCHEMA,
    read: (ctx) => layoutGapOf(optionsOf(ctx.element)),
    write: (_ctx, edit, value) =>
      setElement(
        edit,
        withOption(edit.element, 'gap', value === DEFAULT_LAYOUT_GAP ? undefined : value),
      ),
  },
  {
    // Doc 194 rule 17: rows only; off removes `options.dividers`.
    key: 'dividers',
    section: 'layout',
    label: 'Dividers',
    applies: (ctx) => ctx.layoutKind === 'horizontal',
    schema: () => BOOLEAN,
    options: () => ({ component: 'switch', size: 'sm' }),
    read: (ctx) => dividersOf(ctx.element.options),
    write: (_ctx, edit, value) =>
      setElement(edit, withOption(edit.element, 'dividers', value === true ? true : undefined)),
  },
] satisfies InspectorField[]);
