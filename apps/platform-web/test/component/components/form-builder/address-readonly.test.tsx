import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
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

// Feature 170 — the two read-only switches and the flat-model ⇄ nested-wire translation.
// Kept in its own file rather than appended to model-codec.test.ts (1322 lines) / inspector.test.tsx
// (886 lines), both already well past the 300-line gate.

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
  it('emits options.fields.country.readOnly = true when the country lock is on', () => {
    const options = optionsOf(addressNode({ readOnlyCountry: true }));
    expect(options.fields).toEqual({ country: { readOnly: true } });
  });

  it('emits options.fields.province.readOnly = true when the province lock is on', () => {
    const options = optionsOf(addressNode({ readOnlyProvince: true }));
    expect(options.fields).toEqual({ province: { readOnly: true } });
  });

  it('omits a sub-field bag whose concerns are all at their defaults', () => {
    const options = optionsOf(addressNode({ readOnlyCountry: true, readOnlyProvince: false }));
    expect(options.fields).toEqual({ country: { readOnly: true } });
    expect((options.fields as Record<string, unknown>).province).toBeUndefined();
  });

  it('omits the fields key entirely when no sub-field has a lock', () => {
    const options = optionsOf(addressNode({ readOnlyCountry: false, readOnlyProvince: false }));
    expect(options.fields).toBeUndefined();
  });

  it('keeps options.format = address alongside the fields bag', () => {
    const options = optionsOf(addressNode({ readOnlyCountry: true }));
    expect(options.format).toBe('address');
  });

  it('keeps the default VALUES in schema.default, not in the options bag', () => {
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
  it('parses options.fields.country.readOnly = true to readOnlyCountry = true', () => {
    expect(roundTrip(addressNode({ readOnlyCountry: true })).readOnlyCountry).toBe(true);
  });

  it('parses a missing fields key to readOnlyCountry = false and readOnlyProvince = false', () => {
    const parsed = roundTrip(addressNode({ readOnlyCountry: false, readOnlyProvince: false }));
    expect(parsed.readOnlyCountry).toBe(false);
    expect(parsed.readOnlyProvince).toBe(false);
  });

  it('yields definite booleans, never undefined, on a freshly parsed address node', () => {
    const parsed = roundTrip(addressNode({ readOnlyProvince: true }));
    expect(typeof parsed.readOnlyCountry).toBe('boolean');
    expect(typeof parsed.readOnlyProvince).toBe('boolean');
  });

  it('round-trips a locked address field through serialize → parse unchanged', () => {
    const parsed = roundTrip(addressNode({ readOnlyCountry: true, readOnlyProvince: true }));
    expect(parsed.readOnlyCountry).toBe(true);
    expect(parsed.readOnlyProvince).toBe(true);
    expect(parsed.defaultCountry).toBe('Canada');
    expect(parsed.defaultProvince).toBe('British Columbia');
  });

  it('drops the fields key from node.options so options round-trips to empty', () => {
    const parsed = roundTrip(addressNode({ readOnlyCountry: true, readOnlyProvince: true }));
    expect(parsed.options).toEqual({});
  });

  it('does NOT strip a custom option named country/city/province from a non-address field', () => {
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

const COUNTRIES = [
  { id: 39, name: 'Canada', iso2: 'CA', hasStates: true, hasPostal: true },
  { id: 233, name: 'United States', iso2: 'US', hasStates: true, hasPostal: true },
];
const STATES = [{ id: 3, name: 'British Columbia', type: 'province', iso2: 'BC' }];

function renderEditor(node: ControlNode) {
  const onChange = vi.fn();
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Number.POSITIVE_INFINITY } },
  });
  queryClient.setQueryData(['geo', 'countries'], COUNTRIES);
  queryClient.setQueryData(['geo', 'states', 39], STATES);
  queryClient.setQueryData(['geo', 'states', 233], STATES);
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
  it('hides the Country read-only switch when there is no default country', () => {
    renderEditor(addressNode({ defaultCountry: '', defaultProvince: '' }));
    expect(countrySwitch()).not.toBeInTheDocument();
  });

  it('shows the Country read-only switch once a default country is set', () => {
    renderEditor(addressNode());
    expect(countrySwitch()).toBeInTheDocument();
  });

  it('hides the Province/State read-only switch when there is no default province', () => {
    renderEditor(addressNode({ defaultProvince: '' }));
    expect(provinceSwitch()).not.toBeInTheDocument();
  });

  it('shows the Province/State read-only switch once a default province is set', () => {
    renderEditor(addressNode());
    expect(provinceSwitch()).toBeInTheDocument();
  });

  it('labels the province switch using the country-specific term', () => {
    renderEditor(addressNode());
    // Canada's subdivision term is "Province" — the switch label tracks the same per-country labels
    // the field itself uses, so it never reads "State read-only" for a Canadian address.
    expect(screen.getByRole('switch', { name: 'Province read-only' })).toBeInTheDocument();
  });
});

describe('AddressDefaultsEditor — clearing a default turns its lock off (rules 3, 4)', () => {
  it('sets readOnlyProvince to false when the default COUNTRY changes', async () => {
    const user = userEvent.setup();
    const { onChange } = renderEditor(addressNode({ readOnlyProvince: true }));
    await user.click(screen.getByLabelText('Default country'));
    await user.click(await screen.findByRole('option', { name: 'United States' }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ defaultProvince: '', readOnlyProvince: false }),
    );
  });

  it('sets readOnlyCountry to false (not undefined) when the default country is cleared', async () => {
    const user = userEvent.setup();
    const { onChange } = renderEditor(addressNode({ readOnlyCountry: true }));
    await user.click(screen.getByRole('button', { name: 'Clear default country' }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ defaultCountry: '', readOnlyCountry: false }),
    );
  });
});

describe('AddressDefaultsEditor — toggling the switches (rules 2, 6)', () => {
  it('renders both switches off for a node with defaults but no locks', () => {
    renderEditor(addressNode());
    expect(countrySwitch()).not.toBeChecked();
    expect(provinceSwitch()).not.toBeChecked();
  });

  it('emits readOnlyCountry = true when the country switch is turned on', async () => {
    const user = userEvent.setup();
    const { onChange } = renderEditor(addressNode());
    await user.click(countrySwitch()!);
    expect(onChange).toHaveBeenCalledWith({ readOnlyCountry: true });
  });

  it('emits readOnlyProvince = true when the province switch is turned on', async () => {
    const user = userEvent.setup();
    const { onChange } = renderEditor(addressNode());
    await user.click(provinceSwitch()!);
    expect(onChange).toHaveBeenCalledWith({ readOnlyProvince: true });
  });

  it('reflects an already-locked node as a checked switch', () => {
    renderEditor(addressNode({ readOnlyCountry: true, readOnlyProvince: true }));
    expect(countrySwitch()).toBeChecked();
    expect(provinceSwitch()).toBeChecked();
  });

  it('toggles each lock independently of the other', async () => {
    const user = userEvent.setup();
    const { onChange } = renderEditor(addressNode({ readOnlyCountry: true }));
    await user.click(provinceSwitch()!);
    expect(onChange).toHaveBeenCalledWith({ readOnlyProvince: true });
    expect(onChange).not.toHaveBeenCalledWith(expect.objectContaining({ readOnlyCountry: false }));
  });
});

describe('Address field defaults — new node (rule 2)', () => {
  it('creates a new address field with both locks false', () => {
    const node = createField('address');
    expect(node.readOnlyCountry).toBe(false);
    expect(node.readOnlyProvince).toBe(false);
  });
});
