import type { ElementIds } from '../layout/element-ids';
import { updateById, type TreeElement } from '../layout/element-tree';
import type { EditableDocument } from '../layout/schema-properties';
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
/**
 * Doc 207 rule 25: whether the inspector's value is the one the document already holds.
 *
 * `Object.is` alone was enough while every inspector value was a string, boolean or number. An OBJECT value
 * (rich content) is a REFERENCE comparison there, and JSONForms hands back a new object on every change —
 * so an untouched editor would read as CHANGED on every pass, write, and re-render the canvas, which is
 * doc 187 rule 15's exact failure. Objects are therefore compared by content.
 */
function unchanged(value: unknown, current: unknown): boolean {
  if (Object.is(value, current)) return true;
  const both =
    typeof value === 'object' && value !== null && typeof current === 'object' && current !== null;
  return both && JSON.stringify(value) === JSON.stringify(current);
}

export function applyInspector(
  document: EditableDocument,
  elementId: string,
  values: InspectorValues,
  ids: ElementIds,
): EditableDocument {
  const ctx = inspectorContext(document, elementId, ids);
  if (!ctx) return document;

  let edit: InspectorEdit = { element: ctx.element, schema: document.schema };
  for (const field of fieldsFor(ctx)) {
    const value = values[field.key];
    if (unchanged(value, field.read(ctx)) || !fieldAccepts(field.schema(ctx), value)) continue;
    edit = field.write(ctx, edit, value);
  }

  return applied(document, ctx.element, elementId, edit, ids);
}

/** The document an `InspectorEdit` produces — the same identity when the edit changed nothing. */
function applied(
  document: EditableDocument,
  before: TreeElement,
  elementId: string,
  edit: InspectorEdit,
  ids: ElementIds,
): EditableDocument {
  if (edit.element === before && edit.schema === document.schema) return document;
  if (edit.element === before) return { schema: edit.schema, uischema: document.uischema };

  const next = edit.element;
  ids.carry(before, next);
  const uischema = updateById(document.uischema as TreeElement, elementId, () => next, ids);
  return { schema: edit.schema, uischema };
}

/**
 * Doc 223: writes ONE inspector field, by key — what an inline editor on the canvas commits.
 *
 * It exists because `applyInspector` CANNOT be called with a partial `InspectorValues`. That function
 * walks every applicable field and reads `values[field.key]`, and `fieldAccepts` treats `undefined` as
 * a deliberate CLEAR (`field-accepts.ts:9`) — so `applyInspector(doc, id, { label: 'x' })` would empty
 * every other setting the element has. The inspector panel is safe because JSONForms always hands it
 * the whole form's data.
 *
 * Same write path, same `unchanged` and `fieldAccepts` guards, same "unchanged returns the SAME
 * document object" contract (doc 187 rule 15), so the canvas and the inspector can never disagree.
 */
export function applyInspectorField(
  document: EditableDocument,
  elementId: string,
  key: string,
  value: unknown,
  ids: ElementIds,
): EditableDocument {
  const ctx = inspectorContext(document, elementId, ids);
  if (!ctx) return document;

  const field = fieldsFor(ctx).find((candidate) => candidate.key === key);
  if (!field) return document;
  if (unchanged(value, field.read(ctx)) || !fieldAccepts(field.schema(ctx), value)) return document;

  const edit = field.write(ctx, { element: ctx.element, schema: document.schema }, value);
  return applied(document, ctx.element, elementId, edit, ids);
}
