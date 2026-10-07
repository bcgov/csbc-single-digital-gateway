import { remapChoiceAnswers } from '../answers/answer-edits';
import type { DocumentContent } from '../document-types';
import { updateProperty } from '../inspector/schema-edits';
import { propertyAt } from '../property-ref';
import { cascadeClauses } from './option-cascade';
import type { SavedEntry } from './option-draft';
import type { OptionsTarget } from './options-target';

/**
 * Doc 255 rules 7, 11: `content` with the target's options replaced by `entries` — `oneOf` for a single choice,
 * `items.oneOf` for a multiple choice, every other keyword kept — and every Condition clause testing a renamed value
 * rewritten, in ONE content write — in every variant, since each may test the field (doc 262 rule 14).
 */
export function saveOptions(
  content: DocumentContent,
  target: OptionsTarget,
  entries: readonly SavedEntry[],
  renames: ReadonlyMap<string | number, string | number>,
): DocumentContent {
  const oneOf = entries.map((entry) => ({ ...entry }));
  const ref = target.ref ?? { key: target.propertyKey };
  const property = propertyAt(content.schema, ref);
  const patch = target.multiple
    ? { items: { ...(property?.['items'] as Record<string, unknown> | undefined), oneOf } }
    : { oneOf };
  // Doc 281 rule 18: answers follow a renamed option, and a value no longer offered is cleared.
  const withOptions = remapChoiceAnswers(
    updateProperty(content, ref, patch),
    ref,
    renames,
    oneOf.map((entry) => entry.const),
  );
  const variants = Object.entries(withOptions.variants).map(
    ([name, root]) => [name, cascadeClauses(root, target.propertyKey, renames)] as const,
  );
  if (variants.every(([name, root]) => root === withOptions.variants[name])) return withOptions;
  return {
    ...withOptions,
    variants: Object.fromEntries(variants) as DocumentContent['variants'],
  };
}
