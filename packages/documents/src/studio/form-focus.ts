import type { Uischema } from './document-types';
import { idOf } from './element-ids';
import { formsOf } from './funnel-model';

/**
 * Which Form the canvas is zoomed in on (doc 233 rule 1): `'default'` until the author chooses — a top-level Form is
 * focused by default — then a Form's id, or `null` after Back.
 */
export type FocusState = 'default' | string | null;

/** The focused Form's id, or `null`. An id naming no Form (e.g. one just deleted) focuses nothing. */
export function resolveFocus(uischema: Uischema, focus: FocusState): string | null {
  if (focus === null) return null;
  if (focus === 'default') return uischema['type'] === 'Form' ? (idOf(uischema) ?? null) : null;
  return formsOf(uischema).some((f) => idOf(f) === focus) ? focus : null;
}
