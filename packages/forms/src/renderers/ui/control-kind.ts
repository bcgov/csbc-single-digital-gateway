import type { JsonSchema } from '@jsonforms/core';
import { choiceOptions } from './choice-control';
import { multiChoiceOptions } from './multi-choice-control';
import { isRichTextProperty } from './rich-text-value';

// What a Control edits (doc 187 rule 8, doc 188 rule 24). Pure — no React.
//
// Doc 199 rule 1: this lives beside `choiceOptions`, the test it already depends on, rather than in
// `studio/inspector` where it started. Both the inspector AND `renderers/xyflow/criteria.ts` need it, and
// `renderers/xyflow` may never import the studio (pinned by studio-flow-editing.test.tsx) — so the shared
// classifier belongs in the shared layer, with the studio importing DOWN into it as it already does.

export type ControlKind = 'text' | 'number' | 'choice' | 'boolean' | 'multi-choice' | 'rich-text';

/**
 * Doc 188 rule 24: `'choice'` for a oneOf (const/title) schema the renderers/ui choice controls render — checked
 * first, with the same test they dispatch on — else the property's `type`: string, number or boolean.
 *
 * Doc 204 rules 18-19: an `integer` property is a `'number'` — it is the SAME field with decimals turned off, and
 * the same NumberInput renders it (rule 17). Returning `'integer'` would be returning a kind nothing handles:
 * every inspector field gated on this (Minimum, Maximum, Step, decimals) would stop applying, and the field would
 * vanish from the Flow condition pickers that read it — `upstream-fields.ts` and `criterion-match.ts` both skip a
 * property whose kind is `undefined`.
 */
export function controlKindOf(property: JsonSchema | undefined): ControlKind | undefined {
  if (!property) return undefined;
  if (choiceOptions(property)) return 'choice';
  /**
   * Doc 207 rules 1-2: checked with the other structural tests, before the plain `type` fallthrough. The
   * kind — not an `options.component` — is what makes rich text non-interchangeable with Input and
   * Textarea: those match `isStringControl`, which an object property can never satisfy. It is also what
   * keeps text's `contains`/`startsWith` operators and the mask and maxLength settings away from it.
   */
  if (isRichTextProperty(property)) return 'rich-text';
  // Doc 205 rule 26: checked before the plain type fallthrough, exactly as `choice` is — an array property is
  // only a field at all when its items describe a choice list.
  if (multiChoiceOptions(property)) return 'multi-choice';
  if (property.type === 'string') return 'text';
  if (property.type === 'integer') return 'number';
  if (property.type === 'number' || property.type === 'boolean') return property.type;
  return undefined;
}
