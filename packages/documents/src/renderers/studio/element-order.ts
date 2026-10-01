/**
 * `elements` reordered to follow `orderedIds` (doc 236 rule 29): an element whose id is not listed keeps its relative
 * order at the end. The SAME array when the order does not change, so an unmoved drag writes nothing.
 */
export function reorderElements(
  elements: readonly unknown[],
  orderedIds: readonly string[],
): unknown[] {
  const rank = new Map(orderedIds.map((id, i) => [id, i]));
  const rankOf = (element: unknown): number => {
    const id = idOf(element);
    return (id === undefined ? undefined : rank.get(id)) ?? Number.POSITIVE_INFINITY;
  };
  const next = elements
    .map((element, index) => ({ element, index, rank: rankOf(element) }))
    .toSorted((a, b) => a.rank - b.rank || a.index - b.index)
    .map(({ element }) => element);
  return next.every((element, i) => element === elements[i]) ? (elements as unknown[]) : next;
}

/** An element's authored `id`, if it has one. */
export function idOf(element: unknown): string | undefined {
  if (typeof element !== 'object' || element === null) return undefined;
  const id = (element as Record<string, unknown>)['id'];
  return typeof id === 'string' && id !== '' ? id : undefined;
}
