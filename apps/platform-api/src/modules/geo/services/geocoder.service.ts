import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { Env } from '../../../config/env.schema';
import type { AddressSearchRegion, AddressSuggestion } from '../dtos/geo.dtos';

/** How many suggestions the typeahead requests per keystroke. */
const MAX_RESULTS = 6;

const asString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

/**
 * Coerce ONE BC OLS geocoder feature into a normalized {@link AddressSuggestion}, or `null` when it
 * carries nothing useful. Pure + exported for unit testing. Defensive: the upstream blob is untrusted,
 * so every field is coerced and a missing structured street falls back to the `fullAddress` head.
 */
export function normalizeBcFeature(feature: unknown): AddressSuggestion | null {
  const props =
    feature && typeof feature === 'object' && 'properties' in feature
      ? ((feature as { properties?: unknown }).properties as Record<string, unknown> | undefined)
      : undefined;
  if (!props) {
    return null;
  }
  const fullAddress = asString(props.fullAddress);
  const structuredStreet = [props.civicNumber, props.streetName, props.streetType]
    .map(asString)
    .filter(Boolean)
    .join(' ')
    .trim();
  const [headBeforeComma, secondPart] = fullAddress.split(',').map((part) => part.trim());
  const streetAddress = structuredStreet || headBeforeComma || '';
  const city = asString(props.localityName) || secondPart || '';
  const provinceCode = asString(props.provinceCode) || 'BC';
  const label = fullAddress || [streetAddress, city].filter(Boolean).join(', ');
  if (label === '' && streetAddress === '') {
    return null;
  }
  return { label, streetAddress, city, provinceCode };
}

/** A regional address-search provider: turns a query into normalized suggestions. */
interface GeocoderProvider {
  search(query: string, maxResults: number): Promise<AddressSuggestion[]>;
}

/** BC OLS Physical Address Geocoder provider (feature 154). The API key stays in this process. */
class BcGeocoderProvider implements GeocoderProvider {
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
    private readonly logger: Logger,
  ) {}

  async search(query: string, maxResults: number): Promise<AddressSuggestion[]> {
    const url = new URL('/addresses.json', this.baseUrl);
    url.searchParams.set('addressString', query);
    url.searchParams.set('autoComplete', 'true');
    url.searchParams.set('maxResults', String(maxResults));
    url.searchParams.set('provinceCode', 'BC');
    url.searchParams.set('brief', 'true');
    const response = await fetch(url, { headers: { apikey: this.apiKey } });
    if (!response.ok) {
      this.logger.warn(`BC geocoder responded ${response.status}`);
      return [];
    }
    const body: unknown = await response.json();
    const features =
      body && typeof body === 'object' && Array.isArray((body as { features?: unknown }).features)
        ? (body as { features: unknown[] }).features
        : [];
    return features
      .map(normalizeBcFeature)
      .filter((item): item is AddressSuggestion => item !== null);
  }
}

/**
 * Regional address search (feature 154). A **registry** keyed by `"<COUNTRY_ISO2>:<PROVINCE_ISO2>"`
 * maps a region to a geocoder provider; a region is *available* only when its provider is registered
 * AND configured. v1 registers `CA:BC` iff `BC_GEOCODER_API_KEY` is set. Adding a region = registering
 * another provider — no controller/route change.
 */
@Injectable()
export class GeocoderService {
  private readonly logger = new Logger(GeocoderService.name);
  private readonly providers = new Map<string, GeocoderProvider>();

  constructor(config: ConfigService<Env, true>) {
    const apiKey = config.get('BC_GEOCODER_API_KEY', { infer: true });
    const baseUrl = config.get('BC_GEOCODER_URL', { infer: true });
    if (apiKey) {
      this.providers.set('CA:BC', new BcGeocoderProvider(baseUrl, apiKey, this.logger));
    }
  }

  private static key(country: string, province: string): string {
    return `${country.toUpperCase()}:${province.toUpperCase()}`;
  }

  /** The (country, province) ISO2 pairs the server can actually search. Empty when unconfigured. */
  regions(): AddressSearchRegion[] {
    return [...this.providers.keys()].map((key) => {
      const [country = '', province = ''] = key.split(':');
      return { country, province };
    });
  }

  /**
   * Search a region for `query`. Unknown/unconfigured region or a blank query → `[]`. Upstream errors
   * are swallowed to `[]` (typing must never 5xx) and logged server-side.
   */
  async search(country: string, province: string, query: string): Promise<AddressSuggestion[]> {
    const provider = this.providers.get(GeocoderService.key(country, province));
    if (!provider || query.trim() === '') {
      return [];
    }
    try {
      return await provider.search(query.trim(), MAX_RESULTS);
    } catch (error) {
      this.logger.error(
        `geocoder search failed (${country}/${province}): ${error instanceof Error ? error.message : 'unknown'}`,
      );
      return [];
    }
  }
}
