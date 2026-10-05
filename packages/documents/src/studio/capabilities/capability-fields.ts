import { fieldsFor } from '../inspector/inspector-form';
import { optionsTargetOf } from '../options/options-target';
import type { InspectorTarget } from '../inspector/inspector-target';
import {
  CASCADING_KEYS,
  DEFAULT_CASCADE,
  cascadeCapabilities,
  holdsChildren,
  type CascadingKey,
} from './capability-cascade';
import type { Capability, CapabilityMap, CascadeScope } from './capability-types';

// Doc 258 rules 3-8 — the Implementation Rules fields. They write the capability MAP, never the element or the schema,
// so they are their own small registry rather than inspector fields (Forms' `permission-fields.ts`, ported).

export type CapabilityGroup = 'element' | 'contents';

/** Each group's sub-heading, in display order. */
export const GROUP_LABELS: Readonly<Record<CapabilityGroup, string>> = Object.freeze({
  element: 'This element',
  contents: 'Its contents',
});

interface CapabilityField {
  key: string;
  group: CapabilityGroup;
  label: string;
  applies(target: InspectorTarget): boolean;
  schema(target: InspectorTarget): Record<string, unknown>;
  /** Value-dependent visibility as a JSONForms rule, so the control never remounts. */
  rule?: Record<string, unknown>;
  options?: Record<string, unknown>;
  read(entry: Capability | undefined): unknown;
  write(entry: Capability, value: unknown): Capability;
}

const BOOLEAN = { type: 'boolean' };
const SWITCH = Object.freeze({ component: 'switch', size: 'sm' });

const EDIT_MODE = {
  type: 'string',
  oneOf: [
    { const: 'all', title: 'Everything' },
    { const: 'some', title: 'Specific settings' },
    { const: 'none', title: 'None' },
  ],
};

const CASCADE_SCOPE = {
  type: 'string',
  oneOf: [
    { const: 'descendants', title: 'All descendants' },
    { const: 'children', title: 'Immediate children' },
    { const: 'self', title: 'This element only' },
  ],
};

const isCascadeScope = (value: unknown): value is CascadeScope =>
  value === 'descendants' || value === 'children' || value === 'self';

/**
 * Every setting an implementation could be allowed to change (doc 258 rule 3, doc 259 rule 19): the element's own
 * inspector fields, then the edits that are not fields — its Data key, choice Options, Content and Rule.
 */
export function settingChoices(target: InspectorTarget): { const: string; title: string }[] {
  return [
    ...fieldsFor(target).map((field) => ({ const: field.key, title: field.label })),
    ...(target.property !== undefined ? [{ const: 'key', title: 'Data key' }] : []),
    ...(optionsTargetOf(target) !== undefined ? [{ const: 'options', title: 'Options' }] : []),
    ...(target.kind === 'rich-content' ? [{ const: 'content', title: 'Content' }] : []),
    // The root is never a rule's element (doc 256 rule 13).
    ...(target.root ? [] : [{ const: 'rule', title: 'Rule' }]),
  ];
}

const hasSettings = (target: InspectorTarget) => settingChoices(target).length > 0;
const isPageElement = (target: InspectorTarget) => !target.root;
const isContainer = (target: InspectorTarget) => holdsChildren(target.element);

const modeOf = (edit: Capability['edit']) =>
  edit === 'none' ? 'none' : Array.isArray(edit) ? 'some' : 'all';

/** A granted-by-default switch over one boolean capability. */
function toggle(
  key: Exclude<keyof Capability, 'edit' | 'cascade'>,
  group: CapabilityGroup,
  label: string,
  applies: (target: InspectorTarget) => boolean,
): CapabilityField {
  return {
    key,
    group,
    label,
    applies,
    schema: () => BOOLEAN,
    options: SWITCH,
    read: (entry) => entry?.[key] ?? true,
    write: (entry, value) => ({ ...entry, [key]: value === true }),
  };
}

