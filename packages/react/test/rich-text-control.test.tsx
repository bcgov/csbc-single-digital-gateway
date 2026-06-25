import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { JsonForms } from '@jsonforms/react';
import { render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { renderers } from '../src/jsonforms-renderers';

const schema: JsonSchema = {
  type: 'object',
  properties: { about: { type: 'object', title: 'About' } },
};
const uischema = {
  type: 'VerticalLayout',
  elements: [{ type: 'Control', scope: '#/properties/about', options: { format: 'richtext' } }],
} as unknown as UISchemaElement;

function Form() {
  const [data, setData] = useState<Record<string, unknown>>({});
  return (
    <JsonForms
      schema={schema}
      uischema={uischema}
      data={data}
      renderers={renderers}
      cells={[]}
      onChange={({ data: next }) => setData(next as Record<string, unknown>)}
    />
  );
}

describe('richtext renderer', () => {
  it('renders a richtext-formatted control as the Lexical editor with its label', () => {
    render(<Form />);
    expect(screen.getByText('About')).toBeInTheDocument();
    expect(screen.getByRole('toolbar', { name: /formatting/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bold' })).toBeInTheDocument();
    expect(document.querySelector('[contenteditable="true"]')).toBeTruthy();
  });
});
