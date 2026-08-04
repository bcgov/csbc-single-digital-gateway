import { createContext, useContext, type ReactNode } from 'react';

/**
 * Geo data injection for the Address control (feature 153). `@repo/react` is API-agnostic — it must
 * not know any BFF URL — so the consuming app provides the country/state data through this context
 * (each app wires it to its own `/v1/geo/*` endpoint). The provider hands over two **hooks** so the
 * app owns caching (TanStack Query in both apps). When no provider is present, {@link useGeo} returns
 * `null` and the Address control degrades to plain text inputs (safe in unit tests / isolation).
 */

/** A country option — mirrors the `/v1/geo/countries` item shape (decoupled from the app DTO). */
export interface GeoCountryOption {
  id: number;
  name: string;
  iso2: string | null;
  /** The country has subdivisions → show a states dropdown (else free-text province). */
  hasStates: boolean;
  /** The country uses a postal code → show the postal field. */
  hasPostal: boolean;
}

/** A state / province option — mirrors the `/v1/geo/countries/:id/states` item shape. */
export interface GeoStateOption {
  id: number;
  name: string;
  type: string | null;
  /** ISO 3166-2 subdivision code (e.g. `BC`) — used to match address-search regions (feature 154). */
  iso2: string | null;
}

/** One address suggestion from a regional geocoder (feature 154). No postal code (BC OLS has none). */
export interface AddressSuggestion {
  /** Full address to show in the popup. */
  label: string;
  /** Street address → fills `address_one`. */
  streetAddress: string;
  /** Locality → fills `city`. */
  city: string;
  /** Province ISO code (e.g. `BC`). */
  provinceCode: string;
}

/** An ISO2 (country, province) pair the server can run address search for (feature 154). */
export interface AddressSearchRegion {
  country: string;
  province: string;
}

/** Params for a regional address search — ISO2 country + province + the typed query. */
export interface AddressSearchParams {
  country: string;
  province: string;
  query: string;
}

/** The result shape the app's data hooks must return (a subset of a TanStack Query result). */
export interface GeoQueryResult<T> {
  data: T | undefined;
  isLoading: boolean;
}

/**
 * The geo data port an app provides. `useCountries`/`useStates` are React **hooks** (called
 * unconditionally by the control), backed by TanStack Query; `useStates(undefined)` must be a no-op
 * (disabled) query so the control can call it before a country is chosen.
 *
 * The address-search members (feature 154) are **optional** — when absent the control never shows the
 * "Search for your address" field. `useAddressSearchRegions` reports the (country, province) ISO2
 * pairs the server can actually search (empty when unconfigured → field hidden); `searchAddresses` is
 * a plain async function (driven by the debounced typeahead, not a hook).
 */
export interface GeoData {
  useCountries(): GeoQueryResult<GeoCountryOption[]>;
  useStates(countryId: number | undefined): GeoQueryResult<GeoStateOption[]>;
  useAddressSearchRegions?(): GeoQueryResult<AddressSearchRegion[]>;
  searchAddresses?(params: AddressSearchParams): Promise<AddressSuggestion[]>;
}

const GeoContext = createContext<GeoData | null>(null);

/** Wrap a form host (citizen application page, builder preview) to supply the Address control's data. */
export function GeoDataProvider({ value, children }: { value: GeoData; children: ReactNode }) {
  return <GeoContext.Provider value={value}>{children}</GeoContext.Provider>;
}

/** The injected geo data, or `null` when no provider is present (→ Address control uses free text). */
export function useGeo(): GeoData | null {
  return useContext(GeoContext);
}
