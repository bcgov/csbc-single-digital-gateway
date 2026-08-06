/**
 * Shared model for the unified **choice** control (feature 156, Step 2). One control renders every
 * authored choice field — a single/multi **select** dropdown, a **radio** list, or a **checkbox
 * group** — dispatched purely by `uischema.options`. The authored `{ label, value }` pairs live in
 * `options.choices` (order preserved), so the label shown to citizens is decoupled from the value
 * stored/validated (the schema still carries a plain `enum` / `array`-of-`enum` for Ajv).
 *
 * Imported by both the editable control (`choice-control.tsx`) and the read-only display view
 * (`../../../jsonforms-renderers-display/controls/choice-view.tsx`) — the display module depends on
 * the form module, never the reverse (the established direction, like layouts).
 */

export interface ChoiceOption {
  value: string;
  label: string;
}

/** How the choices are presented. `select` honours `multiple`; `radio` is single, `checkboxes` multi. */
export type ChoiceDisplay = 'select' | 'radio' | 'checkboxes';

export interface ChoiceOptions {
  format: 'choice';
  display: ChoiceDisplay;
  /** Multi-select. Always true for `checkboxes`, always false for `radio`; author-set for `select`. */
  multiple: boolean;
  choices: ChoiceOption[];
}

const asString = (value: unknown): string =>
  typeof value === 'string' ? value : String(value ?? '');

/** Coerce an unknown uischema `options.choices` blob into a safe `{ label, value }[]` (never throws). */
export function normalizeChoices(raw: unknown): ChoiceOption[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .filter(
      (entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === 'object',
    )
    .map((entry) => {
      const value = asString(entry.value);
      const label = entry.label === undefined || entry.label === '' ? value : asString(entry.label);
      return { value, label };
    });
}

/** Resolve one stored value to its authored label, falling back to the raw value. */
export function labelForValue(choices: ChoiceOption[], value: unknown): string {
  const match = choices.find((choice) => choice.value === value);
  return match ? match.label : asString(value);
}

/** Read + normalize the choice `options` off a uischema element (defensive; unknown → sane defaults). */
export function readChoiceOptions(rawOptions: unknown): Omit<ChoiceOptions, 'format'> {
  const options = (rawOptions ?? {}) as Record<string, unknown>;
  const display: ChoiceDisplay =
    options.display === 'radio'
      ? 'radio'
      : options.display === 'checkboxes'
        ? 'checkboxes'
        : 'select';
  // `radio` is inherently single; `checkboxes` inherently multi; `select` follows the flag.
  const multiple =
    display === 'checkboxes' ? true : display === 'radio' ? false : options.multiple === true;
  return { display, multiple, choices: normalizeChoices(options.choices) };
}
