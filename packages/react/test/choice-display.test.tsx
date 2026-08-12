import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { JsonForms } from '@jsonforms/react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { displayRenderers } from '../src/jsonforms-renderers-display';

const ONE_OF = [
  { const: 'r', title: 'Red' },
  { const: 'g', title: 'Green' },
];

function Display({
  schema,
  uischema,
  data,
}: {
  schema: JsonSchema;
  uischema: UISchemaElement;
  data: Record<string, unknown>;
}) {
  return (
    <JsonForms
      schema={schema}
      uischema={uischema}
      data={data}
      renderers={displayRenderers}
      cells={[]}
      onChange={() => {}}
    />
  );
}

describe('ChoiceDisplay (feature 167 — schema-native oneOf/const/title)', () => {
  const singleSchema: JsonSchema = {
    type: 'object',
    properties: { color: { type: 'string', oneOf: ONE_OF } },
  };
  const singleUi = {
    type: 'Control',
    scope: '#/properties/color',
    label: 'Colour',
  } as UISchemaElement;

  it('renders a single value as its authored label from schema.oneOf', () => {
    render(<Display schema={singleSchema} uischema={singleUi} data={{ color: 'g' }} />);
    expect(screen.getByText('Green')).toBeInTheDocument();
  });

  it('renders an em-dash for an absent value', () => {
    render(<Display schema={singleSchema} uischema={singleUi} data={{}} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders multi values as label badges', () => {
    render(
      <Display
        schema={{
          type: 'object',
          properties: {
            tags: { type: 'array', items: { type: 'string', oneOf: ONE_OF }, uniqueItems: true },
          },
        }}
        uischema={
          {
            type: 'Control',
            scope: '#/properties/tags',
            label: 'Tags',
            options: { display: 'checkboxes' },
          } as UISchemaElement
        }
        data={{ tags: ['r', 'g'] }}
      />,
    );
    expect(screen.getByText('Red')).toBeInTheDocument();
    expect(screen.getByText('Green')).toBeInTheDocument();
  });
});
