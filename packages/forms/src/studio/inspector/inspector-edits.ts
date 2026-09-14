import type { JsonSchema } from '@jsonforms/core';
import type { TreeElement } from '../layout/element-tree';
import type { InspectorContext } from './inspector-context';

// The immutable edits inspector fields make to the studio document (doc 187 rules 17-21): every change is a
// new object, untouched keys are kept, and an `options` or `gridItem` bag left empty is removed.

/** The element and root schema being built up by one write-back. */
export interface InspectorEdit {
  readonly element: TreeElement;
  readonly schema: JsonSchema;
}

type Bag = Record<string, unknown>;

export const isRecord = (value: unknown): value is Bag =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** `value` when it is a string, else `undefined` (rule 14). */
export const text = (value: unknown) => (typeof value === 'string' ? value : undefined);

/** `value` when it is a finite number, else `undefined` (rule 14). */
export const finite = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

/** Empty text clears, like `undefined` (rule 17). */
export const orCleared = (value: unknown) => (value === '' ? undefined : value);

/** `bag` with `key` set to `value`, or without `key` when `value` is `undefined`. */
function withKey(bag: Bag, key: string, value: unknown): Bag {
  if (value !== undefined) return { ...bag, [key]: value };
  return Object.fromEntries(Object.entries(bag).filter(([name]) => name !== key));
}

export const optionsOf = (element: TreeElement): Bag =>
  isRecord(element.options) ? element.options : {};

export const withElementKey = (element: TreeElement, key: string, value: unknown) =>
  withKey(element as unknown as Bag, key, value) as unknown as TreeElement;

/** Rule 20: an `options` bag left empty is removed. */
export function withOption(element: TreeElement, name: string, value: unknown): TreeElement {
  const options = withKey(optionsOf(element), name, value);
  return withElementKey(element, 'options', Object.keys(options).length > 0 ? options : undefined);
}

/** Rules 19-20: `gridItem.w`, keeping the other `gridItem` keys; an emptied `gridItem` is removed. */
export function withWidth(element: TreeElement, width: unknown): TreeElement {
  const current = optionsOf(element)['gridItem'];
  const gridItem = withKey(isRecord(current) ? current : {}, 'w', width);
  return withOption(element, 'gridItem', Object.keys(gridItem).length > 0 ? gridItem : undefined);
}

export const setElement = (edit: InspectorEdit, element: TreeElement): InspectorEdit => ({
  ...edit,
  element,
});

/** A key of the bound property set to `value`, or removed when `value` is `undefined`. */
export function setProperty(
  ctx: InspectorContext,
  edit: InspectorEdit,
  name: string,
  value: unknown,
): InspectorEdit {
  const key = ctx.propertyKey;
  if (key === undefined) return edit;
  const properties = edit.schema.properties ?? {};
  const property = withKey((properties[key] ?? {}) as Bag, name, value);
  const schema = { ...edit.schema, properties: { ...properties, [key]: property } } as JsonSchema;
  return { ...edit, schema };
}

/** Rule 18: append the key to, or remove it from, the root `required`; an emptied `required` is removed. */
export function setRequired(
  ctx: InspectorContext,
  edit: InspectorEdit,
  on: boolean,
): InspectorEdit {
  const key = ctx.propertyKey;
  if (key === undefined) return edit;
  const current = Array.isArray(edit.schema.required) ? edit.schema.required : [];
  const without = current.filter((name) => name !== key);
  const required = on ? [...without, key] : without;
  const schema = withKey(
    edit.schema as Bag,
    'required',
    required.length > 0 ? required : undefined,
  );
  return { ...edit, schema: schema as JsonSchema };
}
