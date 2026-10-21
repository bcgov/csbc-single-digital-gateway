import { JsonForms } from '@jsonforms/react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import * as defaults from '../src/renderers/default/index';
import * as studio from '../src/renderers/studio/index';
import { StudioEditorProvider, type ColumnEdit } from '../src/renderers/studio/index';
import { formatCell, tableColumns } from '../src/renderers/ui/object-array';
import { applyColumnEdit } from '../src/studio/column-edits';
import type { DocumentContent } from '../src/studio/document-types';

const COLOURS = [
  { const: 'red', title: 'Red' },
  { const: 'blue', title: 'Blue' },
  { const: 'green', title: 'Green' },
];
const TABLE = {
  type: 'array',
  title: 'People',
  items: {
    type: 'object',
    properties: {
      name: { type: 'string', title: 'Name' },
      colour: { type: 'string', title: 'Colour', oneOf: COLOURS },
      likes: { type: 'array', title: 'Likes', items: { type: 'string', oneOf: COLOURS } },
    },
  },
};
const SCHEMA = { type: 'object', properties: { people: TABLE } };
const CONTROL = { type: 'Control', scope: '#/properties/people' };

function renderDefault(data: Record<string, unknown> = {}, readonly = false) {
  const onChange = vi.fn<(data: Record<string, unknown>) => void>();
  render(
    <JsonForms
      schema={SCHEMA}
      uischema={CONTROL as never}
      data={data}
      renderers={defaults.renderers}
      cells={defaults.cells}
      readonly={readonly}
      onChange={({ data: next }) => onChange(next as Record<string, unknown>)}
    />,
  );
  return { lastPeople: () => onChange.mock.calls.at(-1)?.[0]?.['people'] };
}

function renderStudio() {
  const editColumns = vi.fn<(id: string, edit: ColumnEdit) => void>();
  render(
    <StudioEditorProvider update={vi.fn()} insert={vi.fn()} editColumns={editColumns}>
      <JsonForms
        schema={SCHEMA}
        uischema={{ id: 'F', type: 'Form', elements: [{ id: 't', ...CONTROL }] } as never}
        data={{}}
        renderers={studio.renderers}
        cells={studio.cells}
        validationMode="NoValidation"
      />
    </StudioEditorProvider>,
  );
  return { editColumns };
}

const content = { schema: SCHEMA, variants: { default: {} } } as DocumentContent;
const columnOf = (c: DocumentContent, key: string) =>
  (c.schema['properties'] as { people: { items: { properties: Record<string, unknown> } } }).people
    .items.properties[key];

