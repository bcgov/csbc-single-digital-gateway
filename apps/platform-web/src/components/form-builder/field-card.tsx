import { JsonForms, type JsonSchema, type UISchemaElement } from '@repo/react/jsonforms';
import { FIELD_TYPE_BY_ID, type FieldTypeId } from './field-types';
import { createField, serializeModel, type FieldNode } from './model';

const noop = () => {};

/**
 * Renders a single field exactly as a real form would — it serializes the node to a one-field
 * `{ schema, uischema }` and runs it through the actual `@repo/react` renderers (readonly + inert,
 * so it's a non-interactive preview). Used by the canvas cards, the drag overlay, and the drop
 * placeholder so authoring, dragging and dropping all look like the rendered field. `ghost` = the
 * dashed translucent placeholder variant.
 */
export function FieldPreview({ node, ghost = false }: { node: FieldNode; ghost?: boolean }) {
  const definition = serializeModel({ title: '', description: '', fields: [node] });
  return (
    <div
      inert
      className={
        ghost
          ? 'pointer-events-none rounded-lg border-2 border-dashed border-primary bg-primary/5 p-3'
          : 'pointer-events-none'
      }
    >
      <JsonForms
        schema={definition.schema as JsonSchema}
        uischema={definition.uischema as unknown as UISchemaElement}
        data={{}}
        readonly
        onChange={noop}
      />
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
  } else {
    node.label = label;
  }
  return node;
}
