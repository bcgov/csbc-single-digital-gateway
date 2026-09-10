import type { HeadingLevel } from '@repo/ui/heading';

const LEVELS: readonly HeadingLevel[] = [1, 2, 3, 4, 5, 6];

/**
 * An authored `level`/`size` as a `HeadingLevel`, or `undefined` when it is not an integer 1-6
 * (doc 180 rule 4). Strict equality rejects `0`, `7`, `2.5` and the string `'2'` alike, since
 * uischema is hand-authored JSON and nothing upstream validates it.
 */
export function toHeadingLevel(value: unknown): HeadingLevel | undefined {
  return LEVELS.find((level) => level === value);
}
