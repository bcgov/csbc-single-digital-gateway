import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { nanoid } from 'nanoid';
import type { TreeElement } from './element-tree';

/** The studio's document: the data schema and the uischema laying it out (docs 183, 185). */
export interface StudioDocument {
  readonly schema: JsonSchema;
  readonly uischema: UISchemaElement;
}

// Only a top-level property scope is rewritten or cleaned up (doc 185 rules 17-18, 25).
const PROPERTY_SCOPE = /^#\/properties\/([^/]+)$/;

/** A new data property key: `nanoid(8)`, `[A-Za-z0-9_-]` (doc 185 rule 27). */
export const newPropertyKey = (): string => nanoid(8);

/** The scope of the top-level property `key`. */
export const propertyScope = (key: string): string => `#/properties/${key}`;

/**
 * The property a Control binds to: its `scope` is exactly `#/properties/<key>` and `<key>` is an OWN
 * property of `schema.properties` — an inherited name such as `toString` is never a property.
 */
export function propertyKeyOf(element: UISchemaElement, schema: JsonSchema): string | undefined {
  if (element.type !== 'Control' || !('scope' in element) || typeof element.scope !== 'string')
    return undefined;
  const key = PROPERTY_SCOPE.exec(element.scope)?.[1];
  const properties = schema.properties;
  return key !== undefined && properties !== undefined && Object.hasOwn(properties, key)
    ? key
    : undefined;
}

/** Every property key a Control at or below `root` binds to. */
export function propertyKeysUsed(root: UISchemaElement, schema: JsonSchema): Set<string> {
  const keys = new Set<string>();
  const visit = (element: TreeElement) => {
    const key = propertyKeyOf(element, schema);
    if (key !== undefined) keys.add(key);
    for (const child of element.elements ?? []) visit(child);
  };
  visit(root);
  return keys;
}
