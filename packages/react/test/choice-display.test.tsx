import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { JsonForms } from '@jsonforms/react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { displayRenderers } from '../src/jsonforms-renderers-display';

const CHOICES = [
  { value: 'r', label: 'Red' },
  { value: 'g', label: 'Green' },
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

describe('ChoiceDisplay (feature 156, Step 2)', () => {
  const singleSchema: JsonSchema = {
    type: 'object',
    properties: { color: { type: 'string', enum: ['r', 'g'] } },
  };
  const singleUi = {
    type: 'Control',
    scope: '#/properties/color',
    label: 'Colour',
    options: { format: 'choice', display: 'select', choices: CHOICES },
  } as UISchemaElement;

  it('renders a single value as its authored label', () => {
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
          properties: { tags: { type: 'array', items: { type: 'string', enum: ['r', 'g'] } } },
        }}
        uischema={
          {
            type: 'Control',
            scope: '#/properties/tags',
            label: 'Tags',
            options: { format: 'choice', display: 'checkboxes', choices: CHOICES },
          } as UISchemaElement
        }
        data={{ tags: ['r', 'g'] }}
      />,
    );
    expect(screen.getByText('Red')).toBeInTheDocument();
    expect(screen.getByText('Green')).toBeInTheDocument();
  });
});
