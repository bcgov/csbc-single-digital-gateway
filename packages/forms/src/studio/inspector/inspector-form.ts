import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import type { ElementIds } from '../layout/element-ids';
import type { EditableDocument } from '../layout/schema-properties';
import type { CapabilityMap, ResolvedCapability } from '../../capabilities/capability-types';
import { mayEdit } from '../../capabilities/capability-for';
import {
  entryFor,
  permissionFieldsFor,
  type PermissionField,
  type PermissionGroup,
} from './permission-fields';
import { inspectorContext, type InspectorContext } from './inspector-context';
import {
  INSPECTOR_SECTIONS,
  fieldsFor,
  type InspectorField,
  type InspectorValues,
} from './inspector-fields';

/** The inspector's JSONForms form for one element (doc 187 rules 9-14). */
export interface InspectorForm {
  /** The selected element's uischema `type`, shown in the inspector header. */
  readonly elementType: string;
  readonly schema: JsonSchema;
  readonly uischema: UISchemaElement;
  readonly data: InspectorValues;
}

/** An extra error shown by the inspector form — shaped like the Ajv errors JSONForms renders. */
export interface InspectorError {
  readonly instancePath: string;
  readonly schemaPath: string;
  readonly keyword: string;
  readonly params: Record<string, unknown>;
  readonly message: string;
}

const RANGE_MESSAGE = 'Maximum must be at least the minimum.';

/**
 * A field's Control. Number fields lay out label-left, input-right (rule 9b) through renderers/ui's
 * `options.orientation`; every field keeps its own options, if any.
 */
function fieldControl(field: InspectorField, ctx: InspectorContext): UISchemaElement {
  const options = {
    ...field.options?.(ctx),
    ...(field.schema(ctx).type === 'number' ? { orientation: 'horizontal' } : {}),
  };
  const rule = field.rule?.(ctx);
  return {
    type: 'Control',
    scope: `#/properties/${field.key}`,
    // Doc 201 rule 13: the element-dependent label when the field has one, else its static label.
    label: field.labelFor?.(ctx) ?? field.label,
    ...(Object.keys(options).length > 0 ? { options } : {}),
    // Doc 204 rule 9c: visibility that depends on ANOTHER field's value travels as a JSONForms rule, so the
    // form's shape never changes while the author types and no control is remounted mid-keystroke.
    ...(rule ? { rule } : {}),
  } as unknown as UISchemaElement;
}

/**
 * A permission field's Control. Same shape as `fieldControl`, but these write the capability MAP
 * rather than the element, so they are built from their own field kind (doc 220).
 */
function permissionControl(field: PermissionField, ctx: InspectorContext): UISchemaElement {
  const options = field.options?.(ctx);
  const rule = field.rule?.(ctx);
  return {
    type: 'Control',
    scope: `#/properties/${field.key}`,
    label: field.label,
    ...(options && Object.keys(options).length > 0 ? { options } : {}),
    ...(rule ? { rule } : {}),
  } as unknown as UISchemaElement;
}

/** The two labelled groups of the Permissions section (doc 220): the element, then its contents. */
const PERMISSION_GROUPS: readonly { readonly id: PermissionGroup; readonly label: string }[] =
  Object.freeze([
    Object.freeze({ id: 'element' as const, label: 'This element' }),
    Object.freeze({ id: 'contents' as const, label: 'Its contents' }),
  ]);

/**
 * The inspector form for the element with `elementId`: a field schema per applicable setting, a
 * `VerticalLayout` of headed `Group` sections (empty sections left out), and the view model read from the
 * document. `undefined` when the element is not in the document.
 */
/**
 * The two capability inputs, which are DIFFERENT things travelling in different directions.
 *
 * `authored` (doc 220) is the map being EDITED on a template — its presence is what adds the
 * Permissions section. `governing` (doc 221) is what a template permits on a document built FROM one
 * — it filters which settings are offered at all. A template is authored and ungoverned; a derived
 * document is governed and authors nothing. An options bag rather than two positional parameters,
 * because `inspectorForm(doc, id, ids, mapA, mapB)` would be unreadable at every call site.
 */
export interface InspectorFormOptions {
  readonly authored?: CapabilityMap | undefined;
  readonly governing?: ResolvedCapability | undefined;
}

export function inspectorForm(
  document: EditableDocument,
  elementId: string,
  ids: ElementIds,
  options: InspectorFormOptions = {},
): InspectorForm | undefined {
  const { authored: capabilities, governing } = options;
  const ctx = inspectorContext(document, elementId, ids);
  if (!ctx) return undefined;
  // Doc 221: a governing template decides which settings are offered at all. Ungoverned (no
  // provider) means `governing` is absent and every applicable field is offered, exactly as before.
  const applicable = fieldsFor(ctx);
  const fields =
    governing === undefined
      ? applicable
      : applicable.filter((field) => mayEdit(governing, field.key));
  // Doc 220: the Permissions section exists only when this document HAS a capability map — the
  // package's "presence enables it" idiom. An empty `{}` still counts: that is a template whose
  // author has not written a rule yet, which a non-empty check could not express.
  const permissions = capabilities === undefined ? [] : permissionFieldsFor(ctx);
  const entry = capabilities === undefined ? undefined : entryFor(capabilities, ctx);

  const data: InspectorValues = {};
  for (const field of fields) {
    const value = field.read(ctx);
    if (value !== undefined) data[field.key] = value;
  }
  for (const field of permissions) {
    const value = field.read(entry, ctx);
    if (value !== undefined) data[field.key] = value;
  }

  const sections = INSPECTOR_SECTIONS.map(({ id, label }) => ({
    type: 'Group',
    label,
    elements: fields
      .filter((field) => field.section === id)
      .map((field) => fieldControl(field, ctx)),
  })).filter((section) => section.elements.length > 0);

  // One Permissions section holding two labelled groups, so "may this element be deleted" and "may
  // its children be deleted" can never be read as the same setting (doc 220 rule 8).
  const permissionGroups = PERMISSION_GROUPS.map(({ id, label }) => ({
    type: 'Group',
    label,
    elements: permissions
      .filter((field) => field.group === id)
      .map((field) => permissionControl(field, ctx)),
  })).filter((group) => group.elements.length > 0);
  const permissionSection =
    permissionGroups.length > 0
      ? [{ type: 'Group', label: 'Permissions', elements: permissionGroups }]
      : [];

  // Doc 201 rule 12: the applicable required fields, omitted entirely when there are none.
  const required = fields.filter((field) => field.required?.(ctx) === true).map((f) => f.key);

  return {
    elementType: ctx.element.type,
    schema: {
      type: 'object',
      properties: Object.fromEntries(
        [...fields, ...permissions].map((field) => [field.key, field.schema(ctx)]),
      ),
      ...(required.length > 0 ? { required } : {}),
    } as JsonSchema,
    uischema: {
      type: 'VerticalLayout',
      elements: [...sections, ...permissionSection],
    } as UISchemaElement,
    data,
  };
}

/** Rule 13: a Maximum below the Minimum is flagged on Maximum — advisory, never blocking a write. */
export function inspectorErrors(values: InspectorValues): InspectorError[] {
  const { minimum, maximum } = values;
  if (typeof minimum !== 'number' || typeof maximum !== 'number' || maximum >= minimum) return [];
  return [
    {
      instancePath: '/maximum',
      schemaPath: '#/properties/maximum',
      keyword: 'range',
      params: {},
      message: RANGE_MESSAGE,
    },
  ];
}
