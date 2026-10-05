import { JsonForms } from '@jsonforms/react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import * as studio from '../src/renderers/studio/index';
import { StudioEditorProvider, type ColumnEdit } from '../src/renderers/studio/index';
import { isObjectArray } from '../src/renderers/ui/object-array';
import { settingChoices } from '../src/studio/capabilities/capability-fields';
import type { CapabilityMap } from '../src/studio/capabilities/capability-types';
import { governanceOf } from '../src/studio/capabilities/governance';
import { canvasColumnEdit } from '../src/studio/column-edits';
import type { DocumentContent } from '../src/studio/document-types';
import { fieldsFor } from '../src/studio/inspector/inspector-form';
import { inspectorTarget, KIND_NAMES } from '../src/studio/inspector/inspector-target';
import { DEFAULT_PALETTE_ITEMS } from '../src/studio/palette-items';
import { StudioVariantContext } from '../src/studio/variants/variant-context';

const SCHEMA = {
  type: 'object',
  properties: {
    people: {
      type: 'array',
      title: 'People',
      items: {
        type: 'object',
        properties: {
          first: { type: 'string', title: 'First' },
          second: { type: 'number', title: 'Second' },
        },
      },
    },
  },
};
const ONE_COLUMN = {
  type: 'object',
  properties: {
    people: {
      type: 'array',
      title: 'People',
      items: { type: 'object', properties: { only: { type: 'string', title: 'Only' } } },
    },
  },
};
const PAGE = {
  id: 'F',
  type: 'Form',
  label: 'Page',
  elements: [{ id: 't', type: 'Control', scope: '#/properties/people' }],
};
const CONTENT = { schema: SCHEMA, variants: { default: PAGE } } as DocumentContent;

const governed = (map: CapabilityMap) => governanceOf(CONTENT, map)!;

function renderTable({
  port = true,
  variant = 'default',
  schema = SCHEMA,
  map,
}: { port?: boolean; variant?: string; schema?: object; map?: CapabilityMap } = {}) {
  const editColumns = vi.fn<(id: string, edit: ColumnEdit) => void>();
  const view = render(
    <StudioVariantContext.Provider value={{ name: variant, isDefault: variant === 'default' }}>
      <StudioEditorProvider
        update={vi.fn()}
        insert={vi.fn()}
        {...(port && { editColumns })}
        {...(map !== undefined && { governance: governed(map) })}
      >
        <JsonForms
          schema={schema}
          uischema={PAGE as never}
          data={{}}
          renderers={studio.renderers}
          cells={studio.cells}
          validationMode="NoValidation"
        />
      </StudioEditorProvider>
    </StudioVariantContext.Provider>,
  );
  const element = () => view.container.querySelector<HTMLElement>('[data-element-id="t"]')!;
  return { ...view, editColumns, element };
}

const columnsOf = (content: DocumentContent) =>
  Object.keys(
    (content.schema['properties'] as Record<string, { items: { properties: object } }>)['people']!
      .items.properties,
  );

const nameInputs = () => screen.queryAllByRole('textbox', { name: 'Column name' });

