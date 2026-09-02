import type { JsonSchema } from '@jsonforms/core';

/**
 * Shared model for the unified **choice** control (feature 156, Step 2; schema shape switched to
 * standard JSON-Schema `oneOf`/`const`/`title` in feature 167). One control renders every authored
 * choice field — a single/multi **select** dropdown, a **radio** list, or a **checkbox group** —
 * dispatched purely by schema shape: a `oneOf` of `{ const, title }` entries (single value), or an
 * array whose `items` carry that shape (multi value). The authored `{ value, label }` pairs live
 * directly in the schema (`schema.oneOf` / `schema.items.oneOf`) — the same source of truth drives
 * both Ajv validation and the citizen-facing label, in authoring order. `uischema.options.display`
 * is the only thing still carried in the uischema — the schema shape alone can't distinguish a
 * `select` from a `radio` (both `string` + `oneOf`), nor a multi-`select` from `checkboxes` (both
 * `array` of the same item schema).
 *
 * Imported by both the editable control (`choice-control.tsx`) and the read-only display view
 * (`../../../jsonforms-renderers-display/controls/choice-view.tsx`) — the display module depends on
 * the form module, never the reverse (the established direction, like layouts).
 */

export interface ChoiceOption {
  value: string;
  label: string;
}

/** How the choices are presented. `select` honours the schema shape for single/multi. */
export type ChoiceDisplay = 'select' | 'radio' | 'checkboxes';

export interface ChoiceOptions {
  format: 'choice';
  display: ChoiceDisplay;
  /** Derived from the schema shape: `array` → true, `string` → false. */
  multiple: boolean;
  /** `select` only (feature 168): render a filterable Combobox (chips for multi). Opt-in, default false. */
  combobox: boolean;
  choices: ChoiceOption[];
}

const asString = (value: unknown): string =>
  typeof value === 'string' ? value : String(value ?? '');

/** Coerce one `oneOf` entry (`{ const, title }`) into a `{ value, label }` (never throws). */
function choiceFromOneOfEntry(entry: unknown): ChoiceOption | null {
  if (!entry || typeof entry !== 'object') {
    return null;
  }
  const record = entry as Record<string, unknown>;
  const value = asString(record.const);
  const title = record.title;
  const label = title === undefined || title === '' ? value : asString(title);
  return { value, label };
}

/** The schema that would carry `oneOf` for this control — itself for single-value, `items` for array. */
function oneOfHostSchema(schema: JsonSchema | undefined): JsonSchema | undefined {
  if (!schema) {
    return undefined;
  }
  return schema.type === 'array' ? (schema.items as JsonSchema | undefined) : schema;
}

/** Derive the authored `{ value, label }[]` from a schema's `oneOf` (single or array-of-item; never throws). */
export function choicesFromSchema(schema: JsonSchema | undefined): ChoiceOption[] {
  const host = oneOfHostSchema(schema);
  const oneOf = host?.oneOf;
  if (!Array.isArray(oneOf)) {
    return [];
  }
  return oneOf
    .map(choiceFromOneOfEntry)
    .filter((choice): choice is ChoiceOption => choice !== null);
}

/**
 * True when a schema is choice-shaped: a `string` (or array-of-`string`) carrying a `oneOf` array
 * whose entries all have a `const`. An empty `oneOf` still counts (an authored choice field with
 * every option removed is still a choice field, not a plain string/array).
 */
export function isChoiceSchema(schema: JsonSchema | undefined): boolean {
  const host = oneOfHostSchema(schema);
  const oneOf = host?.oneOf;
  if (!Array.isArray(oneOf)) {
    return false;
  }
  return oneOf.every((entry) => Boolean(entry) && typeof entry === 'object' && 'const' in entry);
}

/** Resolve one stored value to its authored label, falling back to the raw value. */
export function labelForValue(choices: ChoiceOption[], value: unknown): string {
  const match = choices.find((choice) => choice.value === value);
  return match ? match.label : asString(value);
}

/**
 * Read the choice `display` off a control's `options` + its `choices`/`multiple` off the schema
 * (defensive; unknown → sane defaults). A bare uischema with no `options` at all defaults to `'select'`.
 */
export function readChoiceOptions(
  rawOptions: unknown,
  schema: JsonSchema | undefined,
): Omit<ChoiceOptions, 'format'> {
  const options = (rawOptions ?? {}) as Record<string, unknown>;
  const display: ChoiceDisplay =
    options.display === 'radio'
      ? 'radio'
      : options.display === 'checkboxes'
        ? 'checkboxes'
        : 'select';
  return {
    display,
    multiple: schema?.type === 'array',
    combobox: options.combobox === true,
    choices: choicesFromSchema(schema),
  };
}
