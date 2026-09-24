import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { nanoid } from 'nanoid';

// The studio's document shape and the authoring-only key minting. The two READERS — `propertyKeyOf` and
// `propertyKeysUsed` — moved down to `renderers/ui/schema-properties.ts` (doc 202 rules 44-45), because the
// form runner needs them and `renderers/` may never import the studio. They are re-exported here so every
// existing studio caller keeps working unchanged.
export { propertyKeyOf, propertyKeysUsed } from '../../renderers/ui/schema-properties';

/**
 * What every PURE EDIT takes and returns: the data schema and the uischema laying it out
 * (docs 183, 185).
 *
 * Capabilities are deliberately NOT here. The public `StudioDocument` (`types/index.ts`) carries them,
 * and this type is what the edit pipeline uses instead — because about twenty edit sites REBUILD the
 * document as a `{ schema, uischema }` literal rather than spreading it (`apply-inspector.ts`,
 * `condition-edits.ts`, `remove-element.ts`, `use-studio-document.ts`, `use-flow-document.ts`). An
 * optional third key on the type those functions return would be dropped by every one of them, and
 * because the key is OPTIONAL, TypeScript could not catch the drop. Typing the pipeline to exactly
 * what it produces makes that class of bug unrepresentable (doc 220).
 */
export interface EditableDocument {
  readonly schema: JsonSchema;
  readonly uischema: UISchemaElement;
}

/** A new data property key: `nanoid(8)`, `[A-Za-z0-9_-]` (doc 185 rule 27). */
export const newPropertyKey = (): string => nanoid(8);

/** The scope of the top-level property `key`. */
export const propertyScope = (key: string): string => `#/properties/${key}`;
