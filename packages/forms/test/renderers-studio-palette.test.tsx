import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { JsonForms } from '@jsonforms/react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as palette from '../src/renderers-studio-palette';
import { StudioPaletteProvider } from '../src/renderers/studio-palette/palette-actions';

// Doc 189 rules 1-11 — the @repo/forms/renderers/studio-palette renderer set.

const setupGridDragIn = vi.hoisted(() =>
  vi.fn((_element: HTMLElement, _template: string) => vi.fn()),
);
vi.mock('../src/renderers/gridstack/grid-drag-in', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  setupGridDragIn,
}));

const CATEGORIES = ['cells', 'controlRenderers', 'displayRenderers', 'layoutRenderers'] as const;
const ICON = 'M0 0h24v24H0z';

const schema: JsonSchema = { type: 'object', properties: { search: { type: 'string' } } };

const item = (template: string, label: string, keywords: string[]) => ({
  type: 'PaletteItem',
  template,
  label,
  options: { icon: ICON, keywords },
});

const uischema = {
  type: 'VerticalLayout',
  elements: [
    { type: 'Control', scope: '#/properties/search', label: 'Search elements' },
    { type: 'PaletteGroup', label: 'Display', elements: [item('heading', 'Heading', ['title'])] },
    {
      type: 'PaletteGroup',
      label: 'Fields',
      elements: [
        item('text', 'Text', ['input']),
        item('combobox', 'Combobox', ['select', 'dropdown']),
      ],
    },
    { type: 'PaletteEmpty', text: 'No elements match your search.' },
  ],
} as UISchemaElement;

const renderers = () => [
  ...palette.controlRenderers,
  ...palette.displayRenderers,
  ...palette.layoutRenderers,
];

function renderPalette(add?: (template: string) => void) {
  const form = (
    <JsonForms
      schema={schema}
      uischema={uischema}
      data={{}}
      renderers={renderers()}
      cells={palette.cells}
    />
  );
  return render(add ? <StudioPaletteProvider value={{ add }}>{form}</StudioPaletteProvider> : form);
}

const searchbox = () => screen.getByRole('searchbox', { name: 'Search elements' });
const typeSearch = (value: string) => fireEvent.change(searchbox(), { target: { value } });
const itemNamed = (name: string) => screen.getByRole('button', { name });

beforeEach(() => {
  setupGridDragIn.mockClear();
});

describe('renderer set (rules 1-3)', () => {
  it('exports exactly the four RendererSet arrays', () => {
    expect(Object.keys(palette).toSorted()).toEqual([...CATEGORIES]);
    expect(palette.cells).toEqual([]);
    expect(palette.controlRenderers).toHaveLength(1);
    expect(palette.displayRenderers).toHaveLength(2);
    expect(palette.layoutRenderers).toHaveLength(2);
  });

  it.each([
    ['the search Control', { type: 'Control', scope: '#/properties/search' }],
    ['a PaletteItem', item('text', 'Text', [])],
    ['a PaletteEmpty', { type: 'PaletteEmpty', text: 'x' }],
    ['a PaletteGroup', { type: 'PaletteGroup', label: 'x', elements: [] }],
    ['a VerticalLayout', { type: 'VerticalLayout', elements: [] }],
  ])('dispatches %s to exactly one top-ranked entry', (_name, element) => {
    const ranks = renderers().map(({ tester }) =>
      tester(element as UISchemaElement, schema, { rootSchema: schema, config: {} }),
    );
    const top = Math.max(...ranks);
    expect(top).toBeGreaterThan(0);
    expect(ranks.filter((rank) => rank === top)).toHaveLength(1);
  });
});

describe('search (rules 4-5)', () => {
  it('renders a search input named by its label, with the label as placeholder', () => {
    renderPalette();
    expect(searchbox()).toHaveAttribute('type', 'search');
    expect(searchbox()).toHaveAttribute('placeholder', 'Search elements');
  });

  it('filters items by label and keyword, hiding groups left empty', () => {
    renderPalette();
    typeSearch('drop');
    expect(itemNamed('Combobox')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Text' })).toBeNull();
    expect(screen.queryByRole('group', { name: 'Display' })).toBeNull();
    expect(screen.getByRole('group', { name: 'Fields' })).toBeInTheDocument();

    typeSearch('TEX');
    expect(itemNamed('Text')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Combobox' })).toBeNull();
  });

  it('shows the empty message only when a query matches nothing', () => {
    renderPalette();
    expect(screen.queryByText('No elements match your search.')).toBeNull();
    typeSearch('zzz');
    expect(screen.getByText('No elements match your search.')).toBeInTheDocument();
    expect(screen.queryAllByRole('group')).toHaveLength(0);
    typeSearch('');
    expect(screen.queryByText('No elements match your search.')).toBeNull();
  });
});

describe('groups and items (rules 6-8)', () => {
  it('renders each group as a named group of its items, in order', () => {
    renderPalette();
    const groups = screen.getAllByRole('group');
    expect(groups.map((group) => group.getAttribute('data-slot'))).toEqual([
      'palette-group',
      'palette-group',
    ]);
    expect(
      within(screen.getByRole('group', { name: 'Fields' }))
        .getAllByRole('button')
        .map((b) => b.getAttribute('aria-label')),
    ).toEqual(['Text', 'Combobox']);
  });

  it('renders an item as a focusable div button with its template, icon and label', () => {
    renderPalette();
    const text = itemNamed('Text');
    expect(text.tagName).toBe('DIV');
    expect(text).toHaveAttribute('tabindex', '0');
    expect(text).toHaveAttribute('data-slot', 'palette-item');
    expect(text).toHaveAttribute('data-palette-template', 'text');
    expect(text).toHaveTextContent('Text');
    expect(text.querySelector('svg path')).toHaveAttribute('d', ICON);
  });
});

describe('activation (rule 9)', () => {
  it('adds the template on click, Enter and Space', () => {
    const add = vi.fn();
    renderPalette(add);
    fireEvent.click(itemNamed('Text'));
    fireEvent.keyDown(itemNamed('Heading'), { key: 'Enter' });
    const spaceAllowed = fireEvent.keyDown(itemNamed('Combobox'), { key: ' ' });
    fireEvent.keyDown(itemNamed('Combobox'), { key: 'a' });
    expect(add.mock.calls).toEqual([['text'], ['heading'], ['combobox']]);
    expect(spaceAllowed).toBe(false);
  });

  it('does nothing without a provider', () => {
    renderPalette();
    expect(() => fireEvent.click(itemNamed('Text'))).not.toThrow();
  });
});

describe('drag sources (rule 10)', () => {
  it('registers every rendered item with its template, and cleans up items the search hides', () => {
    renderPalette();
    expect(setupGridDragIn.mock.calls.map(([element, template]) => [element, template])).toEqual([
      [itemNamed('Heading'), 'heading'],
      [itemNamed('Text'), 'text'],
      [itemNamed('Combobox'), 'combobox'],
    ]);
    const cleanups = setupGridDragIn.mock.results.map(
      (result) => result.value as ReturnType<typeof vi.fn>,
    );

    typeSearch('drop');
    expect(cleanups[0]).toHaveBeenCalledOnce();
    expect(cleanups[1]).toHaveBeenCalledOnce();
    expect(cleanups[2]).not.toHaveBeenCalled();
  });
});
