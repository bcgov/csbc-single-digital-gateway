import type { Governance } from '../capabilities/governance';
import { CONTROL_FIELDS } from './control-fields';
import { ELEMENT_FIELDS } from './element-fields';
import { LAYOUT_CHILD_FIELDS } from './layout-child-fields';
import { INSPECTOR_SECTIONS, schemaLocked, type InspectorField } from './inspector-field';
import type { InspectorTarget } from './inspector-target';

/** Every inspector field, in display order within a section. */
export const INSPECTOR_FIELDS: readonly InspectorField[] = Object.freeze([
  ...ELEMENT_FIELDS,
  ...CONTROL_FIELDS,
  ...LAYOUT_CHILD_FIELDS,
]);

/** The fields that apply to `target`. */
export function fieldsFor(target: InspectorTarget): InspectorField[] {
  return INSPECTOR_FIELDS.filter((field) => field.applies(target));
}

/** The inspector's view model of one element: what `<JsonForms>` renders. */
export interface InspectorForm {
  schema: Record<string, unknown>;
  uischema: Record<string, unknown>;
  data: Record<string, unknown>;
  /** Whether any field applies — none for a Separator or an unknown element (rule 6). */
  empty: boolean;
}

/**
 * The target's applying fields as one object schema, a VerticalLayout of headed `Group`s (General, Validation,
 * Appearance — an empty one dropped) and the current values; an empty value is an absent key.
 */
export function inspectorForm(target: InspectorTarget, governance?: Governance): InspectorForm {
  // Doc 259 rule 15: a setting the pinned template locks renders read-only — and doc 262 rule 13e: so does a schema
  // setting outside the default variant.
  const locked = (field: InspectorField) =>
    governance?.canEdit(target.id, field.key) === false || schemaLocked(field, target);
  const fields = fieldsFor(target);
  const required = fields.filter((field) => field.required === true).map((field) => field.key);
  const data: Record<string, unknown> = {};
  for (const field of fields) {
    const value = field.read(target);
    if (value !== undefined) data[field.key] = value;
  }
  return {
    schema: {
      type: 'object',
      properties: Object.fromEntries(fields.map((field) => [field.key, field.schema(target)])),
      ...(required.length > 0 && { required }),
    },
    uischema: {
      type: 'VerticalLayout',
      elements: INSPECTOR_SECTIONS.map((section) => ({
        type: 'Group',
        label: section,
        elements: fields
          .filter((field) => field.section === section)
          .map((field) => controlOf(field, locked(field))),
      })).filter((group) => group.elements.length > 0),
    },
    data,
    empty: fields.length === 0,
  };
}

function controlOf(field: InspectorField, readonly: boolean): Record<string, unknown> {
  const options = readonly ? { ...field.options, readonly: true } : field.options;
  return {
    type: 'Control',
    scope: `#/properties/${field.key}`,
    label: field.label,
    ...(options !== undefined && { options }),
  };
}
