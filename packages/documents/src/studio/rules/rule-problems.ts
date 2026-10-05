import { DEFAULT_VARIANT, variantOf, type DocumentContent } from '../document-types';
import { findById } from '../element-ids';
import { ruleScopes } from './rule-compile';
import { ruleSources } from './rule-sources';

/**
 * Doc 256 rule 5: the fields the rule on `elementId` tests that it may NOT — a field below it, inside it, deleted, or
 * not upstream — in the order the rule names them. Empty when it has no rule or every field is a source. Custom rules
 * are checked the same way.
 */
export function ruleProblems(
  content: DocumentContent,
  elementId: string,
  variant: string = DEFAULT_VARIANT,
): string[] {
  const element = findById(variantOf(content, variant), elementId);
  const rule = element?.['rule'];
  if (rule === undefined) return [];
  const sources = new Set(ruleSources(content, elementId, variant).map((field) => field.key));
  return ruleScopes(rule).filter((key) => !sources.has(key));
}
