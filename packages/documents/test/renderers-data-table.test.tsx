import { JsonForms } from '@jsonforms/react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import * as defaults from '../src/renderers/default/index';

const PEOPLE_COLUMNS = {
  name: { type: 'string', title: 'Name' },
  age: { type: 'integer', title: 'Age' },
  member: { type: 'boolean', title: 'Member' },
};

const schema = {
  type: 'object',
  properties: {
    people: {
      type: 'array',
      title: 'People',
      description: 'Everyone in the household',
      items: { type: 'object', properties: PEOPLE_COLUMNS },
    },
    plain: { type: 'array', title: '', items: { type: 'object', properties: PEOPLE_COLUMNS } },
    regions: { type: 'array', title: 'Regions', items: { oneOf: [{ const: 'north' }] } },
    notes: { type: 'object', title: 'Notes', required: ['root'] },
  },
  required: ['people'],
};

const control = (scope: string, options: Record<string, unknown> = {}, extra = {}) => ({
  type: 'Control',
  scope: `#/properties/${scope}`,
  options,
  ...extra,
});

const PEOPLE = [
  { name: 'Bea', age: 31, member: true },
  { name: 'Al', age: 45, member: false },
  { name: 'Cy', age: 12 },
];

function renderControl(uischema: Record<string, unknown>, data: Record<string, unknown> = {}) {
  const onChange = vi.fn<(data: Record<string, unknown>) => void>();
  const view = render(
    <JsonForms
      schema={schema}
      uischema={uischema as never}
      data={data}
      renderers={defaults.renderers}
      cells={defaults.cells}
      onChange={({ data: next }) => onChange(next as Record<string, unknown>)}
    />,
  );
  const field = () => view.container.querySelector<HTMLElement>('[data-slot="data-table-field"]');
  return { ...view, field, onChange };
}

const ctx = { rootSchema: schema, config: {} } as never;
const topRank = (uischema: Record<string, unknown>) =>
  Math.max(
    ...defaults.renderers.map((r) => r.tester(uischema as never, schema as never, ctx) as number),
  );
const tableRanks = (uischema: Record<string, unknown>) =>
  defaults.renderers
    .map((r) => r.tester(uischema as never, schema as never, ctx))
    .filter((rank) => rank > 0);

/** The body rows' cell texts. */
const bodyCells = () =>
  within(screen.getAllByRole('rowgroup')[1]!)
    .getAllByRole('row')
    .map((row) =>
      within(row)
        .getAllByRole('cell')
        .map((cell) => cell.textContent),
    );

describe('data table control — default renderer (doc 263 rules 13-17)', () => {
  describe('dispatch', () => {
    it('draws a DataTable for an object array with no component, data-table, or an unknown component', () => {
      for (const options of [{}, { component: 'data-table' }, { component: 'carousel' }]) {
        const { field, unmount } = renderControl(control('people', options), { people: PEOPLE });
        expect(field()).toHaveAttribute('data-component', 'data-table');
        expect(field()!.querySelector('[data-slot="data-table"]')).not.toBeNull();
        expect(tableRanks(control('people', options))).toEqual([1]);
        unmount();
      }
    });

    it('does not take a multi choice or rich text field', () => {
      const { field, unmount } = renderControl(control('regions'));
      expect(field()).toBeNull();
      unmount();
      const rich = renderControl(control('notes'));
      expect(rich.field()).toBeNull();
      // Each still has exactly one top-ranked renderer: the table never ties with them.
      expect(topRank(control('regions'))).toBe(1);
      expect(tableRanks(control('regions'))).toHaveLength(1);
      expect(tableRanks(control('notes'))).toHaveLength(1);
    });
  });

  describe('rendering', () => {
    it('labels the table by its field label and description, with required star', () => {
      renderControl(control('people'), { people: PEOPLE });
      const table = screen.getByRole('table', { name: 'People' });
      expect(table).toHaveAccessibleDescription('Everyone in the household');
      expect(screen.getByText('*')).toHaveAttribute('aria-hidden', 'true');
    });

    it('names an unlabelled table by its path', () => {
      renderControl(control('plain'), { plain: PEOPLE });
      expect(screen.getByRole('table', { name: 'plain' })).not.toHaveAttribute('aria-labelledby');
    });

    it('shows formatted rows and sortable headers', async () => {
      const user = userEvent.setup();
      renderControl(control('people'), { people: PEOPLE });
      expect(bodyCells()).toEqual([
        ['Bea', '31', 'Yes'],
        ['Al', '45', 'No'],
        ['Cy', '12', ''],
      ]);
      await user.click(screen.getByRole('button', { name: 'Age, sort options' }));
      await user.click(await screen.findByRole('menuitem', { name: 'Ascending' }));
      expect(bodyCells().map((row) => row[0])).toEqual(['Cy', 'Bea', 'Al']);
    });

    it('shows No rows. for empty or absent data', () => {
      const { unmount } = renderControl(control('people'));
      expect(screen.getByRole('cell', { name: 'No rows.' })).toHaveAttribute('colspan', '3');
      unmount();
      renderControl(control('people'), { people: [] });
      expect(screen.getByRole('cell', { name: 'No rows.' })).toBeInTheDocument();
    });

    it('paginates at 10 rows', () => {
      const people = Array.from({ length: 13 }, (_, i) => ({ name: `P${i + 1}` }));
      renderControl(control('people'), { people });
      expect(bodyCells()).toHaveLength(10);
      expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
    });
  });

  describe('read-only', () => {
    it('never calls handleChange', async () => {
      const user = userEvent.setup();
      const data = { people: PEOPLE };
      const { onChange } = renderControl(control('people'), data);
      await user.click(screen.getAllByRole('cell')[0]!);
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
      // JSONForms reports its data on mount; nothing ever changes it.
      for (const [next] of onChange.mock.calls) expect(next).toEqual(data);
    });

    it('renders nothing when hidden', () => {
      const { field } = renderControl(
        control('people', {}, { rule: { effect: 'HIDE', condition: { scope: '#', schema: {} } } }),
        { people: PEOPLE },
      );
      expect(field()).toBeNull();
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });
  });
});
