import { DEFAULT_VARIANT } from '../document-types';

export const MAX_VARIANT_NAME = 40;

/**
 * Names a variant may never take (doc 262 rule 8): `default` is the mandatory one, and the rest would reach
 * `Object.prototype` as a key of `variants`.
 */
const RESERVED: readonly string[] = Object.freeze([
  DEFAULT_VARIANT,
  '__proto__',
  'constructor',
  'prototype',
]);

/**
 * Why `name` can't name a variant, or `undefined` when it can (doc 262 rule 8). `existing` is every variant's name;
 * `current` is the variant being renamed, which may keep its own name.
 */
export function variantNameProblem(
  name: string,
  existing: readonly string[],
  current?: string,
): string | undefined {
  const trimmed = name.trim();
  if (trimmed === '') return 'Enter a name.';
  if (trimmed.length > MAX_VARIANT_NAME) return `Use ${MAX_VARIANT_NAME} characters or fewer.`;
  const lower = trimmed.toLowerCase();
  if (RESERVED.includes(lower)) return `“${trimmed}” is reserved.`;
  const taken = existing.some((other) => other !== current && other.toLowerCase() === lower);
  return taken ? `A variant called “${trimmed}” already exists.` : undefined;
}
