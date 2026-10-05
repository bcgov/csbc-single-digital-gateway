import { DEFAULT_ROWS } from '../../renderers/ui/string-options';
import type { DocumentContent } from '../document-types';
import {
  absentIf,
  BOOLEAN,
  choice,
  inDefault,
  isKind,
  NUMBER,
  optionOf,
  patchElement,
  STRING,
  WHOLE_NUMBER,
  type InspectorField,
} from './inspector-field';
import type { PropertyRef } from '../property-ref';
import { refOf, type InspectorTarget, type TargetKind } from './inspector-target';
import { setRequired, updateProperty } from './schema-edits';

const CONTROL_KINDS: TargetKind[] = [
  'checkbox',
  'switch',
  'text',
  'textarea',
  'number',
  'select',
  'radio-group',
  'multi-select',
  'checkbox-group',
  'rich-text',
  'data-table',
  'record',
];
const TEXT_KINDS: TargetKind[] = ['text', 'textarea'];
const BOOLEAN_KINDS: TargetKind[] = ['checkbox', 'switch'];
const SINGLE_PRESENTATION: ReadonlySet<TargetKind> = new Set([
  'number',
  'rich-text',
  'data-table',
  'record',
]);

/**
 * Display-as variants per family, the default first (doc 249 rule 7): the default's `component` is what the palette
 * writes — absent for Checkbox and Text.
 */
const FAMILIES: ReadonlyArray<ReadonlyArray<readonly [TargetKind, string, string | undefined]>> = [
  [
    ['checkbox', 'Checkbox', undefined],
    ['switch', 'Switch', 'switch'],
  ],
  [
    ['text', 'Text', undefined],
    ['textarea', 'Text area', 'textarea'],
  ],
  [
    ['select', 'Select', 'select'],
    ['radio-group', 'Radio group', 'radio-group'],
  ],
  [
    ['multi-select', 'Multi-select', 'multi-select'],
    ['checkbox-group', 'Checkbox group', 'checkbox-group'],
  ],
];

const familyOf = (kind: TargetKind) =>
  FAMILIES.find((family) => family.some(([k]) => k === kind)) ?? [];

/** The bound property's key — every control field applies only with one. */
/** The bound property's reference — a page key, or a record item field's (doc 271). */
const keyOf = (t: InspectorTarget): PropertyRef =>
  t.property === undefined ? { key: '' } : refOf(t.property);
const keyword = (t: InspectorTarget, name: string) => t.property?.schema[name];

/** A field over one schema keyword of the bound property. */
function keywordField(
  key: string,
  section: InspectorField['section'],
  label: string,
  kinds: TargetKind[],
  name: string,
  schema: Record<string, unknown>,
): InspectorField {
  return {
    key,
    section,
    label,
    applies: isKind(...kinds),
    schema: () => schema,
    read: (t) => keyword(t, name),
    write: (content, t, value) => updateProperty(content, keyOf(t), { [name]: absentIf(value) }),
    schemaLevel: true,
  };
}

/**
 * The Label (doc 249): the property's `title` in default. Outside it (doc 262 rule 13f) the Control's own `label`
 * overrides the title instead, so a variant rewords a field without touching the schema; cleared, the title shows again.
 */
const labelField: InspectorField = {
  key: 'label',
  section: 'General',
  label: 'Label',
  applies: isKind(...CONTROL_KINDS),
  schema: () => STRING,
  read: (t) => {
    const override = t.element['label'];
    return !inDefault(t) && typeof override === 'string' && override.trim() !== ''
      ? override
      : keyword(t, 'title');
  },
  write: (content, t, value) =>
    inDefault(t)
      ? updateProperty(content, keyOf(t), { title: absentIf(value) })
      : patchElement(content, t, { label: absentIf(value) as string | undefined }),
};

/** Rule 9: the description goes to the property, and a Control override that would hide it is removed. */
function writeDescription(
  content: DocumentContent,
  t: InspectorTarget,
  value: unknown,
): DocumentContent {
  // Doc 262 rule 13f: outside default the override IS the description, and clearing it shows the property's again.
  if (!inDefault(t)) return patchElement(content, t, { options: { description: absentIf(value) } });
  const next = updateProperty(content, keyOf(t), { description: absentIf(value) });
  return optionOf(t, 'description') === undefined
    ? next
    : patchElement(next, t, { options: { description: undefined } });
}

/**
 * The description the control shows — its override when non-blank, else the property's (`controlDescription`) — but
 * UNTRIMMED: a read that trims would hand JSONForms back a different value and eat the space just typed.
 */
