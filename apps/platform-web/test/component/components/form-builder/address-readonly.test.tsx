import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { AddressDefaultsEditor } from '@/components/form-builder/address-defaults-editor';
import {
  createField,
  parseModel,
  serializeModel,
  type ControlNode,
  type FormModel,
} from '@/components/form-builder/model';
import { COUNTRIES as GEO_COUNTRIES } from '../../../support/fixtures';

const addressNode = (patch: Partial<ControlNode> = {}): ControlNode => ({
  ...createField('address'),
  key: 'applicant_address',
  label: 'Applicant address',
  ...patch,
});

const modelOf = (node: ControlNode): FormModel => ({ title: '', description: '', fields: [node] });

/** The serialized uischema options of the model's single control. */
function optionsOf(node: ControlNode): Record<string, unknown> {
  const { uischema } = serializeModel(modelOf(node));
  const element = (uischema as { elements: Array<Record<string, unknown>> }).elements[0];
  return (element?.options ?? {}) as Record<string, unknown>;
}

/** Round-trip a node through serialize → parse and hand back the parsed control. */
function roundTrip(node: ControlNode): ControlNode {
  return parseModel(serializeModel(modelOf(node))).fields[0] as ControlNode;
}

describe('Address codec — serialize locks to uischema options.fields (rule 5)', () => {
  it('Should emit options.fields.country.readOnly = true when the country lock is on', () => {
    const options = optionsOf(addressNode({ readOnlyCountry: true }));
    expect(options.fields).toEqual({ country: { readOnly: true } });
  });

  it('Should emit options.fields.province.readOnly = true when the province lock is on', () => {
    const options = optionsOf(addressNode({ readOnlyProvince: true }));
    expect(options.fields).toEqual({ province: { readOnly: true } });
  });

  it('Should omit a sub-field bag whose concerns are all at their defaults', () => {
    const options = optionsOf(addressNode({ readOnlyCountry: true, readOnlyProvince: false }));
    expect(options.fields).toEqual({ country: { readOnly: true } });
    expect((options.fields as Record<string, unknown>).province).toBeUndefined();
  });

  it('Should omit the fields key entirely when no sub-field has a lock', () => {
    const options = optionsOf(addressNode({ readOnlyCountry: false, readOnlyProvince: false }));
    expect(options.fields).toBeUndefined();
  });

  it('Should keep options.format = address alongside the fields bag', () => {
    const options = optionsOf(addressNode({ readOnlyCountry: true }));
    expect(options.format).toBe('address');
  });

  it('Should keep the default VALUES in schema.default, not in the options bag', () => {
    const node = addressNode({ readOnlyCountry: true });
    const { schema } = serializeModel(modelOf(node));
    const prop = (schema as { properties: Record<string, Record<string, unknown>> }).properties[
      'applicant_address'
    ];
    expect(prop?.default).toEqual({ country: 'Canada', province: 'British Columbia' });
    expect(optionsOf(node).default).toBeUndefined();
  });
});

