import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { JsonForms } from '@jsonforms/react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { withCountry } from '../src/jsonforms-renderers/controls/address/address-control';
import {
  GeoDataProvider,
  type GeoCountryOption,
  type GeoData,
  type GeoStateOption,
} from '../src/jsonforms-renderers/controls/address/geo-context';
import { emptyAddress } from '../src/jsonforms-renderers/controls/address/model';
import { renderers } from '../src/jsonforms-renderers';

const schema: JsonSchema = {
  type: 'object',
  properties: {
    addr: {
      type: 'object',
      title: 'Applicant address',
      properties: {
        country: { type: 'string' },
        address_one: { type: 'string' },
        address_two: { type: 'string' },
        city: { type: 'string' },
        province: { type: 'string' },
        postal_code: { type: 'string' },
      },
    },
  },
};

const uischema: UISchemaElement = {
  type: 'Control',
  scope: '#/properties/addr',
  options: { format: 'address' },
} as UISchemaElement;

const COUNTRIES: GeoCountryOption[] = [
  { id: 233, name: 'United States', iso2: 'US', hasStates: true, hasPostal: true },
  { id: 39, name: 'Canada', iso2: 'CA', hasStates: true, hasPostal: true },
  { id: 999, name: 'Nopostalia', iso2: 'ZZ', hasStates: false, hasPostal: false },
];
const STATES: Record<number, GeoStateOption[]> = {
  233: [
    { id: 1, name: 'California', type: 'state' },
    { id: 2, name: 'Texas', type: 'state' },
  ],
  39: [{ id: 3, name: 'British Columbia', type: 'province' }],
};

const geoStub: GeoData = {
  useCountries: () => ({ data: COUNTRIES, isLoading: false }),
  useStates: (countryId) => ({
    data: countryId === undefined ? undefined : (STATES[countryId] ?? []),
    isLoading: false,
  }),
};

function renderControl(data: Record<string, unknown>, withGeo: boolean) {
  const form = <JsonForms schema={schema} uischema={uischema} data={data} renderers={renderers} />;
  return render(withGeo ? <GeoDataProvider value={geoStub}>{form}</GeoDataProvider> : form);
}

describe('withCountry', () => {
  it('sets the country and clears the province, keeping other fields', () => {
    const prev = {
      ...emptyAddress(),
      country: 'Canada',
      province: 'British Columbia',
      city: 'Victoria',
      postal_code: 'V8W 1A1',
    };
    const next = withCountry(prev, 'United States');
    expect(next.country).toBe('United States');
    expect(next.province).toBe('');
    expect(next.city).toBe('Victoria');
    expect(next.postal_code).toBe('V8W 1A1');
  });
});

describe('AddressControl', () => {
  it('renders free-text country + default labels when no geo provider is present', () => {
    renderControl({ addr: {} }, false);
    const country = screen.getByLabelText('Country');
    expect(country.tagName).toBe('INPUT');
    expect(screen.getByText('State / Province')).toBeInTheDocument();
    expect(screen.getByText('Postal code')).toBeInTheDocument();
  });

  it('shows per-country labels (US → State / ZIP code) when geo is provided', () => {
    renderControl({ addr: { country: 'United States' } }, true);
    expect(screen.getByText('State')).toBeInTheDocument();
    expect(screen.getByText('ZIP code')).toBeInTheDocument();
    expect(screen.queryByText('State / Province')).not.toBeInTheDocument();
    expect(screen.queryByText('Postal code')).not.toBeInTheDocument();
  });

  it('renders a country combobox when geo is provided', () => {
    renderControl({ addr: {} }, true);
    expect(screen.getByPlaceholderText('Select a country')).toBeInTheDocument();
  });

  it('hides the postal field for a country with no postal system', () => {
    renderControl({ addr: { country: 'Nopostalia' } }, true);
    // hasPostal=false → no postal field at all; hasStates=false → province is a plain input.
    expect(screen.queryByText('Postal code')).not.toBeInTheDocument();
    const province = screen.getByLabelText('State / Province');
    expect(province.tagName).toBe('INPUT');
  });

  it('mounts without throwing for a states-bearing country (combobox render-safety)', () => {
    expect(() => renderControl({ addr: { country: 'Canada' } }, true)).not.toThrow();
    expect(screen.getByText('Province')).toBeInTheDocument();
  });

  it('filters the country options as the user types (regression: manual .map is not filtered)', async () => {
    const user = userEvent.setup();
    renderControl({ addr: {} }, true);
    const input = screen.getByPlaceholderText('Select a country');
    await user.click(input);
    await user.type(input, 'can');
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Canada' })).toBeInTheDocument();
    });
    expect(screen.queryByRole('option', { name: 'United States' })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Nopostalia' })).not.toBeInTheDocument();
  });
});
