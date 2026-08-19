import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import Ajv from 'ajv';
import { JsonForms } from '@jsonforms/react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { renderers } from '../src/jsonforms-renderers';
import { accordionGroupControlTester } from '../src/jsonforms-renderers/controls/accordion-group/accordion-group-control';
import type { AccordionItem } from '../src/jsonforms-renderers/controls/accordion-group/model';

const schema: JsonSchema = {
  type: 'object',
  properties: {
    faq: {
      type: 'array',
      title: 'Frequently asked questions',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'object' },
        },
      },
    },
  },
};

/** Required fields also emit `minItems: 1` (see the codec) — `required` alone accepts []. */
const requiredSchema: JsonSchema = {
  type: 'object',
  required: ['faq'],
  properties: {
    faq: { ...(schema.properties?.faq as Record<string, unknown>), minItems: 1 },
  },
};

function uischemaFor(options: Record<string, unknown> = {}): UISchemaElement {
  return {
    type: 'VerticalLayout',
    elements: [
      {
        type: 'Control',
        scope: '#/properties/faq',
        label: 'Frequently asked questions',
        options: { format: 'accordion-group', ...options },
      },
    ],
  } as unknown as UISchemaElement;
}

function itemsOf(data: Record<string, unknown>): AccordionItem[] {
  return (data.faq ?? []) as AccordionItem[];
}

/** The row element itself — the grid whose three columns are asserted below. */
const rowOf = (container: HTMLElement): HTMLElement =>
  container.querySelector('li > div') as HTMLElement;

const seeded = (titles: string[]): AccordionItem[] =>
  titles.map((title, i) => ({ id: `id${i}`, title, description: null }));

function Form({
  onData,
  initial = {},
  options = {},
  readonly = false,
  formSchema = schema,
}: {
  onData?: (data: Record<string, unknown>) => void;
  initial?: Record<string, unknown>;
  options?: Record<string, unknown>;
  readonly?: boolean;
  formSchema?: JsonSchema;
}) {
  const [data, setData] = useState<Record<string, unknown>>(initial);
  return (
    <JsonForms
      schema={formSchema}
      uischema={uischemaFor(options)}
      data={data}
      renderers={renderers}
      cells={[]}
      readonly={readonly}
      onChange={({ data: next }) => {
        setData(next as Record<string, unknown>);
        onData?.(next as Record<string, unknown>);
      }}
    />
  );
}

/**
 * MDD doc 171 — the editable accordion-group control. Dispatched purely by the uischema option
 * `format: 'accordion-group'` (rank 5). The control edits the RAW array so half-typed items persist.
 *
 * NOTE (memory `jsonforms-onchange-debounce`): @jsonforms/react debounces onChange ~10ms — assert
 * emitted data inside `waitFor`, never immediately.
 *
 * NOTE: jsdom cannot exercise a real pointer drag. Reordering is asserted through the Move up /
 * Move down buttons; the drag handle is asserted for presence + wiring only.
 */
