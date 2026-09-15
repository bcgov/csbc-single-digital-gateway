import type { JsonSchema } from '@jsonforms/core';
import type { TreeElement } from '../layout/element-tree';
import type { ControlKind, InspectorContext } from './inspector-context';
import {
  finite,
  isRecord,
  optionsOf,
  orCleared,
  setElement,
  setProperty,
  setRequired,
  text,
  withElementKey,
  withOption,
  withWidth,
  type InspectorEdit,
} from './inspector-edits';

// The inspector's settings (doc 187 rules 9-19): where each applies, its field schema, and how it reads and
// writes the studio document. Declared in section order, so filtering keeps the rendered order.

export type { InspectorEdit } from './inspector-edits';

/** The inspector form's data — a flat view model keyed by field. */
export type InspectorValues = Record<string, unknown>;

export type SectionId = 'general' | 'validation' | 'appearance' | 'layout';

export const INSPECTOR_SECTIONS: readonly { readonly id: SectionId; readonly label: string }[] =
  Object.freeze([
    Object.freeze({ id: 'general', label: 'General' }),
    Object.freeze({ id: 'validation', label: 'Validation' }),
    Object.freeze({ id: 'appearance', label: 'Appearance' }),
    Object.freeze({ id: 'layout', label: 'Layout' }),
  ]);

export interface InspectorField {
  readonly key: string;
  readonly section: SectionId;
  readonly label: string;
  applies(ctx: InspectorContext): boolean;
  schema(ctx: InspectorContext): JsonSchema;
  /** The field Control's uischema `options`, if any. */
  options?(ctx: InspectorContext): Record<string, unknown> | undefined;
  /** The document's current value, or `undefined` when absent or of the wrong JSON type (rule 14). */
  read(ctx: InspectorContext): unknown;
  write(ctx: InspectorContext, edit: InspectorEdit, value: unknown): InspectorEdit;
}

const LAYOUT_LABEL_HINT = 'Names the layout in the element path.';

const isControl = (ctx: InspectorContext) => ctx.element.type === 'Control';
const isHeading = (ctx: InspectorContext) => ctx.element.type === 'Heading';
const hasProperty = (ctx: InspectorContext) => ctx.propertyKey !== undefined;
const isText = (ctx: InspectorContext) => ctx.controlKind === 'text';
const isNumber = (ctx: InspectorContext) => ctx.controlKind === 'number';

const STRING: JsonSchema = Object.freeze({ type: 'string' });
const BOOLEAN: JsonSchema = Object.freeze({ type: 'boolean' });
const NUMBER: JsonSchema = Object.freeze({ type: 'number' });
const integer = (bounds: { minimum?: number; maximum?: number }): JsonSchema => ({
  type: 'number',
  ...bounds,
  multipleOf: 1,
});

/**
 * Rule 11b: every whole number from `minimum` to `maximum` as a oneOf titled by the number, so renderers/ui renders
 * a Combobox rather than a NumberInput.
 */
const wholeNumbers = (minimum: number, maximum: number): JsonSchema => ({
  type: 'number',
  oneOf: Array.from({ length: Math.max(0, maximum - minimum + 1) }, (_unused, index) => ({
    const: minimum + index,
    title: String(minimum + index),
  })),
});

type Applies = (ctx: InspectorContext) => boolean;
type Read = (value: unknown) => unknown;

/** A setting stored in the bound property under its key, e.g. `maxLength`. */
function propertyField(
  key: string,
  section: SectionId,
  label: string,
  applies: Applies,
  schema: JsonSchema,
  read: Read,
): InspectorField {
  return {
    key,
    section,
    label,
    applies,
    schema: () => schema,
    read: (ctx) => read(ctx.property?.[key as keyof JsonSchema]),
    write: (ctx, edit, value) => setProperty(ctx, edit, key, orCleared(value)),
  };
}

/** A setting stored in the element's `options` under its key. */
function optionField(
  key: string,
  section: SectionId,
  label: string,
  applies: Applies,
  schema: JsonSchema,
  read: Read,
): InspectorField {
  return {
    key,
    section,
    label,
    applies,
    schema: () => schema,
    read: (ctx) => read(optionsOf(ctx.element)[key]),
    write: (_ctx, edit, value) => setElement(edit, withOption(edit.element, key, orCleared(value))),
  };
}

interface Component {
  readonly const: string;
  readonly title: string;
}

/** Doc 188 rule 26: each kind's renderers/ui `options.component` values, default first. */
const COMPONENTS: Readonly<Partial<Record<ControlKind, readonly Component[]>>> = {
  text: [
    { const: 'input', title: 'Input' },
    { const: 'textarea', title: 'Textarea' },
  ],
  choice: [
    { const: 'combobox', title: 'Combobox' },
    { const: 'radio-group', title: 'Radio group' },
  ],
  boolean: [
    { const: 'checkbox', title: 'Checkbox' },
    { const: 'switch', title: 'Switch' },
  ],
};

const componentsOf = (ctx: InspectorContext) =>
  ctx.controlKind === undefined ? undefined : COMPONENTS[ctx.controlKind];

/** Rule 27: the authored component when it is one of the kind's, else the default — what actually renders. */
function currentComponent(ctx: InspectorContext): string | undefined {
  const components = componentsOf(ctx) ?? [];
  const authored = optionsOf(ctx.element)['component'];
  return (components.find((component) => component.const === authored) ?? components[0])?.const;
}

