import type { Uischema } from './document-types';
import { idOf } from './element-ids';
import { formsOf } from './funnel-model';

/**
 * What Preview fills in (doc 247 rules 6-8, doc 274 rule 32): the focused Form; else a Form root itself, or a Funnel
 * with at least one Form AS the Funnel — its renderer routes it one Form at a time; else `null`, nothing to preview.
 */
export function previewUischema(variant: Uischema, focusedId: string | null): Uischema | null {
  const forms = formsOf(variant);
  const focused = focusedId === null ? undefined : forms.find((form) => idOf(form) === focusedId);
  if (focused !== undefined) return focused;
  return forms.length === 0 ? null : variant;
}
