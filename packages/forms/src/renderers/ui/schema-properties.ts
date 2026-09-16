import type { JsonSchema, UISchemaElement } from '@jsonforms/core';

// Which schema property a Control binds to (doc 202 rules 44-45). Pure — no React, no studio.
//
// This started in `studio/layout/schema-properties.ts` and lives here for the reason doc 199 rule 1 moved
// `controlKindOf` down: the studio may import DOWN into the shared layer, never the reverse, and the form
// runner (`renderers/default`, through `runner/form-errors.ts`) needs the same resolution to decide which
// Form owns an Ajv error. The studio's module re-exports both, so its callers are untouched.
//
// `newPropertyKey` stays in the studio: minting a key is authoring, not reading, and it pulls in `nanoid`.

// Only a top-level property scope is read (doc 185 rules 17-18, 25).
const PROPERTY_SCOPE = /^#\/properties\/([^/]+)$/;

/** A layout's children, or `[]` — the only shape this module needs from an element. */
const elementsOf = (element: UISchemaElement): readonly UISchemaElement[] =>
  (element as { elements?: UISchemaElement[] }).elements ?? [];

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
  const visit = (element: UISchemaElement) => {
    const key = propertyKeyOf(element, schema);
    if (key !== undefined) keys.add(key);
    for (const child of elementsOf(element)) visit(child);
  };
  visit(root);
  return keys;
}