/** Rule 25: text and number controls, and a choice unless it renders as a radio group. */
const takesPlaceholder: Applies = (ctx) =>
  isText(ctx) ||
  isNumber(ctx) ||
  (ctx.controlKind === 'choice' && currentComponent(ctx) !== 'radio-group');
/** Grid stores its column count as `column`, HorizontalLayout as `columns`. */
const columnsOption = (ctx: InspectorContext) => (ctx.layoutKind === 'grid' ? 'column' : 'columns');

export const INSPECTOR_FIELDS: readonly InspectorField[] = Object.freeze([
  {
    key: 'label',
    section: 'general',
    label: 'Label',
    applies: (ctx) => isControl(ctx) || ctx.layoutKind !== undefined,
    schema: (ctx) => (ctx.layoutKind ? { type: 'string', description: LAYOUT_LABEL_HINT } : STRING),
    options: (ctx) => {
      const title = text(ctx.property?.title)?.trim();
      return title ? { placeholder: title } : undefined;
    },
    read: (ctx) => text(ctx.element['label' as keyof TreeElement]),
    write: (_ctx, edit, value) =>
      setElement(edit, withElementKey(edit.element, 'label', orCleared(value))),
  },
  {
    key: 'text',
    section: 'general',
    label: 'Text',
    applies: isHeading,
    schema: () => STRING,
    read: (ctx) => text(ctx.element['text' as keyof TreeElement]),
    // A Heading's `text` is required, so clearing writes '' (rule 17).
    write: (_ctx, edit, value) =>
      setElement(
        edit,
        withElementKey(edit.element, 'text', typeof value === 'string' ? value : ''),
      ),
  },
  {
    ...propertyField('description', 'general', 'Description', hasProperty, STRING, text),
    options: () => ({ component: 'textarea' }),
  },
  optionField('placeholder', 'general', 'Placeholder', takesPlaceholder, STRING, text),
  {
    key: 'required',
    section: 'validation',
    label: 'Required',
    applies: hasProperty,
    schema: () => BOOLEAN,
    // Doc 188 rule 22: the small renderers/ui Switch.
    options: () => ({ component: 'switch', size: 'sm' }),
    read: (ctx) =>
      Array.isArray(ctx.schema.required) && ctx.propertyKey !== undefined
        ? ctx.schema.required.includes(ctx.propertyKey)
        : false,
    write: (ctx, edit, value) => setRequired(ctx, edit, value === true),
  },
  propertyField('maxLength', 'validation', 'Max length', isText, integer({ minimum: 0 }), finite),
  propertyField('minimum', 'validation', 'Minimum', isNumber, NUMBER, finite),
  propertyField('maximum', 'validation', 'Maximum', isNumber, NUMBER, finite),
  optionField(
    'step',
    'validation',
    'Step',
    isNumber,
    { type: 'number', exclusiveMinimum: 0 },
    finite,
  ),
  {
    key: 'component',
    section: 'appearance',
    label: 'Component',
    applies: (ctx) => componentsOf(ctx) !== undefined,
    schema: (ctx) => ({
      type: 'string',
      oneOf: (componentsOf(ctx) ?? []).map(({ const: value, title }) => ({ const: value, title })),
    }),
    // No options: a oneOf field renders as the renderers/ui Combobox by default (user request).
    read: currentComponent,
    // Rule 28: the kind's default removes `options.component`.
    write: (ctx, edit, value) =>
      setElement(
        edit,
        withOption(
          edit.element,
          'component',
          value === componentsOf(ctx)?.[0]?.const ? undefined : value,
        ),
      ),
  },
  optionField('level', 'appearance', 'Heading level', isHeading, wholeNumbers(1, 6), finite),
  optionField('size', 'appearance', 'Heading size', isHeading, wholeNumbers(1, 6), finite),
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
    key: 'width',
    section: 'layout',
    label: 'Width',
    applies: (ctx) => ctx.maxWidth !== undefined,
    schema: (ctx) => wholeNumbers(1, ctx.maxWidth ?? 1),
    read: (ctx) => {
      const gridItem = optionsOf(ctx.element)['gridItem'];
      return finite(isRecord(gridItem) ? gridItem['w'] : undefined);
    },
    write: (_ctx, edit, value) => setElement(edit, withWidth(edit.element, value)),
  },
] satisfies InspectorField[]);

/** The fields that apply to the element, in rendered order (rules 9-10). */
export function fieldsFor(ctx: InspectorContext): InspectorField[] {
  return INSPECTOR_FIELDS.filter((field) => field.applies(ctx));
}

/**
 * Whether `value` satisfies a field schema (rule 16): one of its `oneOf` consts when it has any (doc 188 rule 29),
 * its JSON type and, for numbers, `minimum`, `maximum`, `exclusiveMinimum` and `multipleOf`. Clearing
 * (`undefined`) is always accepted.
 */
export function fieldAccepts(schema: JsonSchema, value: unknown): boolean {
  if (value === undefined) return true;
  if (Array.isArray(schema.oneOf) && !schema.oneOf.some((entry) => entry.const === value))
    return false;
  if (schema.type === 'string') return typeof value === 'string';
  if (schema.type === 'boolean') return typeof value === 'boolean';
  if (schema.type !== 'number' || typeof value !== 'number' || !Number.isFinite(value))
    return false;

  const { minimum, maximum, exclusiveMinimum, multipleOf } = schema;
  if (typeof minimum === 'number' && value < minimum) return false;
  if (typeof maximum === 'number' && value > maximum) return false;
  if (typeof exclusiveMinimum === 'number' && value <= exclusiveMinimum) return false;
  return typeof multipleOf !== 'number' || Number.isInteger(value / multipleOf);
}
