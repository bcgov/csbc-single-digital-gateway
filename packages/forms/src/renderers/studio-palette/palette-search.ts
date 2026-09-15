// Palette search (doc 189 rule 5). Pure, so the item, group and empty-state renderers agree on what matches.

/** The palette form's data key the search Control writes. */
export const PALETTE_SEARCH_KEY = 'search';

/** What the search matches against: a PaletteItem's label and its authored `options.keywords`. */
export interface SearchableItem {
  readonly label: string;
  readonly options?: Record<string, unknown> | undefined;
}

/** The palette data's search text, trimmed and lower-cased; `''` when absent or not a string. */
export function searchQuery(data: unknown): string {
  if (typeof data !== 'object' || data === null) return '';
  const value = (data as Record<string, unknown>)[PALETTE_SEARCH_KEY];
  return typeof value === 'string' ? value.trim().toLocaleLowerCase() : '';
}

/**
 * Whether `item` matches a query from `searchQuery`: always for `''`, else when its label or any string keyword
 * contains the query, ignoring case. Keywords that are not an array of strings are ignored.
 */
export function matchesSearch(item: SearchableItem, query: string): boolean {
  if (query === '') return true;
  const keywords = item.options?.['keywords'];
  // Authored uischema is unchecked JSON, so even the label is read only when it is a string.
  const texts: unknown[] = [item.label, ...(Array.isArray(keywords) ? keywords : [])];
  return texts.some((text) => typeof text === 'string' && text.toLocaleLowerCase().includes(query));
}
