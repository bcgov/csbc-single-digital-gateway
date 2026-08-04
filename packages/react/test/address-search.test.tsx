import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { JsonForms } from '@jsonforms/react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  parseSuggestion,
  regionSupported,
  suggestionToPatch,
} from '../src/jsonforms-renderers/controls/address/address-search';
import type { AddressSuggestion } from '../src/jsonforms-renderers/controls/address/geo-context';
import {
  GeoDataProvider,
  type GeoCountryOption,
  type GeoData,
  type GeoStateOption,
} from '../src/jsonforms-renderers/controls/address/geo-context';
import { renderers } from '../src/jsonforms-renderers';

describe('suggestionToPatch', () => {
  it('maps a suggestion to the line-1 + city patch (no postal)', () => {
    expect(
      suggestionToPatch({
        label: '1012 Douglas St, Victoria, BC',
        streetAddress: '1012 Douglas St',
        city: 'Victoria',
        provinceCode: 'BC',
      }),
    ).toEqual({ address_one: '1012 Douglas St', city: 'Victoria' });
  });
});

describe('parseSuggestion (selected value renders the label, not raw JSON)', () => {
  const suggestion: AddressSuggestion = {
    label: '1012 Douglas St, Victoria, BC',
    streetAddress: '1012 Douglas St',
    city: 'Victoria',
    provinceCode: 'BC',
  };

  it('round-trips an encoded option value back to the suggestion + its human label', () => {
    const encoded = JSON.stringify(suggestion);
    const parsed = parseSuggestion(encoded);
    expect(parsed).toEqual(suggestion);
    // The display uses `.label` (readable) rather than the encoded value (JSON).
    expect(parsed?.label).toBe('1012 Douglas St, Victoria, BC');
    expect(parsed?.label).not.toContain('{');
  });

  it('returns null for malformed or non-suggestion values', () => {
    expect(parseSuggestion('not json')).toBeNull();
    expect(parseSuggestion('"a string"')).toBeNull();
    expect(parseSuggestion('{"nolabel":true}')).toBeNull();
  });
});

describe('regionSupported', () => {
  const regions = [{ country: 'CA', province: 'BC' }];
  it('matches the configured region (case-insensitive)', () => {
    expect(regionSupported(regions, 'CA', 'BC')).toBe(true);
    expect(regionSupported(regions, 'ca', 'bc')).toBe(true);
  });
  it('rejects other regions and missing data', () => {
    expect(regionSupported(regions, 'CA', 'ON')).toBe(false);
    expect(regionSupported(regions, 'US', 'BC')).toBe(false);
    expect(regionSupported(regions, 'CA', null)).toBe(false);
    expect(regionSupported(undefined, 'CA', 'BC')).toBe(false);
  });
});

const COUNTRIES: GeoCountryOption[] = [
  { id: 39, name: 'Canada', iso2: 'CA', hasStates: true, hasPostal: true },
];
const STATES: Record<number, GeoStateOption[]> = {
  39: [
    { id: 3, name: 'British Columbia', type: 'province', iso2: 'BC' },
    { id: 4, name: 'Ontario', type: 'province', iso2: 'ON' },
  ],
};

const baseGeo: Omit<GeoData, 'searchAddresses' | 'useAddressSearchRegions'> = {
  useCountries: () => ({ data: COUNTRIES, isLoading: false }),
  useStates: (id) => ({
    data: id === undefined ? undefined : (STATES[id] ?? []),
    isLoading: false,
  }),
};

const geoWithSearch: GeoData = {
  ...baseGeo,
  useAddressSearchRegions: () => ({ data: [{ country: 'CA', province: 'BC' }], isLoading: false }),
  searchAddresses: vi.fn(async () => []),
};

const schema: JsonSchema = {
  type: 'object',
  properties: { addr: { type: 'object', properties: { country: {}, province: {} } } },
};
const uischema: UISchemaElement = {
  type: 'Control',
  scope: '#/properties/addr',
  options: { format: 'address' },
} as UISchemaElement;

function renderControl(data: Record<string, unknown>, geo: GeoData) {
  return render(
    <GeoDataProvider value={geo}>
      <JsonForms schema={schema} uischema={uischema} data={data} renderers={renderers} />
    </GeoDataProvider>,
  );
}

describe('AddressSearchField gating', () => {
  it('shows the search field for Canada + British Columbia when the region is configured', () => {
    renderControl({ addr: { country: 'Canada', province: 'British Columbia' } }, geoWithSearch);
    expect(screen.getByText('Search for your address')).toBeInTheDocument();
  });

  it('hides the search field for a non-supported province (Ontario)', () => {
    renderControl({ addr: { country: 'Canada', province: 'Ontario' } }, geoWithSearch);
    expect(screen.queryByText('Search for your address')).not.toBeInTheDocument();
  });

  it('hides the search field when the app provides no address-search capability', () => {
    renderControl(
      { addr: { country: 'Canada', province: 'British Columbia' } },
      baseGeo as GeoData,
    );
    expect(screen.queryByText('Search for your address')).not.toBeInTheDocument();
  });
});
