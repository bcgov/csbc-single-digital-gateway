import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { JsonForms } from '@jsonforms/react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import {
  GeoDataProvider,
  type GeoCountryOption,
  type GeoData,
  type GeoStateOption,
} from '../src/jsonforms-renderers/controls/address/geo-context';
import { withFill } from '../src/jsonforms-renderers/controls/address/address-control';
import {
  emptyAddress,
  readAddressFieldsOptions,
} from '../src/jsonforms-renderers/controls/address/model';
import { renderers } from '../src/jsonforms-renderers';

// MDD skeleton — feature 170 (address read-only country / province defaults).
// Mirrors the harness in address-control.test.tsx: `withGeo` toggles GeoBody vs PlainBody, which is
// exactly the pair of render paths a per-sub-field lock must cover.

const COUNTRIES: GeoCountryOption[] = [
  { id: 39, name: 'Canada', iso2: 'CA', hasStates: true, hasPostal: true },
  { id: 233, name: 'United States', iso2: 'US', hasStates: true, hasPostal: true },
];
const STATES: Record<number, GeoStateOption[]> = {
  39: [{ id: 3, name: 'British Columbia', type: 'province', iso2: 'BC' }],
  233: [{ id: 1, name: 'California', type: 'state', iso2: 'CA' }],
};

const geoStub: GeoData = {
  useCountries: () => ({ data: COUNTRIES, isLoading: false }),
  useStates: (countryId) => ({
    data: countryId === undefined ? undefined : (STATES[countryId] ?? []),
    isLoading: false,
  }),
};

