import type { JsonSchema } from '@jsonforms/core';
import { propertyKeyOf } from '../../renderers/ui/schema-properties';
import { cascadeClauses } from '../options/option-cascade';
import type { SavedEntry } from '../options/option-draft';
import { sameJson } from '../code/document-text';
import type { ElementIds } from './element-ids';
import { findById, type TreeElement } from './element-tree';
import type { StudioDocument } from './schema-properties';

// Doc 206 rules 26-28 — the ONLY writer of an option list. Pure.
//
// It cannot go through `applyInspector`: that walks every applicable inspector field and reads a missing key as
// "cleared" (doc 204 trap), and `fieldAccepts` refuses an array outright. It cannot go through `setProperty`
// either — that writes a TOP-LEVEL key of the property, and a multi-choice list lives at `items.oneOf`.

type Bag = Record<string, unknown>;

const isRecord = (value: unknown): value is Bag =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Where this property's option list lives (rule 26). */
const isMulti = (property: JsonSchema) => property.type === 'array';

/** The list as currently authored, for the unchanged check. */
const currentEntries = (property: JsonSchema): unknown => {
  if (!isMulti(property)) return property.oneOf;
  const items: unknown = property.items;
  return isRecord(items) ? items['oneOf'] : undefined;
};

/**
 * Rules 26-27: the property with its list replaced, keeping every other key — of the property AND, for a
 * multi-choice, of `items`.
 *
 * It never INTRODUCES `items.type`. When the author declared none, the const type is inferred from the first
 * const (doc 205 rule 1) and every const shares the resolved type, so inference keeps giving the same answer;
 * writing a key they never authored would be a silent rewrite of their schema. A declared one is kept as-is.
 */
function withEntries(property: JsonSchema, entries: readonly SavedEntry[]): JsonSchema {
  if (!isMulti(property)) return { ...property, oneOf: entries } as JsonSchema;
  const items = isRecord(property.items) ? property.items : {};
  return { ...property, items: { ...items, oneOf: entries } } as JsonSchema;
}

/**
 * Rules 21-22, 26-28: `entries` written to the element's bound property, with `renames` cascaded into every
 * Flow Condition clause on that property IN THE SAME UPDATE.
 *
 * Returns the SAME document — never a new object with equal content — when the element is not in the document,
 * is not a bound Control, the list is empty (rule 19: the metaschema requires at least one), or nothing would
 * change. JSONForms' debounced mount emit re-renders the canvas on every new document object (doc 187 rule 15).
 */
export function setChoices(
  document: StudioDocument,
  elementId: string,
  entries: readonly SavedEntry[],
  renames: ReadonlyMap<string | number, string | number>,
  ids: ElementIds,
): StudioDocument {
  if (entries.length === 0) return document;

  const element = findById(document.uischema as TreeElement, elementId, ids);
  if (element === undefined) return document;

  const key = propertyKeyOf(element, document.schema);
  const property = key === undefined ? undefined : document.schema.properties?.[key];
  if (key === undefined || property === undefined) return document;

  const schema = sameJson(currentEntries(property), entries)
    ? document.schema
    : ({
        ...document.schema,
        properties: { ...document.schema.properties, [key]: withEntries(property, entries) },
      } as JsonSchema);

  const uischema = cascadeClauses(document.uischema, key, renames, ids);
  return schema === document.schema && uischema === document.uischema
    ? document
    : { schema, uischema };
}
