import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import { DEFAULT_PALETTE_ITEMS } from '../src/studio/palette-items';
import { isObjectArray } from '../src/renderers/ui/object-array';
import { renderStudioRenderers } from './render-studio-renderers';

const ITEM = '#/properties/people/items/properties';
const SCHEMA = {
  type: 'object',
  properties: {
    people: {
      type: 'array',
      title: 'People',
      items: { type: 'object', properties: { first: { type: 'string', title: 'First name' } } },
    },
  },
};
const PAGE = {
  id: 'F',
  type: 'Form',
  label: 'Page',
  elements: [
    {
      id: 'r',
      type: 'Control',
      scope: '#/properties/people',
      options: { component: 'record', addLabel: 'Add person' },
      elements: [
        {
          id: 'L',
          type: 'VerticalLayout',
          elements: [{ id: 'f', type: 'Control', scope: `${ITEM}/first` }],
        },
      ],
    },
  ],
};

describe('studio record (doc 271 rules 9, 19)', () => {
  it('draws the item form as a studio layout holding its fields, then a greyed Add item', () => {
    const { container } = renderStudioRenderers(PAGE, { schema: SCHEMA });
    const record = container.querySelector<HTMLElement>('[data-element-id="r"]')!;
    // The record itself is not inert (its fields' own bodies are): it holds an editable layout.
    expect(record.querySelector(':scope > [data-slot="studio-element-body"][inert]')).toBeNull();
    const layout = record.querySelector<HTMLElement>('[data-element-id="L"]')!;
    expect(layout).toHaveAttribute('data-element-type', 'VerticalLayout');
    const field = layout.querySelector<HTMLElement>('[data-element-id="f"]')!;
    // The item field is an ordinary (inert) studio control, labelled from its items property.
    expect(within(field).getByText('First name')).toBeInTheDocument();
    expect(within(record).getByRole('button', { name: 'Add person' })).toBeDisabled();
    expect(screen.getByText('People')).toBeInTheDocument();
  });

  it('creates a fresh Record palette item in Record fields', () => {
    const item = DEFAULT_PALETTE_ITEMS.find((candidate) => candidate.id === 'record')!;
    expect(item).toMatchObject({ label: 'Record', group: 'Record fields' });
    const [a, b] = [item.create(), item.create()];
    const [key] = Object.keys(a.properties!);
    expect(key).not.toBe(Object.keys(b.properties!)[0]);
    expect(isObjectArray(a.properties![key!])).toBe(true);
    expect(a.properties![key!]).toMatchObject({ title: 'Untitled record' });
    expect(a.element).toMatchObject({
      type: 'Control',
      scope: `#/properties/${key}`,
      options: { component: 'record' },
      elements: [{ type: 'VerticalLayout', elements: [] }],
    });
    const layout = (a.element['elements'] as { id: string }[])[0]!;
    expect(layout.id).not.toBe((b.element['elements'] as { id: string }[])[0]!.id);
  });
});
