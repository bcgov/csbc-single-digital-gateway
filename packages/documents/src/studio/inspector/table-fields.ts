import {
  absentIf,
  BOOLEAN,
  isKind,
  optionOf,
  patchElement,
  STRING,
  type InspectorField,
} from './inspector-field';

// Doc 267 rule 8: how a Table element draws — uischema options, per variant, each absent at its default.

const applies = isKind('table');
const SMALL_SWITCH = Object.freeze({ component: 'switch', size: 'sm' });

/** A switch over a Table `options` flag; `on` is its default, which writes nothing. */
function flag(key: string, label: string, option: string, on = false): InspectorField {
  return {
    key,
    section: 'Appearance',
    label,
    applies,
    schema: () => BOOLEAN,
    options: SMALL_SWITCH,
    read: (t) => (on ? optionOf(t, option) !== false : optionOf(t, option) === true),
    write: (content, t, value) =>
      patchElement(content, t, { options: { [option]: absentIf(value === true, on) } }),
  };
}

export const TABLE_FIELDS: readonly InspectorField[] = Object.freeze([
  {
    key: 'caption',
    section: 'General',
    label: 'Caption',
    applies,
    schema: () => STRING,
    // Never normalised on read: a trimmed read would eat the space just typed (doc 249).
    read: (t) => optionOf(t, 'caption'),
    write: (content, t, value) =>
      patchElement(content, t, { options: { caption: absentIf(value) } }),
  },
  flag('header', 'Header row', 'header', true),
  flag('rowHeaders', 'Row headers', 'rowHeaders'),
  flag('striped', 'Striped rows', 'striped'),
  flag('bordered', 'Borders', 'bordered'),
  flag('compact', 'Compact', 'compact'),
]);
