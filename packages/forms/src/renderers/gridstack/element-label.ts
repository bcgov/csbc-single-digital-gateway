import type { UISchemaElement } from '@jsonforms/core';

/**
 * Doc 201 rule 1: an element's name — its `label` when a string that is non-empty after `trim()`, trimmed; otherwise
 * `fallback`. The ONE rule for reading a name off an element, shared by the Form title (rules 3-11) and the Stage
 * card's Form rows (doc 195 rule 14), so the two can never disagree about what counts as a name.
 *
 * Pure and dependency-free, so `renderers/default` may import it (doc 193 rule 3).
 */
export function labelOf(element: UISchemaElement, fallback: string): string {
  const label = (element as { label?: unknown }).label;
  return typeof label === 'string' && label.trim() !== '' ? label.trim() : fallback;
}
