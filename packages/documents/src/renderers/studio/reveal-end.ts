/**
 * Scrolls the table holding `from` to its right end once the edit has rendered (doc 270): a column added past the
 * visible width would otherwise appear hidden under the pinned Add column. Two frames, so the new column has laid out.
 */
export function revealTableEnd(from: HTMLElement): void {
  const container = from.closest<HTMLElement>('[data-slot="table-container"]');
  if (container === null) return;
  requestAnimationFrame(() =>
    requestAnimationFrame(() => container.scrollTo({ left: container.scrollWidth })),
  );
}