describe('Address codec — parse locks back onto the flat model (rules 2, 5)', () => {
  it('Should parse options.fields.country.readOnly = true to readOnlyCountry = true', () => {
    expect(roundTrip(addressNode({ readOnlyCountry: true })).readOnlyCountry).toBe(true);
  });

  it('Should parse a missing fields key to readOnlyCountry = false and readOnlyProvince = false', () => {
    const parsed = roundTrip(addressNode({ readOnlyCountry: false, readOnlyProvince: false }));
    expect(parsed.readOnlyCountry).toBe(false);
    expect(parsed.readOnlyProvince).toBe(false);
  });

  it('Should yield definite booleans, never undefined, on a freshly parsed address node', () => {
    const parsed = roundTrip(addressNode({ readOnlyProvince: true }));
    expect(typeof parsed.readOnlyCountry).toBe('boolean');
    expect(typeof parsed.readOnlyProvince).toBe('boolean');
  });

  it('Should round-trip a locked address field through serialize → parse unchanged', () => {
    const parsed = roundTrip(addressNode({ readOnlyCountry: true, readOnlyProvince: true }));
    expect(parsed.readOnlyCountry).toBe(true);
    expect(parsed.readOnlyProvince).toBe(true);
    expect(parsed.defaultCountry).toBe('Canada');
    expect(parsed.defaultProvince).toBe('British Columbia');
  });

  it('Should drop the fields key from node.options so options round-trips to empty', () => {
    const parsed = roundTrip(addressNode({ readOnlyCountry: true, readOnlyProvince: true }));
    expect(parsed.options).toEqual({});
  });

  it('Should not strip a custom option named country/city/province from a non-address field', () => {
    // Guards the reason `fields` is namespaced: parseControl's drop-list is unconditional, so bare
    // sub-field names there would be stripped from EVERY field type's custom options.
    const text: ControlNode = {
      ...createField('text'),
      key: 'notes',
      label: 'Notes',
      options: { country: 'keep-me', city: 'keep-me-too', province: 'and-me' },
    };
    expect(roundTrip(text).options).toEqual({
      country: 'keep-me',
      city: 'keep-me-too',
      province: 'and-me',
    });
  });
});

// ── Inspector switches ───────────────────────────────────────────────────────────────────────────

const COUNTRIES = GEO_COUNTRIES.concat([
  { id: 233, name: 'United States', iso2: 'US', hasStates: true, hasPostal: true },
  { id: 75, name: 'France', iso2: 'FR', hasStates: false, hasPostal: true },
]);
const STATES = [{ id: 3, name: 'British Columbia', type: 'province', iso2: 'BC' }];

function renderEditor(node: ControlNode, queryOverrides?: (client: QueryClient) => void) {
  const onChange = vi.fn();
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Number.POSITIVE_INFINITY } },
  });
  queryClient.setQueryData(['geo', 'countries'], COUNTRIES);
  queryClient.setQueryData(['geo', 'states', 39], STATES);
  queryClient.setQueryData(['geo', 'states', 233], STATES);
  if (queryOverrides) {
    queryOverrides(queryClient);
  }
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  render(<AddressDefaultsEditor node={node} onChange={onChange} />, { wrapper });
  return { onChange };
}

// Base UI's Switch renders a <button role="switch">; query it by role, not by label text.
const countrySwitch = () => screen.queryByRole('switch', { name: 'Country read-only' });
const provinceSwitch = () => screen.queryByRole('switch', { name: 'Province read-only' });

describe('AddressDefaultsEditor — switch visibility (rule 1)', () => {
  it('Should hide the Country read-only switch when there is no default country', () => {
    renderEditor(addressNode({ defaultCountry: '', defaultProvince: '' }));
    expect(countrySwitch()).not.toBeInTheDocument();
  });

  it('Should show the Country read-only switch once a default country is set', () => {
    renderEditor(addressNode());
    expect(countrySwitch()).toBeInTheDocument();
  });

  it('Should hide the Province/State read-only switch when there is no default province', () => {
    renderEditor(addressNode({ defaultProvince: '' }));
    expect(provinceSwitch()).not.toBeInTheDocument();
  });

  it('Should show the Province/State read-only switch once a default province is set', () => {
    renderEditor(addressNode());
    expect(provinceSwitch()).toBeInTheDocument();
  });

  it('Should label the province switch using the country-specific term', () => {
    renderEditor(addressNode());
    // Canada's subdivision term is "Province" — the switch label tracks the same per-country labels
    // the field itself uses, so it never reads "State read-only" for a Canadian address.
    expect(screen.getByRole('switch', { name: 'Province read-only' })).toBeInTheDocument();
  });
});

