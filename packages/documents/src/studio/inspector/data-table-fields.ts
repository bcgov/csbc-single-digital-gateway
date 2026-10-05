import {
  DEFAULT_ADD_LABEL,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from '../../renderers/ui/array-options';
import {
  absentIf,
  BOOLEAN,
  isKind,
  optionOf,
  patchElement,
  STRING,
  WHOLE_NUMBER,
  type InspectorField,
} from './inspector-field';
import type { InspectorTarget } from './inspector-target';
import { updateProperty } from './schema-edits';

// Doc 266 rules 7-9: the options the object-array table reads, for the `data-table` kind only.

const applies = isKind('data-table');
const SMALL_SWITCH = Object.freeze({ component: 'switch', size: 'sm' });
const keyOf = (t: InspectorTarget) => t.property?.key ?? '';

/** A row-count keyword on the property — the schema, so default-variant only (doc 262). Cleared removes it. */
function rowLimit(key: string, label: string, keyword: 'minItems' | 'maxItems'): InspectorField {
  return {
    key,
    section: 'Validation',
    label,
    applies,
    schema: () => WHOLE_NUMBER,
    read: (t) => t.property?.schema[keyword],
    write: (content, t, value) => updateProperty(content, keyOf(t), { [keyword]: absentIf(value) }),
    schemaLevel: true,
  };
}

/** A switch over an `options` flag that defaults on: on writes nothing, off writes `false`. */
function allowRows(key: string, label: string, option: 'addRows' | 'deleteRows'): InspectorField {
  return {
    key,
    section: 'Appearance',
    label,
    applies,
    schema: () => BOOLEAN,
    options: SMALL_SWITCH,
    read: (t) => optionOf(t, option) !== false,
    write: (content, t, value) =>
      patchElement(content, t, { options: { [option]: absentIf(value, true) } }),
  };
}

export const DATA_TABLE_FIELDS: readonly InspectorField[] = Object.freeze([
  rowLimit('minRows', 'Minimum rows', 'minItems'),
  rowLimit('maxRows', 'Maximum rows', 'maxItems'),
  allowRows('addRows', 'Allow adding rows', 'addRows'),
  allowRows('deleteRows', 'Allow deleting rows', 'deleteRows'),
  {
    key: 'addLabel',
    section: 'Appearance',
    label: 'Add row label',
    applies,
    schema: () => STRING,
    options: { placeholder: DEFAULT_ADD_LABEL },
    // Never normalised on read: a trimmed read would eat the space just typed (doc 249).
    read: (t) => optionOf(t, 'addLabel'),
    write: (content, t, value) => {
      const label = absentIf(value);
      return patchElement(content, t, {
        options: { addLabel: label === DEFAULT_ADD_LABEL ? undefined : label },
      });
    },
  },
  {
    key: 'pageSize',
    section: 'Appearance',
    label: 'Rows per page',
    applies,
    schema: () => ({ type: 'integer', minimum: 1, maximum: MAX_PAGE_SIZE }),
    read: (t) => optionOf(t, 'pageSize') ?? DEFAULT_PAGE_SIZE,
    write: (content, t, value) =>
      patchElement(content, t, { options: { pageSize: absentIf(value, DEFAULT_PAGE_SIZE) } }),
  },
]);
