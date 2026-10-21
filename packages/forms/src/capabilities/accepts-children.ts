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
 *
 * TWO questions per element, and doc 221 B1 is what happens with only one: MAY it take a child
 * (the capability) and CAN it hold one at all (`isContainer`). A `Control`, `Heading` or `Separator`
 * has a capability like anything else, so a template that locked the root but left the leaves at
 * their defaults reported "something accepts children" and showed a palette whose every drop target
 * refuses — the exact futile drag this function exists to prevent.
 *
 * `isContainer` is INJECTED rather than imported: which types hold children is renderer knowledge
 * (`isGridLayoutType`), and this module is imported by platform-api's capability guard, so reaching
 * for it here would drag `@jsonforms/core` and the gridstack layer into the Nest process — the same
 * trap `element-placeholders.ts` was split out for.
 */
export function acceptsChildrenAnywhere(
  root: UISchemaElement | undefined,
  capabilities: CapabilityMap | undefined,
  isContainer: (type: string) => boolean,
): boolean {
  if (root === undefined) return false;

  const visit = (element: TreeElement): boolean =>
    (isContainer(element.type) &&
      (capabilities === undefined || capabilityFor(capabilities, element).addChildren)) ||
    (element.elements ?? []).some((child) => visit(child as TreeElement));

  return visit(root as TreeElement);
}
