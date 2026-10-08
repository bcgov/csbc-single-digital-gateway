import { variantNames, variantOf, withVariant, type DocumentContent } from '../document-types';
import { updateElement } from '../element-edits';
import { idOf } from '../element-ids';
import { refOfScope, sameRef, type PropertyRef } from '../property-ref';
import { controlsOf } from '../variants/variant-bindings';
import { recordOf } from './inspector-target';

/**
 * `content` with `options.currency` set to `currency` (`undefined` = removed, the default) on EVERY Control bound to
 * `ref` in EVERY variant, whatever its component (doc 286 rule 11) — the currency says what the stored number means,
 * so it is the property's, not one variant's. Controls already holding it keep their identity; the SAME content when
 * none changed.
 */
export function cascadeCurrency(
  content: DocumentContent,
  ref: PropertyRef,
  currency: string | undefined,
): DocumentContent {
  let next = content;
  for (const variant of variantNames(content)) {
    const root = variantOf(next, variant);
    const stale = controlsOf(root).filter((control) => {
      const bound = refOfScope(control['scope']);
      return (
        bound !== undefined &&
        sameRef(bound, ref) &&
        recordOf(control['options'])?.['currency'] !== currency
      );
    });
    const updated = stale.reduce((node, control) => {
      const id = idOf(control);
      return id === undefined ? node : updateElement(node, id, { options: { currency } });
    }, root);
    if (updated !== root) next = withVariant(next, updated, variant);
  }
  return next;
}
