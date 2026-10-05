import { DEFAULT_VARIANT, type DocumentContent } from '../document-types';
import { newForm } from '../node-edits';
import { variantNameProblem } from './variant-names';

/** The variants' names in key order — `default` first, as the tabs list them (doc 262 rule 1). */
export function variantNames(content: DocumentContent): string[] {
  const names = Object.keys(content.variants);
  return [DEFAULT_VARIANT, ...names.filter((name) => name !== DEFAULT_VARIANT)];
}

/**
 * `content` with a new variant under the trimmed `name`: a blank Form root with a fresh id (doc 262 rule 6). The SAME
 * content when the name has a problem.
 */
export function createVariant(content: DocumentContent, name: string): DocumentContent {
  if (variantNameProblem(name, variantNames(content)) !== undefined) return content;
  return { ...content, variants: { ...content.variants, [name.trim()]: newForm() } };
}

/**
 * `content` with variant `from` re-keyed to the trimmed `to`, IN PLACE so its tab keeps its position (doc 262 rule 9).
 * The SAME content for `default`, an unknown variant, an unchanged name or a name with a problem.
 */
export function renameVariant(content: DocumentContent, from: string, to: string): DocumentContent {
  const name = to.trim();
  if (from === DEFAULT_VARIANT || !Object.hasOwn(content.variants, from) || name === from)
    return content;
  if (variantNameProblem(name, variantNames(content), from) !== undefined) return content;
  const entries = Object.entries(content.variants).map(
    ([key, uischema]) => [key === from ? name : key, uischema] as const,
  );
  return { ...content, variants: Object.fromEntries(entries) as DocumentContent['variants'] };
}

/**
 * `content` without variant `name` (doc 262 rule 10). The schema is untouched: every field a variant can bind, default
 * binds too. The SAME content for `default` or an unknown variant.
 */
export function deleteVariant(content: DocumentContent, name: string): DocumentContent {
  if (name === DEFAULT_VARIANT || !Object.hasOwn(content.variants, name)) return content;
  const variants = Object.fromEntries(
    Object.entries(content.variants).filter(([key]) => key !== name),
  ) as DocumentContent['variants'];
  return { ...content, variants };
}
