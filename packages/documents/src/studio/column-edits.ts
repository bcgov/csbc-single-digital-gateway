import { nanoid } from 'nanoid';
import type { ColumnEdit } from '../renderers/studio/column-edit';
import { columnKeyProblem, isObjectArray } from '../renderers/ui/object-array';
import type { Governance } from './capabilities/governance';
import { DEFAULT_VARIANT, variantOf, type DocumentContent } from './document-types';
import { findById } from './element-ids';
import { recordOf } from './inspector/inspector-target';
import { updateProperty } from './inspector/schema-edits';

type Columns = Record<string, Record<string, unknown>>;

const PROPERTY_SCOPE = /^#\/properties\/([^/]+)$/;

/**
 * `content` with a canvas column edit applied (doc 263 rule 28), or the SAME content when refused: the backstop behind
 * the studio table's own affordances — outside default nothing writes the schema (doc 262), and the template may lock
 * the element's `columns`. The element's bound property is resolved in the active variant.
 */
export function canvasColumnEdit(
  content: DocumentContent,
  variant: string,
  governance: Governance | undefined,
  elementId: string,
  edit: ColumnEdit,
): DocumentContent {
  if (variant !== DEFAULT_VARIANT) return content;
  if (governance?.canEdit(elementId, 'columns') === false) return content;
  const scope = findById(variantOf(content, variant), elementId)?.['scope'];
  const key = typeof scope === 'string' ? PROPERTY_SCOPE.exec(scope)?.[1] : undefined;
  return key === undefined ? content : applyColumnEdit(content, key, edit);
}

/**
 * `content` with one column edit applied to the object array `propertyKey` (doc 263 rules 25-26) — a schema write, so
 * every variant shares it. The SAME content for an unknown property, one that is not an object array, an unknown
 * column, a refused edit, or one that changes nothing. No Condition cascade: an object array is never a rule source.
 */
export function applyColumnEdit(
  content: DocumentContent,
  propertyKey: string,
  edit: ColumnEdit,
): DocumentContent {
  const property = recordOf(recordOf(content.schema['properties'])?.[propertyKey]);
  if (property === undefined || !isObjectArray(property)) return content;
  const items = recordOf(property['items'])!;
  const columns = recordOf(items['properties']) as Columns;
  const nextItems = editedItems(items, columns, edit);
  return nextItems === undefined
    ? content
    : updateProperty(content, propertyKey, { items: nextItems });
}

/** The edited `items`, or `undefined` when the edit is refused or unknown. */
function editedItems(
  items: Record<string, unknown>,
  columns: Columns,
  edit: ColumnEdit,
): Record<string, unknown> | undefined {
  if (edit.kind === 'add')
    return { ...items, properties: { ...columns, [nanoid(8)]: newColumn(columns) } };
  const column = recordOf(columns[edit.key]);
  if (column === undefined) return undefined;
  switch (edit.kind) {
    case 'rename': {
      const title = edit.title.trim();
      return title === '' ? undefined : withColumn(items, columns, edit.key, { ...column, title });
    }
    case 'retype':
      return withColumn(items, columns, edit.key, retyped(column, edit.type));
    case 'move':
      return { ...items, properties: moved(columns, edit.key, edit.to) };
    case 'remove':
      return removed(items, columns, edit.key);
    case 'rekey':
      return rekeyed(items, columns, edit.key, edit.to);
  }
}

/** Rule 25: a Text column titled `Column <n>`, `n` the smallest from count + 1 whose title is free. */
function newColumn(columns: Columns): Record<string, unknown> {
  const titles = new Set(Object.values(columns).map((column) => recordOf(column)?.['title']));
  let n = Object.keys(columns).length + 1;
  while (titles.has(`Column ${n}`)) n += 1;
  return { type: 'string', title: `Column ${n}` };
}

/** Only type, title and description survive: a stale `minimum` must not make the schema invalid. */
function retyped(column: Record<string, unknown>, type: string): Record<string, unknown> {
  const { title, description } = column;
  return {
    type,
    ...(title !== undefined && { title }),
    ...(description !== undefined && { description }),
  };
}

function withColumn(
  items: Record<string, unknown>,
  columns: Columns,
  key: string,
  column: Record<string, unknown>,
): Record<string, unknown> {
  return { ...items, properties: { ...columns, [key]: column } };
}

/** `columns` with `key` at index `to`, clamped (rule 25). */
function moved(columns: Columns, key: string, to: number): Columns {
  const keys = Object.keys(columns).filter((k) => k !== key);
  const index = Math.min(Math.max(Math.trunc(to), 0), keys.length);
  keys.splice(index, 0, key);
  return Object.fromEntries(keys.map((k) => [k, columns[k]!]));
}

/** Without the column and its `required` entry; refused for the last column (rule 25). */
function removed(
  items: Record<string, unknown>,
  columns: Columns,
  key: string,
): Record<string, unknown> | undefined {
  if (Object.keys(columns).length <= 1) return undefined;
  const { [key]: _removed, ...rest } = columns;
  const { required, ...others } = items;
  const kept = Array.isArray(required) ? required.filter((k) => k !== key) : undefined;
  return {
    ...others,
    properties: rest,
    ...(kept !== undefined && kept.length > 0 && { required: kept }),
  };
}

/**
 * The column renamed to `to` in place — order kept — with its `required` entry (doc 264 rules 9-11); refused when
 * unchanged or invalid. Nothing else references a column key, so nothing cascades.
 */
function rekeyed(
  items: Record<string, unknown>,
  columns: Columns,
  key: string,
  to: string,
): Record<string, unknown> | undefined {
  const next = to.trim();
  if (next === key || columnKeyProblem({ type: 'array', items }, key, next) !== undefined)
    return undefined;
  const properties = Object.fromEntries(
    Object.entries(columns).map(([k, column]) => [k === key ? next : k, column]),
  );
  const { required } = items;
  return {
    ...items,
    properties,
    ...(Array.isArray(required) && {
      required: required.map((k: unknown) => (k === key ? next : k)),
    }),
  };
}
