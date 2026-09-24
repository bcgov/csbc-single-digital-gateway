import type { JsonSchema } from '@jsonforms/core';
import type { Capability, CapabilityMap } from '../../capabilities/capability-types';
import { authoredId } from '../../renderers/ui/authored-id';
import { FLOW_TYPE } from '../../renderers/xyflow/flow-elements';
import type { InspectorContext } from './inspector-context';
import { fieldsFor } from './inspector-fields';

// Doc 220 — the Permissions section: what a template author grants the owner of a document built
// from this template.
//
// These are the FIRST inspector fields that write somewhere other than the selected element — they
// write the capability MAP. That is why they are a separate kind with their own read/write rather
// than `InspectorField`s: `applyInspector` takes and returns an `EditableDocument`, which by design
// cannot carry capabilities (see `schema-properties.ts`). Keeping them apart is what stops the
// capability map entering the edit pipeline that would silently drop it.

/** Every permission key is prefixed, so splitting the inspector's values is unambiguous. */
export const PERMISSION_PREFIX = 'perm_';

/** Whether an inspector value belongs to the Permissions section rather than the element. */
export const isPermissionKey = (key: string): boolean => key.startsWith(PERMISSION_PREFIX);

/** The two labelled groups the section renders. */
export type PermissionGroup = 'element' | 'contents';

export interface PermissionField {
  readonly key: string;
  readonly group: PermissionGroup;
  readonly label: string;
  /** Whether this permission is meaningful for the selected element. */
  applies(ctx: InspectorContext): boolean;
  schema(ctx: InspectorContext): JsonSchema;
  /** A JSONForms `rule`, for a control whose relevance depends on another VALUE (doc 204 rule 9c). */
  rule?(ctx: InspectorContext): Record<string, unknown> | undefined;
  options?(ctx: InspectorContext): Record<string, unknown> | undefined;
  read(entry: Capability | undefined, ctx: InspectorContext): unknown;
  write(entry: Capability, value: unknown): Capability;
}

/**
 * Whether the element can hold children at all — the test for offering the "Its contents" group.
 * Read off the element rather than a type list, so a new container type needs no change here.
 */
const holdsChildren = (ctx: InspectorContext): boolean => Array.isArray(ctx.element.elements);

const BOOLEAN: JsonSchema = { type: 'boolean' };
/** Doc 188: a `switch` reads as a permission toggle better than a checkbox. */
const TOGGLE = { component: 'switch', size: 'sm' } as const;

/** `'all'` and `'none'` are the shortcuts; `'some'` reveals the field picker below. */
const EDIT_MODE: JsonSchema = {
  type: 'string',
  oneOf: [
    { const: 'all', title: 'Everything' },
    { const: 'some', title: 'Only these settings' },
    { const: 'none', title: 'Nothing' },
  ],
};

/** Which settings the OWNER could be allowed to change — the element's own applicable fields. */
const editableKeys = (ctx: InspectorContext) =>
  fieldsFor(ctx).map((field) => ({
    const: field.key,
    title: field.labelFor?.(ctx) ?? field.label,
  }));

const modeOf = (edit: Capability['edit']): 'all' | 'some' | 'none' => {
  if (edit === 'none') return 'none';
  if (Array.isArray(edit)) return 'some';
  return 'all';
};

const toggle = (
  key: string,
  group: PermissionGroup,
  label: string,
  applies: (ctx: InspectorContext) => boolean,
  read: (entry: Capability | undefined) => unknown,
  write: (entry: Capability, value: unknown) => Capability,
): PermissionField => ({
  key: `${PERMISSION_PREFIX}${key}`,
  group,
  label,
  applies,
  schema: () => BOOLEAN,
  options: () => ({ ...TOGGLE }),
  read: (entry) => read(entry),
  write,
});

/**
 * The Permissions fields, in display order within their groups.
 *
 * Every default shown is the GRANTED one, matching `FULLY_GRANTED`: an author opens a template with
 * everything permitted and takes things away, rather than having to grant each thing individually.
 */
