import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { JsonForms } from '@jsonforms/react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { displayRenderers } from '../src/jsonforms-renderers-display';

const lexicalHello = {
  root: {
    children: [
      {
        children: [
          {
            detail: 0,
            format: 0,
            mode: 'normal',
            style: '',
            text: 'About this service',
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

const schema: JsonSchema = {
  type: 'object',
  properties: {
    title: { type: 'string', title: 'Title' },
    summary: { type: 'string', title: 'Summary' },
    count: { type: 'integer', title: 'Count' },
    agree: { type: 'boolean', title: 'Agree' },
    color: { type: 'string', title: 'Color', enum: ['red', 'green'] },
    about: { type: 'object', title: 'About' },
  },
};

const uischema = {
  type: 'VerticalLayout',
  elements: [
    { type: 'Control', scope: '#/properties/title' },
    { type: 'Control', scope: '#/properties/summary', options: { multi: true } },
    { type: 'Control', scope: '#/properties/count' },
    { type: 'Control', scope: '#/properties/agree' },
    { type: 'Control', scope: '#/properties/color' },
    { type: 'Control', scope: '#/properties/about', options: { format: 'richtext' } },
  ],
} as unknown as UISchemaElement;

const data = {
  title: 'Birth Registration',
  summary: 'Register a birth.',
  count: 3,
  agree: true,
  color: 'green',
  about: lexicalHello,
};

function renderDisplay() {
  render(
    <JsonForms
      schema={schema}
      uischema={uischema}
      data={data}
      renderers={displayRenderers}
      cells={[]}
    />,
  );
}

describe('display renderers', () => {
  it('renders values as read-only content (labels + formatted values)', () => {
    renderDisplay();
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Birth Registration')).toBeInTheDocument();
    expect(screen.getByText('Register a birth.')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Yes')).toBeInTheDocument(); // boolean
    expect(screen.getByText('green')).toBeInTheDocument(); // enum label
    expect(screen.getByText('About this service')).toBeInTheDocument(); // rich text
  });

  it('renders no form inputs', () => {
    renderDisplay();
    expect(document.querySelector('input')).toBeNull();
    expect(document.querySelector('textarea')).toBeNull();
    expect(document.querySelector('[contenteditable="true"]')).toBeNull();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('shows a placeholder for an absent value', () => {
    render(
      <JsonForms
        schema={schema}
        uischema={uischema}
        data={{ title: 'Only title' }}
        renderers={displayRenderers}
        cells={[]}
      />,
    );
    // summary/count/agree/color/about are all empty → em-dash placeholders.
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });
});
