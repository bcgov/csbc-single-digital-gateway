import {
  DEFAULT_ROW_JUSTIFY,
  MAX_ROW_COLUMNS,
  rowSettings,
} from '../../renderers/default/row-placement';
import { DEFAULT_GRID_ALIGN } from '../../renderers/default/grid-placement';
import { idOf } from '../element-ids';
import { variantOf, withVariant } from '../document-types';
import { replaceById } from '../grid-edits';
import { resizeRow } from '../row-edits';
import { VERTICAL } from './grid-fields';
import {
  absentIf,
  choice,
  isKind,
  optionOf,
  patchElement,
  type InspectorField,
} from './inspector-field';

// Doc 261 rule 19: a HorizontalLayout's own settings, in Appearance ahead of Spacing. Defaults are absent keys.

const DISTRIBUTIONS = [
  ['stretch', 'Flex'],
  ['start', 'Left'],
  ['center', 'Center'],
  ['end', 'Right'],
] as const;

const children = (element: Record<string, unknown>) =>
  Array.isArray(element['elements']) ? element['elements'].length : 0;

export const ROW_FIELDS: readonly InspectorField[] = Object.freeze([
  {
    key: 'rowColumns',
    section: 'Appearance',
    label: 'Columns',
    applies: isKind('horizontal-layout'),
    // Never fewer columns than children: each needs one (rule 19).
    schema: (t) => ({
      type: 'integer',
      minimum: Math.max(1, children(t.element)),
      maximum: MAX_ROW_COLUMNS,
    }),
    required: true,
    read: (t) => rowSettings(t.element['options']).columns,
    write: (content, t, value) => {
      if (!Number.isInteger(value)) return content;
      const next = resizeRow(t.element, value as number);
      const id = idOf(t.element);
      return next === t.element || id === undefined
        ? content
        : withVariant(
            content,
            replaceById(variantOf(content, t.variant), id, () => next),
            t.variant,
          );
    },
  },
  {
    key: 'justify',
    section: 'Appearance',
    label: 'Distribution',
    applies: isKind('horizontal-layout'),
    schema: () => choice(DISTRIBUTIONS),
    required: true,
    read: (t) => optionOf(t, 'justify') ?? DEFAULT_ROW_JUSTIFY,
    write: (content, t, value) =>
      patchElement(content, t, { options: { justify: absentIf(value, DEFAULT_ROW_JUSTIFY) } }),
  },
  {
    key: 'rowAlignItems',
    section: 'Appearance',
    label: 'Vertical alignment',
    applies: isKind('horizontal-layout'),
    schema: () => choice(VERTICAL),
    required: true,
    read: (t) => optionOf(t, 'alignItems') ?? DEFAULT_GRID_ALIGN,
    write: (content, t, value) =>
      patchElement(content, t, { options: { alignItems: absentIf(value, DEFAULT_GRID_ALIGN) } }),
  },
]);
