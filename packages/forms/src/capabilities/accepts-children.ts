import type { UISchemaElement } from '@jsonforms/core';
import { capabilityFor } from './capability-for';
import type { CapabilityMap } from './capability-types';

type TreeElement = UISchemaElement & { elements?: UISchemaElement[] };

/**
 * Doc 221: whether ANY element at or below `root` will accept a new child.
 *
 * What the palette is for. A governing template can lock every container in a document — a form the
 * owner may retitle but never add to — and the palette then offers a drag that nothing can receive:
 * every drop target refuses, and the author learns this only by trying. Hiding it says the same
 * thing up front.
 *
 * Asked of the CANVAS ROOT, not the whole document, so drilling into a locked Form on a Flow hides
 * the palette while a sibling Form that still accepts children keeps it.
 *
 * Ungoverned resolves to `FULLY_GRANTED`, so this is true for every untemplated document and the
 * palette behaves exactly as it always has.
 */
export function acceptsChildrenAnywhere(
  root: UISchemaElement | undefined,
  capabilities: CapabilityMap | undefined,
): boolean {
  if (root === undefined) return false;
  if (capabilities === undefined) return true;

  const visit = (element: TreeElement): boolean =>
    capabilityFor(capabilities, element).addChildren ||
    (element.elements ?? []).some((child) => visit(child as TreeElement));

  return visit(root as TreeElement);
}
