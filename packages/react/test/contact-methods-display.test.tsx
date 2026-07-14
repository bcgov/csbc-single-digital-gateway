import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { JsonForms } from '@jsonforms/react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ContactMethodsView, displayRenderers } from '../src/jsonforms-renderers-display';

const richText = {
  root: {
    children: [
      {
        children: [
          {
            detail: 0,
            format: 0,
            mode: 'normal',
            style: '',
            text: 'Open weekdays 9–5',
            type: 'text',
            version: 1,
          },
        ],
        direction: 'ltr',
        format: '',
        indent: 0,
        type: 'paragraph',
        version: 1,
      },
    ],
    direction: 'ltr',
    format: '',
    indent: 0,
    type: 'root',
    version: 1,
  },
};

const methods = [
  {
    type: 'phone',
    label: 'Support line',
    description: richText,
    entries: [{ label: 'Toll free', value: '1-800-555-0000' }],
  },
  {
    type: 'address',
    label: 'Head office',
    entries: [
      {
        label: 'Mailing',
        address_one: '123 Government St',
        city: 'Victoria',
        province: 'BC',
        postal_code: 'V8V 1X4',
      },
    ],
  },
];

describe('ContactMethodsView (display component)', () => {
  it('renders one card per contact method with its label', () => {
    render(<ContactMethodsView value={methods} />);
    expect(screen.getByText('Support line')).toBeInTheDocument();
    expect(screen.getByText('Head office')).toBeInTheDocument();
  });

  it('renders value entries (label + value) for a phone method', () => {
    render(<ContactMethodsView value={methods} />);
    expect(screen.getByText('Toll free')).toBeInTheDocument();
    expect(screen.getByText('1-800-555-0000')).toBeInTheDocument();
  });

  it('renders address fields for an address method', () => {
    render(<ContactMethodsView value={methods} />);
    expect(screen.getByText(/123 Government St/)).toBeInTheDocument();
    expect(screen.getByText(/Victoria/)).toBeInTheDocument();
    expect(screen.getByText(/V8V 1X4/)).toBeInTheDocument();
  });

  it('renders the rich-text description', () => {
    render(<ContactMethodsView value={methods} />);
    expect(screen.getByText('Open weekdays 9–5')).toBeInTheDocument();
  });

  it('renders nothing for an empty or malformed value (no throw)', () => {
    const { container } = render(<ContactMethodsView value={undefined} />);
    expect(container).toBeInTheDocument();
    expect(screen.queryByText('Support line')).not.toBeInTheDocument();
    // A partial/garbage blob must not throw.
    expect(() =>
      render(<ContactMethodsView value={[{ type: 'phone' }, { nope: true }]} />),
    ).not.toThrow();
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
