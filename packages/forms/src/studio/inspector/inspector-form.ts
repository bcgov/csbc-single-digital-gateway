import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import type { ElementIds } from '../layout/element-ids';
import type { StudioDocument } from '../layout/schema-properties';
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
  return {
    type: 'Control',
    scope: `#/properties/${field.key}`,
    label: field.label,
    ...(Object.keys(options).length > 0 ? { options } : {}),
  } as UISchemaElement;
}

/**
 * The inspector form for the element with `elementId`: a field schema per applicable setting, a
 * `VerticalLayout` of headed `Group` sections (empty sections left out), and the view model read from the
 * document. `undefined` when the element is not in the document.
 */
export function inspectorForm(
  document: StudioDocument,
  elementId: string,
  ids: ElementIds,
): InspectorForm | undefined {
  const ctx = inspectorContext(document, elementId, ids);
  if (!ctx) return undefined;
  const fields = fieldsFor(ctx);

  const data: InspectorValues = {};
  for (const field of fields) {
    const value = field.read(ctx);
    if (value !== undefined) data[field.key] = value;
  }

  const sections = INSPECTOR_SECTIONS.map(({ id, label }) => ({
    type: 'Group',
    label,
    elements: fields
      .filter((field) => field.section === id)
      .map((field) => fieldControl(field, ctx)),
  })).filter((section) => section.elements.length > 0);

  return {
    elementType: ctx.element.type,
    schema: {
      type: 'object',
      properties: Object.fromEntries(fields.map((field) => [field.key, field.schema(ctx)])),
    } as JsonSchema,
    uischema: { type: 'VerticalLayout', elements: sections } as UISchemaElement,
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
