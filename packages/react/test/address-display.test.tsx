import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { JsonForms } from '@jsonforms/react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AddressView, displayRenderers } from '../src/jsonforms-renderers-display';

const schema: JsonSchema = {
  type: 'object',
  properties: { addr: { type: 'object', title: 'Applicant address' } },
};
const uischema: UISchemaElement = {
  type: 'Control',
  scope: '#/properties/addr',
  options: { format: 'address' },
} as UISchemaElement;

describe('AddressView', () => {
  it('renders an em-dash for an empty address', () => {
    render(<AddressView value={{}} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders postal-order lines for a populated address', () => {
    render(
      <AddressView
        value={{
          country: 'Canada',
          address_one: '1 Main St',
          city: 'Victoria',
          province: 'British Columbia',
          postal_code: 'V8W 1A1',
        }}
      />,
    );
    expect(screen.getByText('1 Main St')).toBeInTheDocument();
    expect(screen.getByText('Victoria British Columbia V8W 1A1')).toBeInTheDocument();
    expect(screen.getByText('Canada')).toBeInTheDocument();
  });
});

describe('address display renderer', () => {
  it('dispatches format:address to the read-only view (no inputs)', () => {
    const { container } = render(
      <JsonForms
        schema={schema}
        uischema={uischema}
        data={{ addr: { country: 'Canada', city: 'Victoria' } }}
        renderers={displayRenderers}
      />,
    );
    expect(screen.getByText('Victoria')).toBeInTheDocument();
    expect(screen.getByText('Canada')).toBeInTheDocument();
    expect(container.querySelector('input')).toBeNull();
  });
});
