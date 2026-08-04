/**
 * Browser client + geo-data port for the JSONForms Address field (feature 153). Talks to the BFF's
 * public `/v1/geo/*` endpoints (countries + states) on the same origin as the other data calls.
 * Reference data → cached forever (`staleTime: Infinity`). {@link appGeoData} is the {@link GeoData}
 * port the `@repo/react` Address control consumes via `GeoDataProvider`.
 */
import type {
  AddressSearchParams,
  AddressSearchRegion,
  AddressSuggestion,
  GeoCountryOption,
  GeoData,
  GeoStateOption,
} from '@repo/react/jsonforms-renderers';
import { queryOptions, useQuery } from '@tanstack/react-query';

import { BFF_ORIGIN } from '@/lib/bff';

async function fetchItems<T>(path: string): Promise<T[]> {
  const res = await fetch(`${BFF_ORIGIN}${path}`, { credentials: 'include' });
  if (!res.ok) {
    throw new Error(`GET ${path} failed: ${res.status}`);
  }
  return ((await res.json()) as { items: T[] }).items;
}

/** All countries (250), for the Address field's country combobox. */
export function countriesQueryOptions() {
  return queryOptions({
    queryKey: ['geo', 'countries'],
    queryFn: () => fetchItems<GeoCountryOption>('/v1/geo/countries'),
    staleTime: Number.POSITIVE_INFINITY,
  });
}

/** The states/provinces of one country. Disabled until a country id is known. */
export function statesQueryOptions(countryId: number | undefined) {
  return queryOptions({
    queryKey: ['geo', 'states', countryId ?? null],
    queryFn: () => fetchItems<GeoStateOption>(`/v1/geo/countries/${countryId}/states`),
    enabled: countryId !== undefined,
    staleTime: Number.POSITIVE_INFINITY,
  });
}

/** The (country, province) ISO2 regions the server can run address search for (feature 154). Empty
 * when no geocoder is configured → the Address control hides the "Search for your address" field. */
export function addressSearchRegionsQueryOptions() {
  return queryOptions({
    queryKey: ['geo', 'address-search', 'regions'],
    queryFn: () => fetchItems<AddressSearchRegion>('/v1/geo/address-search/regions'),
    staleTime: Number.POSITIVE_INFINITY,
  });
}

/** Query the region's geocoder for `query` (feature 154). Errors surface as `[]` (typing never breaks). */
async function searchAddresses(params: AddressSearchParams): Promise<AddressSuggestion[]> {
  const search = new URLSearchParams({
    country: params.country,
    province: params.province,
    q: params.query,
  });
  try {
    return await fetchItems<AddressSuggestion>(`/v1/geo/address-search?${search.toString()}`);
  } catch {
    return [];
  }
}

function useCountries() {
  const query = useQuery(countriesQueryOptions());
  return { data: query.data, isLoading: query.isLoading };
}

function useStates(countryId: number | undefined) {
  const query = useQuery(statesQueryOptions(countryId));
  return { data: query.data, isLoading: query.isLoading };
}

function useAddressSearchRegions() {
  const query = useQuery(addressSearchRegionsQueryOptions());
  return { data: query.data, isLoading: query.isLoading };
}

/** The geo-data port passed to `<GeoDataProvider>` — hooks so TanStack Query owns caching. */
export const appGeoData: GeoData = {
  useCountries,
  useStates,
  useAddressSearchRegions,
  searchAddresses,
};