describe('studio data table (doc 263 rules 18-24, 27-31)', () => {
  describe('editing (rules 18-23)', () => {
    it('renders column name inputs, column menus and Add column when editable', () => {
      renderTable();
      expect(nameInputs().map((input) => (input as HTMLInputElement).value)).toEqual([
        'First',
        'Second',
      ]);
      expect(screen.getByRole('button', { name: 'Column options for First' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Column options for Second' })).toBeInTheDocument();
      const add = screen.getByRole('button', { name: 'Add column' });
      expect(add).toHaveClass('nodrag', 'pointer-events-auto');
      expect(nameInputs()[0]).toHaveClass('nodrag', 'pointer-events-auto');
    });

    it('renames on blur or Enter, restores on Escape or blank', () => {
      const { editColumns } = renderTable();
      const [first, second] = nameInputs() as HTMLInputElement[];
      // Native focus moves are not wrapped in act; the state they set must flush before asserting.
      act(() => first!.focus());
      fireEvent.change(first!, { target: { value: '  Given ' } });
      act(() => first!.blur());
      expect(editColumns).toHaveBeenLastCalledWith('t', {
        kind: 'rename',
        key: 'first',
        title: 'Given',
      });
      second!.focus();
      fireEvent.change(second!, { target: { value: 'Count' } });
      fireEvent.keyDown(second!, { key: 'Enter' });
      expect(editColumns).toHaveBeenLastCalledWith('t', {
        kind: 'rename',
        key: 'second',
        title: 'Count',
      });
      expect(editColumns).toHaveBeenCalledTimes(2);
      // Escape and a blank name both restore the title without an edit.
      second!.focus();
      fireEvent.change(second!, { target: { value: 'Nope' } });
      fireEvent.keyDown(second!, { key: 'Escape' });
      expect(second!.value).toBe('Second');
      first!.focus();
      fireEvent.change(first!, { target: { value: '   ' } });
      act(() => first!.blur());
      expect(first!.value).toBe('First');
      expect(editColumns).toHaveBeenCalledTimes(2);
    });

    it('sends retype, move and remove from the column menu with ends and last column disabled', async () => {
      const user = userEvent.setup();
      const { editColumns } = renderTable();
      await user.click(screen.getByRole('button', { name: 'Column options for Second' }));
      await user.click(await screen.findByRole('menuitemradio', { name: 'Yes/No' }));
      expect(editColumns).toHaveBeenLastCalledWith('t', {
        kind: 'retype',
        key: 'second',
        type: 'boolean',
      });
      await user.click(screen.getByRole('button', { name: 'Column options for Second' }));
      expect(await screen.findByRole('menuitem', { name: 'Move right' })).toHaveAttribute(
        'aria-disabled',
        'true',
      );
      await user.click(screen.getByRole('menuitem', { name: 'Move left' }));
      expect(editColumns).toHaveBeenLastCalledWith('t', { kind: 'move', key: 'second', to: 0 });
      await user.click(screen.getByRole('button', { name: 'Column options for First' }));
      expect(await screen.findByRole('menuitem', { name: 'Move left' })).toHaveAttribute(
        'aria-disabled',
        'true',
      );
      await user.click(screen.getByRole('menuitem', { name: 'Delete column' }));
      expect(editColumns).toHaveBeenLastCalledWith('t', { kind: 'remove', key: 'first' });
    });

    it('disables Delete column for the only column', async () => {
      const user = userEvent.setup();
      renderTable({ schema: ONE_COLUMN });
      await user.click(screen.getByRole('button', { name: 'Column options for Only' }));
      expect(await screen.findByRole('menuitem', { name: 'Delete column' })).toHaveAttribute(
        'aria-disabled',
        'true',
      );
    });

    it('sends add from the + button', async () => {
      const user = userEvent.setup();
      const { editColumns } = renderTable();
      await user.click(screen.getByRole('button', { name: 'Add column' }));
      expect(editColumns).toHaveBeenCalledExactlyOnceWith('t', { kind: 'add' });
    });

    it('selects the element on click and is not inert', async () => {
      const user = userEvent.setup();
      const { element } = renderTable();
      // The element is not inert — its headers take clicks; only the preview inputs are (doc 269).
      expect(element().querySelector('[data-slot="studio-element-body"][inert]')).toBeNull();
      expect(nameInputs()[0]!.closest('[inert]')).toBeNull();
      expect(element()).not.toHaveAttribute('data-selected');
      await user.click(within(element()).getAllByRole('cell')[0]!);
      expect(element()).toHaveAttribute('data-selected');
    });
  });

  describe('read-only (rule 19)', () => {
    const expectReadOnly = () => {
      expect(nameInputs()).toHaveLength(0);
      expect(screen.queryByRole('button', { name: 'Add column' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Column options/ })).not.toBeInTheDocument();
      expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual([
        'First',
        'Second',
      ]);
    };

    it('renders plain headers without an editColumns port', () => {
      renderTable({ port: false });
      expectReadOnly();
    });

    it('renders plain headers outside the default variant', () => {
      renderTable({ variant: 'short' });
      expectReadOnly();
    });

    it('renders plain headers when the template locks columns', () => {
      const { unmount } = renderTable({ map: { elements: { t: { edit: ['label'] } } } });
      expectReadOnly();
      unmount();
      // Allowed by name, the columns are editable again.
      renderTable({ map: { elements: { t: { edit: ['columns'] } } } });
      expect(nameInputs()).toHaveLength(2);
    });
  });

  describe('preview row (doc 269, superseding rule 24)', () => {
    it("draws each column's own input, inert, with the type as placeholder", () => {
      const { container } = renderTable({ port: false });
      const body = screen.getAllByRole('rowgroup')[1]!;
      expect(within(body).getAllByRole('row')).toHaveLength(1);
      const previews = [...container.querySelectorAll('[data-slot="column-preview"]')];
      expect(previews).toHaveLength(2);
      for (const preview of previews) expect(preview).toHaveAttribute('inert');
      const text = previews[0]!.querySelector('input')!;
      expect(text).toHaveAttribute('aria-label', 'First, preview');
      expect(text).toHaveAttribute('placeholder', 'Text');
      const number = previews[1]!.querySelector('input')!;
      expect(number).toHaveAttribute('type', 'number');
      expect(number).toHaveAttribute('placeholder', 'Number');
    });
  });

  describe('host backstop (rules 27-28)', () => {
    it('applies a column edit to the bound property through setContent', () => {
      const next = canvasColumnEdit(CONTENT, 'default', undefined, 't', {
        kind: 'move',
        key: 'second',
        to: 0,
      });
      expect(columnsOf(next)).toEqual(['second', 'first']);
      expect(next.variants).toBe(CONTENT.variants);
      expect(columnsOf(CONTENT)).toEqual(['first', 'second']);
    });

    it('ignores an edit outside default or when columns are locked', () => {
      const add = { kind: 'add' } as const;
      const twoVariants = { ...CONTENT, variants: { ...CONTENT.variants, short: PAGE } };
      expect(canvasColumnEdit(twoVariants, 'short', undefined, 't', add)).toBe(twoVariants);
      const locked = governed({ elements: { t: { edit: 'none' } } });
      expect(canvasColumnEdit(CONTENT, 'default', locked, 't', add)).toBe(CONTENT);
      expect(canvasColumnEdit(CONTENT, 'default', undefined, 'missing', add)).toBe(CONTENT);
      const allowed = governed({ elements: { t: { edit: ['columns'] } } });
      expect(canvasColumnEdit(CONTENT, 'default', allowed, 't', add)).not.toBe(CONTENT);
    });
  });

  describe('inspector, governance, palette (rules 29-31)', () => {
    const target = () =>
      inspectorTarget(CONTENT, { pageSelectedId: 't', focusedId: 'F', formId: 'F' })!;

    it('names the target Data table with Label, Description and Required but no Display as', () => {
      expect(target().kind).toBe('data-table');
      expect(KIND_NAMES['data-table']).toBe('Data table');
      const keys = fieldsFor(target()).map((field) => field.key);
      expect(keys).toEqual(expect.arrayContaining(['label', 'description', 'required']));
      expect(keys).not.toContain('component');
      expect(keys).not.toContain('placeholder');
    });

    it('offers Columns in the template setting choices', () => {
      expect(settingChoices(target())).toContainEqual({ const: 'columns', title: 'Columns' });
      const other = inspectorTarget(
        { schema: SCHEMA, variants: { default: PAGE } } as DocumentContent,
        { pageSelectedId: 'F', focusedId: 'F', formId: 'F' },
      )!;
      expect(settingChoices(other)).not.toContainEqual({ const: 'columns', title: 'Columns' });
    });

    it('creates a fresh Data table palette item with one Column 1 text column', () => {
      const item = DEFAULT_PALETTE_ITEMS.find((candidate) => candidate.id === 'data-table')!;
      expect(item).toMatchObject({ label: 'Data table', group: 'Fields' });
      const [a, b] = [item.create(), item.create()];
      const [keyA] = Object.keys(a.properties!);
      const [keyB] = Object.keys(b.properties!);
      expect(keyA).not.toBe(keyB);
      expect(a.element).toMatchObject({ type: 'Control', scope: `#/properties/${keyA}` });
      expect(a.element).not.toHaveProperty('options');
      const property = a.properties![keyA!]!;
      expect(isObjectArray(property)).toBe(true);
      expect(property['title']).toBe('Untitled data table');
      const columns = (property['items'] as { properties: Record<string, unknown> }).properties;
      expect(Object.values(columns)).toEqual([{ type: 'string', title: 'Column 1' }]);
      expect(a.properties![keyA!]!['items']).not.toBe(b.properties![keyB!]!['items']);
    });
  });
});
