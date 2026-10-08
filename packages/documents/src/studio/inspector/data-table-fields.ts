import {
  DEFAULT_ADD_ITEM_LABEL,
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
import type { PropertyRef } from '../property-ref';
import { refOf, type InspectorTarget, type TargetKind } from './inspector-target';
import { updateProperty } from './schema-edits';

// Doc 266 rules 7-9: the options the object-array table reads, for the `data-table` kind only.

const applies = isKind('data-table');
/**
 * A record (doc 271 rule 17) and an accordion input (doc 280 rule 12) share the row options, but have no pages and
 * call their rows items.
 */
const appliesToArrays = isKind('data-table', 'record', 'accordion-input');
/** Row counts also bound a document reference's references (doc 287 rule 15); adding and deleting rows do not apply. */
const appliesToCounts = isKind('data-table', 'record', 'accordion-input', 'document-reference');
const SMALL_SWITCH = Object.freeze({ component: 'switch', size: 'sm' });
/** The bound property's reference — a page key, or a record item field's (doc 271). */
const keyOf = (t: InspectorTarget): PropertyRef =>
  t.property === undefined ? { key: '' } : refOf(t.property);

/** A row-count keyword on the property — the schema, so default-variant only (doc 262). Cleared removes it. */
function rowLimit(key: string, label: string, keyword: 'minItems' | 'maxItems'): InspectorField {
  return {
    key,
    section: 'Validation',
    label,
    applies: appliesToCounts,
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
    applies: appliesToArrays,
    schema: () => BOOLEAN,
    options: SMALL_SWITCH,
    read: (t) => optionOf(t, option) !== false,
    write: (content, t, value) =>
      patchElement(content, t, { options: { [option]: absentIf(value, true) } }),
  };
}

/** The Add button's label (doc 266 rule 8, doc 271 rule 17): blank or the default writes nothing. */
function addLabelField(
  key: string,
  label: string,
  kinds: readonly TargetKind[],
  fallback: string,
): InspectorField {
  return {
    key,
    section: 'Appearance',
    label,
    applies: isKind(...kinds),
    schema: () => STRING,
    options: { placeholder: fallback },
    // Never normalised on read: a trimmed read would eat the space just typed (doc 249).
    read: (t) => optionOf(t, 'addLabel'),
    write: (content, t, value) => {
      const text = absentIf(value);
      return patchElement(content, t, {
        options: { addLabel: text === fallback ? undefined : text },
      });
    },
  };
}

export const DATA_TABLE_FIELDS: readonly InspectorField[] = Object.freeze([
  rowLimit('minRows', 'Minimum rows', 'minItems'),
  rowLimit('maxRows', 'Maximum rows', 'maxItems'),
  allowRows('addRows', 'Allow adding rows', 'addRows'),
  allowRows('deleteRows', 'Allow deleting rows', 'deleteRows'),
  addLabelField('addLabel', 'Add row label', ['data-table'], DEFAULT_ADD_LABEL),
  addLabelField(
    'addItemLabel',
    'Add item label',
    ['record', 'accordion-input'],
    DEFAULT_ADD_ITEM_LABEL,
  ),
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
