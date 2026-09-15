import { describe, expect, it } from 'vitest';
import {
  matchesSearch,
  PALETTE_SEARCH_KEY,
  searchQuery,
} from '../src/renderers/studio-palette/palette-search';

// Doc 189 rule 5 — palette search matching.

const item = (label: string, keywords?: unknown) => ({
  label,
  ...(keywords === undefined ? {} : { options: { keywords } }),
});

describe('searchQuery', () => {
  it('reads the search key from the palette data, trimmed and lower-cased', () => {
    expect(PALETTE_SEARCH_KEY).toBe('search');
    expect(searchQuery({ search: '  ComBo ' })).toBe('combo');
  });

  it('is empty for missing, non-object or non-string search data', () => {
    for (const data of [undefined, null, 'combo', {}, { search: 5 }]) {
      expect(searchQuery(data), JSON.stringify(data)).toBe('');
    }
  });
});

describe('matchesSearch', () => {
  it('matches every item for an empty query', () => {
    expect(matchesSearch(item('Heading'), '')).toBe(true);
  });

  it('matches a label containing the query, ignoring case', () => {
    expect(matchesSearch(item('Radio group'), 'group')).toBe(true);
    expect(matchesSearch(item('Radio group'), 'radio g')).toBe(true);
    expect(matchesSearch(item('Radio group'), 'check')).toBe(false);
  });

  it('matches a string keyword and ignores non-string or non-array keywords', () => {
    expect(matchesSearch(item('Combobox', ['select', 'Dropdown']), 'dropdown')).toBe(true);
    expect(matchesSearch(item('Combobox', [5, null]), '5')).toBe(false);
    expect(matchesSearch(item('Combobox', 'select'), 'select')).toBe(false);
  });
});
