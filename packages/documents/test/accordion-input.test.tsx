import type { JsonSchema } from '@jsonforms/core';
import { JsonForms } from '@jsonforms/react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import * as defaults from '../src/renderers/default/index';
import { editRichText, emptyRichText, richText } from './rich-text-fixtures';

const schema = (extra: Record<string, unknown> = {}, itemProperties?: Record<string, unknown>) => ({
  type: 'object',
  properties: {
    faq: {
      type: 'array',
      title: 'Questions',
      items: {
        type: 'object',
        properties: itemProperties ?? {
          title: { type: 'string', title: 'Question', pattern: '\\S' },
          content: { type: 'object', required: ['root'], title: 'Answer' },
        },
        required: ['title', 'content'],
      },
      ...extra,
    },
  },
});
const accordion = (options: Record<string, unknown> = {}) => ({
  type: 'Control',
  scope: '#/properties/faq',
  options: { component: 'accordion', ...options },
});

function renderAccordion({
  uischema = accordion(),
  data = {},
  readonly = false,
  schemaExtra = {},
  itemProperties,
}: {
  uischema?: Record<string, unknown>;
  data?: Record<string, unknown>;
  readonly?: boolean;
  schemaExtra?: Record<string, unknown>;
  itemProperties?: Record<string, unknown>;
} = {}) {
  const onChange = vi.fn<(data: Record<string, unknown>) => void>();
  const view = render(
    <JsonForms
      schema={schema(schemaExtra, itemProperties) as JsonSchema}
      uischema={uischema as never}
      data={data}
      renderers={defaults.renderers}
      cells={defaults.cells}
      readonly={readonly}
      onChange={({ data: next }) => onChange(next as Record<string, unknown>)}
    />,
  );
  const lastData = () => onChange.mock.calls.at(-1)?.[0];
  return { ...view, onChange, lastData };
}

const items = (container: HTMLElement) =>
  Array.from(container.querySelectorAll<HTMLElement>('[data-slot="accordion-input-item"]'));
const written = (title: string, text = `${title} answer`) => ({
  title,
  content: richText(text),
});

