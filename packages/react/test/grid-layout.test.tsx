import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { JsonForms } from '@jsonforms/react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { displayRenderers } from '../src/jsonforms-renderers-display';
import { renderers } from '../src/jsonforms-renderers';

const schema: JsonSchema = {
  type: 'object',
  properties: {
    a: { type: 'string' },
    b: { type: 'string' },
    c: { type: 'string' },
  },
};

function gridUischema(columns?: number): UISchemaElement {
  return {
    type: 'GridLayout',
    ...(columns === undefined ? {} : { options: { columns } }),
    elements: [
      { type: 'Control', scope: '#/properties/a', label: 'A' },
      { type: 'Control', scope: '#/properties/b', label: 'B' },
      { type: 'Control', scope: '#/properties/c', label: 'C' },
    ],
  } as unknown as UISchemaElement;
}

describe('GridLayout (feature 169)', () => {
  it('renders a fixed column count from options.columns, not the child count', () => {
    const { container } = render(
      <JsonForms
        schema={schema}
        uischema={gridUischema(2)}
        data={{}}
        renderers={renderers}
        cells={[]}
        onChange={() => {}}
      />,
    );
    // 3 children in a 2-column grid — Horizontal would derive 3 columns (one per child); Grid must not.
    const grid = container.querySelector('[style*="grid-template-columns"]');
    expect(grid?.getAttribute('style')).toContain('repeat(2, minmax(0, 1fr))');
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.getByText('C')).toBeInTheDocument();
  });

  it('defaults to 2 columns when options.columns is absent', () => {
    const { container } = render(
      <JsonForms
        schema={schema}
        uischema={gridUischema(undefined)}
        data={{}}
        renderers={renderers}
        cells={[]}
        onChange={() => {}}
      />,
    );
    const grid = container.querySelector('[style*="grid-template-columns"]');
    expect(grid?.getAttribute('style')).toContain('repeat(2, minmax(0, 1fr))');
  });

  it('is registered in the display renderer set too (form-runner preview / read-only review)', () => {
    const { container } = render(
      <JsonForms
        schema={schema}
        uischema={gridUischema(3)}
        data={{ a: 'x', b: 'y', c: 'z' }}
        renderers={displayRenderers}
        cells={[]}
        onChange={() => {}}
      />,
    );
    const grid = container.querySelector('[style*="grid-template-columns"]');
    expect(grid?.getAttribute('style')).toContain('repeat(3, minmax(0, 1fr))');
  });
});