export const PERMISSION_FIELDS: readonly PermissionField[] = Object.freeze([
  {
    key: `${PERMISSION_PREFIX}edit`,
    group: 'element',
    label: 'Editable settings',
    applies: () => true,
    schema: () => EDIT_MODE,
    read: (entry) => modeOf(entry?.edit),
    write: (entry, value) => ({
      ...entry,
      edit: value === 'none' ? 'none' : value === 'some' ? (entry.edit ?? []) : 'all',
    }),
  },
  {
    key: `${PERMISSION_PREFIX}editFields`,
    group: 'element',
    label: 'Which settings',
    applies: () => true,
    schema: (ctx) => ({ type: 'array', items: { type: 'string', oneOf: editableKeys(ctx) } }),
    // Doc 204 rule 9c: value-dependent visibility travels as a RULE, never through `applies` —
    // dropping the field would rebuild the form's uischema and remount the control being used.
    rule: () => ({
      effect: 'SHOW',
      condition: {
        scope: `#/properties/${PERMISSION_PREFIX}edit`,
        schema: { const: 'some' },
      },
    }),
    read: (entry) => (Array.isArray(entry?.edit) ? entry.edit : []),
    write: (entry, value) => ({ ...entry, edit: Array.isArray(value) ? value : [] }),
  },
  toggle(
    'remove',
    'element',
    'Can be deleted',
    () => true,
    (entry) => entry?.remove ?? true,
    (entry, value) => ({ ...entry, remove: value === true }),
  ),
  toggle(
    'move',
    'element',
    'Can be moved',
    () => true,
    (entry) => entry?.move ?? true,
    (entry, value) => ({ ...entry, move: value === true }),
  ),
  toggle(
    'addChildren',
    'contents',
    'Can add elements',
    holdsChildren,
    (entry) => entry?.addChildren ?? true,
    (entry, value) => ({ ...entry, addChildren: value === true }),
  ),
  toggle(
    'removeChildren',
    'contents',
    'Can delete elements',
    holdsChildren,
    (entry) => entry?.removeChildren ?? true,
    (entry, value) => ({ ...entry, removeChildren: value === true }),
  ),
  toggle(
    'reorderChildren',
    'contents',
    'Can reorder elements',
    holdsChildren,
    (entry) => entry?.reorderChildren ?? true,
    (entry, value) => ({ ...entry, reorderChildren: value === true }),
  ),
  toggle(
    'edges',
    'contents',
    'Can change connections',
    (ctx) => ctx.element.type === FLOW_TYPE,
    (entry) => entry?.edges ?? true,
    (entry, value) => ({ ...entry, edges: value === true }),
  ),
]);

/** The applicable permission fields for this element. */
export const permissionFieldsFor = (ctx: InspectorContext): readonly PermissionField[] =>
  PERMISSION_FIELDS.filter((field) => field.applies(ctx));

/**
 * The capability entry governing the selected element, as authored — NOT the resolved capability.
 * The inspector edits one entry; `capabilityFor` is what merges the chain for a reader.
 */
export const entryFor = (
  capabilities: CapabilityMap | undefined,
  ctx: InspectorContext,
): Capability | undefined => {
  const id = authoredId(ctx.element);
  return id === undefined ? undefined : capabilities?.elements?.[id];
};

/**
 * `capabilities` with the permission values written onto the selected element's entry.
 *
 * Returns the SAME map when nothing changed — the rule `applyInspector` follows for the document
 * (`apply-inspector.ts:15-22`): a new object on every pass re-renders the canvas on every selection.
 * An element with no authored id cannot be governed, so its values are ignored rather than written
 * under a key nothing can resolve.
 */
export function applyPermissions(
  capabilities: CapabilityMap,
  ctx: InspectorContext,
  values: Readonly<Record<string, unknown>>,
): CapabilityMap {
  const id = authoredId(ctx.element);
  if (id === undefined) return capabilities;

  const before = capabilities.elements?.[id];
  let entry: Capability = before ?? {};
  let changed = false;
  for (const field of permissionFieldsFor(ctx)) {
    if (!(field.key in values)) continue;
    const value = values[field.key];
    // An array value (the field picker) is compared by content — `Object.is` on a fresh array from
    // JSONForms would read as changed on every pass, the bug `apply-inspector.ts:15-22` records.
    const current = field.read(before, ctx);
    const same = Array.isArray(value)
      ? JSON.stringify(value) === JSON.stringify(current)
      : Object.is(value, current);
    if (same) continue;
    entry = field.write(entry, value);
    changed = true;
  }

  // Tracked explicitly rather than by comparing `entry` to `before`: with no entry yet, `before` is
  // `undefined` while `entry` starts as `{}`, so an identity check would write an EMPTY entry for a
  // selection where the author changed nothing.
  if (!changed) return capabilities;
  return { ...capabilities, elements: { ...capabilities.elements, [id]: entry } };
}