describe('data table choice columns (doc 268)', () => {
  describe('reading (rules 1-2)', () => {
    it('types choice columns by the field predicates and carries their options', () => {
      const columns = tableColumns(TABLE);
      expect(columns.map((c) => [c.key, c.type, c.choiceType])).toEqual([
        ['name', 'string', undefined],
        ['colour', 'choice', 'string'],
        ['likes', 'multi-choice', 'string'],
      ]);
      expect(columns[1]!.options!.map((o) => o.label)).toEqual(['Red', 'Blue', 'Green']);
    });

    it('formats choice values as labels in authoring order, falling back for unknown values', () => {
      const options = tableColumns(TABLE)[1]!.options!;
      expect(formatCell('blue', options)).toBe('Blue');
      expect(formatCell(['green', 'red'], options)).toBe('Red, Green');
      expect(formatCell('purple', options)).toBe('purple');
      expect(formatCell(['red', 'purple'], options)).toBe('["red","purple"]');
    });

    it('shows labels in the read-only table', () => {
      renderDefault({ people: [{ name: 'Bea', colour: 'blue', likes: ['green', 'red'] }] }, true);
      const row = within(screen.getAllByRole('rowgroup')[1]!).getAllByRole('row')[0]!;
      expect(
        within(row)
          .getAllByRole('cell')
          .map((cell) => cell.textContent),
      ).toEqual(['Bea', 'Blue', 'Red, Green']);
    });
  });

  describe('filling (rule 3)', () => {
    it('picks and clears a Select cell', async () => {
      const user = userEvent.setup();
      const { lastPeople } = renderDefault();
      await user.click(screen.getByRole('combobox', { name: 'Colour, row 1' }));
      await user.click(
        within(await screen.findByRole('listbox')).getByRole('option', { name: 'Blue' }),
      );
      await waitFor(() => expect(lastPeople()).toEqual([{ colour: 'blue' }]));
      await user.click(screen.getByRole('button', { name: 'Clear' }));
      await waitFor(() => expect(lastPeople()).toEqual([{}]));
    });

    it('picks Multi-select values in authoring order and writes none as absent', async () => {
      const user = userEvent.setup();
      const { lastPeople } = renderDefault({ people: [{ likes: ['green'] }] });
      await user.click(screen.getByRole('combobox', { name: 'Likes, row 1' }));
      await user.click(
        within(await screen.findByRole('listbox')).getByRole('option', { name: 'Red' }),
      );
      await waitFor(() => expect(lastPeople()).toEqual([{ likes: ['red', 'green'] }]));
      // The open popup hides the rest of the page from assistive tech; close it before using the chips.
      await user.keyboard('{Escape}');
      await user.click(screen.getByRole('button', { name: 'Remove Red' }));
      await user.click(screen.getByRole('button', { name: 'Remove Green' }));
      await waitFor(() => expect(lastPeople()).toEqual([{}]));
    });
  });

  describe('authoring (rules 4-5)', () => {
    it('retypes to a choice with starter options, keeping options between Select and Multi-select', () => {
      const started = applyColumnEdit(content, 'people', {
        kind: 'retype',
        key: 'name',
        type: 'choice',
      });
      expect(columnOf(started, 'name')).toEqual({
        type: 'string',
        oneOf: [
          { const: 'option-1', title: 'Option 1' },
          { const: 'option-2', title: 'Option 2' },
        ],
        title: 'Name',
      });
      const multi = applyColumnEdit(content, 'people', {
        kind: 'retype',
        key: 'colour',
        type: 'multi-choice',
      });
      expect(columnOf(multi, 'colour')).toEqual({
        type: 'array',
        items: { type: 'string', oneOf: COLOURS },
        title: 'Colour',
      });
      const back = applyColumnEdit(multi, 'people', {
        kind: 'retype',
        key: 'colour',
        type: 'choice',
      });
      expect(columnOf(back, 'colour')).toEqual({ type: 'string', oneOf: COLOURS, title: 'Colour' });
      expect(
        columnOf(
          applyColumnEdit(content, 'people', { kind: 'retype', key: 'colour', type: 'string' }),
          'colour',
        ),
      ).toEqual({ type: 'string', title: 'Colour' });
    });

    it('replaces a choice column options and refuses a non-choice column', () => {
      const entries = [{ const: 'x', title: 'X' }];
      const single = applyColumnEdit(content, 'people', {
        kind: 'options',
        key: 'colour',
        entries,
      });
      expect(columnOf(single, 'colour')).toEqual({
        type: 'string',
        title: 'Colour',
        oneOf: entries,
      });
      const multi = applyColumnEdit(content, 'people', { kind: 'options', key: 'likes', entries });
      expect(columnOf(multi, 'likes')).toEqual({
        type: 'array',
        title: 'Likes',
        items: { type: 'string', oneOf: entries },
      });
      expect(applyColumnEdit(content, 'people', { kind: 'options', key: 'name', entries })).toBe(
        content,
      );
    });

    it('offers Select and Multi-select types and Edit options… only on a choice column', async () => {
      const user = userEvent.setup();
      const { editColumns } = renderStudio();
      await user.click(screen.getByRole('button', { name: 'Column options for Name' }));
      expect(
        await screen.findByRole('menuitemradio', { name: 'Multi-select' }),
      ).toBeInTheDocument();
      expect(screen.queryByRole('menuitem', { name: 'Edit options…' })).not.toBeInTheDocument();
      await user.click(screen.getByRole('menuitemradio', { name: 'Select' }));
      expect(editColumns).toHaveBeenLastCalledWith('t', {
        kind: 'retype',
        key: 'name',
        type: 'choice',
      });
      await user.click(screen.getByRole('button', { name: 'Column options for Colour' }));
      await user.click(await screen.findByRole('menuitem', { name: 'Edit options…' }));
      const dialog = within(await screen.findByRole('dialog'));
      const labels = dialog.getAllByRole('textbox', { name: /label$/i }) as HTMLInputElement[];
      expect(labels.map((input) => input.value)).toEqual(['Red', 'Blue', 'Green']);
      await user.clear(labels[0]!);
      await user.type(labels[0]!, 'Crimson');
      await user.click(dialog.getByRole('button', { name: 'Save options' }));
      expect(editColumns).toHaveBeenLastCalledWith('t', {
        kind: 'options',
        key: 'colour',
        entries: [
          { const: 'red', title: 'Crimson' },
          { const: 'blue', title: 'Blue' },
          { const: 'green', title: 'Green' },
        ],
      });
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });
  });
});
