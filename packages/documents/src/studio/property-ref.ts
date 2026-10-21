/**
 * Doc 271 rule 2: the ONE place a Control scope becomes a schema property reference. A page field is
 * `#/properties/<key>`; a record's item field is `#/properties/<array>/items/properties/<key>` — a FULL scope, so it
 * never matches the root-only `^#/properties/([^/]+)$` that every page-field path reads.
 */
export type PropertyRef = { readonly key: string; readonly array?: undefined } | ItemRef;

/** A record item field's property: `items.properties.<key>` of the array property `array`. */
export interface ItemRef {
  readonly array: string;
  readonly key: string;
}

const ROOT_SCOPE = /^#\/properties\/([^/]+)$/;
const ITEM_SCOPE = /^#\/properties\/([^/]+)\/items\/properties\/([^/]+)$/;

/** The property a scope names, or `undefined` for anything else. */
export function refOfScope(scope: unknown): PropertyRef | undefined {
  if (typeof scope !== 'string') return undefined;
  const item = ITEM_SCOPE.exec(scope);
  if (item !== null) return { array: item[1]!, key: item[2]! };
  const root = ROOT_SCOPE.exec(scope);
  return root === null ? undefined : { key: root[1]! };
}

/** The scope a Control binding `ref` carries. */
export function scopeOf(ref: PropertyRef): string {
  return ref.array === undefined
    ? `#/properties/${ref.key}`
    : `#/properties/${ref.array}/items/properties/${ref.key}`;
}

/** A plain string is a page (root) key — every pre-record caller passes one. */
export function toRef(ref: string | PropertyRef): PropertyRef {
  return typeof ref === 'string' ? { key: ref } : ref;
}

/** The object schema holding `ref`'s property: the root schema, or the array's `items`. */
export function ownerOf(
  schema: Record<string, unknown>,
  ref: PropertyRef,
): Record<string, unknown> | undefined {
  if (ref.array === undefined) return schema;
  const array = recordOf(recordOf(schema['properties'])?.[ref.array]);
  return recordOf(array?.['items']);
}

/** `ref`'s property schema, when the schema has it. */
export function propertyAt(
  schema: Record<string, unknown>,
  ref: PropertyRef,
): Record<string, unknown> | undefined {
  return recordOf(recordOf(ownerOf(schema, ref)?.['properties'])?.[ref.key]);
}

/** Whether `ref`'s property is required by its owner (`required`, or `items.required`). */
export function requiredAt(schema: Record<string, unknown>, ref: PropertyRef): boolean {
  const required = ownerOf(schema, ref)?.['required'];
  return Array.isArray(required) && required.includes(ref.key);
}

/**
 * `schema` with `ref`'s OWNER replaced by `update(owner)` — the root itself, or the array's `items` rebuilt in place.
 * The SAME schema when the owner is missing or `update` returns it unchanged.
 */
export function withOwner(
  schema: Record<string, unknown>,
  ref: PropertyRef,
  update: (owner: Record<string, unknown>) => Record<string, unknown>,
): Record<string, unknown> {
  const owner = ownerOf(schema, ref);
  if (owner === undefined) return schema;
  const next = update(owner);
  if (next === owner) return schema;
  if (ref.array === undefined) return next;
  const properties = recordOf(schema['properties'])!;
  const array = recordOf(properties[ref.array])!;
  return {
    ...schema,
    properties: { ...properties, [ref.array]: { ...array, items: next } },
  };
}

export function sameRef(a: PropertyRef, b: PropertyRef): boolean {
  return a.key === b.key && a.array === b.array;
}

function recordOf(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}
