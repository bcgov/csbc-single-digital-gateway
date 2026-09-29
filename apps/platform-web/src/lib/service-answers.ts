import { stable } from '@/lib/studio-content';

/**
 * Doc 230: a service version's staff answers — `content.data`, beside the form they answer. Anything
 * that is not a plain object (absent, or a malformed row) reads as no answers.
 */
export function answersOf(content: Record<string, unknown> | undefined): Record<string, unknown> {
  const data = content?.['data'];
  return typeof data === 'object' && data !== null && !Array.isArray(data)
    ? (data as Record<string, unknown>)
    : NO_ANSWERS;
}

/** One shared empty value: a fresh `{}` per render would make JSONForms re-render the runner for nothing. */
const NO_ANSWERS: Record<string, unknown> = Object.freeze({});

/**
 * Whether two sets of answers are the same, whatever their key order — JSONForms and the server's parse
 * each rebuild objects in their own order, so a plain `JSON.stringify` would call a saved page dirty.
 */
export function sameAnswers(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  return JSON.stringify(stable(a)) === JSON.stringify(stable(b));
}
