import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { nanoid } from 'nanoid';

// The studio's document shape and the authoring-only key minting. The two READERS — `propertyKeyOf` and
// `propertyKeysUsed` — moved down to `renderers/ui/schema-properties.ts` (doc 202 rules 44-45), because the
// form runner needs them and `renderers/` may never import the studio. They are re-exported here so every
// existing studio caller keeps working unchanged.
export { propertyKeyOf, propertyKeysUsed } from '../../renderers/ui/schema-properties';

/** The studio's document: the data schema and the uischema laying it out (docs 183, 185). */
export interface StudioDocument {
  readonly schema: JsonSchema;
  readonly uischema: UISchemaElement;
}

/** A new data property key: `nanoid(8)`, `[A-Za-z0-9_-]` (doc 185 rule 27). */
export const newPropertyKey = (): string => nanoid(8);

/** The scope of the top-level property `key`. */
export const propertyScope = (key: string): string => `#/properties/${key}`;
