import { describe, expect, it, vi, beforeEach } from 'vitest';
import { listSearchValidator, useListSearch } from '@/lib/list-search';
import { renderHook, act } from '@testing-library/react';

const validate = listSearchValidator(['title', 'updated', 'status'] as const, {
  sort: 'updated',
  order: 'desc',
});

describe('listSearchValidator', () => {
  it('applies defaults for empty search', () => {
    expect(validate({})).toEqual({ page: 1, sort: 'updated', order: 'desc' });
  });

  it('coerces and clamps page (≥ 1, integer)', () => {
    expect(validate({ page: '3' }).page).toBe(3);
    expect(validate({ page: 0 }).page).toBe(1);
    expect(validate({ page: -5 }).page).toBe(1);
    expect(validate({ page: 2.9 }).page).toBe(2);
    expect(validate({ page: 'nope' }).page).toBe(1);
  });

  it('falls back to the default sort for an unknown column', () => {
    expect(validate({ sort: 'bogus' }).sort).toBe('updated');
    expect(validate({ sort: 'title' }).sort).toBe('title');
  });

  it('only accepts asc/desc for order (else the default)', () => {
    expect(validate({ order: 'asc' }).order).toBe('asc');
    expect(validate({ order: 'sideways' }).order).toBe('desc');
  });

  it('falls back to desc for order when defaults.order is not specified', () => {
    const validateNoOrder = listSearchValidator(['title', 'updated', 'status'] as const, {
      sort: 'updated',
    });
    expect(validateNoOrder({ order: 'sideways' }).order).toBe('desc');
  });

  it('omits an empty/non-string q entirely', () => {
    expect('q' in validate({ q: '' })).toBe(false);
    expect('q' in validate({ q: 5 })).toBe(false);
    expect(validate({ q: 'permit' }).q).toBe('permit');
  });
});

let mockSearchValue: any = {};
const mockNavigate = vi.fn();

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    useSearch: () => mockSearchValue,
    useNavigate: () => mockNavigate,
  };
});

describe('useListSearch Unit Test', () => {
  beforeEach(() => {
    mockSearchValue = {};
    mockNavigate.mockClear();
  });

  it('uses default options when no options are provided', () => {
    const { result } = renderHook(() => useListSearch());
    expect(result.current.page).toBe(1);
    expect(result.current.sort).toBe('');
    expect(result.current.order).toBe('desc');
    expect(result.current.q).toBe('');
    expect(result.current.limit).toBe(20);
    expect(result.current.offset).toBe(0);
  });

  it('uses custom options and search values', () => {
    mockSearchValue = { page: 3, sort: 'name', order: 'asc', q: 'search-term' };
    const { result } = renderHook(() =>
      useListSearch({ limit: 10, defaultSort: 'title', defaultOrder: 'desc' }),
    );
    expect(result.current.page).toBe(3);
    expect(result.current.sort).toBe('name');
    expect(result.current.order).toBe('asc');
    expect(result.current.q).toBe('search-term');
    expect(result.current.limit).toBe(10);
    expect(result.current.offset).toBe(20);
  });

  it('falls back to defaultSort when search.sort is missing', () => {
    const { result } = renderHook(() => useListSearch({ defaultSort: 'title' }));
    expect(result.current.sort).toBe('title');
  });

  it('triggers setPage and handles navigation', () => {
    const { result } = renderHook(() => useListSearch());

    act(() => {
      result.current.setPage(5);
    });

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    const searchFn = mockNavigate.mock.calls[0]![0]!.search;
    expect(searchFn({ existing: 'val' })).toEqual({ existing: 'val', page: 5 });
  });

  it('clamps nextPage in setPage to at least 1', () => {
    const { result } = renderHook(() => useListSearch());

    act(() => {
      result.current.setPage(0);
    });

    const searchFn = mockNavigate.mock.calls[0]![0]!.search;
    expect(searchFn({})).toEqual({ page: 1 });
  });

  it('triggers setSort for a new column', () => {
    mockSearchValue = { sort: 'title', order: 'desc' };
    const { result } = renderHook(() =>
      useListSearch<'title' | 'status'>({ defaultSort: 'title' }),
    );

    act(() => {
      result.current.setSort('status');
    });

    const searchFn = mockNavigate.mock.calls[0]![0]!.search;
    expect(searchFn({})).toEqual({ sort: 'status', order: 'desc', page: 1 });
  });

  it('triggers setSort for the active column to toggle desc to asc', () => {
    mockSearchValue = { sort: 'title', order: 'desc' };
    const { result } = renderHook(() => useListSearch({ defaultSort: 'title' }));

    act(() => {
      result.current.setSort('title');
    });

    const searchFn = mockNavigate.mock.calls[0]![0]!.search;
    expect(searchFn({})).toEqual({ sort: 'title', order: 'asc', page: 1 });
  });

  it('triggers setSort for the active column to toggle asc to desc', () => {
    mockSearchValue = { sort: 'title', order: 'asc' };
    const { result } = renderHook(() => useListSearch({ defaultSort: 'title' }));

    act(() => {
      result.current.setSort('title');
    });

    const searchFn = mockNavigate.mock.calls[0]![0]!.search;
    expect(searchFn({})).toEqual({ sort: 'title', order: 'desc', page: 1 });
  });

  it('triggers setQ to update query and reset page to 1', () => {
    const { result } = renderHook(() => useListSearch());

    act(() => {
      result.current.setQ('new-query');
    });

    const searchFn = mockNavigate.mock.calls[0]![0]!.search;
    expect(searchFn({})).toEqual({ q: 'new-query', page: 1 });
  });

  it('triggers setFilter to update filters and reset page to 1', () => {
    const { result } = renderHook(() => useListSearch());

    act(() => {
      result.current.setFilter({ status: 'active', unused: undefined });
    });

    const searchFn = mockNavigate.mock.calls[0]![0]!.search;
    expect(searchFn({})).toEqual({ status: 'active', page: 1 });
  });

  it('removes empty string and undefined keys during search updates', () => {
    const { result } = renderHook(() => useListSearch());

    act(() => {
      result.current.setPage(2);
    });

    const searchFn = mockNavigate.mock.calls[0]![0]!.search;
    const merged = searchFn({ keep: 'this', removeStr: '', removeUndef: undefined });
    expect(merged).toEqual({ keep: 'this', page: 2 });
  });
});
