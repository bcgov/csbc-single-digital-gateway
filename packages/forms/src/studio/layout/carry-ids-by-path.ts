import type { UISchemaElement } from '@jsonforms/core';
import type { ElementIds } from './element-ids';
import type { TreeElement } from './element-tree';

/**
 * Carries studio ids from `previous` into a replacement uischema by tree position (doc 191 rule 23). Walking both trees
 * by `elements` index, every `next` element whose counterpart has the same `type` takes the counterpart's id; where the
 * types differ that element and its subtree are left to receive fresh ids. Carrying the same pair twice is harmless.
 */
export function carryIdsByPath(
  previous: UISchemaElement,
  next: UISchemaElement,
  ids: ElementIds,
): void {
  if (previous.type !== next.type) return;
  if (previous !== next) ids.carry(previous, next);
  const before = (previous as TreeElement).elements ?? [];
  const after = (next as TreeElement).elements ?? [];
  after.forEach((child, index) => {
    const counterpart = before[index];
    if (counterpart) carryIdsByPath(counterpart, child, ids);
  });
}
