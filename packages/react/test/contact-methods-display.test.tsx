import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { JsonForms } from '@jsonforms/react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ContactMethodsView, displayRenderers } from '../src/jsonforms-renderers-display';

const methods = [
  { type: 'phone', label: 'Support line', value: '1-800-555-0000' },
  {
    type: 'address',
    label: 'Head office',
    address_one: '123 Government St',
    city: 'Victoria',
    province: 'BC',
    postal_code: 'V8V 1X4',
  },
];

describe('ContactMethodsView (display component)', () => {
  it('renders one card per contact method with its label', () => {
    render(<ContactMethodsView value={methods} />);
    expect(screen.getByText('Support line')).toBeInTheDocument();
    expect(screen.getByText('Head office')).toBeInTheDocument();
  });

  it('renders the single value for a value method', () => {
    render(<ContactMethodsView value={methods} />);
    expect(screen.getByText('1-800-555-0000')).toBeInTheDocument();
  });

  it('renders address lines for an address method', () => {
    render(<ContactMethodsView value={methods} />);
    expect(screen.getByText(/123 Government St/)).toBeInTheDocument();
    expect(screen.getByText(/Victoria/)).toBeInTheDocument();
    expect(screen.getByText(/V8V 1X4/)).toBeInTheDocument();
  });

  it('renders nothing for an empty or malformed value (no throw)', () => {
    const { container } = render(<ContactMethodsView value={undefined} />);
    expect(container).toBeInTheDocument();
    expect(screen.queryByText('Support line')).not.toBeInTheDocument();
    expect(() =>
      render(<ContactMethodsView value={[{ type: 'phone' }, { nope: true }]} />),
    ).not.toThrow();
  });

  it('is backward-compatible with revision-1 entries data', () => {
    render(
      <ContactMethodsView
        value={[{ type: 'phone', label: 'Old', entries: [{ value: '1-888-000-0000' }] }]}
      />,
    );
    expect(screen.getByText('Old')).toBeInTheDocument();
    expect(screen.getByText('1-888-000-0000')).toBeInTheDocument();
  });
});

describe('contact-methods display renderer (JsonForms dispatch)', () => {
  const schema: JsonSchema = {
    type: 'object',
    properties: { contact_methods: { type: 'array', title: 'Contact methods' } },
  };
  const uischema = {
    type: 'VerticalLayout',
    elements: [
      {
        type: 'Control',
        scope: '#/properties/contact_methods',
        options: { format: 'contact-methods' },
      },
    ],
  } as unknown as UISchemaElement;

  it('dispatches the contact-methods control to the card view in a JsonForms display render', () => {
    render(
      <JsonForms
        schema={schema}
        uischema={uischema}
        data={{ contact_methods: methods }}
        renderers={displayRenderers}
        cells={[]}
      />,
    );
    expect(screen.getByText('Support line')).toBeInTheDocument();
    expect(screen.getByText('1-800-555-0000')).toBeInTheDocument();
  });
});
