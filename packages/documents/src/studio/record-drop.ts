import type { DropSource } from './capabilities/governance';
import { DEFAULT_VARIANT, variantOf, type DocumentContent } from './document-types';
import type { PaletteItem } from './palette-items';
import { crossingProblem } from './record-move';
import { intoRecord, recordArrayOf } from './record-scope';

/**
 * Doc 271 rule 15: whether the layout `layoutId` may take a drop by the document's own rules, BEFORE gridstack takes
 * it (refusing only at write-back leaves a ghost item). A palette item into a record must survive `intoRecord` (no
 * Data table / Record, no page field); a moved element must have no `crossingProblem`.
 */
export function mayDropIn(
  content: DocumentContent,
  items: readonly PaletteItem[],
  layoutId: string,
  source: DropSource,
  variantName: string = DEFAULT_VARIANT,
): boolean {
  if ('elementId' in source)
    return crossingProblem(content, source.elementId, layoutId, variantName) === undefined;
  const array = recordArrayOf(variantOf(content, variantName), layoutId);
  if (array === undefined || source.itemId === undefined) return true;
  const item = items.find((candidate) => candidate.id === source.itemId);
  return item === undefined || intoRecord(item.create(), array) !== undefined;
}
