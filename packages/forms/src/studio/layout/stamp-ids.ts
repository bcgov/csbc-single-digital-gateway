import type { UISchemaElement } from '@jsonforms/core';
import { nanoid } from 'nanoid';
import { authoredId } from '../../renderers/ui/authored-id';
import { freshId } from './element-parts';
import { allIdsUsed } from './form-address';
import type { TreeElement } from './element-tree';

// Doc 219 — seed normalisation: every id-less element gets an authored id when a document is OPENED.
//
// Stamping only on INSERT would leave an id on every element the studio itself created and none on any
// element that arrived another way — most importantly the ROOT of each seeded template
// (`packages/database/src/seed-data/blank-documents.ts` seeds `{ type, label, elements: [] }`), which is
// exactly the element a capability must name to say "may the owner add top-level fields?" (doc 220).
//
// This is what makes the metaschema's "optional" honest: a document may ARRIVE without ids, but an OPEN
// document never lacks them.

/**
 * `root` with an authored id on every element that has none, or the SAME object when every element already
 * has one.
 *
 * Returning the same object on a no-op matters: `fromSource` feeds this straight into studio state, and a
 * fresh object for an already-normalised document would make every reseed look like a change.
 *
 * Ids are minted against `allIdsUsed` — the whole document, not the addressable Form/Stage space — because a
 * capability entry is keyed by element id, so two elements sharing one would both match a single entry.
 */
export function stampMissingIds(
  root: UISchemaElement,
  newId: () => string = () => nanoid(8),
  alsoTaken?: ReadonlySet<string>,
): UISchemaElement {
  const taken = allIdsUsed(root);
  // `alsoTaken` lets a SUBTREE be stamped against the ids of the document it is about to join — what
  // `insertElement` needs, since a freshly built template knows nothing of the document around it.
  for (const id of alsoTaken ?? []) taken.add(id);

  const visit = (element: TreeElement): TreeElement => {
    const children = element.elements as TreeElement[] | undefined;
    const nextChildren = children?.map(visit);
    const childrenChanged =
      nextChildren !== undefined && nextChildren.some((child, i) => child !== children?.[i]);

    const needsId = authoredId(element) === undefined;
    if (!needsId && !childrenChanged) return element;

    const next: TreeElement = { ...element };
    if (needsId) {
      const id = freshId(taken, newId);
      taken.add(id);
      (next as { id?: string }).id = id;
    }
    if (childrenChanged) (next as { elements?: TreeElement[] }).elements = nextChildren;
    return next;
  };

  return visit(root as TreeElement) as UISchemaElement;
}