describe('AddressDefaultsEditor — clearing a default turns its lock off (rules 3, 4)', () => {
  it('Should set readOnlyProvince to false when the default COUNTRY changes', async () => {
    const user = userEvent.setup();
    const { onChange } = renderEditor(addressNode({ readOnlyProvince: true }));
    await user.click(screen.getByLabelText('Default country'));
    await user.click(await screen.findByRole('option', { name: 'United States' }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ defaultProvince: '', readOnlyProvince: false }),
    );
  });

  it('Should set readOnlyCountry to false (not undefined) when the default country is cleared', async () => {
    const user = userEvent.setup();
    const { onChange } = renderEditor(addressNode({ readOnlyCountry: true }));
    await user.click(screen.getByRole('button', { name: 'Clear default country' }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ defaultCountry: '', readOnlyCountry: false }),
    );
  });
});

describe('AddressDefaultsEditor — toggling the switches (rules 2, 6)', () => {
  it('Should render both switches off for a node with defaults but no locks', () => {
    renderEditor(addressNode());
    expect(countrySwitch()).not.toBeChecked();
    expect(provinceSwitch()).not.toBeChecked();
  });

  it('Should emit readOnlyCountry = true when the country switch is turned on', async () => {
    const user = userEvent.setup();
    const { onChange } = renderEditor(addressNode());
    await user.click(countrySwitch()!);
    expect(onChange).toHaveBeenCalledWith({ readOnlyCountry: true });
  });

  it('Should emit readOnlyProvince = true when the province switch is turned on', async () => {
    const user = userEvent.setup();
    const { onChange } = renderEditor(addressNode());
    await user.click(provinceSwitch()!);
    expect(onChange).toHaveBeenCalledWith({ readOnlyProvince: true });
  });

  it('Should reflect an already-locked node as a checked switch', () => {
    renderEditor(addressNode({ readOnlyCountry: true, readOnlyProvince: true }));
    expect(countrySwitch()).toBeChecked();
    expect(provinceSwitch()).toBeChecked();
  });

  it('Should toggle each lock independently of the other', async () => {
    const user = userEvent.setup();
    const { onChange } = renderEditor(addressNode({ readOnlyCountry: true }));
    await user.click(provinceSwitch()!);
    expect(onChange).toHaveBeenCalledWith({ readOnlyProvince: true });
    expect(onChange).not.toHaveBeenCalledWith(expect.objectContaining({ readOnlyCountry: false }));
  });
});

describe('Address field defaults — new node (rule 2)', () => {
  it('Should create a new address field with both locks false', () => {
    const node = createField('address');
    expect(node.readOnlyCountry).toBe(false);
    expect(node.readOnlyProvince).toBe(false);
  });
});