/** Schema carrying the author-set defaults the lock pins to (feature 153 shape). */
const schemaWithDefaults: JsonSchema = {
  type: 'object',
  properties: {
    addr: {
      type: 'object',
      title: 'Applicant address',
      default: { country: 'Canada', province: 'British Columbia' },
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

/** Build a uischema with the nested per-sub-field option bags (doc 170 wire format). */
function uischemaWithLocks(fields: Record<string, { readOnly?: boolean }>): UISchemaElement {
  return {
    type: 'Control',
    scope: '#/properties/addr',
    options: { format: 'address', fields },
  } as UISchemaElement;
}

function renderControl(
  uischema: UISchemaElement,
  data: Record<string, unknown>,
  withGeo: boolean,
  schema: JsonSchema = schemaWithDefaults,
) {
  const form = <JsonForms schema={schema} uischema={uischema} data={data} renderers={renderers} />;
  return render(withGeo ? <GeoDataProvider value={geoStub}>{form}</GeoDataProvider> : form);
}

describe('Address per-sub-field options — normalizing reader (rule 5, "normalize before use")', () => {
  it('reads readOnly as false when the field has no options bag at all', () => {
    const fields = readAddressFieldsOptions({ format: 'address' });
    expect(fields.country.readOnly).toBe(false);
    expect(fields.province.readOnly).toBe(false);
    expect(fields.city.readOnly).toBe(false);
  });

  it('reads readOnly as false when the bag exists but omits the key', () => {
    const fields = readAddressFieldsOptions({ fields: { country: { readOnly: true } } });
    expect(fields.country.readOnly).toBe(true);
    expect(fields.province.readOnly).toBe(false);
  });

  it('coerces a hand-edited non-object `fields` blob to no locks instead of throwing', () => {
    for (const blob of ['nope', 42, null, [], true]) {
      const fields = readAddressFieldsOptions({ fields: blob });
      expect(fields.country.readOnly).toBe(false);
      expect(fields.province.readOnly).toBe(false);
    }
    // A completely non-object options value must degrade the same way.
    expect(readAddressFieldsOptions(undefined).country.readOnly).toBe(false);
    expect(readAddressFieldsOptions(null).country.readOnly).toBe(false);
    expect(readAddressFieldsOptions('address').country.readOnly).toBe(false);
  });

  it('coerces a non-boolean readOnly value to false instead of throwing', () => {
    for (const truthy of ['true', 1, {}, []]) {
      const fields = readAddressFieldsOptions({ fields: { country: { readOnly: truthy } } });
      expect(fields.country.readOnly).toBe(false);
    }
    expect(readAddressFieldsOptions({ fields: { country: 'locked' } }).country.readOnly).toBe(
      false,
    );
  });

  it('ignores keys that are not address sub-fields', () => {
    const fields = readAddressFieldsOptions({
      fields: { country: { readOnly: true }, nonsense: { readOnly: true } },
    });
    expect(Object.keys(fields).sort()).toEqual(
      ['address_one', 'address_two', 'city', 'country', 'postal_code', 'province'].sort(),
    );
    expect(fields.country.readOnly).toBe(true);
  });

  it('always returns a definite boolean for every sub-field', () => {
    const fields = readAddressFieldsOptions({});
    for (const value of Object.values(fields)) {
      expect(typeof value.readOnly).toBe('boolean');
    }
  });
});

describe('AddressControl — country lock (rule 7, both render bodies)', () => {
  it('renders the country input read-only in GeoBody when country.readOnly is true', () => {
    renderControl(uischemaWithLocks({ country: { readOnly: true } }), { addr: {} }, true);
    const country = screen.getByLabelText('Country');
    expect(country).toHaveAttribute('readonly');
    // Read-only, NOT disabled — it must stay in the tab order so AT reaches and announces the value.
    expect(country).not.toBeDisabled();
  });

  it('renders the country input read-only in PlainBody when country.readOnly is true', () => {
    renderControl(uischemaWithLocks({ country: { readOnly: true } }), { addr: {} }, false);
    const country = screen.getByLabelText('Country');
    expect(country).toHaveAttribute('readonly');
    expect(country).not.toBeDisabled();
  });

  it('refuses typed input on a locked country combobox (the root prop alone does not)', async () => {
    const user = userEvent.setup();
    renderControl(
      uischemaWithLocks({ country: { readOnly: true } }),
      { addr: { country: 'Canada' } },
      true,
    );
    const country = screen.getByLabelText('Country');
    await user.type(country, 'XYZ');
    expect(country).toHaveValue('Canada');
  });

  it('refuses typed input on a locked country in PlainBody', async () => {
    const user = userEvent.setup();
    renderControl(
      uischemaWithLocks({ country: { readOnly: true } }),
      { addr: { country: 'Canada' } },
      false,
    );
    const country = screen.getByLabelText('Country');
    await user.type(country, 'XYZ');
    expect(country).toHaveValue('Canada');
  });

  it('shows the default value in the locked country input rather than hiding the field', () => {
    renderControl(
      uischemaWithLocks({ country: { readOnly: true } }),
      { addr: { country: 'Canada' } },
      true,
    );
    const country = screen.getByLabelText('Country');
    expect(country).toBeInTheDocument();
    expect(country).toHaveValue('Canada');
  });

  it('offers no clear (✕) affordance on a locked country input', () => {
    renderControl(
      uischemaWithLocks({ country: { readOnly: true } }),
      { addr: { country: 'Canada' } },
      false,
    );
    expect(screen.queryByRole('button', { name: 'Clear' })).not.toBeInTheDocument();
  });

  it('leaves the country editable when country.readOnly is absent', () => {
    renderControl(uischemaWithLocks({}), { addr: { country: 'Canada' } }, true);
    expect(screen.getByLabelText('Country')).not.toHaveAttribute('readonly');
  });
});

describe('AddressControl — province lock (rule 7, both render bodies)', () => {
  it('renders the province input read-only in GeoBody when province.readOnly is true', () => {
    renderControl(
      uischemaWithLocks({ province: { readOnly: true } }),
      { addr: { country: 'Canada', province: 'British Columbia' } },
      true,
    );
    const province = screen.getByLabelText('Province');
    expect(province).toHaveAttribute('readonly');
    expect(province).not.toBeDisabled();
  });

  it('renders the province input read-only in PlainBody when province.readOnly is true', () => {
    renderControl(
      uischemaWithLocks({ province: { readOnly: true } }),
      { addr: { province: 'British Columbia' } },
      false,
    );
    const province = screen.getByLabelText('State / Province');
    expect(province).toHaveAttribute('readonly');
    expect(province).not.toBeDisabled();
  });

  it('locks the province free-text input for a country with no subdivisions', () => {
    // No geo provider → PlainBody renders province as free text; the lock must still apply.
    renderControl(uischemaWithLocks({ province: { readOnly: true } }), { addr: {} }, false);
    const province = screen.getByLabelText('State / Province');
    expect(province.tagName).toBe('INPUT');
    expect(province).toHaveAttribute('readonly');
  });

  it('leaves the province editable when province.readOnly is absent', () => {
    renderControl(uischemaWithLocks({}), { addr: { province: 'British Columbia' } }, false);
    expect(screen.getByLabelText('State / Province')).not.toHaveAttribute('readonly');
  });
});

describe('AddressControl — locks are independent (rule 6)', () => {
  it('locks province while leaving country editable', () => {
    renderControl(uischemaWithLocks({ province: { readOnly: true } }), { addr: {} }, false);
    expect(screen.getByLabelText('Country')).not.toHaveAttribute('readonly');
    expect(screen.getByLabelText('State / Province')).toHaveAttribute('readonly');
  });

  it('locks country while leaving province editable', () => {
    renderControl(uischemaWithLocks({ country: { readOnly: true } }), { addr: {} }, false);
    expect(screen.getByLabelText('Country')).toHaveAttribute('readonly');
    expect(screen.getByLabelText('State / Province')).not.toHaveAttribute('readonly');
  });

  it('leaves the four non-lockable sub-fields editable when both locks are on', () => {
    renderControl(
      uischemaWithLocks({ country: { readOnly: true }, province: { readOnly: true } }),
      { addr: {} },
      false,
    );
    expect(screen.getByLabelText('Address line 1')).not.toHaveAttribute('readonly');
    expect(screen.getByLabelText('Address line 2')).not.toHaveAttribute('readonly');
    expect(screen.getByLabelText('City')).not.toHaveAttribute('readonly');
    expect(screen.getByLabelText('Postal code')).not.toHaveAttribute('readonly');
  });
});

describe('AddressControl — seeding is unchanged by a lock (rule 8)', () => {
  it('still seeds schema.default once into an empty locked field', async () => {
    renderControl(
      uischemaWithLocks({ country: { readOnly: true }, province: { readOnly: true } }),
      { addr: {} },
      true,
    );
    // The seed is deferred a macrotask, so wait for it to land in the rendered input.
    await waitFor(() => expect(screen.getByLabelText('Country')).toHaveValue('Canada'));
    expect(screen.getByLabelText('Province')).toHaveValue('British Columbia');
  });

  it('does not re-seed over a resumed draft value when the field is locked', async () => {
    renderControl(
      uischemaWithLocks({ country: { readOnly: true } }),
      { addr: { country: 'United States', city: 'Sacramento' } },
      true,
    );
    // A non-empty (resumed) address must never be clobbered by the default, lock or no lock.
    await waitFor(() => expect(screen.getByLabelText('City')).toHaveValue('Sacramento'));
    expect(screen.getByLabelText('Country')).toHaveValue('United States');
  });
});

describe('withFill — geocoder autofill respects locks (edge case, feature 154)', () => {
  const locks = (fields: Record<string, { readOnly?: boolean }>) =>
    readAddressFieldsOptions({ fields });

  it('does not overwrite a locked country when autofill supplies a different one', () => {
    const prev = { ...emptyAddress(), country: 'Canada' };
    const next = withFill(
      prev,
      { country: 'United States', city: 'Seattle' },
      locks({ country: { readOnly: true } }),
    );
    expect(next.country).toBe('Canada');
  });

  it('does not overwrite a locked province when autofill supplies a different one', () => {
    const prev = { ...emptyAddress(), province: 'British Columbia' };
    const next = withFill(
      prev,
      { province: 'California' },
      locks({ province: { readOnly: true } }),
    );
    expect(next.province).toBe('British Columbia');
  });

  it('still applies autofill to the unlocked sub-fields in the same patch', () => {
    const prev = { ...emptyAddress(), country: 'Canada' };
    const next = withFill(
      prev,
      { country: 'United States', address_one: '1 Main St', city: 'Seattle' },
      locks({ country: { readOnly: true } }),
    );
    expect(next.country).toBe('Canada');
    expect(next.address_one).toBe('1 Main St');
    expect(next.city).toBe('Seattle');
  });

  it('applies every field when nothing is locked', () => {
    const next = withFill(emptyAddress(), { country: 'Canada', city: 'Victoria' }, locks({}));
    expect(next.country).toBe('Canada');
    expect(next.city).toBe('Victoria');
  });
});
