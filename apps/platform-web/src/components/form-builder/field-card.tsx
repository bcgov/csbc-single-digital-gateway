import { JsonForms, type JsonSchema, type UISchemaElement } from '@repo/react/jsonforms';
import { DisplayCard } from './display-card';
import { FIELD_TYPE_BY_ID, type FieldTypeId } from './field-types';
import { createField, serializeModel, type FieldNode } from './model';

const noop = () => {};

/**
 * Seed the preview's data from each property's JSON-Schema `default` (e.g. an address field defaulting
 * to Canada / British Columbia). The canvas card renders the control **readonly**, so the control's own
 * default-seeding effect (which skips readonly) never fires — we hand it the defaults directly instead.
 */
function defaultDataFromSchema(schema: JsonSchema): Record<string, unknown> {
  const properties = (schema as { properties?: Record<string, { default?: unknown }> }).properties;
  const data: Record<string, unknown> = {};
  for (const [key, prop] of Object.entries(properties ?? {})) {
    if (prop && typeof prop === 'object' && prop.default !== undefined) {
      data[key] = prop.default;
    }
  }
  return data;
}

/**
 * Renders a single field exactly as the canvas shows it, so the drag overlay and drop placeholder
 * match the canvas card. Data-collecting controls serialize to a one-field `{ schema, uischema }`
 * and run through the real `@repo/react` renderers (readonly + inert). **Display fields render the
 * same `DisplayCard`** the canvas uses (inert here, so it's a non-interactive look-alike) — otherwise
 * a dragged heading/paragraph/rich-text would show a different (read-only) preview than the editable
 * card it came from. `ghost` = the dashed translucent placeholder variant.
 */
export function FieldPreview({ node, ghost = false }: { node: FieldNode; ghost?: boolean }) {
  const body =
    node.kind === 'display' ? (
      <DisplayCard node={node} path={[]} onChange={noop} />
    ) : (
      (() => {
        const definition = serializeModel({ title: '', description: '', fields: [node] });
        const schema = definition.schema as JsonSchema;
        return (
          <JsonForms
            schema={schema}
            uischema={definition.uischema as unknown as UISchemaElement}
            data={defaultDataFromSchema(schema)}
            readonly
            onChange={noop}
          />
        );
      })()
    );
  return (
    <div
      inert
      className={
        ghost
          ? 'pointer-events-none rounded-lg border-2 border-dashed border-primary bg-primary/5 p-3'
          : 'pointer-events-none'
      }
    >
      {body}
    </div>
  );
}

/** A default, type-labelled node for previewing a palette field type (there's no real node yet). */
export function previewNodeForType(fieldType: FieldTypeId): FieldNode {
  const node = createField(fieldType);
  const label = FIELD_TYPE_BY_ID[fieldType]?.label ?? fieldType;
  if (node.kind === 'control') {
    node.key = node.key || fieldType;
    node.label = label;
  } else if (node.kind === 'container') {
    node.label = label;
  }
  // Display nodes keep the default content set by createField (e.g. "Heading").
  return node;
}