function readDescription(t: InspectorTarget): unknown {
  const override = optionOf(t, 'description');
  return typeof override === 'string' && override.trim() !== ''
    ? override
    : keyword(t, 'description');
}

/**
 * Doc 253 rules 2-3: on, the answer must be `true` (`const`) and present (`required`, which refuses an untouched box);
 * off removes both.
 */
function writeMustBeChecked(
  content: DocumentContent,
  t: InspectorTarget,
  value: unknown,
): DocumentContent {
  const on = value === true;
  return setRequired(
    updateProperty(content, keyOf(t), { const: on ? true : undefined }),
    keyOf(t),
    on,
  );
}

/** The inspector's booleans: the small switch (doc 252 rule 1). */
const SMALL_SWITCH = Object.freeze({ component: 'switch', size: 'sm' });

/** Doc 249's fields for Controls bound to a schema property. */
export const CONTROL_FIELDS: readonly InspectorField[] = Object.freeze([
  labelField,
  {
    key: 'description',
    section: 'General',
    label: 'Description',
    applies: isKind(...CONTROL_KINDS),
    schema: () => STRING,
    options: { component: 'textarea' },
    read: readDescription,
    write: writeDescription,
  },
  {
    key: 'required',
    section: 'General',
    label: 'Required',
    // A boolean is always answered — `false` is an answer — so it gets Must be checked instead (doc 253 rule 1).
    applies: isKind(...CONTROL_KINDS.filter((kind) => !BOOLEAN_KINDS.includes(kind))),
    schema: () => BOOLEAN,
    options: SMALL_SWITCH,
    read: (t) => t.property?.required === true,
    write: (content, t, value) => setRequired(content, keyOf(t), value === true),
    schemaLevel: true,
  },
  {
    key: 'mustBeChecked',
    section: 'General',
    label: 'Must be checked',
    applies: isKind(...BOOLEAN_KINDS),
    schema: () => BOOLEAN,
    options: SMALL_SWITCH,
    read: (t) => keyword(t, 'const') === true,
    write: writeMustBeChecked,
    schemaLevel: true,
  },
  keywordField('minLength', 'Validation', 'Minimum length', TEXT_KINDS, 'minLength', WHOLE_NUMBER),
  keywordField('maxLength', 'Validation', 'Maximum length', TEXT_KINDS, 'maxLength', WHOLE_NUMBER),
  {
    key: 'integer',
    section: 'Validation',
    label: 'Whole numbers only',
    applies: isKind('number'),
    schema: () => BOOLEAN,
    options: SMALL_SWITCH,
    read: (t) => keyword(t, 'type') === 'integer',
    write: (content, t, value) =>
      updateProperty(content, keyOf(t), { type: value === true ? 'integer' : 'number' }),
    schemaLevel: true,
  },
  keywordField('minimum', 'Validation', 'Minimum', ['number'], 'minimum', NUMBER),
  keywordField('maximum', 'Validation', 'Maximum', ['number'], 'maximum', NUMBER),
  // Ajv refuses a `multipleOf` that is not above zero (rule 8).
  keywordField('step', 'Validation', 'Step', ['number'], 'multipleOf', {
    type: 'number',
    exclusiveMinimum: 0,
  }),
  {
    key: 'component',
    section: 'Appearance',
    label: 'Display as',
    // A number, a rich text field and a data table have one presentation each.
    applies: isKind(...CONTROL_KINDS.filter((kind) => !SINGLE_PRESENTATION.has(kind))),
    schema: (t) => choice(familyOf(t.kind).map(([kind, title]) => [kind, title] as const)),
    required: true,
    read: (t) => t.kind,
    write: (content, t, value) => {
      const component = familyOf(t.kind).find(([kind]) => kind === value)?.[2];
      return patchElement(content, t, { options: { component } });
    },
  },
  {
    key: 'placeholder',
    section: 'Appearance',
    label: 'Placeholder',
    applies: isKind('text', 'textarea', 'number', 'rich-text'),
    schema: () => STRING,
    read: (t) => optionOf(t, 'placeholder'),
    write: (content, t, value) =>
      patchElement(content, t, { options: { placeholder: absentIf(value) } }),
  },
  {
    key: 'rows',
    section: 'Appearance',
    label: 'Rows',
    applies: isKind('textarea'),
    schema: () => ({ type: 'integer', minimum: 2, maximum: 20 }),
    read: (t) => optionOf(t, 'rows') ?? DEFAULT_ROWS,
    write: (content, t, value) =>
      patchElement(content, t, { options: { rows: absentIf(value, DEFAULT_ROWS) } }),
  },
]);