describe('AddressDefaultsEditor — province selection and input behaviors', () => {
  it('Should select a default province from the combobox when country has states', async () => {
    const user = userEvent.setup();
    const { onChange } = renderEditor(
      addressNode({ defaultCountry: 'Canada', defaultProvince: '' }),
    );

    await user.click(screen.getByLabelText('Default Province'));
    await user.click(await screen.findByRole('option', { name: 'British Columbia' }));

    expect(onChange).toHaveBeenCalledWith({
      defaultProvince: 'British Columbia',
    });
  });

  it('Should clear default province and its lock via combobox clear button', async () => {
    const user = userEvent.setup();
    const { onChange } = renderEditor(
      addressNode({
        defaultCountry: 'Canada',
        defaultProvince: 'British Columbia',
        readOnlyProvince: true,
      }),
    );

    await user.click(screen.getByRole('button', { name: 'Clear default Province' }));
    expect(onChange).toHaveBeenCalledWith({
      defaultProvince: '',
      readOnlyProvince: false,
    });
  });

  it('Should allow typing and clearing free-text province when country has no states', async () => {
    const user = userEvent.setup();
    const { onChange } = renderEditor(
      addressNode({ defaultCountry: 'France', defaultProvince: 'Paris' }),
    );

    const input = screen.getByLabelText('Default State / Province');
    expect(input).toBeInTheDocument();
    expect(input).not.toBeDisabled();

    // Type in input
    fireEvent.change(input, { target: { value: 'Lyon' } });
    expect(onChange).toHaveBeenCalledWith({ defaultProvince: 'Lyon' });

    // Clear via clear button
    const clearBtn = screen.getByRole('button', { name: 'Clear' });
    await user.click(clearBtn);
    expect(onChange).toHaveBeenCalledWith({ defaultProvince: '', readOnlyProvince: false });
  });

  it('Should disable province input and show placeholder when no country is selected', () => {
    renderEditor(addressNode({ defaultCountry: '', defaultProvince: '' }));
    const input = screen.getByLabelText('Default State / Province');
    expect(input).toBeDisabled();
    expect(input).toHaveAttribute('placeholder', 'Choose a country first');
  });

  it('Should handle turning switches off from an active state', async () => {
    const user = userEvent.setup();
    const { onChange } = renderEditor(
      addressNode({
        defaultCountry: 'Canada',
        defaultProvince: 'British Columbia',
        readOnlyCountry: true,
        readOnlyProvince: true,
      }),
    );

    // Turn country switch off
    await user.click(countrySwitch()!);
    expect(onChange).toHaveBeenCalledWith({ readOnlyCountry: false });

    // Turn province switch off
    await user.click(provinceSwitch()!);
    expect(onChange).toHaveBeenCalledWith({ readOnlyProvince: false });
  });

  it('Should render safely when node default and lock properties are undefined', () => {
    const {
      defaultCountry: _defaultCountry,
      defaultProvince: _defaultProvince,
      readOnlyCountry: _readOnlyCountry,
      readOnlyProvince: _readOnlyProvince,
      ...baseNode
    } = createField('address');

    const sparseNodeAddress: ControlNode = {
      ...baseNode,
      key: 'addr_sparse',
      label: 'Sparse Address',
      options: {},
      required: false,
    };
    renderEditor(sparseNodeAddress);
    expect(countrySwitch()).not.toBeInTheDocument();
    expect(provinceSwitch()).not.toBeInTheDocument();
  });

  it('Should render safely when defaults are set but lock properties are undefined', () => {
    const {
      readOnlyCountry: _readOnlyCountry,
      readOnlyProvince: _readOnlyProvince,
      ...baseNode
    } = createField('address');
    const nodeWithDefaults: ControlNode = {
      ...baseNode,
      key: 'addr_partial',
      label: 'Partial Address',
      options: {},
      required: false,
      defaultCountry: 'Canada',
      defaultProvince: 'British Columbia',
    };
    renderEditor(nodeWithDefaults);
    expect(countrySwitch()).toBeInTheDocument();
    expect(countrySwitch()).not.toBeChecked();
    expect(provinceSwitch()).toBeInTheDocument();
    expect(provinceSwitch()).not.toBeChecked();
  });

  it('Should render province combobox when defaultCountry is set but defaultProvince is undefined and states are loading', () => {
    const { defaultProvince: _defaultProvince, ...baseNode } = createField('address');
    const nodeNoProvince: ControlNode = {
      ...baseNode,
      key: 'addr_no_prov',
      label: 'No Province Address',
      options: {},
      required: false,
      defaultCountry: 'Canada',
      readOnlyCountry: false,
      readOnlyProvince: false,
    };
    renderEditor(nodeNoProvince, (client) => {
      client.setQueryData(['geo', 'states', 39], undefined);
    });
    expect(screen.getByLabelText('Default Province')).toBeInTheDocument();
  });

  it('Should handle empty query cache gracefully without crash', () => {
    renderEditor(addressNode({ defaultCountry: '', defaultProvince: '' }), (client) => {
      client.removeQueries({ queryKey: ['geo'] });
    });
    expect(screen.getByLabelText('Default country')).toBeInTheDocument();
  });
});
