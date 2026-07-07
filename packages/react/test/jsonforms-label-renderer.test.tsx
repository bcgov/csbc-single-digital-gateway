import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { JsonForms } from '@jsonforms/react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderers } from '../src/jsonforms-renderers';

// A Lexical editor state carrying a single paragraph of text.
const lexical = (text: string) => ({
  root: {
    children: [
      {
        children: [
          { detail: 0, format: 0, mode: 'normal', style: '', text, type: 'text', version: 1 },
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
});

const EMPTY_SCHEMA: JsonSchema = { type: 'object', properties: {} };

function renderLabel(element: Record<string, unknown>) {
  return render(
    <JsonForms
      schema={EMPTY_SCHEMA}
      uischema={{ type: 'VerticalLayout', elements: [element] } as unknown as UISchemaElement}
      data={{}}
      renderers={renderers}
      cells={[]}
      onChange={() => {}}
    />,
  );
}

describe('LabelRenderer — display formats', () => {
  it('renders a heading Label as a level-2 heading by default', () => {
    renderLabel({ type: 'Label', text: 'Your details', options: { format: 'heading', level: 2 } });
    const heading = screen.getByRole('heading', { name: 'Your details' });
    expect(heading.tagName).toBe('H2');
  });

  it('renders a heading with level 3 as an H3', () => {
    renderLabel({ type: 'Label', text: 'More', options: { format: 'heading', level: 3 } });
    expect(screen.getByRole('heading', { name: 'More' }).tagName).toBe('H3');
  });

  it('renders a paragraph Label as a <p> with the text', () => {
    renderLabel({
      type: 'Label',
      text: 'Please read carefully.',
      options: { format: 'paragraph' },
    });
    const p = screen.getByText('Please read carefully.');
    expect(p.tagName).toBe('P');
  });

  it('renders a paragraph with the configured alignment', () => {
    renderLabel({
      type: 'Label',
      text: 'Centered',
      options: { format: 'paragraph', align: 'center' },
    });
    expect(screen.getByText('Centered')).toHaveClass('text-center');
  });

  it('renders a richtext Label as read-only rich text content', () => {
    renderLabel({
      type: 'Label',
      text: '',
      options: { format: 'richtext', content: lexical('Guidance for applicants') },
    });
    expect(screen.getByText('Guidance for applicants')).toBeInTheDocument();
  });

  it('still renders a plain Label (no format) as before', () => {
    renderLabel({ type: 'Label', text: 'Plain label' });
    expect(screen.getByText('Plain label')).toBeInTheDocument();
  });
});
