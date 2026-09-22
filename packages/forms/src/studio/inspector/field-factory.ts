import type { JsonSchema } from '@jsonforms/core';
import type { InspectorContext } from './inspector-context';
import { optionsOf, orCleared, setElement, setProperty, withOption } from './inspector-edits';
import type { InspectorField, SectionId } from './inspector-fields';

// The two field factories every inspector section builds its simple settings from (doc 187). Extracted from
// `inspector-fields.ts` when doc 212's Section fields took that file past the 300-line gate: both are generic,
// neither is about any one element type, and a field module other than the master list may want them.

export type Applies = (ctx: InspectorContext) => boolean;
export type Read = (value: unknown) => unknown;

/** A setting stored in the bound property under its key, e.g. `maxLength`. */
export function propertyField(
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
export function optionField(
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
