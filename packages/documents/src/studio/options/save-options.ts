import { withVariant, type DocumentContent } from '../document-types';
import { updateProperty } from '../inspector/schema-edits';
import { cascadeClauses } from './option-cascade';
import type { SavedEntry } from './option-draft';
import type { OptionsTarget } from './options-target';

/**
 * Doc 255 rules 7, 11: `content` with the target's options replaced by `entries` — `oneOf` for a single choice,
 * `items.oneOf` for a multiple choice, every other keyword kept — and every Condition clause testing a renamed value
 * rewritten, in ONE content write.
 */
export function saveOptions(
  content: DocumentContent,
  target: OptionsTarget,
  entries: readonly SavedEntry[],
  renames: ReadonlyMap<string | number, string | number>,
): DocumentContent {
  const oneOf = entries.map((entry) => ({ ...entry }));
  const properties = content.schema['properties'] as
    | Record<string, Record<string, unknown>>
    | undefined;
  const property = properties?.[target.propertyKey];
  const patch = target.multiple
    ? { items: { ...(property?.['items'] as Record<string, unknown> | undefined), oneOf } }
    : { oneOf };
  const withOptions = updateProperty(content, target.propertyKey, patch);
  const root = withOptions.variants.default;
  const cascaded = cascadeClauses(root, target.propertyKey, renames);
  return cascaded === root ? withOptions : withVariant(withOptions, cascaded);
}
