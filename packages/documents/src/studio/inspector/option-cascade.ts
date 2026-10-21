import { variantNames, variantOf, withVariant, type DocumentContent } from '../document-types';
import { updateElement } from '../element-edits';
import { idOf } from '../element-ids';
import { refOfScope, sameRef, type PropertyRef } from '../property-ref';
import { controlsOf } from '../variants/variant-bindings';
import { recordOf } from './inspector-target';

/**
 * `content` with `options[key]` set to `value` (`undefined` = removed) on EVERY Control bound to `ref` in EVERY
 * variant, whatever its component — for an option that says what the stored answer MEANS, so it is the property's,
 * not one variant's: a Money currency (doc 286 rule 11), a document reference's type (doc 287 rule 15). Controls
 * already holding it keep their identity; the SAME content when none changed.
 */
export function cascadeOption(
  content: DocumentContent,
  ref: PropertyRef,
  key: string,
  value: string | undefined,
): DocumentContent {
  let next = content;
  for (const variant of variantNames(content)) {
    const root = variantOf(next, variant);
    const stale = controlsOf(root).filter((control) => {
      const bound = refOfScope(control['scope']);
      return (
        bound !== undefined && sameRef(bound, ref) && recordOf(control['options'])?.[key] !== value
      );
    });
    const updated = stale.reduce((node, control) => {
      const id = idOf(control);
      return id === undefined ? node : updateElement(node, id, { options: { [key]: value } });
    }, root);
    if (updated !== root) next = withVariant(next, updated, variant);
  }
  return next;
}

/** Doc 286 rule 11: the currency, cascaded. */
export function cascadeCurrency(
  content: DocumentContent,
  ref: PropertyRef,
  currency: string | undefined,
): DocumentContent {
  return cascadeOption(content, ref, 'currency', currency);
}
