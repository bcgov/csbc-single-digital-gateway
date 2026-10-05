import type { DocumentContent } from '../document-types';
import { boundKeys, isRecord } from './variant-bindings';
import { variantNames } from './variant-edits';

/** A required field a variant does not show. */
export interface MissingField {
  key: string;
  /** The property's `title`, else its key. */
  title: string;
}

export interface VariantProblem {
  variant: string;
  missing: MissingField[];
}

/**
 * Every variant that shows no Control for some required property (doc 262 rule 15), in tab order, with what it misses
 * in `required` order. `[]` = every variant can be filled in completely — what publish checks. A rule that hides a
 * Control does not make it missing; an empty variant misses every required field.
 */
export function variantProblems(content: DocumentContent): VariantProblem[] {
  const required = requiredKeys(content.schema);
  if (required.length === 0) return [];
  const properties = isRecord(content.schema['properties']) ? content.schema['properties'] : {};
  return variantNames(content).flatMap((variant) => {
    const bound = new Set(boundKeys(content.variants[variant] ?? {}));
    const missing = required
      .filter((key) => !bound.has(key))
      .map((key) => ({ key, title: titleOf(properties[key], key) }));
    return missing.length === 0 ? [] : [{ variant, missing }];
  });
}

function requiredKeys(schema: Record<string, unknown>): string[] {
  const required = schema['required'];
  return Array.isArray(required)
    ? required.filter((key): key is string => typeof key === 'string')
    : [];
}

/** A property's `title` when a non-blank string, else `key`. */
export function titleOf(property: unknown, key: string): string {
  const title = isRecord(property) ? property['title'] : undefined;
  return typeof title === 'string' && title.trim() !== '' ? title : key;
}
