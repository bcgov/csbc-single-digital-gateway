import type { Uischema } from './document-types';
import { idOf } from './element-ids';
import { formsOf } from './funnel-model';

/**
 * What Preview fills in (doc 247 rules 6-8): the focused Form; else the Forms the canvas draws — a Form root itself,
 * a Funnel's Forms in `elements` order wrapped in a VerticalLayout (conditions and edges ignored until a Funnel
 * renderer exists); else `null`, nothing to preview.
 */
export function previewUischema(variant: Uischema, focusedId: string | null): Uischema | null {
  const forms = formsOf(variant);
  const focused = focusedId === null ? undefined : forms.find((form) => idOf(form) === focusedId);
  if (focused !== undefined) return focused;
  if (forms.length === 0) return null;
  if (variant['type'] === 'Form') return variant;
  return { type: 'VerticalLayout', elements: [...forms] };
}
