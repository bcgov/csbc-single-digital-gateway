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
}

/** The result shape the app's data hooks must return (a subset of a TanStack Query result). */
export interface GeoQueryResult<T> {
  data: T | undefined;
  isLoading: boolean;
}

/**
 * The geo data port an app provides. Both members are React **hooks** (called unconditionally by the
 * control), so the app can back them with TanStack Query. `useStates(undefined)` must be a no-op
 * (disabled) query so the control can call it before a country is chosen.
 */
export interface GeoData {
  useCountries(): GeoQueryResult<GeoCountryOption[]>;
  useStates(countryId: number | undefined): GeoQueryResult<GeoStateOption[]>;
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
