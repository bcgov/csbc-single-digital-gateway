/**
 * URL-synced list controls (initiative `staff-list-query`). A single source of truth for the
 * `?page=&sort=&order=&q=` search params shared by every staff list surface (services, service
 * agreements, submissions, teams). `useListSearch` binds those params to TanStack Router search
 * state and derives the API `limit`/`offset` window; `listSearchValidator` is the route's
 * `validateSearch` so the params are typed, defaulted, and refresh-safe.
 */
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useCallback, useMemo } from 'react';

export type SortOrder = 'asc' | 'desc';

/** The paginated list envelope every staff list API returns. */
export interface Paginated<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * The raw, URL-facing list search params. All fields are optional so links to the list route need
 * not supply them (the validator fills defaults); `q` is omitted (not `''`) to keep clean URLs.
 */
export interface ListSearchParams<S extends string> {
  page?: number;
  sort?: S;
  order?: SortOrder;
  q?: string;
}

/**
 * A `validateSearch` factory: coerces unknown search input into typed, bounded list params. `sorts`
 * is the surface's allowed sort keys; unknown/out-of-range values fall back to the defaults.
 */
export function listSearchValidator<S extends string>(
  sorts: readonly S[],
  defaults: { sort: S; order?: SortOrder },
) {
  return (search: Record<string, unknown>): ListSearchParams<S> => {
    const rawPage = Number(search.page);
    const page = Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1;
    const sort = sorts.includes(search.sort as S) ? (search.sort as S) : defaults.sort;
    const order: SortOrder = search.order === 'asc' ? 'asc' : (defaults.order ?? 'desc');
    const q = typeof search.q === 'string' && search.q !== '' ? search.q : undefined;
    // Omit `q` entirely when empty (exactOptionalPropertyTypes: no explicit `undefined`).
    return q !== undefined ? { page, sort, order, q } : { page, sort, order };
  };
}

export interface UseListSearch<S extends string> {
  /** Current 1-based page. */
  page: number;
  sort: S;
  order: SortOrder;
  /** Current search term (`''` when unset). */
  q: string;
  /** API window derived from `page` + `limit`. */
  limit: number;
  offset: number;
  /** Jump to a 1-based page (clamped ≥ 1). */
  setPage: (page: number) => void;
  /** Sort by a column; clicking the active column flips order, a new column resets to `desc`. */
  setSort: (sort: S) => void;
  /** Set the search term (resets to page 1); `''` clears it from the URL. */
  setQ: (q: string) => void;
}

/**
 * Read + write the list controls from the current route's search params. The route MUST supply a
 * matching `validateSearch` (see `listSearchValidator`). Writes use `replace` so paging/searching
 * doesn't spam the history stack.
 */
export function useListSearch<S extends string>(limit = 20): UseListSearch<S> {
  // `useSearch`/`useNavigate` are route-typed; this hook is shared across every list route, so we
  // read/write search through minimal loose signatures (still fully typed via `ListSearchParams`,
  // never `any`). The route's `validateSearch` remains the source of truth for defaults/coercion.
  const search = (useSearch as (opts: { strict: false }) => ListSearchParams<S>)({ strict: false });
  const navigate = useNavigate() as unknown as (opts: {
    search: (prev: Record<string, unknown>) => Record<string, unknown>;
    replace?: boolean;
  }) => void;
  const page = search.page ?? 1;
  const sort = (search.sort ?? '') as S;
  const order = search.order ?? 'desc';
  const q = search.q ?? '';

  const update = useCallback(
    (next: ListSearchParams<S>) => {
      navigate({
        search: (prev) => {
          const merged: Record<string, unknown> = { ...prev, ...next };
          // Drop an empty `q` so it never lingers in the URL.
          if (merged.q === '' || merged.q === undefined) delete merged.q;
          return merged;
        },
        replace: true,
      });
    },
    [navigate],
  );

  const setPage = useCallback(
    (nextPage: number) => update({ page: Math.max(1, nextPage) }),
    [update],
  );
  const setSort = useCallback(
    (nextSort: S) =>
      update({
        sort: nextSort,
        order: nextSort === sort && order === 'desc' ? 'asc' : 'desc',
        page: 1,
      }),
    [update, sort, order],
  );
  const setQ = useCallback((nextQ: string) => update({ q: nextQ, page: 1 }), [update]);

  return useMemo(
    () => ({
      page,
      sort,
      order,
      q,
      limit,
      offset: (page - 1) * limit,
      setPage,
      setSort,
      setQ,
    }),
    [page, sort, order, q, limit, setPage, setSort, setQ],
  );
}