/** Rules 3-4, in display order. Every default is the GRANTED value: an author takes permissions away. */
export const CAPABILITY_FIELDS: readonly CapabilityField[] = Object.freeze([
  {
    key: 'edit',
    group: 'element',
    label: 'Editable settings',
    applies: hasSettings,
    schema: () => EDIT_MODE,
    read: (entry) => modeOf(entry?.edit),
    write: (entry, value) => ({
      ...entry,
      edit: value === 'none' ? 'none' : value === 'some' ? (entry.edit ?? []) : 'all',
    }),
  },
  {
    key: 'editFields',
    group: 'element',
    label: 'Which settings',
    applies: hasSettings,
    schema: (target) => ({
      type: 'array',
      items: { type: 'string', oneOf: settingChoices(target) },
    }),
    rule: { effect: 'SHOW', condition: { scope: '#/properties/edit', schema: { const: 'some' } } },
    read: (entry) => (Array.isArray(entry?.edit) ? entry.edit : []),
    write: (entry, value) => ({ ...entry, edit: Array.isArray(value) ? value : [] }),
  },
  toggle('remove', 'element', 'Can be deleted', isPageElement),
  toggle('move', 'element', 'Can be moved', isPageElement),
  {
    key: 'cascade',
    group: 'contents',
    label: 'Apply changes to',
    applies: isContainer,
    schema: () => CASCADE_SCOPE,
    read: (entry) => entry?.cascade ?? DEFAULT_CASCADE,
    write: (entry, value) => (isCascadeScope(value) ? { ...entry, cascade: value } : entry),
  },
  toggle('addChildren', 'contents', 'Can add elements', isContainer),
  toggle('removeChildren', 'contents', 'Can delete elements', isContainer),
  toggle('reorderChildren', 'contents', 'Can reorder elements', isContainer),
  toggle('edges', 'contents', 'Can change connections', (t) => t.kind === 'funnel'),
]);

/** The fields that are always-set selects (rule 5). */
const SELECTS: ReadonlySet<string> = new Set(['edit', 'cascade']);

const fieldsOf = (target: InspectorTarget) => CAPABILITY_FIELDS.filter((f) => f.applies(target));

/** The entry as authored for the target — not resolved; `capabilityFor` is what readers use. */
const entryOf = (capabilities: CapabilityMap | undefined, target: InspectorTarget) =>
  target.id === '' ? undefined : capabilities?.elements?.[target.id];

/** One field's Control in the section's uischema. */
function controlOf(field: CapabilityField): Record<string, unknown> {
  const control: Record<string, unknown> = {
    type: 'Control',
    scope: `#/properties/${field.key}`,
    label: field.label,
  };
  if (field.options !== undefined) control['options'] = field.options;
  if (field.rule !== undefined) control['rule'] = field.rule;
  return control;
}

export interface CapabilityForm {
  schema: Record<string, unknown>;
  uischema: Record<string, unknown>;
  data: Record<string, unknown>;
}

/** The section's view model: one object schema, a `Group` per non-empty group, and the current values. */
export function capabilityForm(
  target: InspectorTarget,
  capabilities: CapabilityMap | undefined,
): CapabilityForm {
  const fields = fieldsOf(target);
  const entry = entryOf(capabilities, target);
  const groups = (Object.keys(GROUP_LABELS) as CapabilityGroup[])
    .map((group) => ({
      type: 'Group',
      label: GROUP_LABELS[group],
      elements: fields.filter((field) => field.group === group).map(controlOf),
    }))
    .filter((group) => group.elements.length > 0);
  return {
    schema: {
      type: 'object',
      properties: Object.fromEntries(fields.map((field) => [field.key, field.schema(target)])),
      // Always-set selects: required, so they offer no Clear (doc 244) — an empty mode means nothing.
      required: fields.filter((field) => SELECTS.has(field.key)).map((field) => field.key),
    },
    uischema: { type: 'VerticalLayout', elements: groups },
    data: Object.fromEntries(fields.map((field) => [field.key, field.read(entry)])),
  };
}

const sameValue = (a: unknown, b: unknown) =>
  Array.isArray(a) || Array.isArray(b) ? JSON.stringify(a) === JSON.stringify(b) : Object.is(a, b);

/**
 * Rules 6-8: `capabilities` with `values` written onto the target's entry, and every CHANGED contents toggle cascaded
 * with the scope from this same pass. The SAME map (even `undefined`) when nothing changed; an element without an id
 * is never written.
 */
export function applyCapabilities(
  capabilities: CapabilityMap | undefined,
  target: InspectorTarget,
  values: Readonly<Record<string, unknown>>,
): CapabilityMap | undefined {
  if (target.id === '') return capabilities;
  const before = entryOf(capabilities, target);
  let entry: Capability = before ?? {};
  const toggled: CascadingKey[] = [];
  let changed = false;
  for (const field of fieldsOf(target)) {
    if (!(field.key in values) || sameValue(values[field.key], field.read(before))) continue;
    entry = field.write(entry, values[field.key]);
    changed = true;
    if ((CASCADING_KEYS as readonly string[]).includes(field.key))
      toggled.push(field.key as CascadingKey);
  }
  if (!changed) return capabilities;
  const scope = entry.cascade ?? DEFAULT_CASCADE;
  let next: CapabilityMap = capabilities ?? {};
  for (const key of toggled)
    next = cascadeCapabilities(next, target.element, key, entry[key] === true, scope);
  return { ...next, elements: { ...next.elements, [target.id]: entry } };
}