describe('accordion input — dispatch (doc 280 rules 1-2)', () => {
  it('draws options.component accordion on an object array as the accordion input, in the field shell', () => {
    const { container } = renderAccordion();
    const field = container.querySelector('[data-slot="data-table-field"]');
    expect(field).toHaveAttribute('data-component', 'accordion');
    expect(screen.getByText('Questions')).toBeInTheDocument();
    expect(items(container)).toHaveLength(1);
    // Neither the table nor the record took it.
    expect(container.querySelector('table')).toBeNull();
    expect(container.querySelector('[data-slot="record"]')).toBeNull();
  });

  it('leaves an object array without the option to the data table', () => {
    const { container } = renderAccordion({ uischema: accordion({ component: undefined }) });
    expect(container.querySelector('[data-component="accordion"]')).toBeNull();
    expect(container.querySelector('table')).not.toBeNull();
  });

  it('labels the two inputs from the schema titles, falling back to Title / Content', () => {
    renderAccordion();
    expect(screen.getByRole('textbox', { name: 'Question, item 1' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Answer, item 1' })).toBeInTheDocument();
  });

  it('still draws both inputs for hand-authored items lacking the fixed keys', () => {
    renderAccordion({ itemProperties: { other: { type: 'string' } } });
    expect(screen.getByRole('textbox', { name: 'Title, item 1' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Content, item 1' })).toBeInTheDocument();
  });
});

describe('accordion input — filling in (doc 280 rules 4-7)', () => {
  it('shows at least one item and at least Minimum items, blank ones unwritten', () => {
    const { container, lastData } = renderAccordion({ schemaExtra: { minItems: 3 } });
    expect(items(container)).toHaveLength(3);
    expect(within(items(container)[2]!).getByText('Item 3')).toBeInTheDocument();
    expect(lastData()?.['faq']).toBeUndefined();
  });

  it('writes a typed title into its item, padding blank items before it', async () => {
    const user = userEvent.setup();
    const { lastData } = renderAccordion({ schemaExtra: { minItems: 2 } });
    await user.type(screen.getByRole('textbox', { name: 'Question, item 2' }), 'Why?');
    await waitFor(() => expect(lastData()?.['faq']).toEqual([{}, { title: 'Why?' }]));
  });

  it('writes a cleared title as absent, never an empty string', async () => {
    const user = userEvent.setup();
    const { lastData } = renderAccordion({ data: { faq: [{ title: 'A' }] } });
    await user.clear(screen.getByRole('textbox', { name: 'Question, item 1' }));
    await waitFor(() => expect(lastData()?.['faq']).toEqual([{}]));
  });

  it('writes the content state, and an emptied editor as absent', async () => {
    const { lastData } = renderAccordion({ data: { faq: [{ title: 'A' }] } });
    const editor = screen.getByRole('textbox', { name: 'Answer, item 1' });
    editor.focus();
    editRichText(editor, richText('Because.'));
    // Lexical normalises the state it emits, so match the item's shape and its text, not the fixture verbatim.
    await waitFor(() => expect(JSON.stringify(lastData()?.['faq'])).toContain('Because.'));
    expect(lastData()?.['faq']).toEqual([
      { title: 'A', content: expect.objectContaining({ root: expect.any(Object) }) },
    ]);
    editRichText(editor, emptyRichText());
    await waitFor(() => expect(lastData()?.['faq']).toEqual([{ title: 'A' }]));
  });
});

describe('accordion input — item actions (doc 280 rules 8-9)', () => {
  it('offers Move up / Move down / Remove on written items only, at the ends disabled', () => {
    renderAccordion({ data: { faq: [written('A'), written('B')] }, schemaExtra: { minItems: 3 } });
    expect(screen.getByRole('button', { name: 'Move item 1 up' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move item 1 down' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Move item 2 down' })).toBeDisabled();
    // Item 3 is shown (minimum) but blank: no actions.
    expect(screen.queryByRole('button', { name: /item 3/ })).toBeNull();
  });

  it('moves an item, writing the reordered list', async () => {
    const { lastData } = renderAccordion({ data: { faq: [written('A'), written('B')] } });
    fireEvent.click(screen.getByRole('button', { name: 'Move item 2 up' }));
    await waitFor(() => expect(lastData()?.['faq']).toEqual([written('B'), written('A')]));
  });

  it('removes an item, and removing the last writes undefined, never []', async () => {
    const { lastData } = renderAccordion({ data: { faq: [written('A')] } });
    fireEvent.click(screen.getByRole('button', { name: 'Remove item 1' }));
    await waitFor(() => expect(lastData()).not.toHaveProperty('faq'));
  });

  it('disables Remove at the minimum', () => {
    renderAccordion({ data: { faq: [written('A')] }, schemaExtra: { minItems: 1 } });
    expect(screen.getByRole('button', { name: 'Remove item 1' })).toBeDisabled();
  });

  it('hides Remove when deleting rows is not allowed', () => {
    renderAccordion({
      uischema: accordion({ deleteRows: false }),
      data: { faq: [written('A'), written('B')] },
    });
    // Moving is still offered; only removal is withheld.
    expect(screen.getByRole('button', { name: 'Move item 1 down' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Remove item 1' })).toBeNull();
  });

  it('adds blank items with the authored label, disabled at Maximum items', async () => {
    const { container, lastData } = renderAccordion({
      uischema: accordion({ addLabel: 'Add question' }),
      data: { faq: [written('A')] },
      schemaExtra: { maxItems: 2 },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add question' }));
    await waitFor(() => expect(lastData()?.['faq']).toEqual([written('A'), {}]));
    expect(items(container)).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Add question' })).toBeDisabled();
  });

  it('defaults the Add button to "Add item" and hides it when adding is off', () => {
    const { unmount } = renderAccordion();
    expect(screen.getByRole('button', { name: 'Add item' })).toBeInTheDocument();
    unmount();
    renderAccordion({ uischema: accordion({ addRows: false }) });
    expect(screen.queryByRole('button', { name: 'Add item' })).toBeNull();
  });
});

describe('accordion input — reading back (doc 280 rule 10)', () => {
  it('draws the written items as a collapsed Accordion group, with no inputs', () => {
    const { container } = renderAccordion({
      readonly: true,
      data: { faq: [written('Who can apply?'), { title: '', content: richText('x') }] },
    });
    expect(container.querySelector('[data-slot="accordion-group"]')).not.toBeNull();
    const first = screen.getByRole('button', { name: 'Who can apply?' });
    expect(first).toHaveAttribute('aria-expanded', 'false');
    // A blank title reads by position.
    expect(screen.getByRole('button', { name: 'Item 2' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /expand all/i })).toBeInTheDocument();
    expect(items(container)).toHaveLength(0);
    expect(screen.queryByRole('button', { name: 'Add item' })).toBeNull();
    // The shell's label names it; the group draws no title of its own.
    expect(screen.getAllByText('Questions')).toHaveLength(1);
  });

  it('draws a muted dash when nothing was written', () => {
    const { container } = renderAccordion({ readonly: true });
    const empty = container.querySelector('[data-slot="accordion-input-empty"]');
    expect(empty).toHaveTextContent('—');
    expect(container.querySelector('[data-slot="accordion-group"]')).toBeNull();
  });
});
