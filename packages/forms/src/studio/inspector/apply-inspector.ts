import type { ElementIds } from '../layout/element-ids';
import { updateById, type TreeElement } from '../layout/element-tree';
import type { StudioDocument } from '../layout/schema-properties';
import { fieldAccepts } from './field-accepts';
import { inspectorContext } from './inspector-context';
import { fieldsFor, type InspectorEdit, type InspectorValues } from './inspector-fields';

/**
 * Writes inspector values back into the document (doc 187 rules 15-22). Each applicable field whose value
 * differs from what the document reads, and satisfies its field schema, is written; other keys are ignored.
 * The element is replaced by a new object carrying its studio id, with its ancestors rebuilt; the schema is
 * replaced only when a property setting changed. When nothing changed — including an unknown id — the SAME
 * document object is returned, so JSONForms' mount emit re-renders nothing.
 */
export function applyInspector(
  document: StudioDocument,
  elementId: string,
  values: InspectorValues,
  ids: ElementIds,
): StudioDocument {
  const ctx = inspectorContext(document, elementId, ids);
  if (!ctx) return document;

  let edit: InspectorEdit = { element: ctx.element, schema: document.schema };
  for (const field of fieldsFor(ctx)) {
    const value = values[field.key];
    if (Object.is(value, field.read(ctx)) || !fieldAccepts(field.schema(ctx), value)) continue;
    edit = field.write(ctx, edit, value);
  }

  if (edit.element === ctx.element && edit.schema === document.schema) return document;
  if (edit.element === ctx.element) return { schema: edit.schema, uischema: document.uischema };

  const next = edit.element;
  ids.carry(ctx.element, next);
  const uischema = updateById(document.uischema as TreeElement, elementId, () => next, ids);
  return { schema: edit.schema, uischema };
}