describe('accordion-group control (feature 171)', () => {
  describe('dispatch', () => {
    it('wins dispatch for a Control with options.format = "accordion-group"', () => {
      const element = {
        type: 'Control',
        scope: '#/properties/faq',
        options: { format: 'accordion-group' },
      } as unknown as UISchemaElement;
      expect(
        accordionGroupControlTester(element, schema, {
          rootSchema: schema,
          config: {},
        }),
      ).toBe(5);
    });

    it('does not claim a plain array control without the option', () => {
      const element = {
        type: 'Control',
        scope: '#/properties/faq',
      } as unknown as UISchemaElement;
      expect(
        accordionGroupControlTester(element, schema, {
          rootSchema: schema,
          config: {},
        }),
      ).toBe(-1);
    });
  });

  describe('rendering', () => {
    it('renders the group label and the help-text description', () => {
      const described: JsonSchema = {
        type: 'object',
        properties: {
          faq: { ...(schema.properties?.faq as object), description: 'Add one per question' },
        },
      };
      render(<Form formSchema={described} />);
      expect(screen.getByText('Frequently asked questions')).toBeInTheDocument();
      expect(screen.getByText('Add one per question')).toBeInTheDocument();
    });

    it('renders the empty state built from the item noun when there are no items', () => {
      render(<Form options={{ itemLabel: 'question' }} />);
      expect(screen.getByText('No questions yet.')).toBeInTheDocument();
    });

    it('renders one editor row per item, with a title input and a rich-text editor', () => {
      render(<Form initial={{ faq: seeded(['One', 'Two']) }} />);
      expect(screen.getAllByLabelText('Title')).toHaveLength(2);
      expect(screen.getAllByLabelText('Description')).toHaveLength(2);
      expect(screen.getByDisplayValue('One')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Two')).toBeInTheDocument();
    });

    it('renders the add row last, labelled from options.itemLabel', () => {
      render(<Form initial={{ faq: seeded(['One']) }} options={{ itemLabel: 'question' }} />);
      const addButton = screen.getByRole('button', { name: 'Add question block' });
      const list = screen.getByRole('list');
      // The add row follows the item list in document order.
      expect(list.compareDocumentPosition(addButton)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    });
  });

  describe('add', () => {
    it('appends an empty item with a fresh id when the add row is pressed', async () => {
      const user = userEvent.setup();
      let latest: Record<string, unknown> = {};
      render(<Form initial={{ faq: seeded(['One']) }} onData={(d) => (latest = d)} />);

      await user.click(screen.getByRole('button', { name: 'Add item block' }));

      await waitFor(() => expect(itemsOf(latest)).toHaveLength(2));
      const added = itemsOf(latest)[1];
      expect(added?.title).toBe('');
      expect(added?.description).toBeNull();
      expect(added?.id).toHaveLength(8);
      expect(added?.id).not.toBe('id0');
    });

    it('does not steal focus into the new row', async () => {
      const user = userEvent.setup();
      render(<Form />);
      const addButton = screen.getByRole('button', { name: 'Add item block' });

      await user.click(addButton);

      await waitFor(() => expect(screen.getAllByLabelText('Title')).toHaveLength(1));
      expect(screen.getByLabelText('Title')).not.toHaveFocus();
    });
  });

  describe('edit', () => {
    it('emits the updated title on the whole array via handleChange', async () => {
      const user = userEvent.setup();
      let latest: Record<string, unknown> = {};
      render(<Form initial={{ faq: seeded(['One']) }} onData={(d) => (latest = d)} />);

      await user.type(screen.getByLabelText('Title'), '!');

      await waitFor(() => expect(itemsOf(latest)[0]?.title).toBe('One!'));
      expect(itemsOf(latest)).toHaveLength(1);
    });

    it('keeps a half-typed item in the value (edits the raw array, never normalizes it)', async () => {
      const user = userEvent.setup();
      let latest: Record<string, unknown> = {};
      // A half-typed item: a title but a still-null description.
      render(<Form initial={{ faq: seeded(['One', '']) }} onData={(d) => (latest = d)} />);

      await user.type(screen.getAllByLabelText('Title')[1] as HTMLElement, 'Two');

      // The title must be asserted INSIDE waitFor — the ~10ms JsonForms debounce otherwise lets a
      // partially-typed value ('T') satisfy an outside-the-wait assertion under parallel load.
      await waitFor(() =>
        expect(itemsOf(latest)[1]).toMatchObject({ id: 'id1', title: 'Two', description: null }),
      );
      expect(itemsOf(latest)).toHaveLength(2);
    });

    it('does not regenerate item ids while editing (focus must survive)', async () => {
      const user = userEvent.setup();
      let latest: Record<string, unknown> = {};
      render(<Form initial={{ faq: seeded(['One']) }} onData={(d) => (latest = d)} />);

      await user.type(screen.getByLabelText('Title'), 'X');

      await waitFor(() => expect(itemsOf(latest)[0]?.title).toBe('OneX'));
      expect(itemsOf(latest)[0]?.id).toBe('id0');
    });
  });

  describe('remove', () => {
    it('removes only the targeted item', async () => {
      const user = userEvent.setup();
      let latest: Record<string, unknown> = {};
      render(
        <Form initial={{ faq: seeded(['One', 'Two', 'Three']) }} onData={(d) => (latest = d)} />,
      );

      await user.click(screen.getByRole('button', { name: 'Remove item 2' }));

      await waitFor(() => expect(itemsOf(latest)).toHaveLength(2));
      expect(itemsOf(latest).map((i) => i.title)).toEqual(['One', 'Three']);
    });

    it('labels the remove control from the item noun and its position', () => {
      render(
        <Form initial={{ faq: seeded(['One', 'Two']) }} options={{ itemLabel: 'Question' }} />,
      );
      expect(screen.getByRole('button', { name: 'Remove question 1' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Remove question 2' })).toBeInTheDocument();
    });
  });

  describe('reorder', () => {
    it('moves an item up with the Move up button', async () => {
      const user = userEvent.setup();
      let latest: Record<string, unknown> = {};
      render(<Form initial={{ faq: seeded(['One', 'Two']) }} onData={(d) => (latest = d)} />);

      await user.click(screen.getByRole('button', { name: 'Move up item 2' }));

      await waitFor(() => expect(itemsOf(latest).map((i) => i.title)).toEqual(['Two', 'One']));
    });

    it('moves an item down with the Move down button', async () => {
      const user = userEvent.setup();
      let latest: Record<string, unknown> = {};
      render(<Form initial={{ faq: seeded(['One', 'Two']) }} onData={(d) => (latest = d)} />);

      await user.click(screen.getByRole('button', { name: 'Move down item 1' }));

      await waitFor(() => expect(itemsOf(latest).map((i) => i.title)).toEqual(['Two', 'One']));
    });

    it('disables Move up on the first item and Move down on the last', () => {
      render(<Form initial={{ faq: seeded(['One', 'Two']) }} />);
      expect(screen.getByRole('button', { name: 'Move up item 1' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Move down item 2' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Move down item 1' })).toBeEnabled();
      expect(screen.getByRole('button', { name: 'Move up item 2' })).toBeEnabled();
    });

    it('renders a drag handle wired to the sortable id for each item', () => {
      // Pointer drag itself is verified manually (Phase 7b) — jsdom cannot fire a real drag.
      render(<Form initial={{ faq: seeded(['One', 'Two']) }} />);
      expect(screen.getByRole('button', { name: 'Reorder item 1' })).toBeEnabled();
      expect(screen.getByRole('button', { name: 'Reorder item 2' })).toBeEnabled();
      expect(screen.getAllByRole('listitem')).toHaveLength(2);
    });
  });

  describe('row layout (doc 171, rule 6)', () => {
    it('lays each row out as three columns — narrow, wide, narrow', () => {
      const { container } = render(<Form initial={{ faq: seeded(['One']) }} />);
      expect(rowOf(container).className).toContain('grid-cols-[auto_1fr_auto]');
    });

    it('stacks the drag handle and both move buttons in the first column', () => {
      const { container } = render(<Form initial={{ faq: seeded(['One', 'Two']) }} />);
      const firstColumn = rowOf(container).children[0] as HTMLElement;
      expect(
        within(firstColumn).getByRole('button', { name: 'Reorder item 1' }),
      ).toBeInTheDocument();
      expect(
        within(firstColumn).getByRole('button', { name: 'Move up item 1' }),
      ).toBeInTheDocument();
      expect(
        within(firstColumn).getByRole('button', { name: 'Move down item 1' }),
      ).toBeInTheDocument();
    });

    it('puts the title and description in the middle column', () => {
      const { container } = render(<Form initial={{ faq: seeded(['One']) }} />);
      const middleColumn = rowOf(container).children[1] as HTMLElement;
      expect(within(middleColumn).getByLabelText('Title')).toBeInTheDocument();
      expect(within(middleColumn).getByLabelText('Description')).toBeInTheDocument();
    });

    it('isolates the remove control in its own last column', () => {
      // The point of the split: the destructive action never sits beside the reorder buttons.
      const { container } = render(<Form initial={{ faq: seeded(['One']) }} />);
      const row = rowOf(container);
      const lastColumn = row.children[row.children.length - 1] as HTMLElement;
      expect(lastColumn).toHaveAttribute('aria-label', 'Remove item 1');
      expect(
        within(row.children[0] as HTMLElement).queryByRole('button', { name: /Remove/ }),
      ).toBeNull();
    });

    it('renders no visible position number (the accessible names carry it)', () => {
      const { container } = render(<Form initial={{ faq: seeded(['One', 'Two']) }} />);
      expect(within(rowOf(container)).queryByText('1')).toBeNull();
    });
  });

  describe('readonly (enabled === false)', () => {
    it('disables add, remove, both reorder buttons and the drag handle', () => {
      // Load-bearing: the form-builder canvas renders this control readonly for its drag preview.
      render(<Form initial={{ faq: seeded(['One', 'Two']) }} readonly />);
      expect(screen.getByRole('button', { name: 'Add item block' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Remove item 1' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Move down item 1' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Move up item 2' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Reorder item 1' })).toBeDisabled();
    });

    it('renders the title input read-only', () => {
      render(<Form initial={{ faq: seeded(['One']) }} readonly />);
      expect(screen.getByLabelText('Title')).toHaveAttribute('readonly');
    });
  });

  describe('per-item completeness (doc 171, rules 13-15)', () => {
    /** The items schema the form builder now emits for an accordion group. */
    const itemsSchema = {
      type: 'object',
      required: ['title', 'description'],
      properties: {
        id: { type: 'string' },
        title: { type: 'string', pattern: '\\S' },
        description: { type: 'object' },
      },
    };

    const completeSchema: JsonSchema = {
      type: 'object',
      properties: { faq: { type: 'array', title: 'FAQ', items: itemsSchema } },
    };

    const errorsFor = (item: Record<string, unknown>): string[] => {
      // Assert against a real Ajv run — this is what the citizen-portal submit gate does.
      const validate = new Ajv({ allErrors: true }).compile(completeSchema);
      return validate({ faq: [item] }) ? [] : (validate.errors ?? []).map((e) => e.message ?? '');
    };

    it('rejects a fresh item, whose description is null', () => {
      expect(errorsFor({ id: 'a', title: 'Q', description: null })).toContain('must be object');
    });

    it('rejects an item missing the keys entirely', () => {
      const messages = errorsFor({ id: 'a' });
      expect(messages).toContain("must have required property 'title'");
      expect(messages).toContain("must have required property 'description'");
    });

    it('rejects a blank or whitespace-only title', () => {
      for (const title of ['', '   ']) {
        expect(errorsFor({ id: 'a', title, description: { root: {} } })).toContain(
          'must match pattern "\\S"',
        );
      }
    });

    it('accepts a fully populated item', () => {
      expect(errorsFor({ id: 'a', title: 'Q', description: { root: {} } })).toEqual([]);
    });

    it('does NOT reject a touched-then-emptied description (rule 15, a known limit)', () => {
      // Clearing a Lexical editor leaves a valid object, not null — the schema cannot see the
      // difference. Documented as a known issue; closing it needs a runtime pass on submit.
      expect(errorsFor({ id: 'a', title: 'Q', description: { root: { children: [] } } })).toEqual(
        [],
      );
    });

    it('renders NO error message for an incomplete item (known defect)', () => {
      // JSONForms scopes a control's `errors` to its own path, so faq/0/title never reaches the
      // accordion control. Enforcement works; the explanation does not. Pinned so that a future fix
      // has to update this test deliberately rather than by accident.
      render(
        <Form
          formSchema={completeSchema}
          initial={{ faq: [{ id: 'a', title: '', description: null }] }}
        />,
      );
      expect(document.body.textContent).not.toMatch(/must (be|match|have)/);
    });
  });

  describe('validation', () => {
    it('surfaces the minItems error when the group is required and empty', async () => {
      render(<Form formSchema={requiredSchema} initial={{ faq: [] }} />);
      const field = screen.getByText('Frequently asked questions').closest('div');
      await waitFor(() =>
        expect(within(field as HTMLElement).getByText(/fewer than 1 items/i)).toBeInTheDocument(),
      );
    });
  });
});
